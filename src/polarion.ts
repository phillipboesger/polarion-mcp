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

const require = createRequire(import.meta.url);

/** Optional directory for licensed Polarion PDFs (see sdk/README.md). */
const SDK_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'sdk');

/** Text extracted from a PDF is cut here; whole manuals would swamp the context. */
export const MAX_RESOURCE_TEXT = 200_000;

/** Read before anything else; also the server's `instructions`. */
export const SERVER_INSTRUCTIONS = `Polarion ALM over its REST API. Every call runs as the signed-in Polarion user with that user's permissions.

- Start with getProjects to find a projectId. Work Item, Document and Test Run tools are project-scoped; getAllWorkItems searches across projects.
- Search with the \`query\` parameter (Lucene syntax, e.g. \`type:requirement AND status:open\`). See polarion://guide/query-syntax.
- Lists are paged: page_size_ (max 100) and page_number_ (1-based). Follow links.next until it is absent; meta.totalCount gives the total.
- Ask for fewer fields with \`fields\`, e.g. {"workitems": "id,title,status"}, and expand relations with \`include\`, e.g. "author,assignee".
- IDs in request bodies are composite: "PROJECT/WI-123" for Work Items. Path parameters take the plain parts.
- Writes take a JSON:API body ({"data": ...}); see polarion://guide/writing. Every write tool accepts dry_run: true to validate and preview without writing.
- Status changes go through workflowAction on patchWorkItem; list the allowed ones with getWorkflowActionsForWorkItem.
- Rich text fields (description) are {"type": "text/html", "value": "<p>...</p>"}; responses add a value_markdown copy for reading.`;

interface Guide {
  name: string;
  description: string;
  text: string;
}

const GUIDES: Record<string, Guide> = {
  'polarion://guide/query-syntax': {
    name: 'Polarion query syntax',
    description: 'Lucene query syntax for the `query` parameter of getWorkItems, getAllWorkItems, getDocuments and other list tools',
    text: `# Polarion query syntax (Lucene)

Pass the query as the \`query\` parameter of a list tool (getWorkItems, getAllWorkItems, getTestRuns, ...).

| Need | Query |
|---|---|
| Field equals | \`type:requirement\`, \`status:open\` |
| Several values | \`status:(open OR inprogress)\` |
| Combine | \`type:defect AND severity:critical\`, \`NOT status:closed\` |
| Text in title | \`title:brake*\` (wildcard), \`title:"emergency brake"\` (phrase) |
| Full text | \`brake pedal\` (searches all indexed text) |
| Assignee / author | \`assignee.id:jdoe\`, \`author.id:jdoe\` |
| Date range | \`created:[20240101 TO 20241231]\`, \`updated:[$today-7d$ TO $today$]\` |
| Has a value | \`HAS_VALUE:resolution\`, \`NOT HAS_VALUE:assignee\` |
| One project (cross-project tools) | \`project.id:drivepilot\` |
| Linked to | \`linkedWorkItems:DP-123\` |
| Custom field | \`myCustomField:value\` (the field id, not its label) |

Notes:
- Field values are ids, not labels: use the enumeration option id (\`inprogress\`), not "In Progress". getAvailableEnumOptionsForWorkItemType lists them.
- An unknown field name does not fail; it just matches nothing. If a query returns nothing, check the field ids with getProjectFieldsMetadata.
- Sort with \`sort\`, e.g. \`-updated\` (newest first) or \`id\`.`,
  },
  'polarion://guide/writing': {
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
  "priority": "high",
  "myCustomField": "value"
}, "relationships": {
  "assignee": {"data": [{"type": "users", "id": "jdoe"}]}
}}]}
\`\`\`
\`data\` is always a list; several items can be created at once. Custom fields go into \`attributes\` by field id.

## Update one Work Item (patchWorkItem)
\`\`\`json
{"data": {"type": "workitems", "id": "PROJECT/WI-123", "attributes": {"title": "New title"}}}
\`\`\`
Send only the fields that change. The \`id\` is the composite "PROJECT/WI-123".
Relationships in a PATCH replace the whole set: to add an assignee, send the existing ones too.

## Change status
Use patchWorkItem's \`workflowAction\` parameter with an action id from getWorkflowActionsForWorkItem (use \`nativeActionId\`, e.g. "activate"), together with a body (it may carry no attributes).

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
- The response has \`links.next\` while more pages exist, and \`meta.totalCount\`.
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

/** @returns The guides, plus each SDK PDF present in sdk/. */
export function listPolarionResources(): Resource[] {
  const guides = Object.entries(GUIDES).map(([uri, guide]) => ({ uri, name: guide.name, description: guide.description, mimeType: 'text/markdown' }));
  const pdfs = Object.entries(LOCAL_PDFS)
    .filter(([, pdf]) => fs.existsSync(path.join(SDK_DIR, pdf.file)))
    .map(([uri, pdf]) => ({ uri, name: pdf.name, description: `Text of the local ${pdf.file}`, mimeType: 'text/plain' }));
  return [...guides, ...pdfs];
}

/**
 * @param uri - A URI from {@link listPolarionResources}.
 * @returns The resource as text.
 * @throws Error for an unknown URI or a missing PDF.
 */
export async function readPolarionResource(uri: string) {
  const guide = GUIDES[uri];
  if (guide) return { contents: [{ uri, mimeType: 'text/markdown', text: guide.text }] };

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

/** @returns The prompt templates. */
export function getPolarionPrompts() {
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
  ];
}

/**
 * @param name - Prompt name.
 * @param args - Prompt arguments.
 * @returns The prompt's messages.
 * @throws Error for an unknown prompt or a missing argument.
 */
export function getPolarionPrompt(name: string, args?: Record<string, unknown>) {
  const required = (key: string): string => {
    const value = args?.[key];
    if (typeof value !== 'string' || !value) throw new Error(`${key} argument is required`);
    return value;
  };
  const prompt = (description: string, text: string) => ({
    description,
    messages: [{ role: 'user' as const, content: { type: 'text' as const, text } }],
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
3. If links.next is present, tell me meta.totalCount and ask before fetching more pages.
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

  throw new Error(`Unknown prompt: ${name}`);
}
