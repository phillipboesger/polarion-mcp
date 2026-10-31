# Connect OpenAI Responses API

Your own code calling the OpenAI Responses API. Default: **Server**.

Official documentation: [developers.openai.com](https://developers.openai.com/api/docs/guides/tools-connectors-mcp)

Verification status:

- Server: verified by documentation only

- **Local is not supported:** OpenAI's cloud cannot start npx. Use a public HTTPS server. OpenAI documents tunnel_id (Secure MCP Tunnel) for private servers, which needs its own tunnel runtime and is not covered here.

## Prerequisites

### Server

- [Server (Docker) guide](../server-docker.md): start here if you have not set it up yet.
- OpenAI API key
- Public HTTPS Polarion MCP server (Streamable HTTP or HTTP/SSE)

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

1. Run pip install openai and set OPENAI_API_KEY (use a model that supports the MCP tool; the vendor says most recent models do).
2. Copy the snippet into a Python file.
3. Replace https://YOUR-SERVER/mcp, YOUR_POLARION_PAT and YOUR-MODEL in the snippet.
4. Run the file. The response contains an mcp_list_tools item (the imported tools) and an mcp_approval_request.
5. Send a second request with previous_response_id and an mcp_approval_response that carries approve and the approval_request_id. Each approval covers one tool call.
6. Repeat the approval for each further tool call. Keep the mcp_list_tools item in the conversation so the API does not fetch the tool list again each turn.

```python
from openai import OpenAI

client = OpenAI()  # reads OPENAI_API_KEY

tools = [{
    "type": "mcp",
    "server_label": "polarion",
    "server_description": "Polarion ALM: projects, work items, documents.",
    "server_url": "https://YOUR-SERVER/mcp",
    "authorization": "YOUR_POLARION_PAT",
    "require_approval": "always",
}]

resp = client.responses.create(
    model="YOUR-MODEL",
    tools=tools,
    input="Which Polarion user am I? Use getCurrentUser.",
)
print([i.type for i in resp.output])
```

The authorization value is not stored by the API: send it on every request that creates a response. Failed calls fill the error field of the mcp_call item (protocol errors, tool errors or connectivity errors). With store=true, data sent to MCP servers is logged for 30 days unless Zero Data Retention is on. Rate limits for the tool: 1000 RPM on the Build tier, 2000 RPM on Launch and Grow. No extra fee per tool call, only the tokens used. allowed_tools limits which tools are imported; require_approval also takes an object such as {"never": {"tool_names": [...]}}.

## Check

### Server

Ask your assistant: `Which Polarion user am I? Use getCurrentUser.`

Expected: mcp_list_tools, mcp_approval_request; after approval, mcp_call and your Polarion user.

## If it fails

### Server

| Symptom | Fix |
|---|---|
| MCP server cannot be reached | server_url must be public HTTPS ending in /mcp. localhost and internal addresses fail. Failed calls show the reason in the error field of the mcp_call item. |
| 401 from the MCP server | The authorization value must be your Polarion PAT, sent in every request. The API does not store it, so add it to each responses.create call. |
| No mcp_list_tools item in the response | Tool listing failed. Check server_url, the PAT and that the server is reachable from the public internet. |
| Tool call runs without asking | require_approval is set to never for that server or tool. Use "always" as in the snippet. |

## Sources

Checked against the vendor documentation on 2026-10-30.

- [Official documentation](https://developers.openai.com/api/docs/guides/tools-connectors-mcp)

Not confirmed in the vendor documentation:

- That the 'authorization' field accepts a Polarion PAT: OpenAI documents it as an OAuth access token for servers that require one; a PAT is sent the same way and this server accepts it, but OpenAI does not mention PATs.
- A 'headers' field: the current vendor page does not document one, so it is not used.
- Model names: the vendor page names no specific models that support the MCP tool; it only says most recent models and refers to the models page.
- Sample code is assembled from documented fields; the official examples use server_url https://developers.openai.com/mcp with require_approval never, not this server.

Back to the [client index](../../clients.md).
