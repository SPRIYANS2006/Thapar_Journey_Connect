import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import metaRouter from './routes/meta.js';
import authRouter from './routes/auth.js';
import journeysRouter from './routes/journeys.js';
import groupsRouter from './routes/groups.js';
import communitiesRouter from './routes/communities.js';
import { errorHandler, notFoundHandler } from './middleware/errors.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp() {
  const app = express();

  // 1. Trust proxy (for deployment behind Render / reverse proxy)
  app.set('trust proxy', 1);

  // 2. Security hardening headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  // 3. CORS configuration
  const appOrigin = process.env.APP_ORIGIN;
  const corsOptions = appOrigin
    ? {
        origin: appOrigin.split(',').map((o) => o.trim()),
        credentials: true
      }
    : { origin: true, credentials: true };
  app.use(cors(corsOptions));

  // 4. Request body parser with 50kb payload limit
  app.use(express.json({ limit: '50kb' }));
  app.use(express.urlencoded({ extended: true, limit: '50kb' }));

  // 5. API Routes
  app.use('/api', metaRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/journeys', journeysRouter);
  app.use('/api/groups', groupsRouter);
  app.use('/api/communities', communitiesRouter);

  // 6. 404 Handler for undefined /api routes
  app.use('/api', notFoundHandler);

  // 7. Production Static Asset Serving
  const distPath = path.resolve(__dirname, '../dist');
  app.use(express.static(distPath));

  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'), (err) => {
      if (err) {
        next();
      }
    });
  });

  // 8. Central JSON Error Handler (no HTML stack traces leaked)
  app.use(errorHandler);

  return app;
}
