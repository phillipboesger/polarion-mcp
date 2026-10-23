# Resources and Prompts

## Server instructions

The MCP server supplies instructions describing project discovery, query syntax, paging, sparse fields, composite IDs, JSON:API writes, `dry_run`, and workflow actions. Instructions are provided during initialization to clients that support them.

## Resources

Offline guides served over MCP:

- `polarion://guide/query-syntax`: Lucene query syntax.
- `polarion://guide/writing`: JSON:API bodies for Work Items, links, comments, status changes, and attachments.
- `polarion://guide/paging-and-fields`: paging, sparse fields, and includes.

Optional SDK PDF text resources use the `polarion://local/*` URI family. A resource is listed only if its corresponding PDF exists in `sdk/`. See [sdk/README.md](../sdk/README.md). Resources are MCP capabilities and are not exposed by the REST wrapper.

## Prompts

The server provides three guided prompts:

- `create-work-item`: reads field metadata and enum options, then previews a create request before execution.
- `search-work-items`: builds a Lucene query and pages through results.
- `update-work-item`: reads the item, checks options, previews the update, applies it, and confirms the result.

The prompt templates use the real tools in `src/tools.ts`, including `getProjectFieldsMetadata`, `getAvailableEnumOptionsForWorkItemType`, and `getWorkItem`.
