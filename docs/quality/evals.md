# Agent tool-selection evals

`evals/cases.json` contains 15 deterministic tasks covering work item search and creation, relationships, document reads, workflow actions, pagination, and read-only behavior. The suite validates case structure and expected tool names offline as part of `npm test`.

Run validation and, when configured, the agent suite:

```sh
npm run build
npm run evals
```

Without `EVALS_ANTHROPIC_API_KEY`, the runner validates cases and prints `agent run skipped`. For an agent run, set `EVALS_ANTHROPIC_API_KEY`, `API_BASE_URL`, and `BEARER_TOKEN` in the shell environment; these values are never stored in the repository. Optionally set `EVALS_MODEL` to choose another compatible Anthropic model. The runner submits tool definitions and asks the model to select tools without executing them against Polarion; scores reflect tool choice.

Use a dedicated test account with the [connection settings](../configuration.md); see [live tests](../live-tests.md) for integration checks against a real instance.
