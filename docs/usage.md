# Usage

## Local setup

Install dependencies, configure the Polarion connection, then build:

```bash
npm ci
cp .env.example .env
# Set API_BASE_URL and BEARER_TOKEN for local stdio or REST mode.
npm run build
```

See [configuration.md](./configuration.md) for environment variables and authentication details.

## MCP over stdio

Run `node build/index.js` directly when connecting a local MCP client. Configure the client to launch that entry point with its environment. `npm start` is also available, but npm lifecycle output may interfere with clients that require clean stdout. Stdio MCP exposes tools, resources, and prompts.

## MCP over Streamable HTTP

Start with `npm run start:mcp-http`. The MCP endpoint is `/mcp`; `/health` is unauthenticated. Each MCP request must carry the caller's Polarion PAT as a Bearer token, or an access token from the optional OAuth login. Sessions are held in memory and bound to the caller's token. OAuth metadata and login routes are enabled when `MCP_PUBLIC_URL` and the required secret configuration are set. See [configuration.md](./configuration.md) and [security.md](./security.md).

The HTTP MCP transport supports toolsets. `MCP_TOOLSETS` limits the deployment's available domains; clients may further narrow a request with the supported toolset selectors. `MCP_READ_ONLY` restricts the available tools to read-only operations.

## REST HTTP mode

Start with `npm run start:http`. Set `HTTP_API_KEY`; requests use that key to access `/api/tools` and `/api/tools/:toolName`. The wrapper also serves `/health`, `/openapi.json`, and `/openapi-gpt.json`. The latter is generated from the curated subset in `src/gpt-tools.ts`. Tool calls accept either a direct argument object or an `arguments` wrapper.

## Tool calls and results

The generated map in `src/tools.ts` contains 284 tools. Use `GET /api/tools` or MCP `tools/list` to discover the enabled set. For field metadata, use `getProjectFieldsMetadata` or a resource-specific `getFieldsMetadataFor…` tool. For enumeration options, use the corresponding `getAvailableEnumOptionsFor…` tool, such as `getAvailableEnumOptionsForWorkItemType`.

Mutating tools accept `dry_run: true`. This validates and prepares the request, then returns a preview without sending it to Polarion. The preview is normal text and, when the tool declares an output schema, structured content. Read-only tools do not preview; `dry_run` is ignored for them. Unknown arguments are rejected, except names beginning with `_`, which are reserved client metadata.

`MCP_MAX_RESPONSE_CHARS` sets the maximum text content length for tool responses; the default is 100,000 characters. The text representation may be truncated, while `structuredContent` remains complete. See [configuration.md](./configuration.md) for the setting.

Read tools accept `response_format: "concise" | "detailed"`. It defaults to `detailed`, which preserves the complete response. `concise` drops rich-text HTML when a `value_markdown` sibling exists, removes JSON:API links and metadata except `links.next` and `meta.totalCount`, and applies a small default sparse fieldset to large list tools when `fields` is omitted. Any caller-supplied `fields` value is preserved. Successful responses add `value_markdown` for HTML rich-text fields. Write guards fail closed when supported enum, custom-field key, or Work Item user-reference validation cannot confirm a value. See [Features](./features.md) for coverage details.

## Composite tools

The `composites` toolset adds higher-level tools that call existing Polarion REST operations through the normal executor. Select it with `MCP_TOOLSETS=composites` or a request toolset selector. `MCP_READ_ONLY=true` exposes the read-only trace and LiveDoc tools but blocks `run_job_and_wait`.

- `run_job_and_wait` accepts the `executeJob` `requestBody`, then polls `getJob` with a 1 to 5 second backoff. `max_wait_seconds` defaults to 120 and is capped at 600; `log_tail_chars` defaults to 4000 and is capped at 20000. Job factory IDs can represent different operations, so the tool is conservatively marked destructive. Cancelling the MCP request stops polling; it does not cancel the Polarion job.
- `trace_links` performs a cycle-safe breadth-first traversal. `direction` is `up`, `down`, or `both`; `roles` filters link roles; `depth` defaults to 3 and is capped at 6; `node_cap` defaults to 200 and is capped at 1000. At most four REST operations are in flight at once. The result includes nodes, edges, and a `truncated` flag.
- `read_document_markdown`, `get_document_outline`, and `read_document_section` read LiveDoc parts in order and render rich text with the same Markdown helper used by normal tool responses. Section lookup accepts a heading path (an array, or a string separated by ` > `) or a part ID. `max_chars` defaults to 20000 and is capped at 100000.

When a client sends `_meta.progressToken`, `run_job_and_wait` emits MCP progress notifications. Without a progress token, it emits none.

The `composites` toolset includes `search_work_items` for structured Work Item filters. It returns the generated Lucene query along with the results. `lint_query` checks a Lucene query for unknown fields, unbalanced quotes or parentheses, and suspicious boolean operators without executing it. Project field metadata is cached briefly when available; otherwise the tools use common Work Item fields.

`resolve_polarion_url` recognizes same-host Polarion work item, LiveDoc, wiki page, test run, and plan URLs. It returns the parsed entity identifiers; pass `fetch: true` to retrieve the matching resource through its REST tool. URLs on another host or with an unsupported shape are rejected.

## Quality checks

Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:coverage`, `npm run test:mutation`, `npm run test:e2e`, `npm run check:docs`, and `npm run check:package` as applicable. See [quality/e2e.md](./quality/e2e.md), [quality/mutation-baseline.md](./quality/mutation-baseline.md), [quality/sonar.md](./quality/sonar.md), and [quality/distribution.md](./quality/distribution.md).
