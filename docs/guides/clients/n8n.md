# Connect n8n REST workflow

n8n workflows calling the REST wrapper. Default: **Server**.

Official documentation: [docs.n8n.io](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/), [docs.n8n.io](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/common-issues/), [docs.n8n.io](https://docs.n8n.io/integrations/builtin/credentials/httprequest/)

Verification status:

- Server: verified by documentation only

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
  ghcr.io/phillipboesger/polarion-mcp:1.5.0 \
  node build/http-server.js
```

All calls use the deployment PAT. Clients send Authorization: Bearer <HTTP_API_KEY>. Serve this behind HTTPS; schemas are at /openapi.json and /openapi-gpt.json. Forward the public Host through your TLS proxy. HTTP_API_KEY is a random secret you invent (for example from openssl rand -hex 32); callers send it as the Bearer token. TRUST_PROXY=1 lets the 100-requests-per-15-minutes limit count each caller separately behind your proxy.

## Steps

### Server

1. Ask your administrator for the wrapper address and HTTP_API_KEY.
2. Create a Header Auth credential (a generic credential type): Name Authorization, Value Bearer YOUR_WRAPPER_API_KEY. Bearer auth is a special case of Header Auth.
3. Add an HTTP Request node, select Import cURL, paste the snippet and select Import. This overwrites the node configuration and stores all values as strings; switch to Using JSON if you need typed values.
4. Replace the address. Under Authentication choose the generic credential type Header Auth, select the credential and remove the imported Authorization header.
5. Execute the node. To let an AI Agent call it, attach the node as a tool; Optimize Response can shrink the result sent to the model.

```bash
curl -X POST https://YOUR-SERVER/api/tools/getCurrentUser \
  -H "Authorization: Bearer ${HTTP_API_KEY}" \
  -H 'Content-Type: application/json' \
  -d '{}'
```

If the wrapper runs in Docker on the same host as n8n, localhost is the n8n container itself. Use host.docker.internal (on Linux add host.docker.internal:host-gateway via extra_hosts or --add-host), or the service name and internal port inside one Compose stack.

## Check

### Server

Ask your assistant: `Execute the HTTP Request node.`

Expected: Node output shows the Polarion projects as JSON.

## If it fails

### Server

| Symptom | Fix |
|---|---|
| 401 Unauthorized. | The Bearer value must be HTTP_API_KEY (the wrapper key), not your Polarion PAT. |
| 403 Forbidden - perhaps check your credentials | The credential is not accepted or is formatted wrongly. Check the Header Auth Name (Authorization) and the Bearer prefix, or create a new key. |
| The node cannot connect (ECONNREFUSED). | The wrapper must be reachable from n8n. Inside Docker, localhost is the container itself: use host.docker.internal, or http://127.0.0.1:PORT on Node.js 17+ (localhost may resolve to IPv6 ::1). Test with wget from inside the n8n container. |
| n8n Cloud cannot reach the wrapper. | Cloud workflows cannot reach localhost or services on your machine. Use a public https address or expose the wrapper through a tunnel. |
| JSON parameter need to be an valid JSON | The body is not valid JSON. Check quotes, commas and brackets; when you use an expression wrap the whole JSON in double curly brackets. |
| 429 Too Many Requests | Use Batching (Items per Batch, Batch Interval) or turn on Retry on Fail in the node settings. The wrapper itself allows 100 requests per 15 minutes per caller. |

## Sources

Checked against the vendor documentation on 2026-10-30.

- [Official documentation 1](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/)
- [Official documentation 2](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/common-issues/)
- [Official documentation 3](https://docs.n8n.io/integrations/builtin/credentials/httprequest/)
- [Official documentation 4](https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.toolmcp/)

Not confirmed in the vendor documentation:

- The n8n MCP Client Tool page (n8n-nodes-langchain.toolmcp) was read again: it documents an SSE Endpoint parameter, Bearer, generic header, multiple headers and OAuth2 credentials, and Tools to Include (All, Selected, All Except). It does not document a Streamable HTTP transport option, version requirements, environment variables or troubleshooting, so MCP Client Tool is still not used for this server.
- The HTTP Request docs do not describe a timeout or SSL fix for this case; Timeout and Ignore SSL Issues exist as node options but no troubleshooting for them is documented.
- The Header Auth credential page does not give the node steps for selecting a generic credential; the Authentication wording above follows the node page's description of generic credentials.

Back to the [client index](../../clients.md).
