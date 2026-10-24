# End-to-end conformance

Run `npm run build && npm run test:e2e` to exercise the built stdio entry point,
Streamable HTTP server, OAuth login and refresh, CIMD, loopback redirect preset,
toolset route, Custom GPT REST API, and REST wrapper. Tests use the official
Model Context Protocol SDK client and an ephemeral local Polarion stand-in.
They make no calls to a real Polarion instance and do not print credentials.

The CI `e2e` job also invokes MCP Inspector's CLI through `npx` and builds the
Docker image before sending it an MCP initialize request over stdio. These
steps are separate from `npm run test:e2e`: Inspector is not a project
dependency, so the local suite reports it as skipped unless the Inspector CLI
is already installed. Docker image verification is CI-only and can be run
locally with the corresponding commands in `.github/workflows/ci.yml` when
Docker is available.

The suite is black-box conformance coverage. Detailed edge cases remain in the
unit and HTTP integration tests.
