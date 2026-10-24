<div align="center">

# Polarion MCP

**Connect your AI assistant to Polarion ALM.**

An open-source Model Context Protocol server with **284 tools** generated from the Polarion REST API.

[![CI](https://github.com/phillipboesger/polarion-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/phillipboesger/polarion-mcp/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/polarion-mcp)](https://www.npmjs.com/package/polarion-mcp)
[![Docker image](https://img.shields.io/badge/ghcr.io-polarion--mcp-2496ED?logo=docker&logoColor=white)](https://github.com/phillipboesger/polarion-mcp/pkgs/container/polarion-mcp)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js >=22](https://img.shields.io/badge/node-%3E%3D22-339933?logo=node.js&logoColor=white)](package.json)
[![Model Context Protocol](https://img.shields.io/badge/MCP-server-6E56CF)](https://modelcontextprotocol.io)
[![GitHub stars](https://img.shields.io/github/stars/phillipboesger/polarion-mcp?style=flat)](https://github.com/phillipboesger/polarion-mcp/stargazers)

[**Pick your client**](https://polarion-mcp.boesger.com/#clients) · [Website](https://polarion-mcp.boesger.com/) · [Documentation](docs/README.md) · [Tool catalog](src/tools.ts) · [Security](docs/security.md) · [Deployment](docs/deployment.md) · [Contribute](CONTRIBUTING.md)

</div>

## See it in action

<p align="center">
  <img src="docs/assets/demo.gif" alt="Illustrated workflow: an AI assistant queries Polarion work items and presents the results" width="1000">
</p>

Ask about open defects, read a document, or work with test runs. See a [worked example](docs/example-task.md) and the [usage guide](docs/usage.md).

<details>
<summary>On this page</summary>

- [See it in action](#see-it-in-action)
- [Quickstart](#quickstart)
- [What you can do](#what-you-can-do)
- [Client guides](#client-guides)
- [Security and team deployment](#security-and-team-deployment)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [License](#license)

</details>

## Quickstart

You need **Node.js 22+**, a Polarion instance with its REST API enabled, and a personal access token (PAT).

1. **[Pick your client](https://polarion-mcp.boesger.com/#clients)** for its configuration format. Local clients can launch the npm package with `npx -y polarion-mcp`. Cloud clients need a deployed server; use your team's MCP URL and the matching guide.
2. **Connect.** Add the launch command and environment to your client's configuration. For clients using `mcpServers`, the local stdio configuration is:

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

   Replace the URL and token with your own values. Other clients use a different configuration envelope; follow your client guide. Your client launches the server.
3. **Ask.** Confirm that the client lists Polarion tools, then ask: “List the Polarion projects I can access.”

<details>
<summary>Alternative: build from source</summary>

With Git and Node.js 22+:

```bash
git clone https://github.com/phillipboesger/polarion-mcp.git
cd polarion-mcp
npm ci --ignore-scripts
npm run build
```

In your client's local configuration, replace `"command": "npx"` with `"command": "node"` and `"args": ["-y", "polarion-mcp"]` with `"args": ["/absolute/path/to/polarion-mcp/build/index.js"]`. Keep the same environment variables.

</details>

For Docker, a shared server, or OAuth login, follow the [deployment guide](docs/deployment.md). Having trouble? See [troubleshooting](docs/troubleshooting.md).

## What you can do

- **Work with Polarion data:** generated tools cover work items, documents, test management, plans, projects, and more. Browse the [tool catalog](src/tools.ts).
- **Choose the tools you expose:** named toolsets, an allowlist, and an optional read-only mode narrow the callable surface.
- **Preview changes:** mutating REST tools support `dry_run` request previews. Selected Work Item changes also have guards for enumeration values, custom-field keys, and user references.
- **Read rich text:** supported HTML response values include a Markdown representation alongside the original content.
- **Connect locally or remotely:** MCP over stdio or Streamable HTTP, plus a separate REST wrapper for OpenAPI Actions.

The count describes generated REST tools. The enabled list depends on configuration and can include additional helper tools. See [features and limits](docs/features.md).

## Client guides

The website's client picker is the main setup entry. The complete reference is also available here for GitHub readers.

<details>
<summary>All client guides and compatibility notes</summary>

Entries marked “unverified” need confirmation against the vendor's current documentation. Transport and authentication labels describe the client manifest; they do not certify every setup. For a source build, use `node` with the absolute build path instead of `npx`.

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

</details>

## Security and team deployment

Polarion controls each user's permissions. Remote MCP supports direct PAT authentication and an OAuth login flow that accepts the user's PAT. The REST wrapper instead uses the deployment's Polarion credentials and a separate API key.

For team deployments, start with [deployment](docs/deployment.md), [configuration](docs/configuration.md), and [security](docs/security.md). These cover TLS and reverse proxies, redirect allowlists, token lifetimes, rate limits, and tool restrictions. [Extension interfaces](docs/extensions.md) describe policy, audit, authentication, and instance resolution hooks for custom integrations.

Live integration tests have passed against **Polarion 2506 and 2606**. See the [test workflow](https://github.com/phillipboesger/polarion-mcp/actions/workflows/live-polarion.yml) and [version support](docs/polarion-versioning.md) for scope and instance-dependent limits.

Release workflows generate CycloneDX SBOMs and GitHub build provenance, and sign tagged container images with cosign. See [supply-chain verification](docs/quality/supply-chain.md) for commands and check the artifacts available for each [release](https://github.com/phillipboesger/polarion-mcp/releases).

## Documentation

| I want to… | Read |
|---|---|
| Find a guide | [Documentation index](docs/README.md) |
| Configure the server | [Configuration](docs/configuration.md) |
| Host it for a team | [Deployment](docs/deployment.md) |
| Review authentication and controls | [Security](docs/security.md) |
| Use tools and prompts | [Usage](docs/usage.md) · [Resources and prompts](docs/resources-and-prompts.md) |
| Inspect API coverage | [Tool catalog](src/tools.ts) · [REST coverage](docs/quality/rest-coverage.md) |
| Understand or extend it | [Architecture](docs/architecture.md) · [Extension interfaces](docs/extensions.md) |

## Contributing

Bug reports, documentation fixes, and focused pull requests are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) for setup and checks, or [open an issue](https://github.com/phillipboesger/polarion-mcp/issues) to discuss a larger change.

Built by [Phillip Bösger](https://github.com/phillipboesger), building on the work of [@Jonasdero](https://github.com/Jonasdero).

## License

[MIT](LICENSE) © Phillip Bösger
