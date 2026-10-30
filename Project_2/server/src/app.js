import fs from 'node:fs';
import path from 'node:path';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';
import { config } from './config.js';
import { loadUser } from './middleware/auth.js';
import { apiNotFound, errorHandler } from './middleware/errors.js';
import authRoutes from './routes/auth.js';
import contentRoutes from './routes/content.js';
import favoritesRoutes from './routes/favorites.js';
import galleryRoutes from './routes/gallery.js';
import launchesRoutes from './routes/launches.js';

export function createApp() {
  const app = express();

  app.set('trust proxy', config.trustProxy);
  app.disable('x-powered-by');

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          'default-src': ["'self'"],
          'script-src': ["'self'"],
          'style-src': ["'self'"],
          // Launch and gallery pictures are loaded straight from their hosts.
          'img-src': ["'self'", 'data:', 'https:'],
          'font-src': ["'self'"],
          'connect-src': ["'self'"],
          'object-src': ["'none'"],
          'frame-ancestors': ["'none'"],
          // Would break plain-HTTP testing on localhost; only wanted where the site is served over HTTPS.
          'upgrade-insecure-requests': config.isProduction ? [] : null,
        },
      },
    }),
  );
  app.use(compression());

  const api = express.Router();
  api.use(express.json({ limit: '10kb' }));
  api.use(cookieParser());
  // Responses depend on who is signed in, so nothing may cache them unless a route opts in.
  api.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  api.use(loadUser);

  api.get('/health', (req, res) => res.json({ status: 'ok' }));
  api.use('/auth', authRoutes);
  api.use('/favorites', favoritesRoutes);
  api.use('/launches', launchesRoutes);
  api.use('/gallery', galleryRoutes);
  api.use(contentRoutes);
  api.use(apiNotFound);
  app.use('/api', api);

  const indexHtml = path.join(config.clientDist, 'index.html');
  if (fs.existsSync(indexHtml)) {
    serveClient(app, indexHtml);
  } else {
    app.get('/', (req, res) => {
      res
        .type('text/plain')
        .send('The API is running. Start the React dev server with "npm run dev", or run "npm run build" to serve the site from here.');
    });
  }

  app.use(errorHandler);
  return app;
}

// Production: Express serves the built React app, so the site and its API share one origin.
function serveClient(app, indexHtml) {
  app.use(
    express.static(config.clientDist, {
      index: false,
      setHeaders(res, filePath) {
        // Vite fingerprints everything under /assets, so those files can be cached indefinitely.
        const fingerprinted = filePath.includes(`${path.sep}assets${path.sep}`);
        res.set('Cache-Control', fingerprinted ? 'public, max-age=31536000, immutable' : 'no-cache');
      },
    }),
  );

  // Client-side routes such as /missions/apollo-11 are not files; React Router handles them.
  app.use((req, res, next) => {
    const wantsPage = (req.method === 'GET' || req.method === 'HEAD') && !path.extname(req.path);
    if (!wantsPage) return next();
    res.set('Cache-Control', 'no-cache');
    res.sendFile(indexHtml);
  });
}
