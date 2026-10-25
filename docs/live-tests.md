# Live tests against a real Polarion

`npm test` uses local test doubles and HTTP test servers. `npm run test:live` runs the suite in `tests/live/` against a real Polarion using `LIVE_API_BASE_URL` and `LIVE_PAT`. The suite exercises available read-only tools, paging and input validation, selected Work Item writes, and Streamable HTTP authentication flows. Exact coverage depends on the configured instance; see the test files for current cases.

## In CI

The `.github/workflows/live-polarion.yml` workflow uses the private Polarion Docker image for versions 2506 and 2606. It activates a trial, provisions a token, then runs the suite. The workflow is triggered by qualifying pull requests and pushes, a nightly schedule at 05:00 UTC, or manual dispatch. Fork and Dependabot runs may not have permission to pull the private image.

The composite live cases assert job execution, document content, trace links, attachment uploads, and collection across more than 100 links. Test-owned jobs and data are cleaned up, and the workflow runs against disposable instances.

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
