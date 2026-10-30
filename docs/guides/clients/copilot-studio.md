# Connect Microsoft Copilot Studio

Microsoft Copilot Studio agents for your team. Default: **Server**.

Official documentation: [learn.microsoft.com](https://learn.microsoft.com/en-us/microsoft-copilot-studio/mcp-add-existing-server-to-agent), [learn.microsoft.com](https://learn.microsoft.com/en-us/microsoft-copilot-studio/agent-extend-action-mcp), [learn.microsoft.com](https://learn.microsoft.com/en-us/microsoft-copilot-studio/mcp-add-components-to-agent)

Verification status:

- Server: verified by documentation only

Generative orchestration must be on (it is the default for new agents); MCP tools cannot be called from topics. Only the Streamable transport is supported (SSE is not). Microsoft caps the tools per agent (the limit is 128) and 25 to 30 give the best results, but this server offers more than that by default: narrow it first with MCP_TOOLSETS or MCP_READ_ONLY, then select only the tools your agent needs. Alternative: Add a tool > New tool > Custom connector with an OpenAPI file (Power Apps).

- **Local is not supported:** Cloud service; it cannot run npx. Use the Docker or Remote URL mode.

## Prerequisites

### Server

- [Server (Docker) guide](../server-docker.md): start here if you have not set it up yet.
- A Copilot Studio agent you can edit, with generative orchestration turned on
- A Copilot Studio licence (tenant licence plus a per-user licence; a trial can build and test but not publish; guest users cannot use Copilot Studio)
- Server on a public HTTPS /mcp URL that speaks Streamable HTTP
- Power Platform data policies that allow the connector

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

### Server

1. Open your agent in Copilot Studio and go to the Tools page
2. Select Add a tool > New tool > Model Context Protocol. The MCP onboarding wizard opens
3. Enter a Server name, a Server description and Server URL https://YOUR-SERVER/mcp. The orchestrator uses the description to decide when to call the server, so say what Polarion data it covers
4. Under authentication choose API key, set Type to Header and enter Authorization as the header name
5. Select Create. The Add tool dialog appears
6. Select Create a new connection (or pick an existing one) and enter Bearer YOUR_POLARION_PAT as the API key value
7. Select Add to agent (the list flow labels it Add and configure). The server's settings page opens
8. On the settings page, check the Tools list. All tools are on (Allow all). To limit them, turn off Allow all and switch off the tools you do not need; tools added to the server later then stay off
9. Under Details, leave Authentication on End user so each person supplies their own PAT. Optionally set Ask the end user before running
10. Test the agent with the prompt under Verify

```
https://YOUR-SERVER/mcp

Header name:  Authorization
API key value: Bearer YOUR_POLARION_PAT
```

Generative orchestration must be on (it is the default for new agents); MCP tools cannot be called from topics. Only the Streamable transport is supported (SSE is not). Microsoft caps the tools per agent (the limit is 128) and 25 to 30 give the best results, but this server offers more than that by default: narrow it first with MCP_TOOLSETS or MCP_READ_ONLY, then select only the tools your agent needs. Alternative: Add a tool > New tool > Custom connector with an OpenAPI file (Power Apps).

## Check

### Server

Ask your assistant: `Which Polarion user am I? Use getCurrentUser.`

Expected: The assistant calls getCurrentUser and shows your Polarion user. A 403 means this account lacks global REST read access; see Troubleshooting.

## If it fails

### Server

| Symptom | Fix |
|---|---|
| The tool cannot be added or is greyed out in Add a tool | A Power Platform data policy regulates connectors, and MCP access relies on connectors. Select the information icon next to the tool to see the policy and ask your Power Platform administrator. |
| Copilot Studio cannot reach the server | The server must be reachable over public HTTPS. http://localhost:3000/mcp will not work. |
| 401 "Polarion did not accept this token" | The PAT was cut off, has expired or is for another Polarion. Create a new token and paste it unchanged. |
| The agent never calls a Polarion tool | Check that generative orchestration is on and that the tool is enabled on its settings page. The orchestrator relies on the server and tool descriptions; Copilot Studio does not let you edit MCP tool descriptions. |
| Some Polarion tools are missing from the Tools list | Microsoft documents that tools with reference-type inputs in their schema are filtered out, array-typed type fields are truncated and enum inputs are read as strings. Fixes belong on the server side. |
| Every user is asked to create a connection | This is expected with Authentication set to End user: each person supplies their own PAT. Maker-provided would share your credentials. |

## Sources

Checked against the vendor documentation on 2026-10-30.

- [Official documentation 1](https://learn.microsoft.com/en-us/microsoft-copilot-studio/mcp-add-existing-server-to-agent)
- [Official documentation 2](https://learn.microsoft.com/en-us/microsoft-copilot-studio/agent-extend-action-mcp)
- [Official documentation 3](https://learn.microsoft.com/en-us/microsoft-copilot-studio/mcp-add-components-to-agent)
- [Official documentation 4](https://learn.microsoft.com/en-us/microsoft-copilot-studio/mcp-troubleshooting)
- [Official documentation 5](https://learn.microsoft.com/en-us/microsoft-copilot-studio/add-tools-custom-agent)
- [Official documentation 6](https://learn.microsoft.com/en-us/microsoft-copilot-studio/requirements-licensing)

Not confirmed in the vendor documentation:

- Microsoft's page (updated 2026-10-15) does not state the label of the API key value field in the Create a new connection dialog or that the value is sent unchanged; 'Bearer PAT' is inferred from the Header option description.
- Microsoft documents no test procedure specific to MCP servers; the verify step relies on generative orchestration choosing the tool.
- The wizard also offers OAuth 2.0 (Dynamic discovery, Dynamic, Manual); the PAT path was chosen to avoid callback setup. Microsoft says a callback URL may appear for Dynamic and Manual but does not mention one for Dynamic discovery; whether this server's OAuth works with Copilot Studio is not verified.
- The MCP pages do not state how MCP tool calls are billed (Copilot Credits) or any regional availability; they point to the separate licensing guide.
- Not checked whether this server's tool schemas hit the documented Copilot Studio schema limits (reference-type inputs, array-typed type fields, integer exclusiveMinimum).

Back to the [client index](../../clients.md).
