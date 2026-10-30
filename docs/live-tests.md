# Live tests against a real Polarion

`npm test` uses local test doubles and HTTP test servers. `npm run test:live` runs the suite in `tests/live/` against a real Polarion using `LIVE_API_BASE_URL` and `LIVE_PAT`. The suite exercises available read-only tools, paging and input validation, selected Work Item writes, and Streamable HTTP authentication flows. Exact coverage depends on the configured instance; see the test files for current cases.

## In CI

The `.github/workflows/live-polarion.yml` workflow uses the private Polarion Docker image for versions 2506 and 2606. It activates a trial, provisions a token, then runs the suite. The workflow is triggered by qualifying pull requests and pushes, a nightly schedule at 05:00 UTC, or manual dispatch. Fork and Dependabot runs may not have permission to pull the private image.

The composite live cases assert job execution, document content, trace links, attachment uploads, and collection across more than 100 links. Test-owned jobs and data are cleaned up, and the workflow runs against disposable instances. The job scenario needs the `/jobs` endpoints, which Polarion 2506 does not expose (only `GET /jobs/{id}` and file download), so it is skipped there with a reason; it runs on 2606.

## Locally

Start a Polarion instance and obtain a personal access token. Then build and run:

```bash
npm ci --ignore-scripts
npm run build
LIVE_API_BASE_URL=https://polarion.example.com/polarion/rest/v1 \
LIVE_PAT=your-token npm run test:live
```

`LIVE_PROJECT` selects the project used for write scenarios; the suite's default is defined in `tests/live/`. `LIVE_BUILD_DIR` can point the runner at a different build. See [configuration.md](./configuration.md) for server settings; these live-test variables are consumed by the test runner.

The suite creates and removes test data on the configured instance. Use a disposable project with appropriate permissions.

For the project-permission regression test, set `LIVE_PROJECT_PAT` to a separate user with REST GET permission in `LIVE_PROJECT` and no global REST GET permission. On Polarion 2512+, the test requires `/metadata` to return 200 and `/projects` to return 403 for that PAT, then verifies MCP initialization and project reads succeed. Without this variable, `npm run test:live` skips that test.

### Local gate with Docker

`npm run verify:setup:docker` runs the full local gate (static checks, code tests, then the live suite). It refuses to start unless `LIVE_API_BASE_URL`, `LIVE_PAT` and `LIVE_PROJECT_PAT` are set, and it fails on any skipped live case, so a green run means every live case executed. Provision the scoped users with `node scripts/live/provision-users.mjs --container NAME --url URL --project ID --output PRIVATE_JSON`. Keep the output file private and delete it afterwards. `npm run verify:setup` runs the same gate without the live tests.

The Streamable HTTP/OAuth live suite requires Polarion 2512+ because its PAT preflight uses `/metadata`. The suite skips HTTP/OAuth on older instances when that endpoint returns 404; stdio tests still run.

## Guide-literal tests (no Polarion needed)

`tests/guide-literal.test.mjs` runs on every `npm test`. For each client with a local setup it reads the snippet from `docs/clients.json`, parses it in the client's own format (JSON `mcpServers` or `servers`, a `mcp add` command, Codex TOML, the Agents SDK Python dict), and starts exactly the documented command, args and env against a stub Polarion. The only substitutions are the placeholder URL and token, and `npx -y polarion-mcp` becomes this checkout's build. The suite asserts the `getCurrentUser` result, the `Authorization: Bearer` header and REST path the stub received, and the 401, 404 and 503 symptoms that the guides name. Because the snippets are read from the manifest, a guide cannot drift from what is tested.
