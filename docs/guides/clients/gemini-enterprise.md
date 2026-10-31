# Connect Gemini (Enterprise)

Gemini Enterprise agents for your organization. Default: **Server**.

Official documentation: [docs.cloud.google.com](https://docs.cloud.google.com/gemini/enterprise/docs/connectors/custom-mcp-server/set-up-custom-mcp-server)

Verification status:

- Server: verified by documentation only

An administrator may need to override the organization policy that blocks custom MCP data stores. Tools are disabled until you enable them.

- **Local is not supported:** Cloud service; it cannot run npx. Use the Docker or Remote URL mode.

## Prerequisites

### Server

- [Server (Docker) guide](../server-docker.md): start here if you have not set it up yet.
- Google Cloud project with Gemini Enterprise and an app
- Discovery Engine Editor role for the admin creating the data store
- Server on public HTTPS (publicly trusted certificate) with OAuth login enabled

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

### Server

1. Admin, once: override the organization policy that blocks Custom MCP data stores, allow the domains of the MCP, authorization and token URLs (domain only, no path), and add custom_mcp to allowed data sources if project enforcement or VPC Service Controls is on.
2. Grant the person creating the data store Discovery Engine Editor (roles/discoveryengine.editor).
3. Register Gemini Enterprise as an OAuth client at the server's login (redirect URL https://vertexaisearch.cloud.google.com/oauth-redirect) and note Client ID and Client Secret.
4. Google Cloud console > Gemini Enterprise > Apps > your app > Connected Data Stores > New data store. Standalone Custom MCP data stores cannot be linked to an app later.
5. Search sources for Custom MCP Server, click Add MCP server, choose OAuth 2.0, and enter MCP Server URL, Authorization URL (no query parameters) and Token URL from the snippet.
6. Enter Client ID, Client Secret and Scopes (space-separated; include offline_access if the server supports refresh tokens), enable PKCE, keep Use HTTP Basic Authentication as the server needs, click Verify Auth, then Continue.
7. Optional: add an MCP Server Description. Continue, pick the Multi-region location, name the data connector, optionally set a tag (cannot be changed later) and a sensitive data protection policy, then Create.
8. Wait until the data store state changes from Creating to Active.
9. Open the data store > Actions > Reload custom actions, select the actions to enable (100 at most) and click Enable actions.

```
MCP Server URL:  https://YOUR-SERVER/mcp
Authorization URL: https://YOUR-SERVER/authorize
Token URL:        https://YOUR-SERVER/token
Redirect URL to register at the server: https://vertexaisearch.cloud.google.com/oauth-redirect
```

Only Streamable HTTP is supported (not SSE) and the server needs a certificate from a publicly trusted CA. Tools (actions) are disabled until you enable them, and each call asks for user confirmation unless the tool sets readOnlyHint. Click Reload custom actions after any server or annotation change.

## Check

### Server

Ask your assistant: `Which Polarion user am I? Use getCurrentUser.`

Expected: Gemini Enterprise calls a Polarion action and shows your Polarion user.

## If it fails

### Server

| Symptom | Fix |
|---|---|
| Cannot create the Custom MCP Server data store | An admin must override the org policy that blocks Custom MCP data stores, allow the domains of your MCP, authorization and token URLs, and add custom_mcp to allowed data sources if enforcement or VPC Service Controls is on. |
| Verify Auth fails | Allow https://vertexaisearch.cloud.google.com/oauth-redirect (MCP_ALLOWED_REDIRECT_PREFIXES) and check the Authorization URL has no query parameters. |
| Tools missing in Actions | Click Reload custom actions. Tools stay disabled until you enable them. |
| Certificate or transport error | Use a publicly trusted CA certificate and Streamable HTTP; SSE is not supported. |
| Session fails after the access token expires | Request offline_access in Scopes (or access_type=offline in Authorization URL Parameters) so refresh tokens are issued. |
| 401 "Polarion did not accept this token" | The PAT was cut off, has expired or is for another Polarion. Create a new token and paste it unchanged. |

## Sources

Checked against the vendor documentation on 2026-10-30.

- [Official documentation](https://docs.cloud.google.com/gemini/enterprise/docs/connectors/custom-mcp-server/set-up-custom-mcp-server)

Not confirmed in the vendor documentation:

- Google requires you to register Gemini Enterprise as an OAuth client with your identity provider and enter a Client ID and Client Secret. How to obtain them from THIS server (its dynamic registration endpoint /register vs a preconfigured client) is not documented by Google. This server's /register issues a client ID and, for client_secret_post or client_secret_basic registrations, a client secret (tests/dcr-client-compat.test.ts); whether Gemini Enterprise can use dynamic registration at all is untested. Google documents only No authentication or OAuth 2.0, no PAT/Authorization header option.
- The server's /authorize and /token paths are taken from the repo deployment docs (Apache proxy list), not from a live run against Gemini Enterprise.
- Google gives the redirect URL https://vertexaisearch.cloud.google.com/oauth-redirect; the repo 'gemini' preset has no fixed callback, so it must be added as an exact entry.
- The scopes value for this server is not defined by Google; ask the server administrator.
- Google has no dedicated testing or error-message section; the final prompt step is generic.

Back to the [client index](../../clients.md).
