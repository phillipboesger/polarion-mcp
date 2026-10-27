# Contributing

## Setup

Use Node.js 22 or newer. Install dependencies, then build:

```bash
npm ci --ignore-scripts
npm run build
```

Runtime environment variables are documented in [docs/configuration.md](../docs/configuration.md). Avoid putting credentials in commits, logs, or examples.

## Make changes

Keep changes focused and follow the existing TypeScript and documentation style. `src/tools.ts` is generated; update it through `npm run regenerate` rather than editing it directly. When runtime behavior changes, update the relevant docs and tests.

## Quality checks

Run the checks relevant to the change. The core suite is:

```bash
npm run lint
npm run typecheck
npm test
npm run check:docs
```

`npm run verify:setup` runs typecheck, lint, the strict docs check, the package check and the full test suite in one command. It fails on any skipped test. Add `--ui` for the docs browser tests. `npm run verify:setup:docker` adds the live tests against a Polarion you run yourself; see [docs/live-tests.md](../docs/live-tests.md).

Additional gates are `npm run test:coverage`, `npm run test:mutation`, `npm run test:e2e`, and `npm run check:package`. See [docs/quality/e2e.md](../docs/quality/e2e.md), [docs/quality/mutation-baseline.md](../docs/quality/mutation-baseline.md), [docs/quality/static-analysis.md](../docs/quality/static-analysis.md), and [docs/quality/distribution.md](../docs/quality/distribution.md).

For a real Polarion integration run, see [docs/live-tests.md](../docs/live-tests.md). Do not run it against production data.

## Pull requests

Use a focused branch and a clear commit message. Describe the behavior changed and list the verification commands and results. Do not include generated build output, credentials, or local Polarion SDK PDFs.
