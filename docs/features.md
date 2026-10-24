# Features

## Core capabilities

- 284 generated Polarion REST tools from the committed OpenAPI-derived map.
- MCP over stdio and Streamable HTTP, plus an optional REST HTTP wrapper.
- Runtime input validation, OpenAPI authentication schemes, and output schemas where the operation defines a JSON response.
- Tool filtering by name and read-only status; HTTP MCP also supports named toolsets.
- Response text cap controlled by `MCP_MAX_RESPONSE_CHARS` (default 100,000 characters). Structured response content is not truncated.

## Polarion-specific behavior

- MCP instructions, offline guides, and prompts for common Work Item tasks.
- Fail-closed write guards for supported enumeration values, custom-field keys, and Work Item user references.
- Mutating tools support `dry_run` request previews.
- HTML rich-text response values gain a `value_markdown` sibling. The original value is preserved.
- Optional local PDF text resources can be enabled by providing the files listed in [sdk/README.md](../sdk/README.md).
- The Custom GPT OpenAPI document uses a curated tool subset in `src/gpt-tools.ts`.

## Limits

- Polarion remains the source of truth for permissions and data.
- Runtime caches are in-memory and are not durable storage.
- Guards cover only the validations described above; they do not validate arbitrary field values or every relationship type.
- Local SDK PDFs are optional and are not included in the repository.
