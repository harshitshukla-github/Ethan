import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { createApp, readConfig } from "../server.mjs";

const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
const config = {
  clientId: "test-client-id",
  clientSecret: "test-client-secret",
  sessionSecret: "test-session-secret-at-least-32-characters",
  redirectUri: "http://127.0.0.1:3000/auth/callback",
};
const uri = "spotify:track:1234567890123456789012";

async function fixture(t, handler) {
  const calls = [];
  let logins = 0;
  const app = createApp(config, {
    fetchImpl: async (url, options = {}) => {
      const call = { url: String(url), ...options };
      calls.push(call);
      const custom = await handler?.(call, calls);
      if (custom) return custom;
      if (url.endsWith("/api/token")) {
        logins++;
        return json({
          access_token: `access-${logins}`,
          refresh_token: `refresh-${logins}`,
          expires_in: 3600,
        });
      }
      if (url.endsWith("/me"))
        return json({ display_name: "A music listener" });
      if (url.includes("/search?"))
        return json({
          tracks: {
            items: [
              {
                id: "1234567890123456789012",
                uri,
                name: "<script>Song</script>",
                artists: [{ name: "Artist" }],
                album: { name: "Album", images: [] },
                duration_ms: 180000,
              },
              null,
            ],
          },
        });
      return new Response(null, { status: 204 });
    },
  });
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(
    () =>
      new Promise((resolve) => {
        server.closeAllConnections();
        server.close(resolve);
      }),
  );
  const base = `http://127.0.0.1:${server.address().port}`;

  function newClient() {
    let cookie = "";
    let csrf = "";
    const request = async (
      path,
      { method = "GET", body, headers = {}, withCsrf = true } = {},
    ) => {
      const response = await fetch(`${base}${path}`, {
        method,
        redirect: "manual",
        headers: {
          Cookie: cookie,
          ...(csrf && withCsrf && { "X-CSRF-Token": csrf }),
          ...(body !== undefined && { "Content-Type": "application/json" }),
          ...headers,
        },
        ...(body !== undefined && { body: JSON.stringify(body) }),
      });
      const setCookie = response.headers.getSetCookie();
      if (setCookie.length) cookie = setCookie.at(-1).split(";")[0];
      return response;
    };
    const login = async () => {
      const start = await request("/auth/login");
      const authorize = new URL(start.headers.get("location"));
      const result = await request(
        `/auth/callback?code=test-code&state=${authorize.searchParams.get("state")}`,
      );
      assert.equal(result.headers.get("location"), "/");
      const state = await (await request("/api/session")).json();
      csrf = state.csrfToken;
      return { start, authorize, state };
    };
    return { request, login };
  }
  return { calls, base, newClient, ...newClient() };
}

test("local page loads; protected endpoints require sign-in", async (t) => {
  const f = await fixture(t);
  assert.equal((await f.request("/")).status, 200);
  assert.deepEqual(await (await f.request("/health")).json(), { ok: true });
  assert.deepEqual(await (await f.request("/api/session")).json(), {
    authenticated: false,
    csrfToken: null,
  });
  assert.equal((await f.request("/api/search?q=hello")).status, 401);
  assert.equal((await f.request("/api/token")).status, 401);
  assert.equal(f.calls.length, 0);
});

test("OAuth signs in with a protected cookie; credentials stay server-side", async (t) => {
  const f = await fixture(t);
  const { start, authorize, state } = await f.login();
  assert.equal(authorize.origin, "https://accounts.spotify.com");
  assert.equal(authorize.searchParams.get("response_type"), "code");
  assert.equal(authorize.searchParams.get("redirect_uri"), config.redirectUri);
  assert.match(authorize.searchParams.get("scope"), /streaming/);
  assert.match(start.headers.get("set-cookie"), /HttpOnly/);
  assert.match(start.headers.get("set-cookie"), /SameSite=Lax/);
  assert.equal(state.authenticated, true);
  assert.equal(state.csrfToken.length, 64);
  assert.ok(!JSON.stringify(state).includes("refresh-"));
  const profile = await f.request("/api/me");
  assert.deepEqual(await profile.json(), { displayName: "A music listener" });
  const token = await f.request("/api/token");
  assert.equal(token.headers.get("cache-control"), "no-store");
  assert.deepEqual(await token.json(), { accessToken: "access-1" });
  assert.equal(f.calls[0].body.get("grant_type"), "authorization_code");
  assert.equal(
    f.calls[0].headers.Authorization,
    `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64")}`,
  );
});

test("forged or reused OAuth state cannot exchange a code", async (t) => {
  const f = await fixture(t);
  const start = await f.request("/auth/login");
  const state = new URL(start.headers.get("location")).searchParams.get(
    "state",
  );
  const invalid = await f.request("/auth/callback?code=x&state=wrong-state");
  assert.equal(invalid.headers.get("location"), "/?error=invalid_state");
  const replay = await f.request(`/auth/callback?code=x&state=${state}`);
  assert.equal(replay.headers.get("location"), "/?error=invalid_state");
  assert.equal(f.calls.length, 0);
});

test("mutation endpoints reject missing CSRF and cross-origin requests", async (t) => {
  const f = await fixture(t);
  await f.login();
  assert.equal(
    (
      await f.request("/api/play", {
        method: "PUT",
        body: { deviceId: "browser", uris: [uri] },
        withCsrf: false,
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await f.request("/api/play", {
        method: "PUT",
        body: { deviceId: "browser", uris: [uri] },
        headers: { Origin: "https://other.example" },
      })
    ).status,
    403,
  );
  assert.equal(f.calls.length, 1);
});

test("search encodes queries, respects the 10-result limit, and tolerates missing fields", async (t) => {
  const f = await fixture(t);
  await f.login();
  const response = await f.request("/api/search?q=artist%3AA%26B");
  assert.equal(response.status, 200);
  const { tracks } = await response.json();
  assert.equal(tracks.length, 1);
  assert.equal(tracks[0].name, "<script>Song</script>");
  assert.equal(tracks[0].image, "");
  const url = new URL(f.calls.at(-1).url);
  assert.equal(url.searchParams.get("q"), "artist:A&B");
  assert.equal(url.searchParams.get("limit"), "10");
  assert.equal((await f.request("/api/search?q=")).status, 400);
  assert.equal(
    (await f.request("/api/search?q=" + "x".repeat(201))).status,
    400,
  );
});

test("playback targets the SDK device and correctly handles empty 204 responses", async (t) => {
  const f = await fixture(t);
  await f.login();
  assert.equal(
    (
      await f.request("/api/transfer", {
        method: "PUT",
        body: { deviceId: "browser" },
      })
    ).status,
    204,
  );
  assert.deepEqual(JSON.parse(f.calls.at(-1).body), {
    device_ids: ["browser"],
    play: false,
  });
  const play = await f.request("/api/play", {
    method: "PUT",
    body: { deviceId: "browser", uris: [uri] },
  });
  assert.equal(play.status, 204);
  assert.equal(await play.text(), "");
  assert.equal(
    f.calls.at(-1).url,
    "https://api.spotify.com/v1/me/player/play?device_id=browser",
  );
  assert.deepEqual(JSON.parse(f.calls.at(-1).body), { uris: [uri] });
  const resume = await f.request("/api/play", {
    method: "PUT",
    body: { deviceId: "browser" },
  });
  assert.equal(resume.status, 204);
  assert.equal(f.calls.at(-1).body, undefined);
  for (const [route, method] of [
    ["pause", "PUT"],
    ["next", "POST"],
    ["previous", "POST"],
  ]) {
    assert.equal(
      (
        await f.request(`/api/${route}`, {
          method,
          body: { deviceId: "browser" },
        })
      ).status,
      204,
    );
    assert.equal(f.calls.at(-1).method, method);
    assert.ok(f.calls.at(-1).url.includes(`/player/${route}?`));
  }
});

test("invalid devices and track URIs do not reach Spotify", async (t) => {
  const f = await fixture(t);
  await f.login();
  for (const body of [
    {},
    { deviceId: "../bad" },
    { deviceId: "browser", uris: [] },
    { deviceId: "browser", uris: ["https://example.com/music.mp3"] },
  ]) {
    assert.equal(
      (await f.request("/api/play", { method: "PUT", body })).status,
      400,
    );
  }
  assert.equal(f.calls.length, 1);
});

test("expired tokens refresh and preserve an omitted refresh token", async (t) => {
  let exchanges = 0;
  const f = await fixture(t, (call) => {
    if (!call.url.endsWith("/api/token")) return;
    exchanges++;
    if (exchanges === 1)
      return json({
        access_token: "old",
        refresh_token: "keep-me",
        expires_in: 1,
      });
    assert.equal(call.body.get("grant_type"), "refresh_token");
    assert.equal(call.body.get("refresh_token"), "keep-me");
    return json({
      access_token: `new-${exchanges}`,
      expires_in: exchanges === 2 ? 1 : 3600,
    });
  });
  await f.login();
  assert.deepEqual(await (await f.request("/api/token")).json(), {
    accessToken: "new-2",
  });
  assert.deepEqual(await (await f.request("/api/token")).json(), {
    accessToken: "new-3",
  });
});

test("a Spotify 401 refreshes the token and retries only once", async (t) => {
  let searches = 0;
  const f = await fixture(t, (call) => {
    if (call.url.includes("/search?")) {
      searches++;
      return json({ error: { message: "Expired" } }, 401);
    }
  });
  await f.login();
  const response = await f.request("/api/search?q=song");
  assert.equal(response.status, 401);
  assert.equal(searches, 2);
  assert.equal(
    f.calls.filter((call) => call.url.endsWith("/api/token")).length,
    2,
  );
});

test("Spotify rate limits preserve Retry-After", async (t) => {
  const f = await fixture(t, (call) =>
    call.url.includes("/search?")
      ? json({ error: { message: "Too many requests" } }, 429, {
          "Retry-After": "17",
        })
      : undefined,
  );
  await f.login();
  const response = await f.request("/api/search?q=song");
  assert.equal(response.status, 429);
  assert.equal(response.headers.get("retry-after"), "17");
  assert.match((await response.json()).error, /17 seconds/);
});

test("separate browsers keep separate tokens, and logout removes access", async (t) => {
  const f = await fixture(t);
  const second = f.newClient();
  await f.login();
  await second.login();
  assert.deepEqual(await (await f.request("/api/token")).json(), {
    accessToken: "access-1",
  });
  assert.deepEqual(await (await second.request("/api/token")).json(), {
    accessToken: "access-2",
  });
  assert.equal(
    (await f.request("/api/logout", { method: "POST", body: {} })).status,
    204,
  );
  assert.equal((await f.request("/api/token")).status, 401);
  assert.equal((await second.request("/api/token")).status, 200);
});

test("configuration rejects missing secrets and a mismatched callback port", () => {
  assert.throws(() => readConfig({}), /SPOTIFY_CLIENT_ID/);
  const env = {
    SPOTIFY_CLIENT_ID: "id",
    SPOTIFY_CLIENT_SECRET: "secret",
    SESSION_SECRET: "x".repeat(32),
    PORT: "3000",
  };
  assert.equal(readConfig(env).redirectUri, config.redirectUri);
  assert.throws(
    () =>
      readConfig({
        ...env,
        SPOTIFY_REDIRECT_URI: "http://localhost:3000/auth/callback",
      }),
    /127\.0\.0\.1/,
  );
  assert.throws(
    () =>
      readConfig({
        ...env,
        SPOTIFY_REDIRECT_URI: "http://127.0.0.1:4000/auth/callback",
      }),
    /3000/,
  );
});
