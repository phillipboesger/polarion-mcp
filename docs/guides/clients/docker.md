# Connect Docker team server

Host the server yourself in a container. Default: **Server**.

- **Local is not supported:** This entry deploys a server. Pick your AI client for npx.

## Prerequisites

### Server

- [Server (Docker) guide](../server-docker.md): start here if you have not set it up yet.
- Server URL from your administrator

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

1. Ask your administrator for the MCP URL (ends in /mcp).
2. Open your client's MCP settings and choose Streamable HTTP.
3. Enter the URL and add header Authorization: Bearer YOUR_POLARION_PAT.
4. Save and reconnect the client.

```
https://YOUR-SERVER/mcp
Authorization: Bearer YOUR_POLARION_PAT
```

No new container is needed when your team already hosts the server.

## Check

### Server

Ask your assistant: `Which Polarion user am I? Use getCurrentUser.`

Expected: The client lists project names, or at least the tool list.

## If it fails

### Server

| Symptom | Fix |
|---|---|
| 401 Unauthorized. | Token missing, cut off, expired or from another Polarion. Create a new PAT and retest. |
| Cannot connect or certificate error. | Open https://YOUR-SERVER/health. It must show {"status":"ok"} with a padlock; else check server and proxy. |

## Sources

Checked against the vendor documentation on 2026-10-24.

- [Server implementation 1](https://github.com/phillipboesger/polarion-mcp/blob/main/Dockerfile)
- [Server implementation 2](https://github.com/phillipboesger/polarion-mcp/blob/main/docs/deployment.md)

Back to the [client index](../../clients.md).
