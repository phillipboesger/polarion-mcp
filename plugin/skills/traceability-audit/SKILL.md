---
name: traceability-audit
description: Audit Polarion Work Item relationships for traceability gaps.
---

# Traceability audit

Use `getWorkItem` to confirm each item and `getLinkedWorkItems` to inspect its links. Use `getWorkItems` with a stated Lucene query to identify the audit population.

Checklist:

- Each requirement has an appropriate source, parent, or rationale link where the project process requires one.
- Each verifiable requirement links to relevant verification Work Items.
- Links point to the intended project and item, and their roles match the relationship.
- No important item is orphaned, linked only through an unrelated item, or connected by a stale or ambiguous relation.
- Report counts, sampled IDs, query, link roles, and evidence. Separate confirmed gaps from possible gaps.

Do not create, remove, or repair links during an audit. Present proposed changes for review first.
