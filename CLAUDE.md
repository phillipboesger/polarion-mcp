# polarion-mcp

TypeScript ESM MCP server for Polarion ALM, Node.js 22+.

- Setup, commands and tests: [.github/CONTRIBUTING.md](.github/CONTRIBUTING.md).
- Code entry points: [docs/repository-overview.md](docs/repository-overview.md); request flow: [docs/architecture.md](docs/architecture.md).
- `src/tools.ts` is generated. Change it through `scripts/enrich-*.mjs` and the [generation pipeline](docs/openapi-and-generation.md).
- Read environment variables in startup functions and pass configuration as options so tests can inject it.
- Test OAuth, sealing, session and transport changes with negative cases. Use `node:test` and local HTTP servers.
- Preserve CRLF in `docs/configuration.md`, `docs/deployment.md` and `docs/security.md`.
