# Connect Gemini CLI

Gemini in your terminal. Default: **Local**.

Run Gemini in a trusted folder. If the server shows Disconnected, use gemini trust to trust that folder.

## Prerequisites

### Local

- [Local (npm / npx) guide](../local-npm.md): start here if you have not set it up yet.
- Gemini CLI signed in or with an API key
- Node.js 22+, and a folder you trust

### Server

- [Server (Docker) guide](../server-docker.md): start here if you have not set it up yet.
- Gemini CLI signed in or with an API key
- A folder you trust to run it in

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

1. Replace YOUR-POLARION and YOUR_POLARION_PAT in the command below
2. Run the command; it saves to ~/.gemini/settings.json
3. Run gemini trust in your project folder if it is not trusted yet
4. Run gemini mcp list; polarion must end with Connected
5. Start gemini and type /mcp; polarion must show CONNECTED

```bash
gemini mcp add --scope user --env API_BASE_URL=https://YOUR-POLARION/polarion/rest/v1 --env BEARER_TOKEN=YOUR_POLARION_PAT polarion npx -y polarion-mcp
```

Run Gemini in a trusted folder. If the server shows Disconnected, use gemini trust.

### Server

1. Replace YOUR-SERVER and YOUR_POLARION_PAT in the command below
2. Run the command; it saves to ~/.gemini/settings.json
3. Run gemini mcp list; polarion must end with Connected
4. Start gemini and type /mcp; polarion must show CONNECTED

```bash
gemini mcp add --scope user --transport http --header "Authorization: Bearer YOUR_POLARION_PAT" polarion https://YOUR-SERVER/mcp
```

Remote MCP uses per-user PATs. The client must be able to reach this URL.

## Check

### Local

Ask your assistant: `Which Polarion user am I? Use getCurrentUser.`

Expected: The assistant calls a Polarion tool and lists project names.

### Server

Ask your assistant: `Which Polarion user am I? Use getCurrentUser.`

Expected: The assistant calls a Polarion tool and lists project names.

## If it fails

### Local

| Symptom | Fix |
|---|---|
| polarion shows Disconnected | For a local (npx) server the folder must be trusted: run gemini trust there and start Gemini again. |
| Server added but does not start | Edit ~/.gemini/settings.json: add polarion under mcpServers (npx, args ["-y","polarion-mcp"], env vars). |

### Server

| Symptom | Fix |
|---|---|
| polarion shows Disconnected | Check the address and PAT. Open the /mcp address in a browser to check it is reachable. |
| 401 or 'Polarion did not accept this token' | PAT is wrong, expired or revoked. Create a new PAT in Polarion and paste it again. |

## Sources

Checked against the vendor documentation on 2026-10-24.

- [Official documentation](https://geminicli.com/docs/tools/mcp-server/)

Not confirmed in the vendor documentation:

- Gemini CLI's own docs say it was replaced by Antigravity CLI on 2026-06-18 for no-cost-tier and Google One users. Third-party sources (not Google) say Code Assist Standard/Enterprise licences and API-key users can keep using Gemini CLI. Antigravity CLI config location (~/.gemini/antigravity-cli/mcp_config.json vs ~/.antigravity/) is reported inconsistently, so it is NOT covered.
- Docs show 'gemini mcp add [options] <name> <commandOrUrl> [args...]' but do not say whether a trailing '-y' is parsed as an option. The command is taken from the repo and not run here.
- The docs do not document the exact message gemini prints after mcp add.
- Docs example for settings.json uses key httpUrl for Streamable HTTP and headers for Authorization; this matches what gemini mcp add --transport http writes, but the written file was not inspected.

Back to the [client index](../../clients.md).
