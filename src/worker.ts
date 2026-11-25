/**
 * Cloudflare Worker entry.
 *
 *   mcp.itemstage.com/mcp   streamable-HTTP MCP endpoint (stateless; one
 *                           server per request, authenticated by the same
 *                           `isk_live_…` key the REST API uses)
 *   api.itemstage.com/*     transparent proxy to the Supabase edge function
 *                           (so the public API has a stable hostname)
 */
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { createServer, bearerFrom, API_KEY_RE, SERVER_NAME, SERVER_VERSION } from './server.js';

export interface Env {
  API_BASE: string;
  PUBLIC_URL: string;
}

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, content-type, mcp-session-id, mcp-protocol-version, accept',
  'access-control-allow-methods': 'GET, POST, DELETE, OPTIONS',
  'access-control-expose-headers': 'mcp-session-id, x-request-id',
  'access-control-max-age': '86400',
};

function json(status: number, body: unknown, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extra } });
}

function unauthorized(url: URL, message: string): Response {
  return json(401, { error: { code: 'unauthorized', message } }, {
    'www-authenticate': `Bearer realm="${url.host}", error="invalid_token", error_description="${message.replace(/"/g, "'")}"`,
  });
}

async function handleMcp(req: Request, env: Env, url: URL): Promise<Response> {
  const token = bearerFrom(req.headers.get('authorization'));
  if (!token) return unauthorized(url, 'Send your ItemStage API key as "Authorization: Bearer isk_live_…" (Settings → API keys in the app)');
  if (!API_KEY_RE.test(token)) return unauthorized(url, 'That does not look like an ItemStage API key');

  const server = createServer({ apiKey: token, apiBase: env.API_BASE });
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless: every request stands alone
    enableJsonResponse: true,
  });
  await server.connect(transport);
  try {
    const res = await transport.handleRequest(req);
    const h = new Headers(res.headers);
    for (const [k, v] of Object.entries(CORS)) h.set(k, v);
    return new Response(res.body, { status: res.status, headers: h });
  } finally {
    // Close after the response is produced; the body has already been read for JSON responses.
    void transport.close().catch(() => {});
  }
}

async function proxyApi(req: Request, env: Env, url: URL): Promise<Response> {
  // https://api.itemstage.com/v1/jobs → {API_BASE minus /v1}/v1/jobs
  const upstreamRoot = env.API_BASE.replace(/\/v1\/?$/, '');
  const target = new URL(upstreamRoot + url.pathname + url.search);
  const headers = new Headers(req.headers);
  headers.delete('host');
  headers.set('x-forwarded-host', url.host);
  const res = await fetch(target.toString(), {
    method: req.method,
    headers,
    body: ['GET', 'HEAD'].includes(req.method) ? undefined : req.body,
    redirect: 'manual',
  });
  const h = new Headers(res.headers);
  if (!h.has('cache-control')) h.set('cache-control', 'private, no-store, max-age=0');
  return new Response(res.body, { status: res.status, headers: h });
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

    // Public API hostname → proxy everything to the edge function.
    if (url.hostname.startsWith('api.')) return proxyApi(req, env, url);

    if (url.pathname === '/mcp') return handleMcp(req, env, url);
    if (url.pathname === '/health') return json(200, { status: 'ok', name: SERVER_NAME, version: SERVER_VERSION });
    if (url.pathname === '/' || url.pathname === '') {
      return json(200, {
        name: 'ItemStage MCP server',
        version: SERVER_VERSION,
        transport: 'streamable-http',
        endpoint: env.PUBLIC_URL,
        authentication: 'Authorization: Bearer isk_live_… (create a key under Settings → API keys in the ItemStage app)',
        api: env.API_BASE,
        docs: 'https://github.com/TetraCoreHQ/itemstage/blob/main/docs/API.md',
        claude_code: `claude mcp add --transport http itemstage ${env.PUBLIC_URL} --header "Authorization: Bearer isk_live_…"`,
      });
    }
    return json(404, { error: { code: 'not_found', message: 'Use /mcp' } });
  },
};
