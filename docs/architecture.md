# Architecture

## Runtime modes

The repository has three transports over a shared execution core:

- **stdio MCP**: `src/index.ts` creates the MCP server and connects it to stdio for local clients.
- **Streamable HTTP MCP**: `src/mcp-http-server.ts` serves MCP at `/mcp`, with per-caller authenticated sessions and optional OAuth.
- **REST HTTP**: `src/http-server.ts` exposes tool listing and execution for HTTP clients, protected by `HTTP_API_KEY`.

`src/server.ts` creates the shared MCP server. `src/rest-api.ts` supplies REST tool routes. `src/executor.ts` validates and maps arguments, applies request pacing and retries, runs write guards, calls Polarion, converts rich text, and formats results. `src/httpClient.ts`, `src/auth.ts`, and `src/oauth.ts` implement HTTP requests and authentication flows.

## Tool definitions and filtering

`src/tools.ts` is generated from Polarion OpenAPI and currently defines 284 tools. Do not edit it by hand. `src/tool-filter.ts` applies configured tool filters; `src/toolsets.ts` classifies tools into named domains. The MCP HTTP transport supports deployment-wide toolset limits and per-request selectors. Read-only filtering is also available.

The Custom GPT OpenAPI document is derived from `src/gpt-tools.ts`, a curated subset of the complete generated tool map.

## MCP execution flow

1. The client initializes the MCP connection and discovers enabled tools, resources, and prompts.
2. Input schemas are sanitized to MCP-compatible property names; a name map restores original Polarion parameter names for requests.
3. `src/executor.ts` validates arguments, performs applicable pre-write checks, applies the OpenAPI security scheme, and sends the request.
4. Results include text content and, for tools with an output schema, structured content. Text is capped by `MCP_MAX_RESPONSE_CHARS` (default 100,000 characters); structured content is not truncated.

## Resources and validation

`src/polarion.ts` provides server instructions, offline guides, optional local SDK PDF resources, and workflow prompts. Write guards in `src/guards.ts` validate supported enumeration values, custom-field keys, and Work Item user references before dispatch. Rich HTML fields gain a `value_markdown` sibling while preserving the original value.

## Generation boundary

Regeneration updates `src/tools.ts`; transport, execution, filtering, resources, and prompts are handwritten. See [OpenAPI and generation](./openapi-and-generation.md) for the pipeline.
