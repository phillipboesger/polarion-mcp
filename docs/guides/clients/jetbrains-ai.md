# Connect JetBrains AI Assistant

AI Assistant in JetBrains IDEs. Default: **Local**.

The vendor documents Streamable HTTP but no authentication configuration matching this server. This guide therefore offers npx or Docker stdio; remote URL is disabled rather than inventing a PAT header field.

- **Server is not supported:** JetBrains documents Streamable HTTP but no way to send an Authorization header, so a remote server cannot authenticate. Use Local (npm), or the Docker stdio alternative in the Local steps.

## Prerequisites

### Local

- [Local (npm / npx) guide](../local-npm.md): start here if you have not set it up yet.
- A JetBrains IDE with AI Assistant
- Node.js 22 or newer

## Steps

### Local

1. Open Settings > Tools > AI Assistant > Model Context Protocol (MCP).
2. Click Add and choose the connection type STDIO.
3. Paste the snippet; replace YOUR-POLARION and YOUR_POLARION_PAT.
4. Set the Level (global or current project), then click OK and Apply.
5. Check the Status column for polarion, then ask the test prompt in the chat.

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

Node.js 22+ runs the published npm package on your computer. Replace the URL and PAT locally; keep credentials out of Git.

#### Alternative: Docker stdio

A local container launched by the IDE. It is not a shared HTTP team server. Needs: A JetBrains IDE with AI Assistant. Needs: Docker installed and running.

1. Open Settings > Tools > AI Assistant > Model Context Protocol (MCP).
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
        "ghcr.io/phillipboesger/polarion-mcp:1.4.4",
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
| Status shows error or not connected | Select polarion and click Reconnect. Check the JSON and that Node.js 22+ is visible to the IDE. |
| You cannot add servers | Your administrator may manage servers through JetBrains IDE Services or Central. |

## Sources

Checked against the vendor documentation on 2026-10-24.

- [Official documentation](https://www.jetbrains.com/help/ai-assistant/mcp.html)

Not confirmed in the vendor documentation:

- JetBrains page states no IDE version, AI Assistant version or subscription requirement.
- Remote HTTP with headers: some third-party guides say a headers block works, others say it does not and use mcp-remote; JetBrains documentation is silent, so remote stays unsupported.
- Docs do not say whether 'env' is accepted in the STDIO JSON; it is used here because the standard mcpServers format includes it (the docs only show command and args). If your IDE ignores it, the server will fail with a missing-token error.
- The Level column and Reconnect button are documented; the exact wording of the New MCP Server dialog beyond choosing STDIO/HTTP was not verified.
- The 'Import from Claude' button exists but is not used.

Back to the [client index](../../clients.md).
