# Claude.ai / Claude Desktop (custom connectors)

Minimal setup information from [clients.json](../clients.json), verified 2026-10-23.

## Prerequisites

- Claude.ai / Claude Desktop (custom connectors) configured for streamable-http, sse.
- A remote Polarion MCP server URL or a local stdio installation, plus a PAT when required by the selected authentication mode.

## Setup

Transport: streamable-http, sse. Authentication modes in the manifest: static-header, oauth-dcr, preregistered-client.

```text
Connector URL: https://YOUR-SERVER/mcp; authenticate with OAuth (paste YOUR_POLARION_PAT at Polarion login)
```

## Redirect URI

- `https://claude.ai/api/mcp/auth_callback`

## Sources

- [https://support.anthropic.com/en/articles/11503834-building-custom-integrations-via-remote-mcp-servers](https://support.anthropic.com/en/articles/11503834-building-custom-integrations-via-remote-mcp-servers)
- [https://support.anthropic.com/en/articles/11175166-about-custom-integrations-using-remote-mcp](https://support.anthropic.com/en/articles/11175166-about-custom-integrations-using-remote-mcp)
