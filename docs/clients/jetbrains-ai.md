# JetBrains AI Assistant

Minimal setup information from [clients.json](../clients.json), verified 2026-10-23.

> **Unverified:** The client setup details below are not verified against current official client documentation. Check the linked sources before deployment.

## Prerequisites

- JetBrains AI Assistant configured for stdio, streamable-http, sse.
- A remote Polarion MCP server URL or a local stdio installation, plus a PAT when required by the selected authentication mode.

## Setup

Transport: stdio, streamable-http, sse. Authentication modes in the manifest: none.

```json
{"mcpServers":{"polarion":{"url":"https://YOUR-SERVER/mcp"}}}
```

## Redirect URI

No client-specific redirect URI is listed in the manifest.

## Sources

- [https://www.jetbrains.com/help/ai-assistant/mcp.html](https://www.jetbrains.com/help/ai-assistant/mcp.html)
