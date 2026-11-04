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

## Directory listings

Existing public listings:

- [Glama](https://glama.ai/mcp/servers/phillipboesger/polarion-mcp) — `glama.json` identifies the maintainer; Glama controls index refreshes.
- [MCP Repository](https://mcprepository.com/phillipboesger/polarion-mcp).
- [AgentRank](https://agentrank-ai.com/tool/phillipboesger--polarion-mcp/).

The official registry supplies metadata to downstream directories. Additional directory submissions may require an owner login; listing and indexing are controlled by those services.

## Google discovery

The landing page includes a canonical HTTPS URL, descriptive title and description, social preview metadata, and SoftwareSourceCode structured data. `robots.txt` allows crawling and links the sitemap, which lists the canonical HTML page.

Verify the domain in [Google Search Console](https://search.google.com/search-console), submit `https://polarion-mcp.boesger.com/sitemap.xml`, and request indexing of the homepage. Search Console requires the owner's Google account and possibly DNS access. Monitor impressions and queries there; metadata and directory entries do not guarantee a particular Google position.
