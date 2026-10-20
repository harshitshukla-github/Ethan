import express from 'express';
import session from 'express-session';
import dotenv from 'dotenv';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = dirname(fileURLToPath(import.meta.url));
const API = 'https://api.spotify.com/v1';
const ACCOUNTS = 'https://accounts.spotify.com';
const scopes = ['streaming', 'user-read-email', 'user-read-private', 'user-modify-playback-state'];
const randomToken = () => randomBytes(32).toString('hex');
const saveSession = req => new Promise((ok, fail) => req.session.save(error => error ? fail(error) : ok()));
const regenerateSession = req => new Promise((ok, fail) => req.session.regenerate(error => error ? fail(error) : ok()));

class HttpError extends Error {
  constructor(status, message, retryAfter) {
    super(message);
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

function equalTokens(a, b) {
  return typeof a === 'string' && typeof b === 'string'
    && Buffer.byteLength(a) === Buffer.byteLength(b)
    && timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

// The optional fetch implementation lets tests simulate Spotify without credentials.
export function createApp(config, { fetchImpl = fetch, store } = {}) {
  const app = express();
  const origin = new URL(config.redirectUri).origin;
  const refreshJobs = new Map();
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Referrer-Policy', 'no-referrer');
    res.set('X-Frame-Options', 'DENY');
    next();
  });
  app.use(express.json({ limit: '8kb' }));
  app.use(session({
    name: 'music.sid',
    secret: config.sessionSecret,
    store,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax', secure: origin.startsWith('https:'), maxAge: 8 * 60 * 60 * 1000 }
  }));
  app.use(['/api', '/auth'], (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });

  async function requestToken(fields) {
    const response = await fetchImpl(`${ACCOUNTS}/api/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams(fields),
      signal: AbortSignal.timeout(15000)
    });
    const data = await response.json();
    if (!response.ok || !data.access_token) {
      throw new HttpError(data.error === 'invalid_grant' ? 401 : 502,
        'Spotify authorization failed. Check your app credentials and sign in again.');
    }
    return data;
  }

  // Access and refresh tokens are kept in the server-side session.
  async function getAccessToken(req, forceRefresh = false) {
    const tokens = req.session.spotify;
    if (!tokens) throw new HttpError(401, 'Please sign in with Spotify.');
    if (!forceRefresh && Date.now() < tokens.expiresAt - 60000) return tokens.accessToken;
    if (!tokens.refreshToken) throw new HttpError(401, 'Your session expired. Please sign in again.');

    // A search and the SDK may request a new token at the same time.
    let job = refreshJobs.get(req.sessionID);
    if (!job) {
      job = requestToken({ grant_type: 'refresh_token', refresh_token: tokens.refreshToken })
        .then(data => ({
          accessToken: data.access_token,
          refreshToken: data.refresh_token || tokens.refreshToken,
          expiresAt: Date.now() + data.expires_in * 1000
        }));
      refreshJobs.set(req.sessionID, job);
    }
    try {
      req.session.spotify = await job;
      await saveSession(req);
      return req.session.spotify.accessToken;
    } finally {
      if (refreshJobs.get(req.sessionID) === job) refreshJobs.delete(req.sessionID);
    }
  }

  async function spotify(req, path, { method = 'GET', body } = {}) {
    let token = await getAccessToken(req);
    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await fetchImpl(`${API}${path}`, {
        method,
        headers: { Authorization: `Bearer ${token}`, ...(body !== undefined && { 'Content-Type': 'application/json' }) },
        ...(body !== undefined && { body: JSON.stringify(body) }),
        signal: AbortSignal.timeout(15000)
      });
      if (response.status === 401 && attempt === 0) {
        token = await getAccessToken(req, true);
        continue;
      }
      // Playback endpoints return 204 with NO JSON body.
      const text = await response.text();
      let data;
      try { data = text ? JSON.parse(text) : null; } catch { data = null; }
      if (!response.ok) {
        const retryAfter = response.headers.get('retry-after');
        const messages = {
          401: 'Your Spotify session expired. Please sign out and sign in again.',
          403: 'Spotify denied access. Check Premium, the app user allowlist, and playback permissions.',
          404: 'The player is unavailable. Reconnect this browser, then try again.',
          429: retryAfter ? `Spotify is busy. Try again after ${retryAfter} seconds.` : 'Spotify quota exceeded. Try again later.'
        };
        throw new HttpError(response.status, messages[response.status] || data?.error?.message || 'Spotify request failed.', retryAfter);
      }
      return data;
    }
  }

  app.get('/health', (req, res) => res.json({ ok: true }));
  app.get('/auth/login', async (req, res) => {
    req.session.oauth = { state: randomToken(), expiresAt: Date.now() + 10 * 60 * 1000 };
    await saveSession(req);
    const params = new URLSearchParams({
      response_type: 'code', client_id: config.clientId, redirect_uri: config.redirectUri,
      scope: scopes.join(' '), state: req.session.oauth.state
    });
    res.redirect(`${ACCOUNTS}/authorize?${params}`);
  });

  app.get('/auth/callback', async (req, res) => {
    const pending = req.session.oauth;
    delete req.session.oauth;
    await saveSession(req); // The OAuth state is one-use, even when login fails.
    if (!pending || pending.expiresAt < Date.now() || !equalTokens(req.query.state, pending.state)) {
      return res.redirect('/?error=invalid_state');
    }
    if (req.query.error || typeof req.query.code !== 'string') return res.redirect('/?error=access_denied');
    try {
      const data = await requestToken({
        grant_type: 'authorization_code', code: req.query.code, redirect_uri: config.redirectUri
      });
      await regenerateSession(req); // Rotate the session ID after authentication.
      req.session.spotify = {
        accessToken: data.access_token, refreshToken: data.refresh_token,
        expiresAt: Date.now() + data.expires_in * 1000
      };
      req.session.csrfToken = randomToken();
      await saveSession(req);
      res.redirect('/');
    } catch {
      res.redirect('/?error=oauth_failed');
    }
  });

  app.get('/api/session', (req, res) => {
    res.json({ authenticated: Boolean(req.session.spotify), csrfToken: req.session.csrfToken || null });
  });
  app.use('/api', (req, res, next) => {
    if (!req.session.spotify) return res.status(401).json({ error: 'Please sign in with Spotify.' });
    if (req.method !== 'GET' && (
      !equalTokens(req.get('X-CSRF-Token'), req.session.csrfToken)
      || (req.get('Origin') && req.get('Origin') !== origin)
    )) return res.status(403).json({ error: 'Invalid request. Reload this page and try again.' });
    next();
  });

  app.get('/api/me', async (req, res) => {
    const profile = await spotify(req, '/me');
    res.json({ displayName: profile.display_name || 'Music lover' });
  });
  app.get('/api/token', async (req, res) => {
    // The browser SDK needs a SHORT-LIVED access token. Never return the refresh token or client secret.
    res.json({ accessToken: await getAccessToken(req) });
  });
  app.get('/api/search', async (req, res) => {
    const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (!query || query.length > 200) throw new HttpError(400, 'Enter a search between 1 and 200 characters.');
    const data = await spotify(req, `/search?${new URLSearchParams({ q: query, type: 'track', limit: '10' })}`);
    res.json({ tracks: (data.tracks?.items || []).filter(Boolean).map(track => ({
      id: track.id, uri: track.uri, name: track.name,
      artists: track.artists?.map(artist => artist.name).join(', ') || 'Unknown artist',
      album: track.album?.name || '', image: track.album?.images?.[0]?.url || '',
      duration: track.duration_ms || 0, url: track.external_urls?.spotify || '',
      playable: track.is_playable !== false && !track.is_local && !track.restrictions?.reason
    })) });
  });

  function deviceId(req) {
    const id = req.body?.deviceId;
    if (typeof id !== 'string' || !/^[a-zA-Z0-9_-]{1,200}$/.test(id)) {
      throw new HttpError(400, 'Connect this browser before playing music.');
    }
    return id;
  }
  app.put('/api/transfer', async (req, res) => {
    await spotify(req, '/me/player', { method: 'PUT', body: { device_ids: [deviceId(req)], play: false } });
    res.status(204).end();
  });
  app.put('/api/play', async (req, res) => {
    const id = deviceId(req);
    const uris = req.body?.uris;
    if (uris !== undefined && (!Array.isArray(uris) || uris.length < 1 || uris.length > 10
      || uris.some(uri => typeof uri !== 'string' || !/^spotify:track:[a-zA-Z0-9]{22}$/.test(uri)))) {
      throw new HttpError(400, 'Provide 1 to 10 valid Spotify track URIs.');
    }
    await spotify(req, `/me/player/play?device_id=${encodeURIComponent(id)}`, {
      method: 'PUT', ...(uris !== undefined && { body: { uris } })
    });
    res.status(204).end();
  });
  for (const [route, method] of [['pause', 'PUT'], ['next', 'POST'], ['previous', 'POST']]) {
    app[method.toLowerCase()](`/api/${route}`, async (req, res) => {
      await spotify(req, `/me/player/${route}?device_id=${encodeURIComponent(deviceId(req))}`, { method });
      res.status(204).end();
    });
  }
  app.post('/api/logout', (req, res, next) => {
    req.session.destroy(error => {
      if (error) return next(error);
      res.clearCookie('music.sid', { httpOnly: true, sameSite: 'lax', secure: origin.startsWith('https:') });
      res.status(204).end();
    });
  });
  app.use('/api', (req, res) => res.status(404).json({ error: 'Unknown API route.' }));
  app.use(express.static(join(directory, 'public')));
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    const status = error.status || 502;
    if (error.retryAfter && /^\d+$/.test(error.retryAfter)) res.set('Retry-After', error.retryAfter);
    const message = error.type === 'entity.parse.failed' ? 'Send valid JSON.'
      : error instanceof HttpError ? error.message : 'The request failed. Check your connection and try again.';
    res.status(status).json({ error: message });
  });
  return app;
}

export function readConfig(env = process.env) {
  for (const name of ['SPOTIFY_CLIENT_ID', 'SPOTIFY_CLIENT_SECRET', 'SESSION_SECRET']) {
    if (!env[name] || /^(paste_|replace_)/.test(env[name])) {
      throw new Error(`Set ${name} in .env. See README.md for setup.`);
    }
  }
  if (env.SESSION_SECRET.length < 32) throw new Error('SESSION_SECRET must be at least 32 characters.');
  const port = Number(env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be between 1 and 65535.');
  const redirectUri = env.SPOTIFY_REDIRECT_URI || `http://127.0.0.1:${port}/auth/callback`;
  const url = new URL(redirectUri);
  if (url.hostname !== '127.0.0.1' || url.protocol !== 'http:' || url.pathname !== '/auth/callback'
    || Number(url.port || 80) !== port || url.search || url.hash || url.username || url.password) {
    throw new Error(`This local project expects http://127.0.0.1:${port}/auth/callback as SPOTIFY_REDIRECT_URI.`);
  }
  return { port, redirectUri, clientId: env.SPOTIFY_CLIENT_ID, clientSecret: env.SPOTIFY_CLIENT_SECRET, sessionSecret: env.SESSION_SECRET };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  dotenv.config({ path: join(directory, '.env'), quiet: true });
  try {
    const config = readConfig();
    const server = createApp(config).listen(config.port, '127.0.0.1', () => {
      console.log(`Music player: http://127.0.0.1:${config.port}`);
    });
    server.on('error', error => {
      console.error(error.code === 'EADDRINUSE' ? 'Port is already in use. Update PORT and the redirect URI together.' : error.message);
      process.exitCode = 1;
    });
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
