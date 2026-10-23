# Configuration

## Environment variables

The server loads `.env` in local runs. Secret values belong in the deployment's secret manager or environment, never in committed files.

| Variable | Default | Read by | Secret? | Purpose |
|---|---|---|---|---|
| `API_BASE_URL` | `https://polarion.example.com/polarion/rest/v1` | `src/config.ts` at import | No | Polarion REST API base URL. Set this to your instance. |
| `BEARER_TOKEN` | Unset | `src/config.ts` when making calls | Yes | Polarion PAT for stdio and REST HTTP mode; fallback when a scheme-specific credential is absent. Streamable HTTP uses each request's PAT instead. |
| `HTTP_PORT` | `3000` | `src/http-server.ts` startup | No | REST wrapper port; `PORT` takes precedence. |
| `PORT` | Platform supplied, otherwise ignored | `src/http-server.ts`, `src/mcp-http-server.ts` | No | Hosting platform port. Takes precedence over `HTTP_PORT`. |
| `HTTP_API_KEY` | Unset, required by REST HTTP mode | `src/http-server.ts` startup | Yes | REST wrapper bearer key. Does not apply to Streamable HTTP MCP. |
| `PUBLIC_URL` | `RENDER_EXTERNAL_URL`, otherwise request host fallback | `src/rest-api.ts` | No | Public URL advertised in REST OpenAPI specs. Use a trusted URL to prevent a forged Host header changing generated specs. |
| `RENDER_EXTERNAL_URL` | Unset | `src/rest-api.ts` | No | Render public URL fallback when `PUBLIC_URL` is unset. |
| `HTTP_CORS_ORIGINS` | `https://chat.openai.com,https://chatgpt.com` | `src/http-server.ts` | No | Comma-separated allowed browser origins for the REST wrapper. CORS does not replace API-key authentication. |
| `MCP_HTTP_PORT` | `PORT`, then `HTTP_PORT`, then `3000` | `src/mcp-http-server.ts` startup | No | Streamable HTTP MCP port. |
| `MCP_HTTP_HOST` | `0.0.0.0` | `src/mcp-http-server.ts` startup | No | Bind address. Use `127.0.0.1` behind a local TLS proxy. |
| `MCP_PUBLIC_URL` | Unset | `src/mcp-http-server.ts` startup | No | Public HTTPS origin that enables OAuth login. Must be an origin without a path. Also defines the token's protected-resource audience. |
| `MCP_TOKEN_SECRET` | Random per process if unset | `src/mcp-http-server.ts`, `src/sealed.ts` | Yes | Secret of at least 32 characters used to seal OAuth client and token data. Keep stable across restarts and instances. |
| `MCP_TOKEN_SECRET_PREVIOUS` | Empty | `src/mcp-http-server.ts`, `src/sealed.ts` | Yes | Comma-separated prior sealing keys tried for opening existing values during key rotation. New values use `MCP_TOKEN_SECRET`. Remove old keys after clients have renewed. |
| `GPT_CLIENT_ID` | Unset | `src/mcp-http-server.ts` startup | Yes | Enables the preconfigured Custom GPT OAuth flow when paired with `GPT_CLIENT_SECRET` and `MCP_PUBLIC_URL`. |
| `GPT_CLIENT_SECRET` | Unset | `src/mcp-http-server.ts` startup | Yes | Custom GPT OAuth client secret. |
| `MCP_ALLOWED_HOSTS` | Empty, no Host allowlist | `src/mcp-http-server.ts` startup | No | Comma-separated Host header allowlist for DNS-rebinding protection. |
| `MCP_ALLOWED_ORIGINS` | Claude.ai and ChatGPT origins | `src/mcp-http-server.ts` startup | No | Comma-separated browser origin allowlist for MCP and OAuth routes. The `MCP_PUBLIC_URL` origin is always allowed. |
| `MCP_ALLOWED_REDIRECT_PREFIXES` | Empty, registration allows redirect URIs | `src/mcp-http-server.ts`, `src/oauth.ts` | No | Comma-separated exact redirect URI allowlist; entries ending in `/` are prefixes. Configure this or named presets for production OAuth. |
| `MCP_ALLOWED_REDIRECT_PRESETS` | Empty | `src/mcp-http-server.ts`, `src/oauth.ts` | No | Comma-separated built-in names: `claude`, `chatgpt`, `vscode`, `cursor`, `copilot-studio`, `gemini`, `loopback`. Verified callbacks currently exist for `claude` and `cursor`; `loopback` allows localhost callback ports. Unknown names are ignored. |
| `MCP_CIMD_ENABLED` | `false` | `src/mcp-http-server.ts` startup | No | Set to `true` to opt in to OAuth Client ID Metadata Documents. See Security. |
| `MCP_REFRESH_TOKEN_TTL` | `1209600` seconds (14 days) | `src/mcp-http-server.ts`, `src/oauth.ts` | No | Sliding refresh-token lifetime in seconds, capped by a 90-day token-family lifetime. Must be a positive integer. |
| `MCP_RATE_LIMIT_REGISTER` | `100` | `src/mcp-http-server.ts` | No | Successful or failed dynamic OAuth registrations allowed per IP per hour. Positive integer. |
| `MCP_RATE_LIMIT_TOKEN_IP` | `500` | `src/mcp-http-server.ts` | No | Failed OAuth token requests allowed per IP per 15 minutes. Successful requests do not count. Positive integer. |
| `MCP_SESSION_IDLE_MINUTES` | `60` minutes | `src/mcp-http-server.ts` | No | Idle Streamable HTTP session lifetime. Positive integer overrides default. |
| `MCP_MAX_SESSIONS` | `1000` | `src/mcp-http-server.ts` | No | Maximum in-memory MCP sessions; excess sessions evict the least recently used. Positive integer overrides default. |
| `MCP_MAX_RESPONSE_CHARS` | `100000` characters | `src/index.ts`, `src/http-server.ts`, `src/mcp-http-server.ts` | No | Maximum returned text size. Positive integer overrides default. |
| `MCP_RATE_LIMIT_TOOLS` | `0` (off) | `src/index.ts`, `src/mcp-http-server.ts` | No | Maximum tool calls per user in a rolling minute. Non-negative integer; over-limit calls return an MCP error with a retry hint. |
| `MCP_MARK_UNTRUSTED` | `false` | `src/index.ts`, `src/mcp-http-server.ts` | No | Wrap likely user-authored Polarion text fields in `<polarion-untrusted>` markers after neutralizing embedded closing markers. The response also includes an `_notice` instruction to treat Polarion content as data. |
| `MCP_LOG_FORMAT` | `text` | `src/index.ts`, `src/mcp-http-server.ts` | No | Tool-call log format: `text` preserves current output; `json` writes structured JSON lines to stderr. |
| `MCP_LOG_LEVEL` | `info` | `src/index.ts`, `src/mcp-http-server.ts` | No | Minimum tool-call log level: `debug`, `info`, `warn`, or `error`. |
| `MCP_CONFIRM_DESTRUCTIVE` | `false` | `src/index.ts`, `src/mcp-http-server.ts` | No | Set to `true` to require confirmation for destructive, delete, `patchAll*`, and bulk tools. Elicitation-capable clients receive a confirmation prompt; others must preview with `dry_run: true` and repeat with `confirm: true`. |
| `MCP_TOOLSETS` | Unset, all toolsets | `src/config.ts`, `src/mcp-http-server.ts` | No | Deployment-wide comma-separated toolset allowlist. Names: `work-items`, `documents`, `test-management`, `plans`, `collections`, `projects`, `users`, `admin`, `jobs`, `pages`, `enumerations`. Requests may narrow this list. |
| `MCP_TOOLS` | Unset, all tools | `src/tool-filter.ts` | No | Tool name allowlist, separated by commas, spaces, or newlines. |
| `MCP_READ_ONLY` | `false` | `src/tool-filter.ts` | No | Keep only tools annotated read-only. Accepts true/1/yes/on or false/0/no/off. |
| `MCP_OMIT_OUTPUT_SCHEMA` | `false` | `src/tool-filter.ts` | No | Omit output schemas from tools/list while retaining structured results. Same boolean values as `MCP_READ_ONLY`. |
| `TRUST_PROXY` | Unset | `src/http-server.ts`, `src/mcp-http-server.ts` | No | Express trusted proxy setting (for example `loopback`, hop count `1`, or proxy addresses). Required behind a proxy for client IP rate limiting. `true` is rejected. |
| `NODE_TLS_REJECT_UNAUTHORIZED` | TLS verification enabled | `src/config.ts` | No | Set to `0` to disable certificate verification. Use only with trusted internal TLS endpoints. |
| `API_KEY_<SCHEME>` | Unset | `src/executor.ts` | Yes | API key for an OpenAPI security scheme. Replace `<SCHEME>` with the uppercased scheme name, replacing non-alphanumeric characters with `_`. |
| `BEARER_TOKEN_<SCHEME>` | Falls back to `BEARER_TOKEN` | `src/config.ts` | Yes | Scheme-specific bearer credential using the same `<SCHEME>` conversion. |
| `BASIC_USERNAME_<SCHEME>` / `BASIC_PASSWORD_<SCHEME>` | Unset | `src/executor.ts` | Yes | Basic credentials for an OpenAPI security scheme. |
| `OAUTH_CLIENT_ID_<SCHEME>` / `OAUTH_CLIENT_SECRET_<SCHEME>` | Unset | `src/auth.ts`, `src/executor.ts` | Yes | OAuth client credentials for an OpenAPI security scheme. |
| `OAUTH_SCOPES_<SCHEME>` | Unset | `src/auth.ts` | No | Optional OAuth scopes for the security scheme. |
| `OAUTH_TOKEN_<SCHEME>` | Unset | `src/executor.ts` | Yes | Pre-supplied OAuth token for the scheme. |
| `OPENID_TOKEN_<SCHEME>` | Unset | `src/executor.ts` | Yes | Pre-supplied OpenID token for the scheme. |

The Streamable HTTP MCP endpoint supports per-request narrowing with `X-MCP-Toolsets` and `X-MCP-Readonly` headers, or a path such as `/mcp/projects,work-items`. Toolset names are listed above. These selectors can only narrow `MCP_TOOLSETS` and the tool filters.

`MCP_ALLOWED_ORIGINS` protects MCP and OAuth routes from browser-origin abuse and DNS rebinding. The request path is matched case-insensitively. The public origin in `MCP_PUBLIC_URL` is always accepted; otherwise configure trusted origins. Requests without an Origin header are not rejected. The REST wrapper uses the separate `HTTP_CORS_ORIGINS` setting.

## Modes

- Stdio: set `API_BASE_URL` and `BEARER_TOKEN`.
- REST HTTP wrapper: set `API_BASE_URL`, `BEARER_TOKEN`, and `HTTP_API_KEY`; `PORT` or `HTTP_PORT` selects its port.
- Streamable HTTP MCP: set `API_BASE_URL`; clients send their own PAT on each request. To enable OAuth login, also set `MCP_PUBLIC_URL`, a stable `MCP_TOKEN_SECRET`, and an OAuth redirect allowlist. `HTTP_API_KEY` is not used here.

## OAuth token lifetime and audience

Access tokens last one hour. Refresh tokens last 14 days by default and are renewed on use, but cannot exceed 90 days from the initial login. Refresh tokens are stateless: an earlier refresh token remains usable until its own expiry, even after a refresh. There is no server-side refresh-token revocation. Revoking the underlying PAT in Polarion prevents renewal and subsequent Polarion access. Changing the sealing secret without retaining the old value in `MCP_TOKEN_SECRET_PREVIOUS` invalidates existing OAuth tokens. OAuth tokens are bound to the MCP resource URL (RFC 8707); changing `MCP_PUBLIC_URL` or the deployment audience requires users to log in again.

## TLS and credential handling

Keep `.env` out of version control and use least-privilege Polarion PATs. `NODE_TLS_REJECT_UNAUTHORIZED=0` disables TLS certificate verification and should only be used for trusted internal systems.

## Script-only variables

| Variable | Default | Read by | Secret? | Purpose |
|---|---|---|---|---|
| `POLARION_URL` | `http://localhost` | `scripts/live/create-pat.mjs` | No | Polarion base URL for live PAT setup. |
| `POLARION_USER` | `admin` | `scripts/live/create-pat.mjs` | No | Username for live PAT setup. |
| `POLARION_PASS` | `admin` | `scripts/live/create-pat.mjs` | Yes | Password for live PAT setup. |
| `PAT_NAME` | `live-suite` | `scripts/live/create-pat.mjs` | No | Name assigned to the generated live-test PAT. |
| `CHECK_DOCS_STRICT` | `0` | `scripts/check-docs.mjs` | No | Set to `1` to make all documentation checker findings fail the command. |

## read_when

- Use this guide when setting environment variables or troubleshooting authentication.
