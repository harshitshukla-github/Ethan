import { Router } from 'express';
import { cached, fetchJson } from '../lib/cache.js';
import { HttpError } from '../lib/httpError.js';
import { upstreamLimiter } from '../middleware/rateLimits.js';

const router = Router();

// Launch Library 2 allows 15 anonymous requests per hour per IP; a 20 minute cache uses at most three.
const UPCOMING_URL =
  'https://ll.thespacedevs.com/2.3.0/launches/upcoming/?limit=12&mode=normal&hide_recent_previous=true';
const TTL_MS = 20 * 60 * 1000;

// Launch Library fills gaps with the literal string "Unknown"; treat that as missing.
const known = (value) => (value && value !== 'Unknown' ? value : null);

const toLaunch = (launch) => ({
  id: launch.id,
  name: launch.name,
  status: launch.status?.name ?? 'Unknown',
  statusCode: launch.status?.abbrev ?? null,
  net: launch.net,
  netPrecision: launch.net_precision?.name ?? null,
  provider: launch.launch_service_provider?.name ?? null,
  rocket: launch.rocket?.configuration?.full_name ?? launch.rocket?.configuration?.name ?? null,
  mission: launch.mission
    ? {
        name: launch.mission.name,
        type: known(launch.mission.type),
        orbit: known(launch.mission.orbit?.name),
        description: launch.mission.description ?? null,
      }
    : null,
  pad: launch.pad?.name ?? null,
  location: launch.pad?.location?.name ?? null,
  image: launch.image?.image_url ?? null,
  thumbnail: launch.image?.thumbnail_url ?? launch.image?.image_url ?? null,
  imageCredit: known(launch.image?.credit),
  webcastLive: Boolean(launch.webcast_live),
});

async function fetchUpcoming() {
  const body = await fetchJson(UPCOMING_URL, { timeoutMs: 15_000 });
  return (body.results ?? []).filter((launch) => launch.net).map(toLaunch);
}

router.get('/', upstreamLimiter, async (req, res) => {
  let result;
  try {
    result = await cached('launches:upcoming', TTL_MS, fetchUpcoming);
  } catch (err) {
    console.warn(`Launch schedule unavailable: ${err.message}`);
    throw new HttpError(503, 'The launch schedule is unavailable right now. Please try again in a few minutes.');
  }
  res.json({ launches: result.data, fetchedAt: result.fetchedAt, stale: result.stale });
});

export default router;
