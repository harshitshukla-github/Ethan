import config from './config.js';
import { createApp } from './app.js';
import { closePool, pingDatabase } from './db/pool.js';

const app = createApp();

const server = app.listen(config.port, () => {
  console.log(`Zero-Waste Matchmaker running at http://localhost:${config.port}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${config.port} is already in use. Set a different PORT in .env.`);
  } else {
    console.error('HTTP server error:', err);
  }
  process.exit(1);
});

// Start serving even if MySQL is down: the UI still loads and API routes answer 503 until it recovers.
try {
  await pingDatabase();
  console.log(`Connected to MySQL database "${config.db.database}" on ${config.db.host}:${config.db.port}.`);
} catch (err) {
  console.warn(
    `[db] Could not connect to MySQL (${err.code ?? err.message}). API routes will return 503 until it is reachable.\n` +
      '     Check the DB_* settings in .env, then run "npm run db:setup".',
  );
}

if (!config.googleMaps.apiKey) {
  console.warn('[maps] GOOGLE_MAPS_API_KEY is not set in .env; the map panel will show setup instructions instead.');
}

function shutdown(signal) {
  console.log(`${signal} received, shutting down...`);
  server.close(async () => {
    await closePool().catch(() => {});
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
