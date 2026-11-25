# ItemStage MCP server

Lets an AI assistant work inside an ItemStage workspace: list and create jobs,
set up areas and racks, register items, move them between locations and
stages, answer process questions, upload photos, export CSVs and manage
workflow settings. Every tool is a thin wrapper over one operation of the
[ItemStage REST API v1](https://github.com/TetraCoreHQ/itemstage/blob/main/docs/API.md),
so the same permissions and workflow gates apply as in the app.

- **Hosted endpoint:** `https://mcp.itemstage.com/mcp` (streamable HTTP)
- **Auth:** `Authorization: Bearer isk_live_…`. Create a key in the ItemStage
  app under **Settings → API keys** (owner or admin). The key acts as the person
  who created it.
- **Tools:** 65, one per API operation. Names are plain verbs: `list_jobs`,
  `create_item`, `move_item`, `advance_item`, `answer_item_questions`,
  `upload_item_photo`, `export_job_csv`, …

## Connect

**Claude Code**

```bash
claude mcp add --transport http itemstage https://mcp.itemstage.com/mcp \
  --header "Authorization: Bearer isk_live_…"
```

**Claude Desktop / Cursor / anything that speaks stdio**

```json
{
  "mcpServers": {
    "itemstage": {
      "command": "npx",
      "args": ["-y", "itemstage-mcp"],
      "env": { "ITEMSTAGE_API_KEY": "isk_live_…" }
    }
  }
}
```

**Any client that supports remote MCP with a bearer header:** point it at the
hosted endpoint and send the key as `Authorization: Bearer …`.

## What a session looks like

1. `get_me` tells the assistant which workspace it is in and what the key may do.
2. `list_jobs` → `list_job_locations` → `list_items` to find things.
3. `create_item`, `move_item`, `answer_item_questions`, `upload_item_photo`,
   `advance_item` to do work. A refused move explains what is missing
   (unanswered required question, photo minimum, disposition) so the assistant
   can fix it and retry.
4. `export_job_csv` for a report.

## Hosting

One Cloudflare Worker serves two hostnames:

| Host | Role |
|---|---|
| `mcp.itemstage.com` | this MCP server (`/mcp`, `/health`, `/`) |
| `api.itemstage.com` | transparent proxy to the Supabase edge function that runs the REST API |

Stateless: each request authenticates, builds a server, handles the message
and tears down. No sessions, no Durable Objects, no stored keys.

## Develop

```bash
npm install
npm run typecheck
npm test                 # tool table ⊇ OpenAPI ops, request building, client, auth
npm run dev              # wrangler dev → http://localhost:8787/mcp
npm run deploy           # wrangler deploy (needs Cloudflare auth)
```

`test/fixtures/openapi.json` is a copy of the live `GET /v1/openapi.json`;
refresh it when the API gains operations so the coverage test stays honest.

Local stdio build: `npm run build && ITEMSTAGE_API_KEY=… node dist/bin.js`.

## Status

- 2026-11-25: **live.** Deployed to Cloudflare (TRZ Holdings account) with
  custom domains `mcp.itemstage.com` and `api.itemstage.com`. Repo:
  `TetraCoreHQ/itemstage-mcp` (private). Deploy with `npm run deploy` using
  the Workers token in the monorepo `.env` (`CLOUDFLARE_WORKERS_API_TOKEN`).
