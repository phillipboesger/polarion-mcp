# Changelog

## 1.5.0

### Improvements

- Polarion 2506: the PAT check still tries `GET /metadata` first (2512+, no global REST GET needed). Only a 404 from it falls back to `GET /projects?page[size]=1`, which needs global REST GET, so HTTP and OAuth now work on 2506. 401 and 403 never fall back. The live suite also runs on 2512. Version matrix: `docs/polarion-versioning.md`.
- Corporate proxy: `HTTPS_PROXY` and `NO_PROXY` are honored for calls to an `https://` Polarion (CONNECT tunnel, no new dependency). A proxy login is accepted as `http://user:pass@host`, a `407` gives a clear error, and credentials never appear in errors.
- OAuth redirect presets: `m365` allows Microsoft's fixed Teams callback for Microsoft 365 Copilot. `mistral` is reserved and denies everything until Mistral documents the Le Chat callback.
- Client guides: new Microsoft 365 Copilot / Teams, Mistral Le Chat and self-hosted models (Open WebUI, LibreChat; Ollama, vLLM, OpenRouter as backends). "VS Code / GitHub Copilot" is now "GitHub Copilot" with VS Code, Eclipse, JetBrains and Visual Studio variants. Gemini CLI is now "Antigravity (CLI + IDE)". The old guide URLs keep a pointer page.
- Guides: the check step of every `getCurrentUser` prompt now expects the user instead of projects, and every mode lists a 401 fix.
- FAQ: one source (`docs/clients.json`) feeds the README, `docs/clients.md` and `docs/troubleshooting.md`; every entry has an id and stays within 500 characters. New answers cover REST disabled (404), `request_rejected 400`, tool limits, the Copilot organization policy, corporate proxy, disabled or expired PATs and models without tool calling.

### Tests

- Guide-literal tests start the exact command from each local snippet against a stub Polarion and check the user, the request headers and the 401, 404 and 503 symptoms.
- Manifest tests cover redirect presets, image tags, FAQ length and required topics, and a prose lint (no em dashes or stock AI words).

## 1.4.5

### Maintenance

- Dependency updates: npm minor and patch group, `docker/login-action` 4. The Anthropic SDK 1.x bump is a dev dependency only and does not affect the shipped server.
- Dependabot minor and patch updates now merge automatically once required checks pass; major updates stay manual.

## 1.4.4

### Improvements

- Tool descriptions: curated guidance, sibling routing and parameter hints for the lowest-rated tools, and a description on every composite tool input property. Tool names, schemas and behavior are unchanged.
- Docs: a table of look-alike tool families in the usage guide and per-client notes on smaller tool lists (toolsets, allowlist, read-only, discover mode).

## 1.4.3

### Fixes

- Failed PAT probes log Polarion's own message again (sanitized, 200 characters, PAT redacted) next to the category and status, for example `request_rejected HTTP 400 - ...`. The error shown to users stays generic.
- Setup connectivity: the PAT check reports one of 13 categories (invalid PAT, permission denied, rejected request, missing endpoint, redirect, TLS, DNS, timeout and more) with an action. Tool errors add a hint that separates a rejected token from a missing permission.
- Docs: troubleshooting names the log line the server writes and explains `request_rejected HTTP 400`, including the Polarion Docker image's `ALLOWED_HOSTS` for non-default hostnames; container-side probe; firewall note for Anthropic's outbound range.

### Upgrade notes

- Update the image or package and recreate the container; a restart keeps the old image.

## 1.4.2

### Fixes

- The PAT check calls `GET /metadata`, which needs no global REST permission, so project-only users can connect (they previously got 403 at login). HTTP and OAuth connections require Polarion 2512 or newer; on older releases use stdio with your own PAT. 403 and unusable responses are never accepted as a valid login.

## 1.4.1

### Upgrade notes

- Composite tools now reject unknown top-level arguments and malformed `dry_run` values. Previously they were ignored, and `dry_run: "true"` ran a real job.
- `max_items` together with `page_size_` above 100 is rejected (Polarion's page limit).
- The PAT check refuses a 200 response that is not JSON (for example an SSO or proxy login page).
- With `MCP_CONFIRM_DESTRUCTIVE=true`, destructive Custom GPT REST calls need `confirm: true` in `arguments`. Defaults are unchanged.

### Fixes

- `run_job_and_wait`, `get_document_markdown` and `trace_links` handled Polarion's single-object responses wrongly (no job ID, empty document, no links). They now read the real shapes and request the fields they render. `trace_links` pages through all link pages.
- `search_work_items`: several types or statuses are OR-ed within a group and AND-ed across groups; an empty search no longer sends an invalid query; field metadata is cached per instance, caller and project.
- `upload_attachment` no longer sends a `lid` that Polarion rejects for single files.
- `max_items` is honoured across pages for MCP, composite and REST calls; a finished list no longer advertises a stale `next` link; repeated or backward next links stop paging.
- Response caps apply to composite, error and marked output; truncation uses a binary search instead of a quadratic loop.
- Failed Basic token requests are rate limited before credential rejection.

### Security

- Custom GPT REST routes of the Streamable HTTP server run through the MCP pipeline (rate limit, policy, audit, confirmation) and honour `MCP_TOOLSETS`.
- Forged `<polarion-untrusted>` wrappers are neutralised when `MCP_MARK_UNTRUSTED=true`; upstream error text is marked as untrusted.
- Standalone REST wrapper: failed API-key attempts (401/403 only) are throttled before authentication.
- A disconnecting client cancels in-flight pagination and retries.

### Docs

- Documentation matches the implemented contracts; the docs check flags duplicate configuration entries.
- Polarion 2506 exposes only `GET /jobs/{id}`; the live job scenario skips there and runs on 2606.

## 1.4.0

### Upgrade notes

- **One-time re-login for all OAuth users.** Access and refresh tokens are now bound to the canonical resource (`<public URL>/mcp`) and the Polarion base URL. Tokens issued by 1.3.x are refused; users sign in again once. To rotate `MCP_TOKEN_SECRET` without logging users out, list the old key in `MCP_TOKEN_SECRET_PREVIOUS`.
- Refresh tokens now rotate and expire (`MCP_REFRESH_TOKEN_TTL`, default 14 days sliding, 90 days absolute). Revoke access by revoking the PAT in Polarion.
- `/authorize` rejects a `resource` other than the canonical MCP URL.
- Deployed env vars (`MCP_ALLOWED_REDIRECT_PREFIXES`, `TRUST_PROXY`, `MCP_TOOLS`, `MCP_READ_ONLY`, `MCP_OMIT_OUTPUT_SCHEMA`) are unchanged. New variables are listed in [docs/configuration.md](docs/configuration.md).

### Security

- Rate limits keyed per client id and PAT instead of per IP, so shared-egress clients are no longer locked out; token spraying stays capped.
- `WWW-Authenticate` on every 401, narrowed scopes, constant-time client secret comparison, Origin allowlist (`MCP_ALLOWED_ORIGINS`) and CORS for `/mcp`.
- REST wrapper: JSON 429, generic 500 body, API key rate limit, restricted CORS.
- zod 4 upgrade (GHSA-mrhx-c7xc-m3w5), `follow-redirects`, `body-parser` and `fast-uri` advisories fixed; `npm audit` reports 0.

### Fixes

- Tool descriptions match their annotations; `dry_run` text matches executor behaviour.
- `changeTypeTo` validates status against the new type; enum lookups paginate; `patchAllWorkItems` refuses ids without a project prefix.
- `patchGlobalEnumeration`, `patchProjectEnumeration`, `patchGlobalCustomFields` and `patchCustomField` replace the whole option or field list (verified on Polarion 2606). They are now annotated destructive and their descriptions say to send the complete list.
- Responses are compact and capped (`MCP_MAX_RESPONSE_CHARS`); multipart bodies accept objects; HTML login pages on reads become errors.

### Features

- Client support: redirect presets and loopback (`MCP_ALLOWED_REDIRECT_PRESETS`), toolsets (`MCP_TOOLSETS`, `X-MCP-Toolsets`, `/mcp/<set>`), Client ID Metadata Documents (`MCP_CIMD_ENABLED`, off by default), per-client guides in `docs/clients/`, `.mcpb` bundle, npm package.
- Composite tools: `search_work_items`, `lint_query`, `resolve_polarion_url`, `trace_links`, `run_job_and_wait`, LiveDoc Markdown tools, `upload_attachment` (local path on stdio, SSRF-guarded URL).
- Response shaping (`response_format`, `max_items`), discover mode (`MCP_MODE`), completions, resource templates and links, confirmation for destructive tools, structured logs, untrusted-content marking, per-user tool rate limit, optional Polarion version check.
- Supply chain: SBOM, provenance attestations.

### Quality

- ESLint, coverage gate (80 % global, 90 % security modules), mutation testing of the security modules (>= 80 %), documentation consistency check, e2e conformance suite, CodeQL, Gitleaks, actionlint, Dependabot.
