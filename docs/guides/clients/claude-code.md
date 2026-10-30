# Connect Claude Code

Claude in your terminal. Default: **Local**.

## Prerequisites

### Local

- [Local (npm / npx) guide](../local-npm.md): start here if you have not set it up yet.
- Claude Code installed
- Node.js 22+

### Server

- [Server (Docker) guide](../server-docker.md): start here if you have not set it up yet.
- Claude Code installed
- Server address from your administrator

Server example (Docker team server):

```bash
docker run -d --name polarion-mcp \
  -p 127.0.0.1:3000:3000 \
  -e API_BASE_URL=https://polarion.company.example/polarion/rest/v1 \
  -e MCP_ALLOWED_HOSTS=localhost:3000,127.0.0.1:3000 \
  ghcr.io/phillipboesger/polarion-mcp:1.4.5
```

The image starts Streamable HTTP at http://localhost:3000/mcp. Each caller sends their own Polarion PAT. For team access, proxy HTTPS to the loopback port, forward the public Host, and add your public hostname to MCP_ALLOWED_HOSTS. Cloud connectors also need OAuth; their Docker choice includes that configuration.

## Steps

### Local

1. Open a terminal.
2. Replace YOUR-POLARION and YOUR_POLARION_PAT in the command below, then run it.
3. Run claude and type /mcp to confirm polarion is connected.

```bash
claude mcp add --env API_BASE_URL=https://YOUR-POLARION/polarion/rest/v1 --env BEARER_TOKEN=YOUR_POLARION_PAT --transport stdio polarion -- npx -y polarion-mcp
```

Commands shown for macOS, Linux and WSL. Install the selected client and Node.js 22+. Replace the URL and PAT before running; the command stores them in your local client configuration.

### Server

1. Open a terminal.
2. Replace YOUR-SERVER and YOUR_POLARION_PAT in the command below, then run it.
3. Run claude and type /mcp to see the status of polarion.

```bash
claude mcp add --transport http polarion https://YOUR-SERVER/mcp --header "Authorization: Bearer YOUR_POLARION_PAT"
```

Remote MCP uses per-user PATs. The client must be able to reach this URL.

## Check

### Local

Ask your assistant: `Which Polarion user am I? Use getCurrentUser.`

Expected: Claude lists your projects. /mcp shows polarion as connected.

### Server

Ask your assistant: `Which Polarion user am I? Use getCurrentUser.`

Expected: Claude lists your projects. /mcp shows polarion as connected.

## If it fails

### Local

| Symptom | Fix |
|---|---|
| claude command not found | Claude Code is not installed or the terminal was not reopened after installing. |
| /mcp shows polarion as failed | Run claude mcp get polarion. Check node --version (22+) and that API_BASE_URL ends in /polarion/rest/v1. |

### Server

| Symptom | Fix |
|---|---|
| claude command not found | Claude Code is not installed or the terminal was not reopened after installing. |
| /mcp shows polarion as failed | Run claude mcp get polarion. Check the URL opens from your machine and the PAT is valid. |

## Sources

Checked against the vendor documentation on 2026-10-24.

- [Official documentation](https://code.claude.com/docs/en/mcp)

Not confirmed in the vendor documentation:

- Windows native npx wrapper (cmd /c) not found in the first 100k characters of the Claude Code MCP page; not included.
- Whether a running Claude Code session picks up a newly added server without restart: docs only say to check /mcp. Steps tell the person to start claude after adding.
- Behaviour of http://localhost for the --transport http flag was not verified in vendor docs (works as a plain URL).

Back to the [client index](../../clients.md).
