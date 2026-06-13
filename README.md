# Polarion MCP Server

[![CI](https://github.com/phillipboesger/polarion-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/phillipboesger/polarion-mcp/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Node.js >= 20](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](https://nodejs.org/)

A TypeScript **MCP (Model Context Protocol) server** that turns the Polarion ALM REST API into a tool-based interface for AI assistants — Claude Code, Claude Desktop, VS Code (GitHub Copilot), and any other MCP-aware client. It also ships an optional **HTTP wrapper** so HTTP-only clients such as ChatGPT Custom GPTs can call the same tools.

> **Note:** Independent, community open-source project. Not affiliated with or endorsed by Siemens / Polarion. "Polarion" is a trademark of Siemens. Polarion SDK/help PDFs are **not** bundled — see [`sdk/README.md`](./sdk/README.md).

## What you get

- An **MCP stdio server** exposing ~210 Polarion REST operations as tools.
- An **HTTP wrapper** for Custom GPTs and other HTTP-only clients.
- Polarion-specific extras: cached project configuration, SDK documentation access, and guided prompts for creating/searching/updating work items.

## Contents

- [Prerequisites](#prerequisites)
- [Get a Polarion token](#get-a-polarion-token)
- [Build it once](#build-it-once)
- [Install in your AI client](#install-in-your-ai-client)
  - [Claude Code (CLI)](#claude-code-cli)
  - [Claude Desktop](#claude-desktop)
  - [VS Code (GitHub Copilot)](#vs-code-github-copilot)
  - [ChatGPT (Custom GPT)](#chatgpt-custom-gpt)
  - [Claude.ai (web)](#claudeai-web)
- [Run with Docker](#run-with-docker)
- [Configuration reference](#configuration-reference)
- [Security notes](#security-notes)
- [Documentation](#documentation)

## Prerequisites

- Node.js 20+ and npm
- Access to a Polarion instance with the REST API enabled
- A Polarion **Personal Access Token** (see below)

## Get a Polarion token

Set `BEARER_TOKEN` to a Polarion Personal Access Token:

1. Sign in to your Polarion instance.
2. Open your user profile / personal settings.
3. Find the **Personal Access Token** section.
4. Create a token with the minimum scope your workflow needs.
5. Copy it once and store it in your MCP client config (or `.env`).

If your instance does not show Personal Access Tokens, the feature may be disabled — contact your Polarion administrator.

## Build it once

All local (stdio) integrations use the compiled `build/index.js`. Clone and build first:

```bash
git clone https://github.com/phillipboesger/polarion-mcp.git
cd polarion-mcp
npm install      # installs deps and builds (via the prepare script)
npm run build    # (re)build explicitly if needed
```

Note the **absolute path** to `build/index.js` — you will paste it into each client config below. Get it with:

```bash
echo "$(pwd)/build/index.js"
```

Two environment variables are required for every client:

- `API_BASE_URL` — e.g. `https://your-polarion-server/polarion/rest/v1`
- `BEARER_TOKEN` — your Polarion Personal Access Token

For internal servers with a self-signed certificate, also set `NODE_TLS_REJECT_UNAUTHORIZED=0`.

## Install in your AI client

### Claude Code (CLI)

Use the `claude mcp add` command (replace the path and values):

```bash
claude mcp add polarion \
  -e API_BASE_URL=https://your-polarion-server/polarion/rest/v1 \
  -e BEARER_TOKEN=your-polarion-personal-access-token \
  -- node /absolute/path/to/polarion-mcp/build/index.js
```

Then verify:

```bash
claude mcp list
```

To scope the server to one project only, run the command from that project directory (Claude Code stores it in the project's local config), or add `--scope user` to make it available everywhere.

### Claude Desktop

Edit the Claude Desktop config file:

- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "polarion": {
      "command": "node",
      "args": ["/absolute/path/to/polarion-mcp/build/index.js"],
      "env": {
        "API_BASE_URL": "https://your-polarion-server/polarion/rest/v1",
        "BEARER_TOKEN": "your-polarion-personal-access-token"
      }
    }
  }
}
```

Restart Claude Desktop. The Polarion tools appear under the 🔌 (connectors) icon.

### VS Code (GitHub Copilot)

VS Code runs MCP servers in **Copilot agent mode**. Create `.vscode/mcp.json` in your workspace (or add the same block to your user `settings.json` under `"mcp"`):

```json
{
  "servers": {
    "polarion": {
      "type": "stdio",
      "command": "node",
      "args": ["/absolute/path/to/polarion-mcp/build/index.js"],
      "env": {
        "API_BASE_URL": "https://your-polarion-server/polarion/rest/v1",
        "BEARER_TOKEN": "your-polarion-personal-access-token"
      }
    }
  }
}
```

Open the Chat view, switch to **Agent** mode, and start the `polarion` server from the tools picker. You can run several entries (e.g. `polarion-sim`, `polarion-dev`) with different `API_BASE_URL`/`BEARER_TOKEN` values to target multiple environments.

### ChatGPT (Custom GPT)

ChatGPT cannot launch a local MCP server, so use the **HTTP wrapper** and wire it up as a Custom GPT **Action**.

1. Deploy the HTTP server (see [Run with Docker](#run-with-docker) or [docs/deployment.md](./docs/deployment.md)) with `API_BASE_URL`, `BEARER_TOKEN`, and a generated `HTTP_API_KEY`:

   ```bash
   bash scripts/generate-api-key.sh   # prints a secure HTTP_API_KEY
   npm run start:http
   ```

2. In ChatGPT → **Create a GPT → Configure → Actions → Import from URL**, point at your deployment's `/openapi-gpt.json` (a Custom-GPT-friendly spec limited to 30 operations).
3. Set **Authentication → API Key → Bearer**, and paste the `HTTP_API_KEY` value.
4. Save. The GPT can now call the Polarion tools over HTTPS.

> The full `/openapi.json` (all ~210 operations) is also available, but exceeds the 30-action Custom GPT limit — use `/openapi-gpt.json` there.

### Claude.ai (web)

Claude.ai (Pro/Max/Team/Enterprise) supports **custom connectors**, which are *remote MCP servers* reachable over HTTPS. This repository ships a **local stdio** server (ideal for Claude Desktop/Code/VS Code) and a **REST HTTP wrapper** (built for ChatGPT Actions). The REST wrapper is **not** an MCP-over-HTTP transport, so it cannot be added directly as a Claude.ai connector yet.

Today, the practical options are:

- **Recommended:** use **Claude Desktop** (above) — it signs in with the same Claude account and gives you the full Polarion tool set.
- **Remote connector:** exposing this server as a native Claude.ai connector requires an MCP *Streamable HTTP* endpoint. That transport is not implemented here yet — contributions/tracking welcome via an issue.

## Run with Docker

Build the image:

```bash
docker build -t polarion-mcp .
```

HTTP mode (default command — for ChatGPT / hosted use):

```bash
docker run --rm -p 3000:3000 \
  -e API_BASE_URL="https://your-polarion-server/polarion/rest/v1" \
  -e BEARER_TOKEN="your-polarion-personal-access-token" \
  -e HTTP_API_KEY="your-generated-http-key" \
  polarion-mcp
```

stdio MCP mode (override the command):

```bash
docker run --rm -i \
  -e API_BASE_URL="https://your-polarion-server/polarion/rest/v1" \
  -e BEARER_TOKEN="your-polarion-personal-access-token" \
  polarion-mcp node build/index.js
```

HTTP endpoints: `GET /health`, `GET /api/tools`, `POST /api/tools/:toolName`, `GET /openapi.json`, `GET /openapi-gpt.json`.

## Configuration reference

| Variable | Required | Purpose |
| --- | --- | --- |
| `API_BASE_URL` | yes | Polarion REST base, e.g. `https://host/polarion/rest/v1` |
| `BEARER_TOKEN` | yes | Polarion Personal Access Token |
| `HTTP_API_KEY` | HTTP mode | Protects the HTTP wrapper; **not** the Polarion token |
| `HTTP_PORT` | no | HTTP server port (default `3000`) |
| `NODE_TLS_REJECT_UNAUTHORIZED` | no | Set to `0` only for trusted internal self-signed servers |

Copy [`.env.example`](./.env.example) to `.env` for local development. See [docs/configuration.md](./docs/configuration.md) for advanced per-scheme auth overrides.

## Security notes

- Never commit tokens. `.env` is gitignored.
- Keep MCP configs in user-level settings or ignored paths.
- Use `NODE_TLS_REJECT_UNAUTHORIZED=0` only for trusted internal servers.
- Use a distinct `HTTP_API_KEY` for the HTTP wrapper — it is not the Polarion bearer token.

## Documentation

See [docs/README.md](./docs/README.md) for architecture, features, workflows, configuration, deployment, security, and troubleshooting guides. A worked end-to-end example lives in [docs/example-task.md](./docs/example-task.md).

## Contributing

Contributions welcome — see [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

[MIT](./LICENSE)
