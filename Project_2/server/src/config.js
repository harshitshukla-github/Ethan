import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const { values: args } = parseArgs({ options: { port: { type: 'string' } }, strict: false });

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Local overrides only. A host such as Railway injects real environment variables instead.
try {
  process.loadEnvFile(path.join(serverRoot, '.env'));
} catch (err) {
  if (err.code !== 'ENOENT') throw err;
}

const onRailway = Boolean(process.env.RAILWAY_PROJECT_ID);
const isProduction = process.env.NODE_ENV === 'production' || onRailway;

function parseTrustProxy(value) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return /^\d+$/.test(value) ? Number(value) : value;
}

export const config = {
  isProduction,
  onRailway,
  // Hosts such as Railway assign PORT. The dev script passes --port instead, so the API stays
  // where Vite's proxy expects it even when PORT happens to be set in the environment.
  port: Number(args.port || process.env.PORT) || 4000,

  // On Railway the SQLite file must live on the attached volume, or every deploy starts from an empty database.
  dataDir: process.env.DATA_DIR || process.env.RAILWAY_VOLUME_MOUNT_PATH || path.join(serverRoot, 'data'),
  // Full path override, mainly so tests can run against ':memory:'.
  databaseFile: process.env.DATABASE_FILE || null,

  clientDist: path.resolve(serverRoot, '..', 'client', 'dist'),

  // How many reverse proxies sit in front of the app. Needed for real client IPs and HTTPS detection.
  trustProxy: process.env.TRUST_PROXY ? parseTrustProxy(process.env.TRUST_PROXY) : isProduction ? 1 : false,

  session: {
    cookieName: 'sid',
    ttlMs: 30 * 24 * 60 * 60 * 1000,
  },
};
