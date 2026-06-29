# Polarion MCP

> **Product page:** [phillipboesger.github.io/polarion-mcp](https://phillipboesger.github.io/polarion-mcp/) · **Docker image:** `ghcr.io/phillipboesger/polarion-mcp:latest`

An open-source **Model Context Protocol** server that exposes **210 Polarion REST operations** as AI-native tools — for VS Code Copilot, Claude, ChatGPT Custom GPTs, and any MCP-compatible client.

---

## Table of Contents

- [Features](#features)
- [Requirements](#requirements)
- [Getting Started](#getting-started)
  - [Docker (recommended)](#docker-recommended)
  - [Local development](#local-development)
- [Available Tools](#available-tools)
- [Configuration](#configuration)
- [Usage Examples](#usage-examples)
- [Architecture](#architecture)
- [Security](#security)
- [Health Checks](#health-checks)
- [Pagination](#pagination)
- [Contributing](#contributing)
- [Acknowledgements](#acknowledgements)
- [License](#license)

---

## Features

- **Strict Type Validation** — Zod schemas validate all inputs with Polarion query grammar support
- **Health Endpoint** — Optional `/healthz` route for monitoring and readiness checks
- **Hardened Error Handling** — Standardized MCP errors with automatic PAT sanitization
- **Pagination Helpers** — Built-in utilities for easy result navigation
- **Security Checks** — Validates required environment variables and never logs sensitive data
- **Multiple Transports** — HTTP (Streamable) and stdio support
- **CI/CD Ready** — ESLint, TypeScript checks, and pre-commit hooks included

---

## Requirements

- Node.js v18+ (global `fetch` — polyfilled with `undici`)
- Polarion Personal Access Token (PAT) with read permissions

---

## Getting Started

### Docker (recommended)

The image is published automatically to GitHub Container Registry on every push to `main`.

**HTTP mode** (VS Code Copilot, Custom GPTs, any HTTP MCP client):

```bash
docker run -d \
  -e POLARION_BASE_URL=https://your-polarion.com/polarion/rest/v1 \
  -e POLARION_PAT=your_pat_here \
  -e ENABLE_HEALTH_ENDPOINT=true \
  -p 7332:7332 \
  --name polarion-mcp \
  ghcr.io/phillipboesger/polarion-mcp:latest
```

Connect your AI client to `http://localhost:7332/mcp`.

**stdio mode** (VS Code, Claude Desktop):

```bash
docker run --rm -i \
  -e POLARION_BASE_URL=https://your-polarion.com/polarion/rest/v1 \
  -e POLARION_PAT=your_pat_here \
  -e TRANSPORT_TYPE=stdio \
  ghcr.io/phillipboesger/polarion-mcp:latest
```

### Local development

```bash
npm install
cp .env.example .env
# edit .env — set POLARION_BASE_URL, POLARION_PAT, AUTH_SCHEME
npm run dev        # HTTP transport on :7332
```

See `docs/examples.http` for ready-to-run HTTP requests and `docs/client-example.ts` for a complete Node.js client example.

---

## Available Tools

| Tool | Description |
|---|---|
| `search_work_items` | Search work items with Polarion query syntax |
| `get_work_item` | Fetch a specific work item by ID |
| `search_documents` | Search documents in a project |
| `get_document` | Get a specific document by ID |

All tools accept an optional `rawPath` parameter to override REST endpoint paths without code changes — useful when your Polarion version uses non-standard paths.

---

## Configuration

### Environment Variables

```bash
# Required
POLARION_BASE_URL=https://your-polarion.com/polarion/rest
POLARION_PAT=your_personal_access_token_here

# Optional
PORT=7332
AUTH_SCHEME=Bearer        # or Basic
HTTP_TIMEOUT_MS=15000
LOG_LEVEL=info            # silent | error | warn | info | debug

# Health Endpoint
ENABLE_HEALTH_ENDPOINT=false
HEALTH_PORT=7333          # separate port for health checks (optional)

# Transport
TRANSPORT_TYPE=http       # or stdio for local integrations
```

---

## Usage Examples

### Node.js client

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const client = new Client({ name: "my-client", version: "1.0.0" });
await client.connect(
  new StreamableHTTPClientTransport(new URL("http://localhost:7332/mcp"))
);

const result = await client.callTool({
  name: "search_work_items",
  arguments: { query: "status:open", limit: 10 },
});
```

### Pagination

```typescript
// First page
const page1 = await client.callTool({
  name: "search_work_items",
  arguments: { query: "status:open", limit: 50, offset: 0 },
});

// Next page
const page2 = await client.callTool({
  name: "search_work_items",
  arguments: { query: "status:open", limit: 50, offset: page1.nextOffset },
});
```

---

## Architecture

```
src/
  config.ts          — configuration with security validation
  polarionClient.ts  — REST client with error mapping and health checks
  validation.ts      — Zod schemas for input validation
  errors.ts          — standardized error mapping and PAT sanitization
  pagination.ts      — pagination helper utilities
  tools.ts           — MCP tool definitions with validation
  server.ts          — MCP server with HTTP/stdio transport support
```

**Design notes:**

- REST paths may differ across Polarion versions. Every tool supports `rawPath` to override endpoints without code edits.
- No caching by design. Retries only on 429/5xx with short backoff.
- PAT is automatically sanitized from all logs and error messages.
- Health endpoint is optional and can run on a separate port.

---

## Security

- **Environment Validation** — Server refuses to start if `POLARION_BASE_URL` or `POLARION_PAT` are missing, invalid, or set to placeholder values (`__REPLACE_ME__`)
- **Automatic Sanitization** — PAT is removed from all logs and error messages
- **Error Mapping** — HTTP errors are mapped to standardized MCP error codes
- **No Secrets in Logs** — Configuration logging explicitly excludes sensitive data

---

## Health Checks

When `ENABLE_HEALTH_ENDPOINT=true`, a `/healthz` endpoint is available:

```bash
curl http://localhost:7332/healthz
```

Response:

```json
{
  "status": "ok",
  "service": "polarion-mcp",
  "version": "0.1.0",
  "polarionBaseUrl": "https://polarion.example.com/polarion/rest",
  "timestamp": "2025-10-19T12:00:00.000Z"
}
```

---

## Contributing

Contributions are welcome. To get started:

```bash
npm install
npm run typecheck   # TypeScript check
npm run lint        # ESLint
npm run build       # compile to dist/
npm start           # run compiled server
```

Please open an issue before submitting a larger change so we can discuss the approach. Pull requests should include a description of what changed and why.

---

## Acknowledgements

Thanks to **Jonas** for the initial foundation this project is built on.

---

## License

[MIT](LICENSE) © Phillip Bösger
