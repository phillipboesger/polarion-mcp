# Security

## Security model

The REST HTTP wrapper (`build/http-server.js`) authenticates callers with `HTTP_API_KEY` and makes Polarion calls using the deployment's `BEARER_TOKEN`. The Streamable HTTP MCP server uses each caller's Polarion PAT directly, or a sealed OAuth token containing that PAT. Polarion remains the authorization boundary for tool operations. Server-side tool filters and toolsets reduce the callable surface. OAuth tokens and client credentials are sealed statelessly; in-memory login state, authorization codes, and MCP sessions are not shared between instances.

## Secrets and tokens

- Keep Polarion PATs, `HTTP_API_KEY`, OAuth client secrets, and `MCP_TOKEN_SECRET` in environment secret storage. Do not commit them or include them in logs, prompts, issues, or screenshots.
- Use least-privilege PATs and a dedicated Polarion identity where possible.
- `MCP_TOKEN_SECRET` must be at least 32 characters and stable across restarts and instances. If it is unset, a random key is generated on startup, invalidating logins after restart.
- Rotate `MCP_TOKEN_SECRET` by setting the new key and listing the old key in `MCP_TOKEN_SECRET_PREVIOUS`. Previous keys are used to open old sealed values; newly issued values use the current key. Remove the old key after clients have renewed.
- Changing the secret without a previous-key entry invalidates OAuth tokens and requires users to sign in again. Changing the public resource audience also requires a new login.

## OAuth and revocation

Access tokens last one hour. Refresh tokens last 14 days by default, slide forward when used, and have a 90-day family cap. Refresh tokens are stateless: a previously issued refresh token remains valid until its own expiry, including after a later refresh. The server has no token-family revocation store or OAuth revocation endpoint. Revoking the backing PAT in Polarion prevents successful renewal and access. Tokens are bound to the protected resource URL under RFC 8707.

Existing deployments upgrading to resource-bound tokens require each user to authenticate once again after the upgrade.

Set `MCP_ALLOWED_REDIRECT_PREFIXES` or `MCP_ALLOWED_REDIRECT_PRESETS` when OAuth login is enabled. Without an allowlist, dynamically registered OAuth clients can use arbitrary callback URIs. Preset names are `claude`, `chatgpt`, `vscode`, `cursor`, `copilot-studio`, `gemini`, and `loopback`. Callback entries ending in `/` are prefixes; other entries are exact matches.

`upload_attachment` is a mutating file-upload tool. Local paths are disabled unless `MCP_UPLOAD_ROOTS` names allowed absolute directories, and they are accepted only over stdio because an HTTP server cannot read the caller’s local disk. The tool resolves symlinks and checks the real file path against each real root, rejects non-files, and checks a configurable size limit before reading. URL uploads are disabled unless `MCP_UPLOAD_URL_HOSTS` contains the exact hostname; HTTPS is required by default, DNS results must all be public, connections are pinned to validated addresses, and every redirect (up to three) repeats scheme, host, and address checks. Downloads have a 15-second deadline and a streaming byte cap. No caller credentials or cookies are forwarded, response content type is ignored, and errors/logs do not include full URLs. `dry_run` reports only the selected name, byte count, and SHA-256 and does not call Polarion.

Client ID Metadata Documents are disabled by default. Set `MCP_CIMD_ENABLED=true` only when needed. When enabled, the server restricts identifiers to HTTPS URLs (or loopback), blocks private and special-use IP destinations, checks DNS results before connecting, pins the validated addresses to the connection, and refuses metadata-fetch redirects to mitigate SSRF and DNS rebinding. CIMD clients must use loopback redirects and the exact callback URL listed in their metadata document.

## Browser origins and DNS rebinding

`MCP_ALLOWED_HOSTS` enables Host validation against DNS rebinding. `MCP_ALLOWED_ORIGINS` controls browser Origin headers on MCP and OAuth paths; the `MCP_PUBLIC_URL` origin is always allowed. Protected endpoint path matching is case-insensitive. Requests without an Origin header are allowed, so these checks are browser protections, not caller authentication. The REST wrapper has its own `HTTP_CORS_ORIGINS` list and still requires its API key.

## Rate limits and reverse proxies

Tool calls can also be limited per authenticated user in a rolling minute with `MCP_RATE_LIMIT_TOOLS`; the default is off. The limit is process-local, keys are derived from a hash of caller identity, and an over-limit call returns an MCP tool error with a retry hint.

With `MCP_MARK_UNTRUSTED=true`, JSON results carry a `_notice` that user-authored content is data, not instructions, and likely user-authored text fields are wrapped in `<polarion-untrusted>` markers. Embedded closing markers are neutralized. These markers help models distinguish data but do not replace tool authorization or output review.

Limits are in-memory per process. OAuth authorization is 100 requests per IP per 15 minutes. Token exchange is 50 failed attempts per client and IP per 15 minutes, with an additional IP ceiling of 500 failed attempts (configurable with `MCP_RATE_LIMIT_TOKEN_IP`); successful requests do not count toward token failure ceilings. PAT checks are limited to 50 failures per IP and token per 15 minutes, plus 500 failures per IP. Dynamic client registrations are limited to 100 per IP per hour by default (`MCP_RATE_LIMIT_REGISTER`). Set `TRUST_PROXY` to the actual trusted proxy hop or address so limits see client IPs. If omitted behind a shared-egress proxy, all users share one IP bucket and one user's failures can lock out everyone. Never set `TRUST_PROXY=true` for an untrusted network.

## Destructive tool confirmation

`MCP_CONFIRM_DESTRUCTIVE=true` enables the default policy hook for destructive and bulk operations. Clients that advertise form elicitation receive a server-side confirmation request with a concise action summary. Other clients receive an error and must first inspect a `dry_run: true` preview, then repeat the call with `confirm: true`. The default is `false` to preserve existing deployment behavior; enterprise packages can replace the policy hook. Read-only tools do not prompt.

## Logging and telemetry

Set `MCP_LOG_FORMAT=json` to emit structured tool-call records to stderr. Records include a validated or generated correlation ID, tool, outcome, duration, and timestamp. Credential-like values and the current caller token are scrubbed before writing. Keep any custom log sinks private and avoid recording tool arguments. `MCP_LOG_LEVEL` filters records.

Telemetry callbacks receive span start and end metadata through the optional extension hook; the default implementation is no-op and adds no SDK dependency.

## REST wrapper and TLS

`HTTP_API_KEY` protects the REST wrapper; `BEARER_TOKEN` is the Polarion credential it uses. Keep TLS verification enabled. Setting `NODE_TLS_REJECT_UNAUTHORIZED=0` disables certificate validation and exposes credentials to interception.

## read_when

- Use this guide when reviewing deployment security or handling credentials.
