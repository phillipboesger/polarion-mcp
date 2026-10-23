# Cline

Minimal setup information from [clients.json](../clients.json), verified 2026-10-23.

> **Unverified:** The client setup details below are not verified against current official client documentation. Check the linked sources before deployment.

## Prerequisites

- Cline configured for stdio, streamable-http, sse.
- A remote Polarion MCP server URL or a local stdio installation, plus a PAT when required by the selected authentication mode.

## Setup

Transport: stdio, streamable-http, sse. Authentication modes in the manifest: static-header, oauth-dcr.

```text
Cline MCP settings: configure a remote server at https://YOUR-SERVER/mcp with Authorization: Bearer YOUR_POLARION_PAT
```

## Redirect URI

No client-specific redirect URI is listed in the manifest.

## Sources

- [https://docs.cline.bot/mcp/mcp-overview](https://docs.cline.bot/mcp/mcp-overview)
