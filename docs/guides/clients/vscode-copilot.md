# Connect VS Code / GitHub Copilot

GitHub Copilot agent mode in VS Code. Default: **Local**.

## Prerequisites

### Local

- [Local (npm / npx) guide](../local-npm.md): start here if you have not set it up yet.
- VS Code 1.99+ with GitHub Copilot
- Node.js 22+

### Server

- [Server (Docker) guide](../server-docker.md): start here if you have not set it up yet.
- VS Code 1.99+ with GitHub Copilot

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

1. Run MCP: Open User Configuration from the Command Palette
2. Add the polarion entry from the snippet, merging with existing content
3. Replace YOUR-POLARION and YOUR_POLARION_PAT, then save
4. Run MCP: List Servers, select polarion, choose Start Server and trust it
5. In Copilot Chat, switch to Agent mode and tick the polarion tools

```json
{
  "servers": {
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

Node.js 22+ is required. VS Code uses a servers object. Select the tools you need in chat; the full catalog can exceed the client tool budget.

### Server

1. Run MCP: Open User Configuration from the Command Palette
2. Add the polarion entry from the snippet, merging with existing content
3. Replace YOUR-SERVER and YOUR_POLARION_PAT, then save
4. Run MCP: List Servers, select polarion, choose Start Server and trust it
5. In Copilot Chat, switch to Agent mode and tick the polarion tools

```json
{
  "servers": {
    "polarion": {
      "type": "http",
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

Expected: The assistant calls a Polarion tool and lists project names.

### Server

Ask your assistant: `Which Polarion user am I? Use getCurrentUser.`

Expected: The assistant calls a Polarion tool and lists project names.

## If it fails

### Local

| Symptom | Fix |
|---|---|
| No Polarion tools in the tools list | Run MCP: List Servers, select polarion, choose Show Output. After edits choose Restart Server. |
| 'npx not found' or 'command not found' | Install Node.js 22+, then fully quit and reopen the app. |

### Server

| Symptom | Fix |
|---|---|
| No Polarion tools in the tools list | Run MCP: List Servers, select polarion, choose Show Output. After edits choose Restart Server. |
| Copilot Business/Enterprise: MCP blocked | Your organisation must enable the policy 'MCP servers in Copilot'. Ask your GitHub admin. |

## Sources

Checked against the vendor documentation on 2026-10-24.

- [Official documentation 1](https://code.visualstudio.com/docs/agents/reference/mcp-configuration)
- [Official documentation 2](https://code.visualstudio.com/docs/copilot/customization/mcp-servers)
- [Official documentation 3](https://code.visualstudio.com/docs/agents/run/manage-mcp-servers)
- [Official documentation 4](https://docs.github.com/en/copilot/how-tos/provide-context/use-mcp-in-your-ide/extend-copilot-chat-with-mcp)

Not confirmed in the vendor documentation:

- Docs do not give the file path of the user mcp.json per OS (steps rely on the command MCP: Open User Configuration). The docs mark user-profile mcp.json as 'deprecated in the guided flow' in favour of ~/.copilot/mcp-config.json (top-level mcpServers); the reference page still documents MCP: Open User Configuration, so it is used here.
- Exact wording of the trust prompt is not documented.
- Whether the tools icon is still at the top left of the chat box and the mode dropdown still reads Agent in the newest VS Code (taken from the GitHub Docs page; the VS Code page mentions 'Configure Tools' / Chat: Open Customizations > Tools instead).
- The minimum VS Code version 1.99 is from the GitHub Docs page and may be outdated.

Back to the [client index](../../clients.md).
