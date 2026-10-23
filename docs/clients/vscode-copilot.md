# VS Code Copilot

## Prerequisites

- A reachable Polarion MCP server at `https://YOUR-SERVER/mcp`, or Node.js 22 or newer and the npm package for stdio.
- A Polarion personal access token (PAT) for the supported bearer or OAuth login flow, where applicable.
- Configure server environment variables using [configuration](../configuration.md); this guide does not duplicate the environment variable reference.

## Configuration

```json
{"servers":{"polarion":{"type":"http","url":"https://YOUR-SERVER/mcp","headers":{"Authorization":"Bearer YOUR_POLARION_PAT"}}}}
```

This is the exact client snippet recorded in [clients.json](../clients.json).

## Authentication

**PAT static header:** send `Authorization: Bearer YOUR_POLARION_PAT` on MCP requests or configure the PAT in the client auth UI.

**OAuth:** where supported by this client, register or discover the OAuth client, allow the exact callback below, then enter the Polarion PAT at the Polarion login page. Server OAuth settings are in [configuration](../configuration.md).

## OAuth redirect allowlist

Set `MCP_ALLOWED_REDIRECT_PRESETS` to: vscode (unverified, and it currently expands to no fixed URI); use MCP_ALLOWED_REDIRECT_PREFIXES with the exact callback URI if supplied. Available preset names in server code are `claude`, `chatgpt`, `vscode`, `cursor`, `copilot-studio`, `gemini`, and `loopback`. Presets without a verified fixed URI add no fixed callback. For generated callbacks, put the exact URI supplied by the client in `MCP_ALLOWED_REDIRECT_PREFIXES`. The `loopback` preset permits loopback callbacks. See [configuration](../configuration.md).

## Recommended tools

Use the narrow **work-items** selection: set the endpoint to `https://YOUR-SERVER/mcp/work-items`, or send `X-MCP-Toolsets: work-items` with requests to `/mcp`. Selectors only narrow the server-configured tools. Valid toolsets: `work-items`, `documents`, `test-management`, `plans`, `collections`, `projects`, `users`, `admin`, `jobs`, `pages`, `enumerations`. This client allows at most 128 callable entries per chat request, so a narrow selection is recommended.

## Troubleshooting

- **MCP request returns 401** -> the bearer token is missing or Polarion rejects it -> check the Authorization header and use a valid Polarion PAT; the server validates it with Polarion before opening the session.
- **OAuth registration or login is refused** -> the callback is not in the server allowlist -> configure the matching preset or exact URI in `MCP_ALLOWED_REDIRECT_PREFIXES`; see [configuration](../configuration.md).
- **Toolset selector returns HTTP 400** -> the selector is empty or has an unknown name -> use one or more valid names listed above.

Client-specific notes:

- Maximum per-chat tool count: 128; virtual tools can exceed this limit.
- VS Code config uses top-level `servers`; portable Copilot config uses `mcpServers`.

## Verify the connection

Refresh or inspect the client server tools and confirm `tools/list` returns Polarion tools from the selected toolset. For stdio, use the client connection check and confirm its `tools/list` result.

## Sources

- [https://code.visualstudio.com/docs/agents/reference/mcp-configuration](https://code.visualstudio.com/docs/agents/reference/mcp-configuration)
- [https://code.visualstudio.com/docs/agents/run/tools](https://code.visualstudio.com/docs/agents/run/tools)
- [https://code.visualstudio.com/docs/agent-customization/mcp-servers](https://code.visualstudio.com/docs/agent-customization/mcp-servers)
