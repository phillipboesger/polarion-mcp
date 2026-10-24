# Polarion MCP plugin

Install this Claude Code plugin from the `plugin/` directory. It starts the published `polarion-mcp` package with `npx` over stdio.

Before launching Claude Code, set `API_BASE_URL` to the Polarion REST v1 base URL and `BEARER_TOKEN` to a Polarion PAT in the environment. Keep the token private and use an account with only the permissions needed for the work. Optional server settings such as `MCP_READ_ONLY=true`, `MCP_MODE=discover`, and `MCP_TOOLSETS` can also be set in the environment.

The plugin includes query syntax, requirement authoring, and traceability audit skills. The server's MCP prompts include requirement review, trace gap analysis, release readiness, test coverage, and new-item triage workflows.
