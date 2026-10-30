# Polarion Version Support and Upgrades

## How versioning works

The tool surface in `src/tools.ts` is generated from a Polarion OpenAPI definition. The committed file currently contains 284 tool definitions. That count describes the generated operations, not a guarantee that every operation works identically on every Polarion release or instance. Runtime behavior also depends on Polarion configuration and permissions.

The default regeneration source is the public Polarion demo definition. To target another published definition, set `SPEC_URL`; an authenticated instance may also require `BEARER_TOKEN`. See [OpenAPI and generation](./openapi-and-generation.md).

## Updating the generated tool surface

Run `npm run regenerate` locally, optionally setting `SPEC_URL` and `BEARER_TOKEN`. The `Update Polarion tools` GitHub workflow also supports manual dispatch and runs weekly against its default source. It opens a pull request when the generated file changes. Review changes and run the project quality checks before merging.

Regeneration updates the generated `src/tools.ts`; handwritten runtime modules are preserved. The process runs build and tests. It does not establish compatibility with every Polarion release, so verify important operations against the target version, using the live test suite where available.

## Supported Polarion releases

The full tool surface targets the newest release (2606). Releases 2506 and 2512 must stay usable; the live suite runs against 2506, 2512 and 2606 (see [live tests](./live-tests.md)).

| Area | 2606 | 2512 | 2506 |
|---|---|---|---|
| Local (stdio) setup | Yes | Yes | Yes |
| HTTP/OAuth login check | `GET /metadata` | `GET /metadata` | Fallback `GET /projects` |
| Global REST GET permission required for login | No | No | Yes |
| `getCurrentUser` (`GET /user`) | Yes | Not confirmed | No (404, use the other tools) |
| Job execution (`/jobs`) | Yes | Not confirmed | No (only `GET /jobs/{id}` and file download) |

Deviations on older releases:

- **2506 login:** there is no `/metadata`, so the server reads `GET /projects?page[size]=1`. The Polarion user must be allowed global REST GET. If not, the log shows `GET /projects failed: permission_denied` and the diagnostic points at this requirement or an upgrade to 2512+.
- **401 and 403 from `/metadata` never fall back.** A revoked token or a denied user stays rejected.
- **Verify steps in the client guides:** `getCurrentUser` answers 404 on 2506. Ask for `getProjects` instead; the login itself still worked.
