# Usage

## Local Setup

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env` and set `API_BASE_URL` and `BEARER_TOKEN`.
3. Build the server: `npm run build`

## MCP Mode (stdio)

- Run the MCP server with `npm run start` when you want to test it directly.
- In normal use, configure your MCP client to launch build/index.js with the required environment variables.
- MCP mode exposes three capability types:
  - tools for Polarion REST operations,
  - resources for documentation and cached project metadata,
  - prompts for guided workflows.

Typical MCP workflow:

1. Configure the client with API_BASE_URL and BEARER_TOKEN.
2. Restart the MCP client so it discovers the server.
3. Ask the client to list or use tools.
4. For project-specific create or update tasks, call refresh_polarion_config first.

## MCP over HTTP (Streamable HTTP — for Claude.ai)

- Start with `npm run start:mcp-http`.
- This serves the real MCP Streamable HTTP transport (not the REST wrapper below), so remote MCP clients such as Claude.ai custom connectors can use it.
- The server stores no credentials: every `/mcp` request must send the caller's own Polarion Personal Access Token as `Authorization: Bearer <pat>`, and that token authenticates the Polarion REST calls of that request. A request without a Bearer token gets 401; an invalid token is rejected by Polarion.
- With `MCP_PUBLIC_URL` set, that 401 also carries `WWW-Authenticate` with this server's protected-resource metadata, so an MCP client that cannot be handed a token by hand starts the OAuth login instead: it registers itself, the user pastes their Polarion PAT on `/authorize`, and the client receives an opaque access token. The PAT stays in the server's memory (gone on restart) and is never sent to the client.
- Endpoints:
  - GET /health (no auth)
  - POST/GET/DELETE /mcp (Streamable HTTP MCP transport; caller's Polarion PAT, or an access token from the login)
  - /authorize, /token, /register, /revoke, /polarion-login and the `/.well-known/oauth-*` metadata (only with MCP_PUBLIC_URL set)
- Sessions are stateful: the client receives an `mcp-session-id` on initialize and echoes it on later requests.
- Optionally set `MCP_ALLOWED_HOSTS` to enable DNS-rebinding protection for public deployments.

## REST HTTP Mode (for ChatGPT Custom GPTs)

- Start the REST wrapper with `npm run start:http`.
- HTTP_API_KEY must be set or the server exits on startup.
- This is a plain REST surface (not MCP) intended for ChatGPT Custom GPT Actions.
- No OAuth support here: every caller shares the one static `HTTP_API_KEY`. ChatGPT's Action editor offers an OAuth auth type, but this server has no authorization endpoint for it. Per-user OAuth login is only available on the Streamable HTTP MCP transport above (for Claude.ai and other MCP clients), via `MCP_PUBLIC_URL`.
- Endpoints:
  - GET /health
  - GET /api/tools
  - POST /api/tools/:toolName
  - GET /openapi.json
  - GET /openapi-gpt.json

Typical HTTP workflow:

1. Start the server locally or deploy it.
2. Call GET /health to confirm availability.
3. Use GET /api/tools to inspect the available tool surface.
4. Send POST requests to /api/tools/:toolName with either a top-level JSON body or an arguments wrapper.
5. Use /openapi-gpt.json when a client requires a reduced action schema.

## OpenAPI Endpoints

- /openapi.json exposes the full tool set.
- /openapi-gpt.json exposes the essential 30-tool subset defined in src/gpt-tools.ts.

## When to Use Each Mode

- Use stdio MCP mode for local assistant integrations that launch the server as a subprocess (Claude Code, Claude Desktop, VS Code).
- Use the Streamable HTTP MCP mode (`start:mcp-http`) for remote MCP clients that connect by URL, such as Claude.ai custom connectors.
- Use the REST HTTP mode (`start:http`) for ChatGPT Custom GPT Actions, and `/openapi-gpt.json` when the consumer has operation-count limits.

## Request Pacing, Retries, and dry_run

- Every outgoing Polarion request is paced to roughly 3 requests/second and automatically retried with exponential backoff on `429` and `5xx` responses (up to 2 retries), matching Polarion's low burst tolerance. This is transparent — no configuration is required.
- After a successful mutating request (`POST`/`PUT`/`PATCH`/`DELETE`), the server waits an additional ~1.5s before returning, giving Polarion a moment to finish propagating the write before any immediate follow-up call (e.g. a read-back) is sent. This is separate from the general 3 req/s pacing, which applies to reads too.
- Every mutating tool (`POST`/`PUT`/`PATCH`/`DELETE`) accepts an optional `dry_run: true` argument. When set, the tool validates arguments, resolves the URL/auth exactly as it would for a real call, and returns a preview of the request (method, URL, headers with the `Authorization` value redacted, and body — binary/base64 payloads summarized as `<binary, N bytes>` instead of echoed) instead of sending it to Polarion. `dry_run` on a `GET` tool is ignored and the request executes normally, since there's nothing unsafe to preview.
- On tools that declare an `outputSchema`, a `dry_run` preview is returned with `isError: true` — the preview payload is a request description, not the tool's real (schema-conforming) output, and the MCP SDK requires a non-error result from a schema-declaring tool to include `structuredContent`. Read the preview from the text content regardless of that flag; it does not mean the dry run failed.

  ```jsonc
  // Example: preview a work item creation without touching Polarion
  {
    "tool": "postWorkItems",
    "arguments": {
      "projectId": "myproject",
      "requestBody": { "data": [{ "type": "workitems", "attributes": { "title": "Example" } }] },
      "dry_run": true
    }
  }
  ```

- API error messages parse Polarion's actual JSON:API error body (`{errors: [{status, title, detail}]}`) and surface the real `detail`/`title`, instead of a truncated raw JSON dump, whenever the response is shaped that way.

## Pre-write Validation (Guards)

Work Item write tools — `patchWorkItem` (single update), `postWorkItems` (bulk
create), `patchWorkItems` (bulk update, project-scoped), and
`patchAllWorkItems` (bulk update, global) — validate the standard enum fields
they're given (`status`, `severity`, `priority`, `resolution`) against
Polarion's own `getAvailableOptions` action *before* sending the write. An
invalid value is refused locally with the list of valid options, instead of
either failing cryptically server-side or (on field types that don't validate
strictly) silently persisting as an unknown value. For a bulk write, the
first invalid item blocks the entire batch. Lookups are cached in-memory for
~60s per (project, item-or-type, field) to avoid extra round-trips on
repeated edits.

New items (`postWorkItems`) have no existing instance to scope the lookup by,
so options are resolved by the item's `attributes.type` instead; existing
items (`patchWorkItem`/`patchWorkItems`/`patchAllWorkItems`) are resolved by
their actual instance. `patchWorkItems`/`patchAllWorkItems` read the project
straight out of each item's `"PROJECT/WORKITEMID"` id, so this works
correctly even in the global (`patchAllWorkItems`) case with no `projectId`
argument at all.

If the validation lookup itself can't be completed (network error, auth
failure), the write is refused rather than let through — an unvalidated enum
value could otherwise persist as a silent "ghost", invisible in the UI.

Two further checks run after the enum check, same fail-closed principle:

- **Custom field keys** — covers every custom-field-capable resource type
  (Work Items, Documents, Plans, Collections, Test Runs, Test Records), on
  BOTH create and update. Any `attributes` key that isn't a standard field
  for that resource is checked against Polarion's `getFieldsMetadata`
  action, catching a typo'd custom field id before it silently persists as
  an unknown key (Polarion's own REST API accepts and echoes back an
  unregistered attribute key with no error — it just isn't a real,
  registered field, so it won't survive reindexing/export/search). Create
  uses the project- and type-scoped lookup (by the new item's
  `attributes.type`, or type-less for Plans/Collections/Test Records, which
  have no subtype concept); update uses the *instance*-scoped lookup
  against the existing item's own resolved path, which needs no type at
  all — that's what makes update coverage possible without an extra
  "fetch the item first to learn its type" round-trip. Bulk update tools
  (`patchWorkItems`, `patchAllWorkItems`, `patchTestRuns`,
  `patchTestRecords`) resolve each item's own instance path from its
  composite id in the request body.
- **User references** — every user id in `relationships.assignee`/`votes`/
  `watches`, across the 4 Work Item write tools, is checked to actually exist
  via `getUser`. A confirmed-missing user (404) is reported specifically; an
  unresolvable lookup (network/auth error) fails closed like everything else.

**Not yet covered** (contributions welcome):
- `categories` — Polarion exposes no standalone `categories` resource
  endpoint to check existence against.
- `module` (the owning Document) and `linkedRevisions` — checkable in
  principle, not built out yet.
- Custom field *values* (only *keys* are checked).
- User references (`assignee`/`votes`/`watches`) are Work Item-specific; not
  extended to other resource types' relationships.

## Rich Text as Markdown

Every response field shaped like Polarion's rich-text convention
(`{type: "text/html"|"text/plain", value: "..."}` — Work Item descriptions,
Document `homePageContent`, comment text, ...) gets a `value_markdown`
sibling added when `type` is `text/html`, with the HTML converted to
Markdown. The original `value` is never modified, so nothing is lost and a
value read back from a response and echoed into a later write is exactly
what Polarion sent — `value_markdown` is purely an additional, easier-to-read
view.

## Embedding an Attachment Inline in Rich Text

To make an uploaded attachment appear inline as an image inside a Work Item's
`description` or a comment's `text` (not just as a linked attachment at the
bottom), reference it with Polarion's internal `workitemimg:` scheme rather
than a plain URL:

1. Upload the image via `postWorkItemAttachments`. The response's `data[].id`
   is a composite like `"myproject/MYPROJ-1/1-screenshot.png"`.
2. Take the **last path segment** of that id — `1-screenshot.png` — as the
   `<attachment-basename>`.
3. Write `<img src="workitemimg:<attachment-basename>" width="..."
   height="..."/>` into the `description`/comment `text` HTML via
   `patchWorkItem`/`postComments` (`type: "text/html"`).

Polarion's renderer resolves this into a working, session-authenticated URL
on load. Live-verified rendering correctly in both a Work Item description
and a comment.

Do **not** reference the attachment's own REST content URL
(`.../attachments/{id}/content`) as the `<img src>` — that endpoint requires
Bearer auth, which a plain `<img>` tag cannot send, so it never loads for
someone viewing the item in the normal web UI.

## Not Yet Covered

Two items from the comparison against a similar Polarion MCP server remain
open, deliberately not attempted here rather than shipped half-built:

- **A model-driven eval suite** (`evals/`) — testing that an LLM actually
  *chooses* to use `dry_run` or respects a guard's refusal in realistic
  agent scenarios, as opposed to `tests/`'s unit/integration coverage of the
  code paths themselves. This needs a real model in the loop (API calls,
  cost, credentials) and is a deliberate choice to make, not something to
  add silently as a side effect of an unrelated change.
- **Guard coverage beyond the standard Work Item enum fields** — custom
  fields, categories, relationship/link targets, and non-Work-Item
  resources (Documents, Test Runs, Plans, ...) are not validated pre-write.

## read_when

- Use this guide when running the server locally or configuring clients.
