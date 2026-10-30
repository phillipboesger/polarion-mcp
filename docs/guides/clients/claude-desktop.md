# Connect Claude Desktop

Claude app on your computer. Default: **Local**.

Verification status:

- Local: verified by documentation only
- Server: verified by documentation only

Local servers go through claude_desktop_config.json; remote servers use Customize > Connectors. Both work in Claude Desktop.

## Prerequisites

### Local

- [Local (npm / npx) guide](../local-npm.md): start here if you have not set it up yet.
- Claude Desktop (latest version), signed in
- Node.js 22+ (node --version works in a terminal)

### Server

- [Server (Docker) guide](../server-docker.md): start here if you have not set it up yet.
- Claude plan: remote custom connectors work on Free (one custom connector), Pro, Max, Team and Enterprise
- Public HTTPS server address with OAuth (hostname with a public IPv4 A record, no redirect to another host)

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
  ghcr.io/phillipboesger/polarion-mcp:1.4.5
```

Put a TLS reverse proxy at https://YOUR-SERVER in front of 127.0.0.1:3000 and forward the public Host. TRUST_PROXY=1 assumes exactly one trusted proxy hop; adjust it to your network. Generate a stable secret of at least 32 characters. The claude redirect preset allows the claude.ai callback used by Claude web and Desktop connectors.

## Steps

### Local

1. Update Claude Desktop first (Claude menu > Check for Updates...) and check node --version in a terminal.
2. Open the Claude menu in the system menu bar (not the settings inside the Claude window), then Settings... > Developer.
3. Click Edit Config. This creates claude_desktop_config.json if it does not exist: macOS ~/Library/Application Support/Claude/claude_desktop_config.json, Windows %APPDATA%\Claude\claude_desktop_config.json.
4. Add the polarion entry inside mcpServers, or paste the whole snippet.
5. Replace YOUR-POLARION and YOUR_POLARION_PAT, then save the file.
6. Quit Claude Desktop completely and start it again.
7. In a new chat, click the + indicator (Add files, connectors, and more) in the input box, move over Connectors and check that polarion is listed under Manage connectors.

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

Local servers run with your user permissions and use your local network. They work only in Claude Desktop, not in claude.ai or Cowork, and Advanced research cannot call their tools. Claude asks for approval before each tool call.

### Server

1. Get the server address (https://YOUR-SERVER/mcp) from your administrator.
2. Go to Customize > Connectors (in Claude Desktop you can also reach it via the + indicator in the input box, Connectors > Manage connectors). On Free choose Add custom connector; on Pro/Max click + Add > Add custom connector. On Team/Enterprise only an Owner can add it (see the note below).
3. Enter name Polarion and server URL https://YOUR-SERVER/mcp, click Continue. If the dialog is a single screen, leave Advanced settings empty.
4. Review the detected authentication settings. Set Authentication to Sign in now and OAuth client to Register automatically, leave Request headers empty, then click Add.
5. Click Connect and enter your Polarion PAT on the server login page.
6. In a chat, click + > Connectors and switch the Polarion toggle on.

```
https://YOUR-SERVER/mcp
```

Anthropic connects from its cloud: use a public HTTPS server with OAuth. The Developer JSON file is for local stdio only. A tool call times out after 240 seconds and results over about 150,000 characters are cut off. Authentication settings cannot be edited later: remove the connector and add it again.

Team: only Owners and Primary Owners can add connectors; Enterprise: Owners, Primary Owners and custom roles with "Manage access to Libraries". They go to Organization settings > Connectors, click Add, hover Custom, select Web (if asked), enter name and URL, review the detected authentication settings (Authentication: Sign in now, OAuth client: Register automatically), then click Add. Members then open Customize > Connectors, find the connector (labeled Custom) and click Connect with their own PAT. The Request headers option (beta, limited organizations) stores one shared credential for everyone and does not fit per-user PATs.

## Check

### Local

Ask your assistant: `Which Polarion user am I? Use getCurrentUser.`

Expected: Claude calls a Polarion tool and shows your Polarion user.

### Server

Ask your assistant: `Which Polarion user am I? Use getCurrentUser.`

Expected: Claude calls a Polarion tool and shows your Polarion user.

## If it fails

### Local

| Symptom | Fix |
|---|---|
| polarion missing after restart | Check the JSON for typos and that paths in the file are absolute. Quit Claude Desktop fully, not just close the window, and reopen. Then read the logs: macOS ~/Library/Logs/Claude, Windows %APPDATA%\Claude\logs (mcp.log for connections, mcp-server-polarion.log for the server's stderr). |
| Server fails to start (npx not found) | Run node --version and npx -y polarion-mcp in a terminal. Node.js must be 22 or newer. On Windows, if the server log mentions ${APPDATA} or ENOENT, add "APPDATA": "C:\\Users\\YOU\\AppData\\Roaming\\" to the env block; if npx keeps failing, run npm install -g npm. |
| Tool calls fail silently | Read mcp-server-polarion.log in the log folder above, check API_BASE_URL and the PAT, then restart Claude Desktop. |
| 401 "Polarion did not accept this token" | The PAT was cut off, has expired or is for another Polarion. Create a new token and paste it unchanged. |

### Server

| Symptom | Fix |
|---|---|
| "Couldn't reach the MCP server" or sign-in does not open | Claude connects from Anthropic's cloud, not from your device. The hostname must resolve from the public internet to a globally routable IPv4 address (an A record; private 10.x/172.16-31.x/192.168.x, 100.64.0.0/10, loopback or AAAA-only names are rejected). VPN, split-horizon DNS and firewalled servers fail; allow Anthropic's outbound range 160.79.104.0/21 in the firewall or WAF (look for 403 or 429 in edge logs). Enterprise organizations in a private network can request MCP tunnels (research preview). |
| "Authorization with the MCP server failed" | Register the exact URL the server listens on: if https://YOUR-SERVER/mcp redirects (301, 302, 307, 308) to another host, Claude drops the Authorization header and the sign-in fails. If the error page URL shows a flow_id starting with ofid_, note it for a support report. |
| Sign-in ends with a redirect_uri error | The administrator must set MCP_ALLOWED_REDIRECT_PRESETS=claude on the server. |
| 401 "Polarion did not accept this token" | The PAT was cut off, has expired or is for another Polarion. Create a new token and paste it unchanged. |
| Connector shows Connect or Reconnect instead of Connected | Sign-in did not finish. Click it and sign in again. Authentication settings cannot be edited after adding: remove the connector and add it again, then reconnect. |

## Sources

Checked against the vendor documentation on 2026-10-30.

- [Official documentation 1](https://modelcontextprotocol.io/docs/develop/connect-local-servers)
- [Official documentation 2](https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp)
- [Official documentation 3](https://claude.com/docs/connectors/custom/add-unlisted.md)
- [Official documentation 4](https://claude.com/docs/connectors/building/authentication.md)
- [Official documentation 5](https://claude.com/docs/connectors/building/troubleshooting.md)
- [Official documentation 6](https://claude.com/docs/connectors/building/testing.md)
- [Official documentation 7](https://claude.com/docs/connectors/mcp-tunnels/overview)

Not confirmed in the vendor documentation:

- Linux path of claude_desktop_config.json: the vendor pages read document only macOS and Windows paths. The MCP guide says Claude Desktop is available for macOS, Windows and Linux but gives no Linux config or log path, so none is listed.
- Vendor describes the custom connector dialog as varying by organization (one screen with Advanced settings, or two steps); the exact labels shown in Claude Desktop were not checked on a real install.
- Whether the server supports Claude's published identity (Client ID Metadata Document) is not stated by the vendor for this server; the guide uses Register automatically.

Back to the [client index](../../clients.md).
