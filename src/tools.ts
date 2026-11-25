/**
 * Tool table: one MCP tool per ItemStage REST API operation (65 in v1).
 *
 * Each tool names the HTTP method and path template of the API call it makes.
 * Input fields that appear in the path as `{name}` are substituted; fields
 * listed in `query` go on the query string; everything else is the JSON body.
 * The server never invents behaviour: it validates, calls the API, and
 * returns what the API said (including its error messages verbatim).
 */
import { z } from 'zod';

export type Scope = 'read' | 'write' | 'admin';

export interface ToolDef {
  name: string;
  title: string;
  description: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  scope: Scope;
  input: z.ZodRawShape;
  /** Input keys sent as query-string parameters. */
  query?: string[];
  /** Response is not JSON (CSV export). */
  text?: boolean;
  /** Hints for clients. */
  readOnly?: boolean;
  destructive?: boolean;
  idempotent?: boolean;
}

const uuid = (what: string) => z.string().uuid().describe(what);
const paging = {
  limit: z.number().int().min(1).max(200).optional().describe('Page size, max 200 (default 50)'),
  offset: z.number().int().min(0).optional().describe('Rows to skip'),
};
const questionType = z.enum(['yes_no', 'single_choice', 'multi_choice', 'text', 'photo', 'file']);
const stageId = z.number().int().min(1).max(4);
const answerValue = z.union([z.boolean(), z.string(), z.array(z.string())])
  .describe('true/false for yes_no, text for text/single_choice, string[] for multi_choice, or "N/A" where the question allows it');

const questionFields = {
  question_text: z.string().min(1),
  question_type: questionType,
  options: z.array(z.string()).optional().describe('Choices for single_choice / multi_choice'),
  is_required: z.boolean().optional().describe('Required answers block leaving the stage (or the location, for location-bound questions)'),
  allow_na: z.boolean().optional().describe('Let techs answer "N/A"'),
  display_order: z.number().int().optional(),
  stage_id: stageId.nullable().optional().describe('Ask only at this stage (1-4). Needs stage questions enabled on the workspace'),
};

const t = (d: ToolDef): ToolDef => d;

export const TOOLS: ToolDef[] = [
  // ── Workspace ────────────────────────────────────────────────────────────
  t({ name: 'get_me', title: 'Who am I', description: 'The workspace this key belongs to, the user it acts as, their role, the key scopes and workflow flags. Call this first.', method: 'GET', path: '/me', scope: 'read', input: {}, readOnly: true }),
  t({ name: 'get_settings', title: 'Workflow settings', description: 'Workspace workflow settings: stage_questions_enabled, require_disposition, compliance profile.', method: 'GET', path: '/settings', scope: 'read', input: {}, readOnly: true }),
  t({ name: 'update_settings', title: 'Change workflow settings', description: 'Change workflow settings. Workspace owner only.', method: 'PATCH', path: '/settings', scope: 'admin', input: {
    stage_questions_enabled: z.boolean().optional().describe('Ask questions per stage and show the stage picker'),
    require_disposition: z.boolean().optional().describe('Require a disposition before an item can finish'),
  }, idempotent: true }),
  t({ name: 'list_stages', title: 'Stages', description: 'The four workflow stages with this workspace\'s names, descriptions, colours and minimum photo counts.', method: 'GET', path: '/stages', scope: 'read', input: {}, readOnly: true }),
  t({ name: 'set_stage', title: 'Rename or configure a stage', description: 'Rename a stage (1-4), set its description, colour or the minimum number of photos required before an item can leave it.', method: 'PUT', path: '/stages/{order}', scope: 'admin', input: {
    order: stageId.describe('Stage position 1-4'),
    name: z.string().optional(), description: z.string().optional(),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().describe('#rrggbb'),
    min_photos: z.number().int().min(0).max(20).optional(),
  }, idempotent: true }),
  t({ name: 'reset_stage', title: 'Reset a stage name', description: 'Put a stage back to its default name, description and colour.', method: 'DELETE', path: '/stages/{order}', scope: 'admin', input: { order: stageId }, idempotent: true }),
  t({ name: 'list_dispositions', title: 'Dispositions', description: 'Disposition values items can be given (e.g. Restored, Total loss). Pass include_inactive to see retired ones.', method: 'GET', path: '/dispositions', scope: 'read', input: { include_inactive: z.boolean().optional() }, query: ['include_inactive'], readOnly: true }),
  t({ name: 'create_disposition', title: 'Add a disposition', description: 'Add a disposition value.', method: 'POST', path: '/dispositions', scope: 'admin', input: {
    name: z.string().min(1), is_positive: z.boolean().optional().describe('Counts as a good outcome (default true)'), display_order: z.number().int().optional(),
  } }),
  t({ name: 'update_disposition', title: 'Edit a disposition', description: 'Rename, reorder, retire or reactivate a disposition.', method: 'PATCH', path: '/dispositions/{id}', scope: 'admin', input: {
    id: uuid('Disposition id'), name: z.string().optional(), is_positive: z.boolean().optional(), display_order: z.number().int().optional(), is_active: z.boolean().optional(),
  }, idempotent: true }),
  t({ name: 'delete_disposition', title: 'Delete a disposition', description: 'Delete a disposition. Prefer update_disposition with is_active=false when items already use it.', method: 'DELETE', path: '/dispositions/{id}', scope: 'admin', input: { id: uuid('Disposition id') }, destructive: true }),
  t({ name: 'list_users', title: 'Workspace members', description: 'People in the workspace with their roles and approval status.', method: 'GET', path: '/users', scope: 'read', input: {}, readOnly: true }),
  t({ name: 'list_api_keys', title: 'API keys', description: 'API keys in the workspace (prefix, scopes, last used, revoked). Secrets are never returned.', method: 'GET', path: '/api-keys', scope: 'admin', input: {}, readOnly: true }),
  t({ name: 'create_api_key', title: 'Create an API key', description: 'Create an API key. The secret is in the response once; store it immediately. Admin scope can only be granted by the workspace owner.', method: 'POST', path: '/api-keys', scope: 'admin', input: {
    name: z.string().min(1), scopes: z.array(z.enum(['read', 'write', 'admin'])).optional().describe('Default read + write'), expires_at: z.string().datetime().optional(),
  } }),
  t({ name: 'revoke_api_key', title: 'Revoke an API key', description: 'Revoke an API key immediately. Cannot be undone.', method: 'DELETE', path: '/api-keys/{id}', scope: 'admin', input: { id: uuid('Key id') }, destructive: true }),

  // ── Jobs ─────────────────────────────────────────────────────────────────
  t({ name: 'list_jobs', title: 'Jobs', description: 'List jobs (projects) in the workspace, newest first. Inactive jobs are hidden unless include_inactive is true.', method: 'GET', path: '/jobs', scope: 'read', input: {
    include_inactive: z.boolean().optional(), search: z.string().optional().describe('Name contains'), ...paging,
  }, query: ['include_inactive', 'search', 'limit', 'offset'], readOnly: true }),
  t({ name: 'get_job', title: 'Job detail', description: 'A job with item counts per stage and its serial-number settings.', method: 'GET', path: '/jobs/{id}', scope: 'read', input: { id: uuid('Job id') }, readOnly: true }),
  t({ name: 'create_job', title: 'Create a job', description: 'Create a job. Pass template_id to copy a template\'s locations, team and questions into it.', method: 'POST', path: '/jobs', scope: 'write', input: {
    name: z.string().min(1), description: z.string().optional(),
    loss_type: z.string().optional().describe('Fire, Water, Mold, Storm, Other or free text'),
    serial_prefix: z.string().optional(), serial_padding: z.number().int().min(1).max(10).optional(),
    template_id: uuid('Template to apply').optional(),
  } }),
  t({ name: 'update_job', title: 'Update a job', description: 'Edit a job\'s name, description, loss type, active flag or serial-number settings.', method: 'PATCH', path: '/jobs/{id}', scope: 'write', input: {
    id: uuid('Job id'), name: z.string().optional(), description: z.string().optional(), loss_type: z.string().optional(), is_active: z.boolean().optional(),
    serial_prefix: z.string().optional(), serial_next_number: z.number().int().optional(), serial_padding: z.number().int().optional(),
  }, idempotent: true }),
  t({ name: 'delete_job', title: 'Delete a job', description: 'Delete a job. Refused while it still has items; deactivate with update_job instead to hide it.', method: 'DELETE', path: '/jobs/{id}', scope: 'write', input: { id: uuid('Job id') }, destructive: true }),
  t({ name: 'apply_job_template', title: 'Apply a template to a job', description: 'Copy a template\'s areas, positions, team and questions into an existing job.', method: 'POST', path: '/jobs/{id}/apply-template', scope: 'write', input: { id: uuid('Job id'), template_id: uuid('Template id') } }),
  t({ name: 'export_job_csv', title: 'Export a job as CSV', description: 'CSV of every item in the job with current answers, same columns as the app export. Returns the CSV text.', method: 'GET', path: '/jobs/{id}/export', scope: 'read', input: { id: uuid('Job id') }, text: true, readOnly: true }),

  // ── Locations ────────────────────────────────────────────────────────────
  t({ name: 'list_job_locations', title: 'Locations in a job', description: 'Areas and positions in a job, with a readable path (e.g. "Warehouse B / Rack 3").', method: 'GET', path: '/jobs/{id}/locations', scope: 'read', input: { id: uuid('Job id') }, readOnly: true }),
  t({ name: 'create_location', title: 'Add a location', description: 'Add a location to a job. Set parent_id to nest it inside an area (one level only).', method: 'POST', path: '/jobs/{id}/locations', scope: 'write', input: {
    id: uuid('Job id'), name: z.string().min(1), location_type: z.string().optional().describe('general, area, rack, shelf, trailer… (default general)'),
    description: z.string().optional(), parent_id: uuid('Area to nest inside').optional(),
  } }),
  t({ name: 'get_location', title: 'Location detail', description: 'One location with its parent area.', method: 'GET', path: '/locations/{id}', scope: 'read', input: { id: uuid('Location id') }, readOnly: true }),
  t({ name: 'update_location', title: 'Edit a location', description: 'Rename a location, change its type or description, or move it under another area (parent_id null = top level).', method: 'PATCH', path: '/locations/{id}', scope: 'write', input: {
    id: uuid('Location id'), name: z.string().optional(), location_type: z.string().optional(), description: z.string().optional(), parent_id: z.string().uuid().nullable().optional(),
  }, idempotent: true }),
  t({ name: 'delete_location', title: 'Delete a location', description: 'Delete a location. Refused while items are at it or positions are nested in it.', method: 'DELETE', path: '/locations/{id}', scope: 'write', input: { id: uuid('Location id') }, destructive: true }),

  // ── Team ─────────────────────────────────────────────────────────────────
  t({ name: 'list_job_team', title: 'Team on a job', description: 'Team member records on a job (name, role, contact, optional linked login).', method: 'GET', path: '/jobs/{id}/team', scope: 'read', input: { id: uuid('Job id') }, readOnly: true }),
  t({ name: 'add_team_member', title: 'Add a team member', description: 'Add a team member record to a job.', method: 'POST', path: '/jobs/{id}/team', scope: 'write', input: {
    id: uuid('Job id'), name: z.string().min(1), role: z.string().min(1), email: z.string().optional(), phone: z.string().optional(), user_id: uuid('Workspace login to link').optional(),
  } }),
  t({ name: 'update_team_member', title: 'Edit a team member', description: 'Edit a team member record.', method: 'PATCH', path: '/team/{id}', scope: 'write', input: {
    id: uuid('Team member id'), name: z.string().optional(), role: z.string().optional(), email: z.string().optional(), phone: z.string().optional(), user_id: z.string().uuid().nullable().optional(),
  }, idempotent: true }),
  t({ name: 'remove_team_member', title: 'Remove a team member', description: 'Remove a team member record from a job.', method: 'DELETE', path: '/team/{id}', scope: 'write', input: { id: uuid('Team member id') }, destructive: true }),

  // ── Questions ────────────────────────────────────────────────────────────
  t({ name: 'list_job_questions', title: 'Questions on a job', description: 'Process questions for a job, in display order. include_global=false hides workspace-wide questions.', method: 'GET', path: '/jobs/{id}/questions', scope: 'read', input: { id: uuid('Job id'), include_global: z.boolean().optional() }, query: ['include_global'], readOnly: true }),
  t({ name: 'create_question', title: 'Add a question', description: 'Add a process question to a job. Use stage_id to ask it at one stage, location_id to ask it only while the item is at that location or inside that area.', method: 'POST', path: '/jobs/{id}/questions', scope: 'write', input: {
    id: uuid('Job id'), ...questionFields, location_id: z.string().uuid().nullable().optional().describe('Ask only at this location/area'),
  } }),
  t({ name: 'get_question', title: 'Question detail', description: 'One process question.', method: 'GET', path: '/questions/{id}', scope: 'read', input: { id: uuid('Question id') }, readOnly: true }),
  t({ name: 'update_question', title: 'Edit a question', description: 'Edit a process question.', method: 'PATCH', path: '/questions/{id}', scope: 'write', input: {
    id: uuid('Question id'), question_text: z.string().optional(), question_type: questionType.optional(), options: z.array(z.string()).optional(),
    is_required: z.boolean().optional(), allow_na: z.boolean().optional(), display_order: z.number().int().optional(),
    stage_id: stageId.nullable().optional(), location_id: z.string().uuid().nullable().optional(),
  }, idempotent: true }),
  t({ name: 'delete_question', title: 'Delete a question', description: 'Delete a process question. Existing answers are kept for history.', method: 'DELETE', path: '/questions/{id}', scope: 'write', input: { id: uuid('Question id') }, destructive: true }),
  t({ name: 'reorder_job_questions', title: 'Reorder questions', description: 'Set the display order of a job\'s questions: pass every question id in the desired order.', method: 'PUT', path: '/jobs/{id}/questions/order', scope: 'write', input: { id: uuid('Job id'), ids: z.array(z.string().uuid()).min(1) }, idempotent: true }),

  // ── Templates ────────────────────────────────────────────────────────────
  t({ name: 'list_templates', title: 'Job templates', description: 'Job templates (reusable sets of locations, team and questions).', method: 'GET', path: '/templates', scope: 'read', input: { include_inactive: z.boolean().optional() }, query: ['include_inactive'], readOnly: true }),
  t({ name: 'get_template', title: 'Template detail', description: 'A template with its locations, team and questions.', method: 'GET', path: '/templates/{id}', scope: 'read', input: { id: uuid('Template id') }, readOnly: true }),
  t({ name: 'create_template', title: 'Create a template', description: 'Create an empty job template; then add locations, team and questions to it.', method: 'POST', path: '/templates', scope: 'write', input: { name: z.string().min(1), description: z.string().optional() } }),
  t({ name: 'update_template', title: 'Edit a template', description: 'Rename, describe or deactivate a template.', method: 'PATCH', path: '/templates/{id}', scope: 'write', input: { id: uuid('Template id'), name: z.string().optional(), description: z.string().optional(), is_active: z.boolean().optional() }, idempotent: true }),
  t({ name: 'delete_template', title: 'Delete a template', description: 'Delete a template and its rows. Jobs already created from it are unaffected.', method: 'DELETE', path: '/templates/{id}', scope: 'write', input: { id: uuid('Template id') }, destructive: true }),
  t({ name: 'add_template_location', title: 'Add a template location', description: 'Add a location to a template; parent_id nests it in a template area.', method: 'POST', path: '/templates/{id}/locations', scope: 'write', input: {
    id: uuid('Template id'), name: z.string().min(1), location_type: z.string().optional(), description: z.string().optional(), parent_id: uuid('Template area').optional(),
  } }),
  t({ name: 'update_template_location', title: 'Edit a template location', description: 'Edit a template location.', method: 'PATCH', path: '/template-locations/{id}', scope: 'write', input: {
    id: uuid('Template location id'), name: z.string().optional(), location_type: z.string().optional(), description: z.string().optional(), parent_id: z.string().uuid().nullable().optional(),
  }, idempotent: true }),
  t({ name: 'delete_template_location', title: 'Delete a template location', description: 'Delete a template location.', method: 'DELETE', path: '/template-locations/{id}', scope: 'write', input: { id: uuid('Template location id') }, destructive: true }),
  t({ name: 'add_template_team_member', title: 'Add a template team member', description: 'Add a team member to a template.', method: 'POST', path: '/templates/{id}/team', scope: 'write', input: {
    id: uuid('Template id'), name: z.string().min(1), role: z.string().min(1), email: z.string().optional(), phone: z.string().optional(),
  } }),
  t({ name: 'update_template_team_member', title: 'Edit a template team member', description: 'Edit a template team member.', method: 'PATCH', path: '/template-team/{id}', scope: 'write', input: {
    id: uuid('Template team member id'), name: z.string().optional(), role: z.string().optional(), email: z.string().optional(), phone: z.string().optional(),
  }, idempotent: true }),
  t({ name: 'delete_template_team_member', title: 'Delete a template team member', description: 'Delete a template team member.', method: 'DELETE', path: '/template-team/{id}', scope: 'write', input: { id: uuid('Template team member id') }, destructive: true }),
  t({ name: 'add_template_question', title: 'Add a template question', description: 'Add a question to a template; template_location_id scopes it to a template location.', method: 'POST', path: '/templates/{id}/questions', scope: 'write', input: {
    id: uuid('Template id'), ...questionFields, template_location_id: z.string().uuid().nullable().optional(),
  } }),
  t({ name: 'update_template_question', title: 'Edit a template question', description: 'Edit a template question.', method: 'PATCH', path: '/template-questions/{id}', scope: 'write', input: {
    id: uuid('Template question id'), question_text: z.string().optional(), question_type: questionType.optional(), options: z.array(z.string()).optional(),
    is_required: z.boolean().optional(), allow_na: z.boolean().optional(), display_order: z.number().int().optional(),
    stage_id: stageId.nullable().optional(), template_location_id: z.string().uuid().nullable().optional(),
  }, idempotent: true }),
  t({ name: 'delete_template_question', title: 'Delete a template question', description: 'Delete a template question.', method: 'DELETE', path: '/template-questions/{id}', scope: 'write', input: { id: uuid('Template question id') }, destructive: true }),

  // ── Items ────────────────────────────────────────────────────────────────
  t({ name: 'list_items', title: 'Items', description: 'List items across the workspace or in one job, with filters. Each item includes its stage, job, location path and photo count.', method: 'GET', path: '/items', scope: 'read', input: {
    job_id: uuid('Job id').optional(), stage: stageId.optional().describe('Current stage 1-4'), disposition: z.string().optional(),
    location_id: uuid('At this location').optional(), search: z.string().optional().describe('Serial or model contains'),
    created_after: z.string().datetime().optional(), created_before: z.string().datetime().optional(), updated_after: z.string().datetime().optional(),
    ...paging,
  }, query: ['job_id', 'stage', 'disposition', 'location_id', 'search', 'created_after', 'created_before', 'updated_after', 'limit', 'offset'], readOnly: true }),
  t({ name: 'get_item', title: 'Item detail', description: 'One item with stage, job, location path, assignment, disposition and photo counts.', method: 'GET', path: '/items/{id}', scope: 'read', input: { id: uuid('Item id') }, readOnly: true }),
  t({ name: 'create_item', title: 'Create an item', description: 'Create an item in a job. Omit serial_number to take the next number from the job\'s serial settings.', method: 'POST', path: '/items', scope: 'write', input: {
    job_id: uuid('Job id'), serial_number: z.string().optional(), model_number: z.string().optional(), location_id: uuid('Starting location').optional(),
    assigned_to: uuid('Team member id').optional(), notes: z.string().optional(), make: z.string().optional(), media_type: z.string().optional(),
    capacity: z.string().optional(), lot_quantity: z.number().int().optional(),
  } }),
  t({ name: 'update_item', title: 'Update an item', description: 'Edit item fields. Stage changes go through advance_item and location changes through move_item.', method: 'PATCH', path: '/items/{id}', scope: 'write', input: {
    id: uuid('Item id'), serial_number: z.string().optional(), model_number: z.string().optional(), notes: z.string().optional(),
    assigned_to: z.string().uuid().nullable().optional(), disposition: z.string().nullable().optional(), status: z.string().optional(),
    make: z.string().optional(), media_type: z.string().optional(), capacity: z.string().optional(), lot_quantity: z.number().int().optional(),
  }, idempotent: true }),
  t({ name: 'delete_item', title: 'Delete an item', description: 'Delete an item and its photos. Owner or admin only. Cannot be undone.', method: 'DELETE', path: '/items/{id}', scope: 'write', input: { id: uuid('Item id') }, destructive: true }),
  t({ name: 'advance_item', title: 'Advance to the next stage', description: 'Move an item to the next stage. The workspace\'s gates apply: required questions, photo minimums, disposition rule. A refusal explains exactly what is missing.', method: 'POST', path: '/items/{id}/advance', scope: 'write', input: { id: uuid('Item id') } }),
  t({ name: 'move_item', title: 'Move to a location', description: 'Move an item to another location in the same job, logging who, when, notes and an optional photo. Refused while a required location-bound question is unanswered.', method: 'POST', path: '/items/{id}/move', scope: 'write', input: {
    id: uuid('Item id'), location_id: uuid('Destination location'), notes: z.string().optional(), photo_id: uuid('Existing photo of this item').optional(),
  } }),
  t({ name: 'set_item_disposition', title: 'Set disposition', description: 'Record or change an item\'s disposition (must be an active disposition value; null clears it).', method: 'POST', path: '/items/{id}/disposition', scope: 'write', input: { id: uuid('Item id'), disposition: z.string().nullable() }, idempotent: true }),
  t({ name: 'get_item_history', title: 'Item history', description: 'Stage transitions and location moves for an item, oldest first, with who and when.', method: 'GET', path: '/items/{id}/history', scope: 'read', input: { id: uuid('Item id') }, readOnly: true }),
  t({ name: 'get_item_questions', title: 'Open questions for an item', description: 'Questions that apply to the item right now (its stage and location) with current answers and a pending flag. all=true lists every question in the job.', method: 'GET', path: '/items/{id}/questions', scope: 'read', input: { id: uuid('Item id'), all: z.boolean().optional() }, query: ['all'], readOnly: true }),
  t({ name: 'answer_item_questions', title: 'Answer questions', description: 'Answer one or more questions for an item. A changed answer supersedes the previous one (history is kept). Use "N/A" where the question allows it.', method: 'PUT', path: '/items/{id}/answers', scope: 'write', input: {
    id: uuid('Item id'), answers: z.array(z.object({ question_id: z.string().uuid(), value: answerValue })).min(1),
  }, idempotent: true }),
  t({ name: 'list_item_photos', title: 'Item photos', description: 'Photos of an item with signed URLs valid for one hour. Filter by stage or question_id.', method: 'GET', path: '/items/{id}/photos', scope: 'read', input: { id: uuid('Item id'), stage: stageId.optional(), question_id: uuid('Photo-type question').optional() }, query: ['stage', 'question_id'], readOnly: true }),
  t({ name: 'upload_item_photo', title: 'Upload a photo', description: 'Upload a JPEG, PNG or WebP (≤10 MB) for an item as a data URI or raw base64. Defaults to the item\'s current stage.', method: 'POST', path: '/items/{id}/photos', scope: 'write', input: {
    id: uuid('Item id'), image_base64: z.string().min(1), stage_id: stageId.optional(), question_id: uuid('Photo-type question').optional(), captured_at: z.string().datetime().optional(),
  } }),
  t({ name: 'get_photo', title: 'Photo detail', description: 'One photo with a fresh signed URL.', method: 'GET', path: '/photos/{id}', scope: 'read', input: { id: uuid('Photo id') }, readOnly: true }),
  t({ name: 'delete_photo', title: 'Delete a photo', description: 'Delete a photo and its file.', method: 'DELETE', path: '/photos/{id}', scope: 'write', input: { id: uuid('Photo id') }, destructive: true }),
];

/** Pure: split validated input into path, query and body parts for a tool. */
export function buildRequest(def: ToolDef, input: Record<string, unknown>): { path: string; query: Record<string, string>; body: Record<string, unknown> | undefined } {
  const pathKeys = [...def.path.matchAll(/\{([A-Za-z_]+)\}/g)].map(m => m[1]);
  let path = def.path;
  for (const k of pathKeys) {
    const v = input[k];
    if (v === undefined || v === null) throw new Error(`Missing path parameter "${k}"`);
    path = path.replace(`{${k}}`, encodeURIComponent(String(v)));
  }
  const query: Record<string, string> = {};
  const body: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (pathKeys.includes(k) || v === undefined) continue;
    if (def.query?.includes(k)) query[k] = String(v);
    else body[k] = v;
  }
  const hasBody = !['GET', 'DELETE'].includes(def.method);
  return { path, query, body: hasBody ? body : undefined };
}
