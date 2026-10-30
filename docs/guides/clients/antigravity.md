# Connect Antigravity (CLI + IDE)

Google’s agent CLI (agy) and IDE, the successor to Gemini CLI. Default: **Local**.

Verification status:

- Local: verified by documentation only
- Server: verified by documentation only

Antigravity CLI and IDE read the same mcp_config.json. Gemini CLI users can import their servers once; Gemini CLI itself keeps working for Code Assist and API-key users.

## Prerequisites

### Local

- [Local (npm / npx) guide](../local-npm.md): start here if you have not set it up yet.
- Antigravity CLI (agy) or IDE signed in
- Node.js 22+

### Server

- [Server (Docker) guide](../server-docker.md): start here if you have not set it up yet.
- Antigravity CLI (agy) or IDE signed in
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

1. Open mcp_config.json: in the IDE use Manage MCP Servers > View raw config; in the CLI run agy and open the /mcp panel (usually ~/.gemini/antigravity/mcp_config.json; other versions use a different folder under ~/.gemini/).
2. Add the polarion entry to mcpServers; replace YOUR-POLARION and YOUR_POLARION_PAT.
3. Save, then restart agy or reload the IDE.
4. Type /mcp in agy; polarion must show as connected.

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

Same command, args and env as other local clients; the top-level key is `mcpServers`.

### Server

1. Open mcp_config.json as in the local steps.
2. Add the polarion entry with serverUrl (not httpUrl or url) and the Authorization header; replace YOUR-SERVER and YOUR_POLARION_PAT.
3. Save, then restart agy or reload the IDE.
4. Type /mcp in agy; polarion must show as connected.

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
| polarion missing in /mcp | Check the JSON for typos and the file path your version reads, then restart agy. |
| 401 "Polarion did not accept this token" | The PAT was cut off or expired. Create a new token and paste it unchanged. |

### Server

| Symptom | Fix |
|---|---|
| polarion missing or disconnected | Use serverUrl, not url or httpUrl. Check the URL ends in /mcp. |
| 401 "Polarion did not accept this token" | The PAT was cut off or expired. Create a new token and paste it unchanged. |

## Sources

Checked against the vendor documentation on 2026-10-24.

- [Official documentation 1](https://developers.google.com/workspace/guides/configure-mcp-servers)
- [Official documentation 2](https://geminicli.com/docs/tools/mcp-server/)

Not confirmed in the vendor documentation:

- Config file location differs between sources: Google documents ~/.gemini/antigravity/mcp_config.json, a Google codelab shows ~/.gemini/config/mcp_config.json and a third-party guide ~/.gemini/antigravity-cli/mcp_config.json. The steps tell you to open it from the IDE or /mcp panel; check which path your version reads.
- Environment variable substitution inside mcp_config.json is reported as not working, so the snippets put the PAT inline.
- Whether agy mcp add exists as a command is not documented; the CLI steps edit the file instead.

Back to the [client index](../../clients.md).
