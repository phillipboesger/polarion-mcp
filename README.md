# Polarion MCP

Polarion MCP is an open-source Model Context Protocol server for the Polarion ALM REST API. It gives MCP clients access to Polarion tools over stdio or Streamable HTTP, with a separate REST wrapper for integrations that use OpenAPI actions.

- [Quickstart](#quickstart)
- [Pick your client](#pick-your-client)
- [Features](#features)
- [Authentication overview](#authentication-overview)
- [Documentation](#documentation)

## Quickstart

For a remote MCP client, use your server's MCP URL (for example, `https://YOUR-SERVER/mcp`) and authenticate with your Polarion personal access token (PAT). OAuth login is available when enabled by the server administrator. See the [client setup guides](docs/README.md#client-setup).

For a local stdio client, set the Polarion REST API URL and PAT in its environment, then run:

```bash
API_BASE_URL=https://YOUR-POLARION/polarion/rest/v1 BEARER_TOKEN=YOUR_POLARION_PAT npx -y polarion-mcp
```

## Pick your client

<!-- clients:start -->
| Client | Transport | Auth | Guide |
|---|---|---|---|
| Claude.ai / Claude Desktop (custom connectors) | Streamable HTTP, SSE | static header, oauth dcr, preregistered client | [Setup](docs/clients/claude-web-desktop.md) |
| Claude Code (unverified) | stdio, Streamable HTTP, SSE | static header, oauth dcr | [Setup](docs/clients/claude-code.md) |
| Claude API MCP connector (unverified) | Streamable HTTP, SSE | static header, preregistered client | [Setup](docs/clients/claude-api.md) |
| ChatGPT connectors / Apps (unverified) | Streamable HTTP, SSE | oauth dcr, cimd, preregistered client | [Setup](docs/clients/chatgpt-apps.md) |
| Custom GPT (Actions) (unverified) | REST action | static header, preregistered client | [Setup](docs/clients/custom-gpt.md) |
| OpenAI Responses API / Agents SDK | Streamable HTTP, SSE | static header, preregistered client | [Setup](docs/clients/openai-api.md) |
| Codex CLI (unverified) | stdio, Streamable HTTP, SSE | static header, oauth dcr | [Setup](docs/clients/codex-cli.md) |
| VS Code Copilot | stdio, Streamable HTTP, SSE | static header, oauth dcr | [Setup](docs/clients/vscode-copilot.md) |
| Microsoft Copilot Studio | Streamable HTTP | static header, oauth dcr, preregistered client | [Setup](docs/clients/copilot-studio.md) |
| Cursor | stdio, Streamable HTTP, SSE | static header, oauth dcr, preregistered client | [Setup](docs/clients/cursor.md) |
| Windsurf (unverified) | stdio, Streamable HTTP, SSE | static header, oauth dcr | [Setup](docs/clients/windsurf.md) |
| JetBrains AI Assistant (unverified) | stdio, Streamable HTTP, SSE | none | [Setup](docs/clients/jetbrains-ai.md) |
| Gemini CLI (unverified) | stdio, Streamable HTTP, SSE | static header, oauth dcr | [Setup](docs/clients/gemini-cli.md) |
| Zed (unverified) | stdio, Streamable HTTP, SSE | static header, oauth dcr | [Setup](docs/clients/zed.md) |
| Cline (unverified) | stdio, Streamable HTTP, SSE | static header, oauth dcr | [Setup](docs/clients/cline.md) |
| n8n (unverified) | Streamable HTTP | static header, oauth dcr, preregistered client | [Setup](docs/clients/n8n.md) |
<!-- clients:end -->

## Features

- 284 tools generated from the Polarion REST API definition.
- Guarded operations for selected risky changes and optional read-only or allowlisted tool access.
- `dry_run` support on guarded operations.
- Markdown rendering for supported Polarion content.
- Toolsets for selecting groups of tools.
- OAuth login and direct PAT authentication.
- Redirect URI presets and opt-in Client ID Metadata Documents (CIMD).
- A REST wrapper and a reduced OpenAPI document for action clients.

## Authentication overview

MCP clients can use a Polarion PAT directly as a bearer token, or use the server's OAuth login when it is enabled. OAuth lets users enter their PAT through the server login flow. The REST wrapper uses its configured server-side credentials and API key. Details are in [Authentication and security](docs/security.md), [configuration](docs/configuration.md), and the individual client guides.

## Documentation

Browse the [documentation index](docs/README.md) for configuration, deployment, security, usage, architecture, and client setup guides. The complete generated tool list is in [`src/tools.ts`](src/tools.ts).
