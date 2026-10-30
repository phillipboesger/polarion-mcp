# Connect GitHub Copilot

GitHub Copilot agent mode in VS Code, Eclipse, JetBrains IDEs and Visual Studio. Default: **Local**.

MCP support is generally available in VS Code; Eclipse, JetBrains IDEs and Visual Studio are in public preview. On Copilot Business and Enterprise an organization policy ("MCP servers in Copilot") is off by default and an admin must enable it. JetBrains AI Assistant is a separate client.

## IDE variants

The snippets below are the same in every IDE. Only the way to open the configuration and the minimum version differ.

### VS Code

Needs: VS Code 1.99+ with GitHub Copilot.

1. Run MCP: Open User Configuration from the Command Palette, then continue with the steps below.

### Eclipse

Needs: Eclipse 2024-09+ with the GitHub Copilot plugin.

1. Open the Copilot menu in the status bar and choose Edit Preferences.
2. Under GitHub Copilot, open MCP and paste the JSON from the snippet into the server configuration field.

### JetBrains IDEs

Needs: A JetBrains IDE with the GitHub Copilot plugin (check the plugin page for the current minimum).

1. Click the Copilot icon in the status bar, then Edit settings > Model Context Protocol (MCP) > Configure.
2. Paste the JSON from the snippet into the opened mcp.json.

### Visual Studio

Needs: Visual Studio 2022 17.14+ with GitHub Copilot.

1. In Copilot Chat, switch to Agent mode and click the tools icon, then Add MCP server (or create a .mcp.json next to your solution).
2. Paste the JSON from the snippet; Visual Studio also reads the servers key from .mcp.json.

## Prerequisites

### Local

- [Local (npm / npx) guide](../local-npm.md): start here if you have not set it up yet.
- GitHub Copilot in VS Code 1.99+, Eclipse, a JetBrains IDE or Visual Studio (see the IDE list)
- Node.js 22+

### Server

- [Server (Docker) guide](../server-docker.md): start here if you have not set it up yet.
- GitHub Copilot in VS Code 1.99+, Eclipse, a JetBrains IDE or Visual Studio (see the IDE list)

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

The top-level key is `servers`, not `mcpServers`. Select the tools you need in chat; the full catalog can exceed the client tool budget.

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

Expected: The assistant calls a Polarion tool and shows your Polarion user.

### Server

Ask your assistant: `Which Polarion user am I? Use getCurrentUser.`

Expected: The assistant calls a Polarion tool and shows your Polarion user.

## If it fails

### Local

| Symptom | Fix |
|---|---|
| No Polarion tools in the tools list | Run MCP: List Servers, select polarion, choose Show Output. After edits choose Restart Server. |
| 'npx not found' or 'command not found' | Install Node.js 22+, then fully quit and reopen the app. |
| 401 "Polarion did not accept this token" | The PAT was cut off, has expired or is for another Polarion. Create a new token and paste it unchanged. |

### Server

| Symptom | Fix |
|---|---|
| No Polarion tools in the tools list | Run MCP: List Servers, select polarion, choose Show Output. After edits choose Restart Server. |
| Copilot Business/Enterprise: MCP blocked | Your organisation must enable the policy 'MCP servers in Copilot'. Ask your GitHub admin. |
| 401 "Polarion did not accept this token" | The PAT was cut off, has expired or is for another Polarion. Create a new token and paste it unchanged. |

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
- Eclipse minimum (2024-09) is from GitHub Docs; the JetBrains and Visual Studio minimum versions and the exact menu labels come from release notes and third-party guides and are not re-checked here.
- The snippet uses the servers key (VS Code format). JetBrains and Eclipse accept the same key in GitHub Docs examples; Visual Studio .mcp.json support for http headers was not confirmed.

Back to the [client index](../../clients.md).
