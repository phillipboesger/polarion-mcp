# Resources and Prompts

## Resources

The MCP server exposes documentation and configuration as resources via polarion:// URIs.

Resource categories:

- sdk: SDK HTML documentation.
- docs: Siemens documentation for REST and configuration.
- guides: PDF guides from online sources.
- database: Database schema references.
- local: Local SDK PDFs from sdk/ (Git LFS).
- config: Cached project configuration (see refresh_polarion_config).

Resources are available only through MCP mode because they are part of the MCP capability model. The HTTP wrapper exposes tool execution and OpenAPI documents, not generic MCP resource reads.

## Local SDK Files

Local PDFs are stored in sdk/ and read via pdf-parse. Use git lfs pull to ensure files are present.

## Project Configuration Cache

- refresh_polarion_config fetches and caches configuration per project.
- Cached configs are readable at polarion://config/<projectId>.
- Cached configs improve prompt quality and reduce repeated metadata lookups during a session.

## Prompts

The server provides guided prompts:

- create-work-item (requires projectId)
- search-work-items (requires projectId)
- update-work-item (requires projectId and workItemId)

Prompts are intended to guide an assistant through common Polarion tasks by combining generated API tools with repository-specific instructions.

## read_when

- Use this guide when working with resources, prompts, or project caching.
