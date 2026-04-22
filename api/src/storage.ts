import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
import { config } from './config.js';

type StorageProvider = 'inline' | 'r2' | 'external';

type StoredMedia = {
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
};

type DataUrlInput = {
  id?: string;
  name: string;
  fallbackMime: string;
  dataUrl: string;
};

let r2Client: S3Client | null = null;

export function isR2Configured(): boolean {
  return Boolean(config.r2.endpoint && config.r2.bucket && config.r2.accessKeyId && config.r2.secretAccessKey);
}

export function storageStatus() {
  return {
    provider: isR2Configured() ? 'r2' : 'inline',
    bucket: isR2Configured() ? config.r2.bucket : '',
    publicBaseUrl: config.r2.publicBaseUrl,
  };
}

function client(): S3Client {
  if (!isR2Configured()) throw new Error('Cloudflare R2 storage is not configured.');
  r2Client ??= new S3Client({
    region: 'auto',
    endpoint: config.r2.endpoint,
    credentials: {
      accessKeyId: config.r2.accessKeyId,
      secretAccessKey: config.r2.secretAccessKey,
    },
    forcePathStyle: true,
  });
  return r2Client;
}

function cleanFileName(value: string): string {
  const cleaned = value
    .normalize('NFKD')
    .replace(/[^\w.\-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  return cleaned || 'asset.bin';
}

function objectKey(id: string, name: string): string {
  const prefix = config.r2.objectPrefix ? `${config.r2.objectPrefix}/` : '';
  return `${prefix}${id}/${cleanFileName(name)}`;
}

function publicUrl(id: string, key: string): string {
  if (config.r2.publicBaseUrl) return `${config.r2.publicBaseUrl}/${key}`;
  return `${config.apiPublicUrl}/media/${encodeURIComponent(id)}/file`;
}

function parseImageDataUrl(dataUrl: string): { mime: string; buffer: Buffer } | null {
  const match = /^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i.exec(dataUrl);
  if (!match) return null;
  return {
    mime: match[1]!,
    buffer: Buffer.from(match[2]!, 'base64'),
  };
}

export async function storeMediaBuffer(input: StoreMediaInput): Promise<StoredMedia> {
  const id = input.id || randomUUID();
  if (!isR2Configured()) {
    if (input.mime.startsWith('image/')) {
      return {
        provider: 'inline',
        key: '',
        url: `data:${input.mime};base64,${input.buffer.toString('base64')}`,
        sizeBytes: input.buffer.byteLength,
      };
    }
    throw new Error('Non-image file uploads require Cloudflare R2 storage.');
  }

  const key = objectKey(id, input.name);
  await client().send(new PutObjectCommand({
    Bucket: config.r2.bucket,
    Key: key,
    Body: input.buffer,
    ContentType: input.mime || 'application/octet-stream',
    CacheControl: 'public, max-age=31536000, immutable',
  }));

  return {
    provider: 'r2',
    key,
    url: publicUrl(id, key),
    sizeBytes: input.buffer.byteLength,
  };
}

export async function storeDataUrlMedia(input: DataUrlInput): Promise<StoredMedia> {
  const parsed = parseImageDataUrl(input.dataUrl);
  if (!parsed) {
    return {
      provider: 'inline',
      key: '',
      url: input.dataUrl,
      sizeBytes: 0,
    };
  }
  return storeMediaBuffer({
    id: input.id,
    name: input.name,
    mime: parsed.mime || input.fallbackMime,
    buffer: parsed.buffer,
  });
}

export async function deleteStoredMedia(provider: string | null | undefined, key: string | null | undefined): Promise<void> {
  if (provider !== 'r2' || !key || !isR2Configured()) return;
  await client().send(new DeleteObjectCommand({ Bucket: config.r2.bucket, Key: key }));
}

export async function getStoredMedia(key: string): Promise<{
  body: Readable;
  contentType?: string;
  contentLength?: number;
  cacheControl?: string;
}> {
  const result = await client().send(new GetObjectCommand({ Bucket: config.r2.bucket, Key: key }));
  if (!(result.Body instanceof Readable)) throw new Error('Cloudflare R2 returned an unreadable media stream.');
  return {
    body: result.Body,
    contentType: result.ContentType,
    contentLength: result.ContentLength,
    cacheControl: result.CacheControl,
  };
}
