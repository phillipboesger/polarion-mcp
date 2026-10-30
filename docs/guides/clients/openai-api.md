# Connect OpenAI Responses API

Your own code calling the OpenAI Responses API. Default: **Server**.

- **Local is not supported:** OpenAI's cloud cannot start npx. Use a public HTTPS server.

## Prerequisites

### Server

- [Server (Docker) guide](../server-docker.md): start here if you have not set it up yet.
- OpenAI API key
- Public HTTPS Polarion MCP server

Server example (Public HTTPS server for cloud APIs):

```bash
docker run -d --name polarion-mcp \
  -p 127.0.0.1:3000:3000 \
  -e API_BASE_URL=https://polarion.company.example/polarion/rest/v1 \
  -e MCP_ALLOWED_HOSTS=YOUR-SERVER \
  -e TRUST_PROXY=1 \
  ghcr.io/phillipboesger/polarion-mcp:1.4.5
```

Required for cloud API calls: a publicly reachable HTTPS endpoint at https://YOUR-SERVER/mcp. Configure a TLS reverse proxy to 127.0.0.1:3000, forward the public Host and use a real public hostname in MCP_ALLOWED_HOSTS. TRUST_PROXY=1 assumes exactly one trusted hop. Each API request sends your Polarion PAT; OAuth is not required for this PAT-header path.

## Steps

### Server

1. Run pip install openai and set OPENAI_API_KEY.
2. Copy the snippet into a Python file.
3. Replace https://YOUR-SERVER/mcp, YOUR_POLARION_PAT and YOUR-MODEL in the snippet.
4. Run the file to get mcp_list_tools and an mcp_approval_request.
5. Send a second request with previous_response_id and an mcp_approval_response.
6. Repeat the approval for each further tool call.

```python
from openai import OpenAI

client = OpenAI()  # reads OPENAI_API_KEY

tools = [{
    "type": "mcp",
    "server_label": "polarion",
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

Add this tools field to a Responses request. Use your OpenAI API key for the API request and your Polarion PAT for the MCP server.

## Check

### Server

Ask your assistant: `Which Polarion user am I? Use getCurrentUser.`

Expected: mcp_list_tools, mcp_approval_request; after approval, mcp_call and projects.

## If it fails

### Server

| Symptom | Fix |
|---|---|
| MCP server cannot be reached | server_url must be public HTTPS ending in /mcp. localhost and internal addresses fail. |
| 401 from the MCP server | The authorization value must be your Polarion PAT, sent in every request. |

## Sources

Checked against the vendor documentation on 2026-10-24.

- [Official documentation](https://developers.openai.com/api/docs/guides/tools-connectors-mcp)

Not confirmed in the vendor documentation:

- That the 'authorization' field accepts a Polarion PAT: OpenAI documents it as an OAuth access token sent to the server (as a Bearer token); a PAT is treated the same way by this server, but OpenAI does not mention PATs.
- A 'headers' field: not found in the fetched page, so it is not used.
- Current model names: the page example uses a model name we did not rely on; use any model your account supports.
- Sample code is assembled from documented fields, not copied from an official sample.

Back to the [client index](../../clients.md).
