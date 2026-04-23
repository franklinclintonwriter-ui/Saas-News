/**
 * API security header + rate-limit smoke tests.
 *
 * Runs against the real Express app (`applySecurity` + a minimal router)
 * with supertest. No DB required.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import express from 'express';
import request from 'supertest';
import { applySecurity } from './security.js';

let app: express.Express;

beforeAll(() => {
  // Ensure CORS resolves something in non-prod without throwing.
  process.env.NODE_ENV = 'development';
  app = express();
  applySecurity(app);
  app.get('/api/public/health', (_req, res) => res.json({ ok: true }));
  app.post('/api/public/newsletter', (_req, res) => res.status(201).json({ ok: true }));
});

describe('security middleware', () => {
  it('emits a Content-Security-Policy header', async () => {
    const res = await request(app).get('/api/public/health');
    expect(res.status).toBe(200);
    expect(res.headers['content-security-policy']).toBeTruthy();
    expect(res.headers['content-security-policy']).toContain("default-src 'self'");
    expect(res.headers['content-security-policy']).toContain("frame-ancestors 'none'");
  });

  it('emits X-Frame-Options DENY', async () => {
    const res = await request(app).get('/api/public/health');
    expect(res.headers['x-frame-options']).toBe('DENY');
  });

  it('emits X-Request-Id on every response', async () => {
    const res = await request(app).get('/api/public/health');
    expect(res.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('strips X-Powered-By', async () => {
    const res = await request(app).get('/api/public/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('never sets HSTS in development', async () => {
    const res = await request(app).get('/api/public/health');
    expect(res.headers['strict-transport-security']).toBeUndefined();
  });
});

describe('rate limits', () => {
  it('rejects a burst of newsletter submissions', async () => {
    const server = request(app);
    const results = [];
    for (let i = 0; i < 8; i++) {
      results.push(await server.post('/api/public/newsletter').send({ email: `x${i}@y.test` }));
    }
    // First 5 should succeed (or 201), subsequent get 429.
    const too_many = results.filter((r) => r.status === 429);
    expect(too_many.length).toBeGreaterThan(0);
    if (too_many[0]) {
      expect(too_many[0].body).toMatchObject({ ok: false, code: 'RATE_LIMIT' });
    }
  });
});
