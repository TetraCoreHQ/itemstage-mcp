#!/usr/bin/env node
/**
 * Local stdio entry for Claude Desktop / Claude Code / Cursor:
 *
 *   ITEMSTAGE_API_KEY=isk_live_… npx itemstage-mcp
 *
 * Optional: ITEMSTAGE_API_BASE (default https://api.itemstage.com/v1).
 */
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer, API_KEY_RE } from './server.js';

const key = process.env.ITEMSTAGE_API_KEY ?? '';
if (!API_KEY_RE.test(key)) {
  process.stderr.write('itemstage-mcp: set ITEMSTAGE_API_KEY to a workspace API key (isk_live_…). Create one in the ItemStage app under Settings → API keys.\n');
  process.exit(2);
}
const apiBase = process.env.ITEMSTAGE_API_BASE ?? 'https://api.itemstage.com/v1';

const server = createServer({ apiKey: key, apiBase });
await server.connect(new StdioServerTransport());
