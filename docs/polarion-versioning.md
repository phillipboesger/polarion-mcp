# Polarion Version Support and Upgrades

## How versioning works

The tool surface in `src/tools.ts` is generated from a Polarion OpenAPI definition. The committed file currently contains 284 tool definitions. That count describes the generated operations, not a guarantee that every operation works identically on every Polarion release or instance. Runtime behavior also depends on Polarion configuration and permissions.

The default regeneration source is the public Polarion demo definition. To target another published definition, set `SPEC_URL`; an authenticated instance may also require `BEARER_TOKEN`. See [OpenAPI and generation](./openapi-and-generation.md).

## Updating the generated tool surface

Run `npm run regenerate` locally, optionally setting `SPEC_URL` and `BEARER_TOKEN`. The `Update Polarion tools` GitHub workflow also supports manual dispatch and runs weekly against its default source. It opens a pull request when the generated file changes. Review changes and run the project quality checks before merging.

Regeneration updates the generated `src/tools.ts`; handwritten runtime modules are preserved. The process runs build and tests. It does not establish compatibility with every Polarion release, so verify important operations against the target version, using the live test suite where available.

## Supported Polarion releases

The full tool surface targets the newest release (2606). The newest three releases are guaranteed usable: 2606, 2512 and 2506. When a newer release ships, the oldest of those becomes best-effort and stays in the live matrix until it breaks. The live suite runs against the releases in [polarion-versions.json](./polarion-versions.json) (see [live tests](./live-tests.md)). The 2512 cells were confirmed by the live run of PR #111.

| Area | 2606 | 2512 | 2506 |
|---|---|---|---|
| Local (stdio) setup | Yes | Yes | Yes |
| HTTP/OAuth login check | `GET /metadata` | `GET /metadata` | Fallback `GET /projects` |
| Global REST GET permission required for login | No | No | Yes |
| `getCurrentUser` (`GET /user`) | Yes | Yes | No (404, use the other tools) |
| Job execution (`/jobs`) | Yes | Yes | No (only `GET /jobs/{id}` and file download) |

Deviations on older releases:

- **2506 login:** there is no `/metadata`, so the server reads `GET /projects?page[size]=1`. The Polarion user must be allowed global REST GET. If not, the log shows `GET /projects failed: permission_denied` and the diagnostic points at this requirement or an upgrade to 2512+.
- **401 and 403 from `/metadata` never fall back.** A revoked token or a denied user stays rejected.
- **Verify steps in the client guides:** `getCurrentUser` answers 404 on 2506. Ask for `getProjects` instead; the login itself still worked.

## Adding a Polarion release

1. Build and push the release's Polarion Docker image.
2. Add the release to [polarion-versions.json](./polarion-versions.json) with `allowFailure: true` initially. This makes its live matrix job non-blocking while the image and compatibility are verified. `allowFailure: true` is allowed on any status for a not-yet-published image. Remove the flag when the job is ready to gate changes.
3. Run the `Update Polarion tools` workflow with `spec_url` pointing to the new release's OpenAPI definition, then review the generated `src/tools.ts` diff.
4. Update the support table above, then promote the new release to `latest` and demote prior statuses so the newest three releases are guaranteed. Set `allowFailure: true` on every release demoted to `best-effort`, and keep older releases in the matrix until they break.
