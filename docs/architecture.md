# Architecture

## Runtime Modes

The application has two runtime modes that share the same execution core:

- MCP stdio mode: src/index.ts registers MCP handlers for tools, resources, and prompts.
- HTTP mode: src/http-server.ts exposes the same tool execution path over Express, and src/index-http.ts is the deployment entry.

## Components

- Configuration layer: src/config.ts loads environment variables, server identity, default API location, and documentation resource metadata.
- MCP transport layer: src/index.ts connects the MCP SDK server to stdio transport and publishes tool, resource, and prompt capabilities.
- HTTP transport layer: src/http-server.ts adds HTTP authentication, health endpoints, tool listing, tool execution, and generated OpenAPI documents.
- Execution layer: src/executor.ts validates arguments, restores original OpenAPI parameter names, applies security, executes HTTP requests, and formats responses.
- Polarion helper layer: src/polarion.ts serves documentation resources, caches project configuration, and provides guided prompts.
- Authentication layer: src/auth.ts performs OAuth2 token acquisition and in-memory token caching for compatible security schemes.
- Utility layer: src/utils.ts sanitizes schemas, looks up mapped arguments, formats Axios failures, and creates runtime Zod validators.
- Generated interface layer: src/tools.ts contains the generated tool definitions from Polarion OpenAPI.
- GPT subset layer: src/gpt-tools.ts defines the constrained tool subset used to generate the Custom GPT OpenAPI document.

## Generated and Handwritten Boundaries

- Handwritten files own transport, auth, validation, resources, prompts, and deployment behavior.
- src/tools.ts is generated and should be replaced by regeneration, not edited manually.
- The rest of the repository is responsible for adapting generated operations to MCP and HTTP client constraints.

## MCP Request Flow

1. MCP client lists tools from src/tools.ts.
2. Input schemas are sanitized to MCP-safe keys.
3. Tool invocation runs through executeApiTool in src/executor.ts.
4. Auth is applied based on OpenAPI security schemes.
5. HTTP request is sent to Polarion REST API.
6. Response is formatted and returned to MCP client.

## HTTP Request Flow

1. HTTP client calls /api/tools or /api/tools/:toolName.
2. Input schemas are sanitized and mapped to original names.
3. The same executor pipeline is reused.
4. Response is returned as JSON with text content.
5. /openapi.json and /openapi-gpt.json expose full and limited specs.

## Supporting Capabilities

- Local SDK PDFs in sdk/ can be exposed as readable documentation for AI clients.
- refresh_polarion_config caches project metadata in memory so assistants can work with project-specific enums and work item types.
- Prompt templates in src/polarion.ts provide higher-level task guidance on top of raw REST operations.

## Schema Sanitization and Validation

- sanitizeInputSchema converts invalid property names (for example, page[size]) to MCP-safe keys.
- A name map preserves original names for API execution.
- JSON Schema is converted to Zod for runtime validation.

## Resources and Project Configuration

- Resources include online docs, local SDK PDFs, database references, and cached project configs.
- refresh_polarion_config fetches and caches project metadata for prompts and validation.

## Operational Constraints

- MCP mode expects the client to manage the server process and environment variables.
- HTTP mode requires an additional HTTP_API_KEY because it exposes a network-accessible interface.
- Bearer token authentication to Polarion is handled by environment variables, not by incoming tool arguments.

## read_when

- Use this guide when understanding request flows or extending server behavior.
