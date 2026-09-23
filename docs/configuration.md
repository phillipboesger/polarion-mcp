# Configuration

## Environment Files

- Copy .env.example to .env and fill in local values.
- Do not commit .env files.

## Core Variables

- API_BASE_URL: Base URL for the Polarion REST API. Must point at your own instance, e.g. https://your-polarion-server/polarion/rest/v1 (the built-in default is a non-functional placeholder).
- BEARER_TOKEN: Personal Access Token for Polarion, used by stdio and REST HTTP mode. Obtain it from your Polarion user profile or personal settings. If Personal Access Tokens are not available in your instance, ask your administrator. The Streamable HTTP MCP transport ignores it whenever the request carries its own token.
- HTTP_PORT: Port for the REST HTTP server (default 3000).
- HTTP_API_KEY: Required for the REST HTTP wrapper (ChatGPT Custom GPT) authentication.
- MCP_HTTP_PORT: Optional port for the MCP HTTP server (falls back to HTTP_PORT, then 3000).
- MCP_PUBLIC_URL: Public HTTPS base URL of the deployment. Setting it enables the OAuth login flow (client registration, authorization, token endpoints, and the page where a user pastes their Polarion PAT), which is how clients that cannot be handed a token by hand — Claude.ai connectors — authenticate. Unset, the server only accepts a Polarion PAT sent directly as the Bearer token.
- MCP_TOKEN_SECRET: Secret (at least 32 characters) that encrypts the tokens the OAuth login hands out; they carry the user's PAT, so the server stores nothing. Keep it stable and identical on every instance: a login then lasts until Polarion stops accepting the PAT, across restarts. Unset, a random secret is used and every login ends on restart. Changing it logs everyone out.
- GPT_CLIENT_ID / GPT_CLIENT_SECRET: Enable per-user OAuth for ChatGPT Custom GPT Actions on the Streamable HTTP MCP server (needs MCP_PUBLIC_URL). Enter the same values in the GPT editor; endpoints are `/gpt/authorize` and `/gpt/token`.
- MCP_HTTP_HOST: Optional bind address for the MCP HTTP server (default 0.0.0.0). Set it to 127.0.0.1 when a TLS reverse proxy sits in front, so the plaintext port that carries client PATs is not reachable from outside.
- MCP_ALLOWED_HOSTS: Optional comma-separated Host allow-list; setting it enables DNS-rebinding protection for the MCP HTTP server.
- LOG_LEVEL: Reserved for logging configuration (informational only).

## Minimal Configuration by Mode

- MCP stdio mode requires API_BASE_URL and BEARER_TOKEN.
- Streamable HTTP MCP mode (Claude.ai, ChatGPT) requires only API_BASE_URL, and optionally MCP_HTTP_PORT / MCP_HTTP_HOST / MCP_ALLOWED_HOSTS. Each client authenticates with its own Polarion PAT as the Bearer token of every `/mcp` request. For the OAuth login add MCP_PUBLIC_URL and MCP_TOKEN_SECRET; for Custom GPT OAuth also GPT_CLIENT_ID and GPT_CLIENT_SECRET.
- REST HTTP mode (ChatGPT) requires API_BASE_URL, BEARER_TOKEN, HTTP_API_KEY, and optionally HTTP_PORT.

## Token Storage Guidance

- Prefer .env for local development.
- Prefer MCP client-specific env settings for user-local assistant setups.
- Do not reuse HTTP_API_KEY as a Polarion bearer token.
- Rotate tokens if they are exposed in logs, screenshots, or copied into shared settings.

## TLS Settings

- NODE_TLS_REJECT_UNAUTHORIZED=0 disables certificate verification.
- Use only for trusted internal servers with self-signed certificates.

## Security Scheme Overrides

The executor supports security schemes from the OpenAPI spec. Environment variables follow this format:

- API*KEY*<SCHEME>
- BEARER*TOKEN*<SCHEME>
- BASIC*USERNAME*<SCHEME>
- BASIC*PASSWORD*<SCHEME>
- OAUTH*CLIENT_ID*<SCHEME>
- OAUTH*CLIENT_SECRET*<SCHEME>
- OAUTH*SCOPES*<SCHEME>
- OAUTH*TOKEN*<SCHEME>
- OPENID*TOKEN*<SCHEME>

Where <SCHEME> is the scheme name uppercased with non-alphanumeric characters replaced by underscores.

## read_when

- Use this guide when setting up environment variables or troubleshooting auth.
