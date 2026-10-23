# ChatGPT connectors / Apps

Minimal setup information from [clients.json](../clients.json), verified 2026-10-23.

> **Unverified:** The client setup details below are not verified against current official client documentation. Check the linked sources before deployment.

## Prerequisites

- ChatGPT connectors / Apps configured for streamable-http, sse.
- A remote Polarion MCP server URL or a local stdio installation, plus a PAT when required by the selected authentication mode.

## Setup

Transport: streamable-http, sse. Authentication modes in the manifest: oauth-dcr, cimd, preregistered-client.

```text
Create a custom MCP app with server URL https://YOUR-SERVER/mcp; select OAuth and configure the server authorization metadata.
```

## Redirect URI

- **Unverified:** `ChatGPT provides callback URI in the app setup/authorization metadata; fixed URI not verified`

## Sources

- [https://help.openai.com/en/articles/12584461-connecting-custom-mcp-servers-in-chatgpt](https://help.openai.com/en/articles/12584461-connecting-custom-mcp-servers-in-chatgpt)
- [https://developers.openai.com/plugins/build/auth](https://developers.openai.com/plugins/build/auth)
- [https://developers.openai.com/api/docs/guides/custom-mcp-server](https://developers.openai.com/api/docs/guides/custom-mcp-server)
