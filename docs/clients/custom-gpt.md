# Custom GPT (Actions)

Minimal setup information from [clients.json](../clients.json), verified 2026-10-23.

> **Unverified:** The client setup details below are not verified against current official client documentation. Check the linked sources before deployment.

## Prerequisites

- Custom GPT (Actions) configured for rest-action.
- A remote Polarion MCP server URL or a local stdio installation, plus a PAT when required by the selected authentication mode.

## Setup

Transport: rest-action. Authentication modes in the manifest: static-header, preregistered-client.

```text
Action OpenAPI URL: https://YOUR-SERVER/openapi-gpt.json; configure API key auth with YOUR_POLARION_PAT (or configure the server's GPT OAuth endpoints).
```

## Redirect URI

- **Unverified:** `Platform-specific Custom GPT callback URI not established from official docs` OAuth is configured with client ID/secret; inspect the GPT editor for the exact callback before registration.

## Sources

- [https://help.openai.com/en/articles/8554397-creating-a-gpt](https://help.openai.com/en/articles/8554397-creating-a-gpt)
- [https://platform.openai.com/docs/actions/authentication](https://platform.openai.com/docs/actions/authentication)
