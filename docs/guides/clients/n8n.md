# Connect n8n REST workflow

n8n workflows calling the REST wrapper. Default: **Server**.

Use the HTTP Request node as a workflow step or attach it as a tool to an AI Agent. This confirmed path uses REST. The MCP Client Tool documentation still describes an SSE Endpoint, so it is not used as evidence for a Streamable HTTP setup here.

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
  ghcr.io/phillipboesger/polarion-mcp:1.4.3 \
  node build/http-server.js
```

All calls use the deployment PAT. Clients send Authorization: Bearer <HTTP_API_KEY>. Serve this behind HTTPS; schemas are at /openapi.json and /openapi-gpt.json. Forward the public Host through your TLS proxy. HTTP_API_KEY is a random secret you invent (for example from openssl rand -hex 32); callers send it as the Bearer token. TRUST_PROXY=1 lets the 100-requests-per-15-minutes limit count each caller separately behind your proxy.

## Steps

### Server

1. Ask your administrator for the wrapper address and HTTP_API_KEY.
2. Create a Header Auth credential: name Authorization, value Bearer YOUR_WRAPPER_API_KEY.
3. Add an HTTP Request node, choose Import cURL, paste the snippet, replace the address.
4. Select the credential and remove the imported Authorization header.
5. Execute the node.

```bash
curl -X POST https://YOUR-SERVER/api/tools/getCurrentUser \
  -H "Authorization: Bearer ${HTTP_API_KEY}" \
  -H 'Content-Type: application/json' \
  -d '{}'
```

This setup uses the REST wrapper. Its administrator configures API_BASE_URL, BEARER_TOKEN and HTTP_API_KEY. Store the wrapper key in an n8n credential after importing.

## Check

### Server

Ask your assistant: `Execute the HTTP Request node.`

Expected: Node output shows the Polarion projects as JSON.

## If it fails

### Server

| Symptom | Fix |
|---|---|
| 401 Unauthorized. | The Bearer value must be HTTP_API_KEY (the wrapper key), not your Polarion PAT. |
| The node cannot connect. | The wrapper must be reachable from n8n. Cloud n8n needs a public https address, not localhost. |

## Sources

Checked against the vendor documentation on 2026-10-24.

- [Official documentation 1](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/)
- [Official documentation 2](https://docs.n8n.io/integrations/builtin/credentials/httprequest/)

Back to the [client index](../../clients.md).
