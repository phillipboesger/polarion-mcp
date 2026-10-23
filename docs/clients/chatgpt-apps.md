# ChatGPT connectors / Apps

> **Unverified (check the vendor docs):** client setup details are not verified against current official documentation.

## Prerequisites

- A reachable Polarion MCP server at `https://YOUR-SERVER/mcp`.
- A Polarion personal access token (PAT) for the supported bearer or OAuth login flow, where applicable.
- Configure server environment variables using [configuration](../configuration.md); this guide does not duplicate the environment variable reference.

## Configuration

```text
Create a custom MCP app with server URL https://YOUR-SERVER/mcp; select OAuth and configure the server authorization metadata.
```

This is the exact client snippet recorded in [clients.json](../clients.json). It is unverified (check the vendor docs).

## Authentication

**OAuth:** where supported by this client, register or discover the OAuth client, allow the exact callback below, then enter the Polarion PAT at the Polarion login page. Server OAuth settings are in [configuration](../configuration.md).

## OAuth redirect allowlist

Set `MCP_ALLOWED_REDIRECT_PRESETS` to: chatgpt (unverified, and it currently expands to no fixed URI); use MCP_ALLOWED_REDIRECT_PREFIXES with the exact callback URI.. Available preset names in server code are `claude`, `chatgpt`, `vscode`, `cursor`, `copilot-studio`, `gemini`, and `loopback`. Presets without a verified fixed URI add no fixed callback. For generated callbacks, put the exact URI supplied by the client in `MCP_ALLOWED_REDIRECT_PREFIXES`. The `loopback` preset permits loopback callbacks. See [configuration](../configuration.md).

## Recommended tools

Use the narrow **work-items and documents** selection: set the endpoint to `https://YOUR-SERVER/mcp/work-items,documents`, or send `X-MCP-Toolsets: work-items,documents` with requests to `/mcp`. Selectors only narrow the server-configured tools. Valid toolsets: `work-items`, `documents`, `test-management`, `plans`, `collections`, `projects`, `users`, `admin`, `jobs`, `pages`, `enumerations`.

## Troubleshooting

- **MCP request returns 401** -> the bearer token is missing or Polarion rejects it -> check the Authorization header and use a valid Polarion PAT; the server validates it with Polarion before opening the session.
- **OAuth registration or login is refused** -> the callback is not in the server allowlist -> configure the matching preset or exact URI in `MCP_ALLOWED_REDIRECT_PREFIXES`; see [configuration](../configuration.md).
- **Toolset selector returns HTTP 400** -> the selector is empty or has an unknown name -> use one or more valid names listed above.

Client-specific notes:

- ChatGPT custom MCP apps are remote only; OAuth requires refresh-token support for durable access.
- Static API key auth is not a supported custom MCP authentication option in current docs.

## Verify the connection

Refresh or inspect the client server tools and confirm `tools/list` returns Polarion tools from the selected toolset. For stdio, use the client connection check and confirm its `tools/list` result.

## Sources

- [https://help.openai.com/en/articles/12584461-connecting-custom-mcp-servers-in-chatgpt](https://help.openai.com/en/articles/12584461-connecting-custom-mcp-servers-in-chatgpt)
- [https://developers.openai.com/plugins/build/auth](https://developers.openai.com/plugins/build/auth)
- [https://developers.openai.com/api/docs/guides/custom-mcp-server](https://developers.openai.com/api/docs/guides/custom-mcp-server)
