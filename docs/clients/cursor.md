# Cursor

Minimal setup information from [clients.json](../clients.json), verified 2026-10-23.

## Prerequisites

- Cursor configured for stdio, streamable-http, sse.
- A remote Polarion MCP server URL or a local stdio installation, plus a PAT when required by the selected authentication mode.

## Setup

Transport: stdio, streamable-http, sse. Authentication modes in the manifest: static-header, oauth-dcr, preregistered-client.

```json
{"mcpServers":{"polarion":{"url":"https://YOUR-SERVER/mcp","headers":{"Authorization":"Bearer YOUR_POLARION_PAT"}}}}
```

## Redirect URI

- `https://www.cursor.com/agents/mcp/oauth/callback`
- `http://localhost:8787/callback` Desktop callback; loopback fixed port.

## Sources

- [https://prod.cursor.com/docs/mcp](https://prod.cursor.com/docs/mcp)
