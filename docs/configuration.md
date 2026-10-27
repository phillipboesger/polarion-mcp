# Configuration

## Environment variables

The server loads `.env` in local runs. Secret values belong in the deployment's secret manager or environment, never in committed files.

| Variable | Default | Read by | Secret? | Purpose |
|---|---|---|---|---|
| `API_BASE_URL` | `https://polarion.example.com/polarion/rest/v1` | `src/config.ts` at import | No | Polarion REST API base URL reachable from the MCP process or container, ending in `/polarion/rest/v1`. For cloud MCP, Polarion may be private or VPN-only if the container can reach it. |
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
| `MCP_ALLOWED_HOSTS` | Empty, no Host allowlist | `src/mcp-http-server.ts` startup | No | Comma-separated allowlist for the inbound Host header of the MCP server (for example its public hostname); it does not control outbound access to Polarion. `ALLOWED_HOSTS` is a separate input for the Polarion Docker image, not this MCP server; see troubleshooting if Polarion answers `request_rejected HTTP 400`. |
| `MCP_ALLOWED_ORIGINS` | Claude.ai and ChatGPT origins | `src/mcp-http-server.ts` startup | No | Comma-separated browser origin allowlist for MCP and OAuth routes. The `MCP_PUBLIC_URL` origin is always allowed. |
| `MCP_ALLOWED_REDIRECT_PREFIXES` | Empty, registration allows redirect URIs | `src/mcp-http-server.ts`, `src/oauth.ts` | No | Comma-separated exact redirect URI allowlist; entries ending in `/` are prefixes. Configure this or named presets for production OAuth. |
| `MCP_ALLOWED_REDIRECT_PRESETS` | Empty | `src/mcp-http-server.ts`, `src/oauth.ts` | No | Comma-separated built-in names: `claude`, `chatgpt`, `vscode`, `cursor`, `copilot-studio`, `gemini`, `loopback`. Verified callbacks currently exist for `claude` and `cursor`; `loopback` allows localhost callback ports. Unknown names are ignored. |
| `MCP_CIMD_ENABLED` | `false` | `src/mcp-http-server.ts` startup | No | Set to `true` to opt in to OAuth Client ID Metadata Documents. See Security. |
| `MCP_UPLOAD_ROOTS` | Empty (local uploads off) | `src/composite-upload.ts` per call | No | Comma-separated absolute directories allowed for `upload_attachment.filePath`; file-path uploads are stdio-only. Each file is resolved and checked against these roots before reading. |
| `MCP_UPLOAD_MAX_BYTES` | `26214400` (25 MiB) | `src/composite-upload.ts` per call | No | Maximum attachment size for local and URL uploads. Positive integer, checked before reading local files and while streaming URLs. |
| `MCP_UPLOAD_URL_HOSTS` | Empty (URL uploads off) | `src/composite-upload.ts` per call | No | Comma-separated exact host allowlist for `upload_attachment.url`; each redirect host and DNS result is checked. |
| `MCP_UPLOAD_ALLOW_HTTP` | `false` | `src/composite-upload.ts` per call | No | Set to `true` to permit HTTP URLs. HTTPS is otherwise required. |
| `MCP_REFRESH_TOKEN_TTL` | `1209600` seconds (14 days) | `src/mcp-http-server.ts`, `src/oauth.ts` | No | Sliding refresh-token lifetime in seconds, capped by a 90-day token-family lifetime. Must be a positive integer. |
| `MCP_RATE_LIMIT_REGISTER` | `100` | `src/mcp-http-server.ts` | No | Successful or failed dynamic OAuth registrations allowed per IP per hour. Positive integer. |
| `MCP_RATE_LIMIT_TOKEN_IP` | `500` | `src/mcp-http-server.ts` | No | Failed OAuth token requests allowed per IP per 15 minutes. Successful requests do not count. Positive integer. |
| `MCP_SESSION_IDLE_MINUTES` | `60` minutes | `src/mcp-http-server.ts` | No | Idle Streamable HTTP session lifetime. Positive integer overrides default. |
| `MCP_MAX_SESSIONS` | `1000` | `src/mcp-http-server.ts` | No | Maximum in-memory MCP sessions; excess sessions evict the least recently used. Positive integer overrides default. |
| `MCP_MAX_RESPONSE_CHARS` | `100000` characters | `src/index.ts`, `src/http-server.ts`, `src/mcp-http-server.ts` | No | Maximum generated and composite response text size. Positive integer overrides default. Ordinary unpaged generated structured content remains complete; automatically collected pages may be trimmed to the cap and signal truncation. |
| `MCP_RATE_LIMIT_TOOLS` | `0` (off) | `src/index.ts`, `src/mcp-http-server.ts` | No | Maximum tool calls per user in a rolling minute. Non-negative integer; over-limit calls return an MCP error with a retry hint. |
| `MCP_MARK_UNTRUSTED` | `false` | `src/index.ts`, `src/mcp-http-server.ts` | No | Wrap likely user-authored Polarion text fields in `<polarion-untrusted>` markers after neutralizing embedded closing markers. The response then also carries a top-level `_notice` telling the model to treat Polarion content as data. With the default (`false`) results are returned unchanged. |
| `MCP_LOG_FORMAT` | `text` | `src/index.ts`, `src/mcp-http-server.ts` | No | Tool-call log format: `text` preserves current output; `json` writes structured JSON lines to stderr. |
| `MCP_LOG_LEVEL` | `info` | `src/index.ts`, `src/mcp-http-server.ts` | No | Minimum tool-call log level: `debug`, `info`, `warn`, or `error`. |
| `MCP_CONFIRM_DESTRUCTIVE` | `false` | `src/index.ts`, `src/mcp-http-server.ts` | No | Set to `true` to require confirmation for destructive, delete, `patchAll*`, and bulk tools. Elicitation-capable clients receive a confirmation prompt; other clients may provide `confirm: true` on the first call. Previewing with `dry_run: true` is recommended, not enforced. |
| `MCP_VERSION_CHECK` | `false` | `src/server.ts` | No | Set to `true` to check Polarion `/metadata` once on the first tool call and log a warning when the server version differs from the generated tool surface. The check has a three-second timeout and never blocks tool execution. |
| `MCP_COMPLETIONS` | `false` | `src/server.ts` | No | Advertise MCP `completion/complete` and suggest cached project, Work Item type, status, and user values. Metadata is isolated by deployment and caller, expires after five minutes, and is bounded to 500 entries. |
| `MCP_MODE` | `full` | `src/server.ts` | No | `full` exposes the normal tools. `discover` exposes search_tools, describe_tool, and call_tool over the enabled tool set. |
| `MCP_RESOURCE_LINKS` | `false` | `src/server.ts` | No | Add MCP resource_link items to successful getWorkItem and getDocument results. |
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

Mutating generated and composite tools accept `dry_run` as a boolean or the compatibility values `"true"`, `"false"`, `1`, and `0`. These normalize to canonical booleans; malformed values are rejected before side effects. Composite inputs are validated against their declared schemas before handlers run.

The Streamable HTTP MCP endpoint supports per-request narrowing with `X-MCP-Toolsets` and `X-MCP-Readonly` headers, or a path such as `/mcp/projects,work-items`. Toolset names are listed above. These selectors can only narrow `MCP_TOOLSETS` and the tool filters.

`MCP_ALLOWED_ORIGINS` protects MCP and OAuth routes from browser-origin abuse and DNS rebinding. The request path is matched case-insensitively. The public origin in `MCP_PUBLIC_URL` is always accepted; otherwise configure trusted origins. Requests without an Origin header are not rejected. The REST wrapper uses the separate `HTTP_CORS_ORIGINS` setting.

## Network paths

Cloud providers must reach the MCP server over public HTTPS. The MCP process separately connects to the Polarion URL in `API_BASE_URL`; Polarion can remain private when that network path exists. HTTPS is mandatory for the cloud-facing MCP endpoint, including when the MCP process runs on a laptop. For a company CA, configure Node.js with the additional PEM trust bundle before startup; normal TLS verification remains enabled.

## Modes

- Stdio: set `API_BASE_URL` and `BEARER_TOKEN`.
- REST HTTP wrapper: set `API_BASE_URL`, `BEARER_TOKEN`, and `HTTP_API_KEY`; `PORT` or `HTTP_PORT` selects its port.
- Streamable HTTP MCP: set `API_BASE_URL`; clients send their own PAT on each request. To enable OAuth login, also set `MCP_PUBLIC_URL`, a stable `MCP_TOKEN_SECRET`, and an OAuth redirect allowlist. `HTTP_API_KEY` is not used here.

## OAuth token lifetime and audience

Access tokens last one hour. Refresh tokens last 14 days by default and are renewed on use, but cannot exceed 90 days from the initial login. Refresh tokens are stateless: an earlier refresh token remains usable until its own expiry, even after a refresh. There is no server-side refresh-token revocation. Revoking the underlying PAT in Polarion prevents renewal and subsequent Polarion access. Changing the sealing secret without retaining the old value in `MCP_TOKEN_SECRET_PREVIOUS` invalidates existing OAuth tokens. OAuth tokens are bound to the MCP resource URL (RFC 8707); changing `MCP_PUBLIC_URL` or the deployment audience requires users to log in again.

## TLS and credential handling

Keep `.env` out of version control and use least-privilege Polarion PATs. TLS verification stays enabled by default. For a private CA, configure an additional Node.js trust bundle; `NODE_TLS_REJECT_UNAUTHORIZED=0` disables verification and is not a deployment recommendation.

## Script-only variables

| Variable | Default | Read by | Secret? | Purpose |
|---|---|---|---|---|
| `POLARION_URL` | `http://localhost` | `scripts/live/create-pat.mjs` | No | Polarion base URL for live PAT setup. |
| `POLARION_USER` | `admin` | `scripts/live/create-pat.mjs` | No | Username for live PAT setup. |
| `POLARION_PASS` | `admin` | `scripts/live/create-pat.mjs` | Yes | Password for live PAT setup. |
| `PAT_NAME` | `live-suite` | `scripts/live/create-pat.mjs` | No | Name assigned to the generated live-test PAT. |
| `CHECK_DOCS_STRICT` | `0` | `scripts/check-docs.mjs` | No | Set to `1` to make all documentation checker findings fail the command. |
