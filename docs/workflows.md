# Workflows

## Local Onboarding Workflow

1. Install dependencies with npm.
2. Copy .env.example to .env.
3. Set API_BASE_URL and BEARER_TOKEN.
4. Add HTTP_API_KEY only if you plan to use HTTP mode.
5. Build the project with npm run build.
6. Start either MCP stdio mode or HTTP mode.

## MCP Runtime Workflow

1. The assistant client starts build/index.js as an MCP server.
2. The client lists tools, resources, and prompts.
3. Input schemas are sanitized for MCP-safe keys.
4. The server validates incoming arguments.
5. The executor applies the appropriate OpenAPI security scheme.
6. The Polarion REST API response is formatted and returned to the client.

## HTTP Runtime Workflow

1. The HTTP wrapper starts with Express and validates HTTP_API_KEY on incoming requests.
2. The client discovers tools through GET /api/tools or imports an OpenAPI document.
3. The wrapper resolves the tool name and sanitizes the input schema.
4. The shared executor runs the underlying Polarion request.
5. The wrapper returns a JSON response with flattened text output.

## Project Configuration Workflow

1. A client invokes refresh_polarion_config with a projectId.
2. The server fetches project details, work item types, and enumerations from Polarion.
3. The result is normalized into an in-memory project configuration object.
4. The configuration is cached and exposed as a polarion://config/<projectId> resource.

## Regeneration Workflow

1. Download openapi.json from the Polarion definition endpoint.
2. Apply the sparse fields patch.
3. Regenerate src/tools.ts.
4. Run post-generation normalization scripts.
5. Build the project and verify handwritten modules still align with generated output.

## Validation Workflow

1. Run npm test.
2. Run npm run typecheck.
3. If the HTTP wrapper changed, validate /health and /api/tools locally.
4. If documentation changed, verify README and docs remain consistent.

## read_when

- Use this guide when onboarding, debugging runtime behavior, or updating the generation pipeline.
