import crypto from 'node:crypto';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import type { Express, NextFunction, Request, Response } from 'express';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config.js';

export function applySecurity(app: Express): void {
  app.disable('x-powered-by');
  app.set('etag', false);
  app.set('trust proxy', 1);

  app.use((req: Request, res: Response, next: NextFunction) => {
    req.requestId = crypto.randomUUID();
    res.setHeader('X-Request-Id', req.requestId);
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
  });

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(compression());
  app.use(cookieParser());
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || config.corsOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error('Origin is not allowed by CORS'));
      },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: config.maxJsonBody }));
  app.use(express.urlencoded({ extended: false, limit: config.maxJsonBody }));
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 450,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
    }),
  );
  app.use('/api/auth/login', rateLimit({ windowMs: 15 * 60 * 1000, limit: 12, standardHeaders: 'draft-8', legacyHeaders: false }));
  app.use(
    '/api/admin/ai',
    rateLimit({
      windowMs: 60 * 1000,
      limit: 14,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      handler: (_req, res) => {
        res.status(429).json({
          ok: false,
          code: 'RATE_LIMIT',
          message: 'Too many AI requests from this session. Try again in a minute.',
        });
      },
    }),
  );
  app.use('/api/public/newsletter', rateLimit({ windowMs: 60 * 60 * 1000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false }));
  app.use('/api/public/contact', rateLimit({ windowMs: 60 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false }));
  app.use('/api/public/posts/:id/comments', rateLimit({ windowMs: 60 * 60 * 1000, limit: 12, standardHeaders: 'draft-8', legacyHeaders: false }));
  app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));
}
