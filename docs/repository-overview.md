# Repository overview

## Source layout

- `src/`: transports, shared execution, authentication, guards and generated tool definitions. See [architecture](architecture.md) for entry points and request flow.
- `tests/`: unit and HTTP integration tests; `tests/e2e/` tests built transports; `tests/live/` tests a real Polarion instance.
- `scripts/`: OpenAPI generation, enrichment, packaging and documentation checks.
- `docs/`: public guides and the GitHub Pages site, including its client manifest and assets.
- `plugin/`: Claude Code plugin and shipped workflow skills.
- `sdk/`: optional local SDK PDFs, not bundled. See [SDK setup](../sdk/README.md).
- `.github/`: contribution and security policies, CI and release workflows.

## Development

Start with [Contributing](../.github/CONTRIBUTING.md) for setup and verification commands. `src/tools.ts` is generated; update it through the [generation pipeline](openapi-and-generation.md). Its intermediates, `openapi.json` and `.gen/`, are gitignored. Check [Polarion versioning](polarion-versioning.md) and [live tests](live-tests.md) for target-instance compatibility.
