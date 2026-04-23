import { describe, it, expect, vi, beforeEach } from 'vitest';
import { log } from './observability.js';

describe('structured logger', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('emits one JSON line per call with level + event fields', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    log.info('auth.login_ok', { userId: 'u1' });
    expect(spy).toHaveBeenCalledTimes(1);
    const line = spy.mock.calls[0][0] as string;
    const parsed = JSON.parse(line);
    expect(parsed.level).toBe('info');
    expect(parsed.event).toBe('auth.login_ok');
    expect(parsed.userId).toBe('u1');
    expect(parsed.ts).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('routes warn + error to console.error', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const out = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    log.warn('disk.low');
    log.error('db.connect_failed');
    expect(err).toHaveBeenCalledTimes(2);
    expect(out).not.toHaveBeenCalled();
  });
});
