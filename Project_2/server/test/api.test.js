import assert from 'node:assert/strict';
import { once } from 'node:events';
import { after, before, test } from 'node:test';

// Every run gets a throwaway database; nothing here touches server/data/space.db.
process.env.DATABASE_FILE = ':memory:';

const { createApp } = await import('../src/app.js');
const { db } = await import('../src/db.js');

let server;
let baseUrl;

before(async () => {
  server = createApp().listen(0);
  await once(server, 'listening');
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  server.close();
  db.close();
});

// A minimal browser stand-in: remembers the session cookie between requests.
function createClient() {
  let cookie = '';
  return async function request(method, path, body) {
    const response = await fetch(baseUrl + path, {
      method,
      headers: {
        ...(body !== undefined && { 'content-type': 'application/json' }),
        ...(cookie && { cookie }),
      },
      body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
    });
    const setCookie = response.headers.getSetCookie();
    for (const header of setCookie) {
      const pair = header.split(';')[0];
      cookie = pair.endsWith('=') ? '' : pair;
    }
    const text = await response.text();
    return { status: response.status, body: text ? JSON.parse(text) : null, setCookie };
  };
}

const account = { name: 'Test Pilot', email: 'pilot@example.com', password: 'orbital-velocity-7.8' };
const visitor = createClient();
const pilot = createClient();

test('health check responds', async () => {
  const { status, body } = await visitor('GET', '/api/health');
  assert.equal(status, 200);
  assert.deepEqual(body, { status: 'ok' });
});

test('catalog endpoints return planets and missions', async () => {
  const planets = await visitor('GET', '/api/planets');
  assert.equal(planets.body.planets.length, 9);

  const mars = await visitor('GET', '/api/planets/mars');
  assert.equal(mars.body.planet.name, 'Mars');
  assert.ok(mars.body.missions.some((mission) => mission.id === 'perseverance'));

  const missions = await visitor('GET', '/api/missions');
  assert.ok(missions.body.missions.length > 20);
  assert.equal(missions.body.missions[0].description, undefined, 'list should only carry summaries');

  const apollo = await visitor('GET', '/api/missions/apollo-11');
  assert.equal(apollo.body.mission.name, 'Apollo 11');
  assert.ok(apollo.body.mission.highlights.length > 0);

  assert.equal((await visitor('GET', '/api/planets/vulcan')).status, 404);
  assert.equal((await visitor('GET', '/api/missions/nope')).status, 404);
});

test('registration rejects invalid input with per-field messages', async () => {
  const { status, body } = await visitor('POST', '/api/auth/register', { name: 'A', email: 'nope', password: 'short' });
  assert.equal(status, 400);
  assert.deepEqual(Object.keys(body.error.fields).sort(), ['email', 'name', 'password']);
});

test('registering signs the user in with an HttpOnly session cookie', async () => {
  const { status, body, setCookie } = await pilot('POST', '/api/auth/register', account);
  assert.equal(status, 201);
  assert.equal(body.user.email, account.email);
  assert.equal(body.user.passwordHash, undefined);
  assert.match(setCookie[0], /^sid=.+; .*HttpOnly/);
  assert.match(setCookie[0], /SameSite=Lax/);

  const me = await pilot('GET', '/api/auth/me');
  assert.equal(me.body.user.name, account.name);
});

test('passwords and session tokens are stored only as hashes', () => {
  const user = db.prepare('SELECT password_hash FROM users WHERE email = ?').get(account.email);
  assert.match(user.password_hash, /^scrypt\$/);
  assert.ok(!user.password_hash.includes(account.password));

  const session = db.prepare('SELECT token_hash FROM sessions').get();
  assert.match(session.token_hash, /^[0-9a-f]{64}$/);
});

test('an email address can only be registered once, whatever its case', async () => {
  const { status, body } = await visitor('POST', '/api/auth/register', { ...account, email: 'PILOT@Example.com' });
  assert.equal(status, 409);
  assert.ok(body.error.fields.email);
});

test('sign-in fails the same way for a wrong password and an unknown email', async () => {
  const wrongPassword = await visitor('POST', '/api/auth/login', { email: account.email, password: 'not-the-password' });
  const unknownEmail = await visitor('POST', '/api/auth/login', { email: 'nobody@example.com', password: account.password });
  assert.equal(wrongPassword.status, 401);
  assert.equal(unknownEmail.status, 401);
  assert.deepEqual(wrongPassword.body, unknownEmail.body);

  assert.equal((await visitor('GET', '/api/auth/me')).body.user, null);
});

test('favorites require a session and only accept real catalog items', async () => {
  assert.equal((await visitor('GET', '/api/favorites')).status, 401);
  assert.equal((await visitor('PUT', '/api/favorites/planet/mars')).status, 401);

  assert.equal((await pilot('PUT', '/api/favorites/planet/mars')).status, 204);
  assert.equal((await pilot('PUT', '/api/favorites/planet/mars')).status, 204, 'adding twice is harmless');
  assert.equal((await pilot('PUT', '/api/favorites/mission/voyager-1')).status, 204);
  assert.equal((await pilot('PUT', '/api/favorites/planet/vulcan')).status, 404);
  assert.equal((await pilot('PUT', '/api/favorites/__proto__/mars')).status, 404);

  const list = await pilot('GET', '/api/favorites');
  assert.deepEqual(
    list.body.favorites.map(({ type, id }) => `${type}:${id}`).sort(),
    ['mission:voyager-1', 'planet:mars'],
  );

  assert.equal((await pilot('DELETE', '/api/favorites/planet/mars')).status, 204);
  assert.equal((await pilot('GET', '/api/favorites')).body.favorites.length, 1);
});

test('the display name can be updated', async () => {
  const { status, body } = await pilot('PATCH', '/api/auth/me', { name: '  Flight   Director ' });
  assert.equal(status, 200);
  assert.equal(body.user.name, 'Flight Director');
});

test('changing the password signs out other devices and replaces the old password', async () => {
  const otherDevice = createClient();
  assert.equal((await otherDevice('POST', '/api/auth/login', account)).status, 200);

  const newPassword = 'escape-velocity-11.2';
  const rejected = await pilot('POST', '/api/auth/password', { currentPassword: 'wrong-guess', newPassword });
  assert.equal(rejected.status, 400);
  assert.ok(rejected.body.error.fields.currentPassword);

  const accepted = await pilot('POST', '/api/auth/password', { currentPassword: account.password, newPassword });
  assert.equal(accepted.status, 204);

  assert.equal((await otherDevice('GET', '/api/auth/me')).body.user, null);
  assert.ok((await pilot('GET', '/api/auth/me')).body.user);
  assert.equal((await visitor('POST', '/api/auth/login', account)).status, 401);

  account.password = newPassword;
  assert.equal((await otherDevice('POST', '/api/auth/login', account)).status, 200);
});

test('signing out ends the session on the server', async () => {
  const device = createClient();
  await device('POST', '/api/auth/login', account);
  const sessionsBefore = db.prepare('SELECT COUNT(*) AS n FROM sessions').get().n;

  assert.equal((await device('POST', '/api/auth/logout')).status, 204);
  assert.equal((await device('GET', '/api/auth/me')).body.user, null);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM sessions').get().n, sessionsBefore - 1);
});

test('deleting the account needs the password and removes all of its data', async () => {
  assert.equal((await pilot('DELETE', '/api/auth/me', { password: 'wrong-guess' })).status, 400);
  assert.equal((await pilot('DELETE', '/api/auth/me', { password: account.password })).status, 204);

  assert.equal((await pilot('GET', '/api/auth/me')).body.user, null);
  assert.equal((await visitor('POST', '/api/auth/login', account)).status, 401);
  for (const table of ['users', 'sessions', 'favorites']) {
    assert.equal(db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n, 0, `${table} should be empty`);
  }
});

test('unknown routes and malformed bodies get JSON errors', async () => {
  const missing = await visitor('GET', '/api/does-not-exist');
  assert.equal(missing.status, 404);
  assert.ok(missing.body.error.message);

  const malformed = await visitor('POST', '/api/auth/login', '{"email": ');
  assert.equal(malformed.status, 400);
  assert.ok(malformed.body.error.message);
});
