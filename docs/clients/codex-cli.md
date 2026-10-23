# Codex CLI

Minimal setup information from [clients.json](../clients.json), verified 2026-10-23.

> **Unverified:** The client setup details below are not verified against current official client documentation. Check the linked sources before deployment.

## Prerequisites

- Codex CLI configured for stdio, streamable-http, sse.
- A remote Polarion MCP server URL or a local stdio installation, plus a PAT when required by the selected authentication mode.

## Setup

Transport: stdio, streamable-http, sse. Authentication modes in the manifest: static-header, oauth-dcr.

```text
codex mcp add polarion -- npx -y polarion-mcp (set API_BASE_URL and BEARER_TOKEN in the process environment)
```

## Redirect URI

No client-specific redirect URI is listed in the manifest.

## Sources

- [https://developers.openai.com/learn/docs-mcp](https://developers.openai.com/learn/docs-mcp)
- [https://developers.openai.com/codex/mcp](https://developers.openai.com/codex/mcp)
