# Connect Claude Desktop

Claude app on your computer. Default: **Local**.

## Prerequisites

### Local

- [Local (npm / npx) guide](../local-npm.md): start here if you have not set it up yet.
- Claude Desktop, signed in
- Node.js 22+ (npx works in a terminal)

### Server

- [Server (Docker) guide](../server-docker.md): start here if you have not set it up yet.
- Claude plan (Free allows one custom connector)
- Public HTTPS server address with OAuth

Server example (HTTPS team server with OAuth):

```bash
docker run -d --name polarion-mcp \
  -p 127.0.0.1:3000:3000 \
  -e API_BASE_URL=https://polarion.company.example/polarion/rest/v1 \
  -e MCP_ALLOWED_HOSTS=YOUR-SERVER \
  -e MCP_PUBLIC_URL=https://YOUR-SERVER \
  -e MCP_TOKEN_SECRET=YOUR_RANDOM_SECRET_AT_LEAST_32_CHARS \
  -e MCP_ALLOWED_REDIRECT_PRESETS=claude \
  -e TRUST_PROXY=1 \
  ghcr.io/phillipboesger/polarion-mcp:1.4.4
```

Put a TLS reverse proxy at https://YOUR-SERVER in front of 127.0.0.1:3000 and forward the public Host. TRUST_PROXY=1 assumes exactly one trusted proxy hop; adjust it to your network. Generate a stable secret of at least 32 characters. The claude redirect preset allows the claude.ai callback used by Claude web and Desktop connectors.

## Steps

### Local

1. Open the Claude menu in the system menu bar, then Settings... > Developer.
2. Click Edit Config to open claude_desktop_config.json.
3. Add the polarion entry inside mcpServers, or paste the whole snippet.
4. Replace YOUR-POLARION and YOUR_POLARION_PAT, then save the file.
5. Quit Claude Desktop completely and start it again.
6. In a new chat, check that polarion is listed under Connectors.

```json
{
  "mcpServers": {
    "polarion": {
      "command": "npx",
      "args": ["-y", "polarion-mcp"],
      "env": {
        "API_BASE_URL": "https://YOUR-POLARION/polarion/rest/v1",
        "BEARER_TOKEN": "YOUR_POLARION_PAT"
      }
    }
  }
}
```

Node.js 22+ runs the published npm package on your computer. Replace the URL and PAT locally; keep credentials out of Git.

### Server

1. Get the server address (https://YOUR-SERVER/mcp) from your administrator.
2. Go to Customize (or Settings) > Connectors, click + Add > Add custom connector.
3. Enter name Polarion and server URL https://YOUR-SERVER/mcp, click Continue.
4. Choose Sign in now and Register automatically, click Continue, then Add.
5. Click Connect and enter your Polarion PAT on the server login page.
6. In a chat, click + > Connectors and switch the Polarion toggle on.

```
https://YOUR-SERVER/mcp
```

Anthropic connects from its cloud: use a public HTTPS server with OAuth. The Developer JSON file is for local stdio.

Team: only Owners and Primary Owners can add connectors; Enterprise: Owners, Primary Owners and custom roles with "Manage access to Libraries". They go to Organization settings > Connectors, click "Add", hover "Custom", select "Web", enter name and URL, then continue as above. Members then open Customize > Connectors, find the connector (usually labeled "Custom") and click "Connect".

## Check

### Local

Ask your assistant: `Which Polarion user am I? Use getCurrentUser.`

Expected: Claude calls a Polarion tool and lists your project names.

### Server

Ask your assistant: `Which Polarion user am I? Use getCurrentUser.`

Expected: Claude calls a Polarion tool and lists your project names.

## If it fails

### Local

| Symptom | Fix |
|---|---|
| polarion missing after restart | Check the JSON for typos. Quit Claude Desktop fully, not just close the window, and reopen. |
| Server fails to start (npx not found) | Run node --version and npx -y polarion-mcp in a terminal. Node.js must be 22 or newer. |

### Server

| Symptom | Fix |
|---|---|
| Connecting fails or sign-in does not open | The server must be reachable from the public internet. VPN or firewalled servers fail; behind a firewall, allow Anthropic's outbound range 160.79.104.0/21. |
| Sign-in ends with a redirect_uri error | The administrator must set MCP_ALLOWED_REDIRECT_PRESETS=claude on the server. |

## Sources

Checked against the vendor documentation on 2026-10-24.

- [Official documentation 1](https://modelcontextprotocol.io/docs/develop/connect-local-servers)
- [Official documentation 2](https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp)

Not confirmed in the vendor documentation:

- Exact path to add a remote custom connector inside Claude Desktop: the vendor article states remote connectors work on Claude Desktop but gives only the claude.ai path (Customize > Connectors). Assumed identical; check once on a real install.
- Whether Claude Desktop uses the same callback https://claude.ai/api/mcp/auth_callback (building-connectors article returned 404).
- Linux config path for claude_desktop_config.json is not documented in the sources read.

Back to the [client index](../../clients.md).
