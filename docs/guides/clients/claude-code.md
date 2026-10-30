# Connect Claude Code

Claude in your terminal. Default: **Local**.

Verification status:

- Local: verified by documentation only
- Server: verified by documentation only

## Prerequisites

### Local

- [Local (npm / npx) guide](../local-npm.md): start here if you have not set it up yet.
- Claude Code installed and signed in
- Node.js 22+

### Server

- [Server (Docker) guide](../server-docker.md): start here if you have not set it up yet.
- Claude Code installed and signed in
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

1. Open a terminal in a project directory. Run the command outside a claude session.
2. Replace YOUR-POLARION and YOUR_POLARION_PAT in the command below, then run it. Options go before the server name; everything after -- is the server command.
3. Run claude mcp list. Wait a moment and run it again if polarion shows Failed to connect while npx downloads the package; it should show Connected.
4. Run claude and type /mcp to confirm polarion is connected.

```bash
claude mcp add --env API_BASE_URL=https://YOUR-POLARION/polarion/rest/v1 --env BEARER_TOKEN=YOUR_POLARION_PAT --transport stdio polarion -- npx -y polarion-mcp
```

The default scope is local: private to you and active only in the project where you ran the command (stored in ~/.claude.json). Add --scope user before the name to use it in all projects. Servers already in Claude Desktop can be copied with claude mcp add-from-claude-desktop (macOS and WSL).

### Server

1. Open a terminal in a project directory. Run the command outside a claude session.
2. Replace YOUR-SERVER and YOUR_POLARION_PAT in the command below, then run it.
3. Run claude mcp list and check that polarion shows Connected.
4. Run claude and type /mcp to see the status of polarion.

```bash
claude mcp add --transport http polarion https://YOUR-SERVER/mcp --header "Authorization: Bearer YOUR_POLARION_PAT"
```

Remote MCP uses per-user PATs. The client must be able to reach this URL. The default scope is local (this project only); add --scope user before the name for all projects. If you add the same server as a connector in claude.ai and sign in to Claude Code with that account, it also appears in /mcp, but a server added with claude mcp add takes precedence.

## Check

### Local

Ask your assistant: `Which Polarion user am I? Use getCurrentUser.`

Expected: Claude shows your Polarion user. /mcp shows polarion as connected.

### Server

Ask your assistant: `Which Polarion user am I? Use getCurrentUser.`

Expected: Claude shows your Polarion user. /mcp shows polarion as connected.

## If it fails

### Local

| Symptom | Fix |
|---|---|
| claude command not found | Claude Code is not installed or the terminal was not reopened after installing. |
| /mcp shows No MCP servers configured | Local-scope servers belong to the project where you added them. Start claude in that project, or re-add with --scope user. Claude Code reads only ~/.claude.json and <project>/.mcp.json. |
| /mcp or claude mcp list shows polarion as failed | Run claude mcp get polarion and check the command shown matches what you ran (a missing -- before npx changes it). Run the command in a terminal to see the error, check node --version (22+) and that API_BASE_URL ends in /polarion/rest/v1. |
| Connection timed out at startup | The first npx run can take longer than the 30 second startup limit. Start with MCP_TIMEOUT=60000 claude (PowerShell: $env:MCP_TIMEOUT = "60000"; claude). |
| Server polarion already exists | Run claude mcp remove polarion (add --scope local or user if it exists in several scopes), then add it again. |
| Server connects but no tools appear | Select polarion in /mcp to see its tools. An empty list usually means a missing variable: check that both --env values were passed. |
| 401 "Polarion did not accept this token" | The PAT was cut off, has expired or is for another Polarion. Create a new token and paste it unchanged. |

### Server

| Symptom | Fix |
|---|---|
| claude command not found | Claude Code is not installed or the terminal was not reopened after installing. |
| /mcp shows No MCP servers configured | Local-scope servers belong to the project where you added them. Start claude in that project, or re-add with --scope user. |
| /mcp or claude mcp list shows polarion as failed | Run claude mcp get polarion for the HTTP status or error. Check the URL from your machine with curl -I https://YOUR-SERVER/mcp (PowerShell: curl.exe). 404 or 405 means the server is up; 401 or 403 means the PAT is missing or rejected. Look for whitespace warnings in claude mcp list after pasting the token. |
| MCP endpoint not found at <origin> | The server answered 404. Run claude mcp get polarion to see the full URL, compare the path with /mcp, then remove and re-add with the right URL. |
| Connection timed out at startup | Start with a higher MCP_TIMEOUT in milliseconds, for example MCP_TIMEOUT=60000 claude (PowerShell: $env:MCP_TIMEOUT = "60000"; claude). |
| Server polarion already exists | Run claude mcp remove polarion (add --scope local or user if it exists in several scopes), then add it again. |
| 401 "Polarion did not accept this token" | The PAT was cut off, has expired or is for another Polarion. Create a new token and paste it unchanged. |

## Sources

Checked against the vendor documentation on 2026-10-30.

- [Official documentation 1](https://code.claude.com/docs/en/mcp)
- [Official documentation 2](https://code.claude.com/docs/en/mcp-quickstart)
- [Official documentation 3](https://claude.com/docs/connectors/building/authentication.md)

Not confirmed in the vendor documentation:

- Windows native npx wrapper (cmd /c): not found in the Claude Code MCP page or the MCP quickstart; not included.
- Whether a running Claude Code session picks up a server added with claude mcp add from another terminal: the quickstart says to run the command outside a session and use /mcp to check or reconnect; nothing documents hot-adding. .mcp.json is documented as read at session start.
- Behaviour of http://localhost for the --transport http flag is not documented by the vendor (works as a plain URL; curl -I is the documented reachability check).

Back to the [client index](../../clients.md).
