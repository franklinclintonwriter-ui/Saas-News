function defaultApiBaseUrl(): string {
  if (typeof window === 'undefined') return 'http://127.0.0.1:4102/api';
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') return 'http://127.0.0.1:4102/api';
  return '/api';
}

export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') || defaultApiBaseUrl();

type ApiEnvelope<T> =
  | { ok: true; data: T; meta?: unknown }
  | { ok: false; message: string; code?: string; issues?: unknown };

export class ApiClientError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: unknown,
  ) {
    super(message);
  }
}

type ApiRequestOptions = RequestInit & {
  token?: string | null;
};

function requestCacheMode(path: string, options: ApiRequestOptions): RequestCache {
  const method = (options.method || 'GET').toUpperCase();
  if (options.cache) return options.cache;
  if (options.token || method !== 'GET') return 'no-store';
  return path.startsWith('/public/') || path.startsWith('/media/') ? 'default' : 'no-store';
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  const isJsonBody = options.body && !(options.body instanceof FormData);
  if (isJsonBody && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (options.token) {
    headers.set('Authorization', `Bearer ${options.token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    cache: requestCacheMode(path, options),
    headers,
  });
  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;

  if (!response.ok || !payload?.ok) {
    const message = payload && 'message' in payload ? payload.message : `API request failed: ${response.status}`;
    throw new ApiClientError(message, response.status, payload);
  }

  return payload.data;
}

export async function apiRequestWithMeta<T>(path: string, options: ApiRequestOptions = {}): Promise<{ data: T; meta?: unknown }> {
  const headers = new Headers(options.headers);
  const isJsonBody = options.body && !(options.body instanceof FormData);
  if (isJsonBody && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (options.token) {
    headers.set('Authorization', `Bearer ${options.token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, cache: requestCacheMode(path, options), headers });
  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!response.ok || !payload?.ok) {
    const message = payload && 'message' in payload ? payload.message : `API request failed: ${response.status}`;
    throw new ApiClientError(message, response.status, payload);
  }
  return { data: payload.data, meta: payload.meta };
}
