# Connect REST wrapper / OpenAPI

REST/OpenAPI endpoint for clients without MCP. Default: **Server**.

- **Local is not supported:** npx starts MCP stdio. This needs the separate REST wrapper.

## Prerequisites

### Server

- [Server (Docker) guide](../server-docker.md): start here if you have not set it up yet.
- Wrapper address and HTTP_API_KEY

Server example (REST wrapper / OpenAPI):

```bash
docker run -d --name polarion-rest \
  -p 127.0.0.1:3000:3000 \
  -e API_BASE_URL=https://YOUR-POLARION/polarion/rest/v1 \
  -e BEARER_TOKEN=YOUR_POLARION_PAT \
  -e HTTP_API_KEY=YOUR_WRAPPER_API_KEY \
  -e PUBLIC_URL=https://YOUR-SERVER \
  -e TRUST_PROXY=1 \
  ghcr.io/phillipboesger/polarion-mcp:1.4.5 \
  node build/http-server.js
```

All calls use the deployment PAT. Clients send Authorization: Bearer <HTTP_API_KEY>. Serve this behind HTTPS; schemas are at /openapi.json and /openapi-gpt.json. Forward the public Host through your TLS proxy. HTTP_API_KEY is a random secret you invent (for example from openssl rand -hex 32); callers send it as the Bearer token. TRUST_PROXY=1 lets the 100-requests-per-15-minutes limit count each caller separately behind your proxy.

## Steps

### Server

1. Ask your administrator for the wrapper address and HTTP_API_KEY.
2. Import https://YOUR-SERVER/openapi.json (all) or /openapi-gpt.json (30 actions).
3. Set authentication to Bearer token and paste the HTTP_API_KEY.
4. Call getCurrentUser to check access. The 30-action GPT schema has no getCurrentUser; use getProject with a projectId there.

```
OpenAPI: https://YOUR-SERVER/openapi.json
GPT Actions: https://YOUR-SERVER/openapi-gpt.json
Authorization: Bearer YOUR_WRAPPER_API_KEY
```

REST uses the deployment PAT, shared by all calls through this wrapper.

## Check

### Server

Ask your assistant: `curl -X POST https://YOUR-SERVER/api/tools/getCurrentUser -H "Authorization: Bearer YOUR_WRAPPER_API_KEY" -H "Content-Type: application/json" -d '{}'`

Expected: JSON with the Polarion projects. Without the key, /api/tools answers 401.

## If it fails

### Server

| Symptom | Fix |
|---|---|
| 401 Unauthorized. | The Bearer value must be HTTP_API_KEY (the wrapper key), not your Polarion PAT. |
| 429 Too many requests. | Limit is 100 calls per 15 minutes per caller. Set TRUST_PROXY=1 behind a proxy. |

## Sources

Checked against the vendor documentation on 2026-10-24.

- [Server implementation 1](https://github.com/phillipboesger/polarion-mcp/blob/main/src/http-server.ts)
- [Server implementation 2](https://github.com/phillipboesger/polarion-mcp/blob/main/src/rest-api.ts)

Back to the [client index](../../clients.md).
