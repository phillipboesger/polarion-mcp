# Connect Self-hosted models (Open WebUI)

Open WebUI or LibreChat with Ollama, vLLM, OpenRouter or any OpenAI-compatible model. Default: **Server**.

Open WebUI is the MCP client. Ollama, vLLM and OpenRouter only supply the model, so only the model URL and key change per backend. The model must support tool calling.

- **Local is not supported:** The chat UI connects to the server by URL; use the Local setup of a desktop client instead if you only need stdio.

## Prerequisites

### Server

- [Server (Docker) guide](../server-docker.md): start here if you have not set it up yet.
- Open WebUI (or LibreChat) running in Docker
- A model with tool calling support

Server example (Team server for self-hosted chat UIs):

```bash
docker network create chat
docker run -d --name polarion-mcp --network chat \
  -e API_BASE_URL=https://polarion.company.example/polarion/rest/v1 \
  -e MCP_ALLOWED_HOSTS=polarion-mcp:3000,localhost:3000 \
  ghcr.io/phillipboesger/polarion-mcp:1.4.5
```

Put Open WebUI on the same Docker network and use http://polarion-mcp:3000/mcp as the URL. localhost inside the Open WebUI container is the container itself, not your host. Each user sends their own PAT; for a shared instance use a service account PAT and restrict who can use the tool.

## Steps

### Server

1. Start the server on the same Docker network as Open WebUI (see the server example under Prerequisites).
2. In Open WebUI open Admin Settings > External Tools > Add and choose MCP (Streamable HTTP), not OpenAPI.
3. Enter http://polarion-mcp:3000/mcp, choose Bearer and paste your Polarion PAT as key.
4. Verify the connection; the tool list must appear. Save.
5. In a chat with a tool-calling model, enable the polarion tool.

```
Type: MCP (Streamable HTTP)
URL: http://polarion-mcp:3000/mcp
Auth: Bearer
Key: YOUR_POLARION_PAT
```

Choose the model backend in Open WebUI under Connections (Ollama URL, vLLM or OpenRouter base URL and key); the MCP setup is identical for all of them.

#### Alternative: LibreChat

Same connection in librechat.yaml.

1. Add the block below to librechat.yaml.
2. Restart LibreChat and enable the polarion tools in a chat.

```yaml
mcpServers:
  polarion:
    type: streamable-http
    url: http://polarion-mcp:3000/mcp
    headers:
      Authorization: "Bearer YOUR_POLARION_PAT"
```

## Check

### Server

Ask your assistant: `Which Polarion user am I? Use getCurrentUser.`

Expected: The model calls getCurrentUser and shows your Polarion user.

## If it fails

### Server

| Symptom | Fix |
|---|---|
| 401 "Polarion did not accept this token" | The PAT was cut off or expired. Create a new token and paste it unchanged. |
| The model never calls the tool | The model does not support tool calling. Pick one that does and enable native function calling for it. |
| Connection refused to localhost:3000 | localhost inside the Open WebUI container is that container. Use the polarion-mcp container name on a shared Docker network. |

## Sources

Checked against the vendor documentation on 2026-10-30.

- [Official documentation 1](https://docs.openwebui.com/features/extensibility/mcp)
- [Official documentation 2](https://www.librechat.ai/docs/features/mcp)

Not confirmed in the vendor documentation:

- Not yet tested with Ollama or OpenRouter chats (T4.3).
- The LibreChat snippet follows its docs and was not run here.

Back to the [client index](../../clients.md).
