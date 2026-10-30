# Connect GitHub Copilot

GitHub Copilot agent mode in VS Code, Visual Studio, JetBrains IDEs, Eclipse and Xcode. Default: **Local**.

Verification status:

- Local: verified by documentation only
- Server: verified by documentation only

MCP works in VS Code, Visual Studio, JetBrains IDEs, Xcode and Eclipse. On Copilot Business and Enterprise an organization policy ("MCP servers in Copilot") is off by default and an admin must enable it; Copilot Free, Pro, Pro+ and Max are not governed by it. JetBrains AI Assistant is a separate client.

## IDE variants

The snippets below are the same in every IDE. Only the way to open the configuration and the minimum version differ.

### VS Code

Needs: VS Code 1.99+ with GitHub Copilot.

1. Run MCP: Open User Configuration from the Command Palette (it opens the user profile mcp.json). For one repository use .vscode/mcp.json in the repo root (MCP: Open Workspace Folder MCP Configuration).
2. Then continue with the steps below. MCP: Add Server and Chat: Open Customizations > MCP Servers > Add Server are guided alternatives.

### Visual Studio

Needs: Visual Studio 2022 17.14+ or Visual Studio 2026, signed in to GitHub.

1. In Copilot Chat switch to Agent mode, open the tools icon and select the plus button, then Add custom MCP server (Visual Studio 2022: the Add MCP server dialog). Enter the server ID, type (HTTP/SSE or stdio) and URL or command.
2. Or create %USERPROFILE%\.mcp.json (all solutions), <SOLUTIONDIR>\.mcp.json (shared in source control) or <SOLUTIONDIR>\.vs\mcp.json (just you), paste the snippet and use the Authentication Required or Manage Authentication CodeLens for OAuth servers (enable CodeLens under Tools > Options > Text Editor if it is missing).

### JetBrains IDEs

Needs: A JetBrains IDE listed by GitHub (IntelliJ IDEA, PyCharm, WebStorm, GoLand, Rider and others) with the GitHub Copilot plugin; GitHub publishes no minimum version.

1. Click the Copilot icon in the lower-right corner, choose Open Chat, make sure Agent mode is on and click the tools icon (Configure your MCP server), then Add MCP Tools.
2. Define the server in the opened mcp.json. For a remote server use the requestInit variant under the alternative setup.

### Eclipse

Needs: Eclipse 2024-09+ with the GitHub Copilot plugin.

1. Click the Copilot icon in the status bar, choose Open Chat and click the Configure Tools icon, or choose Edit preferences, expand GitHub Copilot and click MCP.
2. Under Server Configurations paste the server definition. For a remote server use the requestInit variant under the alternative setup.

### Xcode

Needs: Xcode with the GitHub Copilot for Xcode extension; GitHub publishes no minimum version.

1. Open the GitHub Copilot for Xcode settings (Editor > GitHub Copilot > Open GitHub Copilot for Xcode Settings, or the gear icon in Copilot Chat), select the MCP tab and click Edit Config.
2. Edit mcp.json. For a remote server use the requestInit variant under the alternative setup.

## Prerequisites

### Local

- [Local (npm / npx) guide](../local-npm.md): start here if you have not set it up yet.
- GitHub Copilot with MCP access in VS Code 1.99+, Visual Studio 2022 17.14+ or 2026, a JetBrains IDE, Eclipse 2024-09+ or Xcode (see the IDE list)
- Node.js 22+ (npx must be on the PATH of the IDE)

### Server

- [Server (Docker) guide](../server-docker.md): start here if you have not set it up yet.
- GitHub Copilot with MCP access in VS Code 1.99+, Visual Studio 2022 17.14+ or 2026, a JetBrains IDE, Eclipse 2024-09+ or Xcode (see the IDE list)

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

1. Open the MCP configuration for your IDE (see IDE variants below; in VS Code run MCP: Open User Configuration).
2. Add the polarion entry from the snippet, merging with existing content. Use one location per server: duplicates can conflict.
3. Replace the placeholders and save.
4. VS Code: run MCP: List Servers, select polarion, choose Start Server and confirm the trust prompt (or select Start above the server in mcp.json). Visual Studio: saving valid JSON restarts the agent. Other IDEs: save the file.
5. In Copilot Chat switch to Agent mode and open the tools icon (VS Code also offers Configure Tools). Confirm the polarion tools are listed and tick the ones you need; Visual Studio keeps tools disabled until you enable them.
6. Run the prompt under Verify and approve the tool call (Continue in VS Code, Allow or Confirm in Visual Studio).

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

Prefer a user-level file so the PAT is not committed. In VS Code format an inputs entry of type promptString can prompt for the token instead of storing it.

### Server

1. Open the MCP configuration for your IDE (see IDE variants below; in VS Code run MCP: Open User Configuration).
2. Add the polarion entry from the snippet, merging with existing content. Use one location per server: duplicates can conflict.
3. Replace the placeholders and save.
4. VS Code: run MCP: List Servers, select polarion, choose Start Server and confirm the trust prompt (or select Start above the server in mcp.json). Visual Studio: saving valid JSON restarts the agent. Other IDEs: save the file.
5. In Copilot Chat switch to Agent mode and open the tools icon (VS Code also offers Configure Tools). Confirm the polarion tools are listed and tick the ones you need; Visual Studio keeps tools disabled until you enable them.
6. Run the prompt under Verify and approve the tool call (Continue in VS Code, Allow or Confirm in Visual Studio).

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

Remote MCP uses per-user PATs. The client must be able to reach this URL. In VS Code format an inputs entry of type promptString can prompt for the token instead of storing it. Custom servers in JetBrains, Eclipse and Xcode: use the requestInit variant below.

#### Alternative: JetBrains, Eclipse and Xcode: remote server with requestInit headers

GitHub's documentation for these IDEs puts remote headers under requestInit.headers instead of the VS Code format. Needs: GitHub Copilot in a JetBrains IDE, Eclipse or Xcode.

1. Open the MCP configuration for your IDE (see IDE variants below).
2. Add the polarion entry from this snippet, merging with existing content, and replace YOUR-SERVER and YOUR_POLARION_PAT.
3. Save, then open the tools icon in Copilot Chat (Agent mode) and confirm the polarion tools are listed.

```json
{
  "servers": {
    "polarion": {
      "url": "https://YOUR-SERVER/mcp",
      "requestInit": {
        "headers": {
          "Authorization": "Bearer YOUR_POLARION_PAT"
        }
      }
    }
  }
}
```

Taken from GitHub Docs (remote server with a PAT). Not tested against this server.

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
| 'npx not found' or 'command not found' | Install Node.js 22+, then fully quit and reopen the IDE. Stdio servers need the runtime on the PATH of the IDE's environment. |
| No Polarion tools in the tools list | VS Code: run MCP: List Servers, select polarion, choose Show Output; after edits choose Restart Server. Check the server status shows Running. Visual Studio: enable the tools in the tool picker. |
| Copilot Business/Enterprise: MCP blocked | Your organisation must enable the policy 'MCP servers in Copilot' (off by default; Free, Pro, Pro+ and Max are not governed by it). An enterprise MCP allowlist can also block the server; local configuration cannot override it. Ask your GitHub admin. |
| 401 "Polarion did not accept this token" | The PAT was cut off, has expired or is for another Polarion. Create a new token and paste it unchanged. |

### Server

| Symptom | Fix |
|---|---|
| No Polarion tools in the tools list | VS Code: run MCP: List Servers, select polarion, choose Show Output; after edits choose Restart Server. Check the server status shows Running. Visual Studio: enable the tools in the tool picker. |
| Copilot Business/Enterprise: MCP blocked | Your organisation must enable the policy 'MCP servers in Copilot' (off by default; Free, Pro, Pro+ and Max are not governed by it). An enterprise MCP allowlist can also block the server; local configuration cannot override it. Ask your GitHub admin. |
| The server cannot be reached | The URL must be reachable from your machine over HTTPS. Check the endpoint and your network or proxy. |
| 401 "Polarion did not accept this token" | The PAT was cut off, has expired or is for another Polarion. Create a new token and paste it unchanged. |

## Sources

Checked against the vendor documentation on 2026-10-30.

- [Official documentation 1](https://code.visualstudio.com/docs/agents/reference/mcp-configuration)
- [Official documentation 2](https://code.visualstudio.com/docs/copilot/customization/mcp-servers)
- [Official documentation 3](https://code.visualstudio.com/docs/agents/run/manage-mcp-servers)
- [Official documentation 4](https://docs.github.com/en/copilot/how-tos/provide-context/use-mcp-in-your-ide/extend-copilot-chat-with-mcp)
- [Official documentation 5](https://docs.github.com/en/copilot/concepts/context/mcp)
- [Official documentation 6](https://learn.microsoft.com/en-us/visualstudio/ide/mcp-servers)
- [Official documentation 7](https://learn.microsoft.com/en-us/visualstudio/ide/visual-studio-github-copilot-troubleshoot)

Not confirmed in the vendor documentation:

- Microsoft gives no per-OS file path for the VS Code user profile mcp.json (only the command MCP: Open User Configuration). The guided MCP: Add Server flow now writes to ~/.copilot/mcp-config.json (mcpServers key) and labels the user-profile mcp.json deprecated there; the snippet keeps the VS Code servers format.
- The exact wording of the VS Code trust prompt is not documented (only 'Only trust configurations you have reviewed').
- GitHub publishes no minimum version for JetBrains or the Xcode extension, and no tool-count limit for IDEs appears on the pages read.
- Whether JetBrains, Eclipse and Xcode accept the VS Code keys type, headers and env is not documented; GitHub shows only url with requestInit.headers (remote) and command with args (local) for them, so the main snippet is untested there.
- The Visual Studio page shows only a url entry plus OAuth; header support in .mcp.json is not stated, and the page describes the format inconsistently (servers object in the example, array of server objects in the text).
- Earlier versions of this entry called Eclipse, JetBrains and Visual Studio support public preview; the current GitHub and Visual Studio pages do not state a preview status.

Back to the [client index](../../clients.md).
