import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { _internals, mailerEnabled, sendNewsletterBroadcast } from './mailer.js';

const { hashKey } = _internals;

describe('mailer', () => {
  const originalEnv = { ...process.env };
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    process.env.RESEND_API_KEY = 'test-key';
    process.env.RESEND_FROM = 'hello@acme.test';
    process.env.RESEND_NEWSLETTER_FROM = 'news@acme.test';
    fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ id: 'msg_1' }), { status: 200 })
    );
    // @ts-expect-error override global
    global.fetch = fetchMock;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it('mailerEnabled is true when RESEND_API_KEY is set', () => {
    expect(mailerEnabled()).toBe(true);
  });

  it('newsletter broadcast sends once per recipient with per-recipient idempotency', async () => {
    const result = await sendNewsletterBroadcast(
      {
        id: 'c1',
        subject: 'Weekly',
        bodyHtml: '<p>Hi</p>',
        siteUrl: 'https://acme.test',
      },
      [
        { email: 'a@acme.test', unsubscribeToken: 'tok-a' },
        { email: 'b@acme.test', unsubscribeToken: 'tok-b' },
      ]
    );
    expect(result.sent).toBe(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const idempotencyKeys = fetchMock.mock.calls.map((c: any[]) => {
      const headers = c[1].headers as Record<string, string>;
      return headers['Idempotency-Key'];
    });
    expect(idempotencyKeys[0]).toBe(hashKey(['c1', 'a@acme.test']));
    expect(idempotencyKeys[1]).toBe(hashKey(['c1', 'b@acme.test']));
    expect(idempotencyKeys[0]).not.toBe(idempotencyKeys[1]);
  });

  it('returns skipped:true when RESEND_API_KEY is not set', async () => {
    delete process.env.RESEND_API_KEY;
    const result = await sendNewsletterBroadcast(
      { id: 'c1', subject: 'Hi', bodyHtml: '<p>x</p>', siteUrl: 'https://x' },
      [{ email: 'a@x.test', unsubscribeToken: 't' }]
    );
    expect(result.sent).toBe(0);
    expect(result.skipped).toBe(1);
  });

  it('adds unsubscribe link into newsletter body', async () => {
    await sendNewsletterBroadcast(
      { id: 'c1', subject: 'Hi', bodyHtml: '<p>Body</p>', siteUrl: 'https://acme.test' },
      [{ email: 'a@acme.test', unsubscribeToken: 'tok-a' }]
    );
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.html).toContain('newsletter/unsubscribe?token=tok-a');
  });
});
