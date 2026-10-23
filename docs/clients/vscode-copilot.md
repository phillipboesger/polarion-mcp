# VS Code Copilot

Minimal setup information from [clients.json](../clients.json), verified 2026-10-23.

## Prerequisites

- VS Code Copilot configured for stdio, streamable-http, sse.
- A remote Polarion MCP server URL or a local stdio installation, plus a PAT when required by the selected authentication mode.

## Setup

Transport: stdio, streamable-http, sse. Authentication modes in the manifest: static-header, oauth-dcr.

```json
{"servers":{"polarion":{"type":"http","url":"https://YOUR-SERVER/mcp","headers":{"Authorization":"Bearer YOUR_POLARION_PAT"}}}}
```

## Redirect URI

No client-specific redirect URI is listed in the manifest.

## Sources

- [https://code.visualstudio.com/docs/agents/reference/mcp-configuration](https://code.visualstudio.com/docs/agents/reference/mcp-configuration)
- [https://code.visualstudio.com/docs/agents/run/tools](https://code.visualstudio.com/docs/agents/run/tools)
- [https://code.visualstudio.com/docs/agent-customization/mcp-servers](https://code.visualstudio.com/docs/agent-customization/mcp-servers)
