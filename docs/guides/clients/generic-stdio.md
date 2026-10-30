# Connect Other AI provider / any MCP client

Any MCP client that starts local programs. Default: **Local**.

Official documentation: [modelcontextprotocol.io](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports)

Verification status:

- Local: verified by documentation only
- Server: verified by documentation only

Your AI provider does not need a dedicated integration. Use any MCP-capable client. If it accepts OpenAPI instead, choose REST / OpenAPI below.

## Prerequisites

### Local

- [Local (npm / npx) guide](../local-npm.md): start here if you have not set it up yet.
- Node.js 22 or newer

### Server

- [Server (Docker) guide](../server-docker.md): start here if you have not set it up yet.
- The server URL

Server example (Docker team server):

```bash
docker run -d --name polarion-mcp \
  -p 127.0.0.1:3000:3000 \
  -e API_BASE_URL=https://polarion.company.example/polarion/rest/v1 \
  -e MCP_ALLOWED_HOSTS=localhost:3000,127.0.0.1:3000 \
  ghcr.io/phillipboesger/polarion-mcp:1.4.5
```

The image starts Streamable HTTP at http://localhost:3000/mcp. Each caller sends their own Polarion PAT. For team access, proxy HTTPS to the loopback port, forward the public Host, and add your public hostname to MCP_ALLOWED_HOSTS. Cloud connectors also need OAuth; their Docker choice includes that configuration.

## Steps

### Local

1. Open your client's MCP settings and add a server of type stdio.
2. Set command npx and arguments -y polarion-mcp; add env API_BASE_URL and BEARER_TOKEN.
3. Replace YOUR-POLARION and YOUR_POLARION_PAT as in the snippet.
4. Save and restart the client.
5. Start a new chat and check that polarion is listed and enabled.

```json
{
  "mcpServers": {
    "polarion": {
      "command": "npx",
      "args": ["-y", "polarion-mcp"],
      "env": {
        "API_BASE_URL": "https://YOUR-POLARION/polarion/rest/v1",
        "BEARER_TOKEN": "YOUR_POLARION_PAT"
      }
    }
  }
}
```

Any MCP-capable client works. For OpenAPI-only integrations, choose REST / OpenAPI.

### Server

1. Get the MCP URL (ends in /mcp) from your administrator.
2. Add a server of type http or Streamable HTTP in your client's MCP settings.
3. Paste the snippet, or enter the URL and header Authorization: Bearer YOUR_POLARION_PAT.
4. Save and restart or reconnect the client.

```json
{
  "mcpServers": {
    "polarion": {
      "url": "https://YOUR-SERVER/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_POLARION_PAT"
      }
    }
  }
}
```

Remote MCP uses per-user PATs. The client must be able to reach this URL.

## Check

### Local

Ask your assistant: `Which Polarion user am I? Use getCurrentUser.`

Expected: The assistant calls a Polarion tool and shows your Polarion user.

### Server

Ask your assistant: `Which Polarion user am I? Use getCurrentUser.`

Expected: The assistant calls a Polarion tool and shows your Polarion user.

## If it fails

### Local

| Symptom | Fix |
|---|---|
| Server disconnected or failed | Run npx -y polarion-mcp in a terminal (Node 22+). On Windows try command cmd, args /c npx. |
| Server starts but no tools appear | Some clients limit tool count. Enable tools in the client or reduce them with MCP_TOOLSETS. |
| 401 "Polarion did not accept this token" | The PAT was cut off, has expired or is for another Polarion. Create a new token and paste it unchanged. |

### Server

| Symptom | Fix |
|---|---|
| 401 Unauthorized. | Token missing, cut off, expired or from another Polarion. Create a new PAT and retest. |
| Client does not accept an Authorization header | Use a client that supports headers or OAuth. Ask the vendor how to send a custom HTTP header. |

## Sources

Checked against the vendor documentation on 2026-10-24.

- [Official documentation](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports)

Back to the [client index](../../clients.md).
