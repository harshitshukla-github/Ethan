import { fileURLToPath } from 'node:url';
import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import config from './config.js';
import { pingDatabase } from './db/pool.js';
import defaultLocationModel from './models/locationModel.js';
import { createLocationsRouter } from './routes/locations.js';
import { apiNotFound, errorHandler } from './middleware/errorHandler.js';

const publicDir = fileURLToPath(new URL('../public', import.meta.url));

// Origins the Google Maps JavaScript API loads scripts, tiles, fonts and workers from.
// https://developers.google.com/maps/documentation/javascript/content-security-policy
const GOOGLE_MAPS = {
  scripts: ['https://*.googleapis.com', 'https://*.gstatic.com', '*.google.com', 'https://*.ggpht.com', '*.googleusercontent.com'],
  images: ['https://*.googleapis.com', 'https://*.gstatic.com', '*.google.com', '*.googleusercontent.com', 'https://*.ggpht.com'],
  connect: ['https://*.googleapis.com', '*.google.com', 'https://*.gstatic.com'],
};

function securityHeaders() {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", ...GOOGLE_MAPS.scripts, 'blob:'],
        imgSrc: ["'self'", 'data:', 'blob:', ...GOOGLE_MAPS.images],
        connectSrc: ["'self'", ...GOOGLE_MAPS.connect, 'data:', 'blob:'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        workerSrc: ['blob:'],
        frameSrc: ['*.google.com'],
        // Browsers would otherwise try to upgrade http://localhost asset requests to https.
        upgradeInsecureRequests: config.isProduction ? [] : null,
      },
    },
  });
}

/**
 * Builds the Express app. Dependencies are injectable so tests can run without MySQL.
 */
export function createApp({
  locationModel = defaultLocationModel,
  checkDatabase = pingDatabase,
  suggestRateLimit = { windowMs: 15 * 60 * 1000, limit: 20 },
} = {}) {
  const app = express();

  app.use(securityHeaders());
  app.use(express.json({ limit: '16kb' }));

  app.get('/api/health', async (req, res) => {
    try {
      await checkDatabase();
      res.json({ status: 'ok', database: 'up' });
    } catch {
      res.status(503).json({ status: 'degraded', database: 'down' });
    }
  });

  // The Maps JavaScript API key is necessarily visible to the browser. It lives in .env rather than
  // in source control, and must be locked down with HTTP-referrer + API restrictions in Google Cloud.
  app.get('/api/config', (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json({ googleMaps: { apiKey: config.googleMaps.apiKey, mapId: config.googleMaps.mapId } });
  });

  const suggestLimiter = rateLimit({
    ...suggestRateLimit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: { message: 'Too many suggestions from this address. Please try again later.' } },
  });

  app.use('/api/locations', createLocationsRouter({ locationModel, suggestLimiter }));
  app.use('/api', apiNotFound);

  app.use(express.static(publicDir));
  app.use(errorHandler);

  return app;
}
