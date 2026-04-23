/**
 * Supabase Storage adapter.
 *
 * Mirror of the existing R2 adapter's public surface (`storeMediaBuffer`,
 * `deleteStoredMedia`, `storageStatus`) so swapping them is a one-line
 * change in routes.ts:
 *
 *   import { storeMediaBuffer } from './supabase-storage.js';
 *
 * Buckets expected to exist (create once via the Supabase dashboard or a
 * migration):
 *   - article-media  (public)
 *   - avatars        (public)
 *   - site-assets    (public)
 */
import { randomUUID, createHash } from 'node:crypto';
import { log } from './observability.js';

type StorageProvider = 'inline' | 'supabase' | 'external';

export type StoredMedia = {
  provider: StorageProvider;
  key: string;
  url: string;
  sizeBytes: number;
};

type StoreMediaInput = {
  id?: string;
  name: string;
  mime: string;
  buffer: Buffer;
  bucket?: string;
};

function env(name: string): string {
  return (process.env[name] ?? '').trim();
}

export function isSupabaseStorageConfigured(): boolean {
  return Boolean(env('SUPABASE_URL') && env('SUPABASE_SERVICE_ROLE_KEY'));
}

export function supabaseStorageStatus() {
  return {
    provider: isSupabaseStorageConfigured() ? 'supabase' : 'inline',
    projectUrl: env('SUPABASE_URL'),
    mediaBucket: env('SUPABASE_MEDIA_BUCKET') || 'article-media',
    avatarBucket: env('SUPABASE_AVATAR_BUCKET') || 'avatars',
  };
}

function cleanFileName(value: string): string {
  const cleaned = value
    .normalize('NFKD')
    .replace(/[^\w.\-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
  return cleaned || 'file';
}

function objectKey(input: StoreMediaInput): string {
  const id = input.id ?? randomUUID();
  const safeName = cleanFileName(input.name);
  const hash = createHash('sha256').update(input.buffer).digest('hex').slice(0, 8);
  const date = new Date();
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${yyyy}/${mm}/${id}-${hash}-${safeName}`;
}

async function supabaseFetch(
  method: string,
  path: string,
  body?: Buffer | string,
  extraHeaders?: Record<string, string>
): Promise<Response> {
  const base = env('SUPABASE_URL').replace(/\/+$/, '');
  const key = env('SUPABASE_SERVICE_ROLE_KEY');
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      ...(extraHeaders ?? {}),
    },
    body: body as any,
  });
  return res;
}

/**
 * Upload a buffer to Supabase Storage. Returns a public URL if the bucket
 * is public; otherwise the key so the caller can mint a signed URL.
 */
export async function storeMediaBuffer(input: StoreMediaInput): Promise<StoredMedia> {
  if (!isSupabaseStorageConfigured()) {
    return inlineStore(input);
  }
  const bucket = input.bucket || env('SUPABASE_MEDIA_BUCKET') || 'article-media';
  const key = objectKey(input);
  const res = await supabaseFetch('POST', `/storage/v1/object/${bucket}/${key}`, input.buffer, {
    'Content-Type': input.mime || 'application/octet-stream',
    'Cache-Control': 'public, max-age=31536000, immutable',
    'x-upsert': 'false',
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    log.error('storage.upload_failed', { status: res.status, body, bucket, key });
    throw new Error(`Supabase Storage upload failed (${res.status}): ${body}`);
  }
  const publicUrl =
    `${env('SUPABASE_URL').replace(/\/+$/, '')}/storage/v1/object/public/${bucket}/${key}`;
  log.info('storage.uploaded', { bucket, key, bytes: input.buffer.length });
  return {
    provider: 'supabase',
    key: `${bucket}/${key}`,
    url: publicUrl,
    sizeBytes: input.buffer.length,
  };
}

export async function deleteStoredMedia(stored: { provider?: string; key?: string }): Promise<void> {
  if (!isSupabaseStorageConfigured()) return;
  if (stored.provider !== 'supabase' || !stored.key) return;
  const [bucket, ...rest] = stored.key.split('/');
  const objectPath = rest.join('/');
  if (!bucket || !objectPath) return;
  const res = await supabaseFetch('DELETE', `/storage/v1/object/${bucket}/${objectPath}`);
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    log.warn('storage.delete_failed', { status: res.status, body, key: stored.key });
  } else {
    log.info('storage.deleted', { key: stored.key });
  }
}

/**
 * Create a signed upload URL so browsers can POST directly (avoiding double
 * round-trip through the API). Useful for large uploads. The signed URL
 * expires in `expiresInSeconds` (default 60).
 */
export async function createSignedUploadUrl(
  bucket: string,
  key: string,
  expiresInSeconds = 60
): Promise<{ url: string; token: string }> {
  if (!isSupabaseStorageConfigured()) {
    throw new Error('Supabase Storage is not configured.');
  }
  const res = await supabaseFetch(
    'POST',
    `/storage/v1/object/upload/sign/${bucket}/${key}?expiresIn=${expiresInSeconds}`,
    undefined
  );
  if (!res.ok) {
    throw new Error(`Supabase Storage signed URL failed (${res.status})`);
  }
  const body = (await res.json()) as { url: string; token: string };
  return body;
}

// ---------------------------------------------------------------------------
// Inline fallback (dev / when Supabase is not configured)
// ---------------------------------------------------------------------------
function inlineStore(input: StoreMediaInput): StoredMedia {
  const dataUrl = `data:${input.mime};base64,${input.buffer.toString('base64')}`;
  return {
    provider: 'inline',
    key: '',
    url: dataUrl,
    sizeBytes: input.buffer.length,
  };
}
