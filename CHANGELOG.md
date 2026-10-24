# Changelog

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
