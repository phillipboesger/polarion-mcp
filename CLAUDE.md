# polarion-mcp

MCP server for the Polarion ALM REST API (TypeScript, ESM, Node >= 22).

## Commands

- `npm run build`: compile to `build/` (`index.js` = stdio entry)
- `npm run build:http`: same, but copies the REST wrapper over `build/index.js` (Render only)
- `npm test`: compiles with `tests/tsconfig.json` and runs `node --test build-tests/tests/*.test.js`
- `npm run typecheck`: `tsc --noEmit` (no linter is configured)
- `npm run verify:setup`: typecheck, lint, strict docs, package check and full tests, zero skips allowed; `--docker` adds live tests (needs LIVE_API_BASE_URL, LIVE_PAT, LIVE_PROJECT_PAT)
- `npm run test:live`: runs `tests/live/` against a real Polarion (needs `LIVE_API_BASE_URL`, `LIVE_PAT`, a build; see `docs/live-tests.md`). CI: `.github/workflows/live-polarion.yml`
- `npm run regenerate`: re-download the OpenAPI spec and regenerate `src/tools.ts`

## Layout

- `src/index.ts`: stdio entry. `src/mcp-http-server.ts`: Streamable HTTP + OAuth (Claude.ai, ChatGPT). `src/http-server.ts`: REST wrapper with `HTTP_API_KEY`.
- `src/server.ts`: shared MCP server factory. `src/rest-api.ts`: REST tool routes.
- `src/tools.ts`: **generated**, do not hand-edit; curate via `scripts/enrich-*.mjs`.
- `src/tool-filter.ts`: `MCP_TOOLS` / `MCP_READ_ONLY` / `MCP_OMIT_OUTPUT_SCHEMA`; every tool lookup goes through `enabledTools`.
- `src/oauth.ts` + `src/sealed.ts`: stateless OAuth; client ids and tokens are sealed, the server stores nothing.

## Conventions

- Env is read in `start*` functions and passed to `createMcpHttpApp` as options, so tests inject config directly. Modules that read env at import time are tested in their own test file (each file runs in its own process).
- Tests are `node:test` + `assert/strict`, real HTTP against `app.listen(0)`; Polarion is stubbed via the injectable `validateToken`.
- `docs/configuration.md`, `docs/deployment.md`, `docs/security.md` use CRLF line endings; keep them.
- OAuth, sealing, session and transport code is a security surface: add negative tests for every change.
