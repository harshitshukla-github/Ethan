import { createHash, randomBytes } from 'node:crypto';
import { config } from '../config.js';
import { db } from '../db.js';

const { cookieName, ttlMs } = config.session;

// Only a hash of the token is stored, so a leaked database cannot be replayed as live sessions.
const hashToken = (token) => createHash('sha256').update(token).digest('hex');

const insertSession = db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)');
const selectSessionUser = db.prepare(`
  SELECT u.id, u.name, u.email, u.created_at AS createdAt
  FROM sessions s
  JOIN users u ON u.id = s.user_id
  WHERE s.token_hash = ? AND s.expires_at > ?
`);
const deleteSession = db.prepare('DELETE FROM sessions WHERE token_hash = ?');
const deleteOtherSessions = db.prepare('DELETE FROM sessions WHERE user_id = ? AND token_hash != ?');
const deleteExpiredSessions = db.prepare('DELETE FROM sessions WHERE expires_at <= ?');

// `secure` follows the request, so the cookie works over plain HTTP on localhost
// and is HTTPS-only wherever the site is actually served over TLS.
const cookieOptions = (req) => ({ httpOnly: true, sameSite: 'lax', secure: req.secure, path: '/' });

export function startSession(req, res, userId) {
  const token = randomBytes(32).toString('base64url');
  insertSession.run(hashToken(token), userId, Date.now() + ttlMs);
  res.cookie(cookieName, token, { ...cookieOptions(req), maxAge: ttlMs });
}

export function getSessionUser(req) {
  const token = req.cookies?.[cookieName];
  if (typeof token !== 'string' || !token) return null;
  return selectSessionUser.get(hashToken(token), Date.now()) ?? null;
}

export function endSession(req, res) {
  const token = req.cookies?.[cookieName];
  if (typeof token === 'string' && token) deleteSession.run(hashToken(token));
  res.clearCookie(cookieName, cookieOptions(req));
}

// Signs the user out everywhere except the browser making this request.
export function endOtherSessions(req, userId) {
  deleteOtherSessions.run(userId, hashToken(req.cookies?.[cookieName] ?? ''));
}

export function purgeExpiredSessions() {
  deleteExpiredSessions.run(Date.now());
}
