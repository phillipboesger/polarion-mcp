# Connect claude.ai

Claude in the browser, connects from the cloud. Default: **Server**.

Verification status:

- Server: verified by documentation only

On Team / Enterprise, an owner adds the connector under Organization settings > Connectors > Add > Custom > Web; members then choose Connect.

- **Local is not supported:** claude.ai connects from Anthropic's cloud, so it cannot start npx.

## Prerequisites

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
  ghcr.io/phillipboesger/polarion-mcp:1.4.5
```

Put a TLS reverse proxy at https://YOUR-SERVER in front of 127.0.0.1:3000 and forward the public Host. TRUST_PROXY=1 assumes exactly one trusted proxy hop; adjust it to your network. Generate a stable secret of at least 32 characters. The claude redirect preset allows the claude.ai callback used by Claude web and Desktop connectors.

## Steps

### Server

1. Get the server address (https://YOUR-SERVER/mcp) from your administrator.
2. Open claude.ai, go to Customize > Connectors, click + Add > Add custom connector.
3. Enter name Polarion and server URL https://YOUR-SERVER/mcp, click Continue.
4. Choose Sign in now and Register automatically, click Continue, then Add.
5. Click Connect and enter your Polarion PAT on the server login page.
6. In a chat, click + > Connectors and switch the Polarion toggle on.

```
https://YOUR-SERVER/mcp
```

On Team / Enterprise, an owner adds the connector under Organization settings > Connectors > Add > Custom > Web.

Team: only Owners and Primary Owners can add connectors; Enterprise: Owners, Primary Owners and custom roles with "Manage access to Libraries". They go to Organization settings > Connectors, click "Add", hover "Custom", select "Web", enter name and URL, then continue as above. Members then open Customize > Connectors, find the connector (usually labeled "Custom") and click "Connect".

## Check

### Server

Ask your assistant: `Which Polarion user am I? Use getCurrentUser.`

Expected: Claude calls a Polarion tool and shows your Polarion user.

## If it fails

### Server

| Symptom | Fix |
|---|---|
| Connecting fails or sign-in does not open | The server must be reachable from the public internet. VPN or firewalled servers fail; behind a firewall, allow Anthropic's outbound range 160.79.104.0/21. |
| Sign-in ends with a redirect_uri error | The administrator must set MCP_ALLOWED_REDIRECT_PRESETS=claude on the server. |
| 401 "Polarion did not accept this token" | The PAT was cut off, has expired or is for another Polarion. Create a new token and paste it unchanged. |

## Sources

Checked against the vendor documentation on 2026-10-24.

- [Official documentation](https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp)

Not confirmed in the vendor documentation:

- Callback https://claude.ai/api/mcp/auth_callback comes from the existing repo data; vendor article (building custom connectors) returned 404 so not re-verified.
- Which plans may use custom connectors changes over time; source says Free, Pro, Max, Team, Enterprise on 2026-10-24.

Back to the [client index](../../clients.md).
