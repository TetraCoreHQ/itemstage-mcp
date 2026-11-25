import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { TOOLS, buildRequest } from '../src/tools.js';
import { bearerFrom, API_KEY_RE, createServer } from '../src/server.js';
import { ApiClient, ApiError } from '../src/client.js';

const openapi = JSON.parse(readFileSync(new URL('./fixtures/openapi.json', import.meta.url), 'utf8')) as {
  paths: Record<string, Record<string, { operationId: string; 'x-required-scope': string }>>;
};

describe('tool table', () => {
  it('has unique, snake_case names', () => {
    const names = TOOLS.map(t => t.name);
    expect(new Set(names).size).toBe(names.length);
    for (const n of names) expect(n).toMatch(/^[a-z][a-z0-9_]*$/);
  });

  it('covers every operation in the live OpenAPI document, with matching scopes', () => {
    const ops = new Map<string, string>();
    for (const [p, methods] of Object.entries(openapi.paths)) {
      for (const [m, op] of Object.entries(methods)) ops.set(`${m.toUpperCase()} ${p}`, op['x-required-scope']);
    }
    const covered = new Map(TOOLS.map(t => [`${t.method} ${t.path}`, t.scope]));
    const missing = [...ops.keys()].filter(k => !covered.has(k));
    const extra = [...covered.keys()].filter(k => !ops.has(k));
    expect(missing, 'API operations without a tool').toEqual([]);
    expect(extra, 'tools pointing at unknown operations').toEqual([]);
    for (const [k, scope] of ops) expect(covered.get(k), `scope for ${k}`).toBe(scope);
  });

  it('declares every path parameter in its input schema', () => {
    for (const t of TOOLS) {
      for (const m of t.path.matchAll(/\{([A-Za-z_]+)\}/g)) {
        expect(t.input, `${t.name} missing ${m[1]}`).toHaveProperty(m[1]);
      }
      for (const q of t.query ?? []) expect(t.input, `${t.name} query ${q}`).toHaveProperty(q);
    }
  });

  it('marks GETs read-only and nothing else', () => {
    for (const t of TOOLS) expect(!!t.readOnly, t.name).toBe(t.method === 'GET');
  });
});

describe('buildRequest', () => {
  const def = TOOLS.find(t => t.name === 'list_items')!;
  it('splits path, query and body', () => {
    const r = buildRequest(def, { job_id: '11111111-1111-4111-8111-111111111111', stage: 2, limit: 10 });
    expect(r.path).toBe('/items');
    expect(r.query).toEqual({ job_id: '11111111-1111-4111-8111-111111111111', stage: '2', limit: '10' });
    expect(r.body).toBeUndefined();
  });
  it('substitutes path params and keeps the rest as body', () => {
    const move = TOOLS.find(t => t.name === 'move_item')!;
    const r = buildRequest(move, { id: 'a', location_id: 'b', notes: 'x' });
    expect(r.path).toBe('/items/a/move');
    expect(r.body).toEqual({ location_id: 'b', notes: 'x' });
  });
  it('drops undefined and refuses a missing path param', () => {
    const upd = TOOLS.find(t => t.name === 'update_job')!;
    expect(buildRequest(upd, { id: 'j', name: undefined, is_active: false }).body).toEqual({ is_active: false });
    expect(() => buildRequest(upd, { name: 'n' })).toThrow(/path parameter "id"/);
  });
  it('validates with the zod shape (answers)', () => {
    const ans = TOOLS.find(t => t.name === 'answer_item_questions')!;
    const schema = z.object(ans.input);
    expect(schema.safeParse({ id: '11111111-1111-4111-8111-111111111111', answers: [{ question_id: '22222222-2222-4222-8222-222222222222', value: 'N/A' }] }).success).toBe(true);
    expect(schema.safeParse({ id: 'nope', answers: [] }).success).toBe(false);
  });
});

describe('auth helpers', () => {
  it('extracts bearer tokens', () => {
    expect(bearerFrom('Bearer abc')).toBe('abc');
    expect(bearerFrom('bearer   abc ')).toBe('abc');
    expect(bearerFrom('Basic abc')).toBeNull();
    expect(bearerFrom(null)).toBeNull();
  });
  it('recognises key format', () => {
    expect(API_KEY_RE.test('isk_live_' + 'a'.repeat(48))).toBe(true);
    expect(API_KEY_RE.test('isk_live_' + 'a'.repeat(47))).toBe(false);
    expect(API_KEY_RE.test('sk_live_' + 'a'.repeat(48))).toBe(false);
  });
});

describe('ApiClient', () => {
  const fakeFetch = (status: number, body: unknown, headers: Record<string, string> = {}) =>
    (async () => new Response(typeof body === 'string' ? body : JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } })) as unknown as typeof fetch;

  it('sends bearer + JSON body and parses JSON', async () => {
    let seen: { url: string; init: RequestInit } | undefined;
    const f = (async (url: string, init: RequestInit) => { seen = { url, init }; return new Response('{"id":"x"}', { status: 201 }); }) as unknown as typeof fetch;
    const c = new ApiClient({ baseUrl: 'https://api.test/v1/', apiKey: 'k', fetch: f });
    const out = await c.call('POST', '/jobs', { a: '1' }, { name: 'n' });
    expect(out).toEqual({ id: 'x' });
    expect(seen!.url).toBe('https://api.test/v1/jobs?a=1');
    expect((seen!.init.headers as Record<string, string>).authorization).toBe('Bearer k');
    expect(seen!.init.body).toBe('{"name":"n"}');
  });
  it('maps the error envelope to ApiError', async () => {
    const c = new ApiClient({ baseUrl: 'https://api.test/v1', apiKey: 'k', fetch: fakeFetch(422, { error: { code: 'workflow_gate', message: 'Answer "Photographed?" first', request_id: 'r1' } }) });
    await expect(c.call('POST', '/items/x/advance', {}, {})).rejects.toMatchObject({ status: 422, code: 'workflow_gate', requestId: 'r1' } satisfies Partial<ApiError>);
  });
  it('returns text for CSV', async () => {
    const c = new ApiClient({ baseUrl: 'https://api.test/v1', apiKey: 'k', fetch: fakeFetch(200, 'a,b\n1,2', { 'content-type': 'text/csv' }) });
    expect(await c.call('GET', '/jobs/x/export', {}, undefined, true)).toBe('a,b\n1,2');
  });
});

describe('createServer', () => {
  it('builds without touching the network', () => {
    const s = createServer({ apiKey: 'isk_live_' + 'a'.repeat(48), apiBase: 'https://api.test/v1', fetch: (async () => new Response('{}')) as unknown as typeof fetch });
    expect(s).toBeTruthy();
  });
});
