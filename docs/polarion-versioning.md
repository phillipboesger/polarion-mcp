# Polarion Version Support and Upgrades

## Supported Version

This MCP server targets Polarion 2506 only. Other Polarion versions are not supported or tested.

## Upgrade Checklist

1. Get access to a Polarion instance on the target version.
2. Update the OpenAPI spec source. Either update the `download-spec` URL in `package.json` or run a manual curl against `/polarion/rest/v1/definition` and save it as `openapi.json`.
3. Export `BEARER_TOKEN` for the target instance and run `npm run download-spec` if you use the script.
4. Run `npm run update` to regenerate tools and rebuild the server.
5. Review diffs in generated files (for example `src/tools.ts`, `src/types.ts`, and `src/gpt-tools.ts`) and any custom logic in `src/`.
6. Update version compatibility notes in README and this file.
7. Smoke test key workflows (auth, work items, documents, search) against the new instance.

## Notes

- The REST API path remains `/polarion/rest/v1` for Polarion 2506 and later.
- Keep `openapi.json` in sync with the target instance before regenerating.
