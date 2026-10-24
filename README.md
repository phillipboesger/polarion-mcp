<div align="center">

# Polarion MCP

**Your Polarion work, one conversation away.**

Find requirements, review documents and prepare test runs through your AI assistant.
An open-source [Model Context Protocol](https://modelcontextprotocol.io) server with **284 tools** generated from the Polarion REST API.

[![CI](https://github.com/phillipboesger/polarion-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/phillipboesger/polarion-mcp/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/polarion-mcp)](https://www.npmjs.com/package/polarion-mcp)
[![Docker image](https://img.shields.io/badge/ghcr.io-polarion--mcp-2496ED?logo=docker&logoColor=white)](https://github.com/phillipboesger/polarion-mcp/pkgs/container/polarion-mcp)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

[**Connect your assistant**](https://polarion-mcp.boesger.com/#clients) · [Docs](docs/README.md) · [Tool catalog](src/tools.ts) · [Contribute](CONTRIBUTING.md)

</div>

- **Find answers in your project:** ask “Which defects are still open for this release?” or “Summarize the requirements in this LiveDoc.”
- **Prepare changes with control:** use `dry_run` to preview mutating REST requests, or enable `MCP_READ_ONLY` to expose only read-only tools.
- **Use your existing assistant:** Claude, ChatGPT, Copilot, Gemini and major IDE clients connect locally or through a team server.
- **Inspect what you run:** MIT source, release SBOMs and build provenance, plus cosign signatures for tagged container images. See [supply-chain verification](docs/quality/supply-chain.md).

<p align="center"><img src="docs/assets/demo.gif" alt="Illustrated workflow: an AI assistant queries Polarion work items and presents the results" width="1000"></p>

On this page:

- [Quickstart](#quickstart)
- [Choose your client](#choose-your-client)
- [Docker and team servers](#docker-and-team-servers)
- [Tool overview](#tool-overview)
- [Security and enterprise](#security-and-enterprise)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [License](#license)

## Quickstart

You need **Node.js 22+**, a Polarion instance with its REST API enabled, and a personal access token (PAT).

1. **Choose your client** in the [inline setup guide](https://polarion-mcp.boesger.com/#clients). It shows the right config format, command or URL on the same page.
2. **Connect.** For Claude Desktop, Cursor, Windsurf (legacy Cascade), JetBrains AI Assistant and Cline, paste this into the client's MCP configuration. Merge with existing settings and replace the URL and PAT locally. Other formats are in the inline guide.

   ```json
   {
     "mcpServers": {
       "polarion": {
         "command": "npx",
         "args": ["-y", "polarion-mcp"],
         "env": {
           "API_BASE_URL": "https://YOUR-POLARION/polarion/rest/v1",
           "BEARER_TOKEN": "YOUR_POLARION_PAT"
         }
       }
     }
   }
   ```

3. **Ask.** Save and reconnect the client, confirm that Polarion tools appear, then ask: “List the Polarion projects I can access.” Claude Desktop requires a full quit and restart.

The client launches the published npm package. Keep PATs out of Git. Cloud connectors need your own deployed HTTPS server; there is no public Polarion relay. See [usage](docs/usage.md) and [troubleshooting](docs/troubleshooting.md).

## Choose your client

Choose a provider or tool below. Clients with the same configuration format share one setup panel with a client switcher. Each panel contains short steps, a copy button and one snippet.

<!-- clients:start -->
| Group | Setup |
|---|---|
| [Claude](https://polarion-mcp.boesger.com/#setup/claude-desktop) | Desktop JSON; web connector URL; Claude Code CLI; Messages API. |
| [OpenAI / ChatGPT](https://polarion-mcp.boesger.com/#setup/chatgpt-apps) | ChatGPT connector URL; GPT Actions schema; Responses / Agents SDK; Codex CLI. |
| [Microsoft](https://polarion-mcp.boesger.com/#setup/copilot-studio) | Copilot Studio URL + PAT header; VS Code servers JSON. |
| [Google](https://polarion-mcp.boesger.com/#setup/gemini-cli) | Gemini CLI add command with URL and PAT environment. |
| [Tools / IDEs](https://polarion-mcp.boesger.com/#setup/cursor) | VS Code, Cursor, Windsurf, JetBrains, Zed, Cline: one shared JSON panel with client-specific format. |
| [Docker team server](https://polarion-mcp.boesger.com/#setup/docker) | Published GHCR image, per-user PATs, Streamable HTTP; TLS / OAuth for cloud clients. |
| [Custom / automation](https://polarion-mcp.boesger.com/#setup/generic-stdio) | Generic stdio / HTTP; REST wrapper + OpenAPI; n8n HTTP Request. |
<!-- clients:end -->

[Source notes and compatibility details](docs/clients.md) record the current vendor documentation. Client account access, tool budgets and workspace policies can still vary.

## Docker and team servers

The published image starts a **Streamable HTTP MCP server**. For a local server:

```bash
docker run -d --name polarion-mcp \
  -p 127.0.0.1:3000:3000 \
  -e API_BASE_URL=https://YOUR-POLARION/polarion/rest/v1 \
  -e MCP_ALLOWED_HOSTS=localhost:3000,127.0.0.1:3000 \
  ghcr.io/phillipboesger/polarion-mcp:1.4.0
```

Connect an HTTP client to `http://localhost:3000/mcp` with `Authorization: Bearer YOUR_POLARION_PAT`. Each caller uses their own PAT. For cloud connectors and team access, add a TLS reverse proxy, set the public hostname in `MCP_ALLOWED_HOSTS`, and configure OAuth with a stable sealing secret and exact redirect allowlists. The [deployment guide](docs/deployment.md#docker) covers these steps.

For [Custom GPT Actions](https://polarion-mcp.boesger.com/#setup/custom-gpt), OpenAPI integrations or n8n REST workflows, run the **separate REST wrapper** with the deployment PAT and `HTTP_API_KEY`. The [inline REST setup](https://polarion-mcp.boesger.com/#setup/rest-wrapper) includes its Docker command.

## Tool overview

| Domain | What your assistant can do |
|---|---|
| Work items | Search requirements and defects, inspect links, create items and update fields. |
| Documents | Read LiveDocs, work with document parts and contained work items, manage attachments. |
| Test management | Inspect and create test runs, read test records and record results. |
| Plans and collections | Review plans and scheduled items, work with document collections. |
| Projects and people | List projects and users, inspect enumerations and project configuration. |
| Administration and more | Use available REST operations for jobs, pages and other supported domains. |

The **284 tools** count covers generated REST operations. Enabled tools depend on configuration and may include additional helpers. [Named toolsets](docs/configuration.md), allowlists and read-only mode narrow the exposed surface. Mutating REST tools support `dry_run` previews; selected Work Item changes also validate enumeration values, custom-field keys and user references.

Supported rich-text responses include Markdown alongside the original HTML. MCP resources and prompts provide additional context and reusable workflows. See [features and limits](docs/features.md), [resources and prompts](docs/resources-and-prompts.md), and a [worked example](docs/example-task.md).

## Security and enterprise

Polarion enforces the caller's permissions. Local stdio uses the configured PAT. Remote MCP accepts each user's PAT or a sealed OAuth token issued by the server's PAT login flow. The REST wrapper uses the deployment's PAT and a separate API key.

Teams can restrict tools and toolsets, enable read-only mode, configure token lifetimes and rate limits, and set exact redirect allowlists. [Extension interfaces](docs/extensions.md) provide policy, audit, authentication and instance-resolution hooks for custom integrations. Start with [security](docs/security.md), [configuration](docs/configuration.md) and [deployment](docs/deployment.md).

Live integration tests have passed against **Polarion 2506 and 2606**. See [version support](docs/polarion-versioning.md) for tested scope and instance-dependent limits. Release workflows generate CycloneDX SBOMs and build provenance; tagged container images are signed with cosign. Check each [release's artifacts](https://github.com/phillipboesger/polarion-mcp/releases) and [verification commands](docs/quality/supply-chain.md).

## Documentation

| I want to… | Read |
|---|---|
| Get connected | [Inline setup](https://polarion-mcp.boesger.com/#clients) · [Vendor sources](docs/clients.md) |
| Find a guide | [Documentation index](docs/README.md) |
| Configure or host a server | [Configuration](docs/configuration.md) · [Deployment](docs/deployment.md) |
| Review security | [Authentication and controls](docs/security.md) · [Supply chain](docs/quality/supply-chain.md) |
| Use tools and prompts | [Usage](docs/usage.md) · [Resources and prompts](docs/resources-and-prompts.md) |
| Inspect API coverage | [Tool catalog](src/tools.ts) · [REST coverage](docs/quality/rest-coverage.md) |
| Understand or extend the server | [Architecture](docs/architecture.md) · [Extension interfaces](docs/extensions.md) |

## Contributing

Bug reports, documentation fixes and focused pull requests are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) for a source build and checks, or [open an issue](https://github.com/phillipboesger/polarion-mcp/issues) to discuss a larger change.

Built by [Phillip Bösger](https://github.com/phillipboesger), building on the work of [@Jonasdero](https://github.com/Jonasdero).

## License

[MIT](LICENSE) © Phillip Bösger
