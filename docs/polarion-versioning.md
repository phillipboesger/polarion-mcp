# Polarion Version Support and Upgrades

## How versioning works

The tool surface in `src/tools.ts` is generated from a Polarion OpenAPI definition. The committed file currently contains 304 tool definitions. That count describes the generated operations, not a guarantee that every operation works identically on every Polarion release or instance. Runtime behavior also depends on Polarion configuration and permissions.

The default regeneration source is the public Polarion demo definition. To target another published definition, set `SPEC_URL`; an authenticated instance may also require `BEARER_TOKEN`. See [OpenAPI and generation](./openapi-and-generation.md).

## Updating the generated tool surface

Run `npm run regenerate` locally, optionally setting `SPEC_URL` and `BEARER_TOKEN`. The `Update Polarion tools` GitHub workflow also supports manual dispatch and runs weekly against its default source. It opens a pull request when the generated file changes. If the default demo definition has fewer operations than the committed surface (for example while the demo still serves an older release than 2612), the scheduled run is skipped with a notice; dispatch it manually with `spec_url` to regenerate from a newer definition. Review changes and run the project quality checks before merging.

Regeneration updates the generated `src/tools.ts`; handwritten runtime modules are preserved. The process runs build and tests. It does not establish compatibility with every Polarion release, so verify important operations against the target version, using the live test suite where available.

## Supported Polarion releases

The full tool surface targets the newest release (2612). The newest three releases are guaranteed usable: 2612, 2606 and 2512. 2506 is best-effort now. When a newer release ships, the oldest of those becomes best-effort and stays in the live matrix until it breaks. The live suite runs against the releases in [polarion-versions.json](./polarion-versions.json) (see [live tests](./live-tests.md)). The 2512 cells were confirmed by the live run of PR #111.

| Area | 2612 | 2606 | 2512 | 2506 |
|---|---|---|---|---|
| Local (stdio) setup | Yes | Yes | Yes | Yes |
| HTTP/OAuth login check | `GET /metadata` | `GET /metadata` | `GET /metadata` | Fallback `GET /projects` |
| Global REST GET permission required for login | No | No | No | Yes |
| `getCurrentUser` (`GET /user`) | Yes | Yes | Yes | No (404, use the other tools) |
| Job execution (`/jobs`) | Yes | Yes | Yes | No (only `GET /jobs/{id}` and file download) |
| Custom field writes (key and enum value check) | Yes | Yes | Yes (type-scoped field metadata) | No (refused: no field metadata endpoint) |
| Spaces, license types, user field metadata (new in 2612) | Yes | No (404) | No (404) | No (404) |

Deviations on older releases are listed below. When an older release lacks an endpoint that a write safety check needs, the server refuses the affected writes instead of skipping the check; upgrading Polarion lifts the limit.

- **2506 login:** there is no `/metadata`, so the server reads `GET /projects?page[size]=1`. The Polarion user must be allowed global REST GET. If not, the log shows `GET /projects failed: permission_denied` and the diagnostic points at this requirement or an upgrade to 2512+.
- **Field metadata:** the guards read a Work Item's field metadata per item on 2606. 2512 has no per-item endpoint, so they read the item's type and use the type-scoped lookup. 2506 has neither, so writes that set a custom field are refused there and the message asks for Polarion 2512 or newer; standard fields still work.
- **2612:** adds the Spaces endpoints (`getProjectSpaces`, `getRepositorySpaces`, and create, patch, delete), license types and slot relationships, per-user field metadata and `patchDocumentParts`; the generated tools for them answer 404 on older releases. Three behaviors seen on 2612 (Early Access) in live runs: `getDocumentParts` answers 500 for a LiveDoc with `homePageContent`, so use `read_document_markdown` there; a timestamp such as `2026-11-21T10:00:00Z` inside a Lucene `query` answers 500, so query by date only; `DELETE` of a document answers 405. These come from Polarion, not from the server.
- **401 and 403 from `/metadata` never fall back.** A revoked token or a denied user stays rejected.
- **Verify steps in the client guides:** `getCurrentUser` answers 404 on 2506. Ask for `getProjects` instead; the login itself still worked.

## Adding a Polarion release

1. Build and push the release's Polarion Docker image.
2. Add the release to [polarion-versions.json](./polarion-versions.json) with `allowFailure: true` initially. This makes its live matrix job non-blocking while the image and compatibility are verified. `allowFailure: true` is allowed on any status for a not-yet-published image. Remove the flag when the job is ready to gate changes.
3. Run the `Update Polarion tools` workflow with `spec_url` pointing to the new release's OpenAPI definition, then review the generated `src/tools.ts` diff.
4. Update the support table above, then promote the new release to `latest` and demote prior statuses so the newest three releases are guaranteed. Set `allowFailure: true` on every release demoted to `best-effort`, and keep older releases in the matrix until they break.
