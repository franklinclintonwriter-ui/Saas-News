import dotenv from 'dotenv';

dotenv.config();

function readNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readList(name: string, fallback: string[]): string[] {
  return (process.env[name] ?? fallback.join(','))
    .split(',')
    .map((item) => item.trim().replace(/\/+$/, ''))
    .filter(Boolean);
}

const devAccessSecret = 'development-access-secret-change-before-production-32';
const devRefreshSecret = 'development-refresh-secret-change-before-production-32';
const devCorsOrigins = [
  'http://127.0.0.1:5173',
  'http://localhost:5173',
  'http://127.0.0.1:5174',
  'http://localhost:5174',
];

const port = readNumber('API_PORT', 4102);

function trimTrailingSlash(value: string): string {
  return value.trim().replace(/\/+$/, '');
}

function normalizeApiPublicUrl(raw: string | undefined, port: number): string {
  const value = trimTrailingSlash(raw || `http://127.0.0.1:${port}/api`);
  try {
    const url = new URL(value);
    const pathname = url.pathname.replace(/\/+$/, '');
    if (!pathname) {
      url.pathname = '/api';
      url.search = '';
      url.hash = '';
      return trimTrailingSlash(url.toString());
    }
  } catch {
    // Keep non-URL values unchanged after trimming; hosting panels sometimes use env expansion.
  }
  return value;
}

function normalizeR2Endpoint(raw: string | undefined, bucket: string): string {
  if (!raw?.trim()) return '';
  try {
    const url = new URL(raw.trim());
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length === 1 && parts[0] === bucket) {
      url.pathname = '/';
    }
    url.search = '';
    url.hash = '';
    return trimTrailingSlash(url.toString());
  } catch {
    return trimTrailingSlash(raw);
  }
}

const r2Bucket = process.env.R2_BUCKET?.trim() || '';

export const config = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port,
  apiPublicUrl: normalizeApiPublicUrl(process.env.API_PUBLIC_URL, port),
  corsOrigins: readList('CORS_ORIGIN', devCorsOrigins),
  jwtSecret: process.env.JWT_SECRET ?? devAccessSecret,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET ?? devRefreshSecret,
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL ?? '15m',
  refreshTokenDays: readNumber('REFRESH_TOKEN_DAYS', 30),
  maxJsonBody: process.env.API_MAX_JSON_BODY ?? '15mb',
  mediaUploadMaxBytes: readNumber('MEDIA_UPLOAD_MAX_BYTES', 25 * 1024 * 1024),
  integrationSecretKey:
    process.env.INTEGRATION_SECRET_KEY?.trim() ||
    process.env.JWT_REFRESH_SECRET?.trim() ||
    process.env.JWT_SECRET?.trim() ||
    devRefreshSecret,
  r2: {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID?.trim() || '',
    bucket: r2Bucket,
    endpoint: normalizeR2Endpoint(process.env.R2_ENDPOINT, r2Bucket),
    accessKeyId: process.env.R2_ACCESS_KEY_ID?.trim() || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY?.trim() || '',
    publicBaseUrl: trimTrailingSlash(process.env.R2_PUBLIC_BASE_URL || ''),
    objectPrefix: (process.env.R2_OBJECT_PREFIX?.trim() || 'media').replace(/^\/+|\/+$/g, ''),
  },
  /** AI providers (optional; routes return clear errors if missing for chosen provider) */
  openaiApiKey: process.env.OPENAI_API_KEY?.trim() || '',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY?.trim() || '',
  googleAiApiKey: process.env.GOOGLE_AI_API_KEY?.trim() || '',
  openrouterApiKey: process.env.OPENROUTER_API_KEY?.trim() || '',
  openaiModel: process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini',
  openaiImageModel: process.env.OPENAI_IMAGE_MODEL?.trim() || 'gpt-image-1',
  anthropicModel: process.env.ANTHROPIC_MODEL?.trim() || 'claude-3-5-haiku-latest',
  googleGeminiModel: process.env.GEMINI_MODEL?.trim() || 'gemini-2.0-flash',
  openrouterModel: process.env.OPENROUTER_MODEL?.trim() || 'openai/gpt-4o-mini',
  openrouterSiteUrl: process.env.OPENROUTER_SITE_URL?.trim() || 'http://127.0.0.1:5174',
  openrouterAppName: process.env.OPENROUTER_APP_NAME?.trim() || 'Phulpur24',
  aiRequestTimeoutMs: readNumber('AI_REQUEST_TIMEOUT_MS', 120_000),
};

if (config.nodeEnv === 'production') {
  for (const [name, value] of [
    ['JWT_SECRET', config.jwtSecret],
    ['JWT_REFRESH_SECRET', config.jwtRefreshSecret],
    ['INTEGRATION_SECRET_KEY', config.integrationSecretKey],
  ] as const) {
    if (value.length < 32 || value.startsWith('development-')) {
      throw new Error(`${name} must be set to a strong production secret.`);
    }
  }
}
