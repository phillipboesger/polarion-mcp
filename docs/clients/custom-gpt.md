# Custom GPT (Actions)

> **Unverified (check the vendor docs):** client setup details are not verified against current official documentation.

## Prerequisites

- A reachable Polarion MCP server at `https://YOUR-SERVER/mcp`.
- A Polarion personal access token (PAT) for the supported bearer or OAuth login flow, where applicable.
- Configure server environment variables using [configuration](../configuration.md); this guide does not duplicate the environment variable reference.

## Configuration

```text
Action OpenAPI URL: https://YOUR-SERVER/openapi-gpt.json; configure API key auth with YOUR_POLARION_PAT (or configure the server's GPT OAuth endpoints).
```

This is the exact client snippet recorded in [clients.json](../clients.json). It is unverified (check the vendor docs).

## Authentication

**PAT static header:** send `Authorization: Bearer YOUR_POLARION_PAT` on MCP requests or configure the PAT in the client auth UI.

**OAuth:** where supported by this client, register or discover the OAuth client, allow the exact callback below, then enter the Polarion PAT at the Polarion login page. Server OAuth settings are in [configuration](../configuration.md).

## OAuth redirect allowlist

Set `MCP_ALLOWED_REDIRECT_PRESETS` to: No preset; inspect the GPT editor and use MCP_ALLOWED_REDIRECT_PREFIXES with its exact callback URI.. Available preset names in server code are `claude`, `chatgpt`, `vscode`, `cursor`, `copilot-studio`, `gemini`, and `loopback`. Presets without a verified fixed URI add no fixed callback. For generated callbacks, put the exact URI supplied by the client in `MCP_ALLOWED_REDIRECT_PREFIXES`. The `loopback` preset permits loopback callbacks. See [configuration](../configuration.md).

## Recommended tools

This client uses REST Actions rather than MCP, so MCP toolset selection does not apply.

## Troubleshooting

- **MCP request returns 401** -> the bearer token is missing or Polarion rejects it -> check the Authorization header and use a valid Polarion PAT; the server validates it with Polarion before opening the session.
- **OAuth registration or login is refused** -> the callback is not in the server allowlist -> configure the matching preset or exact URI in `MCP_ALLOWED_REDIRECT_PREFIXES`; see [configuration](../configuration.md).

Client-specific notes:

- Custom GPT Actions use REST/OpenAPI rather than MCP transport; project publishes a reduced 30-action document.

## Verify the connection

Call the configured Action and confirm its operation is returned and can be invoked.

## Sources

- [https://help.openai.com/en/articles/8554397-creating-a-gpt](https://help.openai.com/en/articles/8554397-creating-a-gpt)
- [https://platform.openai.com/docs/actions/authentication](https://platform.openai.com/docs/actions/authentication)
