# Claude API MCP connector

Minimal setup information from [clients.json](../clients.json), verified 2026-10-23.

> **Unverified:** The client setup details below are not verified against current official client documentation. Check the linked sources before deployment.

## Prerequisites

- Claude API MCP connector configured for streamable-http, sse.
- A remote Polarion MCP server URL or a local stdio installation, plus a PAT when required by the selected authentication mode.

## Setup

Transport: streamable-http, sse. Authentication modes in the manifest: static-header, preregistered-client.

```text
Messages API MCP server URL: https://YOUR-SERVER/mcp; pass Authorization: Bearer YOUR_POLARION_PAT in request headers
```

## Redirect URI

No client-specific redirect URI is listed in the manifest.

## Sources

- [https://docs.anthropic.com/en/docs/agents-and-tools/mcp-connector](https://docs.anthropic.com/en/docs/agents-and-tools/mcp-connector)
