# Architecture

## Transports and execution

Three entry points share the Polarion execution core:

- `src/index.ts`: stdio MCP.
- `src/mcp-http-server.ts`: Streamable HTTP MCP with caller authentication and optional OAuth.
- `src/http-server.ts`: REST wrapper protected by `HTTP_API_KEY`.

`src/server.ts` creates MCP servers; `src/rest-api.ts` defines REST tool routes. Generated MCP calls, composite dependencies and REST routes use `src/tool-execution.ts` for execution and automatic pagination. `src/executor.ts` validates and maps arguments, applies request pacing and retries, runs write guards from `src/guards.ts`, calls Polarion and formats responses.

## Tool surface

`src/tools.ts` is generated from Polarion OpenAPI. `src/tool-filter.ts` and `src/toolsets.ts` control tool availability. `src/gpt-tools.ts` selects operations for the Custom GPT schema. See [generation](openapi-and-generation.md) and [extensions](extensions.md) for maintenance and extension interfaces.

`src/polarion.ts` supplies MCP resources, prompts and server instructions. Authentication is implemented in `src/auth.ts`, `src/oauth.ts` and the HTTP transport.

For response limits, pagination and write validation, see [usage](usage.md), [features](features.md) and [security](security.md).
