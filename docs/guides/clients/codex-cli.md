# Connect Codex

OpenAI Codex in your terminal. Default: **Local**.

Official documentation: [learn.chatgpt.com](https://learn.chatgpt.com/docs/extend/mcp?surface=cli), [learn.chatgpt.com](https://learn.chatgpt.com/docs/extend/mcp?surface=ide), [learn.chatgpt.com](https://learn.chatgpt.com/docs/cli/reference)

Verification status:

- Local: verified by documentation only
- Server: verified by documentation only

## Prerequisites

### Local

- [Local (npm / npx) guide](../local-npm.md): start here if you have not set it up yet.
- Codex (CLI, IDE extension or desktop app)
- Node.js 22+

### Server

- [Server (Docker) guide](../server-docker.md): start here if you have not set it up yet.
- Codex (CLI, IDE extension or desktop app)

Server example (Docker team server):

```bash
docker run -d --name polarion-mcp \
  -p 127.0.0.1:3000:3000 \
  -e API_BASE_URL=https://polarion.company.example/polarion/rest/v1 \
  -e MCP_ALLOWED_HOSTS=localhost:3000,127.0.0.1:3000 \
  ghcr.io/phillipboesger/polarion-mcp:1.5.0
```

The image starts Streamable HTTP at http://localhost:3000/mcp. Each caller sends their own Polarion PAT. For team access, proxy HTTPS to the loopback port, forward the public Host, and add your public hostname to MCP_ALLOWED_HOSTS. Cloud connectors also need OAuth; their Docker choice includes that configuration.

## Steps

### Local

1. Replace YOUR-POLARION (URL ends in /polarion/rest/v1) and YOUR_POLARION_PAT
2. Run the command below; it writes ~/.codex/config.toml (shared by the CLI, the IDE extension and the desktop app). Alternatively use the desktop app (Settings, MCP servers, Add server, STDIO) or the IDE extension (gear menu, MCP servers, Add server, STDIO), then Save and select Restart or Restart extension.
3. Run codex mcp list (or codex mcp get polarion) to check it was saved
4. Start Codex and type /mcp; polarion must be listed

```bash
codex mcp add polarion --env API_BASE_URL=https://YOUR-POLARION/polarion/rest/v1 --env BEARER_TOKEN=YOUR_POLARION_PAT -- npx -y polarion-mcp

# Alternative: ~/.codex/config.toml
[mcp_servers.polarion]
command = "npx"
args = ["-y", "polarion-mcp"]
startup_timeout_sec = 30

[mcp_servers.polarion.env]
API_BASE_URL = "https://YOUR-POLARION/polarion/rest/v1"
BEARER_TOKEN = "YOUR_POLARION_PAT"
```

Codex reads ~/.codex/config.toml; a project-scoped .codex/config.toml only applies to trusted projects, so put this server in the user file to use it everywhere. The default startup_timeout_sec is 10 and tool_timeout_sec is 60; set required = true to make Codex fail at startup if the server cannot initialize, and enabled = false to switch it off without deleting it. Remove it with codex mcp remove polarion.

### Server

1. Run: export POLARION_PAT=YOUR_POLARION_PAT (PowerShell: $env:POLARION_PAT="...")
2. Run the codex mcp add command below (replace YOUR-SERVER). It registers a streamable HTTP server; --url cannot be combined with a command.
3. Run codex mcp list (or codex mcp get polarion) to check it was saved
4. Start Codex from that same terminal and type /mcp
5. The desktop app and IDE extension can add a Streamable HTTP server under MCP servers, Add server; for the PAT use the TOML key bearer_token_env_var.

```bash
export POLARION_PAT=YOUR_POLARION_PAT
codex mcp add polarion --url https://YOUR-SERVER/mcp --bearer-token-env-var POLARION_PAT

# Alternative: ~/.codex/config.toml
[mcp_servers.polarion]
url = "https://YOUR-SERVER/mcp"
bearer_token_env_var = "POLARION_PAT"
```

The PAT is read from POLARION_PAT at runtime. Keep it in a private environment. Codex defaults to auth = "oauth" for HTTP servers; this server uses the PAT, so do not run codex mcp login. If no credential source resolves, Codex may connect without authentication. The config is shared by CLI, IDE extension and desktop app; a project .codex/config.toml only applies to trusted projects. Defaults: startup_timeout_sec 10, tool_timeout_sec 60.

## Check

### Local

Ask your assistant: `Which Polarion user am I? Use getCurrentUser.`

Expected: Codex asks to call getCurrentUser; approve it. It shows your Polarion user, and /mcp shows polarion enabled.

### Server

Ask your assistant: `Which Polarion user am I? Use getCurrentUser.`

Expected: Codex asks to call getCurrentUser; approve it. It shows your Polarion user, and /mcp shows polarion enabled.

## If it fails

### Local

| Symptom | Fix |
|---|---|
| polarion shows a startup timeout | The default startup_timeout_sec is 10. Set startup_timeout_sec = 30 under [mcp_servers.polarion], or run npx -y polarion-mcp once beforehand. |
| Server missing in /mcp after adding | Restart Codex. In the IDE select "Restart extension"; in the desktop app select Restart after saving. Run codex mcp list to confirm the entry exists. |
| Server added in a project but missing elsewhere | A project .codex/config.toml only applies to trusted projects. Add the server to ~/.codex/config.toml instead. |
| 401 "Polarion did not accept this token" | The PAT was cut off, has expired or is for another Polarion. Create a new token and paste it unchanged. |

### Server

| Symptom | Fix |
|---|---|
| 401 from the server | POLARION_PAT is not set in the environment that started Codex, so Codex may connect without authentication. Export it and restart Codex. |
| Server missing after adding | Restart Codex, or use Restart extension (IDE) or Restart (desktop app). Run codex mcp list to confirm the entry exists. |
| Server added in a project but missing elsewhere | A project .codex/config.toml only applies to trusted projects. Add the server to ~/.codex/config.toml instead. |

## Sources

Checked against the vendor documentation on 2026-10-30.

- [Official documentation 1](https://learn.chatgpt.com/docs/extend/mcp?surface=cli)
- [Official documentation 2](https://learn.chatgpt.com/docs/extend/mcp?surface=ide)
- [Official documentation 3](https://learn.chatgpt.com/docs/cli/reference)
- [Official documentation 4](https://github.com/openai/codex/blob/f752c97f7d0be0cbef5cece327f52a16ad6fb1c6/codex-rs/cli/src/mcp_cmd.rs)

Not confirmed in the vendor documentation:

- Windows path of config.toml: the Codex source resolves $CODEX_HOME, else <home>/.codex (https://github.com/openai/codex/blob/f752c97f7d0be0cbef5cece327f52a16ad6fb1c6/codex-rs/utils/home-dir/src/lib.rs). %USERPROFILE%\.codex\config.toml follows from how the dirs crate resolves the home folder, which is not shown in that repository.
- Codex reads the bearer_token_env_var variable from the environment of the process that hosts the MCP client and fails if it is unset or empty (source: codex-rs/codex-mcp/src/rmcp_client.rs). Which environment the IDE extension or desktop app gives that process is not documented.
- Whether the desktop app or IDE form can set a bearer token env var: the pages list name, STDIO or Streamable HTTP, and command or URL only.
- Whether a plain CLI session picks up a server added with codex mcp add without a new session: the command only writes the global config; only the app-server has a reload path for running threads.

Back to the [client index](../../clients.md).
