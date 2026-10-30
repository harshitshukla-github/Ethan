import { db } from '../db.js';

const MAX_ENTRIES = 300;
const PRUNE_EVERY_WRITES = 50;
// After a failed refresh, wait this long before asking the upstream API again.
const RETRY_AFTER_MS = 60 * 1000;

const selectEntry = db.prepare('SELECT value, fetched_at AS fetchedAt FROM api_cache WHERE key = ?');
const upsertEntry = db.prepare(`
  INSERT INTO api_cache (key, value, fetched_at) VALUES (?, ?, ?)
  ON CONFLICT(key) DO UPDATE SET value = excluded.value, fetched_at = excluded.fetched_at
`);
const pruneEntries = db.prepare(`
  DELETE FROM api_cache
  WHERE key NOT IN (SELECT key FROM api_cache ORDER BY fetched_at DESC LIMIT ?)
`);

const inFlight = new Map();
const failedAt = new Map();
let writes = 0;

function store(key, data) {
  const fetchedAt = Date.now();
  upsertEntry.run(key, JSON.stringify(data), fetchedAt);
  // Search terms come from visitors, so the table is trimmed as it grows rather than only on a timer.
  if (++writes % PRUNE_EVERY_WRITES === 0) pruneCache();
  return { data, fetchedAt, stale: false };
}

/**
 * Returns cached data for `key`, refreshing it through `fetcher` once it is older than `ttlMs`.
 * The cache lives in SQLite so it survives restarts, and a stale copy is served whenever the
 * upstream API is down or rate limiting us.
 */
export async function cached(key, ttlMs, fetcher) {
  const entry = selectEntry.get(key);
  if (entry && Date.now() - entry.fetchedAt < ttlMs) {
    return { data: JSON.parse(entry.value), fetchedAt: entry.fetchedAt, stale: false };
  }

  const stale = entry && { data: JSON.parse(entry.value), fetchedAt: entry.fetchedAt, stale: true };

  // A struggling upstream is not helped by a retry on every page view.
  if (Date.now() - (failedAt.get(key) ?? 0) < RETRY_AFTER_MS) {
    if (stale) return stale;
    throw new Error(`"${key}" failed to load moments ago; not retrying yet`);
  }

  // Concurrent requests for the same key share one upstream call.
  let pending = inFlight.get(key);
  if (!pending) {
    pending = fetcher()
      .then((data) => {
        failedAt.delete(key);
        return store(key, data);
      })
      .catch((err) => {
        failedAt.set(key, Date.now());
        throw err;
      })
      .finally(() => inFlight.delete(key));
    inFlight.set(key, pending);
  }

  try {
    return await pending;
  } catch (err) {
    if (!stale) throw err;
    console.warn(`Serving stale cache for "${key}": ${err.message}`);
    return stale;
  }
}

export function pruneCache() {
  pruneEntries.run(MAX_ENTRIES);
  for (const [key, time] of failedAt) {
    if (Date.now() - time >= RETRY_AFTER_MS) failedAt.delete(key);
  }
}

export async function fetchJson(url, { timeoutMs = 10_000 } = {}) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: { accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`${new URL(url).host} responded with ${response.status}`);
  }
  return response.json();
}
