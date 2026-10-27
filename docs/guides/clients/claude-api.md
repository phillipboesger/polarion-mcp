# Connect Claude API

Your own code calling the Claude Messages API. Default: **Server**.

- **Local is not supported:** Only public HTTP servers work; local stdio cannot connect.

## Prerequisites

### Server

- [Server (Docker) guide](../server-docker.md): start here if you have not set it up yet.
- Anthropic API key
- Public HTTPS MCP server address

Server example (Public HTTPS server for cloud APIs):

```bash
docker run -d --name polarion-mcp \
  -p 127.0.0.1:3000:3000 \
  -e API_BASE_URL=https://polarion.company.example/polarion/rest/v1 \
  -e MCP_ALLOWED_HOSTS=YOUR-SERVER \
  -e TRUST_PROXY=1 \
  ghcr.io/phillipboesger/polarion-mcp:1.4.3
```

Required for cloud API calls: a publicly reachable HTTPS endpoint at https://YOUR-SERVER/mcp. Configure a TLS reverse proxy to 127.0.0.1:3000, forward the public Host and use a real public hostname in MCP_ALLOWED_HOSTS. TRUST_PROXY=1 assumes exactly one trusted hop. Each API request sends your Polarion PAT; OAuth is not required for this PAT-header path.

## Steps

### Server

1. Set ANTHROPIC_API_KEY to your Anthropic API key.
2. Add mcp_servers and tools; send header anthropic-beta: mcp-client-2025-11-20.
3. Replace YOUR_CLAUDE_MODEL with a current model name from the Anthropic docs.
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

Add these fields to your Messages request. Enable the mcp-client-2025-11-20 beta header. The Polarion PAT authenticates to this server; your Anthropic API key authenticates the API request.

## Check

### Server

Ask your assistant: `Which Polarion user am I? Use getCurrentUser.`

Expected: Response has mcp_tool_use and mcp_tool_result blocks, then a project list.

## If it fails

### Server

| Symptom | Fix |
|---|---|
| Error about beta header or mcp_servers | Send the header anthropic-beta: mcp-client-2025-11-20 (or the SDK's betas option). |
| The API cannot connect to the server | The URL must be https:// and publicly reachable. localhost and stdio servers cannot be used. |

## Sources

Checked against the vendor documentation on 2026-10-24.

- [Official documentation](https://platform.claude.com/docs/en/agents-and-tools/mcp-connector)

Not confirmed in the vendor documentation:

- The doc calls authorization_token an OAuth token; that it is forwarded as Authorization: Bearer <value> to the Polarion server is how this repo expects it but the page does not state the header form.
- Newer beta header mcp-client-2026-09-15 (pins tool lists, includes everything in 2025-11-20) exists; the repo and basic doc example use 2025-11-20.
- Model name left as placeholder; the doc example uses claude-opus-5-5 but model lists change.

Back to the [client index](../../clients.md).
