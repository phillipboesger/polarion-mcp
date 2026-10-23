# Distribution and installation

## npm

The package publishes `build/index.js` as the `polarion-mcp` executable. Install it with:

```sh
npx -y polarion-mcp
```

Configure `API_BASE_URL` and `BEARER_TOKEN` in the MCP host's environment. The token is a secret and should not be embedded in a shared install link or checked-in configuration.

Run `npm run check:package` to pack the project, install the tarball in a temporary directory, and send an MCP `initialize` request to its installed executable.

## VS Code and Cursor install links

Generate the links from the current package metadata:

```sh
npm run make:deeplinks
```

The VS Code link uses the `vscode:mcp/install?` handler. The Cursor link uses `cursor://anysphere.cursor-deeplink/mcp/install` and base64-encodes the server configuration. Both links install `polarion-mcp` through `npx -y`. After installation, configure `API_BASE_URL` and `BEARER_TOKEN` in the MCP server configuration or the environment available to the editor. Do not add a real PAT to a deeplink because its configuration is visible in the URL.

## MCP Registry

`server.json` declares both the npm package and the existing OCI image. Its package versions must match `package.json`; `npm test` checks the metadata and required environment variables.

## Claude Desktop Extension

The MCPB manifest is `mcpb/manifest.json`. On a version-tag release, GitHub Actions stages the built server with production dependencies, runs `npx --yes @anthropic-ai/mcpb pack`, and uploads the `.mcpb` file beside the release ZIP. The manifest prompts for the REST API URL and a sensitive PAT.

The release workflow does not publish to npm. Publishing would require configuring an `NPM_TOKEN` and adding an explicitly guarded npm publish step.
