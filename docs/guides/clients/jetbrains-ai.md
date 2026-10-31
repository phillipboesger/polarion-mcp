# Connect JetBrains AI Assistant

AI Assistant in JetBrains IDEs. Default: **Local**.

Official documentation: [www.jetbrains.com](https://www.jetbrains.com/help/ai-assistant/mcp.html)

Verification status:

- Local: verified by documentation only

The vendor documents Streamable HTTP but no authentication configuration matching this server. This guide therefore offers npx or Docker stdio; remote URL is disabled rather than inventing a PAT header field.

- **Server is not supported:** JetBrains documents Streamable HTTP but no way to send an Authorization header, so a remote server cannot authenticate. Use Local (npm), or the Docker stdio alternative in the Local steps.

## Prerequisites

### Local

- [Local (npm / npx) guide](../local-npm.md): start here if you have not set it up yet.
- A JetBrains IDE with AI Assistant
- Node.js 22 or newer

## Steps

### Local

1. Open Settings > Tools > AI Assistant > Model Context Protocol (MCP), or type / in the AI chat and choose Add Command.
2. Click Add and choose the connection type STDIO.
3. Paste the snippet; replace YOUR-POLARION and YOUR_POLARION_PAT.
4. Set the Level (global or current project), then click OK and Apply.
5. Check the Status column for polarion (click its icon to review the tools), then ask the test prompt in the chat.

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

Import from Claude in the same dialog copies all servers from an existing Claude Desktop configuration; it is not used here. The vendor page shows only command and args for STDIO and does not mention env, which this server needs.

#### Alternative: Docker stdio

A local container launched by the IDE. It is not a shared HTTP team server. Needs: A JetBrains IDE with AI Assistant. Needs: Docker installed and running.

1. Open Settings > Tools > AI Assistant > Model Context Protocol (MCP), or type / in the AI chat and choose Add Command.
2. Click Add and choose the connection type STDIO.
3. Paste the snippet; replace YOUR-POLARION and YOUR_POLARION_PAT (do not add -d or -t).
4. Set the Level (global or current project), then click OK and Apply.
5. Check the Status column for polarion, then ask the test prompt in the chat.

```json
{
  "mcpServers": {
    "polarion": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-e",
        "API_BASE_URL=https://YOUR-POLARION/polarion/rest/v1",
        "-e",
        "BEARER_TOKEN=YOUR_POLARION_PAT",
        "ghcr.io/phillipboesger/polarion-mcp:1.5.0",
        "node",
        "build/index.js"
      ]
    }
  }
}
```

Launches a local stdio container. It is not a shared HTTP team server.

## Check

### Local

Ask your assistant: `Which Polarion user am I? Use getCurrentUser.`

Expected: The assistant calls getCurrentUser and shows your Polarion user. A 403 means this account lacks global REST read access; see Troubleshooting.

## If it fails

### Local

| Symptom | Fix |
|---|---|
| Status shows error or not connected | Select polarion and click Reconnect. Check the JSON and that Node.js 22+ is visible to the IDE. Per-server logs are in the mcp folder: Help > Show Log in Finder (macOS) or Show Log in Explorer (Windows), then open mcp. |
| You cannot add servers | Your administrator may manage servers through JetBrains IDE Services or JetBrains Central and may block adding your own. |
| 401 "Polarion did not accept this token" | The PAT was cut off, has expired or is for another Polarion. Create a new token and paste it unchanged. |
| Server stays off or does not restart after a change | Tick its checkbox and click Apply. You can also enable Automatically enable new and changed MCP servers. Use the icon in the Status column to review the tools it exposes. |

## Sources

Checked against the vendor documentation on 2026-10-30.

- [Official documentation](https://www.jetbrains.com/help/ai-assistant/mcp.html)

Not confirmed in the vendor documentation:

- The JetBrains page (AI Assistant 2026.2) states no IDE version requirement and no subscription requirement for connecting MCP servers.
- The page documents Streamable HTTP and SSE with a url-only JSON example and gives no headers field or Authorization option. Remote stays unsupported here; a JetBrains tracker issue (LLM-24541) reports 401 without an authentication link for authenticated HTTP servers, seen only in a search result and not read.
- The page shows only command and args for STDIO and does not say whether env is accepted. env is used because the standard mcpServers format includes it; if your IDE ignores it, the server fails with a missing-token error.
- The STDIO dialog also has a Working directory field; the page does not say whether it is needed for npx or docker.

Back to the [client index](../../clients.md).
