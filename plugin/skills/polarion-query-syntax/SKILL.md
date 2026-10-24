---
name: polarion-query-syntax
description: Build and refine Lucene queries for Polarion Work Item searches.
---

# Polarion query syntax

Use the `query` argument of `getWorkItems` for a project and `getAllWorkItems` for cross-project searches.

## Patterns

- Exact field value: `type:requirement AND status:open`
- Several values: `status:(open OR inprogress)`
- Exclusion: `type:defect AND NOT status:closed`
- Phrase and wildcard: `title:"brake pedal"` or `title:brake*`
- Date interval: `created:[20240101 TO 20241231]`
- Custom field: `safetyLevel:critical`

Field names and enum values are Polarion IDs. Check field metadata with `getProjectFieldsMetadata`; check allowed enum IDs with `getAvailableEnumOptionsForWorkItemType`. Do not assume a label is the stored ID.

Escape Lucene reserved characters when they are part of a literal value: `+ - && || ! ( ) { } [ ] ^ " ~ * ? : \\ /`. Prefer quoting a phrase, and escape embedded quotes and backslashes. Avoid leading wildcards on large projects.

Example: `type:requirement AND status:(open OR inprogress) AND title:"brake pedal"`.
