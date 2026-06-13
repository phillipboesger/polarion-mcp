# Polarion MCP Server

[![CI](https://github.com/phillipboesger/mcp-polarion/actions/workflows/ci.yml/badge.svg)](https://github.com/phillipboesger/mcp-polarion/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Node.js >= 20](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](https://nodejs.org/)

This repository contains a TypeScript MCP server that turns the Polarion ALM REST API into a tool-based interface for AI assistants (Claude Desktop, VS Code, GitHub Copilot, and other MCP-aware clients). It also ships an optional HTTP wrapper for clients that cannot launch MCP servers directly, such as Custom GPTs.

> **Note:** This is an independent, community open-source project. It is not affiliated with or endorsed by Siemens / Polarion. "Polarion" is a trademark of Siemens. Polarion SDK/help PDFs are **not** bundled — see [`sdk/README.md`](./sdk/README.md).

## What This Repository Provides

- An MCP stdio server for assistants that support Model Context Protocol.
- An HTTP wrapper for Custom GPTs and similar HTTP-only clients.
- Generated Polarion API tools based on the Polarion OpenAPI definition.
- Extra resources and prompts for Polarion documentation and project-specific guidance.

## Why MCP Is Used

MCP is the interface layer between an AI client and this server. The Polarion REST API alone is not enough for most assistant integrations because assistants typically need more than a raw HTTP endpoint:

- MCP gives the client a standard way to discover tools, resources, and prompts.
- The server can validate arguments before calling Polarion.
- The server can sanitize OpenAPI parameter names that are not MCP-safe.
- The server can keep credentials and local documentation on the server side instead of exposing them in every assistant prompt.
- The server can add Polarion-specific helper behavior such as cached project configuration and local SDK document access.

If your client already understands MCP, use MCP mode. If your client only accepts HTTPS actions, use the HTTP mode from this repository.

## Prerequisites

- Node.js 20+
- npm
- Access to a Polarion instance with REST API access enabled

## Where to Get the Polarion REST Token

Set `BEARER_TOKEN` to a Polarion Personal Access Token.

Typical flow:

1. Sign in to your Polarion instance.
2. Open your user profile or personal settings.
3. Find the Personal Access Token section.
4. Create a new token with the minimum scope your workflow needs.
5. Copy the token once and store it in `.env` or your MCP client configuration.

If your Polarion instance does not show Personal Access Tokens, that feature may be restricted or disabled. In that case, contact your Polarion administrator.

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Copy the example environment file and fill in your values:

```bash
cp .env.example .env
```

3. Set at least these variables:

- `API_BASE_URL=https://your-server/polarion/rest/v1`
- `BEARER_TOKEN=your-polarion-personal-access-token`

4. Build the project:

```bash
npm run build
```

5. Choose one runtime mode:

- MCP stdio mode: configure your MCP client to launch `build/index.js`.
- HTTP mode: set `HTTP_API_KEY`, then run `npm run start:http`.
- Docker: see [Run with Docker](#run-with-docker) below.

## MCP Mode

MCP mode is the primary runtime for Copilot, Claude Desktop, and other MCP-aware clients.

Single server example in `mcp.json`:

```json
{
  "servers": {
    "polarion": {
      "type": "stdio",
      "command": "node",
      "args": ["/absolute/path/to/mcp-polarion/build/index.js"],
      "env": {
        "API_BASE_URL": "https://your-server/polarion/rest/v1",
        "BEARER_TOKEN": "your-token-here",
        "NODE_TLS_REJECT_UNAUTHORIZED": "0"
      }
    }
  }
}
```

Multi-server example in `mcp.json`:

```json
{
  "servers": {
    "polarion-sim": {
      "type": "stdio",
      "command": "node",
      "args": ["/absolute/path/to/mcp-polarion/build/index.js"],
      "env": {
        "API_BASE_URL": "https://sim.example.com/polarion/rest/v1",
        "BEARER_TOKEN": "sim-token",
        "NODE_TLS_REJECT_UNAUTHORIZED": "0"
      }
    },
    "polarion-dev": {
      "type": "stdio",
      "command": "node",
      "args": ["/absolute/path/to/mcp-polarion/build/index.js"],
      "env": {
        "API_BASE_URL": "https://dev.example.com/polarion/rest/v1",
        "BEARER_TOKEN": "dev-token",
        "NODE_TLS_REJECT_UNAUTHORIZED": "0"
      }
    }
  }
}
```

Use multiple MCP entries when you need separate Polarion environments, for example `sim`, `dev`, and `asg`, each with its own API URL and token.

## HTTP Mode

HTTP mode is useful when the client cannot start a local stdio MCP server, for example Custom GPT actions or hosted HTTP integrations.

1. Add `HTTP_API_KEY` to `.env`.
2. Start the server:

   ```bash
   npm run start:http
   ```

3. Verify the server:

   ```bash
   curl http://localhost:3000/health
   ```

HTTP endpoints:

- `GET /health`
- `GET /api/tools`
- `POST /api/tools/:toolName`
- `GET /openapi.json`
- `GET /openapi-gpt.json`

## Run with Docker

Build the image:

```bash
docker build -t mcp-polarion .
```

HTTP mode (default command):

```bash
docker run --rm -p 3000:3000 \
  -e API_BASE_URL="https://your-server/polarion/rest/v1" \
  -e BEARER_TOKEN="your-polarion-personal-access-token" \
  -e HTTP_API_KEY="your-generated-http-key" \
  mcp-polarion
```

stdio MCP mode (override the command):

```bash
docker run --rm -i \
  -e API_BASE_URL="https://your-server/polarion/rest/v1" \
  -e BEARER_TOKEN="your-polarion-personal-access-token" \
  mcp-polarion node build/index.js
```

## Verification Checklist

1. Restart your MCP client after config changes.
2. Run a read-only call (projects or work items) to confirm access.
3. If creating items, run `refresh_polarion_config` first to cache project configuration.

## Security Notes

- Never commit tokens to git.
- Keep MCP configs in user-level settings or ignored paths.
- Use `NODE_TLS_REJECT_UNAUTHORIZED=0` only for trusted internal servers.
- Use a distinct `HTTP_API_KEY` for the HTTP wrapper. It is not the same as the Polarion bearer token.

## How It Works

In MCP mode, the client sends tool requests over stdio. The server validates inputs, restores original OpenAPI parameter names, applies authentication, calls Polarion, and returns structured results.

In HTTP mode, the same execution pipeline is reused behind Express endpoints, with `HTTP_API_KEY` protecting the HTTP surface.

## Documentation

See [docs/README.md](./docs/README.md) for the full documentation set, including architecture, features, workflows, configuration, deployment, and troubleshooting guides.

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup, coding style, and the pull-request workflow.

## License

Released under the [MIT License](./LICENSE).
