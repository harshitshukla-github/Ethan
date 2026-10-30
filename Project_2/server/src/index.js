import { createApp } from './app.js';
import { config } from './config.js';
import { databaseFile, db } from './db.js';
import { pruneCache } from './lib/cache.js';
import { purgeExpiredSessions } from './lib/sessions.js';

const HOUR = 60 * 60 * 1000;

function housekeeping() {
  purgeExpiredSessions();
  pruneCache();
}
housekeeping();
setInterval(housekeeping, HOUR).unref();

const app = createApp();

// No host argument: Node then listens on every interface, which hosting platforms require.
const server = app.listen(config.port, (err) => {
  if (err) throw err;
  console.log(`Server listening on http://localhost:${config.port}`);
  console.log(`SQLite database: ${databaseFile}`);
  if (config.onRailway && !process.env.RAILWAY_VOLUME_MOUNT_PATH && !process.env.DATA_DIR) {
    console.warn('No Railway volume is attached: accounts and favorites will be erased by the next deploy.');
  }
});

// Hosts send SIGTERM on every redeploy; finish in-flight requests and close SQLite cleanly.
function shutdown(signal) {
  console.log(`${signal} received, shutting down.`);
  server.close(() => {
    db.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
