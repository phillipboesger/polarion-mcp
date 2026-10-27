# Repository Overview

This repository provides Polarion REST operations through MCP and HTTP. The committed tool definitions are generated from a Polarion OpenAPI definition; runtime compatibility depends on the target instance and its API behavior. See [Polarion versioning](./polarion-versioning.md).

## Repository layout

- `src/`: TypeScript transports, executor, authentication, guards, resources, tool filters, toolsets, and generated `tools.ts`.
- `tests/`: unit, HTTP integration, and end-to-end tests, with `tsconfig.json` and `stryker.config.mjs` for test compilation and mutation testing.
- `tests/live/`: tests against a real Polarion instance.
- `docs/`: usage, maintenance, quality, and deployment documentation.
- `scripts/`: generation, enrichment, package, and documentation check scripts.
- `sdk/`: optional local SDK PDFs, not bundled.
- `.github/`: [contribution guidelines](../.github/CONTRIBUTING.md), [security policy](../.github/SECURITY.md), secret-scan configuration, and CI/release workflows.
- `docs/CNAME`: custom domain for GitHub Pages, which publishes from `docs/`.
- Root files contain project metadata and conventional tool entry points: `package.json`, lockfile, `tsconfig.json`, `eslint.config.mjs`, `Dockerfile`, `render.yaml`, `server.json`, and `.env.example`.

## Entry points

- `src/index.ts`: stdio MCP.
- `src/mcp-http-server.ts`: Streamable HTTP MCP.
- `src/http-server.ts`: REST HTTP wrapper.
- `src/server.ts`: shared MCP server factory.
- `src/rest-api.ts`: REST tool routes.

## Generated code

`src/tools.ts` contains the generated tool map and security schemes. It currently defines 284 tools. Regenerate it with `npm run regenerate`; do not hand-edit it. `openapi.json` and `.gen/` are intermediate files. See [openapi-and-generation.md](./openapi-and-generation.md).

## Build and verification

The package scripts include `npm run build`, `npm run typecheck`, `npm test`, `npm run lint`, `npm run test:coverage`, `npm run test:mutation`, `npm run test:e2e`, `npm run check:docs`, `npm run check:package`, and `npm run verify:setup` (the local setup gate, see [live-tests.md](live-tests.md)). The release and CI workflows are defined under `.github/workflows/`.
