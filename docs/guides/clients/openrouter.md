# Connect OpenRouter with Open WebUI or LibreChat

Chat with OpenRouter models in Open WebUI or LibreChat and let them use Polarion. Default: **Server**.

Official documentation: [docs.openwebui.com](https://docs.openwebui.com/features/extensibility/mcp), [docs.openwebui.com](https://docs.openwebui.com/getting-started/quick-start/connect-a-provider/starting-with-openai-compatible), [openrouter.ai](https://openrouter.ai/docs/features/tool-calling)

Verification status:

- Server: verified by documentation only

OpenRouter supplies the models through an OpenAI-compatible API; Open WebUI or LibreChat is the MCP client that talks to this server. Pick a model that supports tool calling.

- **Local is not supported:** The chat UI connects to the server by URL; use the Local setup of a desktop client instead if you only need stdio.

## Prerequisites

### Server

- [Server (Docker) guide](../server-docker.md): start here if you have not set it up yet.
- Open WebUI v0.6.31+ (or LibreChat) running in Docker
- WEBUI_SECRET_KEY set on Open WebUI
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

1. Add OpenRouter in Open WebUI under Settings > Admin > Connections > Manage OpenAI API Connections: URL https://openrouter.ai/api/v1, API key from openrouter.ai/keys. Add only the model IDs you need to the Model IDs allowlist, and choose models that support tools (openrouter.ai/models?supported_parameters=tools).
2. Start the server on the same Docker network as Open WebUI (see the server example under Prerequisites). Open WebUI must be v0.6.31 or newer and started with WEBUI_SECRET_KEY set.
3. In Open WebUI open Settings > Admin > Integrations. Under External Tool Servers click + Add Connection and set Type to MCP (Streamable HTTP), not OpenAPI. Only administrators can add MCP servers.
4. Enter http://polarion-mcp:3000/mcp as Server URL, choose Auth Bearer and paste your Polarion PAT as Key.
5. Click Save (restart Open WebUI if it asks you to). Optionally use Access Control to limit the server to users or groups.
6. In a chat with a tool-calling model open + > Integrations > Tools and enable the polarion tool.

```
Type: MCP (Streamable HTTP)
URL: http://polarion-mcp:3000/mcp
Auth: Bearer
Key: YOUR_POLARION_PAT
```

Pick a model with tool calling. Open WebUI recommends reliable native tool calling; small models often produce malformed tool calls.

#### Alternative: LibreChat

Same connection in librechat.yaml. Needs: LibreChat running (Docker), with an agent or chat model that supports tool calling.

1. Add the block below to librechat.yaml. mcpSettings.allowedAddresses is needed because LibreChat blocks private and Docker-internal hosts by default; entries must include the port.
2. Restart LibreChat; librechat.yaml servers load at startup.
3. Open the MCP Servers section of the chat composer (or select the server in an agent) and enable polarion; the status should read Connected.

```yaml
mcpServers:
  polarion:
    type: streamable-http
    url: http://polarion-mcp:3000/mcp
    headers:
      Authorization: "Bearer YOUR_POLARION_PAT"

mcpSettings:
  allowedAddresses:
    - "polarion-mcp:3000"
```

Type streamable-http (alias http) is the recommended transport for multi-user use. Instead of one shared PAT you can let each user enter their own: declare customUserVars with a title and sensitive: true and use '{{VARIABLE}}' in the Authorization header. Servers added through MCP Settings in the UI can only reach remote URLs and drop ${ENV_VAR} placeholders from headers.

## Check

### Server

Ask your assistant: `Which Polarion user am I? Use getCurrentUser.`

Expected: The model calls getCurrentUser and shows your Polarion user.

## If it fails

### Server

| Symptom | Fix |
|---|---|
| 401 "Polarion did not accept this token" | The PAT was cut off, has expired or is for another Polarion. Create a new token and paste it unchanged. |
| Failed to connect to MCP server | Read the Open WebUI server log. Typical fixes: with Bearer the Key must not be empty (an empty Bearer sends an empty Authorization header); raise MCP_INITIALIZE_TIMEOUT (default 10 seconds) for a slow server; if the Function Name Filter List is empty, try a single comma. |
| External Tool Servers is greyed out or the Add Connection menu is missing | ENABLE_TOOL_SERVERS is False, or your account is not an administrator. Only admins can add MCP servers. |
| Endless loading spinner after saving | The MCP config was saved as an OpenAPI connection (console: Cannot convert undefined or null to object). Delete the connection, refresh and re-add it with Type MCP (Streamable HTTP). |
| The model never calls the tool | The model does not support tool calling or handles it badly. Pick a tool-capable model; in Open WebUI check Model Settings > Advanced Params > Function Calling (Native is the documented default) and try a stronger model. |
| Connection refused to localhost:3000 | localhost inside the Open WebUI container is that container. Use the polarion-mcp container name on a shared Docker network, or http://host.docker.internal:PORT for a server on the Docker host. |
| LibreChat shows Disconnected or blocks the URL | Add the host and port to mcpSettings.allowedAddresses (for example polarion-mcp:3000), restart LibreChat and reconnect. Error messages say whether the server was unreachable, needed variables or needed sign-in. |

## Sources

Checked against the vendor documentation on 2026-10-30.

- [Official documentation 1](https://docs.openwebui.com/features/extensibility/mcp)
- [Official documentation 2](https://docs.openwebui.com/getting-started/quick-start/connect-a-provider/starting-with-openai-compatible)
- [Official documentation 3](https://openrouter.ai/docs/features/tool-calling)
- [Official documentation 4](https://www.librechat.ai/docs/features/mcp)
- [Official documentation 5](https://www.librechat.ai/docs/configuration/librechat_yaml/object_structure/mcp_servers)
- [Official documentation 6](https://www.librechat.ai/docs/configuration/librechat_yaml/object_structure/mcp_settings)

Not confirmed in the vendor documentation:

- Open WebUI docs describe the Integrations page and Save but do not describe a Verify connection button or a tool list preview for Bearer connections (only Check OAuth Discovery for OAuth). The old 'tool list must appear' check is replaced by enabling the tool in a chat.
- Open WebUI's MCP page does not name the native function calling setting; its location (Model Settings > Advanced Params > Function Calling) comes from other Open WebUI doc pages found via search, and the page naming it was not opened.
- The LibreChat MCP feature page does not say whether MCP tools need an agent; the YAML reference says agents can use servers and chatMenu controls the composer menu. The snippet follows the docs and was not run here.
- Not tested with OpenRouter.

Back to the [client index](../../clients.md).
