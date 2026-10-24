---
name: requirement-authoring
description: Draft atomic, verifiable Polarion requirements and create them safely.
---

# Requirement authoring

1. Confirm the project with `getProjects` and inspect available Work Item types and fields with `getProjectFieldsMetadata`.
2. Draft one need per requirement. Check INVEST qualities: independent, negotiable, valuable, estimable, small, and testable. Split compound statements.
3. Write observable behavior in EARS form where it fits: “When [trigger], the [system] shall [response]”; include measurable conditions and a verification method.
4. Check each enum field with `getAvailableEnumOptionsForWorkItemType`. Use option IDs, not display labels.
5. Show the draft, then call `postWorkItems` with `dry_run: true`. Resolve validation errors and present the final preview. Only after the user approves, repeat `postWorkItems` without `dry_run`.
