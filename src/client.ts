/**
 * Thin client for the ItemStage REST API. One instance per request (the key
 * comes from the MCP caller), no caching, errors surfaced verbatim.
 */
export interface ApiErrorBody { error: { code: string; message: string; request_id?: string; details?: unknown } }

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public requestId?: string, public details?: unknown) {
    super(message);
  }
}

export interface ApiClientOptions {
  baseUrl: string;
  apiKey: string;
  fetch?: typeof fetch;
  userAgent?: string;
}

export class ApiClient {
  private readonly base: string;
  private readonly fetchFn: typeof fetch;
  constructor(private readonly opts: ApiClientOptions) {
    this.base = opts.baseUrl.replace(/\/+$/, '');
    this.fetchFn = opts.fetch ?? globalThis.fetch.bind(globalThis);
  }

  async call(method: string, path: string, query: Record<string, string> = {}, body?: Record<string, unknown>, text = false): Promise<unknown> {
    const url = new URL(this.base + path);
    for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
    const headers: Record<string, string> = {
      authorization: `Bearer ${this.opts.apiKey}`,
      accept: text ? 'text/csv, application/json' : 'application/json',
      'user-agent': this.opts.userAgent ?? 'itemstage-mcp',
    };
    const init: RequestInit = { method, headers };
    if (body !== undefined) {
      headers['content-type'] = 'application/json';
      init.body = JSON.stringify(body);
    }
    const res = await this.fetchFn(url.toString(), init);
    const requestId = res.headers.get('x-request-id') ?? undefined;
    if (res.status === 204) return { ok: true };
    const raw = await res.text();
    if (!res.ok) {
      let parsed: ApiErrorBody | undefined;
      try { parsed = JSON.parse(raw) as ApiErrorBody; } catch { /* non-JSON error */ }
      const e = parsed?.error;
      throw new ApiError(res.status, e?.code ?? `http_${res.status}`, e?.message ?? (raw.slice(0, 300) || res.statusText), e?.request_id ?? requestId, e?.details);
    }
    if (text) return raw;
    try { return JSON.parse(raw); } catch { return raw; }
  }
}
