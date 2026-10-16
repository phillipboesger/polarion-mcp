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

## REST Wrapper Protection (http-server.js)

- HTTP_API_KEY applies to the REST wrapper (`build/http-server.js`) only. There it is required for all endpoints except /health and the OpenAPI specs.
- Generate a long random key (see scripts/generate-api-key.sh).
- Treat the HTTP API key as a second security boundary. It protects the wrapper service, while BEARER_TOKEN protects access to Polarion.

## MCP HTTP Server Protection (mcp-http-server.js)

The Streamable HTTP server does not use HTTP_API_KEY. Every request carries the caller's own Polarion PAT, directly or inside a sealed OAuth access token, and Polarion authorizes each call.

- Set MCP_ALLOWED_REDIRECT_PREFIXES when the OAuth login is enabled. Client registration is open, so without it anyone can register their own callback and send a user a genuine login link on your domain; whoever pastes their PAT there hands the resulting access to that callback. The login page names the host the login returns to, but an allowlist is the real protection.
- Behind a reverse proxy, set TRUST_PROXY (e.g. `loopback`) so the login, token and registration rate limits count per client instead of per proxy.
- Narrow the tool surface server-side with MCP_TOOLS and/or MCP_READ_ONLY. A filtered tool cannot be called at all, which is a stronger guard against prompt injection than switching tools off in the client.

## TLS Handling

- TLS verification is enabled by default.
- Use NODE_TLS_REJECT_UNAUTHORIZED=0 only for trusted internal servers.

## Logging

- Logs go to stderr; avoid logging secrets.

## read_when

- Use this guide when reviewing security posture or handling credentials.
