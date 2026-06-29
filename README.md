# Polarion MCP

> **Product page:** [phillipboesger.github.io/polarion-mcp](https://phillipboesger.github.io/polarion-mcp/) · **Docker image:** `ghcr.io/phillipboesger/polarion-mcp:latest`

A **Model Context Protocol** server that exposes **210 Polarion REST operations** as AI-native tools — for VS Code Copilot, Claude, ChatGPT Custom GPTs, and any MCP-compatible client.

## Features

✅ **Strict Type Validation** – Zod schemas validate all inputs with Polarion query grammar support  
✅ **Health Endpoint** – Optional `/healthz` route for monitoring and readiness checks  
✅ **Hardened Error Handling** – Standardized MCP errors with automatic PAT sanitization  
✅ **Pagination Helpers** – Built-in utilities for easy result navigation  
✅ **Security Checks** – Validates required environment variables and never logs sensitive data  
✅ **Multiple Transports** – HTTP (Streamable) and stdio support  
✅ **CI/CD Ready** – ESLint, TypeScript checks, and pre-commit hooks included

## Requirements

- Node.js v18+ (global `fetch`) — we also polyfill with `undici`.
- PAT for Polarion with read permissions.

## Docker

The fastest way to get started. The image is published automatically to GitHub Container Registry on every push to `main`.

```bash
docker pull ghcr.io/phillipboesger/polarion-mcp:latest

docker run -d \
  -e POLARION_BASE_URL=https://your-polarion.com/polarion/rest/v1 \
  -e POLARION_PAT=your_pat_here \
  -e ENABLE_HEALTH_ENDPOINT=true \
  -p 7332:7332 \
  --name polarion-mcp \
  ghcr.io/phillipboesger/polarion-mcp:latest
```

Connect your AI client to `http://localhost:7332/mcp`. For stdio mode (VS Code, Claude Desktop), override the command:

```bash
docker run --rm -i \
  -e POLARION_BASE_URL=https://your-polarion.com/polarion/rest/v1 \
  -e POLARION_PAT=your_pat_here \
  -e TRANSPORT_TYPE=stdio \
  ghcr.io/phillipboesger/polarion-mcp:latest
```

## Quickstart (local)

```bash
pnpm i   # or npm/yarn
cp .env.example .env
# edit .env (POLARION_BASE_URL, POLARION_PAT, AUTH_SCHEME)
pnpm dev  # starts HTTP transport (default :7332)
```

Connect your MCP-capable client (VS Code extension / Custom GPT) to `http://localhost:7332/mcp`.

## Tools

- `search_work_items(query, project?, fields?, limit?, offset?, rawPath?)` – Search with Polarion query syntax
- `get_work_item(id, project?, include?, rawPath?)` – Fetch a specific work item
- `search_documents(project, query?, limit?, offset?, rawPath?)` – Search documents in a project
- `get_document(project, id, rawPath?)` – Get a specific document

## Architecture

- **src/config.ts** — Configuration with security validation
- **src/polarionClient.ts** — REST client with error mapping and health checks
- **src/validation.ts** — Zod schemas for input validation
- **src/errors.ts** — Standardized error mapping and sanitization
- **src/pagination.ts** — Pagination helper utilities
- **src/tools.ts** — MCP tool definitions with validation
- **src/server.ts** — MCP server with HTTP/stdio transport support

### Notes

- REST paths may differ across Polarion versions. Every method supports `rawPath` to override endpoints without code edits.
- No caching by design. Retries only on 429/5xx with short backoff.
- Logging is minimal and automatically sanitizes PAT from all output.
- Health endpoint is optional and can run on a separate port.

## Configuration

### Environment Variables

```bash
# Required
POLARION_BASE_URL=https://your-polarion.com/polarion/rest
POLARION_PAT=your_personal_access_token_here

# Optional
PORT=7332
AUTH_SCHEME=Bearer  # or Basic
HTTP_TIMEOUT_MS=15000
LOG_LEVEL=info      # silent, error, warn, info, debug

# Health Endpoint
ENABLE_HEALTH_ENDPOINT=false
HEALTH_PORT=7333    # Optional: use different port for health checks

# Transport
TRANSPORT_TYPE=http  # or stdio for local integrations
```

## Usage Examples

### REST Client (VS Code Extension)

See `docs/examples.http` for ready-to-run HTTP requests.

### Node.js Client

See `docs/client-example.ts` for a complete MCP client implementation.

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const client = new Client({ name: "my-client", version: "1.0.0" });
const transport = new StreamableHTTPClientTransport(
  new URL("http://localhost:7332/mcp")
);
await client.connect(transport);

const result = await client.callTool({
  name: "search_work_items",
  arguments: { query: "status:open", limit: 10 },
});
```

## Development

### Type Checking

```bash
npm run typecheck
```

### Linting

```bash
npm run lint
```

### Pre-commit Hooks

```bash
# Install pre-commit hook (optional)
ln -s ../../scripts/pre-commit.sh .git/hooks/pre-commit
```

### Building

```bash
npm run build
npm start
```

## Security

- **Environment Validation**: Server refuses to start if `POLARION_BASE_URL` or `POLARION_PAT` are missing or invalid
- **Automatic Sanitization**: PAT is automatically removed from all logs and error messages
- **Error Mapping**: HTTP errors are mapped to standardized MCP error codes
- **No Secrets in Logs**: Configuration logging explicitly excludes sensitive data

## Health Checks

When `ENABLE_HEALTH_ENDPOINT=true`, a `/healthz` endpoint is available:

```bash
curl http://localhost:7332/healthz
```

Response (healthy):

```json
{
  "status": "ok",
  "service": "polarion-mcp",
  "version": "0.1.0",
  "polarionBaseUrl": "https://polarion.example.com/polarion/rest",
  "timestamp": "2025-10-19T12:00:00.000Z"
}
```

## Pagination

All list operations support pagination with `limit` and `offset` parameters:

```typescript
// First page
const page1 = await client.callTool({
  name: "search_work_items",
  arguments: { query: "status:open", limit: 50, offset: 0 },
});

// Next page (if nextOffset is provided)
const page2 = await client.callTool({
  name: "search_work_items",
  arguments: { query: "status:open", limit: 50, offset: page1.nextOffset },
});
```

---

## Implementation Status

### ✅ Completed Tasks

**1. Enforce strict types and improve schemas**

- ✅ Zod validation for all tool inputs
- ✅ Polarion query grammar validation with parentheses checking
- ✅ Field whitelist schemas for work items

**2. Add health endpoint and readiness checks**

- ✅ `/healthz` HTTP route with Polarion reachability check
- ✅ Optional Express server with env flag control
- ✅ Configurable separate port for health checks

**3. Harden error mapping**

- ✅ Comprehensive error mapping utility
- ✅ Standardized MCP error codes (`InvalidRequest`, `InternalError`)
- ✅ Automatic PAT sanitization in error messages

**4. Pagination helpers**

- ✅ `PaginationHelper` with `hasMore` and `next()` function
- ✅ `formatPaginationInfo` for display
- ✅ Support for `total`, `nextOffset`, and continuation

**5. Add example requests**

- ✅ `docs/examples.http` with REST samples for all endpoints
- ✅ `docs/client-example.ts` with Node.js MCP client usage

**6. CI linters**

- ✅ ESLint config with TypeScript support
- ✅ `tsc --noEmit` type checks in `npm run typecheck`
- ✅ Pre-commit hook script for validation

**7. Security checks**

- ✅ Startup guard validates `POLARION_BASE_URL` and `POLARION_PAT`
- ✅ Refuses placeholder values (`__REPLACE_ME__`)
- ✅ PAT never appears in logs or error strings

**8. Optional: SSE transport**

- ✅ Streamable HTTP transport (modern MCP protocol)
- ✅ stdio transport for local integrations
- ✅ Configurable via `TRANSPORT_TYPE` environment variable

---
