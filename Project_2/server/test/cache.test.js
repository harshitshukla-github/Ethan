import assert from 'node:assert/strict';
import { after, test } from 'node:test';

process.env.DATABASE_FILE = ':memory:';

const { cached } = await import('../src/lib/cache.js');
const { db } = await import('../src/db.js');

const HOUR = 60 * 60 * 1000;

after(() => db.close());

// Makes an entry look as if it was fetched long ago, so the next read tries to refresh it.
const expire = (key) => db.prepare('UPDATE api_cache SET fetched_at = 0 WHERE key = ?').run(key);

test('data is fetched once and then served from the cache', async () => {
  let calls = 0;
  const fetcher = async () => ({ call: ++calls });

  const first = await cached('fresh', HOUR, fetcher);
  const second = await cached('fresh', HOUR, fetcher);

  assert.deepEqual(first.data, { call: 1 });
  assert.deepEqual(second.data, { call: 1 });
  assert.equal(second.stale, false);
  assert.equal(calls, 1);
});

test('concurrent requests share a single upstream call', async () => {
  let calls = 0;
  const fetcher = async () => {
    calls++;
    await new Promise((resolve) => setTimeout(resolve, 20));
    return 'shared';
  };

  const results = await Promise.all([cached('busy', HOUR, fetcher), cached('busy', HOUR, fetcher)]);

  assert.deepEqual(results.map((result) => result.data), ['shared', 'shared']);
  assert.equal(calls, 1);
});

test('an expired entry is refreshed', async () => {
  await cached('aging', HOUR, async () => 'old');
  expire('aging');

  const refreshed = await cached('aging', HOUR, async () => 'new');

  assert.equal(refreshed.data, 'new');
  assert.equal(refreshed.stale, false);
});

test('the last good copy is served when a refresh fails, without retrying straight away', async () => {
  await cached('flaky', HOUR, async () => 'good');
  expire('flaky');

  let calls = 0;
  const failing = async () => {
    calls++;
    throw new Error('upstream down');
  };

  const first = await cached('flaky', HOUR, failing);
  const second = await cached('flaky', HOUR, failing);

  assert.deepEqual([first.data, first.stale], ['good', true]);
  assert.deepEqual([second.data, second.stale], ['good', true]);
  assert.equal(calls, 1, 'the upstream should get a rest after failing');
});

test('a failure with nothing cached reaches the caller', async () => {
  const failing = async () => {
    throw new Error('upstream down');
  };

  await assert.rejects(cached('never-loaded', HOUR, failing), /upstream down/);
  await assert.rejects(cached('never-loaded', HOUR, failing), /not retrying yet/);
});
