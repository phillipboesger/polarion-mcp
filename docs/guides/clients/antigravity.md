# Connect Antigravity (CLI + IDE)

Google’s agent CLI (agy) and IDE, the successor to Gemini CLI. Default: **Local**.

Official documentation: [antigravity.google](https://antigravity.google/docs/mcp), [developers.google.com](https://developers.google.com/workspace/guides/configure-mcp-servers), [geminicli.com](https://geminicli.com/docs/tools/mcp-server/)

Verification status:

- Local: verified by documentation only
- Server: verified by documentation only

Antigravity CLI, IDE and App read the same mcp_config.json schema. Gemini CLI users can import their servers once; Gemini CLI itself keeps working for Code Assist and API-key users.

## Prerequisites

### Local

- [Local (npm / npx) guide](../local-npm.md): start here if you have not set it up yet.
- Antigravity CLI (agy), IDE or App signed in
- Node.js 22+

### Server

- [Server (Docker) guide](../server-docker.md): start here if you have not set it up yet.
- Antigravity CLI (agy), IDE or App signed in
- The https://.../mcp address from your admin

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

1. Open mcp_config.json. IDE: click the ellipsis at the top of the agent side panel, choose MCP Servers > Manage MCP Servers > View raw config. CLI: run agy and type /mcp. File: ~/.gemini/config/mcp_config.json (all projects) or <workspace>/.agents/mcp_config.json (this workspace only).
2. Add the polarion entry to mcpServers; replace YOUR-POLARION and YOUR_POLARION_PAT.
3. Save, then reload the config: in agy use the /mcp overlay, in the IDE reload the window, in the App use the refresh button under Settings > Customizations > Installed MCP Servers.
4. Type /mcp in agy; polarion must show as connected. Tools without a rule run in Ask mode, so approve each call or add an mcp(polarion/*) permission rule.

```json
{
  "mcpServers": {
    "polarion": {
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

Same command, args and env as other local clients; the top-level key is `mcpServers`. Antigravity waits up to 300 seconds to connect and 180 seconds per tool call; set timeoutSeconds in the entry to change both (-1 turns the limits off).

### Server

1. Open mcp_config.json as in the local steps (~/.gemini/config/mcp_config.json or <workspace>/.agents/mcp_config.json).
2. Add the polarion entry with serverUrl (url also works; httpUrl and the legacy SSE transport are not supported) and the Authorization header in headers; replace YOUR-SERVER and YOUR_POLARION_PAT.
3. Save, then reload the config from the /mcp overlay, the IDE or the App refresh button.
4. Type /mcp in agy; polarion must show as connected. Tools without a rule run in Ask mode.

```json
{
  "mcpServers": {
    "polarion": {
      "serverUrl": "https://YOUR-SERVER/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_POLARION_PAT"
      }
    }
  }
}
```

Remote MCP uses per-user PATs sent as a header. The client must be able to reach this URL over Streamable HTTP. Antigravity can also run OAuth with dynamic client registration on its own; the redirect URI for manual client credentials is https://antigravity.google/oauth-callback. This guide uses the PAT header instead.

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
| polarion missing in /mcp | Check the JSON for typos. Edit ~/.gemini/config/mcp_config.json (or .agents/mcp_config.json in the workspace), save, then reload from the /mcp overlay or restart agy. |
| Server shows disabled or no tools | Remove "disabled": true and check enabledTools or disabledTools in the entry. |
| Connection or tool call times out | Defaults are 300 s to connect and 180 s per call. Set timeoutSeconds in the entry, or check that npx can start the server. |
| 401 "Polarion did not accept this token" | The PAT was cut off or expired. Create a new token and paste it unchanged. |

### Server

| Symptom | Fix |
|---|---|
| polarion missing or disconnected | Use serverUrl (or url), not httpUrl. Check the URL ends in /mcp and uses Streamable HTTP. |
| Connection or tool call times out | Defaults are 300 s to connect and 180 s per call. Set timeoutSeconds in the entry and check the server is reachable. |
| 401 "Polarion did not accept this token" | The PAT was cut off or expired. Create a new token and paste it unchanged. |

## Sources

Checked against the vendor documentation on 2026-10-30.

- [Official documentation 1](https://antigravity.google/docs/mcp)
- [Official documentation 2](https://developers.google.com/workspace/guides/configure-mcp-servers)
- [Official documentation 3](https://geminicli.com/docs/tools/mcp-server/)

Not confirmed in the vendor documentation:

- Google's Antigravity page documents ~/.gemini/config/mcp_config.json (global, CLI) and <workspace>/.agents/mcp_config.json (workspace). Older Google material and third-party guides name ~/.gemini/antigravity/mcp_config.json or ~/.gemini/antigravity-cli/mcp_config.json. Which file the IDE reads is not stated; the steps open the file from the IDE or /mcp so you do not need the path.
- Google does not document environment variable substitution inside mcp_config.json, so the snippets put the PAT inline.
- Google does not document an agy mcp add command or per-OS config paths; the CLI steps edit the file instead.
- Google lists no plan or licence requirement for MCP servers.

Back to the [client index](../../clients.md).
