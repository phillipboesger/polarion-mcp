# Resources and Prompts

## Server Instructions

On `initialize` the server sends `instructions`: how to find a projectId, query syntax, paging, sparse fields, composite IDs, the JSON:API write shape, dry_run and workflow actions. Clients that support instructions put them in the model's context.

## Resources

Short offline guides, served from the server itself (no network calls):

- `polarion://guide/query-syntax`: Lucene query syntax for the `query` parameter.
- `polarion://guide/writing`: JSON:API bodies for creating and updating Work Items, links, comments, status changes and attachments.
- `polarion://guide/paging-and-fields`: paging, sparse `fields` and `include`.

Optional local SDK PDFs (`polarion://local/*`) are listed only when the file is present in `sdk/` (see `sdk/README.md`); their text is extracted with pdf-parse and cut at 200,000 characters.

Resources are available only through MCP mode because they are part of the MCP capability model. The HTTP wrapper exposes tool execution and OpenAPI documents, not generic MCP resource reads.

## Prompts

The server provides guided prompts that work with the real tools:

- create-work-item (requires projectId): reads the project's fields and allowed values, previews with dry_run, then creates.
- search-work-items (requires projectId): builds a Lucene query and pages through the results.
- update-work-item (requires projectId and workItemId): shows the item, uses workflow actions for status changes, previews, applies and confirms.

A test checks that every tool and resource named in the instructions, guides and prompts exists.

## read_when

- Use this guide when working with resources, prompts, or server instructions.
