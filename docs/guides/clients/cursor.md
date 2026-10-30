# Connect Cursor

Cursor editor. Default: **Local**.

Verification status:

- Local: verified by documentation only
- Server: verified by documentation only

## Prerequisites

### Local

- [Local (npm / npx) guide](../local-npm.md): start here if you have not set it up yet.
- Cursor
- Node.js 22+

### Server

- [Server (Docker) guide](../server-docker.md): start here if you have not set it up yet.
- Cursor

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

1. Open (or create) ~/.cursor/mcp.json, your personal global file
2. Add the polarion entry inside the existing mcpServers object
3. Replace YOUR-POLARION and YOUR_POLARION_PAT, then save
4. Open Customize in the sidebar and turn the polarion toggle on
5. Open a chat in Agent mode and ask the prompt

```json
{
  "mcpServers": {
    "polarion": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "-y",
        "polarion-mcp"
      ],
      "env": {
        "API_BASE_URL": "https://YOUR-POLARION/polarion/rest/v1",
        "BEARER_TOKEN": "YOUR_POLARION_PAT"
      }
    }
  }
}
```

Node.js 22+ runs the published npm package on your computer. Replace the URL and PAT locally; keep credentials out of Git.

### Server

1. Open (or create) ~/.cursor/mcp.json, your personal global file
2. Add the polarion entry inside the existing mcpServers object
3. Replace YOUR-SERVER and YOUR_POLARION_PAT, then save
4. Open Customize in the sidebar and turn the polarion toggle on
5. Open a chat in Agent mode and ask the prompt

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
| polarion missing or its toggle is off | Check the JSON is valid. Turn the toggle on under Customize, or restart Cursor. |
| Server fails to connect | Press Cmd/Ctrl+Shift+U, choose MCP Logs in the Output panel and read the error. |
| 401 "Polarion did not accept this token" | The PAT was cut off, has expired or is for another Polarion. Create a new token and paste it unchanged. |

### Server

| Symptom | Fix |
|---|---|
| polarion missing or its toggle is off | Check the JSON is valid. Turn the toggle on under Customize, or restart Cursor. |
| Server fails to connect | Press Cmd/Ctrl+Shift+U, choose MCP Logs in the Output panel and read the error. |
| 401 "Polarion did not accept this token" | The PAT was cut off, has expired or is for another Polarion. Create a new token and paste it unchanged. |

## Sources

Checked against the vendor documentation on 2026-10-24.

- [Official documentation](https://cursor.com/docs/mcp)

Not confirmed in the vendor documentation:

- Docs do not give a Windows path for the global file (presumably mcp.json in .cursor in your user folder; not stated). The Windows step is therefore worded as the home folder only for macOS/Linux.
- Docs say servers are managed from 'Customize' in the sidebar; no Settings > Tools & MCP menu path is documented, so none is used.
- Docs do not state that a restart or reconnect is needed after editing mcp.json; the restart hint is a fallback.
- Docs list type 'stdio' as required for local servers; the remote example uses url without a type.

Back to the [client index](../../clients.md).
