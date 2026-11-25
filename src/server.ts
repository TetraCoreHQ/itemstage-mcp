import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { ApiClient, ApiError } from './client.js';
import { TOOLS, buildRequest, type ToolDef } from './tools.js';

export const SERVER_NAME = 'itemstage';
export const SERVER_VERSION = '0.1.0';

export const INSTRUCTIONS = [
  'ItemStage tracks physical items (contents restoration, ITAD) through four workflow stages inside jobs.',
  'Start with get_me to learn the workspace, your role and the key scopes. Jobs hold items, locations (areas with positions), team and process questions.',
  'Items move stage-to-stage with advance_item and place-to-place with move_item; both are gated by the workspace rules (required questions, photo minimums, disposition). When a move is refused the message says exactly what is missing: answer with answer_item_questions or upload_item_photo, then retry.',
  'IDs are UUIDs; list_* tools return them. Never guess an id.',
  'Errors come back with the API\'s own code and message plus a request_id to quote when reporting problems.',
].join('\n');

export interface ServerOptions {
  apiKey: string;
  apiBase: string;
  fetch?: typeof fetch;
}

function formatError(e: unknown): string {
  if (e instanceof ApiError) {
    const rid = e.requestId ? ` (request ${e.requestId})` : '';
    return `${e.code} [${e.status}]: ${e.message}${rid}`;
  }
  return e instanceof Error ? e.message : String(e);
}

export function createServer(opts: ServerOptions): McpServer {
  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION }, { instructions: INSTRUCTIONS });
  const api = new ApiClient({ baseUrl: opts.apiBase, apiKey: opts.apiKey, fetch: opts.fetch, userAgent: `itemstage-mcp/${SERVER_VERSION}` });

  for (const def of TOOLS) registerTool(server, api, def);
  return server;
}

function registerTool(server: McpServer, api: ApiClient, def: ToolDef) {
  server.registerTool(
    def.name,
    {
      title: def.title,
      description: `${def.description} [${def.method} ${def.path}; needs "${def.scope}" scope]`,
      inputSchema: def.input,
      annotations: {
        readOnlyHint: def.readOnly ?? false,
        destructiveHint: def.destructive ?? false,
        idempotentHint: def.idempotent ?? def.readOnly ?? false,
        openWorldHint: false,
      },
    },
    async (input: Record<string, unknown>) => {
      try {
        const { path, query, body } = buildRequest(def, input);
        const result = await api.call(def.method, path, query, body, def.text);
        if (def.text) return { content: [{ type: 'text', text: String(result) }] };
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          structuredContent: (result !== null && typeof result === 'object' && !Array.isArray(result)) ? result as Record<string, unknown> : { data: result },
        };
      } catch (e) {
        return { isError: true, content: [{ type: 'text', text: formatError(e) }] };
      }
    },
  );
}

/** Pure: pull a bearer token out of an Authorization header. */
export function bearerFrom(header: string | null | undefined): string | null {
  if (!header) return null;
  const m = /^\s*Bearer\s+(\S+)\s*$/i.exec(header);
  return m ? m[1] : null;
}

export const API_KEY_RE = /^isk_(live|test)_[0-9a-f]{48}$/;

// Re-exported for tests.
export { z };
