# Custom GPT (Actions)

> **Unverified (check the vendor docs):** client setup details are not verified against current official documentation.

## Prerequisites

- A deployed [REST wrapper](../deployment.md) for the default API-key setup. Its OpenAPI document is at `https://YOUR-SERVER/openapi-gpt.json`; it does not require an MCP `/mcp` endpoint.
- The administrator configures `API_BASE_URL`, `BEARER_TOKEN` (the server's Polarion PAT), and a separate `HTTP_API_KEY`. See [configuration](../configuration.md).

## Configuration

```text
Action OpenAPI URL: https://YOUR-SERVER/openapi-gpt.json; configure API key auth with the deployment's HTTP_API_KEY. For GPT OAuth, use the MCP HTTP server's GPT Actions endpoints instead.
```

This is the exact client snippet recorded in [clients.json](../clients.json). It is unverified (check the vendor docs).

Use the editor's bearer API-key authentication with `HTTP_API_KEY`. Requests to the REST wrapper carry `Authorization: Bearer YOUR_HTTP_API_KEY`; the wrapper calls Polarion using its configured `BEARER_TOKEN`. These are separate credentials.

<details>
<summary>Alternative: GPT OAuth through the MCP HTTP server</summary>

The MCP HTTP server also exposes GPT Actions routes and an OAuth login flow. Deploy that entry point instead of the API-key REST wrapper and follow [deployment](../deployment.md) and [security](../security.md). Inspect the GPT editor for the exact OAuth callback and allow it with `MCP_ALLOWED_REDIRECT_PREFIXES`; no fixed callback is asserted here. Do not apply the wrapper's shared API-key instructions to this flow.

</details>

## Recommended tools

Custom GPT Actions use REST/OpenAPI rather than MCP transport. The project provides a reduced 30-action document; MCP toolset selection does not apply to the wrapper.

## Troubleshooting

- **Wrapper request returns 401:** check that the caller sends the deployment's `HTTP_API_KEY`, rather than the Polarion PAT.
- **Polarion request is denied:** the administrator should check the wrapper's `BEARER_TOKEN`, REST API URL, and Polarion permissions.
- **GPT OAuth login is refused:** check the exact editor callback against the MCP HTTP server's redirect allowlist; see [configuration](../configuration.md).

## Verify the connection

Call a read-only Action and confirm it returns data from the intended Polarion instance.

## Sources

- [Creating a GPT](https://help.openai.com/en/articles/8554397-creating-a-gpt)
- [GPT Actions authentication](https://platform.openai.com/docs/actions/authentication)
