# Security

## Secrets and Tokens

- Store BEARER_TOKEN and HTTP_API_KEY in environment variables only.
- Do not commit .env files or tokens to the repository.
- Use least-privilege tokens for Polarion access.
- Prefer a dedicated Personal Access Token for this server instead of reusing a broad administrator token.
- If the token is generated from Polarion user settings, copy it once and store it immediately because some deployments do not show it again.

## MCP Client Hygiene

- Keep MCP client config files in user-scoped or ignored locations.
- Do not paste Polarion bearer tokens into prompts, issues, or screenshots.
- Use separate MCP entries per environment so dev and production credentials do not get mixed.

## HTTP Server Protection

- HTTP_API_KEY is required for all HTTP endpoints except /health and OpenAPI specs.
- Generate a long random key (see scripts/generate-api-key.sh).
- Treat the HTTP API key as a second security boundary. It protects the wrapper service, while BEARER_TOKEN protects access to Polarion.

## TLS Handling

- TLS verification is enabled by default.
- Use NODE_TLS_REJECT_UNAUTHORIZED=0 only for trusted internal servers.

## Logging

- Logs go to stderr; avoid logging secrets.

## read_when

- Use this guide when reviewing security posture or handling credentials.
