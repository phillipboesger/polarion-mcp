# Security

## Security model

PAT validation probes `GET /metadata` first. On Polarion 2512+ it works without global REST GET permission. Only a usable metadata JSON response authenticates a PAT for MCP initialization, OAuth login, and refresh. HTTP 401 rejects the PAT and HTTP 403 denies access; neither triggers a fallback. Only a 404 from `/metadata` (Polarion 2506) falls back to `GET /projects?page[size]=1`, which does need global REST GET permission and requires a usable JSON project list. Network failures and unusable responses remain unavailable, and redirects are not followed. Session caps, token ownership, and failed-authentication limits still apply. Empty, malformed, HTML, proxy, or other unusable HTTP 200 responses cannot authenticate credentials. Successful authentication does not grant tool permissions; Polarion authorizes each tool call. Failed Basic-auth requests are counted against per-IP and per-client limits before rejection; successful exchanges do not consume the failed-request budget.

The REST HTTP wrapper (`build/http-server.js`) authenticates callers with `HTTP_API_KEY` and makes Polarion calls using the deployment's `BEARER_TOKEN`. The Streamable HTTP MCP server uses each caller's Polarion PAT directly, or a sealed OAuth token containing that PAT. Polarion remains the authorization boundary for tool operations. Server-side filtering reduces the callable surface: `MCP_READ_ONLY` removes writes, and `MCP_TOOLS` limits the server to listed operations (see below). OAuth tokens and client credentials are sealed statelessly; in-memory login state, authorization codes, and MCP sessions are not shared between instances.

## Secrets and tokens

- Keep Polarion PATs, `HTTP_API_KEY`, OAuth client secrets, and `MCP_TOKEN_SECRET` in environment secret storage. Do not commit them or include them in logs, prompts, issues, or screenshots.
- Use least-privilege PATs and a dedicated Polarion identity where possible.
- `MCP_TOKEN_SECRET` must be at least 32 characters and stable across restarts and instances. If it is unset, a random key is generated on startup, invalidating logins after restart.
- Rotate `MCP_TOKEN_SECRET` by setting the new key and listing the old key in `MCP_TOKEN_SECRET_PREVIOUS`. Previous keys are used to open old sealed values; newly issued values use the current key. Remove the old key after clients have renewed.
- Changing the secret without a previous-key entry invalidates OAuth tokens and requires users to sign in again. Changing the public resource audience also requires a new login.

## OAuth and revocation

Access tokens last one hour. Refresh tokens last 14 days by default, slide forward when used, and have a 90-day family cap. Refresh tokens are stateless: a previously issued refresh token remains valid until its own expiry, including after a later refresh. The server has no token-family revocation store or OAuth revocation endpoint. Revoking the backing PAT in Polarion prevents successful renewal and access. Tokens are bound to the protected resource URL under RFC 8707.

Existing deployments upgrading to resource-bound tokens require each user to authenticate once again after the upgrade.

Set `MCP_ALLOWED_REDIRECT_PREFIXES` or `MCP_ALLOWED_REDIRECT_PRESETS` when OAuth login is enabled. Without an allowlist, dynamically registered OAuth clients can use arbitrary callback URIs. Preset names are `claude`, `chatgpt`, `vscode`, `cursor`, `copilot-studio`, `gemini`, `m365`, `mistral`, and `loopback`. Callback entries ending in `/` are prefixes; other entries are exact matches.

`upload_attachment` is a mutating file-upload tool. Local paths are disabled unless `MCP_UPLOAD_ROOTS` names allowed absolute directories, and they are accepted only over stdio because an HTTP server cannot read the caller’s local disk. The tool resolves symlinks and checks the real file path against each real root, rejects non-files, and checks a configurable size limit before reading. URL uploads are disabled unless `MCP_UPLOAD_URL_HOSTS` contains the exact hostname; HTTPS is required by default, DNS results must all be public, connections are pinned to validated addresses, and every redirect (up to three) repeats scheme, host, and address checks. Downloads have a 15-second deadline and a streaming byte cap. No caller credentials or cookies are forwarded, response content type is ignored, and errors/logs do not include full URLs. `dry_run` reports only the selected name, byte count, and SHA-256 and does not call Polarion. Because text read from Polarion is untrusted and could steer a model into uploading a local file, keep `MCP_UPLOAD_ROOTS` to narrow, non-sensitive directories; out-of-root and missing paths return the same error.

Client ID Metadata Documents are disabled by default. Set `MCP_CIMD_ENABLED=true` only when needed. When enabled, the server restricts identifiers to HTTPS URLs (or loopback), blocks private and special-use IP destinations, checks DNS results before connecting, pins the validated addresses to the connection, and refuses metadata-fetch redirects to mitigate SSRF and DNS rebinding. CIMD clients must use loopback redirects and the exact callback URL listed in their metadata document.

## Browser origins and DNS rebinding

`MCP_ALLOWED_HOSTS` enables Host validation against DNS rebinding. `MCP_ALLOWED_ORIGINS` controls browser Origin headers on MCP and OAuth paths; the `MCP_PUBLIC_URL` origin is always allowed. Protected endpoint path matching is case-insensitive. Requests without an Origin header are allowed, so these checks are browser protections, not caller authentication. The REST wrapper has its own `HTTP_CORS_ORIGINS` list and still requires its API key.

## Rate limits and reverse proxies

Tool-call rate limits and metadata caches are shared across MCP sessions in one HTTP app and keyed by caller token. Requests without a token use the single shared `no-token` bucket/cache scope.

Tool calls can also be limited per authenticated user in a rolling minute with `MCP_RATE_LIMIT_TOOLS`; the default is off. The limit is process-local, keys are derived from a hash of caller identity, and an over-limit call returns an MCP tool error with a retry hint.

With `MCP_MARK_UNTRUSTED=true`, JSON results carry a `_notice` that user-authored content is data, not instructions, and likely user-authored text fields are wrapped in `<polarion-untrusted>` markers. Embedded closing markers are neutralized. These markers help models distinguish data but do not replace tool authorization or output review.

Limits are in-memory per process. OAuth authorization is 100 requests per IP per 15 minutes. Token exchange is 50 failed attempts per client and IP per 15 minutes, with an additional IP ceiling of 500 failed attempts; successful requests do not count toward token failure ceilings. Failed Basic-auth requests count against these per-client and per-IP ceilings before rejection; successful requests are excluded. PAT checks are limited to 50 failures per IP and token per 15 minutes, plus 500 failures per IP. Dynamic client registrations are limited to 100 per IP per hour. Set `TRUST_PROXY` to the actual trusted proxy hop or address so limits see client IPs. If omitted behind a shared-egress proxy, all users share one IP bucket and one user's failures can lock out everyone. Never set `TRUST_PROXY=true` for an untrusted network.

## Restricting operations

`MCP_TOOLS` and `MCP_READ_ONLY` are enforced by the server: an operation they remove is not listed, not offered inside `execute`, and refused when called by name, on every transport. This also holds against a prompt-injected request. `X-MCP-Readonly` can only narrow one HTTP session further. Settings and exact rules: [Restrict what the AI can do](configuration.md#restrict-what-the-ai-can-do).

Know the limits:

- A listed composite may use the operations it is built from. Review which writes your list allows through composites (`transition_workitem_status`, `run_job_and_wait`, `upload_attachment`).
- A listed operation keeps its full reach. `patchWorkItem` can change any field the user may change; `executeJob` can start any job the user may start.
- The list is one per server, not per user. It is a second fence, not a replacement for least-privilege Polarion roles and tokens.
- Check the startup log after changing the list: misspelled names are ignored with a warning, so an operation you expected may be missing.

## Destructive tool confirmation

By default, reads and writes are allowed without server confirmation. Set `MCP_PROFILE=readonly` or `MCP_READ_ONLY=true` to block writes without prompts. Your MCP client may still ask before a tool call.

`MCP_CONFIRM_DESTRUCTIVE=true` (also enabled by `MCP_PROFILE=safe`) asks for confirmation for deletes and other calls classified as destructive, including names starting with `patchAll*` or containing `bulk`. It does not cover every bulk change: `patchWorkItems` and `postWorkItems` do not prompt. Neither do `patchWorkItem` (including workflow actions), `patchDocument`, `executeJob`, or uploads. `run_job_and_wait` does prompt.

Clients with form elicitation receive a server prompt. Other clients can send `confirm: true` on the first call, which lets the model confirm its own call and does not establish human approval. A `dry_run: true` preview is recommended but not enforced.

With confirmation enabled and writes allowed, Code Mode prompts once for `execute`, even for read-only scripts, except with `dry_run: true`. Destructive calls inside the script prompt again; other writes do not. Script-provided `confirm` is ignored. Without form elicitation, clients can confirm `execute`, but destructive calls inside it are refused. The action summary is truncated to 800 characters.

## Logging and telemetry

Set `MCP_LOG=json` to emit structured tool-call records to stderr. Records include a validated or generated correlation ID, tool, outcome, duration, and timestamp. Credential-like values and the current caller token are scrubbed before writing. Keep any custom log sinks private and avoid recording tool arguments. `MCP_LOG=json,warn` also sets the minimum level.

Telemetry callbacks receive span start and end metadata through the optional extension hook; the default implementation is no-op and adds no SDK dependency.

## REST wrapper and TLS

`HTTP_API_KEY` protects the REST wrapper; `BEARER_TOKEN` is the Polarion credential it uses. Keep TLS verification enabled. Setting `NODE_TLS_REJECT_UNAUTHORIZED=0` disables certificate validation and exposes credentials to interception.

The Custom GPT REST routes served by the Streamable HTTP server (`build/mcp-http-server.js`) run through the same pipeline as MCP tool calls, so `MCP_RATE_LIMIT_TOOLS`, the policy hook, `MCP_CONFIRM_DESTRUCTIVE` and the audit sink apply. With no MCP client to prompt, a destructive call needs `confirm: true` in its `arguments`. The standalone REST wrapper (`build/http-server.js`) does not run that pipeline: it applies only `HTTP_API_KEY`, its request limiter (failed authentication attempts are throttled separately) and the tool filters.

`max_items` pagination makes up to 20 Polarion calls per request (`MAX_AUTO_PAGES`). The standalone REST wrapper does not install a per-page hook, so each page runs without a budget check and the request is bounded only by the wrapper's HTTP-level limits. A large `max_items` call therefore holds one HTTP request open across up to 20 upstream calls made with the deployment's `BEARER_TOKEN`.
