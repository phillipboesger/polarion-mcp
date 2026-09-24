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
4. `generate-tools` — chains two steps into `src/tools.ts`:
   - `scripts/generate-tools.mjs` extracts only `toolDefinitionMap` + `securitySchemes` from `.gen/src/index.ts`, injecting `dry_run` (mutating tools) and MCP `annotations` (`readOnlyHint`/`destructiveHint`/`idempotentHint`/`openWorldHint`, derived from the HTTP method) into every tool.
   - `scripts/enrich-tool-metadata.mjs` then adds, on top of that: a "Scope: ..." sentence + named alternative for tool pairs that share a resource at two *scopes* (e.g. `getAllWorkItems` vs. `getWorkItems`, `getGlobalEnumeration` vs. `getProjectEnumeration`); a "Cardinality: ..." sentence + named alternative for tool pairs that share a resource path and HTTP method but target a single item by ID vs. the full collection/a batch (e.g. `deleteCollection` vs. `deleteCollections`) — a different axis from scope, so a tool can carry both notes; rich, concrete replacement text (`PARAM_DESCRIPTIONS` in `scripts/lib/entry-utils.mjs`) for the ~25 parameter names that recur near-identically across most tools (`projectId`, `fields`, `query`, pagination, etc.), replacing the OpenAPI spec's terse originals; a truthful "Effect: ..." sentence on non-GET tools derived only from method + annotations (irreversible / idempotent / creates a duplicate — never invented); a "Tip: ..." sentence pointing at `dry_run` on every tool that accepts it; and a hand-written lead description (`TOOL_GUIDANCE` in `scripts/lib/tool-guidance.mjs`) for tools whose OpenAPI summary is too generic to choose the tool by (e.g. "Returns fields for the specified resource."), replacing only the text before the generated notes. `tests/tool-descriptions.test.ts` fails if a regeneration brings a generic summary back; add the tool to `TOOL_GUIDANCE` when it does.
   - `scripts/enrich-output-schemas.mjs` then adds an `outputSchema` (JSON Schema for the success response body) to every tool whose OpenAPI operation declares a JSON response, resolved from `openapi.json`'s `components/schemas` (including nested `$ref`s). Tools whose success response has no JSON body (e.g. most `204 No Content` deletes) are intentionally left without one — that's accurate, not a gap. This step is a no-op if `openapi.json` isn't present (i.e. run outside the full regeneration pipeline).
   - All enrichment passes are idempotent — safe to rerun directly against `src/tools.ts` (see `scripts/lib/entry-utils.mjs` for the shared text-editing helpers).
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
