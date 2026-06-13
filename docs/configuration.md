# Configuration

## Environment Files

- Copy .env.example to .env and fill in local values.
- Do not commit .env files.

## Core Variables

- API_BASE_URL: Base URL for the Polarion REST API. Must point at your own instance, e.g. https://your-polarion-server/polarion/rest/v1 (the built-in default is a non-functional placeholder).
- BEARER_TOKEN: Personal Access Token for Polarion. Obtain it from your Polarion user profile or personal settings. If Personal Access Tokens are not available in your instance, ask your administrator.
- HTTP_PORT: Port for the HTTP server (default 3000).
- HTTP_API_KEY: Required for HTTP server authentication.
- LOG_LEVEL: Reserved for logging configuration (informational only).

## Minimal Configuration by Mode

- MCP stdio mode requires API_BASE_URL and BEARER_TOKEN.
- HTTP mode requires API_BASE_URL, BEARER_TOKEN, HTTP_API_KEY, and optionally HTTP_PORT.

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
