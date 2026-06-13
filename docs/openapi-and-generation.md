# OpenAPI and Tool Generation

`src/tools.ts` (the `toolDefinitionMap` and `securitySchemes`) is generated from a
Polarion OpenAPI definition. Everything else in `src/` is hand-written and is never
touched by regeneration.

## Spec source

- Default: the public Polarion demo spec — `https://testdrive.polarion.com/polarion/sdk/doc/rest/polarionrest.json` (no auth). This keeps the public repo reproducible.
- Override with `SPEC_URL` to target a specific version's published REST spec, or your own instance's `/<base>/rest/v1/definition` (set `BEARER_TOKEN` too for an authenticated instance):

  ```bash
  SPEC_URL="https://your-polarion-server/polarion/rest/v1/definition" BEARER_TOKEN="..." npm run regenerate
  ```

## Regeneration pipeline

`npm run regenerate` (alias: `npm run update`) chains:

1. `download-spec` — fetch the OpenAPI JSON into `openapi.json` (gitignored).
2. `fix-sparse-fields` — simplify the `sparseFields` schema for MCP-friendly `fields` input.
3. `generate-mcp` — run `openapi-mcp-generator` into `.gen/` (gitignored); never into the repo tree.
4. `generate-tools` — `scripts/generate-tools.mjs` extracts only `toolDefinitionMap` + `securitySchemes` from `.gen/src/index.ts` and writes `src/tools.ts`.
5. `build` + `test` — compile and run the suite so a broken regeneration fails loudly.

Because step 4 extracts only the two data structures, the hand-written modular
architecture (server factory, the three transports, executor, etc.) is preserved.

## Automation

- The `Update Polarion tools` workflow (`.github/workflows/update-tools.yml`) runs the pipeline on a weekly schedule and via manual dispatch (with an optional `spec_url` input), then opens a pull request when `src/tools.ts` changed.
- Enabling PR creation requires "Allow GitHub Actions to create and approve pull requests" under Settings → Actions → General → Workflow permissions.

## Notes

- Generated/intermediate artifacts (`openapi.json`, `.gen/`) are gitignored; only `src/tools.ts` is committed.
- Invalid MCP property names (e.g. bracketed `page[size]`) are normalized generically at runtime by `sanitizeInputSchema`/`nameMap` in `src/utils.ts`, so no post-generation patching is required.
- `src/tools.ts` carries a generated header and a tool count; do not edit it by hand — rerun the pipeline instead.

## read_when

- Use this guide when updating the Polarion REST API version or regenerating tools.
