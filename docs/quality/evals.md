# Agent tool-selection evals

`evals/cases.json` contains 15 deterministic tasks covering work item search and creation, relationships, document reads, workflow actions, pagination, and read-only behavior. The suite validates case structure and expected tool names offline as part of `npm test`.

Run validation and, when configured, the agent suite:

```sh
npm run build
npm run evals
```

Without `EVALS_ANTHROPIC_API_KEY`, the runner validates cases and prints `agent run skipped`. For an agent run, set `EVALS_ANTHROPIC_API_KEY`, `API_BASE_URL`, and `BEARER_TOKEN` in the shell environment; these values are never stored in the repository. Optionally set `EVALS_MODEL` to choose another compatible Anthropic model. The runner submits tool definitions and asks the model to select tools without executing them against Polarion; scores reflect tool choice.

For meaningful Polarion 2606 fixtures, start a disposable instance using the repository's `polarion-fresh-container` flow, configure a test project, and seed documents and work items with a mix of statuses, types, and enough records to span multiple pages. Use a dedicated test account and locally supplied credentials. Keep fixture data disposable; the runner itself does not mutate Polarion.
