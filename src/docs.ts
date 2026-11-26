/**
 * Developer documentation served on api.itemstage.com:
 *   /docs            written guide (this file)
 *   /docs/reference  interactive reference rendered from /v1/openapi.json
 */

const CSS = `
:root{--bg:#ffffff;--fg:#1a1d23;--muted:#5b6472;--line:#e3e6ea;--card:#f6f7f9;--accent:#1d6fd6;--code:#f1f3f5;--ok:#1f7a4d;--warn:#9a6700}
@media (prefers-color-scheme:dark){:root{--bg:#0f1115;--fg:#e6e8eb;--muted:#9aa3ad;--line:#262b33;--card:#161a20;--accent:#6ea8ff;--code:#1b2027;--ok:#5bc48a;--warn:#e3b341}}
*{box-sizing:border-box}html{scroll-behavior:smooth}
body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
a{color:var(--accent);text-decoration:none}a:hover{text-decoration:underline}
header{border-bottom:1px solid var(--line);padding:14px 16px;display:flex;gap:16px;align-items:center;flex-wrap:wrap}
header strong{font-size:17px}header nav a{margin-right:14px;color:var(--muted)}header nav a.cta{color:var(--accent);font-weight:600}
.wrap{max-width:1180px;margin:0 auto;padding:0 16px;display:grid;grid-template-columns:230px 1fr;gap:40px}
aside{position:sticky;top:0;align-self:start;max-height:100vh;overflow:auto;padding:24px 0;font-size:14px}
aside a{display:block;color:var(--muted);padding:4px 0}aside a.sub{padding-left:14px;font-size:13px}
main{padding:24px 0 80px;min-width:0}
h1{font-size:30px;margin:12px 0 6px}h2{font-size:22px;margin:44px 0 10px;padding-top:10px;border-top:1px solid var(--line)}h3{font-size:17px;margin:26px 0 8px}
p,li{max-width:76ch}.lead{font-size:18px;color:var(--muted)}
code{font:13.5px/1.5 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;background:var(--code);padding:1px 5px;border-radius:4px}
pre{background:var(--code);border:1px solid var(--line);border-radius:8px;padding:14px 16px;overflow:auto}pre code{background:none;padding:0}
table{border-collapse:collapse;width:100%;font-size:14.5px;margin:10px 0}th,td{text-align:left;padding:8px 10px;border-bottom:1px solid var(--line);vertical-align:top}th{color:var(--muted);font-weight:600}
td code{white-space:nowrap}
.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:14px 16px;margin:14px 0}
.pill{display:inline-block;font-size:12px;font-weight:600;padding:1px 8px;border-radius:999px;border:1px solid var(--line);color:var(--muted);margin-right:4px}
.m{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;font-weight:700;padding:1px 6px;border-radius:4px;color:#fff;background:var(--muted)}
.m.get{background:#1f7a4d}.m.post{background:#1d6fd6}.m.patch,.m.put{background:#9a6700}.m.delete{background:#b42318}
footer{border-top:1px solid var(--line);color:var(--muted);font-size:13px;padding:18px 16px;text-align:center}
@media (max-width:860px){.wrap{grid-template-columns:1fr;gap:0}aside{position:static;max-height:none;padding-bottom:0;border-bottom:1px solid var(--line)}}
`;

function head(title: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title><meta name="description" content="How to use the ItemStage REST API and MCP server: keys, scopes, endpoints, examples.">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%231d6fd6'/%3E%3Cpath d='M9 11h14M9 16h14M9 21h9' stroke='%23fff' stroke-width='3' stroke-linecap='round'/%3E%3C/svg%3E">
<style>${CSS}</style></head>`;
}

function header(active: 'guide' | 'reference'): string {
  return `<header><strong>ItemStage API</strong><nav>
<a href="/docs"${active === 'guide' ? ' style="color:var(--fg)"' : ''}>Guide</a>
<a href="/docs/reference"${active === 'reference' ? ' style="color:var(--fg)"' : ''}>Reference</a>
<a href="/v1/openapi.json">openapi.json</a>
<a href="https://app.itemstage.com" class="cta">Open the app</a></nav></header>`;
}

export function docsHtml(apiBase: string, mcpUrl: string): string {
  const row = (m: string, p: string, scope: string, what: string) =>
    `<tr><td><span class="m ${m.toLowerCase()}">${m}</span></td><td><code>${p}</code></td><td>${scope}</td><td>${what}</td></tr>`;
  const table = (rows: string) => `<table><thead><tr><th style="width:70px"></th><th>Path</th><th style="width:70px">Scope</th><th>What it does</th></tr></thead><tbody>${rows}</tbody></table>`;

  return `${head('ItemStage API docs')}<body>${header('guide')}
<div class="wrap">
<aside>
<a href="#start">Start here</a>
<a href="#keys">API keys and scopes</a>
<a href="#conventions">Conventions</a>
<a href="#errors" class="sub">Errors</a>
<a href="#model">How ItemStage is organised</a>
<a href="#walkthrough">Walkthrough</a>
<a href="#endpoints">Endpoints</a>
<a href="#ep-workspace" class="sub">Workspace</a>
<a href="#ep-jobs" class="sub">Jobs, locations, team, questions</a>
<a href="#ep-templates" class="sub">Templates</a>
<a href="#ep-items" class="sub">Items, moves, answers, photos</a>
<a href="#mcp">MCP server for AI assistants</a>
<a href="#notes">Notes for integrators</a>
<a href="#changes">Versioning and changes</a>
</aside>
<main>
<h1>ItemStage REST API</h1>
<p class="lead">Everything the ItemStage app can do with jobs, locations, items, stage and location moves, questions and answers, dispositions, photos, templates and workflow settings, over plain HTTPS and JSON.</p>

<div class="card">
<div><span class="pill">Base URL</span> <code>${apiBase}</code></div>
<div style="margin-top:6px"><span class="pill">Auth</span> <code>Authorization: Bearer isk_live_…</code></div>
<div style="margin-top:6px"><span class="pill">Spec</span> <a href="/v1/openapi.json">OpenAPI 3.1</a> · <a href="/docs/reference">interactive reference</a></div>
<div style="margin-top:6px"><span class="pill">MCP</span> <code>${mcpUrl}</code></div>
<div style="margin-top:6px"><span class="pill">More</span> <a href="https://itemstage.com/developers">API overview</a> · <a href="https://itemstage.com/developers/mcp">MCP server page</a> · <a href="https://itemstage.com/changelog">changelog</a></div>
</div>

<h2 id="start">Start here</h2>
<ol>
<li>Sign in to the ItemStage app as a workspace owner or admin and open <strong>Settings → API keys</strong>.</li>
<li>Create a key. Give it a name you will recognise later and pick its scopes. The secret is shown once, so copy it straight away.</li>
<li>Call <code>GET /me</code> with the key. If it comes back with your workspace name, you are set.</li>
</ol>
<pre><code>curl ${apiBase}/me \\
  -H "Authorization: Bearer isk_live_…"</code></pre>

<h2 id="keys">API keys and scopes</h2>
<p>A key belongs to one workspace and <strong>acts as the person who created it</strong>. Every request runs under that person's permissions and under the same workflow rules the app enforces: required questions, photo minimums, the disposition rule, location-bound questions. A key can never do more than its creator can, and audit fields on every record name a real person.</p>
<table><thead><tr><th>Scope</th><th>Allows</th></tr></thead><tbody>
<tr><td><code>read</code></td><td>All <code>GET</code> endpoints</td></tr>
<tr><td><code>write</code></td><td>Create, update and delete; moves, answers, photos</td></tr>
<tr><td><code>admin</code></td><td>API keys, workflow settings, stage names, dispositions. Only the workspace owner can grant it.</td></tr>
</tbody></table>
<p><code>admin</code> includes <code>write</code>, which includes <code>read</code>. The workspace role still applies underneath: an admin-scoped key held by a member cannot do owner-only things.</p>
<p>Revoke a key any time in the app or with <code>DELETE /api-keys/{id}</code>. Revocation is immediate.</p>

<h2 id="conventions">Conventions</h2>
<ul>
<li>IDs are UUIDs. Timestamps are ISO 8601 in UTC.</li>
<li>Send JSON with <code>Content-Type: application/json</code>. Responses are JSON, except the CSV export.</li>
<li>Lists return <code>{ "data": [...], "meta": { "limit", "offset", "total" } }</code>. <code>limit</code> defaults to 50, maximum 200.</li>
<li><code>PATCH</code> accepts only the fields listed for that endpoint. Unknown fields are refused with a message that names them and, where there is a better endpoint, points to it.</li>
<li>Every response carries an <code>x-request-id</code> header. Quote it when you report a problem.</li>
<li>Nothing is cached. Responses are <code>no-store</code>.</li>
</ul>

<h3 id="errors">Errors</h3>
<pre><code>{ "error": { "code": "workflow_gate", "message": "Please answer all required process questions before moving to the next stage", "request_id": "3a04df26" } }</code></pre>
<table><thead><tr><th>Status</th><th>Code</th><th>Meaning</th></tr></thead><tbody>
<tr><td>400</td><td><code>bad_request</code></td><td>Malformed input or an unknown field.</td></tr>
<tr><td>401</td><td><code>unauthorized</code></td><td>Missing, unknown, revoked or expired key.</td></tr>
<tr><td>403</td><td><code>forbidden</code></td><td>The key lacks the scope, or the workspace role does not allow it.</td></tr>
<tr><td>404</td><td><code>not_found</code></td><td>No such record in this workspace.</td></tr>
<tr><td>409</td><td><code>conflict</code></td><td>Duplicate, for example the same serial and model already in the job.</td></tr>
<tr><td>422</td><td><code>workflow_gate</code></td><td>A workflow rule refused the move. The message is the one technicians see in the app.</td></tr>
<tr><td>422</td><td><code>unprocessable</code></td><td>Validation: unknown disposition, option not in the list, bad image.</td></tr>
</tbody></table>

<h2 id="model">How ItemStage is organised</h2>
<p>A <strong>workspace</strong> is one company. It has four <strong>stages</strong> that you can rename, a list of <strong>dispositions</strong>, members, and <strong>jobs</strong>.</p>
<p>A <strong>job</strong> (a loss, a client, a project) holds <strong>locations</strong>, a <strong>team</strong>, <strong>process questions</strong> and <strong>items</strong>. Locations can be nested one level: an <em>area</em> such as a warehouse bay with <em>positions</em> such as racks inside it. Questions can be global, tied to a stage, or tied to a location or area.</p>
<p>An <strong>item</strong> is one physical thing. It sits at a location and in a stage, carries answers and photos, and moves forward with <code>/advance</code> and around with <code>/move</code>. Both moves are checked against the workspace's rules on the server, and a refusal says exactly what is missing.</p>
<p><strong>Templates</strong> are reusable sets of locations, team and questions that you can apply to a new job.</p>

<h2 id="walkthrough">Walkthrough</h2>
<pre><code>API=${apiBase}
KEY=isk_live_…
H='Authorization: Bearer '$KEY
J='Content-Type: application/json'

# A job with an area and a rack inside it
JOB=$(curl -s -X POST -H "$H" -H "$J" -d '{"name":"Smith residence","loss_type":"Water"}' $API/jobs | jq -r .id)
AREA=$(curl -s -X POST -H "$H" -H "$J" -d '{"name":"Warehouse B","location_type":"area"}' $API/jobs/$JOB/locations | jq -r .id)
RACK=$(curl -s -X POST -H "$H" -H "$J" -d "{\\"name\\":\\"Rack 3\\",\\"parent_id\\":\\"$AREA\\"}" $API/jobs/$JOB/locations | jq -r .id)

# An item, moved to the rack
ITEM=$(curl -s -X POST -H "$H" -H "$J" -d "{\\"job_id\\":\\"$JOB\\",\\"model_number\\":\\"Sofa\\"}" $API/items | jq -r .id)
curl -s -X POST -H "$H" -H "$J" -d "{\\"location_id\\":\\"$RACK\\",\\"notes\\":\\"Moved for drying\\"}" $API/items/$ITEM/move

# What is still open, then answer and advance
curl -s -H "$H" $API/items/$ITEM/questions
curl -s -X PUT -H "$H" -H "$J" -d '{"answers":[{"question_id":"…","value":true}]}' $API/items/$ITEM/answers
curl -s -X POST -H "$H" $API/items/$ITEM/advance

# A photo (data URI or bare base64; JPEG, PNG or WebP up to 10 MB)
curl -s -X POST -H "$H" -H "$J" -d "{\\"image_base64\\":\\"data:image/jpeg;base64,$(base64 -w0 photo.jpg)\\"}" $API/items/$ITEM/photos

# Export the job
curl -s -H "$H" $API/jobs/$JOB/export -o smith.csv</code></pre>

<h2 id="endpoints">Endpoints</h2>
<p>Every endpoint below is documented field by field in the <a href="/docs/reference">interactive reference</a>, which is generated from the same route table the server runs.</p>

<h3 id="ep-workspace">Workspace</h3>
${table(
  row('GET', '/me', 'read', 'Workspace, acting user, role, key scopes and workflow flags') +
  row('GET', '/settings', 'read', 'Workflow settings') +
  row('PATCH', '/settings', 'admin', '<code>stage_questions_enabled</code>, <code>require_disposition</code> (owner only)') +
  row('GET', '/stages', 'read', 'The four stages with this workspace\'s names, colours and photo minimums') +
  row('PUT', '/stages/{order}', 'admin', 'Rename a stage, set description, colour, minimum photos') +
  row('DELETE', '/stages/{order}', 'admin', 'Back to the default name') +
  row('GET', '/dispositions', 'read', 'List dispositions (<code>?include_inactive=true</code>)') +
  row('POST', '/dispositions', 'admin', 'Add a disposition') +
  row('PATCH', '/dispositions/{id}', 'admin', 'Edit, reorder, retire') +
  row('DELETE', '/dispositions/{id}', 'admin', 'Delete') +
  row('GET', '/users', 'read', 'Members and roles') +
  row('GET', '/api-keys', 'admin', 'List keys (never the secrets)') +
  row('POST', '/api-keys', 'admin', 'Create a key; the secret is in the response once') +
  row('DELETE', '/api-keys/{id}', 'admin', 'Revoke'),
)}

<h3 id="ep-jobs">Jobs, locations, team, questions</h3>
${table(
  row('GET', '/jobs', 'read', 'List jobs (<code>?include_inactive</code>, <code>?search</code>, paging)') +
  row('POST', '/jobs', 'write', 'Create a job; <code>template_id</code> applies a template') +
  row('GET', '/jobs/{id}', 'read', 'Detail with item counts per stage') +
  row('PATCH', '/jobs/{id}', 'write', 'Name, description, loss type, active flag, serial settings') +
  row('DELETE', '/jobs/{id}', 'write', 'Delete (refused while it has items)') +
  row('POST', '/jobs/{id}/apply-template', 'write', 'Copy a template into the job') +
  row('GET', '/jobs/{id}/export', 'read', 'CSV of every item with current answers') +
  row('GET', '/jobs/{id}/locations', 'read', 'Locations with their path') +
  row('POST', '/jobs/{id}/locations', 'write', 'Add a location; <code>parent_id</code> nests it in an area') +
  row('GET', '/locations/{id}', 'read', 'Location detail') +
  row('PATCH', '/locations/{id}', 'write', 'Edit, or move under another area') +
  row('DELETE', '/locations/{id}', 'write', 'Delete (refused while in use)') +
  row('GET', '/jobs/{id}/team', 'read', 'Team records') +
  row('POST', '/jobs/{id}/team', 'write', 'Add a team member') +
  row('PATCH', '/team/{id}', 'write', 'Edit a team member') +
  row('DELETE', '/team/{id}', 'write', 'Remove a team member') +
  row('GET', '/jobs/{id}/questions', 'read', 'Job and global questions (<code>?include_global=false</code>)') +
  row('POST', '/jobs/{id}/questions', 'write', 'Add a question; <code>stage_id</code>, <code>location_id</code>, <code>allow_na</code>') +
  row('GET', '/questions/{id}', 'read', 'Question detail') +
  row('PATCH', '/questions/{id}', 'write', 'Edit a question') +
  row('DELETE', '/questions/{id}', 'write', 'Delete a question') +
  row('PUT', '/jobs/{id}/questions/order', 'write', 'Reorder: <code>{ "ids": [...] }</code>'),
)}

<h3 id="ep-templates">Templates</h3>
${table(
  row('GET', '/templates', 'read', 'List templates') +
  row('POST', '/templates', 'write', 'Create a template') +
  row('GET', '/templates/{id}', 'read', 'Detail with locations, team and questions') +
  row('PATCH', '/templates/{id}', 'write', 'Edit a template') +
  row('DELETE', '/templates/{id}', 'write', 'Delete a template') +
  row('POST', '/templates/{id}/locations', 'write', 'Add a template location') +
  row('PATCH', '/template-locations/{id}', 'write', 'Edit') +
  row('DELETE', '/template-locations/{id}', 'write', 'Delete') +
  row('POST', '/templates/{id}/team', 'write', 'Add a template team member') +
  row('PATCH', '/template-team/{id}', 'write', 'Edit') +
  row('DELETE', '/template-team/{id}', 'write', 'Delete') +
  row('POST', '/templates/{id}/questions', 'write', 'Add a template question') +
  row('PATCH', '/template-questions/{id}', 'write', 'Edit') +
  row('DELETE', '/template-questions/{id}', 'write', 'Delete'),
)}

<h3 id="ep-items">Items, moves, answers, photos</h3>
${table(
  row('GET', '/items', 'read', 'List with filters: <code>job_id</code>, <code>stage</code>, <code>disposition</code>, <code>location_id</code>, <code>search</code>, <code>created_after</code>, <code>created_before</code>, <code>updated_after</code>') +
  row('POST', '/items', 'write', 'Create; <code>serial_number</code> is assigned from the job\'s settings when omitted') +
  row('GET', '/items/{id}', 'read', 'Detail with stage, job, location path, photo counts') +
  row('PATCH', '/items/{id}', 'write', 'Edit fields (stage and location change through the two endpoints below)') +
  row('DELETE', '/items/{id}', 'write', 'Delete an item and its photos (owner or admin)') +
  row('POST', '/items/{id}/advance', 'write', 'Next stage, checked against the workspace rules') +
  row('POST', '/items/{id}/move', 'write', '<code>{ location_id, notes?, photo_id? }</code>, logged in history') +
  row('POST', '/items/{id}/disposition', 'write', '<code>{ disposition }</code>; must be an active disposition; <code>null</code> clears') +
  row('GET', '/items/{id}/history', 'read', 'Stage transitions and location moves') +
  row('GET', '/items/{id}/questions', 'read', 'Questions that apply right now with current answers; <code>?all=true</code> for every question') +
  row('PUT', '/items/{id}/answers', 'write', '<code>{ answers: [{ question_id, value }] }</code>; <code>"N/A"</code> where allowed; changes supersede') +
  row('GET', '/items/{id}/photos', 'read', 'Signed URLs valid one hour (<code>?stage</code>, <code>?question_id</code>)') +
  row('POST', '/items/{id}/photos', 'write', 'Upload <code>{ image_base64, stage_id?, question_id?, captured_at? }</code>') +
  row('GET', '/photos/{id}', 'read', 'One photo with a fresh signed URL') +
  row('DELETE', '/photos/{id}', 'write', 'Delete a photo and its file'),
)}

<h2 id="mcp">MCP server for AI assistants</h2>
<p>The same API is available to Claude and other MCP clients as 65 tools, one per endpoint, at <code>${mcpUrl}</code>. Authentication is the same key, sent as a bearer token. The assistant sees the same refusals and messages a technician would, so it can fix what is missing and retry.</p>
<p><strong>Claude Code</strong></p>
<pre><code>claude mcp add --transport http itemstage ${mcpUrl} \\
  --header "Authorization: Bearer isk_live_…"</code></pre>
<p><strong>Claude Desktop, Cursor and other stdio clients</strong> (npm package <a href="https://www.npmjs.com/package/@itemstage/mcp">@itemstage/mcp</a>, source on <a href="https://github.com/TetraCoreHQ/itemstage-mcp">GitHub</a>)</p>
<pre><code>{
  "mcpServers": {
    "itemstage": {
      "command": "npx",
      "args": ["-y", "@itemstage/mcp"],
      "env": { "ITEMSTAGE_API_KEY": "isk_live_…" }
    }
  }
}</code></pre>
<p>Clients that support remote MCP with a custom header can point straight at the endpoint above.</p>

<h2 id="notes">Notes for integrators</h2>
<ul>
<li><strong>Stage-aware workspaces.</strong> When a workspace asks questions per stage, answers are stamped with the item's stage and "current" means per question and stage. Otherwise answers carry no stage, exactly as in the app.</li>
<li><strong>Location-bound questions.</strong> A question with <code>location_id</code> applies while the item is at that position or anywhere inside that area. The move endpoint refuses to leave while such a required question is open, and names it.</li>
<li><strong>Photos.</strong> Uploads land in private storage and get the same record the app writes. URLs are signed for one hour; fetch again when they expire.</li>
<li><strong>Serial numbers.</strong> Omit <code>serial_number</code> on create to take the next number from the job's prefix and padding, the way the app does.</li>
<li><strong>Rate limits.</strong> None enforced yet beyond the platform defaults. Batch where the API allows it: <code>/answers</code> takes many at once.</li>
<li><strong>Idempotency.</strong> Creates are not idempotent. If a request times out, list before you retry.</li>
</ul>

<h2 id="changes">Versioning and changes</h2>
<p>The path carries the major version, <code>/v1</code>. Fields are added without notice; nothing is removed or renamed inside a major version. Compliance and ITAD endpoints (sanitisation events, sampling, certificates, downstream vendors), user invites and PDF exports are planned for v1.1.</p>
<p>Questions or a bug: <a href="mailto:support@itemstage.com">support@itemstage.com</a>. Include the <code>x-request-id</code>.</p>
</main>
</div>
<footer>ItemStage · <a href="/docs">Guide</a> · <a href="/docs/reference">Reference</a> · <a href="/v1/openapi.json">OpenAPI</a></footer>
</body></html>`;
}

export function referenceHtml(): string {
  return `${head('ItemStage API reference')}<body style="margin:0">${header('reference')}
<div id="app"></div>
<script id="api-reference" data-url="/v1/openapi.json" data-configuration='{"theme":"default","hideModels":false,"authentication":{"preferredSecurityScheme":"apiKey"},"defaultHttpClient":{"targetKey":"shell","clientKey":"curl"}}'></script>
<script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
</body></html>`;
}
