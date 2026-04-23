/**
 * Server-side Supabase Auth verification + admin client.
 *
 * Supports BOTH of Supabase's JWT signing schemes:
 *   - ES256 (current default, asymmetric) — verified via JWKS public keys
 *     fetched from {SUPABASE_URL}/auth/v1/.well-known/jwks.json, cached in
 *     memory, refreshed on key-id miss.
 *   - HS256 (legacy, symmetric) — verified via SUPABASE_JWT_SECRET.
 *
 * Set SUPABASE_URL in every environment. Set SUPABASE_JWT_SECRET only if
 * your project still issues HS256 tokens.
 */
import { createHash, createPublicKey, createVerify, createHmac, timingSafeEqual } from 'node:crypto';

export type SupabaseClaims = {
  sub: string;
  email?: string;
  role?: string;
  aud?: string;
  exp?: number;
  iat?: number;
  app_metadata?: {
    role?: string;
    [k: string]: unknown;
  };
  user_metadata?: Record<string, unknown>;
};

type Jwk = {
  kid: string;
  kty: string;
  alg?: string;
  crv?: string;
  x?: string;
  y?: string;
  n?: string;
  e?: string;
};

function b64urlDecode(input: string): Buffer {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((input.length + 3) % 4);
  return Buffer.from(padded, 'base64');
}

// ---------------------------------------------------------------------------
// JWKS fetching + caching
// ---------------------------------------------------------------------------
const JWKS_TTL_MS = 10 * 60 * 1000; // 10 minutes
type JwksCache = { fetchedAt: number; keys: Jwk[] };
let jwksCache: JwksCache | null = null;

function jwksUrl(): string | null {
  const base = (process.env.SUPABASE_URL ?? '').trim().replace(/\/+$/, '');
  if (!base) return null;
  return `${base}/auth/v1/.well-known/jwks.json`;
}

async function fetchJwks(force = false): Promise<Jwk[]> {
  const now = Date.now();
  if (!force && jwksCache && now - jwksCache.fetchedAt < JWKS_TTL_MS) {
    return jwksCache.keys;
  }
  const url = jwksUrl();
  if (!url) return [];
  const res = await fetch(url);
  if (!res.ok) throw new Error(`JWKS fetch failed (${res.status}) from ${url}`);
  const body = (await res.json()) as { keys?: Jwk[] };
  const keys = body.keys ?? [];
  jwksCache = { fetchedAt: now, keys };
  return keys;
}

/**
 * Allow callers (and tests) to inject a known JWKS without network I/O.
 * Useful for edge deploys with pre-fetched keys embedded at build time.
 */
export function primeJwks(keys: Jwk[]): void {
  jwksCache = { fetchedAt: Date.now(), keys };
}

export function clearJwksCache(): void {
  jwksCache = null;
}

// ---------------------------------------------------------------------------
// JWK → Node KeyObject
// ---------------------------------------------------------------------------
function publicKeyFromJwk(jwk: Jwk): ReturnType<typeof createPublicKey> {
  // Node's createPublicKey natively accepts JWKs (Node 16+).
  return createPublicKey({ key: jwk as unknown as object, format: 'jwk' });
}

// ---------------------------------------------------------------------------
// Verify
// ---------------------------------------------------------------------------
export async function verifySupabaseJwt(token: string): Promise<SupabaseClaims> {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Malformed JWT.');
  const [headerB64, payloadB64, sigB64] = parts as [string, string, string];

  const header = JSON.parse(b64urlDecode(headerB64).toString('utf8')) as {
    alg?: string;
    kid?: string;
  };
  const signingInput = `${headerB64}.${payloadB64}`;
  const providedSig = b64urlDecode(sigB64);

  if (header.alg === 'ES256') {
    await verifyEs256(signingInput, providedSig, header.kid);
  } else if (header.alg === 'HS256') {
    verifyHs256(signingInput, providedSig);
  } else {
    throw new Error(`Unsupported JWT alg: ${header.alg ?? 'missing'}`);
  }

  const claims = JSON.parse(b64urlDecode(payloadB64).toString('utf8')) as SupabaseClaims;
  const now = Math.floor(Date.now() / 1000);
  if (claims.exp !== undefined && claims.exp < now) throw new Error('JWT expired.');
  return claims;
}

async function verifyEs256(signingInput: string, providedSig: Buffer, kid?: string): Promise<void> {
  if (!kid) throw new Error('ES256 token missing "kid" header.');
  let keys = await fetchJwks(false);
  let jwk = keys.find((k) => k.kid === kid);
  if (!jwk) {
    // key-id miss → force refresh once (supports key rotation).
    keys = await fetchJwks(true);
    jwk = keys.find((k) => k.kid === kid);
  }
  if (!jwk) throw new Error(`Unknown JWT kid: ${kid}`);
  const key = publicKeyFromJwk(jwk);
  // JWS ES256 signature is raw (r||s) 64 bytes; Node's verify expects DER.
  const derSig = jwsEs256ToDer(providedSig);
  const verifier = createVerify('SHA256');
  verifier.update(signingInput);
  verifier.end();
  const ok = verifier.verify({ key, dsaEncoding: 'der' }, derSig);
  if (!ok) throw new Error('Invalid JWT signature.');
}

function verifyHs256(signingInput: string, providedSig: Buffer): void {
  const secret = (process.env.SUPABASE_JWT_SECRET ?? '').trim();
  if (!secret) throw new Error('HS256 token received but SUPABASE_JWT_SECRET is not configured.');
  const expected = createHmac('sha256', secret).update(signingInput).digest();
  if (expected.length !== providedSig.length || !timingSafeEqual(expected, providedSig)) {
    throw new Error('Invalid JWT signature.');
  }
}

/**
 * Convert a raw JWS ECDSA signature (P1363 format: r||s, each 32 bytes for
 * ES256) into DER-encoded ASN.1, which is what Node\'s crypto.verify expects.
 */
function jwsEs256ToDer(raw: Buffer): Buffer {
  if (raw.length !== 64) throw new Error(`ES256 signature must be 64 bytes, got ${raw.length}`);
  const r = stripLeadingZeros(raw.subarray(0, 32));
  const s = stripLeadingZeros(raw.subarray(32, 64));
  const rEncoded = asn1Int(r);
  const sEncoded = asn1Int(s);
  const seq = Buffer.concat([rEncoded, sEncoded]);
  return Buffer.concat([Buffer.from([0x30, seq.length]), seq]);
}

function stripLeadingZeros(buf: Buffer): Buffer {
  let i = 0;
  while (i < buf.length - 1 && buf[i] === 0) i++;
  const trimmed = buf.subarray(i);
  // Prepend 0x00 if high bit is set (ASN.1 signed integer).
  if (trimmed[0]! & 0x80) return Buffer.concat([Buffer.from([0]), trimmed]);
  return trimmed;
}

function asn1Int(buf: Buffer): Buffer {
  return Buffer.concat([Buffer.from([0x02, buf.length]), buf]);
}

// ---------------------------------------------------------------------------
// Claims helpers
// ---------------------------------------------------------------------------
export function claimsRole(claims: SupabaseClaims): string | null {
  return (
    claims.app_metadata?.role ??
    (typeof claims.role === 'string' && claims.role !== 'authenticated' ? claims.role : null) ??
    null
  );
}

// ---------------------------------------------------------------------------
// Admin client
// ---------------------------------------------------------------------------
let clientPromise: Promise<unknown> | null = null;

export function supabaseAdminEnabled(): boolean {
  return Boolean(
    process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  );
}

export async function getSupabaseAdmin(): Promise<unknown> {
  if (!supabaseAdminEnabled()) {
    throw new Error(
      'Supabase admin client requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
    );
  }
  if (!clientPromise) {
    clientPromise = (import('@supabase/supabase-js' as string) as Promise<any>).then((mod: any) => {
      return mod.createClient(
        process.env.SUPABASE_URL!.trim(),
        process.env.SUPABASE_SERVICE_ROLE_KEY!.trim(),
        {
          auth: { persistSession: false, autoRefreshToken: false },
          global: { headers: { 'X-Client-Info': 'phulpur24-api' } },
        }
      );
    });
  }
  return clientPromise;
}

export async function createStaffUser(args: {
  email: string;
  password: string;
  role: 'ADMIN' | 'EDITOR' | 'AUTHOR' | 'CONTRIBUTOR';
  emailConfirm?: boolean;
  userMetadata?: Record<string, unknown>;
}): Promise<{ id: string }> {
  const client = (await getSupabaseAdmin()) as any;
  const { data, error } = await client.auth.admin.createUser({
    email: args.email,
    password: args.password,
    email_confirm: args.emailConfirm ?? true,
    app_metadata: { role: args.role },
    user_metadata: args.userMetadata ?? {},
  });
  if (error) throw new Error(`createStaffUser failed: ${String(error)}`);
  if (!data.user) throw new Error('createStaffUser returned no user.');
  return { id: data.user.id };
}

export function tokenFingerprint(token: string): string {
  return createHash('sha256').update(token).digest('hex').slice(0, 16);
}
