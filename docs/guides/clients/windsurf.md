# Connect Windsurf / Cascade

Windsurf editor. Default: **Local**.

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
  ghcr.io/phillipboesger/polarion-mcp:1.4.5
```

The image starts Streamable HTTP at http://localhost:3000/mcp. Each caller sends their own Polarion PAT. For team access, proxy HTTPS to the loopback port, forward the public Host, and add your public hostname to MCP_ALLOWED_HOSTS. Cloud connectors also need OAuth; their Docker choice includes that configuration.

## Steps

### Local

1. Open the legacy Cascade panel (not the Devin Local agent).
2. Click ... (Actions) > MCPs > Open MCP config file.
3. Add the polarion entry to mcpServers; replace YOUR-POLARION and YOUR_POLARION_PAT.
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

### Server

1. Open the legacy Cascade panel (not the Devin Local agent).
2. Click ... (Actions) > MCPs > Open MCP config file.
3. Add the polarion entry to mcpServers; replace YOUR-SERVER and YOUR_POLARION_PAT.
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

Remote MCP uses per-user PATs. The client must be able to reach this URL.

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
| Too many tools: some are missing | Cascade allows 100 enabled tools in total. Switch off other servers or use disabledTools. |
| Nothing changes in Devin Local agent | This config only applies to the legacy Cascade agent. |
| 401 "Polarion did not accept this token" | The PAT was cut off, has expired or is for another Polarion. Create a new token and paste it unchanged. |

### Server

| Symptom | Fix |
|---|---|
| 401 or 'Polarion did not accept this token' | PAT is wrong, expired or revoked. Create a new PAT in Polarion and paste it again. |
| Server shows an error or never connects | Open the /mcp address in a browser. If it does not load, the address is wrong or unreachable. |

## Sources

Checked against the vendor documentation on 2026-10-24.

- [Official documentation](https://docs.windsurf.com/windsurf/cascade/mcp)

Not confirmed in the vendor documentation:

- Windsurf docs now live at docs.devin.ai and describe the Cascade MCP config as applying only to the legacy Cascade agent. How to add an MCP server for the Devin Local agent (Devin CLI config files) was not fetched and is not covered.
- The older path ~/.codeium/windsurf/mcp_config.json (seen on a VS Code docs page as a discovery source) is not given by the current Devin page; it may still work for older installs.
- The page does not mention a refresh button; the toggle in the MCPs section is used instead.
- Docs do not state the exact appearance of the Actions (...) menu in the newest Devin Desktop build.

Back to the [client index](../../clients.md).
