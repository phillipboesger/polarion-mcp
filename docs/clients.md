# Client setup reference

[Choose a client and complete setup on the landing page](https://polarion-mcp.boesger.com/#setup/claude-desktop).

This reference records the vendor sources checked on 2026-10-24. It describes documented configuration, not an end-to-end test of every client account or subscription. The source of truth is [clients.json](clients.json); run `npm run docs:clients` and `npm run docs:site` after editing it.

## Shared setups

- **Local MCP configuration:** [Claude Desktop](https://polarion-mcp.boesger.com/#setup/claude-desktop), [Cursor](https://polarion-mcp.boesger.com/#setup/cursor), [Windsurf / Cascade](https://polarion-mcp.boesger.com/#setup/windsurf), [JetBrains AI Assistant](https://polarion-mcp.boesger.com/#setup/jetbrains-ai), [Cline](https://polarion-mcp.boesger.com/#setup/cline).
- **Add from your terminal:** [Claude Code](https://polarion-mcp.boesger.com/#setup/claude-code), [Codex](https://polarion-mcp.boesger.com/#setup/codex-cli), [Gemini CLI](https://polarion-mcp.boesger.com/#setup/gemini-cli).
- **Connect to your team server:** [Claude web / Desktop connector](https://polarion-mcp.boesger.com/#setup/claude-web-desktop), [ChatGPT connector](https://polarion-mcp.boesger.com/#setup/chatgpt-apps), [Microsoft Copilot Studio](https://polarion-mcp.boesger.com/#setup/copilot-studio), [Generic HTTP client](https://polarion-mcp.boesger.com/#setup/generic-http).
- **VS Code MCP configuration:** [VS Code / GitHub Copilot](https://polarion-mcp.boesger.com/#setup/vscode-copilot).
- **Zed context server:** [Zed](https://polarion-mcp.boesger.com/#setup/zed).
- **Claude Messages API:** [Claude API](https://polarion-mcp.boesger.com/#setup/claude-api).
- **OpenAI Responses API:** [OpenAI Responses API](https://polarion-mcp.boesger.com/#setup/openai-api).
- **OpenAI Agents SDK:** [OpenAI Agents SDK](https://polarion-mcp.boesger.com/#setup/openai-agents).
- **Custom GPT Actions:** [Custom GPT Actions](https://polarion-mcp.boesger.com/#setup/custom-gpt).
- **Docker team server:** [Docker team server](https://polarion-mcp.boesger.com/#setup/docker).
- **Any stdio MCP client:** [Generic stdio client](https://polarion-mcp.boesger.com/#setup/generic-stdio).
- **REST wrapper / OpenAPI:** [REST wrapper / OpenAPI](https://polarion-mcp.boesger.com/#setup/rest-wrapper).
- **n8n HTTP Request:** [n8n REST workflow](https://polarion-mcp.boesger.com/#setup/n8n).

## Vendor sources and setup notes

### Claude Desktop

Node.js 22+ runs the published npm package on your computer. Replace the URL and PAT locally; keep credentials out of Git.

- [Official documentation](https://modelcontextprotocol.io/docs/develop/connect-local-servers)

### Claude web / Desktop connector

On Team / Enterprise, an owner adds the connector under Organization settings > Connectors > Add > Custom > Web; members then choose Connect.

- [Official documentation 1](https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp)
- [Official documentation 2](https://support.claude.com/en/articles/11503834-building-custom-connectors-using-remote-mcp)

### Claude Code

Commands shown for macOS, Linux and WSL. Install the selected client and Node.js 22+. Replace the URL and PAT before running; the command stores them in your local client configuration.

- [Official documentation](https://code.claude.com/docs/en/mcp)

### Claude API

Add these fields to your Messages request. Enable the mcp-client-2025-11-20 beta header. The Polarion PAT authenticates to this server; your Anthropic API key authenticates the API request.

- [Official documentation](https://platform.claude.com/docs/en/agents-and-tools/mcp-connector)

### ChatGPT connector

Custom MCP access depends on your ChatGPT workspace permissions. Use DCR for this server unless the administrator explicitly enabled CIMD.

- [Official documentation 1](https://developers.openai.com/api/docs/guides/custom-mcp-server)
- [Official documentation 2](https://developers.openai.com/plugins/build/auth)

### Custom GPT Actions

This uses the REST wrapper and its HTTP_API_KEY, not the MCP endpoint or the user PAT. The reduced schema contains 30 actions. A team administrator deploys the REST wrapper first.

- [Official documentation 1](https://developers.openai.com/api/docs/actions/getting-started)
- [Official documentation 2](https://developers.openai.com/api/docs/actions/authentication)

### OpenAI Responses API

Add this tools field to a Responses request. Use your OpenAI API key for the API request and your Polarion PAT for the MCP server.

- [Official documentation](https://developers.openai.com/api/docs/guides/tools-connectors-mcp)

### OpenAI Agents SDK

Use inside your async application with openai-agents installed and Agent imported from agents. Run the agent while the server context is open. Keep API keys and PATs in your application secret store.

- [Official documentation](https://openai.github.io/openai-agents-python/mcp/)

### Codex

Commands shown for macOS, Linux and WSL. Install the selected client and Node.js 22+. Replace the URL and PAT before running; the command stores them in your local client configuration.

- [Official documentation](https://developers.openai.com/codex/mcp)

### Microsoft Copilot Studio

Use generative orchestration. This path uses a PAT header and does not require an OAuth callback. Select only the tools your agent needs.

- [Official documentation](https://learn.microsoft.com/en-us/microsoft-copilot-studio/mcp-add-existing-server-to-agent)

### VS Code / GitHub Copilot

Node.js 22+ is required. VS Code uses a servers object. Select the tools you need in chat; the full catalog can exceed the client tool budget.

- [Official documentation 1](https://code.visualstudio.com/docs/agents/reference/mcp-configuration)
- [Official documentation 2](https://code.visualstudio.com/docs/copilot/customization/mcp-servers)

### Gemini CLI

Run Gemini in a trusted folder. If the server shows Disconnected, use gemini trust to trust that folder.

- [Official documentation](https://geminicli.com/docs/tools/mcp-server/)

### Cursor

Node.js 22+ runs the published npm package on your computer. Replace the URL and PAT locally; keep credentials out of Git.

- [Official documentation](https://cursor.com/docs/mcp)

### Windsurf / Cascade

The vendor now documents this as legacy Cascade in Devin Desktop. Its 100-tool budget requires selecting a subset of Polarion tools. This config does not apply to the Devin Local agent.

- [Official documentation](https://docs.windsurf.com/windsurf/cascade/mcp)

### JetBrains AI Assistant

Node.js 22+ runs the published npm package on your computer. Replace the URL and PAT locally; keep credentials out of Git.

- [Official documentation](https://www.jetbrains.com/help/ai-assistant/mcp.html)

### Zed

Node.js 22+ is required. Zed uses context_servers, with command, args and env directly inside the server entry.

- [Official documentation](https://zed.dev/docs/ai/mcp)

### Cline

Node.js 22+ runs the published npm package on your computer. Replace the URL and PAT locally; keep credentials out of Git.

- [Official documentation](https://docs.cline.bot/mcp/mcp-overview)

### Docker team server

The image starts Streamable HTTP. Each client sends its own Polarion PAT as Authorization: Bearer <PAT>. Local endpoint: http://localhost:3000/mcp. Add TLS and OAuth before connecting cloud clients.

- [Server implementation 1](https://github.com/phillipboesger/polarion-mcp/blob/main/Dockerfile)
- [Server implementation 2](https://github.com/phillipboesger/polarion-mcp/blob/main/docs/deployment.md)

### Generic stdio client

Node.js 22+ is required. The client owns stdin and stdout. Configure this as its subprocess; it is not a standalone web service.

- [Official documentation](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports)

### Generic HTTP client

Use your own deployed HTTPS URL. There is no public Polarion relay. Your server must be reachable by the client provider; an administrator sets up TLS, OAuth and exact redirect allowlists.

- [Official documentation](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports)

### REST wrapper / OpenAPI

All calls use the deployment PAT. Clients send Authorization: Bearer <HTTP_API_KEY>. Serve this behind HTTPS; schemas are at /openapi.json and /openapi-gpt.json.

- [Server implementation 1](https://github.com/phillipboesger/polarion-mcp/blob/main/src/http-server.ts)
- [Server implementation 2](https://github.com/phillipboesger/polarion-mcp/blob/main/src/rest-api.ts)

### n8n REST workflow

Use the HTTP Request node as a workflow step or attach it as a tool to an AI Agent. This confirmed path uses REST. The MCP Client Tool documentation still describes an SSE Endpoint, so it is not used as evidence for a Streamable HTTP setup here.

- [Official documentation 1](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/)
- [Official documentation 2](https://docs.n8n.io/integrations/builtin/credentials/httprequest/)

## Team server prerequisites

Cloud connectors need a server reachable by their provider. Deploy Streamable HTTP with TLS, `MCP_PUBLIC_URL`, a stable `MCP_TOKEN_SECRET`, trusted proxy settings, and exact OAuth redirect allowlists. Claude can use `MCP_ALLOWED_REDIRECT_PRESETS=claude`; ChatGPT supplies its callback during setup. Use DCR unless CIMD is explicitly enabled on the server.

The [Docker setup](https://polarion-mcp.boesger.com/#setup/docker) starts a local PAT-authenticated HTTP endpoint. Follow [deployment](deployment.md) for TLS and OAuth. The [REST wrapper](https://polarion-mcp.boesger.com/#setup/rest-wrapper) uses a deployment PAT plus `HTTP_API_KEY`; it is a separate mode from remote MCP. See [security](security.md) and [configuration](configuration.md).
