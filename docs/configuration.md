# Configuration

## Environment Files

- Copy .env.example to .env and fill in local values.
- Do not commit .env files.

## Core Variables

- API_BASE_URL: Base URL for the Polarion REST API. Must point at your own instance, e.g. https://your-polarion-server/polarion/rest/v1 (the built-in default is a non-functional placeholder).
- BEARER_TOKEN: Personal Access Token for Polarion, used by stdio and REST HTTP mode. Obtain it from your Polarion user profile or personal settings. If Personal Access Tokens are not available in your instance, ask your administrator. The Streamable HTTP MCP transport ignores it whenever the request carries its own token.
- HTTP_PORT: Port for the REST HTTP server (default 3000). PORT, which platforms such as Render inject, takes precedence.
- After `git pull`, run `npm run build` before starting: `npm start` runs the existing build, it does not rebuild.
- HTTP_API_KEY: Required for the REST HTTP wrapper (ChatGPT Custom GPT) authentication.
- PUBLIC_URL: Public base URL of the REST HTTP wrapper, written into the `servers` entry of `/openapi.json` and `/openapi-gpt.json` (Render's `RENDER_EXTERNAL_URL` is used when this is unset). Without either, the request's `Host` header is echoed when it is a plain host name, with `https` (`http` for localhost); set it so a forged `Host` header cannot change which server a Custom GPT imports. The server refuses to start if it is not an `http(s)` URL.
- MCP_HTTP_PORT: Optional port for the MCP HTTP server (falls back to PORT, then HTTP_PORT, then 3000).
- MCP_PUBLIC_URL: Public HTTPS base URL of the deployment. Setting it enables the OAuth login flow (client registration, authorization, token endpoints, and the page where a user pastes their Polarion PAT), which is how clients that cannot be handed a token by hand — Claude.ai connectors — authenticate. Unset, the server only accepts a Polarion PAT sent directly as the Bearer token.
- MCP_TOKEN_SECRET: Secret (at least 32 characters) that encrypts the tokens the OAuth login hands out; they carry the user's PAT, so the server stores nothing. Keep it stable: a login then lasts until Polarion stops accepting the PAT, across restarts. Run a single instance (or route each client to the same one): pending logins, authorization codes and MCP sessions live in the process's memory and are not shared between instances. Unset, a random secret is used and every login ends on restart. Changing it logs everyone out.
- GPT_CLIENT_ID / GPT_CLIENT_SECRET: Enable per-user OAuth for ChatGPT Custom GPT Actions on the Streamable HTTP MCP server (needs MCP_PUBLIC_URL). Enter the same values in the GPT editor; endpoints are `/gpt/authorize` and `/gpt/token`.
- MCP_HTTP_HOST: Optional bind address for the MCP HTTP server (default 0.0.0.0). Set it to 127.0.0.1 when a TLS reverse proxy sits in front, so the plaintext port that carries client PATs is not reachable from outside.
- MCP_ALLOWED_HOSTS: Optional comma-separated Host allow-list; setting it enables DNS-rebinding protection for the MCP HTTP server.
- MCP_ALLOWED_REDIRECT_PREFIXES: Optional comma-separated allowlist of OAuth redirect URIs that clients may register (MCP HTTP server with OAuth). An entry ending in `/` is a prefix, any other must match exactly; loopback entries such as `http://localhost/callback` match on any port. Unset, any client may register any redirect URI, so anyone can send your users a genuine login link that hands their Polarion access to a callback of their choosing. Set it for every production deployment, e.g. `https://claude.ai/api/mcp/auth_callback`. A refused registration is logged with its redirect URIs. Registrations issued before it was set stop working if their redirect URIs are not on the list.
- TRUST_PROXY: Express `trust proxy` setting for the MCP HTTP server behind a reverse proxy: `loopback` for a proxy on the same host, a hop count such as `1`, or a comma-separated list of proxy addresses. Without it, every request behind the proxy shares one rate-limit counter (login, token, registration), so one client can lock everyone out. `true` is refused: it would trust an X-Forwarded-For sent by anyone.
- MCP_SESSION_IDLE_MINUTES: Minutes after which an unused MCP session is closed (default 60). The client then gets a 404 and starts a new session on its own.
- MCP_MAX_SESSIONS: Most MCP sessions held at once (default 1000); beyond it the least recently used one is closed. A session only answers to the Polarion token that created it.
- MCP_TOOLS: Optional allowlist of tool names, separated by commas, spaces or newlines. Other tools are neither listed nor callable, over MCP or the REST wrapper. Unknown names are logged at startup; the server refuses to start if no listed name matches a tool. The instructions, guides and prompts only mention tools that remain.
- MCP_READ_ONLY: `true` (also `1`, `yes`, `on`) keeps only tools annotated `readOnlyHint: true` (combined with MCP_TOOLS, both must match). Any value that is neither on nor off (`0`, `false`, `no`, `off`, empty) stops the server at startup, so a typo cannot leave the write tools exposed.
- MCP_OMIT_OUTPUT_SCHEMA: `true` (same values as MCP_READ_ONLY) leaves output schemas out of tools/list, which shrinks it from about 840 KB to 530 KB for all tools. Results still carry structured content.
- LOG_LEVEL: Reserved for logging configuration (informational only).

## Minimal Configuration by Mode

- MCP stdio mode requires API_BASE_URL and BEARER_TOKEN.
- Streamable HTTP MCP mode (Claude.ai, ChatGPT) requires only API_BASE_URL, and optionally MCP_HTTP_PORT / MCP_HTTP_HOST / MCP_ALLOWED_HOSTS. Each client authenticates with its own Polarion PAT as the Bearer token of every `/mcp` request; before the first request of a session the server asks Polarion whether the PAT is valid (remembered for one minute), so an invented token cannot open sessions. For the OAuth login add MCP_PUBLIC_URL, MCP_TOKEN_SECRET and MCP_ALLOWED_REDIRECT_PREFIXES; behind a reverse proxy also TRUST_PROXY; for Custom GPT OAuth also GPT_CLIENT_ID and GPT_CLIENT_SECRET. HTTP_API_KEY does not apply to this server.
- REST HTTP mode (ChatGPT) requires API_BASE_URL, BEARER_TOKEN, HTTP_API_KEY, and optionally HTTP_PORT and PUBLIC_URL.

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

- `API_KEY_<SCHEME>`
- `BEARER_TOKEN_<SCHEME>`
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
