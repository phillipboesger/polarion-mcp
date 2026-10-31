# Connect Windsurf / Cascade

Windsurf editor. Default: **Local**.

Official documentation: [docs.windsurf.com](https://docs.windsurf.com/windsurf/cascade/mcp), [docs.windsurf.com](https://docs.windsurf.com/fr/windsurf/cascade/mcp), [docs.devin.ai](https://docs.devin.ai/desktop/cascade/mcp)

Verification status:

- Local: verified by documentation only
- Server: verified by documentation only

The vendor now documents this as legacy Cascade in Devin Desktop. Its 100-tool budget requires selecting a subset of Polarion tools. This config does not apply to the Devin Local agent.

## Prerequisites

### Local

- [Local (npm / npx) guide](../local-npm.md): start here if you have not set it up yet.
- Windsurf / Devin Desktop, legacy Cascade agent
- Node.js 22 or newer

### Server

- [Server (Docker) guide](../server-docker.md): start here if you have not set it up yet.
- Windsurf / Devin Desktop, legacy Cascade agent
- The https://.../mcp address from your admin

Server example (Docker team server):

```bash
docker run -d --name polarion-mcp \
  -p 127.0.0.1:3000:3000 \
  -e API_BASE_URL=https://polarion.company.example/polarion/rest/v1 \
  -e MCP_ALLOWED_HOSTS=localhost:3000,127.0.0.1:3000 \
  ghcr.io/phillipboesger/polarion-mcp:1.5.0
```

The image starts Streamable HTTP at http://localhost:3000/mcp. Each caller sends their own Polarion PAT. For team access, proxy HTTPS to the loopback port, forward the public Host, and add your public hostname to MCP_ALLOWED_HOSTS. Cloud connectors also need OAuth; their Docker choice includes that configuration.

## Steps

### Local

1. Open the legacy Cascade panel (not the Devin Local agent). On Enterprise, an admin must have enabled MCP first.
2. Click ... (Actions) > MCPs > Open MCP config file, or edit ~/.codeium/windsurf/mcp_config.json directly.
3. Add the polarion entry to mcpServers; replace YOUR-POLARION and YOUR_POLARION_PAT. ${env:NAME} is resolved in command, args, env, serverUrl, url and headers.
4. Save, then switch on the polarion toggle under MCPs.
5. Ask the test prompt in Cascade.

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

Cascade allows 100 enabled tools in total. This config does not apply to the Devin Local agent.

#### Alternative: Devin Local agent / Devin CLI

For the Devin Local agent in Devin Desktop. Servers appear under Customize > MCPs. The Devin CLI documents the file format; whether Devin Desktop reads the same file is not documented, so check the MCPs tab afterwards. Needs: Devin Desktop (Devin Local agent) or Devin CLI. Needs: Node.js 22 or newer.

1. Put the PAT in a gitignored file: .devin/mcp_config.local.json in your project (user scope: ~/.config/devin/mcp_config.json, on Windows %APPDATA%\devin\mcp_config.json).
2. Add the polarion entry; replace YOUR-POLARION and YOUR_POLARION_PAT. Never commit the PAT.
3. In Devin Desktop open Customize in the agent sidebar > MCPs, pick Install MCPs for > This computer and switch polarion on (refresh the list if needed). In the CLI run devin mcp list.
4. Approve the tool call when the agent asks; MCP tools need approval by default.

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

Devin versions before v3000.3 used mcpServers inside .devin/config.json and ~/.config/devin/config.json; newer versions migrate those entries to mcp_config.json.

### Server

1. Open the legacy Cascade panel (not the Devin Local agent). On Enterprise, an admin must have enabled MCP first.
2. Click ... (Actions) > MCPs > Open MCP config file, or edit ~/.codeium/windsurf/mcp_config.json directly.
3. Add the polarion entry to mcpServers; replace YOUR-SERVER and YOUR_POLARION_PAT. The URL must end in /mcp. serverUrl and url are both accepted.
4. Save, then switch on the polarion toggle under MCPs.
5. Ask the test prompt in Cascade.

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

Remote MCP uses per-user PATs. The client must be able to reach this URL. Cascade resolves ${env:NAME} in serverUrl and headers, so Bearer ${env:POLARION_PAT} keeps the token out of the file.

#### Alternative: Devin Local agent / Devin CLI

For the Devin Local agent in Devin Desktop. The Devin CLI documents the file format; whether Devin Desktop reads the same file is not documented, so check Customize > MCPs afterwards. Needs: Devin Desktop (Devin Local agent) or Devin CLI. Needs: The https://.../mcp address from your admin.

1. Put the PAT in a gitignored file: .devin/mcp_config.local.json in your project (user scope: ~/.config/devin/mcp_config.json, on Windows %APPDATA%\devin\mcp_config.json).
2. Add the polarion entry; replace YOUR-SERVER and YOUR_POLARION_PAT. Never commit the PAT. transport http tries Streamable HTTP first and falls back to SSE after a non-auth 4xx.
3. In Devin Desktop open Customize in the agent sidebar > MCPs and switch polarion on (refresh the list if needed). In the CLI run devin mcp list.
4. Approve the tool call when the agent asks; MCP tools need approval by default.

```json
{
  "mcpServers": {
    "polarion": {
      "url": "https://YOUR-SERVER/mcp",
      "transport": "http",
      "headers": {
        "Authorization": "Bearer YOUR_POLARION_PAT"
      }
    }
  }
}
```

A 401 is reported directly with no SSE fallback. Devin Desktop supports stdio, Streamable HTTP and SSE.

## Check

### Local

Ask your assistant: `Which Polarion user am I? Use getCurrentUser.`

Expected: The assistant calls getCurrentUser and shows your Polarion user. A 403 means this account lacks global REST read access; see Troubleshooting.

### Server

Ask your assistant: `Which Polarion user am I? Use getCurrentUser.`

Expected: The assistant calls getCurrentUser and shows your Polarion user. A 403 means this account lacks global REST read access; see Troubleshooting.

## If it fails

### Local

| Symptom | Fix |
|---|---|
| Too many tools: some are missing | Cascade allows 100 enabled tools in total across all MCP servers. Switch off other servers, or open the MCPs page, select the server and switch off individual tools. |
| Nothing changes in Devin Local agent | This mcp_config.json only applies to the legacy Cascade agent. For the Devin Local agent use Customize > MCPs or the alternative below. |
| MCP is missing or disabled on a team plan | On Teams and Enterprise, admins control MCP access and may keep an allowlist; once one server is allowlisted, all others are blocked. The Server ID must match your mcp_config.json key (polarion) exactly, including case. |
| 401 "Polarion did not accept this token" | The PAT was cut off, has expired or is for another Polarion. Create a new token and paste it unchanged. |

### Server

| Symptom | Fix |
|---|---|
| Too many tools: some are missing | Cascade allows 100 enabled tools in total across all MCP servers. Switch off other servers, or open the MCPs page, select the server and switch off individual tools. |
| Nothing changes in Devin Local agent | This mcp_config.json only applies to the legacy Cascade agent. For the Devin Local agent use Customize > MCPs or the alternative below. |
| MCP is missing or disabled on a team plan | On Teams and Enterprise, admins control MCP access and may keep an allowlist; once one server is allowlisted, all others are blocked. The Server ID must match your mcp_config.json key (polarion) exactly, including case. |
| 401 or 'Polarion did not accept this token' | PAT is wrong, expired or revoked. Create a new PAT in Polarion and paste it again. |
| Server shows an error or never connects | Open the /mcp address in a browser. If it does not load, the address is wrong or unreachable. |

## Sources

Checked against the vendor documentation on 2026-10-30.

- [Official documentation 1](https://docs.windsurf.com/windsurf/cascade/mcp)
- [Official documentation 2](https://docs.windsurf.com/fr/windsurf/cascade/mcp)
- [Official documentation 3](https://docs.devin.ai/desktop/cascade/mcp)
- [Official documentation 4](https://docs.devin.ai/cli/extensibility/mcp/configuration)

Not confirmed in the vendor documentation:

- docs.windsurf.com now redirects to docs.devin.ai/desktop/cascade/mcp, which at fetch time returned the Devin Local customizations page, not the Cascade MCP page. The Cascade details above (mcp_config.json path, serverUrl, Actions menu, ${env:} interpolation, 100-tool limit, admin allowlist) come from the earlier Cascade page and an older docs.windsurf.com/fr copy; they could not be re-checked on a current English page.
- The older Cascade copy describes the entry as the MCPs icon in the Cascade panel or Windsurf Settings > Cascade > MCP Servers; the Actions (...) > Open MCP config file wording is not confirmed on a current page.
- The Devin Local page names .devin/config.json, .devin/config.local.json and ~/.config/devin/config.json as MCP config files, while the Devin CLI page names mcp_config.json files (and migration from config.json since v3000.3). Which file the Devin Desktop app reads is not documented.
- The Devin Local page gives no JSON schema, no Windows path and no tool limit; the schema comes from the Devin CLI page.
- Whether ${env:} works in Devin headers is not documented (Devin CLI docs show it only for OAuth fields).
- No plan requirement is documented beyond admin controls for Teams and Enterprise.

Back to the [client index](../../clients.md).
