# Connect Gemini Enterprise

Gemini Enterprise agents for your organization. Default: **Server**.

An administrator may need to override the organization policy that blocks custom MCP data stores. Tools are disabled until you enable them.

- **Local is not supported:** Cloud service; it cannot run npx. Use the Docker or Remote URL mode.

## Prerequisites

### Server

- [Server (Docker) guide](../server-docker.md): start here if you have not set it up yet.
- Google Cloud project with Gemini Enterprise
- Server on public HTTPS with OAuth login enabled

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

### Server

1. Admin: allow Custom MCP data stores and your domain; you need roles/discoveryengine.editor
2. Open Gemini Enterprise > Data stores > Create data store > Custom MCP Server
3. Click Add MCP server, choose OAuth 2.0, enter the /mcp, /authorize, /token URLs
4. Enter Client ID, Secret, Scopes, enable PKCE, Verify Auth, then Create
5. Actions > Reload custom actions > Enable actions, then connect the data store to your app

```
MCP Server URL:  https://YOUR-SERVER/mcp
Authorization URL: https://YOUR-SERVER/authorize
Token URL:        https://YOUR-SERVER/token
Redirect URL to register at the server: https://vertexaisearch.cloud.google.com/oauth-redirect
```

Tools (actions) are disabled until you enable them. An admin may need to override the org policy.

## Check

### Server

Ask your assistant: `Which Polarion user am I? Use getCurrentUser.`

Expected: Gemini Enterprise calls a Polarion action and shows your Polarion user.

## If it fails

### Server

| Symptom | Fix |
|---|---|
| Cannot create the Custom MCP Server data store | An admin must override the org policy that blocks Custom MCP data stores and allow your server's domain. |
| Verify Auth fails | Allow https://vertexaisearch.cloud.google.com/oauth-redirect (MCP_ALLOWED_REDIRECT_PREFIXES). |
| 401 "Polarion did not accept this token" | The PAT was cut off, has expired or is for another Polarion. Create a new token and paste it unchanged. |

## Sources

Checked against the vendor documentation on 2026-10-24.

- [Official documentation](https://docs.cloud.google.com/gemini/enterprise/docs/connectors/custom-mcp-server/set-up-custom-mcp-server)

Not confirmed in the vendor documentation:

- Google requires you to register Gemini Enterprise as an OAuth client and supply a Client ID and Client Secret. How to obtain them from THIS server (its dynamic registration endpoint /register vs a preconfigured client) is not documented by Google and was not verified against the server; also, Google documents no 'PAT/Authorization header only' option, only No authentication or OAuth 2.0.
- The server's /authorize and /token paths are taken from the repo deployment docs (Apache proxy list), not from a live run against Gemini Enterprise.
- Repo 'gemini' redirect preset has no fixed callback; the Google redirect URL https://vertexaisearch.cloud.google.com/oauth-redirect is from Google's prerequisites and must be added as an exact entry.
- Scopes value for this server is not defined in the Google page; ask the server administrator.
- Google's page has no testing procedure; the final prompt step is generic. The exact menu for attaching the data store to an app is on a separate Google page not fetched.

Back to the [client index](../../clients.md).
