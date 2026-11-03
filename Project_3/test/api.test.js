import { after, before, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApp } from '../src/app.js';

const SPOT = {
  id: 1,
  name: 'Mission Community Compost Hub',
  category: 'compost',
  description: 'Food scraps welcome.',
  address: '2450 Folsom St, San Francisco, CA 94110',
  latitude: 37.7585,
  longitude: -122.4142,
  website: null,
  phone: null,
  hours: 'Sat–Sun 9:00–13:00',
  is_verified: true,
  review_count: 1,
  avg_rating: 5,
};

const VALID_SUGGESTION = {
  name: 'Corner Repair Shop',
  category: 'electronics',
  address: '100 Main St, Springfield',
  latitude: '37.1234567',
  longitude: -122.5,
  website: 'https://example.org/repair',
};

function dbError(code) {
  return Object.assign(new Error(`simulated ${code}`), { code });
}

/** In-memory stand-in for models/locationModel.js that records calls and can be told to fail. */
function createFakeModel() {
  const model = {
    calls: { findVerified: [], findVerifiedById: [], createSuggestion: [] },
    failWith: null,
    async findVerified(args) {
      model.calls.findVerified.push(args);
      if (model.failWith) throw model.failWith;
      return [SPOT];
    },
    async findVerifiedById(id) {
      model.calls.findVerifiedById.push(id);
      if (model.failWith) throw model.failWith;
      return id === SPOT.id ? { ...SPOT, reviews: [{ id: 9, rating: 5, comment: 'Great', username: 'maya' }] } : null;
    },
    async createSuggestion(suggestion) {
      model.calls.createSuggestion.push(suggestion);
      if (model.failWith) throw model.failWith;
      return 42;
    },
  };
  return model;
}

describe('REST API', () => {
  const model = createFakeModel();
  let server;
  let baseUrl;
  let databaseUp = true;

  before(async () => {
    const app = createApp({
      locationModel: model,
      checkDatabase: async () => {
        if (!databaseUp) throw dbError('ECONNREFUSED');
      },
      suggestRateLimit: { windowMs: 60_000, limit: 100 },
    });
    server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  after(() => new Promise((resolve) => server.close(resolve)));

  beforeEach(() => {
    model.failWith = null;
    databaseUp = true;
    for (const list of Object.values(model.calls)) list.length = 0;
    console.error = () => {}; // keep expected error logs out of the test output
  });

  const get = (path) => fetch(`${baseUrl}${path}`);
  const post = (path, body, headers = { 'Content-Type': 'application/json' }) =>
    fetch(`${baseUrl}${path}`, { method: 'POST', headers, body: typeof body === 'string' ? body : JSON.stringify(body) });

  describe('GET /api/locations', () => {
    test('returns verified locations with no category filter', async () => {
      const res = await get('/api/locations');
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.deepEqual(body.data, [SPOT]);
      assert.deepEqual(body.meta, { count: 1, categories: [] });
      assert.deepEqual(model.calls.findVerified, [{ categories: [] }]);
    });

    test('accepts a comma-separated, case-insensitive category filter and de-duplicates it', async () => {
      const res = await get('/api/locations?category=Compost,electronics,compost');
      assert.equal(res.status, 200);
      assert.deepEqual(model.calls.findVerified, [{ categories: ['compost', 'electronics'] }]);
    });

    test('accepts repeated category params', async () => {
      await get('/api/locations?category=bulk_goods&category=recycling_center');
      assert.deepEqual(model.calls.findVerified, [{ categories: ['bulk_goods', 'recycling_center'] }]);
    });

    test('rejects unknown categories with 400', async () => {
      const res = await get('/api/locations?category=plastic');
      assert.equal(res.status, 400);
      const body = await res.json();
      assert.match(body.error.message, /Unknown category: plastic/);
      assert.equal(model.calls.findVerified.length, 0);
    });
  });

  describe('GET /api/locations/:id', () => {
    test('returns the location with its reviews', async () => {
      const res = await get('/api/locations/1');
      assert.equal(res.status, 200);
      const { data } = await res.json();
      assert.equal(data.id, 1);
      assert.equal(data.reviews.length, 1);
    });

    test('returns 404 for a missing or unverified location', async () => {
      const res = await get('/api/locations/999');
      assert.equal(res.status, 404);
      assert.deepEqual(await res.json(), { error: { message: 'Location not found.' } });
    });

    for (const bad of ['abc', '0', '-1', '1.5', '99999999999']) {
      test(`returns 400 for invalid id "${bad}"`, async () => {
        const res = await get(`/api/locations/${bad}`);
        assert.equal(res.status, 400);
        assert.equal(model.calls.findVerifiedById.length, 0);
      });
    }
  });

  describe('POST /api/locations/suggest', () => {
    test('creates an unverified suggestion and ignores a client-supplied is_verified', async () => {
      const res = await post('/api/locations/suggest', { ...VALID_SUGGESTION, is_verified: true, id: 7 });
      assert.equal(res.status, 201);
      const body = await res.json();
      assert.equal(body.data.id, 42);
      assert.equal(body.data.is_verified, false);
      assert.match(body.message, /verified/);

      const [saved] = model.calls.createSuggestion;
      assert.equal(saved.is_verified, undefined);
      assert.equal(saved.id, undefined);
      assert.equal(saved.latitude, 37.123457); // string coerced and rounded to DECIMAL(9,6)
      assert.equal(saved.description, null);
    });

    test('returns per-field errors for invalid input', async () => {
      const res = await post('/api/locations/suggest', {
        name: ' ',
        category: 'plastic',
        address: 'x',
        latitude: 95,
        longitude: 'east',
        website: 'javascript:alert(1)',
        phone: 'call me',
      });
      assert.equal(res.status, 400);
      const { error } = await res.json();
      assert.deepEqual(Object.keys(error.details).sort(), [
        'address',
        'category',
        'latitude',
        'longitude',
        'name',
        'phone',
        'website',
      ]);
      assert.equal(model.calls.createSuggestion.length, 0);
    });

    test('rejects malformed JSON with 400', async () => {
      const res = await post('/api/locations/suggest', '{"name": ');
      assert.equal(res.status, 400);
      assert.deepEqual(await res.json(), { error: { message: 'Request body must be valid JSON.' } });
    });

    test('rejects a non-JSON body with 400', async () => {
      const res = await post('/api/locations/suggest', 'name=x', { 'Content-Type': 'application/x-www-form-urlencoded' });
      assert.equal(res.status, 400);
    });
  });

  describe('database failures', () => {
    test('connection errors become 503 with a Retry-After header and no internals leaked', async () => {
      model.failWith = dbError('ECONNREFUSED');
      const res = await get('/api/locations');
      assert.equal(res.status, 503);
      assert.equal(res.headers.get('retry-after'), '30');
      const body = JSON.stringify(await res.json());
      assert.doesNotMatch(body, /ECONNREFUSED|simulated/);
    });

    test('AggregateError connection failures are recognised as unavailable', async () => {
      model.failWith = new AggregateError([dbError('ECONNREFUSED')], 'connect failed');
      const res = await get('/api/locations/1');
      assert.equal(res.status, 503);
    });

    test('bad credentials become 503', async () => {
      model.failWith = dbError('ER_ACCESS_DENIED_ERROR');
      const res = await post('/api/locations/suggest', VALID_SUGGESTION);
      assert.equal(res.status, 503);
    });

    test('a missing table becomes a generic 500', async () => {
      model.failWith = dbError('ER_NO_SUCH_TABLE');
      const res = await get('/api/locations');
      assert.equal(res.status, 500);
      assert.doesNotMatch(JSON.stringify(await res.json()), /ER_NO_SUCH_TABLE/);
    });

    test('/api/health reports the database state', async () => {
      assert.equal((await get('/api/health')).status, 200);
      databaseUp = false;
      const res = await get('/api/health');
      assert.equal(res.status, 503);
      assert.deepEqual(await res.json(), { status: 'degraded', database: 'down' });
    });
  });

  describe('misc', () => {
    test('/api/config exposes the map settings and is not cached', async () => {
      const res = await get('/api/config');
      assert.equal(res.status, 200);
      assert.equal(res.headers.get('cache-control'), 'no-store');
      const body = await res.json();
      assert.ok('apiKey' in body.googleMaps);
      assert.ok(body.googleMaps.mapId);
    });

    test('unknown API routes return JSON 404', async () => {
      const res = await get('/api/nope');
      assert.equal(res.status, 404);
      assert.match((await res.json()).error.message, /No API route/);
    });

    test('serves the frontend with a CSP that allows Google Maps', async () => {
      const res = await get('/');
      assert.equal(res.status, 200);
      assert.match(await res.text(), /Zero-Waste Matchmaker/);
      assert.match(res.headers.get('content-security-policy'), /script-src 'self' https:\/\/\*\.googleapis\.com/);
    });
  });
});
