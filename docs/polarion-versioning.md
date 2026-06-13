# Polarion Version Support and Upgrades

## How versioning works

The server's tool surface (`src/tools.ts`) is generated from a Polarion OpenAPI
definition, so the supported version is simply whichever spec you last regenerated
from. The REST path `/polarion/rest/v1` is stable across Polarion releases; newer
releases mainly add endpoints and fields, which regeneration picks up.

- Default spec source: the public Polarion demo (kept current by Siemens).
- The committed `src/tools.ts` reflects the most recent regeneration (see its header for the tool count).

You do **not** need to update anything continuously — only when you move to a newer
Polarion version and want its new endpoints.

## Updating to a newer version (e.g. 2606)

Two equivalent options:

- **Automated (recommended):** run the *Update Polarion tools* GitHub Action
  (Actions tab → Run workflow). Leave `spec_url` blank to use the public demo, or
  paste the published REST spec URL of your target version. It regenerates, runs
  build + tests, and opens a pull request with the updated `src/tools.ts`.
- **Local:**

  ```bash
  # public demo (latest)
  npm run regenerate
  # or a specific instance/version
  SPEC_URL="https://your-polarion-server/polarion/rest/v1/definition" BEARER_TOKEN="..." npm run regenerate
  ```

Then review the `src/tools.ts` diff, smoke test key workflows (auth, work items,
documents, search), and merge.

## Notes

- Regeneration only rewrites `src/tools.ts`; all hand-written modules are preserved (see [openapi-and-generation.md](./openapi-and-generation.md)).
- A weekly scheduled run of the same workflow surfaces drift automatically.
