const PUBLIC_CACHE_CONTROL = 'public, max-age=60, s-maxage=900, stale-while-revalidate=86400';
const MEDIA_CACHE_CONTROL = 'public, max-age=31536000, immutable';

function isCacheablePath(method, path) {
  return ['GET', 'HEAD'].includes(method) && (path.startsWith('public/') || path.startsWith('media/'));
}

function cacheControlFor(path) {
  return path.startsWith('media/') ? MEDIA_CACHE_CONTROL : PUBLIC_CACHE_CONTROL;
}

function withCacheHeaders(response, path, status) {
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', headers.get('Cache-Control') || cacheControlFor(path));
  headers.set('X-Phulpur-Edge-Cache', status);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export async function onRequest({ request, env, params, waitUntil }) {
  const backendOrigin = (env.BACKEND_ORIGIN || '').replace(/\/+$/, '');
  if (!backendOrigin) {
    return Response.json(
      { ok: false, message: 'BACKEND_ORIGIN is not configured for this Cloudflare Pages project.' },
      { status: 503 },
    );
  }

  const incomingUrl = new URL(request.url);
  const path = Array.isArray(params.path) ? params.path.join('/') : params.path || '';
  const targetUrl = new URL(`${backendOrigin}/api/${path}`);
  targetUrl.search = incomingUrl.search;
  const cacheable = isCacheablePath(request.method, path);

  if (cacheable) {
    const cached = await caches.default.match(request);
    if (cached) return withCacheHeaders(cached, path, 'HIT');
  }

  const headers = new Headers(request.headers);
  headers.set('X-Forwarded-Host', incomingUrl.host);
  headers.set('X-Forwarded-Proto', incomingUrl.protocol.replace(':', ''));
  headers.delete('host');

  const response = await fetch(targetUrl, {
    method: request.method,
    headers,
    body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
    redirect: 'manual',
  });

  if (!cacheable || !response.ok) return response;

  const cachedResponse = withCacheHeaders(response, path, 'MISS');
  waitUntil(caches.default.put(request, cachedResponse.clone()));
  return cachedResponse;
}
