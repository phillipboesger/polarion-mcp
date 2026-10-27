# Connect Codex

OpenAI Codex in your terminal. Default: **Local**.

## Prerequisites

### Local

- [Local (npm / npx) guide](../local-npm.md): start here if you have not set it up yet.
- Codex (CLI or IDE extension)
- Node.js 22+

### Server

- [Server (Docker) guide](../server-docker.md): start here if you have not set it up yet.
- Codex (CLI or IDE extension)

Server example (Docker team server):

```bash
docker run -d --name polarion-mcp \
  -p 127.0.0.1:3000:3000 \
  -e API_BASE_URL=https://polarion.company.example/polarion/rest/v1 \
  -e MCP_ALLOWED_HOSTS=localhost:3000,127.0.0.1:3000 \
  ghcr.io/phillipboesger/polarion-mcp:1.4.3
```

The image starts Streamable HTTP at http://localhost:3000/mcp. Each caller sends their own Polarion PAT. For team access, proxy HTTPS to the loopback port, forward the public Host, and add your public hostname to MCP_ALLOWED_HOSTS. Cloud connectors also need OAuth; their Docker choice includes that configuration.

## Steps

### Local

1. Replace YOUR-POLARION (URL ends in /polarion/rest/v1) and YOUR_POLARION_PAT
2. Run the command below; it writes ~/.codex/config.toml
3. Run codex mcp list to check it was saved
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

Commands shown for macOS, Linux and WSL. Install the selected client and Node.js 22+. Replace the URL and PAT before running; the command stores them in your local client configuration.

### Server

1. Run: export POLARION_PAT=YOUR_POLARION_PAT (PowerShell: $env:POLARION_PAT="...")
2. Run the codex mcp add command below (replace YOUR-SERVER)
3. Run codex mcp list to check it was saved
4. Start Codex from that same terminal and type /mcp

```bash
export POLARION_PAT=YOUR_POLARION_PAT
codex mcp add polarion --url https://YOUR-SERVER/mcp --bearer-token-env-var POLARION_PAT

# Alternative: ~/.codex/config.toml
[mcp_servers.polarion]
url = "https://YOUR-SERVER/mcp"
bearer_token_env_var = "POLARION_PAT"
```

The PAT is read from POLARION_PAT at runtime. Keep it in a private environment.

## Check

### Local

Ask your assistant: `Which Polarion user am I? Use getCurrentUser.`

Expected: Codex asks to call a Polarion tool; approve it. /mcp shows polarion enabled.

### Server

Ask your assistant: `Which Polarion user am I? Use getCurrentUser.`

Expected: Codex asks to call a Polarion tool; approve it. /mcp shows polarion enabled.

## If it fails

### Local

| Symptom | Fix |
|---|---|
| polarion shows a startup timeout | Set startup_timeout_sec = 30 under [mcp_servers.polarion], or run npx -y polarion-mcp once beforehand. |
| Server missing in /mcp after adding | Restart Codex. In the IDE select "Restart extension". |

### Server

| Symptom | Fix |
|---|---|
| 401 from the server | POLARION_PAT is not set in the environment that started Codex. Export it and restart Codex. |
| Server missing after adding | Restart Codex or the IDE extension ("Restart extension"). |

## Sources

Checked against the vendor documentation on 2026-10-24.

- [Official documentation 1](https://learn.chatgpt.com/docs/extend/mcp?surface=cli)
- [Official documentation 2](https://learn.chatgpt.com/docs/extend/mcp?surface=ide)
- [Official documentation 3](https://learn.chatgpt.com/docs/cli/reference)

Not confirmed in the vendor documentation:

- Windows path of config.toml: docs say ~/.codex/config.toml; the Windows form (.codex folder in the user profile) is an inference.
- Whether the CLI needs a restart after codex mcp add: not stated; steps tell the person to start a new session.
- How the IDE extension receives POLARION_PAT: inherits from the environment that launched the editor (inference, not documented).
- Where the codex mcp add --bearer-token-env-var flag appears: verified in the CLI reference; the MCP guide only shows --oauth-client-id and the TOML key bearer_token_env_var.

Back to the [client index](../../clients.md).
