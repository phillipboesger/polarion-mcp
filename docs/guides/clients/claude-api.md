# Connect Claude API

Your own code calling the Claude Messages API. Default: **Server**.

Official documentation: [platform.claude.com](https://platform.claude.com/docs/en/agents-and-tools/mcp-connector)

Verification status:

- Server: verified by documentation only

- **Local is not supported:** Only public HTTP servers work; local stdio cannot connect.

## Prerequisites

### Server

- [Server (Docker) guide](../server-docker.md): start here if you have not set it up yet.
- Anthropic API key
- Public HTTPS MCP server address (must start with https://)

Server example (Public HTTPS server for cloud APIs):

```bash
docker run -d --name polarion-mcp \
  -p 127.0.0.1:3000:3000 \
  -e API_BASE_URL=https://polarion.company.example/polarion/rest/v1 \
  -e MCP_ALLOWED_HOSTS=YOUR-SERVER \
  -e TRUST_PROXY=1 \
  ghcr.io/phillipboesger/polarion-mcp:1.5.0
```

Required for cloud API calls: a publicly reachable HTTPS endpoint at https://YOUR-SERVER/mcp. Configure a TLS reverse proxy to 127.0.0.1:3000, forward the public Host and use a real public hostname in MCP_ALLOWED_HOSTS. TRUST_PROXY=1 assumes exactly one trusted hop. Each API request sends your Polarion PAT; OAuth is not required for this PAT-header path.

## Steps

### Server

1. Set ANTHROPIC_API_KEY to your Anthropic API key.
2. Add mcp_servers (type url, https:// URL, unique name, authorization_token) and one matching tools entry of type mcp_toolset; send header anthropic-beta: mcp-client-2025-11-20 (or betas in the SDK).
3. Replace YOUR_CLAUDE_MODEL with a model name from the Anthropic docs that supports the MCP connector (the vendor example uses claude-opus-5-5).
4. Send the request, for example with the curl command.
5. Look for mcp_tool_use and mcp_tool_result blocks in the response.

```bash
curl https://api.anthropic.com/v1/messages \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "anthropic-beta: mcp-client-2025-11-20" \
  -d '{
    "model": "YOUR_CLAUDE_MODEL",
    "max_tokens": 1000,
    "messages": [{"role": "user", "content": "Which Polarion user am I? Use getCurrentUser."}],
    "mcp_servers": [
      {
        "type": "url",
        "name": "polarion",
        "url": "https://YOUR-SERVER/mcp",
        "authorization_token": "YOUR_POLARION_PAT"
      }
    ],
    "tools": [
      {"type": "mcp_toolset", "mcp_server_name": "polarion"}
    ]
  }'
```

The MCP connector is in beta and not covered by zero data retention. Only tool calls are supported, and the server must be public HTTPS (Streamable HTTP or SSE). Every server in mcp_servers needs exactly one mcp_toolset. Polarion PATs are passed as authorization_token as is; the vendor expects OAuth tokens you obtain and refresh yourself. The newer header mcp-client-2026-09-15 (Claude API only) pins tool lists and may be sent instead; mcp_tool_listing blocks then appear first in the response.

## Check

### Server

Ask your assistant: `Which Polarion user am I? Use getCurrentUser.`

Expected: Response has mcp_tool_use and mcp_tool_result blocks, then your Polarion user.

## If it fails

### Server

| Symptom | Fix |
|---|---|
| Error about beta header or mcp_servers | Send the header anthropic-beta: mcp-client-2025-11-20 (or the SDK's betas option). On Claude Platform on AWS, Google Cloud and Microsoft Foundry only mcp-client-2025-11-20 is accepted. |
| Validation error about mcp_toolset or mcp_server_name | Every server in mcp_servers must be referenced by exactly one mcp_toolset, and mcp_server_name must match the server's name. |
| The API cannot connect to the server | The URL must be https:// and publicly reachable. localhost and stdio servers cannot be used. |
| Claude does not call the Polarion tools | Claude calls MCP tools when the request needs them; ask for something that maps to a tool, such as the current user. General questions are answered without tools. |
| 401 "Polarion did not accept this token" | The PAT was cut off, has expired or is for another Polarion. Create a new token and paste it unchanged. |

## Sources

Checked against the vendor documentation on 2026-10-30.

- [Official documentation](https://platform.claude.com/docs/en/agents-and-tools/mcp-connector)

Not confirmed in the vendor documentation:

- The page calls authorization_token an OAuth access token and says callers obtain and refresh it; it does not state the header form sent to the MCP server. That it arrives as Authorization: Bearer <value> is how this repo expects it.
- Model name left as placeholder: the vendor example uses claude-opus-5-5 and lists supported models, which change often.
- The doc does not state a limit on the number of mcp_servers per request.

Back to the [client index](../../clients.md).
