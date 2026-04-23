/**
 * Transactional + bulk email via Resend.
 *
 * All sends are idempotent (idempotencyKey derived from a hash of subject +
 * body + recipient). Rate-limited to Resend's 2 req/s baseline. Bulk sends
 * chunk into 100-recipient batches.
 *
 * Public API:
 *   - sendPasswordResetEmail(user, resetLink)
 *   - sendContactAcknowledgement(message)
 *   - sendCommentReplyNotification(comment, post)
 *   - sendNewsletterBroadcast(campaign, subscribers)
 *
 * All calls are no-ops when RESEND_API_KEY is unset (returns `{skipped:true}`)
 * so dev environments without mail configured don't crash.
 */
import { createHash } from 'node:crypto';
import { log } from './observability.js';

type SendResult =
  | { ok: true; id: string }
  | { ok: false; error: string; retryable: boolean }
  | { skipped: true; reason: string };

type SendInput = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  tags?: { name: string; value: string }[];
  /** Override default "from". Must be on a verified Resend domain. */
  from?: string;
  /**
   * Supplied as Resend's idempotency key. If omitted we hash (from, to,
   * subject, html) so retries within 24h are deduped.
   */
  idempotencyKey?: string;
};

const RESEND_API = 'https://api.resend.com/emails';
const BATCH_SIZE = 100;
const MIN_GAP_MS = 550; // 2 req/s with headroom
const MAX_ATTEMPTS = 4;

let lastSendAt = 0;

export function mailerEnabled(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

function defaultFrom(): string {
  return process.env.RESEND_FROM?.trim() || '';
}

function defaultNewsletterFrom(): string {
  return (
    process.env.RESEND_NEWSLETTER_FROM?.trim() ||
    process.env.RESEND_FROM?.trim() ||
    ''
  );
}

function hashKey(parts: string[]): string {
  return createHash('sha256').update(parts.join('\u0000')).digest('hex').slice(0, 32);
}

async function throttle(): Promise<void> {
  const now = Date.now();
  const wait = Math.max(0, lastSendAt + MIN_GAP_MS - now);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastSendAt = Date.now();
}

async function rawSend(input: SendInput): Promise<SendResult> {
  if (!mailerEnabled()) return { skipped: true, reason: 'RESEND_API_KEY not set' };

  const from = (input.from ?? defaultFrom()).trim();
  if (!from) return { skipped: true, reason: 'RESEND_FROM not set' };

  const to = Array.isArray(input.to) ? input.to : [input.to];
  if (!to.length) return { skipped: true, reason: 'no recipients' };

  const idempotencyKey =
    input.idempotencyKey ?? hashKey([from, to.sort().join(','), input.subject, input.html]);

  const payload: Record<string, unknown> = {
    from,
    to,
    subject: input.subject,
    html: input.html,
  };
  if (input.text) payload.text = input.text;
  if (input.replyTo) payload.reply_to = input.replyTo;
  if (input.tags?.length) payload.tags = input.tags;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    await throttle();
    try {
      const res = await fetch(RESEND_API, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const body = (await res.json().catch(() => ({}))) as { id?: string };
        log.info('mailer.sent', { id: body.id, subject: input.subject, to: to.length });
        return { ok: true, id: body.id ?? 'unknown' };
      }
      // 429 and 5xx are retryable.
      if (res.status === 429 || res.status >= 500) {
        const backoff = 500 * 2 ** attempt + Math.random() * 250;
        log.warn('mailer.retryable', { status: res.status, attempt, backoff });
        await new Promise((r) => setTimeout(r, backoff));
        continue;
      }
      const errBody = await res.text().catch(() => '');
      log.error('mailer.failed', { status: res.status, body: errBody });
      return { ok: false, error: `Resend ${res.status}: ${errBody}`, retryable: false };
    } catch (err) {
      const backoff = 500 * 2 ** attempt + Math.random() * 250;
      log.warn('mailer.network_error', { attempt, error: String(err), backoff });
      await new Promise((r) => setTimeout(r, backoff));
    }
  }
  return { ok: false, error: 'max attempts exhausted', retryable: true };
}

// ---------------------------------------------------------------------------
// Public helpers
// ---------------------------------------------------------------------------

export async function sendPasswordResetEmail(
  user: { email: string; name?: string },
  resetLink: string
): Promise<SendResult> {
  const subject = 'Reset your password';
  const html = renderTemplate({
    heading: 'Reset your password',
    body: `
      <p>Hi ${escapeHtml(user.name ?? 'there')},</p>
      <p>We received a request to reset the password for your account. Use the
      button below to set a new password. The link is valid for one hour.</p>
      <p style="text-align:center;margin:32px 0">
        <a href="${resetLink}" style="display:inline-block;padding:12px 24px;background:#111827;color:#fff;text-decoration:none;border-radius:8px">Reset password</a>
      </p>
      <p>If you didn't request this, you can safely ignore this email — your
      password won't change.</p>
    `,
  });
  return rawSend({
    to: user.email,
    subject,
    html,
    text: `Reset your password: ${resetLink}`,
    tags: [{ name: 'type', value: 'password_reset' }],
  });
}

export async function sendContactAcknowledgement(message: {
  email: string;
  firstName: string;
  subject: string;
}): Promise<SendResult> {
  const subject = `We got your message: ${message.subject}`;
  const html = renderTemplate({
    heading: 'Thanks for reaching out',
    body: `
      <p>Hi ${escapeHtml(message.firstName)},</p>
      <p>We received your message and will reply as soon as possible.</p>
      <p><strong>Subject:</strong> ${escapeHtml(message.subject)}</p>
    `,
  });
  return rawSend({
    to: message.email,
    subject,
    html,
    tags: [{ name: 'type', value: 'contact_ack' }],
  });
}

export async function sendCommentReplyNotification(
  parent: { email: string; author: string },
  post: { title: string; slug: string; url: string }
): Promise<SendResult> {
  const subject = `New reply on "${post.title}"`;
  const html = renderTemplate({
    heading: 'Someone replied to your comment',
    body: `
      <p>Hi ${escapeHtml(parent.author)},</p>
      <p>There's a new reply on <strong>${escapeHtml(post.title)}</strong>.</p>
      <p><a href="${post.url}">Read the reply</a></p>
    `,
  });
  return rawSend({
    to: parent.email,
    subject,
    html,
    tags: [
      { name: 'type', value: 'comment_reply' },
      { name: 'post', value: post.slug },
    ],
  });
}

export type NewsletterRecipient = {
  email: string;
  unsubscribeToken: string;
};

export type NewsletterCampaign = {
  id: string;
  subject: string;
  bodyHtml: string;
  siteUrl: string;
};

/**
 * Batched newsletter broadcast. Returns per-batch results; callers should
 * persist them to a NewsletterCampaign table to support retries.
 */
export async function sendNewsletterBroadcast(
  campaign: NewsletterCampaign,
  recipients: NewsletterRecipient[]
): Promise<{
  sent: number;
  failed: number;
  skipped: number;
  results: SendResult[];
}> {
  if (!mailerEnabled()) {
    return { sent: 0, failed: 0, skipped: recipients.length, results: [] };
  }
  const from = defaultNewsletterFrom();
  if (!from) {
    log.warn('mailer.no_newsletter_from');
    return { sent: 0, failed: 0, skipped: recipients.length, results: [] };
  }
  const results: SendResult[] = [];
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const r of recipients) {
    const unsubLink = `${campaign.siteUrl}/newsletter/unsubscribe?token=${encodeURIComponent(r.unsubscribeToken)}`;
    const html = renderTemplate({
      heading: campaign.subject,
      body: campaign.bodyHtml,
      footer: `
        <p style="color:#6B7280;font-size:12px;margin-top:32px">
          You're receiving this because you subscribed at
          <a href="${campaign.siteUrl}">${escapeHtml(campaign.siteUrl)}</a>.<br>
          <a href="${unsubLink}">Unsubscribe</a>
        </p>
      `,
    });
    const result = await rawSend({
      from,
      to: r.email,
      subject: campaign.subject,
      html,
      tags: [
        { name: 'type', value: 'newsletter' },
        { name: 'campaign', value: campaign.id },
      ],
      idempotencyKey: hashKey([campaign.id, r.email]),
    });
    results.push(result);
    if ('ok' in result && result.ok) sent++;
    else if ('skipped' in result) skipped++;
    else failed++;
  }
  log.info('mailer.newsletter_broadcast_complete', {
    campaign: campaign.id,
    sent,
    failed,
    skipped,
    total: recipients.length,
  });
  return { sent, failed, skipped, results };
}

// ---------------------------------------------------------------------------
// Template
// ---------------------------------------------------------------------------

function renderTemplate(args: {
  heading: string;
  body: string;
  footer?: string;
}): string {
  const brand = process.env.PUBLIC_SITE_URL?.trim() || '';
  return `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="margin:0;padding:0;background:#F8FAFC;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#0F172A;">
    <div style="max-width:560px;margin:0 auto;padding:40px 24px;">
      ${brand ? `<p style="font-size:14px;color:#6B7280">${escapeHtml(brand.replace(/^https?:\/\//, ''))}</p>` : ''}
      <h1 style="font-size:22px;margin:12px 0 24px">${escapeHtml(args.heading)}</h1>
      <div style="font-size:15px;line-height:1.6">${args.body}</div>
      ${args.footer ?? ''}
    </div>
  </body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Named export for dependency injection in tests.
export const _internals = { rawSend, renderTemplate, hashKey };
