# Connect Microsoft Copilot Studio

Microsoft Copilot Studio agents for your team. Default: **Server**.

Use generative orchestration. This path uses a PAT header and does not require an OAuth callback. Select only the tools your agent needs.

- **Local is not supported:** Cloud service; it cannot run npx. Use the Docker or Remote URL mode.

## Prerequisites

### Server

- [Server (Docker) guide](../server-docker.md): start here if you have not set it up yet.
- A Copilot Studio agent you can edit
- Server on a public HTTPS /mcp URL

Server example (Docker team server):

```bash
docker run -d --name polarion-mcp \
  -p 127.0.0.1:3000:3000 \
  -e API_BASE_URL=https://polarion.company.example/polarion/rest/v1 \
  -e MCP_ALLOWED_HOSTS=localhost:3000,127.0.0.1:3000 \
  ghcr.io/phillipboesger/polarion-mcp:1.4.4
```

The image starts Streamable HTTP at http://localhost:3000/mcp. Each caller sends their own Polarion PAT. For team access, proxy HTTPS to the loopback port, forward the public Host, and add your public hostname to MCP_ALLOWED_HOSTS. Cloud connectors also need OAuth; their Docker choice includes that configuration.

## Steps

### Server

1. Open your agent, go to Tools, then Add a tool > New tool > Model Context Protocol
2. Enter a Server name, a Server description and Server URL https://YOUR-SERVER/mcp
3. Under authentication choose API key, Type Header, header name Authorization
4. Select Create > Create a new connection, enter Bearer YOUR_POLARION_PAT
5. Select Add to agent and test in the test pane

```
https://YOUR-SERVER/mcp

Header name:  Authorization
API key value: Bearer YOUR_POLARION_PAT
```

Use generative orchestration. Select only the tools your agent needs.

## Check

### Server

Ask your assistant: `Which Polarion user am I? Use getCurrentUser.`

Expected: The assistant calls getCurrentUser and shows your Polarion user. A 403 means this account lacks global REST read access; see Troubleshooting.

## If it fails

### Server

| Symptom | Fix |
|---|---|
| The tool cannot be added | Your Power Platform data policy may block the connector. Ask your Power Platform administrator. |
| Copilot Studio cannot reach the server | The server must be reachable over public HTTPS. http://localhost:3000/mcp will not work. |

## Sources

Checked against the vendor documentation on 2026-10-24.

- [Official documentation](https://learn.microsoft.com/en-us/microsoft-copilot-studio/mcp-add-existing-server-to-agent)

Not confirmed in the vendor documentation:

- Microsoft's page (updated 2026-10-15) does not state the exact label of the API key value field in the Create a new connection dialog or that the value is sent unchanged; the 'Bearer PAT' value is inferred from the Header option description.
- The page does not mention generative orchestration (kept out of the steps) or any licence requirement; it only says the article applies to agents on the standard harness.
- The page has no test procedure; the test-pane step is generic.
- Server must not need OAuth: the wizard also offers OAuth 2.0 (Dynamic discovery, Dynamic, Manual) but the PAT path was chosen to avoid callback setup. Whether this server's OAuth works with Copilot Studio is not verified (no verified callback URL).

Back to the [client index](../../clients.md).
