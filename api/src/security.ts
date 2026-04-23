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

const isProd = config.nodeEnv === 'production';

function buildCsp(): Record<string, string[]> {
  const supabaseHost = (process.env.SUPABASE_URL || '').replace(/\/+$/, '') || null;
  const supabaseWs = supabaseHost ? supabaseHost.replace(/^https?:/, 'wss:') : null;
  const plausibleScript =
    process.env.PLAUSIBLE_SCRIPT?.trim() || 'https://plausible.io/js/script.js';
  const plausibleOrigin = new URL(plausibleScript).origin;
  const sentryIngest = (process.env.SENTRY_INGEST || '').trim() || 'https://*.ingest.sentry.io';

  const self = ["'self'"];
  const connect = [
    ...self,
    supabaseHost,
    supabaseWs,
    plausibleOrigin,
    sentryIngest,
  ].filter(Boolean) as string[];

  return {
    'default-src': self,
    'base-uri': self,
    'form-action': self,
    'frame-ancestors': ["'none'"],
    'img-src': [...self, 'data:', 'blob:', ...(supabaseHost ? [supabaseHost] : [])],
    'media-src': [...self, 'data:', 'blob:', ...(supabaseHost ? [supabaseHost] : [])],
    'font-src': [...self, 'data:'],
    'style-src': [...self, "'unsafe-inline'"],
    'script-src': [
      ...self,
      plausibleOrigin,
      ...(isProd ? [] : ["'unsafe-eval'"]),
    ],
    'connect-src': connect,
    'worker-src': [...self, 'blob:'],
    'object-src': ["'none'"],
    'upgrade-insecure-requests': isProd ? [''] : [],
  };
}

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
      contentSecurityPolicy: {
        useDefaults: false,
        directives: buildCsp(),
      },
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      crossOriginOpenerPolicy: { policy: 'same-origin' },
      crossOriginEmbedderPolicy: false,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      strictTransportSecurity: isProd
        ? { maxAge: 31_536_000, includeSubDomains: true, preload: true }
        : false,
      xContentTypeOptions: true,
      xFrameOptions: { action: 'deny' },
      xXssProtection: false,
    }),
  );

  app.use(compression());
  app.use(cookieParser());

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) return callback(null, true);
        if (config.corsOrigins.includes(origin)) return callback(null, true);
        callback(new Error('Origin is not allowed by CORS'));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      maxAge: 600,
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

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    handler: jsonRateHandler('Too many login attempts. Try again in a few minutes.'),
  });
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/password/reset', authLimiter);

  app.use(
    '/api/admin/ai',
    rateLimit({
      windowMs: 60 * 1000,
      limit: 14,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      handler: jsonRateHandler('Too many AI requests from this session. Try again in a minute.'),
    }),
  );

  app.use(
    '/api/public/newsletter',
    rateLimit({
      windowMs: 60 * 60 * 1000,
      limit: 5,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      handler: jsonRateHandler('You have subscribed too many times. Try again later.'),
    }),
  );
  app.use(
    '/api/public/contact',
    rateLimit({
      windowMs: 60 * 60 * 1000,
      limit: 5,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      handler: jsonRateHandler('Please wait before sending another message.'),
    }),
  );
  app.use(
    '/api/public/posts/:id/comments',
    rateLimit({
      windowMs: 60 * 60 * 1000,
      limit: 10,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      handler: jsonRateHandler('Please slow down when commenting.'),
    }),
  );

  app.use(morgan(isProd ? 'combined' : 'dev'));
}

function jsonRateHandler(message: string) {
  return (_req: Request, res: Response) => {
    res.status(429).json({ ok: false, code: 'RATE_LIMIT', message });
  };
}
