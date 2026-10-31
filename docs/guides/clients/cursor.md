# Connect Cursor

Cursor editor. Default: **Local**.

Official documentation: [cursor.com](https://cursor.com/docs/mcp)

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

1. Open Customize in the sidebar, or create the file yourself: ~/.cursor/mcp.json for all projects, or .cursor/mcp.json in a project for that project only
2. Add the polarion entry inside the existing mcpServers object (type stdio is required for local servers)
3. Replace YOUR-POLARION and YOUR_POLARION_PAT, then save
4. Restart Cursor if the server does not show up, then open Customize and turn the polarion toggle on
5. Open a chat in Agent mode, ask the prompt and approve the tool call when Cursor asks

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

The command must be on your system path or be a full path, so Cursor must be able to find npx. Keep tokens out of project files you commit; Cursor resolves ${env:NAME} in command, args, env, url and headers, so you can reference an environment variable instead of pasting the PAT.

### Server

1. Open Customize in the sidebar, or create the file yourself: ~/.cursor/mcp.json for all projects, or .cursor/mcp.json in a project for that project only
2. Add the polarion entry inside the existing mcpServers object
3. Replace YOUR-SERVER and YOUR_POLARION_PAT, then save
4. Restart Cursor if the server does not show up, then open Customize and turn the polarion toggle on
5. Open a chat in Agent mode, ask the prompt and approve the tool call when Cursor asks

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

Remote MCP uses per-user PATs. The client must be able to reach this URL. Cursor resolves ${env:NAME} in url and headers, so you can write Bearer ${env:POLARION_PAT} and keep the token out of the file. A remote entry needs only url and headers; this server uses a PAT header, so no OAuth auth block is needed.

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
| polarion missing or its toggle is off | Check the JSON is valid. Servers are enabled and disabled under Customize; a disabled server does not load and does not appear in chat. After editing the file, restart Cursor. |
| Server fails to connect | Press Cmd/Ctrl+Shift+U, choose MCP Logs in the Output panel and read the initialization and error lines. A crashed or timed-out server only fails its own tool call; other servers keep working. |
| 401 "Polarion did not accept this token" | The PAT was cut off, has expired or is for another Polarion. Create a new token and paste it unchanged. |
| A tool call waits for approval | Cursor asks before running MCP tools by default. Click the arrow beside the tool name to see its arguments, then approve. Run Modes control this. |
| Team blocks the server | An admin can restrict servers with an MCP Allowlist (Team Settings > MCP Configuration): command entries approve stdio servers, URL entries approve remote servers. Ask the admin to add yours. |
| spawn npx ENOENT or command not found | npx is not on the path Cursor sees. Install Node.js 22+ and restart Cursor, or put the full path to npx in command. |

### Server

| Symptom | Fix |
|---|---|
| polarion missing or its toggle is off | Check the JSON is valid. Servers are enabled and disabled under Customize; a disabled server does not load and does not appear in chat. After editing the file, restart Cursor. |
| Server fails to connect | Press Cmd/Ctrl+Shift+U, choose MCP Logs in the Output panel and read the initialization and error lines. A crashed or timed-out server only fails its own tool call; other servers keep working. |
| 401 "Polarion did not accept this token" | The PAT was cut off, has expired or is for another Polarion. Create a new token and paste it unchanged. |
| A tool call waits for approval | Cursor asks before running MCP tools by default. Click the arrow beside the tool name to see its arguments, then approve. Run Modes control this. |
| Team blocks the server | An admin can restrict servers with an MCP Allowlist (Team Settings > MCP Configuration): command entries approve stdio servers, URL entries approve remote servers. Ask the admin to add yours. |

## Sources

Checked against the vendor documentation on 2026-10-30.

- [Official documentation](https://cursor.com/docs/mcp)

Not confirmed in the vendor documentation:

- Cursor docs give only the ~ path for the global file and no Windows path (presumably the .cursor folder in your user folder; not stated).
- Docs do not state a plan requirement or a tool-count limit for MCP servers.
- Docs do not state whether Cursor must be restarted after editing mcp.json; they say to update local files and restart Cursor when updating a custom server, so the restart step is kept as a fallback.
- Docs do not give a Settings menu path for MCP; only Customize in the sidebar is documented.

Back to the [client index](../../clients.md).
