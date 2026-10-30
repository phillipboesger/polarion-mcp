/**
 * Polarion resources, prompts and server instructions.
 *
 * Resources are short, offline guides to what a model needs most and cannot
 * read off the tool list: Polarion's query syntax, the JSON:API shapes of
 * writes, and paging/sparse fields. Polarion SDK PDFs a deployment drops into
 * `sdk/` are listed too, but only when they are actually there.
 *
 * Nothing here calls the network: a resource read must never depend on a
 * third-party host or flood a stdio session with megabytes.
 */

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import type { Resource } from '@modelcontextprotocol/sdk/types.js';
import { toolDefinitionMap } from './tools.js';
import { enabledTools } from './tool-filter.js';

const require = createRequire(import.meta.url);

/** Optional directory for licensed Polarion PDFs (see sdk/README.md). */
const SDK_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'sdk');

/** Text extracted from a PDF is cut here; whole manuals would swamp the context. */
export const MAX_RESOURCE_TEXT = 200_000;


/** Names of the tools this deployment exposes; guidance must not point at the others. */
type EnabledTools = ReadonlySet<string>;
const ENABLED: EnabledTools = new Set(enabledTools.keys());

/** @returns Whether any exposed tool writes (not annotated read-only). */
function hasWriteTools(enabled: EnabledTools): boolean {
  return [...enabled].some(name => toolDefinitionMap.get(name)?.annotations?.readOnlyHint !== true);
}

/**
 * @param text - Guidance text.
 * @param enabled - The exposed tools.
 * @returns Whether it names a tool that exists but is not exposed.
 */
function namesDisabledTool(text: string, enabled: EnabledTools): boolean {
  return [...text.matchAll(/\b[a-z]+(?:[A-Z][a-z0-9]*)+\b/g)].some(([name]) => toolDefinitionMap.has(name) && !enabled.has(name));
}

/**
 * Drops what points a model at a tool the deployment filtered out
 * (`MCP_TOOLS`, `MCP_READ_ONLY`): every line naming one, and the whole
 * section under a "##" heading that names one.
 *
 * @param text - Markdown guidance.
 * @param enabled - The exposed tools.
 * @returns The text without those lines.
 */
export function pruneDisabledTools(text: string, enabled: EnabledTools): string {
  let skipSection = false;
  return text.split('\n').filter(line => {
    if (/^##\s/.test(line)) skipSection = namesDisabledTool(line, enabled);
    return !skipSection && !namesDisabledTool(line, enabled);
  }).join('\n');
}

/** Read before anything else; also the server's `instructions`. */
const INSTRUCTION_LINES: { text: string; needsWrite?: boolean }[] = [
  { text: `- Identity: call getCurrentUser for the signed-in user. A 403 there means this token cannot read that endpoint, not that login failed. A 404 means this Polarion release (2506) has no /user endpoint; the login still worked, use the other tools.` },
  { text: `- Known project: call getProject with its projectId. Work Item, Document and Test Run tools are project-scoped.` },
  { text: `- Unknown project ID: ask the user for it. getProjects lists projects only for users with global read access.` },
  { text: `- getAllWorkItems searches Work Items across projects.` },
  { text: `- Search with the \`query\` parameter (Lucene syntax, e.g. \`type:requirement AND status:open\`). See polarion://guide/query-syntax.` },
  { text: `- Lists are paged: page_size_ (usually at most 100) and page_number_ (1-based). Follow links.next until it is absent; meta.totalCount gives the total when there is more than one page.` },
  { text: `- Ask for fewer fields with \`fields\`, e.g. {"workitems": "id,title,status"}, and expand relations with \`include\`, e.g. "author,assignee".` },
  { text: `- IDs in request bodies are composite: "PROJECT/WI-123" for Work Items. Path parameters take the plain parts.` },
  { text: `- Writes take a JSON:API body ({"data": ...}); see polarion://guide/writing. Every write tool accepts dry_run: true to validate and preview without writing.`, needsWrite: true },
  { text: `- Status changes go through workflowAction on patchWorkItem; list the allowed ones with getWorkflowActionsForWorkItem.`, needsWrite: true },
  { text: `- Rich text fields (description) are {"type": "text/html", "value": "<p>...</p>"}; responses add a value_markdown copy for reading.` },
];

/**
 * @param enabled - The exposed tools.
 * @returns The server's `instructions`, without lines about tools the deployment removed.
 */
export function serverInstructions(enabled: EnabledTools = ENABLED): string {
  const writes = hasWriteTools(enabled);
  const lines = INSTRUCTION_LINES.filter(line => (writes || !line.needsWrite) && !namesDisabledTool(line.text, enabled)).map(line => line.text);
  return ['Polarion ALM over its REST API. Every call runs as the signed-in Polarion user with that user\'s permissions.', '', ...lines].join('\n');
}

/** Read before anything else; also the server's `instructions`. */
export const SERVER_INSTRUCTIONS = serverInstructions();

interface Guide {
  name: string;
  description: string;
  text: string;
  /** Only useful when the deployment exposes tools that write. */
  needsWrite?: boolean;
}

const GUIDES: Record<string, Guide> = {
  'polarion://guide/query-syntax': {
    name: 'Polarion query syntax',
    description: 'Lucene query syntax for the `query` parameter of the list tools',
    text: `# Polarion query syntax (Lucene)

Pass the query as the \`query\` parameter of a list tool.

| Need | Query |
|---|---|
| Field equals | \`type:requirement\`, \`status:open\` |
| Several values | \`status:(open OR inprogress)\` |
| Combine | \`type:defect AND severity:critical\`, \`NOT status:closed\` |
| Text in title | \`title:brake*\` (wildcard), \`title:"emergency brake"\` (phrase) |
| Full text | \`brake pedal\` (searches all indexed text) |
| Assignee / author | \`assignee.id:jdoe\`, \`author.id:jdoe\` |
| Date range | \`created:[20240101 TO 20241231]\`, \`updated:[$today-7d$ TO $today$]\` |
| Has a value | \`HAS_VALUE:resolution\`, \`NOT HAS_VALUE:resolution\` (works for fields such as resolution, description, priority; not for assignee) |
| One project (cross-project tools) | \`project.id:drivepilot\` |
| Linked to | \`linkedWorkItems:DP-123\` |
| Custom field | \`myCustomField:value\` (the field id, not its label) |

Notes:
- Field values are ids, not labels: use the enumeration option id (\`inprogress\`), not "In Progress". getAvailableEnumOptionsForWorkItemType lists them.
- An unknown field name does not fail; it just matches nothing. If a query returns nothing, check the field ids with getProjectFieldsMetadata.
- Sort with \`sort\`, e.g. \`-updated\` (newest first; Polarion orders dates by day, so items from the same day may come in any order) or \`id\`.`,
  },
  'polarion://guide/writing': {
    needsWrite: true,
    name: 'Writing Work Items',
    description: 'JSON:API request bodies for creating and updating Work Items, links, comments and status changes',
    text: `# Writing to Polarion (JSON:API bodies)

All write tools take \`requestBody\` with a top-level \`data\`. Run with \`dry_run: true\` first to validate and preview.

## Create Work Items (postWorkItems)
\`\`\`json
{"data": [{"type": "workitems", "attributes": {
  "type": "requirement",
  "title": "Brake pedal response time",
  "description": {"type": "text/html", "value": "<p>The system shall ...</p>"},
  "priority": "<option id>",
  "<customFieldId>": "value"
}, "relationships": {
  "assignee": {"data": [{"type": "users", "id": "<user id>"}]}
}}]}
\`\`\`
\`data\` is always a list; several items can be created at once. Custom fields go into \`attributes\` by field id.
Placeholders: enumeration values are option ids, which are project-specific (priority is often "90.0"-style, not "high"): get them with getAvailableEnumOptionsForWorkItemType; field ids with getProjectFieldsMetadata; user ids with getUsers. The server refuses unknown values, fields and users.

## Update one Work Item (patchWorkItem)
\`\`\`json
{"data": {"type": "workitems", "id": "PROJECT/WI-123", "attributes": {"title": "New title"}}}
\`\`\`
Send only the fields that change. The \`id\` is the composite "PROJECT/WI-123".
To empty a field, send \`null\` for it (for example \`"dueDate": null\`).
Relationships in a PATCH replace the whole set: to add an assignee, send the existing ones too.

## Change status
Use patchWorkItem's \`workflowAction\` parameter with an action id from getWorkflowActionsForWorkItem (use \`nativeActionId\`, e.g. "activate"), together with a body that has at least \`"attributes": {}\` (Polarion refuses a body with neither attributes nor relationships).

## Link two Work Items (postLinkedWorkItems)
\`\`\`json
{"data": [{"type": "linkedworkitems",
  "attributes": {"role": "relates_to"},
  "relationships": {"workItem": {"data": {"type": "workitems", "id": "PROJECT/WI-456"}}}}]}
\`\`\`
Link role ids are project-specific (e.g. relates_to, parent, implements); getLinkedWorkItems on an existing item shows the ones in use.

## Comment (postComments)
\`\`\`json
{"data": [{"type": "workitem_comments", "attributes": {"text": {"type": "text/html", "value": "<p>Looks good.</p>"}}}]}
\`\`\`

## Attachments (postWorkItemAttachments)
\`requestBody\` is a JSON string: \`{"resource": {"data": [{"type": "workitem_attachments", "attributes": {"fileName": "notes.txt"}}]}, "files": ["<base64>"]}\`, one base64 entry per file in the same order.`,
  },
  'polarion://guide/paging-and-fields': {
    name: 'Paging, fields and includes',
    description: 'How to page through lists and keep responses small with sparse fields and includes',
    text: `# Paging, sparse fields and includes

- \`page_size_\`: items per page (Polarion's maximum is usually 100). \`page_number_\`: 1-based page.
- The response has \`links.next\` while more pages exist, and \`meta.totalCount\` (only when the result spans more than one page).
- \`fields\`: which attributes to return, per resource type, e.g. \`{"workitems": "id,title,status,assignee"}\`. \`@basic\` is the default set, \`@all\` returns everything (large).
- \`include\`: expand relationships into \`included\`, e.g. \`author,assignee\`; ask for their fields too, e.g. \`{"workitems": "title,assignee", "users": "name"}\`.
- Ask for small pages with few fields first, then fetch details for the items you need with getWorkItem.`,
  },
};

/** Optional licensed PDFs in sdk/, by resource URI. */
const LOCAL_PDFS: Record<string, { file: string; name: string }> = {
  'polarion://local/admin-user-help': { file: 'Administrator and User Help.pdf', name: 'Polarion Administrator and User Help' },
  'polarion://local/deployment-guide': { file: 'Deployment and Maintenance Guide.pdf', name: 'Polarion Deployment and Maintenance Guide' },
  'polarion://local/feature-matrix': { file: 'Polarion_2506_Feature Matrix.pdf', name: 'Polarion 2506 Feature Matrix' },
  'polarion://local/rest-api-guide': { file: 'REST API User Guide for Polarion.pdf', name: 'REST API User Guide for Polarion' },
  'polarion://local/scripting-guide': { file: 'scripting_guide_and_examples.pdf', name: 'Polarion Scripting Guide and Examples' },
};

/**
 * @param enabled - The exposed tools.
 * @returns The guides this deployment can use, plus each SDK PDF present in sdk/.
 */
export function listPolarionResources(enabled: EnabledTools = ENABLED): Resource[] {
  const writes = hasWriteTools(enabled);
  const guides = Object.entries(GUIDES).filter(([, guide]) => writes || !guide.needsWrite).map(([uri, guide]) => ({ uri, name: guide.name, description: guide.description, mimeType: 'text/markdown' }));
  const pdfs = Object.entries(LOCAL_PDFS)
    .filter(([, pdf]) => fs.existsSync(path.join(SDK_DIR, pdf.file)))
    .map(([uri, pdf]) => ({ uri, name: pdf.name, description: `Text of the local ${pdf.file}`, mimeType: 'text/plain' }));
  return [...guides, ...pdfs];
}

/**
 * @param uri - A URI from {@link listPolarionResources}.
 * @param enabled - The exposed tools.
 * @returns The resource as text.
 * @throws Error for an unknown URI or a missing PDF.
 */
export async function readPolarionResource(uri: string, enabled: EnabledTools = ENABLED) {
  const guide = GUIDES[uri];
  if (guide && (hasWriteTools(enabled) || !guide.needsWrite)) {
    return { contents: [{ uri, mimeType: 'text/markdown', text: pruneDisabledTools(guide.text, enabled) }] };
  }

  const pdf = LOCAL_PDFS[uri];
  if (pdf) {
    const file = path.join(SDK_DIR, pdf.file);
    if (!fs.existsSync(file)) throw new Error(`${pdf.name} is not installed on this server (see sdk/README.md).`);
    const pdfParse = require('pdf-parse');
    const { text } = (await pdfParse(await fs.promises.readFile(file))) as { text: string };
    const truncated = text.length > MAX_RESOURCE_TEXT;
    return {
      contents: [{
        uri,
        mimeType: 'text/plain',
        text: truncated ? `${text.slice(0, MAX_RESOURCE_TEXT)}\n\n[Truncated: ${text.length} characters in total.]` : text,
      }],
    };
  }

  throw new Error(`Unknown resource URI: ${uri}`);
}

/** Tools without which a prompt makes no sense; it is not offered if one is not exposed. */
const PROMPT_CORE_TOOLS: Record<string, string[]> = {
  'create-work-item': ['postWorkItems'],
  'search-work-items': ['getWorkItems'],
  'update-work-item': ['getWorkItem', 'patchWorkItem'],
  'review_requirements': ['getWorkItems', 'getWorkItem', 'getProjectFieldsMetadata'],
  'trace_gap_analysis': ['getWorkItem', 'getLinkedWorkItems'],
  'release_readiness_summary': ['getWorkItems', 'getWorkflowActionsForWorkItem'],
  'test_coverage_report': ['getWorkItems', 'getLinkedWorkItems'],
  'triage_new_work_items': ['getWorkItems', 'getWorkItem', 'getProjectFieldsMetadata'],
};

/**
 * @param enabled - The exposed tools.
 * @returns The prompt templates this deployment can run.
 */
export function getPolarionPrompts(enabled: EnabledTools = ENABLED) {
  return allPrompts().filter(prompt => PROMPT_CORE_TOOLS[prompt.name].every(tool => enabled.has(tool)));
}

/** @returns Every prompt template, whatever tools are exposed. */
function allPrompts() {
  return [
    {
      name: 'create-work-item',
      description: 'Create a Work Item with the project\'s real types, fields and allowed values',
      arguments: [{ name: 'projectId', description: 'The project ID', required: true }],
    },
    {
      name: 'search-work-items',
      description: 'Find Work Items with a Lucene query, paging through the results',
      arguments: [{ name: 'projectId', description: 'The project ID', required: true }],
    },
    {
      name: 'update-work-item',
      description: 'Update a Work Item, including status changes through its workflow',
      arguments: [
        { name: 'projectId', description: 'The project ID', required: true },
        { name: 'workItemId', description: 'The Work Item ID', required: true },
      ],
    },
    ...[
      ['review_requirements', 'Review requirements for clarity, atomicity, and testability', ['projectId', 'workItemId']],
      ['trace_gap_analysis', 'Inspect trace links and identify unlinked or weakly linked requirements', ['projectId', 'workItemId']],
      ['release_readiness_summary', 'Summarize open work and workflow readiness for a release', ['projectId']],
      ['test_coverage_report', 'Report requirement coverage by linked test Work Items', ['projectId']],
      ['triage_new_work_items', 'Triage recent Work Items in a project', ['projectId']],
    ].map(([name, description, required]) => ({
      name: name as string,
      description: description as string,
      arguments: (required as string[]).map(arg => ({ name: arg, description: arg === 'projectId' ? 'Polarion project ID' : 'Work Item ID', required: true })),
    })),
  ];
}

/**
 * @param text - Text whose numbered steps ("1. ...") may have lost some.
 * @returns It with the steps numbered 1, 2, 3 again.
 */
function renumber(text: string): string {
  let step = 0;
  return text.split('\n').map(line => (/^\d+\. /.test(line) ? `${++step}. ${line.replace(/^\d+\. /, '')}` : line)).join('\n');
}

/**
 * @param name - Prompt name.
 * @param args - Prompt arguments.
 * @param enabled - The exposed tools.
 * @returns The prompt's messages, without steps that name a tool the deployment removed.
 * @throws Error for an unknown prompt, one this deployment cannot run, or a missing argument.
 */
export function getPolarionPrompt(name: string, args?: Record<string, unknown>, enabled: EnabledTools = ENABLED) {
  if (PROMPT_CORE_TOOLS[name] && !getPolarionPrompts(enabled).some(prompt => prompt.name === name)) {
    throw new Error(`Prompt ${name} needs tools this server does not expose`);
  }
  const required = (key: string): string => {
    const value = args?.[key];
    if (typeof value !== 'string' || !value) throw new Error(`${key} argument is required`);
    return value;
  };
  const prompt = (description: string, text: string) => ({
    description,
    messages: [{ role: 'user' as const, content: { type: 'text' as const, text: renumber(pruneDisabledTools(text, enabled)) } }],
  });

  if (name === 'create-work-item') {
    const projectId = required('projectId');
    return prompt(`Create a Work Item in project ${projectId}`, `I want to create a Work Item in Polarion project "${projectId}". Please:

1. Call getProjectFieldsMetadata with projectId "${projectId}" and resourceType "workitems" to see the Work Item types and fields. Ask me which type I want if it is unclear.
2. For every enumeration field you intend to set (status, priority, severity, custom enums), call getAvailableEnumOptionsForWorkItemType with that fieldId and the type, and use option ids, not labels.
3. Draft the item and show it to me. Use the body shape from the resource polarion://guide/writing.
4. Call postWorkItems with dry_run: true, fix anything it refuses, then call it again without dry_run.
5. Report the new Work Item's id.`);
  }

  if (name === 'search-work-items') {
    const projectId = required('projectId');
    return prompt(`Search Work Items in project ${projectId}`, `I want to find Work Items in Polarion project "${projectId}". Please:

1. Build a Lucene query from what I describe (syntax: resource polarion://guide/query-syntax). Use field ids and enumeration option ids; check them with getProjectFieldsMetadata or getAvailableEnumOptionsForWorkItemType if unsure.
2. Call getWorkItems with that query, page_size_ 50 and fields {"workitems": "id,title,type,status,assignee"}.
3. If links.next is present, tell me the total (meta.totalCount) and ask before fetching more pages.
4. Show the results as a table: id, title, type, status, assignee.`);
  }

  if (name === 'update-work-item') {
    const projectId = required('projectId');
    const workItemId = required('workItemId');
    return prompt(`Update Work Item ${workItemId} in project ${projectId}`, `I want to update Work Item "${workItemId}" in Polarion project "${projectId}". Please:

1. Call getWorkItem to show me its current state.
2. For a status change, call getWorkflowActionsForWorkItem and use the action's nativeActionId as patchWorkItem's workflowAction.
3. For enumeration fields, check the allowed option ids with getAvailableEnumOptionsForWorkItemType.
4. Call patchWorkItem with only the changed fields (body shape: resource polarion://guide/writing) and dry_run: true, show me the preview, then apply it.
5. Call getWorkItem again and confirm the change.`);
  }

  if (name === 'review_requirements') {
    const projectId = required('projectId'); const workItemId = required('workItemId');
    return prompt(`Review requirement ${workItemId}`, `Review Work Item "${workItemId}" in project "${projectId}". Call getWorkItem and getProjectFieldsMetadata to confirm its type and fields. Assess whether the requirement is atomic, unambiguous, feasible, necessary, and testable (INVEST); rewrite unclear statements in EARS form where appropriate. Identify missing rationale, measurable acceptance criteria, and verification method. Do not modify the item; return findings and a proposed revision.`);
  }
  if (name === 'trace_gap_analysis') {
    const projectId = required('projectId'); const workItemId = required('workItemId');
    return prompt(`Traceability analysis for ${workItemId}`, `Analyze Work Item "${workItemId}" in project "${projectId}". Call getWorkItem and getLinkedWorkItems. Report upstream and downstream links, missing parent or source links, requirements without verification links, suspicious links, and concrete follow-up actions. Do not create or modify links.`);
  }
  if (name === 'release_readiness_summary') {
    const projectId = required('projectId');
    return prompt(`Release readiness for ${projectId}`, `Prepare a release readiness summary for project "${projectId}". Use getWorkItems with a Lucene query to inspect open and blocked requirements, defects, and test Work Items. Use getWorkflowActionsForWorkItem when a specific status transition needs confirmation. Summarize evidence, unresolved blockers, ownership gaps, and decisions needed. State the query and avoid claiming readiness without evidence.`);
  }
  if (name === 'test_coverage_report') {
    const projectId = required('projectId');
    return prompt(`Test coverage for ${projectId}`, `Report test coverage for project "${projectId}". Use getWorkItems to find requirements and test Work Items, then getLinkedWorkItems on relevant requirements. Group requirements by linked test coverage, no link, and ambiguous link. Include the query and list IDs for gaps; do not infer coverage from titles alone.`);
  }
  if (name === 'triage_new_work_items') {
    const projectId = required('projectId');
    return prompt(`Triage new Work Items in ${projectId}`, `Triage newly created Work Items in project "${projectId}". Use getWorkItems with a Lucene query and recent date filter, and getProjectFieldsMetadata to confirm available fields. For each candidate, summarize type, urgency, missing information, duplicates or related items, and a suggested next action. Do not change priority, status, or assignment.`);
  }

  throw new Error(`Unknown prompt: ${name}`);
}
