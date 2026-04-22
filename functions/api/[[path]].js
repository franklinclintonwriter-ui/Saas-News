export async function onRequest({ request, env, params }) {
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

  const headers = new Headers(request.headers);
  headers.set('X-Forwarded-Host', incomingUrl.host);
  headers.set('X-Forwarded-Proto', incomingUrl.protocol.replace(':', ''));
  headers.delete('host');

  return fetch(targetUrl, {
    method: request.method,
    headers,
    body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
    redirect: 'manual',
  });
}
