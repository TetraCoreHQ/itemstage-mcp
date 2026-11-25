import { describe, it, expect } from 'vitest';
import { docsHtml, referenceHtml } from '../src/docs.js';
import { TOOLS } from '../src/tools.js';

describe('docs pages', () => {
  const html = docsHtml('https://api.itemstage.com/v1', 'https://mcp.itemstage.com/mcp');

  it('is a complete HTML document with the base URL, auth and MCP endpoint', () => {
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain('https://api.itemstage.com/v1');
    expect(html).toContain('Authorization: Bearer isk_live_');
    expect(html).toContain('https://mcp.itemstage.com/mcp');
    expect(html).toContain('href="/v1/openapi.json"');
    expect(html).toContain('href="/docs/reference"');
  });

  it('lists every API path the tool table knows about', () => {
    const paths = new Set(TOOLS.map(t => t.path));
    for (const p of paths) expect(html, `missing ${p}`).toContain(`<code>${p}</code>`);
  });

  it('reference page loads the spec from the same origin', () => {
    const ref = referenceHtml();
    expect(ref).toContain('data-url="/v1/openapi.json"');
    expect(ref).toContain('@scalar/api-reference');
  });
});
