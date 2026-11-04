# Polarion ALM MCP server

Connect Siemens Polarion ALM to your AI assistant using the Model Context Protocol (MCP). Search requirements and defects, read LiveDocs, inspect traceability links, and prepare test cases and test runs.

This is the Python launcher for [phillipboesger/polarion-mcp](https://github.com/phillipboesger/polarion-mcp), an MIT-licensed TypeScript server with 284 generated Polarion REST API tools. Each launcher release runs the **same pinned version** of the npm package. Node.js 22+ and npm/npx must be installed separately. The first launch downloads the server from npm; later launches can use npm's cache.

## Install and run

```sh
pip install polarion-alm-mcp
export API_BASE_URL="https://your-polarion.example/polarion/rest/v1"
export BEARER_TOKEN="your-personal-access-token"
polarion-alm-mcp
```

Or run with `uvx polarion-alm-mcp`. Python 3.10+ and a REST-enabled Polarion instance are required. All configuration variables and stdio messages pass through to the server. Set `MCP_READ_ONLY=1` to block writes; supported writes accept `dry_run: true` to preview requests.

## MCP client configuration

For clients that accept a JSON MCP configuration:

```json
{
  "mcpServers": {
    "polarion": {
      "command": "uvx",
      "args": ["polarion-alm-mcp==1.5.0"],
      "env": {
        "API_BASE_URL": "https://your-polarion.example/polarion/rest/v1",
        "BEARER_TOKEN": "your-personal-access-token",
        "MCP_READ_ONLY": "1"
      }
    }
  }
}
```

Use `polarion-alm-mcp` as the command with no arguments if installed using pip. Configure an absolute executable path when your client does not inherit your shell's PATH.

The PyPI package named `polarion-mcp` is a separate project by another author. This project's Python distribution is **polarion-alm-mcp**, and its npm distribution remains **polarion-mcp**.

- [Setup guides for Claude, Cursor, VS Code and other clients](https://polarion-mcp.boesger.com/#clients)
- [Features and limits](https://github.com/phillipboesger/polarion-mcp/blob/main/docs/features.md)
- [Configuration](https://github.com/phillipboesger/polarion-mcp/blob/main/docs/configuration.md)
- [Issues and source](https://github.com/phillipboesger/polarion-mcp)

MCP server name: `io.github.phillipboesger/polarion-mcp`
