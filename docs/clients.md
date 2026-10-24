# Client setup reference

[Choose a client and complete setup on the landing page](https://polarion-mcp.boesger.com/#setup/claude-desktop).

This reference records the vendor sources checked on 2026-10-24. It describes documented configuration, not an end-to-end test of every client account or subscription. The source of truth is [clients.json](clients.json); run `npm run docs:clients` and `npm run docs:site` after editing it.

## Server choice

Choose **npm / npx** for a local stdio subprocess, **Docker** to deploy a server, or **Remote URL** when your team already hosts it. The inline picker shows a default and disables unsupported choices with a reason. Docker normally runs Streamable HTTP; JetBrains uses a local Docker stdio subprocess because its documented remote authentication is insufficient for this guide.

## Shared setups

- **Local MCP configuration:** [Claude Desktop](https://polarion-mcp.boesger.com/#setup/claude-desktop), [Cursor](https://polarion-mcp.boesger.com/#setup/cursor), [Windsurf / Cascade](https://polarion-mcp.boesger.com/#setup/windsurf), [JetBrains AI Assistant](https://polarion-mcp.boesger.com/#setup/jetbrains-ai), [Cline](https://polarion-mcp.boesger.com/#setup/cline), [Other AI provider / any MCP client](https://polarion-mcp.boesger.com/#setup/generic-stdio).
- **Add from your terminal:** [Claude Code](https://polarion-mcp.boesger.com/#setup/claude-code), [Codex](https://polarion-mcp.boesger.com/#setup/codex-cli), [Gemini CLI](https://polarion-mcp.boesger.com/#setup/gemini-cli).
- **Connect to your team server:** [Claude Desktop](https://polarion-mcp.boesger.com/#setup/claude-desktop), [claude.ai](https://polarion-mcp.boesger.com/#setup/claude-web-desktop), [ChatGPT connector](https://polarion-mcp.boesger.com/#setup/chatgpt-apps), [Microsoft Copilot Studio](https://polarion-mcp.boesger.com/#setup/copilot-studio), [Gemini Enterprise](https://polarion-mcp.boesger.com/#setup/gemini-enterprise), [Docker team server](https://polarion-mcp.boesger.com/#setup/docker), [Generic HTTP client](https://polarion-mcp.boesger.com/#setup/generic-http), [REST wrapper / OpenAPI](https://polarion-mcp.boesger.com/#setup/rest-wrapper).
- **VS Code MCP configuration:** [VS Code / GitHub Copilot](https://polarion-mcp.boesger.com/#setup/vscode-copilot).
- **Zed context server:** [Zed](https://polarion-mcp.boesger.com/#setup/zed).
- **Claude Messages API:** [Claude API](https://polarion-mcp.boesger.com/#setup/claude-api).
- **OpenAI Responses API:** [OpenAI Responses API](https://polarion-mcp.boesger.com/#setup/openai-api).
- **OpenAI Agents SDK:** [OpenAI Agents SDK](https://polarion-mcp.boesger.com/#setup/openai-agents).
- **Custom GPT Actions:** [Custom GPT Actions](https://polarion-mcp.boesger.com/#setup/custom-gpt).
- **Docker team server:** [Claude Code](https://polarion-mcp.boesger.com/#setup/claude-code), [OpenAI Agents SDK](https://polarion-mcp.boesger.com/#setup/openai-agents), [Codex](https://polarion-mcp.boesger.com/#setup/codex-cli), [Microsoft Copilot Studio](https://polarion-mcp.boesger.com/#setup/copilot-studio), [VS Code / GitHub Copilot](https://polarion-mcp.boesger.com/#setup/vscode-copilot), [Gemini CLI](https://polarion-mcp.boesger.com/#setup/gemini-cli), [Gemini Enterprise](https://polarion-mcp.boesger.com/#setup/gemini-enterprise), [Cursor](https://polarion-mcp.boesger.com/#setup/cursor), [Windsurf / Cascade](https://polarion-mcp.boesger.com/#setup/windsurf), [Zed](https://polarion-mcp.boesger.com/#setup/zed), [Cline](https://polarion-mcp.boesger.com/#setup/cline), [Docker team server](https://polarion-mcp.boesger.com/#setup/docker), [Other AI provider / any MCP client](https://polarion-mcp.boesger.com/#setup/generic-stdio), [Generic HTTP client](https://polarion-mcp.boesger.com/#setup/generic-http).
- **REST wrapper / OpenAPI:** [Custom GPT Actions](https://polarion-mcp.boesger.com/#setup/custom-gpt), [REST wrapper / OpenAPI](https://polarion-mcp.boesger.com/#setup/rest-wrapper), [n8n REST workflow](https://polarion-mcp.boesger.com/#setup/n8n).
- **n8n HTTP Request:** [n8n REST workflow](https://polarion-mcp.boesger.com/#setup/n8n).
- **HTTPS team server with OAuth:** [Claude Desktop](https://polarion-mcp.boesger.com/#setup/claude-desktop), [claude.ai](https://polarion-mcp.boesger.com/#setup/claude-web-desktop).
- **Remote MCP configuration:** [VS Code / GitHub Copilot](https://polarion-mcp.boesger.com/#setup/vscode-copilot), [Cursor](https://polarion-mcp.boesger.com/#setup/cursor), [Windsurf / Cascade](https://polarion-mcp.boesger.com/#setup/windsurf), [Zed](https://polarion-mcp.boesger.com/#setup/zed), [Cline](https://polarion-mcp.boesger.com/#setup/cline), [Other AI provider / any MCP client](https://polarion-mcp.boesger.com/#setup/generic-stdio).
- **Add your team server:** [Claude Code](https://polarion-mcp.boesger.com/#setup/claude-code), [Codex](https://polarion-mcp.boesger.com/#setup/codex-cli), [Gemini CLI](https://polarion-mcp.boesger.com/#setup/gemini-cli).
- **Agents SDK local subprocess:** [OpenAI Agents SDK](https://polarion-mcp.boesger.com/#setup/openai-agents).
- **HTTPS team server for ChatGPT:** [ChatGPT connector](https://polarion-mcp.boesger.com/#setup/chatgpt-apps).
- **Public HTTPS server for cloud APIs:** [Claude API](https://polarion-mcp.boesger.com/#setup/claude-api), [OpenAI Responses API](https://polarion-mcp.boesger.com/#setup/openai-api).

## Vendor sources and setup notes

### Claude Desktop

Node.js 22+ runs the published npm package on your computer. Replace the URL and PAT locally; keep credentials out of Git.

Default: **npm / npx**.

- **npm / npx:** Supported; use the configuration and steps shown inline.
- **Docker:** Deploy the server, then use the client configuration shown inline.
- **Remote URL:** Supported; use the configuration and steps shown inline.

- [Official documentation 1](https://modelcontextprotocol.io/docs/develop/connect-local-servers)
- [Official documentation 2](https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp)

### claude.ai

On Team / Enterprise, an owner adds the connector under Organization settings > Connectors > Add > Custom > Web; members then choose Connect.

Default: **Remote URL**.

- **npm / npx:** This connector cannot launch npx; use a reachable HTTPS server.
- **Docker:** Deploy the server, then use the client configuration shown inline.
- **Remote URL:** Supported; use the configuration and steps shown inline.

- [Official documentation 1](https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp)
- [Official documentation 2](https://support.claude.com/en/articles/11503834-building-custom-connectors-using-remote-mcp)

### Claude Code

Commands shown for macOS, Linux and WSL. Install the selected client and Node.js 22+. Replace the URL and PAT before running; the command stores them in your local client configuration.

Default: **npm / npx**.

- **npm / npx:** Supported; use the configuration and steps shown inline.
- **Docker:** Deploy the server, then use the client configuration shown inline.
- **Remote URL:** Supported; use the configuration and steps shown inline.

- [Official documentation](https://code.claude.com/docs/en/mcp)

### Claude API

Add these fields to your Messages request. Enable the mcp-client-2025-11-20 beta header. The Polarion PAT authenticates to this server; your Anthropic API key authenticates the API request.

Default: **Remote URL**.

- **npm / npx:** This connector cannot launch npx; use a reachable HTTPS server.
- **Docker:** Deploy the server, then use the client configuration shown inline.
- **Remote URL:** Supported; use the configuration and steps shown inline.

- [Official documentation](https://platform.claude.com/docs/en/agents-and-tools/mcp-connector)

### ChatGPT connector

Custom MCP access depends on your ChatGPT workspace permissions. Use DCR for this server unless the administrator explicitly enabled CIMD. This guide covers the public HTTPS connector path. OpenAI also documents Secure MCP Tunnel for private servers; that requires its own tunnel runtime and permissions, so local npx is not a direct connector setup.

Default: **Remote URL**.

- **npm / npx:** This connector cannot launch npx; use a reachable HTTPS server.
- **Docker:** Deploy the server, then use the client configuration shown inline.
- **Remote URL:** Supported; use the configuration and steps shown inline.

- [Official documentation 1](https://developers.openai.com/api/docs/guides/custom-mcp-server)
- [Official documentation 2](https://developers.openai.com/plugins/build/auth)
- [Official documentation 3](https://developers.openai.com/api/docs/guides/secure-mcp-tunnels)

### Custom GPT Actions

This uses the REST wrapper and its HTTP_API_KEY, not the MCP endpoint or the user PAT. The reduced schema contains 30 actions. A team administrator deploys the REST wrapper first.

Default: **Remote URL**.

- **npm / npx:** npx starts MCP stdio. This integration needs the separate REST wrapper.
- **Docker:** Deploy the server, then use the client configuration shown inline.
- **Remote URL:** Supported; use the configuration and steps shown inline.

- [Official documentation 1](https://developers.openai.com/api/docs/actions/getting-started)
- [Official documentation 2](https://developers.openai.com/api/docs/actions/authentication)

### OpenAI Responses API

Add this tools field to a Responses request. Use your OpenAI API key for the API request and your Polarion PAT for the MCP server.

Default: **Remote URL**.

- **npm / npx:** This connector cannot launch npx; use a reachable HTTPS server.
- **Docker:** Deploy the server, then use the client configuration shown inline.
- **Remote URL:** Supported; use the configuration and steps shown inline.

- [Official documentation](https://developers.openai.com/api/docs/guides/tools-connectors-mcp)

### OpenAI Agents SDK

Use inside your async application with openai-agents installed and Agent imported from agents. Run the agent while the server context is open. Keep API keys and PATs in your application secret store.

Default: **npm / npx**.

- **npm / npx:** Supported; use the configuration and steps shown inline.
- **Docker:** Deploy the server, then use the client configuration shown inline.
- **Remote URL:** Supported; use the configuration and steps shown inline.

- [Official documentation](https://openai.github.io/openai-agents-python/mcp/)

### Codex

Commands shown for macOS, Linux and WSL. Install the selected client and Node.js 22+. Replace the URL and PAT before running; the command stores them in your local client configuration.

Default: **npm / npx**.

- **npm / npx:** Supported; use the configuration and steps shown inline.
- **Docker:** Deploy the server, then use the client configuration shown inline.
- **Remote URL:** Supported; use the configuration and steps shown inline.

- [Official documentation](https://developers.openai.com/codex/mcp)

### Microsoft Copilot Studio

Use generative orchestration. This path uses a PAT header and does not require an OAuth callback. Select only the tools your agent needs.

Default: **Remote URL**.

- **npm / npx:** This connector cannot launch npx; use a reachable HTTPS server.
- **Docker:** Deploy the server, then use the client configuration shown inline.
- **Remote URL:** Supported; use the configuration and steps shown inline.

- [Official documentation](https://learn.microsoft.com/en-us/microsoft-copilot-studio/mcp-add-existing-server-to-agent)

### VS Code / GitHub Copilot

Node.js 22+ is required. VS Code uses a servers object. Select the tools you need in chat; the full catalog can exceed the client tool budget.

Default: **npm / npx**.

- **npm / npx:** Supported; use the configuration and steps shown inline.
- **Docker:** Deploy the server, then use the client configuration shown inline.
- **Remote URL:** Supported; use the configuration and steps shown inline.

- [Official documentation 1](https://code.visualstudio.com/docs/agents/reference/mcp-configuration)
- [Official documentation 2](https://code.visualstudio.com/docs/copilot/customization/mcp-servers)

### Gemini CLI

Run Gemini in a trusted folder. If the server shows Disconnected, use gemini trust to trust that folder.

Default: **npm / npx**.

- **npm / npx:** Supported; use the configuration and steps shown inline.
- **Docker:** Deploy the server, then use the client configuration shown inline.
- **Remote URL:** Supported; use the configuration and steps shown inline.

- [Official documentation](https://geminicli.com/docs/tools/mcp-server/)

### Gemini Enterprise

An administrator may need to override the organization policy that blocks custom MCP data stores. Tools are disabled until you enable them.

Default: **Remote URL**.

- **npm / npx:** This connector cannot launch npx; use a reachable HTTPS server.
- **Docker:** Deploy the server, then use the client configuration shown inline.
- **Remote URL:** Supported; use the configuration and steps shown inline.

- [Official documentation](https://docs.cloud.google.com/gemini/enterprise/docs/connectors/custom-mcp-server/set-up-custom-mcp-server)

### Cursor

Node.js 22+ runs the published npm package on your computer. Replace the URL and PAT locally; keep credentials out of Git.

Default: **npm / npx**.

- **npm / npx:** Supported; use the configuration and steps shown inline.
- **Docker:** Deploy the server, then use the client configuration shown inline.
- **Remote URL:** Supported; use the configuration and steps shown inline.

- [Official documentation](https://cursor.com/docs/mcp)

### Windsurf / Cascade

The vendor now documents this as legacy Cascade in Devin Desktop. Its 100-tool budget requires selecting a subset of Polarion tools. This config does not apply to the Devin Local agent.

Default: **npm / npx**.

- **npm / npx:** Supported; use the configuration and steps shown inline.
- **Docker:** Deploy the server, then use the client configuration shown inline.
- **Remote URL:** Supported; use the configuration and steps shown inline.

- [Official documentation](https://docs.windsurf.com/windsurf/cascade/mcp)

### JetBrains AI Assistant

The vendor documents Streamable HTTP but no authentication configuration matching this server. This guide therefore offers npx or Docker stdio; remote URL is disabled rather than inventing a PAT header field.

Default: **npm / npx**.

- **npm / npx:** Supported; use the configuration and steps shown inline.
- **Docker:** Supported; use the configuration and steps shown inline.
- **Remote URL:** Remote HTTP exists, but vendor docs do not specify PAT headers or OAuth for this server. Use local stdio.

- [Official documentation](https://www.jetbrains.com/help/ai-assistant/mcp.html)

### Zed

Node.js 22+ is required. Zed uses context_servers, with command, args and env directly inside the server entry.

Default: **npm / npx**.

- **npm / npx:** Supported; use the configuration and steps shown inline.
- **Docker:** Deploy the server, then use the client configuration shown inline.
- **Remote URL:** Supported; use the configuration and steps shown inline.

- [Official documentation](https://zed.dev/docs/ai/mcp)

### Cline

Node.js 22+ runs the published npm package on your computer. Replace the URL and PAT locally; keep credentials out of Git.

Default: **npm / npx**.

- **npm / npx:** Supported; use the configuration and steps shown inline.
- **Docker:** Deploy the server, then use the client configuration shown inline.
- **Remote URL:** Supported; use the configuration and steps shown inline.

- [Official documentation](https://docs.cline.bot/mcp/mcp-overview)

### Docker team server

The image starts Streamable HTTP at http://localhost:3000/mcp. Each caller sends their own Polarion PAT. For team access, proxy HTTPS to the loopback port, forward the public Host, and add your public hostname to MCP_ALLOWED_HOSTS. Cloud connectors also need OAuth; their Docker choice includes that configuration.

Default: **Docker**.

- **npm / npx:** This entry deploys a server. Choose your AI client for local npx.
- **Docker:** Deploy the server, then use the client configuration shown inline.
- **Remote URL:** Supported; use the configuration and steps shown inline.

- [Server implementation 1](https://github.com/phillipboesger/polarion-mcp/blob/main/Dockerfile)
- [Server implementation 2](https://github.com/phillipboesger/polarion-mcp/blob/main/docs/deployment.md)

### Other AI provider / any MCP client

Your AI provider does not need a dedicated integration. Use any MCP-capable client. If it accepts OpenAPI instead, choose REST / OpenAPI below.

Default: **npm / npx**.

- **npm / npx:** Supported; use the configuration and steps shown inline.
- **Docker:** Deploy the server, then use the client configuration shown inline.
- **Remote URL:** Supported; use the configuration and steps shown inline.

- [Official documentation](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports)

### Generic HTTP client

Use your own deployed HTTPS URL. There is no public Polarion relay. Your server must be reachable by the client provider; an administrator sets up TLS, OAuth and exact redirect allowlists.

Default: **Remote URL**.

- **npm / npx:** An HTTP-only client cannot launch a stdio subprocess.
- **Docker:** Deploy the server, then use the client configuration shown inline.
- **Remote URL:** Supported; use the configuration and steps shown inline.

- [Official documentation](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports)

### REST wrapper / OpenAPI

All calls use the deployment PAT. Clients send Authorization: Bearer <HTTP_API_KEY>. Serve this behind HTTPS; schemas are at /openapi.json and /openapi-gpt.json. Forward the public Host through your TLS proxy.

Default: **Docker**.

- **npm / npx:** npx starts MCP stdio. This integration needs the separate REST wrapper.
- **Docker:** Deploy the server, then use the client configuration shown inline.
- **Remote URL:** Supported; use the configuration and steps shown inline.

- [Server implementation 1](https://github.com/phillipboesger/polarion-mcp/blob/main/src/http-server.ts)
- [Server implementation 2](https://github.com/phillipboesger/polarion-mcp/blob/main/src/rest-api.ts)

### n8n REST workflow

Use the HTTP Request node as a workflow step or attach it as a tool to an AI Agent. This confirmed path uses REST. The MCP Client Tool documentation still describes an SSE Endpoint, so it is not used as evidence for a Streamable HTTP setup here.

Default: **Remote URL**.

- **npm / npx:** npx starts MCP stdio. This integration needs the separate REST wrapper.
- **Docker:** Deploy the server, then use the client configuration shown inline.
- **Remote URL:** Supported; use the configuration and steps shown inline.

- [Official documentation 1](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/)
- [Official documentation 2](https://docs.n8n.io/integrations/builtin/credentials/httprequest/)

## Team server prerequisites

Cloud connectors need a server reachable by their provider. Deploy Streamable HTTP with TLS, `MCP_PUBLIC_URL`, a stable `MCP_TOKEN_SECRET`, trusted proxy settings, and exact OAuth redirect allowlists. Claude can use `MCP_ALLOWED_REDIRECT_PRESETS=claude`; ChatGPT supplies its callback during setup. Use DCR unless CIMD is explicitly enabled on the server.

The [Docker setup](https://polarion-mcp.boesger.com/#setup/docker) starts a local PAT-authenticated HTTP endpoint. Follow [deployment](deployment.md) for TLS and OAuth. The [REST wrapper](https://polarion-mcp.boesger.com/#setup/rest-wrapper) uses a deployment PAT plus `HTTP_API_KEY`; it is a separate mode from remote MCP. See [security](security.md) and [configuration](configuration.md).
