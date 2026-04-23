import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createHmac,
  generateKeyPairSync,
  createSign,
  createPublicKey,
} from 'node:crypto';
import {
  verifySupabaseJwt,
  claimsRole,
  tokenFingerprint,
  primeJwks,
  clearJwksCache,
} from './supabase-admin.js';

function b64url(buf: Buffer | string): string {
  return Buffer.from(buf)
    .toString('base64')
    .replace(/=+$/, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function makeHs256(payload: object, secret: string): string {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64url(JSON.stringify(payload));
  const sig = b64url(createHmac('sha256', secret).update(`${header}.${body}`).digest());
  return `${header}.${body}.${sig}`;
}

// DER-encoded ECDSA → raw JWS r||s (64 bytes)
function derToJws(der: Buffer): Buffer {
  // ASN.1: 30 <len> 02 <rlen> r 02 <slen> s
  let p = 2;
  if (der[p] !== 0x02) throw new Error('bad DER');
  p++;
  const rlen = der[p++]!;
  const r = der.subarray(p, p + rlen);
  p += rlen;
  if (der[p] !== 0x02) throw new Error('bad DER');
  p++;
  const slen = der[p++]!;
  const s = der.subarray(p, p + slen);
  const pad = (v: Buffer): Buffer => {
    const stripped = v[0] === 0 ? v.subarray(1) : v;
    const out = Buffer.alloc(32);
    stripped.copy(out, 32 - stripped.length);
    return out;
  };
  return Buffer.concat([pad(r), pad(s)]);
}

function makeEs256(payload: object, privateKey: any, kid: string): string {
  const header = b64url(JSON.stringify({ alg: 'ES256', typ: 'JWT', kid }));
  const body = b64url(JSON.stringify(payload));
  const signer = createSign('SHA256');
  signer.update(`${header}.${body}`);
  signer.end();
  const derSig = signer.sign({ key: privateKey, dsaEncoding: 'der' });
  return `${header}.${body}.${b64url(derToJws(derSig))}`;
}

describe('verifySupabaseJwt — HS256 legacy', () => {
  const secret = 'test-secret-32-chars-long-aaaaaaaa';

  beforeEach(() => {
    process.env.SUPABASE_JWT_SECRET = secret;
    clearJwksCache();
  });

  afterEach(() => {
    delete process.env.SUPABASE_JWT_SECRET;
  });

  it('accepts a valid HS256 token', async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = makeHs256(
      { sub: 'u1', email: 'a@b.c', exp: now + 60, app_metadata: { role: 'ADMIN' } },
      secret
    );
    const claims = await verifySupabaseJwt(token);
    expect(claims.sub).toBe('u1');
    expect(claims.app_metadata?.role).toBe('ADMIN');
  });

  it('rejects expired HS256 tokens', async () => {
    const token = makeHs256({ sub: 'u1', exp: 1 }, secret);
    await expect(verifySupabaseJwt(token)).rejects.toThrow(/expired/i);
  });

  it('rejects HS256 with bad signature', async () => {
    const token = makeHs256({ sub: 'u1', exp: Math.floor(Date.now() / 1000) + 60 }, 'WRONG');
    await expect(verifySupabaseJwt(token)).rejects.toThrow(/signature/i);
  });

  it('rejects HS256 when secret is not configured', async () => {
    delete process.env.SUPABASE_JWT_SECRET;
    const token = makeHs256({ sub: 'u1', exp: 999999999999 }, secret);
    await expect(verifySupabaseJwt(token)).rejects.toThrow(/SUPABASE_JWT_SECRET/);
  });

  it('rejects unknown alg', async () => {
    const header = b64url(JSON.stringify({ alg: 'none', typ: 'JWT' }));
    const body = b64url(JSON.stringify({ sub: 'u1' }));
    await expect(verifySupabaseJwt(`${header}.${body}.`)).rejects.toThrow(/alg/i);
  });
});

describe('verifySupabaseJwt — ES256 (current Supabase default)', () => {
  let privateKey: any;
  let jwk: any;
  const kid = 'test-kid-1';

  beforeEach(() => {
    clearJwksCache();
    // Generate a fresh ECDSA P-256 keypair for each test.
    const pair = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
    privateKey = pair.privateKey;
    const pubJwk = createPublicKey(pair.publicKey).export({ format: 'jwk' }) as any;
    jwk = { ...pubJwk, kid, alg: 'ES256' };
    primeJwks([jwk]);
  });

  it('accepts a valid ES256 token', async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = makeEs256(
      { sub: 'u2', email: 'a@b.c', exp: now + 60, app_metadata: { role: 'EDITOR' } },
      privateKey,
      kid
    );
    const claims = await verifySupabaseJwt(token);
    expect(claims.sub).toBe('u2');
    expect(claims.app_metadata?.role).toBe('EDITOR');
  });

  it('rejects ES256 with unknown kid', async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = makeEs256({ sub: 'u3', exp: now + 60 }, privateKey, 'bogus-kid');
    // Force-refresh will still fail since we never registered bogus-kid.
    // Stub SUPABASE_URL so fetchJwks doesn\'t try to hit the internet.
    process.env.SUPABASE_URL = 'https://example.invalid';
    await expect(verifySupabaseJwt(token)).rejects.toThrow(/kid|JWKS/i);
    delete process.env.SUPABASE_URL;
  });

  it('rejects ES256 without kid header', async () => {
    const pair = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
    const header = b64url(JSON.stringify({ alg: 'ES256', typ: 'JWT' })); // no kid
    const body = b64url(JSON.stringify({ sub: 'u4', exp: Math.floor(Date.now() / 1000) + 60 }));
    const signer = createSign('SHA256');
    signer.update(`${header}.${body}`);
    signer.end();
    const derSig = signer.sign({ key: pair.privateKey, dsaEncoding: 'der' });
    const token = `${header}.${body}.${b64url(derToJws(derSig))}`;
    await expect(verifySupabaseJwt(token)).rejects.toThrow(/kid/i);
  });

  it('rejects ES256 with expired claims', async () => {
    const token = makeEs256({ sub: 'u5', exp: 1 }, privateKey, kid);
    await expect(verifySupabaseJwt(token)).rejects.toThrow(/expired/i);
  });
});

describe('claimsRole', () => {
  it('prefers app_metadata.role', () => {
    expect(claimsRole({ sub: 'x', role: 'authenticated', app_metadata: { role: 'EDITOR' } })).toBe('EDITOR');
  });
  it('falls back to top-level role when app_metadata missing', () => {
    expect(claimsRole({ sub: 'x', role: 'ADMIN' })).toBe('ADMIN');
  });
  it('ignores the generic "authenticated" role', () => {
    expect(claimsRole({ sub: 'x', role: 'authenticated' })).toBeNull();
  });
});

describe('tokenFingerprint', () => {
  it('returns 16 hex chars deterministically', () => {
    const a = tokenFingerprint('secret');
    expect(a).toBe(tokenFingerprint('secret'));
    expect(a).toMatch(/^[0-9a-f]{16}$/);
    expect(tokenFingerprint('other')).not.toBe(a);
  });
});
