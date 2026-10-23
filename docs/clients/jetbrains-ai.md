# JetBrains AI Assistant

> **Unverified (check the vendor docs):** client setup details are not verified against current official documentation.

## Prerequisites

- A reachable Polarion MCP server at `https://YOUR-SERVER/mcp`, or Node.js 22 or newer and the npm package for stdio.
- A Polarion personal access token (PAT) for the supported bearer or OAuth login flow, where applicable.
- Configure server environment variables using [configuration](../configuration.md); this guide does not duplicate the environment variable reference.

## Configuration

```json
{"mcpServers":{"polarion":{"url":"https://YOUR-SERVER/mcp"}}}
```

This is the exact client snippet recorded in [clients.json](../clients.json). It is unverified (check the vendor docs).

## Authentication

The manifest lists no authentication mode for this client surface. Its URL-only example does not establish bearer-header or OAuth support. Check vendor documentation before exposing the server.

## OAuth redirect allowlist

Set `MCP_ALLOWED_REDIRECT_PRESETS` to: No preset; OAuth/header support is not verified for this client surface.. Available preset names in server code are `claude`, `chatgpt`, `vscode`, `cursor`, `copilot-studio`, `gemini`, and `loopback`. Presets without a verified fixed URI add no fixed callback. For generated callbacks, put the exact URI supplied by the client in `MCP_ALLOWED_REDIRECT_PREFIXES`. The `loopback` preset permits loopback callbacks. See [configuration](../configuration.md).

## Recommended tools

Use the narrow **work-items** selection: set the endpoint to `https://YOUR-SERVER/mcp/work-items`, or send `X-MCP-Toolsets: work-items` with requests to `/mcp`. Selectors only narrow the server-configured tools. Valid toolsets: `work-items`, `documents`, `test-management`, `plans`, `collections`, `projects`, `users`, `admin`, `jobs`, `pages`, `enumerations`.

## Troubleshooting

- **MCP request returns 401** -> the bearer token is missing or Polarion rejects it -> check the Authorization header and use a valid Polarion PAT; the server validates it with Polarion before opening the session.
- **Toolset selector returns HTTP 400** -> the selector is empty or has an unknown name -> use one or more valid names listed above.

Client-specific notes:

- Official example documents URL-only remote config; bearer header/OAuth support for this surface is not verified.

## Verify the connection

Refresh or inspect the client server tools and confirm `tools/list` returns Polarion tools from the selected toolset. For stdio, use the client connection check and confirm its `tools/list` result.

## Sources

- [https://www.jetbrains.com/help/ai-assistant/mcp.html](https://www.jetbrains.com/help/ai-assistant/mcp.html)
