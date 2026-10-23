# Gemini CLI

Minimal setup information from [clients.json](../clients.json), verified 2026-10-23.

> **Unverified:** The client setup details below are not verified against current official client documentation. Check the linked sources before deployment.

## Prerequisites

- Gemini CLI configured for stdio, streamable-http, sse.
- A remote Polarion MCP server URL or a local stdio installation, plus a PAT when required by the selected authentication mode.

## Setup

Transport: stdio, streamable-http, sse. Authentication modes in the manifest: static-header, oauth-dcr.

```json
{"mcpServers":{"polarion":{"httpUrl":"https://YOUR-SERVER/mcp","headers":{"Authorization":"Bearer YOUR_POLARION_PAT"}}}}
```

## Redirect URI

No client-specific redirect URI is listed in the manifest.

## Sources

- [https://github.com/google-gemini/gemini-cli](https://github.com/google-gemini/gemini-cli)
