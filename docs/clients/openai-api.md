# OpenAI Responses API / Agents SDK

Minimal setup information from [clients.json](../clients.json), verified 2026-10-23.

## Prerequisites

- OpenAI Responses API / Agents SDK configured for streamable-http, sse.
- A remote Polarion MCP server URL or a local stdio installation, plus a PAT when required by the selected authentication mode.

## Setup

Transport: streamable-http, sse. Authentication modes in the manifest: static-header, preregistered-client.

```json
{"type":"mcp","server_label":"polarion","server_url":"https://YOUR-SERVER/mcp","authorization":"YOUR_POLARION_PAT"}
```

## Redirect URI

No client-specific redirect URI is listed in the manifest.

## Sources

- [https://developers.openai.com/api/docs/guides/tools-connectors-mcp](https://developers.openai.com/api/docs/guides/tools-connectors-mcp)
- [https://developers.openai.com/api/reference/resources/beta/subresources/agents/subresources/sessions/methods/create](https://developers.openai.com/api/reference/resources/beta/subresources/agents/subresources/sessions/methods/create)
