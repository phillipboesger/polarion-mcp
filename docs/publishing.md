# Publishing and discovery

## Package identities

- npm: `polarion-mcp` (TypeScript server, Node.js 22+).
- PyPI: `polarion-alm-mcp` (Python 3.10+ launcher of the matching npm release; Node.js and npm are still required).
- Official MCP Registry: `io.github.phillipboesger/polarion-mcp`.
- Container: `ghcr.io/phillipboesger/polarion-mcp`.

`polarion-mcp` on PyPI belongs to a different project.

Run `npm version` to synchronize the registry entry, Python launcher and Python client example. Publish the npm version before its corresponding Python launcher.

## PyPI

```sh
python -m pip install build twine
python -m unittest discover -s tests/python
python -m build
python -m twine check --strict dist/*
```

Configure a [PyPI Trusted Publisher](https://docs.pypi.org/trusted-publishers/creating-a-project-through-oidc/) for project `polarion-alm-mcp`, owner `phillipboesger`, repository `polarion-mcp`, workflow `pypi-publish.yml`, environment `pypi`. Use a pending publisher for the first release, or add it to the existing project after an initial token upload. Tagged releases publish automatically; the workflow can also be dispatched on `main`. PyPI release files cannot be overwritten.

## Official MCP Registry

Version 1.5.0 is published. After publishing a new npm release and container image, use the [official publisher](https://github.com/modelcontextprotocol/registry):

```sh
mcp-publisher login github
mcp-publisher publish server.json
```

The registry description must be at most 100 characters. OCI package identifiers contain the image tag and have no separate `version` field.

## Directories and connector listings

Checked 2026-11-13. A customer-hosted server is not a shared public endpoint. Review times and any requirements not stated in the linked sources are unspecified here.

| Directory | Path | Requirement | Fit | Status |
| --- | --- | --- | --- | --- |
| [Official MCP Registry](https://modelcontextprotocol.io/registry/quickstart) | Publish `server.json` with `mcp-publisher` | Verify namespace ownership and publish a package or remote endpoint; no hosted endpoint needed for packages. | Fit | [Published, active](https://registry.modelcontextprotocol.io/v0/servers?search=phillipboesger) |
| [Glama](https://glama.ai/mcp/servers/phillipboesger/polarion-mcp) | Repository indexing | Public repository; `glama.json` identifies maintainers. | Fit | Listed |
| [Smithery](https://smithery.ai/future) | Curated public directory | Current announcement describes verified servers with direct MCP URLs; submission criteria and review time are not stated. | Needs hosted endpoint for the described direct URL | Not submitted |
| [PulseMCP](https://www.pulsemcp.com/submit) | Submission page | Submission page returned HTTP 403 during research; requirements and review time could not be verified. | Fit unverified | Not submitted |
| [Claude remote connectors](https://claude.com/docs/connectors/building/submission) | Submit through developer portal; customer-specific URLs supported | Reachable HTTPS, OAuth for authenticated services, icon, privacy policy, documentation and reviewer access. | Needs hosted endpoint for review | Not submitted |
| [Claude desktop extensions](https://claude.com/docs/connectors/building/submission) | Submit a [plugin from a GitHub repository](https://claude.com/docs/plugins/submit); direct desktop extension listings deprecated | Local distribution supports `.mcpb`, but the directory no longer accepts MCPB listings. Directory policy requires a privacy policy for software connecting to a remote service. | Fit for local distribution; plugin needed for listing | Not submitted |
| [ChatGPT remote plugins](https://developers.openai.com/plugins/deploy/submission) | Upload plugin ZIP and submit for review | Public HTTPS endpoint, verified identity and domain, privacy policy and icon; authentication depends on the server. | Needs hosted endpoint | Not submitted |
| [ChatGPT desktop-only plugins](https://developers.openai.com/plugins/deploy/desktop-only) | Upload plugin ZIP and submit for review | Local stdio submissions require approved partner allowlisting and identity verification; MCP review requires privacy policy and listing icon. | Fit if approved | Not submitted |

Smithery's current announcement says its proxy, accounts, CLI and SDKs have stopped. It does not establish that `smithery.yaml` applies to this local stdio or container distribution, so this repository does not add one.

## Other directory listings

Existing public listings:

- [Glama](https://glama.ai/mcp/servers/phillipboesger/polarion-mcp) — `glama.json` identifies the maintainer; Glama controls index refreshes.
- [MCP Repository](https://mcprepository.com/phillipboesger/polarion-mcp).
- [AgentRank](https://agentrank-ai.com/tool/phillipboesger--polarion-mcp/).

The official registry supplies metadata to downstream directories. Additional directory submissions may require an owner login; listing and indexing are controlled by those services.

## Google discovery

The landing page includes a canonical HTTPS URL, descriptive title and description, social preview metadata, and SoftwareSourceCode structured data. `robots.txt` allows crawling and links the sitemap, which lists the canonical HTML page.

Verify the domain in [Google Search Console](https://search.google.com/search-console), submit `https://polarion-mcp.boesger.com/sitemap.xml`, and request indexing of the homepage. Search Console requires the owner's Google account and possibly DNS access. Monitor impressions and queries there; metadata and directory entries do not guarantee a particular Google position.
