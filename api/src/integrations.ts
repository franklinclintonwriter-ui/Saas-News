import crypto from 'node:crypto';
import { config } from './config.js';
import { badRequest, serviceUnavailable } from './errors.js';
import { prisma } from './prisma.js';

export type IntegrationTemplate = {
  provider: string;
  label: string;
  category: string;
  envKey?: string;
  defaultModel?: string;
  endpoint?: string;
};

export const integrationTemplates: IntegrationTemplate[] = [
  { provider: 'openai', label: 'OpenAI', category: 'AI', envKey: 'OPENAI_API_KEY', defaultModel: config.openaiModel, endpoint: 'https://api.openai.com/v1' },
  { provider: 'openrouter', label: 'OpenRouter', category: 'AI', envKey: 'OPENROUTER_API_KEY', defaultModel: config.openrouterModel, endpoint: 'https://openrouter.ai/api/v1' },
  { provider: 'anthropic', label: 'Anthropic Claude', category: 'AI', envKey: 'ANTHROPIC_API_KEY', defaultModel: config.anthropicModel, endpoint: 'https://api.anthropic.com/v1' },
  { provider: 'google', label: 'Google Gemini', category: 'AI', envKey: 'GOOGLE_AI_API_KEY', defaultModel: config.googleGeminiModel, endpoint: 'https://generativelanguage.googleapis.com' },
  { provider: 'resend', label: 'Resend Email', category: 'EMAIL', envKey: 'RESEND_API_KEY', endpoint: 'https://api.resend.com' },
  { provider: 'mailchimp', label: 'Mailchimp', category: 'EMAIL', envKey: 'MAILCHIMP_API_KEY', endpoint: 'https://mailchimp.com/developer/marketing/api' },
  { provider: 'cloudinary', label: 'Cloudinary', category: 'MEDIA', envKey: 'CLOUDINARY_API_SECRET', endpoint: 'https://api.cloudinary.com' },
  { provider: 'aws-s3', label: 'AWS S3 / R2', category: 'STORAGE', envKey: 'AWS_SECRET_ACCESS_KEY', endpoint: 'https://s3.amazonaws.com' },
  { provider: 'stripe', label: 'Stripe', category: 'PAYMENTS', envKey: 'STRIPE_SECRET_KEY', endpoint: 'https://api.stripe.com' },
  { provider: 'google-analytics', label: 'Google Analytics API', category: 'ANALYTICS', envKey: 'GOOGLE_ANALYTICS_API_SECRET', endpoint: 'https://www.google-analytics.com' },
  { provider: 'facebook-pixel', label: 'Meta Pixel / CAPI', category: 'ANALYTICS', envKey: 'META_ACCESS_TOKEN', endpoint: 'https://graph.facebook.com' },
  { provider: 'custom-webhook', label: 'Custom Webhook', category: 'WEBHOOK', envKey: 'CUSTOM_WEBHOOK_SECRET' },
];

function b64(input: Buffer): string {
  return input.toString('base64url');
}

function unb64(input: string): Buffer {
  return Buffer.from(input, 'base64url');
}

function encryptionKey(): Buffer {
  return crypto.createHash('sha256').update(config.integrationSecretKey).digest();
}

export function encryptSecret(secret: string): string {
  const value = secret.trim();
  if (!value) return '';
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${b64(iv)}:${b64(tag)}:${b64(ciphertext)}`;
}

export function decryptSecret(ciphertext: string): string {
  if (!ciphertext) return '';
  const [version, ivRaw, tagRaw, dataRaw] = ciphertext.split(':');
  if (version !== 'v1' || !ivRaw || !tagRaw || !dataRaw) badRequest('Stored integration secret has an unsupported format.');
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), unb64(ivRaw));
    decipher.setAuthTag(unb64(tagRaw));
    return Buffer.concat([decipher.update(unb64(dataRaw)), decipher.final()]).toString('utf8');
  } catch {
    serviceUnavailable('Stored integration secret could not be decrypted. Check INTEGRATION_SECRET_KEY.');
  }
}

export function maskSecret(secret: string): string {
  const value = secret.trim();
  if (!value) return '';
  const last = value.slice(-4);
  const prefix = value.length > 12 ? `${value.slice(0, 4)}...` : '';
  return `${prefix}****${last}`;
}

function envSecret(provider: string): string {
  switch (provider) {
    case 'openai':
      return config.openaiApiKey;
    case 'anthropic':
      return config.anthropicApiKey;
    case 'google':
      return config.googleAiApiKey;
    case 'openrouter':
      return config.openrouterApiKey;
    default: {
      const template = integrationTemplates.find((item) => item.provider === provider);
      return template?.envKey ? process.env[template.envKey]?.trim() || '' : '';
    }
  }
}

function templateFor(provider: string): IntegrationTemplate | undefined {
  return integrationTemplates.find((item) => item.provider === provider);
}

function publicConfig(provider: string, row?: any) {
  const template = templateFor(provider);
  const envValue = envSecret(provider);
  const hasDbSecret = Boolean(row?.secretCiphertext);
  const disabled = row ? !row.enabled : false;
  const source = disabled ? 'disabled' : hasDbSecret ? 'database' : envValue ? 'environment' : 'none';
  return {
    provider,
    label: row?.label || template?.label || provider,
    category: row?.category || template?.category || 'GENERAL',
    enabled: row?.enabled ?? true,
    configured: source === 'database' || source === 'environment',
    source,
    secretPreview: hasDbSecret ? row.secretPreview : envValue ? `env:${template?.envKey || 'configured'}` : '',
    model: row?.model || template?.defaultModel || '',
    endpoint: row?.endpoint || template?.endpoint || '',
    notes: row?.notes || '',
    builtIn: Boolean(template),
    updatedAt: row?.updatedAt ?? null,
  };
}

export async function listIntegrationConfigs() {
  const rows = await prisma.integrationSecret.findMany({ orderBy: [{ category: 'asc' }, { provider: 'asc' }] });
  const rowMap = new Map(rows.map((row) => [row.provider, row]));
  const providers = new Set([...integrationTemplates.map((item) => item.provider), ...rows.map((row) => row.provider)]);
  return [...providers].sort().map((provider) => publicConfig(provider, rowMap.get(provider)));
}

export async function saveIntegrationConfig(provider: string, input: {
  label: string;
  category: string;
  enabled: boolean;
  secret?: string;
  clearSecret?: boolean;
  model?: string;
  endpoint?: string;
  notes?: string;
}) {
  const existing = await prisma.integrationSecret.findUnique({ where: { provider } });
  const template = templateFor(provider);
  const nextSecret =
    input.clearSecret ? '' : input.secret?.trim() ? encryptSecret(input.secret) : existing?.secretCiphertext ?? '';
  const nextPreview =
    input.clearSecret ? '' : input.secret?.trim() ? maskSecret(input.secret) : existing?.secretPreview ?? '';

  const row = await prisma.integrationSecret.upsert({
    where: { provider },
    update: {
      label: input.label || existing?.label || template?.label || provider,
      category: input.category || existing?.category || template?.category || 'GENERAL',
      enabled: input.enabled,
      secretCiphertext: nextSecret,
      secretPreview: nextPreview,
      model: input.model ?? existing?.model ?? '',
      endpoint: input.endpoint ?? existing?.endpoint ?? '',
      notes: input.notes ?? existing?.notes ?? '',
    },
    create: {
      provider,
      label: input.label || template?.label || provider,
      category: input.category || template?.category || 'GENERAL',
      enabled: input.enabled,
      secretCiphertext: nextSecret,
      secretPreview: nextPreview,
      model: input.model ?? '',
      endpoint: input.endpoint ?? '',
      notes: input.notes ?? '',
    },
  });
  return publicConfig(provider, row);
}

export async function deleteIntegrationConfig(provider: string) {
  await prisma.integrationSecret.delete({ where: { provider } }).catch(() => null);
}

export async function getAiRuntimeConfig(provider: 'openai' | 'anthropic' | 'google' | 'openrouter') {
  const row = await prisma.integrationSecret.findUnique({ where: { provider } });
  const template = templateFor(provider);
  if (row && !row.enabled) return { apiKey: '', model: row.model || template?.defaultModel || '', endpoint: row.endpoint || template?.endpoint || '', source: 'disabled' as const };
  if (row?.secretCiphertext) {
    return {
      apiKey: decryptSecret(row.secretCiphertext),
      model: row.model || template?.defaultModel || '',
      endpoint: row.endpoint || template?.endpoint || '',
      source: 'database' as const,
    };
  }
  return {
    apiKey: envSecret(provider),
    model: template?.defaultModel || '',
    endpoint: template?.endpoint || '',
    source: envSecret(provider) ? 'environment' as const : 'none' as const,
  };
}
