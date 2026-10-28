# Connect Generic HTTP client

Any MCP client that connects to a URL. Default: **Server**.

- **Local is not supported:** An HTTP-only client cannot launch a stdio subprocess.

## Prerequisites

### Server

- [Server (Docker) guide](../server-docker.md): start here if you have not set it up yet.
- The MCP URL

Server example (Docker team server):

```bash
docker run -d --name polarion-mcp \
  -p 127.0.0.1:3000:3000 \
  -e API_BASE_URL=https://polarion.company.example/polarion/rest/v1 \
  -e MCP_ALLOWED_HOSTS=localhost:3000,127.0.0.1:3000 \
  ghcr.io/phillipboesger/polarion-mcp:1.4.4
```

The image starts Streamable HTTP at http://localhost:3000/mcp. Each caller sends their own Polarion PAT. For team access, proxy HTTPS to the loopback port, forward the public Host, and add your public hostname to MCP_ALLOWED_HOSTS. Cloud connectors also need OAuth; their Docker choice includes that configuration.

## Steps

### Server

1. Set the transport to Streamable HTTP (not SSE) and the URL to the MCP address.
2. Add header Authorization: Bearer YOUR_POLARION_PAT.
3. Add Accept: application/json, text/event-stream if your library does not.
4. Send initialize, then tools/list (most libraries do this).
5. Check first with curl (see Check that it works).

```
URL: https://YOUR-SERVER/mcp
Transport: Streamable HTTP
Authorization: Bearer YOUR_POLARION_PAT
```

Use your own deployed HTTPS URL. There is no public Polarion relay. Your server must be reachable by the client provider; an administrator sets up TLS, OAuth and exact redirect allowlists.

## Check

### Server

Ask your assistant: `curl -i -X POST https://YOUR-SERVER/mcp -H "Authorization: Bearer YOUR_POLARION_PAT" -H "Content-Type: application/json" -H "Accept: application/json, text/event-stream" -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"curl","version":"1"}}}'`

Expected: HTTP 200 with "serverInfo" and an mcp-session-id header. No key gives 401.

## If it fails

### Server

| Symptom | Fix |
|---|---|
| 401 Unauthorized. | Token missing, cut off, expired or from another Polarion. Create a new PAT and retest. |
| 406 Not Acceptable. | Send the header Accept: application/json, text/event-stream. |

## Sources

Checked against the vendor documentation on 2026-10-24.

- [Official documentation](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports)

Back to the [client index](../../clients.md).
