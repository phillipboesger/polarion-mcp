# Documentation

Reference and setup guides for Polarion MCP.

## Client setup

Complete setup in the [landing page's inline guide](https://polarion-mcp.boesger.com/#clients). It groups AI providers, tools / IDEs, and custom / self-hosted options including Docker.

The [client source reference](clients.md) records vendor documentation and setup notes. [clients.json](clients.json) drives the website, grouped README table and source reference.

## Guides

| Document | Description |
|---|---|
| [Architecture](architecture.md) | Server components, transports, and request flow. |
| [Configuration](configuration.md) | Environment variables and configuration behavior. |
| [Deployment](deployment.md) | Deployment targets, reverse proxy setup, and operations. |
| [Extension seams](extensions.md) | Synthetic tools, policy, audit, authentication, and instance resolver interfaces. |
| [Features](features.md) | Supported server features and behavior. |
| [Live tests](live-tests.md) | Running integration tests against a live Polarion instance. |
| [OpenAPI and generation](openapi-and-generation.md) | How the API specification and generated tools are maintained. |
| [Polarion versioning](polarion-versioning.md) | Compatibility and version considerations. |
| [Distribution quality](quality/distribution.md) | Package and container distribution checks. |
| [End-to-end conformance](quality/e2e.md) | MCP, OAuth, REST wrapper, and container conformance checks. |
| [Supply chain verification](quality/supply-chain.md) | Release SBOMs, provenance, image signatures, and verification commands. |
| [Agent evals](quality/evals.md) | Offline validation and optional agent tool-selection evals. |
| [REST API coverage](quality/rest-coverage.md) | Generated operation coverage and Polarion version differences. |
| [Static analysis](quality/static-analysis.md) | CodeQL, ESLint, Gitleaks and audit: what runs in CI and how to read it. |
| [Repository overview](repository-overview.md) | Repository layout and development entry points. |
| [Resources and prompts](resources-and-prompts.md) | MCP resources, live resource templates, and prompts. |
| [Polarion Claude Code plugin](../plugin/README.md) | MCP server configuration and three workflow skills. |
| [Security](security.md) | Authentication, authorization, and security controls. |
| [Troubleshooting](troubleshooting.md) | Common setup and runtime issues. |
| [Usage](usage.md) | Calling tools and using the server. |
| [Client manifest](clients.json) | Structured client transport, authentication, and setup metadata. |
| [Client manifest schema](clients.schema.json) | JSON Schema for the client setup manifest. |
| [Product page](index.html) | Project website and feature overview. |

Return to the [project landing page](../README.md).
