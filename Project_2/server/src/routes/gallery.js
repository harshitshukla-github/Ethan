import { Router } from 'express';
import { cached, fetchJson } from '../lib/cache.js';
import { HttpError } from '../lib/httpError.js';
import { upstreamLimiter } from '../middleware/rateLimits.js';

const router = Router();

// NASA Image and Video Library: public, no API key required.
const SEARCH_URL = 'https://images-api.nasa.gov/search';
const DEFAULT_QUERY = 'nebula';
const PAGE_SIZE = 24;
const MAX_PAGE = 40;
const MAX_QUERY_LENGTH = 80;
const MAX_DESCRIPTION_LENGTH = 1500;
// Widest rendition offered to the lightbox: sharp on large screens without pulling 50 MB originals.
const MAX_IMAGE_WIDTH = 2000;
const TTL_MS = 12 * 60 * 60 * 1000;

function cleanText(text) {
  const plain = String(text ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return plain.length > MAX_DESCRIPTION_LENGTH ? `${plain.slice(0, MAX_DESCRIPTION_LENGTH).trimEnd()}…` : plain;
}

function toItem(item) {
  const meta = item.data?.[0];
  const renditions = (item.links ?? [])
    .filter((link) => link.render === 'image' && link.href)
    .sort((a, b) => (a.width ?? 0) - (b.width ?? 0));
  if (!meta?.nasa_id || renditions.length === 0) return null;

  const thumbnail = renditions.find((link) => link.rel === 'preview') ?? renditions[0];
  const full = renditions.filter((link) => (link.width ?? 0) <= MAX_IMAGE_WIDTH).at(-1) ?? renditions[0];

  return {
    id: meta.nasa_id,
    title: cleanText(meta.title) || 'Untitled',
    description: cleanText(meta.description),
    date: meta.date_created ?? null,
    center: meta.center ?? null,
    credit: meta.secondary_creator ?? meta.photographer ?? null,
    keywords: (meta.keywords ?? []).slice(0, 6),
    thumbnail: thumbnail.href,
    image: full.href,
  };
}

async function searchImages(query, page) {
  const url = new URL(SEARCH_URL);
  url.search = new URLSearchParams({ q: query, media_type: 'image', page_size: PAGE_SIZE, page });

  const { collection } = await fetchJson(url.href, { timeoutMs: 15_000 });
  const total = collection?.metadata?.total_hits ?? 0;
  return {
    query,
    page,
    total,
    hasMore: page < MAX_PAGE && page * PAGE_SIZE < total,
    items: (collection?.items ?? []).map(toItem).filter(Boolean),
  };
}

router.get('/', upstreamLimiter, async (req, res) => {
  const text = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, MAX_QUERY_LENGTH) : '';
  const query = text || DEFAULT_QUERY;
  const page = Math.min(Math.max(Number.parseInt(req.query.page, 10) || 1, 1), MAX_PAGE);

  let result;
  try {
    result = await cached(`gallery:${query.toLowerCase()}:${page}`, TTL_MS, () => searchImages(query, page));
  } catch (err) {
    console.warn(`Image search unavailable: ${err.message}`);
    throw new HttpError(503, "NASA's image library is not responding right now. Please try again shortly.");
  }
  res.json({ ...result.data, stale: result.stale });
});

export default router;
