# Client setup reference

[Choose a client and complete setup on the landing page](https://polarion-mcp.boesger.com/#setup/claude-desktop).

This reference records the vendor sources checked on 2026-10-24. It describes documented configuration, not an end-to-end test of every client account or subscription. The source of truth is [clients.json](clients.json); run `npm run docs:clients` and `npm run docs:site` after editing it.

## Server choice

Choose **npm / npx** for a local stdio subprocess, **Docker** to deploy a server, or **Remote URL** when your team already hosts it. The inline picker shows a default and disables unsupported choices with a reason. Docker normally runs Streamable HTTP; JetBrains uses a local Docker stdio subprocess because its documented remote authentication is insufficient for this guide.

## Shared setups

- **Local MCP configuration:** [Claude Desktop](https://polarion-mcp.boesger.com/#setup/claude-desktop), [Cursor](https://polarion-mcp.boesger.com/#setup/cursor), [Windsurf / Cascade](https://polarion-mcp.boesger.com/#setup/windsurf), [JetBrains AI Assistant](https://polarion-mcp.boesger.com/#setup/jetbrains-ai), [Other AI provider / any MCP client](https://polarion-mcp.boesger.com/#setup/generic-stdio).
- **Add from your terminal:** [Claude Code](https://polarion-mcp.boesger.com/#setup/claude-code), [Codex](https://polarion-mcp.boesger.com/#setup/codex-cli), [Gemini CLI](https://polarion-mcp.boesger.com/#setup/gemini-cli).
- **Connect to your team server:** [Claude Desktop](https://polarion-mcp.boesger.com/#setup/claude-desktop), [claude.ai](https://polarion-mcp.boesger.com/#setup/claude-web-desktop), [ChatGPT connector](https://polarion-mcp.boesger.com/#setup/chatgpt-apps), [Microsoft Copilot Studio](https://polarion-mcp.boesger.com/#setup/copilot-studio), [Gemini Enterprise](https://polarion-mcp.boesger.com/#setup/gemini-enterprise), [Docker team server](https://polarion-mcp.boesger.com/#setup/docker), [Generic HTTP client](https://polarion-mcp.boesger.com/#setup/generic-http), [REST wrapper / OpenAPI](https://polarion-mcp.boesger.com/#setup/rest-wrapper).
- **VS Code MCP configuration:** [VS Code / GitHub Copilot](https://polarion-mcp.boesger.com/#setup/vscode-copilot).
- **Claude Messages API:** [Claude API](https://polarion-mcp.boesger.com/#setup/claude-api).
- **OpenAI Responses API:** [OpenAI Responses API](https://polarion-mcp.boesger.com/#setup/openai-api).
- **OpenAI Agents SDK:** [OpenAI Agents SDK](https://polarion-mcp.boesger.com/#setup/openai-agents).
- **Custom GPT Actions:** [Custom GPT Actions](https://polarion-mcp.boesger.com/#setup/custom-gpt).
- **Docker team server:** [Claude Code](https://polarion-mcp.boesger.com/#setup/claude-code), [OpenAI Agents SDK](https://polarion-mcp.boesger.com/#setup/openai-agents), [Codex](https://polarion-mcp.boesger.com/#setup/codex-cli), [Microsoft Copilot Studio](https://polarion-mcp.boesger.com/#setup/copilot-studio), [VS Code / GitHub Copilot](https://polarion-mcp.boesger.com/#setup/vscode-copilot), [Gemini CLI](https://polarion-mcp.boesger.com/#setup/gemini-cli), [Gemini Enterprise](https://polarion-mcp.boesger.com/#setup/gemini-enterprise), [Cursor](https://polarion-mcp.boesger.com/#setup/cursor), [Windsurf / Cascade](https://polarion-mcp.boesger.com/#setup/windsurf), [Docker team server](https://polarion-mcp.boesger.com/#setup/docker), [Other AI provider / any MCP client](https://polarion-mcp.boesger.com/#setup/generic-stdio), [Generic HTTP client](https://polarion-mcp.boesger.com/#setup/generic-http).
- **REST wrapper / OpenAPI:** [Custom GPT Actions](https://polarion-mcp.boesger.com/#setup/custom-gpt), [REST wrapper / OpenAPI](https://polarion-mcp.boesger.com/#setup/rest-wrapper), [n8n REST workflow](https://polarion-mcp.boesger.com/#setup/n8n).
- **n8n HTTP Request:** [n8n REST workflow](https://polarion-mcp.boesger.com/#setup/n8n).
- **HTTPS team server with OAuth:** [Claude Desktop](https://polarion-mcp.boesger.com/#setup/claude-desktop), [claude.ai](https://polarion-mcp.boesger.com/#setup/claude-web-desktop).
- **Remote MCP configuration:** [VS Code / GitHub Copilot](https://polarion-mcp.boesger.com/#setup/vscode-copilot), [Cursor](https://polarion-mcp.boesger.com/#setup/cursor), [Windsurf / Cascade](https://polarion-mcp.boesger.com/#setup/windsurf), [Other AI provider / any MCP client](https://polarion-mcp.boesger.com/#setup/generic-stdio).
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

Steps checked against the vendor documentation on 2026-10-24. Not confirmed in the documentation, so the steps stay neutral here:

- Exact path to add a remote custom connector inside Claude Desktop: the vendor article states remote connectors work on Claude Desktop but gives only the claude.ai path (Customize > Connectors). Assumed identical; check once on a real install.
- Whether Claude Desktop uses the same callback https://claude.ai/api/mcp/auth_callback (building-connectors article returned 404).
- Linux config path for claude_desktop_config.json is not documented in the sources read.

### claude.ai

On Team / Enterprise, an owner adds the connector under Organization settings > Connectors > Add > Custom > Web; members then choose Connect.

Default: **Remote URL**.

- **npm / npx:** claude.ai connects from Anthropic's cloud, so it cannot start npx.
- **Docker:** Deploy the server, then use the client configuration shown inline.
- **Remote URL:** Supported; use the configuration and steps shown inline.

- [Official documentation](https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp)

Steps checked against the vendor documentation on 2026-10-24. Not confirmed in the documentation, so the steps stay neutral here:

- Callback https://claude.ai/api/mcp/auth_callback comes from the existing repo data; vendor article (building custom connectors) returned 404 so not re-verified.
- Which plans may use custom connectors changes over time; source says Free, Pro, Max, Team, Enterprise on 2026-10-24.

### Claude Code

Commands shown for macOS, Linux and WSL. Install the selected client and Node.js 22+. Replace the URL and PAT before running; the command stores them in your local client configuration.

Default: **npm / npx**.

- **npm / npx:** Supported; use the configuration and steps shown inline.
- **Docker:** Deploy the server, then use the client configuration shown inline.
- **Remote URL:** Supported; use the configuration and steps shown inline.

- [Official documentation](https://code.claude.com/docs/en/mcp)

Steps checked against the vendor documentation on 2026-10-24. Not confirmed in the documentation, so the steps stay neutral here:

- Windows native npx wrapper (cmd /c) not found in the first 100k characters of the Claude Code MCP page; not included.
- Whether a running Claude Code session picks up a newly added server without restart: docs only say to check /mcp. Steps tell the person to start claude after adding.
- Behaviour of http://localhost for the --transport http flag was not verified in vendor docs (works as a plain URL).

### Claude API

Add these fields to your Messages request. Enable the mcp-client-2025-11-20 beta header. The Polarion PAT authenticates to this server; your Anthropic API key authenticates the API request.

Default: **Remote URL**.

- **npm / npx:** Only public HTTP servers work; local stdio cannot connect.
- **Docker:** Deploy the server, then use the client configuration shown inline.
- **Remote URL:** Supported; use the configuration and steps shown inline.

- [Official documentation](https://platform.claude.com/docs/en/agents-and-tools/mcp-connector)

Steps checked against the vendor documentation on 2026-10-24. Not confirmed in the documentation, so the steps stay neutral here:

- The doc calls authorization_token an OAuth token; that it is forwarded as Authorization: Bearer <value> to the Polarion server is how this repo expects it but the page does not state the header form.
- Newer beta header mcp-client-2026-09-15 (pins tool lists, includes everything in 2025-11-20) exists; the repo and basic doc example use 2025-11-20.
- Model name left as placeholder; the doc example uses claude-opus-5-5 but model lists change.

### ChatGPT connector

Custom MCP access depends on your ChatGPT workspace permissions. Use DCR for this server unless the administrator explicitly enabled CIMD. This guide covers the public HTTPS connector path. OpenAI also documents Secure MCP Tunnel for private servers; that requires its own tunnel runtime and permissions, so local npx is not a direct connector setup.

Default: **Remote URL**.

- **npm / npx:** ChatGPT's cloud cannot start npx. Use Remote or Docker mode.
- **Docker:** Deploy the server, then use the client configuration shown inline.
- **Remote URL:** Supported; use the configuration and steps shown inline.

- [Official documentation](https://developers.openai.com/api/docs/guides/custom-mcp-server)

Steps checked against the vendor documentation on 2026-10-24. Not confirmed in the documentation, so the steps stay neutral here:

- Which ChatGPT plans (Plus, Pro, Business, Enterprise, Edu) can add custom MCP servers: the OpenAI page only says workspace permissions and security restrictions apply.
- The exact OAuth callback address ChatGPT uses: not documented; the person must read it from ChatGPT (the page does not say where it is shown) or from the server's rejected-redirect log.
- Exact wording of the sign-in step: how a PAT is entered depends on this server's login page, not on OpenAI.
- Whether the Server URL field must be filled for OAuth DCR with this server was verified only as documented option; end-to-end not tested.

### Custom GPT Actions

This uses the REST wrapper and its HTTP_API_KEY, not the MCP endpoint or the user PAT. The reduced schema contains 30 actions. A team administrator deploys the REST wrapper first.

Default: **Remote URL**.

- **npm / npx:** GPT Actions need a public REST wrapper, not the MCP server or npx.
- **Docker:** Deploy the server, then use the client configuration shown inline.
- **Remote URL:** Supported; use the configuration and steps shown inline.

- [Official documentation 1](https://developers.openai.com/api/docs/actions/getting-started)
- [Official documentation 2](https://developers.openai.com/api/docs/actions/authentication)

Steps checked against the vendor documentation on 2026-10-24. Not confirmed in the documentation, so the steps stay neutral here:

- Exact current GPT editor labels (Configure tab, 'Create new action', 'Import from URL', Auth Type 'Bearer'): OpenAI's developer pages describe only 'Action section', 'paste in your Open API schema', 'authentication settings' (None / API Key / OAuth) and the Test button. The steps use those and avoid other labels.
- Which ChatGPT plans can create GPTs with Actions.
- Schema import by URL and the Bearer sub-option of API Key: not stated in the pages checked (help.openai.com returned 403).
- Behaviour: the openapi-gpt.json address must not require a key; the repo's http-server.ts lets /openapi-gpt.json bypass the key check, which is consistent.

### OpenAI Responses API

Add this tools field to a Responses request. Use your OpenAI API key for the API request and your Polarion PAT for the MCP server.

Default: **Remote URL**.

- **npm / npx:** OpenAI's cloud cannot start npx. Use a public HTTPS server.
- **Docker:** Deploy the server, then use the client configuration shown inline.
- **Remote URL:** Supported; use the configuration and steps shown inline.

- [Official documentation](https://developers.openai.com/api/docs/guides/tools-connectors-mcp)

Steps checked against the vendor documentation on 2026-10-24. Not confirmed in the documentation, so the steps stay neutral here:

- That the 'authorization' field accepts a Polarion PAT: OpenAI documents it as an OAuth access token sent to the server (as a Bearer token); a PAT is treated the same way by this server, but OpenAI does not mention PATs.
- A 'headers' field: not found in the fetched page, so it is not used.
- Current model names: the page example uses a model name we did not rely on; use any model your account supports.
- Sample code is assembled from documented fields, not copied from an official sample.

### OpenAI Agents SDK

Use inside your async application with openai-agents installed and Agent imported from agents. Run the agent while the server context is open. Keep API keys and PATs in your application secret store.

Default: **npm / npx**.

- **npm / npx:** Supported; use the configuration and steps shown inline.
- **Docker:** Deploy the server, then use the client configuration shown inline.
- **Remote URL:** Supported; use the configuration and steps shown inline.

- [Official documentation 1](https://openai.github.io/openai-agents-python/mcp/)
- [Official documentation 2](https://openai.github.io/openai-agents-python/ref/mcp/server/)

Steps checked against the vendor documentation on 2026-10-24. Not confirmed in the documentation, so the steps stay neutral here:

- Minimum Python version.
- The official MCP guide shows 'pip install' only for the mcp package pins; 'pip install openai-agents' is the package name used by the repo.
- client_session_timeout_seconds is documented as a constructor option for MCPServerStreamableHttp; for MCPServerStdio it is assumed to exist on the shared base class (not shown on the page).
- Environment variables for stdio: MCPServerStdioParams includes env (verified in the API reference).

### Codex

Commands shown for macOS, Linux and WSL. Install the selected client and Node.js 22+. Replace the URL and PAT before running; the command stores them in your local client configuration.

Default: **npm / npx**.

- **npm / npx:** Supported; use the configuration and steps shown inline.
- **Docker:** Deploy the server, then use the client configuration shown inline.
- **Remote URL:** Supported; use the configuration and steps shown inline.

- [Official documentation 1](https://learn.chatgpt.com/docs/extend/mcp?surface=cli)
- [Official documentation 2](https://learn.chatgpt.com/docs/extend/mcp?surface=ide)
- [Official documentation 3](https://learn.chatgpt.com/docs/cli/reference)

Steps checked against the vendor documentation on 2026-10-24. Not confirmed in the documentation, so the steps stay neutral here:

- Windows path of config.toml: docs say ~/.codex/config.toml; the Windows form (.codex folder in the user profile) is an inference.
- Whether the CLI needs a restart after codex mcp add: not stated; steps tell the person to start a new session.
- How the IDE extension receives POLARION_PAT: inherits from the environment that launched the editor (inference, not documented).
- Where the codex mcp add --bearer-token-env-var flag appears: verified in the CLI reference; the MCP guide only shows --oauth-client-id and the TOML key bearer_token_env_var.

### Microsoft Copilot Studio

Use generative orchestration. This path uses a PAT header and does not require an OAuth callback. Select only the tools your agent needs.

Default: **Remote URL**.

- **npm / npx:** Cloud service; it cannot run npx. Use the Docker or Remote URL mode.
- **Docker:** Deploy the server, then use the client configuration shown inline.
- **Remote URL:** Supported; use the configuration and steps shown inline.

- [Official documentation](https://learn.microsoft.com/en-us/microsoft-copilot-studio/mcp-add-existing-server-to-agent)

Steps checked against the vendor documentation on 2026-10-24. Not confirmed in the documentation, so the steps stay neutral here:

- Microsoft's page (updated 2026-10-15) does not state the exact label of the API key value field in the Create a new connection dialog or that the value is sent unchanged; the 'Bearer PAT' value is inferred from the Header option description.
- The page does not mention generative orchestration (kept out of the steps) or any licence requirement; it only says the article applies to agents on the standard harness.
- The page has no test procedure; the test-pane step is generic.
- Server must not need OAuth: the wizard also offers OAuth 2.0 (Dynamic discovery, Dynamic, Manual) but the PAT path was chosen to avoid callback setup. Whether this server's OAuth works with Copilot Studio is not verified (no verified callback URL).

### VS Code / GitHub Copilot

Node.js 22+ is required. VS Code uses a servers object. Select the tools you need in chat; the full catalog can exceed the client tool budget.

Default: **npm / npx**.

- **npm / npx:** Supported; use the configuration and steps shown inline.
- **Docker:** Deploy the server, then use the client configuration shown inline.
- **Remote URL:** Supported; use the configuration and steps shown inline.

- [Official documentation 1](https://code.visualstudio.com/docs/agents/reference/mcp-configuration)
- [Official documentation 2](https://code.visualstudio.com/docs/copilot/customization/mcp-servers)
- [Official documentation 3](https://code.visualstudio.com/docs/agents/run/manage-mcp-servers)
- [Official documentation 4](https://docs.github.com/en/copilot/how-tos/provide-context/use-mcp-in-your-ide/extend-copilot-chat-with-mcp)

Steps checked against the vendor documentation on 2026-10-24. Not confirmed in the documentation, so the steps stay neutral here:

- Docs do not give the file path of the user mcp.json per OS (steps rely on the command MCP: Open User Configuration). The docs mark user-profile mcp.json as 'deprecated in the guided flow' in favour of ~/.copilot/mcp-config.json (top-level mcpServers); the reference page still documents MCP: Open User Configuration, so it is used here.
- Exact wording of the trust prompt is not documented.
- Whether the tools icon is still at the top left of the chat box and the mode dropdown still reads Agent in the newest VS Code (taken from the GitHub Docs page; the VS Code page mentions 'Configure Tools' / Chat: Open Customizations > Tools instead).
- The minimum VS Code version 1.99 is from the GitHub Docs page and may be outdated.

### Gemini CLI

Run Gemini in a trusted folder. If the server shows Disconnected, use gemini trust to trust that folder.

Default: **npm / npx**.

- **npm / npx:** Supported; use the configuration and steps shown inline.
- **Docker:** Deploy the server, then use the client configuration shown inline.
- **Remote URL:** Supported; use the configuration and steps shown inline.

- [Official documentation](https://geminicli.com/docs/tools/mcp-server/)

Steps checked against the vendor documentation on 2026-10-24. Not confirmed in the documentation, so the steps stay neutral here:

- Gemini CLI's own docs say it was replaced by Antigravity CLI on 2026-06-18 for no-cost-tier and Google One users. Third-party sources (not Google) say Code Assist Standard/Enterprise licences and API-key users can keep using Gemini CLI. Antigravity CLI config location (~/.gemini/antigravity-cli/mcp_config.json vs ~/.antigravity/) is reported inconsistently, so it is NOT covered.
- Docs show 'gemini mcp add [options] <name> <commandOrUrl> [args...]' but do not say whether a trailing '-y' is parsed as an option. The command is taken from the repo and not run here.
- The docs do not document the exact message gemini prints after mcp add.
- Docs example for settings.json uses key httpUrl for Streamable HTTP and headers for Authorization; this matches what gemini mcp add --transport http writes, but the written file was not inspected.

### Gemini Enterprise

An administrator may need to override the organization policy that blocks custom MCP data stores. Tools are disabled until you enable them.

Default: **Remote URL**.

- **npm / npx:** Cloud service; it cannot run npx. Use the Docker or Remote URL mode.
- **Docker:** Deploy the server, then use the client configuration shown inline.
- **Remote URL:** Supported; use the configuration and steps shown inline.

- [Official documentation](https://docs.cloud.google.com/gemini/enterprise/docs/connectors/custom-mcp-server/set-up-custom-mcp-server)

Steps checked against the vendor documentation on 2026-10-24. Not confirmed in the documentation, so the steps stay neutral here:

- Google requires you to register Gemini Enterprise as an OAuth client and supply a Client ID and Client Secret. How to obtain them from THIS server (its dynamic registration endpoint /register vs a preconfigured client) is not documented by Google and was not verified against the server; also, Google documents no 'PAT/Authorization header only' option, only No authentication or OAuth 2.0.
- The server's /authorize and /token paths are taken from the repo deployment docs (Apache proxy list), not from a live run against Gemini Enterprise.
- Repo 'gemini' redirect preset has no fixed callback; the Google redirect URL https://vertexaisearch.cloud.google.com/oauth-redirect is from Google's prerequisites and must be added as an exact entry.
- Scopes value for this server is not defined in the Google page; ask the server administrator.
- Google's page has no testing procedure; the final prompt step is generic. The exact menu for attaching the data store to an app is on a separate Google page not fetched.

### Cursor

Node.js 22+ runs the published npm package on your computer. Replace the URL and PAT locally; keep credentials out of Git.

Default: **npm / npx**.

- **npm / npx:** Supported; use the configuration and steps shown inline.
- **Docker:** Deploy the server, then use the client configuration shown inline.
- **Remote URL:** Supported; use the configuration and steps shown inline.

- [Official documentation](https://cursor.com/docs/mcp)

Steps checked against the vendor documentation on 2026-10-24. Not confirmed in the documentation, so the steps stay neutral here:

- Docs do not give a Windows path for the global file (presumably mcp.json in .cursor in your user folder; not stated). The Windows step is therefore worded as the home folder only for macOS/Linux.
- Docs say servers are managed from 'Customize' in the sidebar; no Settings > Tools & MCP menu path is documented, so none is used.
- Docs do not state that a restart or reconnect is needed after editing mcp.json; the restart hint is a fallback.
- Docs list type 'stdio' as required for local servers; the remote example uses url without a type.

### Windsurf / Cascade

The vendor now documents this as legacy Cascade in Devin Desktop. Its 100-tool budget requires selecting a subset of Polarion tools. This config does not apply to the Devin Local agent.

Default: **npm / npx**.

- **npm / npx:** Supported; use the configuration and steps shown inline.
- **Docker:** Deploy the server, then use the client configuration shown inline.
- **Remote URL:** Supported; use the configuration and steps shown inline.

- [Official documentation](https://docs.windsurf.com/windsurf/cascade/mcp)

Steps checked against the vendor documentation on 2026-10-24. Not confirmed in the documentation, so the steps stay neutral here:

- Windsurf docs now live at docs.devin.ai and describe the Cascade MCP config as applying only to the legacy Cascade agent. How to add an MCP server for the Devin Local agent (Devin CLI config files) was not fetched and is not covered.
- The older path ~/.codeium/windsurf/mcp_config.json (seen on a VS Code docs page as a discovery source) is not given by the current Devin page; it may still work for older installs.
- The page does not mention a refresh button; the toggle in the MCPs section is used instead.
- Docs do not state the exact appearance of the Actions (...) menu in the newest Devin Desktop build.

### JetBrains AI Assistant

The vendor documents Streamable HTTP but no authentication configuration matching this server. This guide therefore offers npx or Docker stdio; remote URL is disabled rather than inventing a PAT header field.

Default: **npm / npx**.

- **npm / npx:** Supported; use the configuration and steps shown inline.
- **Docker:** Supported; use the configuration and steps shown inline.
- **Remote URL:** No documented way to send an Authorization header. Use npm or Docker.

- [Official documentation](https://www.jetbrains.com/help/ai-assistant/mcp.html)

Steps checked against the vendor documentation on 2026-10-24. Not confirmed in the documentation, so the steps stay neutral here:

- JetBrains page states no IDE version, AI Assistant version or subscription requirement.
- Remote HTTP with headers: some third-party guides say a headers block works, others say it does not and use mcp-remote; JetBrains documentation is silent, so remote stays unsupported.
- Docs do not say whether 'env' is accepted in the STDIO JSON; it is used here because the standard mcpServers format includes it (the docs only show command and args). If your IDE ignores it, the server will fail with a missing-token error.
- The Level column and Reconnect button are documented; the exact wording of the New MCP Server dialog beyond choosing STDIO/HTTP was not verified.
- The 'Import from Claude' button exists but is not used.

### Docker team server

The image starts Streamable HTTP at http://localhost:3000/mcp. Each caller sends their own Polarion PAT. For team access, proxy HTTPS to the loopback port, forward the public Host, and add your public hostname to MCP_ALLOWED_HOSTS. Cloud connectors also need OAuth; their Docker choice includes that configuration.

Default: **Docker**.

- **npm / npx:** This entry deploys a server. Pick your AI client for npx.
- **Docker:** Deploy the server, then use the client configuration shown inline.
- **Remote URL:** Supported; use the configuration and steps shown inline.

- [Server implementation 1](https://github.com/phillipboesger/polarion-mcp/blob/main/Dockerfile)
- [Server implementation 2](https://github.com/phillipboesger/polarion-mcp/blob/main/docs/deployment.md)

Steps checked against the vendor documentation on 2026-10-24.

### Other AI provider / any MCP client

Your AI provider does not need a dedicated integration. Use any MCP-capable client. If it accepts OpenAPI instead, choose REST / OpenAPI below.

Default: **npm / npx**.

- **npm / npx:** Supported; use the configuration and steps shown inline.
- **Docker:** Deploy the server, then use the client configuration shown inline.
- **Remote URL:** Supported; use the configuration and steps shown inline.

- [Official documentation](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports)

Steps checked against the vendor documentation on 2026-10-24.

### Generic HTTP client

Use your own deployed HTTPS URL. There is no public Polarion relay. Your server must be reachable by the client provider; an administrator sets up TLS, OAuth and exact redirect allowlists.

Default: **Remote URL**.

- **npm / npx:** An HTTP-only client cannot launch a stdio subprocess.
- **Docker:** Deploy the server, then use the client configuration shown inline.
- **Remote URL:** Supported; use the configuration and steps shown inline.

- [Official documentation](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports)

Steps checked against the vendor documentation on 2026-10-24.

### REST wrapper / OpenAPI

All calls use the deployment PAT. Clients send Authorization: Bearer <HTTP_API_KEY>. Serve this behind HTTPS; schemas are at /openapi.json and /openapi-gpt.json. Forward the public Host through your TLS proxy. HTTP_API_KEY is a random secret you invent (for example from openssl rand -hex 32); callers send it as the Bearer token. TRUST_PROXY=1 lets the 100-requests-per-15-minutes limit count each caller separately behind your proxy.

Default: **Docker**.

- **npm / npx:** npx starts MCP stdio. This needs the separate REST wrapper.
- **Docker:** Deploy the server, then use the client configuration shown inline.
- **Remote URL:** Supported; use the configuration and steps shown inline.

- [Server implementation 1](https://github.com/phillipboesger/polarion-mcp/blob/main/src/http-server.ts)
- [Server implementation 2](https://github.com/phillipboesger/polarion-mcp/blob/main/src/rest-api.ts)

Steps checked against the vendor documentation on 2026-10-24.

### n8n REST workflow

Use the HTTP Request node as a workflow step or attach it as a tool to an AI Agent. This confirmed path uses REST. The MCP Client Tool documentation still describes an SSE Endpoint, so it is not used as evidence for a Streamable HTTP setup here.

Default: **Remote URL**.

- **npm / npx:** npx starts MCP stdio. This needs the separate REST wrapper.
- **Docker:** Deploy the server, then use the client configuration shown inline.
- **Remote URL:** Supported; use the configuration and steps shown inline.

- [Official documentation 1](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/)
- [Official documentation 2](https://docs.n8n.io/integrations/builtin/credentials/httprequest/)

Steps checked against the vendor documentation on 2026-10-24.

## Team server prerequisites

Cloud connectors need a server reachable by their provider. Deploy Streamable HTTP with TLS, `MCP_PUBLIC_URL`, a stable `MCP_TOKEN_SECRET`, trusted proxy settings, and exact OAuth redirect allowlists. Claude can use `MCP_ALLOWED_REDIRECT_PRESETS=claude`; ChatGPT supplies its callback during setup. Use DCR unless CIMD is explicitly enabled on the server.

The [Docker setup](https://polarion-mcp.boesger.com/#setup/docker) starts a local PAT-authenticated HTTP endpoint. Follow [deployment](deployment.md) for TLS and OAuth. The [REST wrapper](https://polarion-mcp.boesger.com/#setup/rest-wrapper) uses a deployment PAT plus `HTTP_API_KEY`; it is a separate mode from remote MCP. See [security](security.md) and [configuration](configuration.md).

## More questions

### What does Bearer mean in an Authorization header?

It is just the word Bearer, one space, then your token: `Bearer YOUR_POLARION_PAT`. Without the word Bearer the server answers 401.

### Where do I keep my token safely?

In your personal client settings or an environment variable, never in a file inside a shared project or repository. Anyone who can read the file can act as you in Polarion. With the OAuth connectors you type the token only on the server's login page and the AI client never stores it.

### Which Polarion versions work?

Live integration tests have passed on Polarion 2506 and 2606. The tools are generated from a Polarion OpenAPI definition, which does not guarantee every operation on every release. Verify the operations you rely on against your own instance.

### Which AI clients can I use?

Any client that supports MCP over stdio or Streamable HTTP. The setup guide above lists the tested paths for Claude, ChatGPT and Codex, Copilot Studio, VS Code, Gemini, Cursor, Windsurf and JetBrains. Other clients can use the generic stdio or HTTP entries, or the REST wrapper.

### It says 503 "Polarion could not be reached".

The server got no usable answer from Polarion. Read the log line `Polarion token check failed` (`docker logs polarion-mcp`). Usual causes: the address does not end in `/polarion/rest/v1`, a firewall between server and Polarion, Polarion is down, `localhost` was used inside Docker, or a certificate error. Run the curl test on the machine that hosts the server, not on your laptop.

### Can claude.ai or ChatGPT connect to a server on my own laptop?

No. These connectors connect from the provider's cloud, so the address must be reachable on the public internet with HTTPS. On your own computer use the npm mode in Claude Desktop, Claude Code or Codex instead. Desktop and command-line tools such as VS Code, Cursor, Windsurf and Gemini CLI can use `http://localhost:3000/mcp`.

### What is the difference between the ChatGPT connector and a Custom GPT?

The ChatGPT connector speaks MCP and everyone signs in with their own Polarion token. A Custom GPT uses the separate REST wrapper with one shared key (`HTTP_API_KEY`), so every call runs as the one Polarion user whose token the wrapper holds.

### Certificate errors: the public HTTPS address does not work.

DNS must point to the server, ports 80 and 443 must be reachable from the internet and no other program may use them. Caddy's log (`journalctl -u caddy`, or the terminal) says why the certificate failed. Never switch certificate checking off for the public side.

### My Polarion uses a company or self-signed certificate.

Give Node your company root certificate as a PEM file with `NODE_EXTRA_CA_CERTS=/path/ca.pem`. npm mode: add `"NODE_EXTRA_CA_CERTS": "/path/ca.pem"` to the `env` block of the client config. Docker: `-v /path/ca.pem:/certs/ca.pem:ro -e NODE_EXTRA_CA_CERTS=/certs/ca.pem`. As a last resort on a trusted internal network, `NODE_TLS_REJECT_UNAUTHORIZED=0` works but turns off all certificate checks.

### Should I use polarion-mcp@latest or a pinned version?

The plain `npx -y polarion-mcp` can keep using an older copy from npm's cache. `polarion-mcp@latest` checks the registry at every start and picks up new releases, which can change the tool list without notice. `polarion-mcp@1.4.0` always runs exactly that release. Teams should pin and upgrade on purpose. To force a refresh, switch to `@latest` or a newer pinned version and restart the client.

### How do I update the Docker server?

Choose the new tag on the GitHub package page, then run `docker pull ghcr.io/phillipboesger/polarion-mcp:NEWTAG`, `docker rm -f polarion-mcp`, and the same `docker run` command with the new tag. Keep `MCP_TOKEN_SECRET` unchanged so users stay signed in. With a team URL the administrator updates the server and you only reconnect.

### It says "Unsupported engine" or the Node version is too old.

The package needs Node.js 22 or newer: `node -v` must print v22 or higher. Install the LTS from nodejs.org and open a new terminal; with nvm run `nvm install 22 && nvm use 22`. Desktop apps can use a different Node than your terminal, so install Node system-wide and fully restart the app. Docker avoids this because the image bundles Node 22.

### Windows: the client cannot start npx.

Typical symptoms are `spawn npx ENOENT` or a server that never starts. Use `cmd` as the command with the arguments `/c`, `npx`, `-y`, `polarion-mcp`, because npx is `npx.cmd` on Windows. Backslashes in JSON paths must be doubled (`C:\\path\\ca.pem`). Restart the app completely after every change.

### Port 3000 is already in use.

Change only the left number of the port mapping: `-p 127.0.0.1:3100:3000`, then use `http://localhost:3100/mcp` and set `MCP_ALLOWED_HOSTS=localhost:3100,127.0.0.1:3100`. Remove an old container with `docker rm -f polarion-mcp`. On macOS and Linux `lsof -i :3000` shows who uses the port; on Windows use `netstat -ano | findstr :3000`.

### It says 429 "Too many requests".

The server limits requests per address. Behind a proxy set `TRUST_PROXY=1`, otherwise all users share one counter, then wait 15 minutes for the window to reset. The REST wrapper has a fixed limit per 15 minutes.

### Gemini CLI says it was replaced. Which tool should I use?

Google's page says Gemini CLI was replaced by Antigravity CLI on 18 June 2026 for no-cost-tier and Google One users. If your Gemini CLI still runs, for example with an API key or a company license, the steps in this guide work. Antigravity CLI has its own setup that this guide does not cover yet.

### Windsurf now says Devin. Which steps do I follow?

The vendor docs moved to docs.devin.ai and describe this configuration only for the legacy Cascade agent. If your tab uses the Devin Local agent, MCP servers are set up in Devin CLI config files, which this guide does not cover yet.
