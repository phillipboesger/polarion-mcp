# Polarion Version Support and Upgrades

## How versioning works

The tool surface in `src/tools.ts` is generated from a Polarion OpenAPI definition. The committed file currently contains 284 tool definitions. That count describes the generated operations, not a guarantee that every operation works identically on every Polarion release or instance. Runtime behavior also depends on Polarion configuration and permissions.

The default regeneration source is the public Polarion demo definition. To target another published definition, set `SPEC_URL`; an authenticated instance may also require `BEARER_TOKEN`. See [OpenAPI and generation](./openapi-and-generation.md).

## Updating the generated tool surface

Run `npm run regenerate` locally, optionally setting `SPEC_URL` and `BEARER_TOKEN`. The `Update Polarion tools` GitHub workflow also supports manual dispatch and runs weekly against its default source. It opens a pull request when the generated file changes. Review changes and run the project quality checks before merging.

Regeneration updates the generated `src/tools.ts`; handwritten runtime modules are preserved. The process runs build and tests. It does not establish compatibility with every Polarion release, so verify important operations against the target version, using the live test suite where available.
