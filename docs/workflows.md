# Workflows

## Local setup

1. Install dependencies with `npm ci`.
2. Configure `API_BASE_URL` and the authentication required by the selected transport. See [configuration.md](./configuration.md).
3. Build with `npm run build`.
4. Start stdio MCP with `node build/index.js`, Streamable HTTP with `npm run start:mcp-http`, or the REST wrapper with `npm run start:http`.

## MCP tool call

1. The client initializes and discovers enabled tools, resources, and prompts.
2. The server validates arguments and applies configured tool filters.
3. The executor runs supported write guards, authentication, request pacing, and retries.
4. The response includes text and, where declared, structured content. Text responses are subject to `MCP_MAX_RESPONSE_CHARS`.

## HTTP tool call

1. The REST wrapper authenticates the request with `HTTP_API_KEY`, or Streamable HTTP MCP authenticates with the caller's Polarion token or OAuth access token.
2. The client discovers the enabled tools from `/api/tools` or an OpenAPI document.
3. The server validates and executes the named tool through the shared executor.
4. The REST wrapper returns JSON; Streamable HTTP uses MCP responses.

## Regeneration

Run `npm run regenerate` to download the selected OpenAPI spec, patch sparse fields, generate and enrich `src/tools.ts`, build, and run tests. Review the generated diff and verify representative operations. See [openapi-and-generation.md](./openapi-and-generation.md).

## Quality gate

Use `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:coverage`, `npm run test:mutation`, `npm run test:e2e`, `npm run check:docs`, and `npm run check:package` as appropriate. Details are in [quality/e2e.md](./quality/e2e.md), [quality/mutation-baseline.md](./quality/mutation-baseline.md), [quality/static-analysis.md](./quality/static-analysis.md), and [quality/distribution.md](./quality/distribution.md).
