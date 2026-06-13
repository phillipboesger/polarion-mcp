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

## HTTP Mode

- Start the HTTP server with `npm run start:http`.
- HTTP_API_KEY must be set or the server exits on startup.
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

- Use MCP mode for local assistant integrations that support stdio MCP.
- Use HTTP mode for remote or hosted integrations that require HTTPS endpoints.
- Use /openapi-gpt.json when the consumer has operation count limits.

## read_when

- Use this guide when running the server locally or configuring clients.
