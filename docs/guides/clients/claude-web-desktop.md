# Connect claude.ai

Claude in the browser, connects from the cloud. Default: **Server**.

Official documentation: [support.claude.com](https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp), [claude.com](https://claude.com/docs/connectors/custom/add-unlisted.md), [claude.com](https://claude.com/docs/connectors/building/authentication.md)

Verification status:

- Server: verified by documentation only

On Team / Enterprise, an owner adds the connector under Organization settings > Connectors > Add > Custom > Web; members then choose Connect.

- **Local is not supported:** claude.ai connects from Anthropic's cloud, so it cannot start npx.

## Prerequisites

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
  ghcr.io/phillipboesger/polarion-mcp:1.5.0
```

Put a TLS reverse proxy at https://YOUR-SERVER in front of 127.0.0.1:3000 and forward the public Host. TRUST_PROXY=1 assumes exactly one trusted proxy hop; adjust it to your network. Generate a stable secret of at least 32 characters. The claude redirect preset allows the claude.ai callback used by Claude web and Desktop connectors.

## Steps

### Server

1. Get the server address (https://YOUR-SERVER/mcp) from your administrator.
2. Open claude.ai and go to Customize > Connectors. On Free choose Add custom connector; on Pro/Max click + Add > Add custom connector. On Team/Enterprise only an Owner can add it (see the note below).
3. Enter name Polarion and server URL https://YOUR-SERVER/mcp, click Continue. If the dialog is a single screen, leave Advanced settings empty.
4. Review the detected authentication settings. Set Authentication to Sign in now and OAuth client to Register automatically, leave Request headers empty, then click Add.
5. Click Connect and enter your Polarion PAT on the server login page.
6. In a chat, click + > Connectors and switch the Polarion toggle on.

```
https://YOUR-SERVER/mcp
```

Anthropic connects from its cloud: use a public HTTPS server with OAuth. A tool call times out after 240 seconds and results over about 150,000 characters are cut off. Authentication settings cannot be edited later: remove the connector and add it again. On Team / Enterprise, an owner adds it under Organization settings > Connectors > Add > Custom > Web.

Team: only Owners and Primary Owners can add connectors; Enterprise: Owners, Primary Owners and custom roles with "Manage access to Libraries". They go to Organization settings > Connectors, click Add, hover Custom, select Web (if asked), enter name and URL, review the detected authentication settings (Authentication: Sign in now, OAuth client: Register automatically), then click Add. Members then open Customize > Connectors, find the connector (labeled Custom) and click Connect with their own PAT. The Request headers option (beta, limited organizations) stores one shared credential for everyone and does not fit per-user PATs.

## Check

### Server

Ask your assistant: `Which Polarion user am I? Use getCurrentUser.`

Expected: Claude calls a Polarion tool and shows your Polarion user.

## If it fails

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

- [Official documentation 1](https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp)
- [Official documentation 2](https://claude.com/docs/connectors/custom/add-unlisted.md)
- [Official documentation 3](https://claude.com/docs/connectors/building/authentication.md)
- [Official documentation 4](https://claude.com/docs/connectors/building/troubleshooting.md)
- [Official documentation 5](https://claude.com/docs/connectors/building/testing.md)
- [Official documentation 6](https://claude.com/docs/connectors/mcp-tunnels/overview)

Not confirmed in the vendor documentation:

- Which plans may use custom connectors changes over time; vendor article lists Free, Pro, Max, Team and Enterprise as of the check date.
- Vendor describes the custom connector dialog as varying by organization (one screen with Advanced settings, or two steps); the labels for your organization were not checked.
- Whether the server supports Claude's published identity (Client ID Metadata Document) is not stated by the vendor for this server; the guide uses Register automatically.

Back to the [client index](../../clients.md).
