# Connect Mistral Le Chat

Mistral’s chat assistant, EU-hosted. Default: **Server**.

Official documentation: [docs.mistral.ai](https://docs.mistral.ai/le-chat/knowledge-integrations/connectors/mcp-connectors), [docs.mistral.ai](https://docs.mistral.ai/studio/connectors/management)

Verification status:

- Server: verified by documentation only

Operated by Mistral AI in France. Le Chat registers itself (DCR) and may send an empty client secret.

- **Local is not supported:** Le Chat connects from Mistral's cloud, so it needs a public HTTPS server.

## Prerequisites

### Server

- [Server (Docker) guide](../server-docker.md): start here if you have not set it up yet.
- Le Chat account with the administrator role (account owner on Free, Pro, Student)
- Public HTTPS server address with a valid certificate and OAuth

Server example (HTTPS team server for Mistral Le Chat):

```bash
docker run -d --name polarion-mcp \
  -p 127.0.0.1:3000:3000 \
  -e API_BASE_URL=https://polarion.company.example/polarion/rest/v1 \
  -e MCP_ALLOWED_HOSTS=YOUR-SERVER \
  -e MCP_PUBLIC_URL=https://YOUR-SERVER \
  -e MCP_TOKEN_SECRET=YOUR_RANDOM_SECRET_AT_LEAST_32_CHARS \
  -e MCP_ALLOWED_REDIRECT_PREFIXES=https://YOUR-LE-CHAT-CALLBACK \
  -e TRUST_PROXY=1 \
  ghcr.io/phillipboesger/polarion-mcp:1.5.0
```

Mistral does not document the Le Chat callback URL, so there is no built-in mistral preset (it stays empty and denies everything). Add the connector once, copy the redirect_uri that the server rejects from its log, put it in MCP_ALLOWED_REDIRECT_PREFIXES and restart. Put a TLS reverse proxy at https://YOUR-SERVER in front of 127.0.0.1:3000. Generate a stable secret of at least 32 characters.

## Steps

### Server

1. Set up the server with Docker and OAuth (see the server example under Prerequisites), reachable over HTTPS with a valid certificate at https://YOUR-SERVER/mcp.
2. In Le Chat open Connectors > + Add Connector and switch to the Custom MCP Connector tab. Only an administrator can do this: on Free, Pro and Student plans the account owner is the admin; on Team plans ask an admin.
3. Enter the connector name Polarion (no spaces or special characters), the Server URL https://YOUR-SERVER/mcp and an optional description.
4. Click Connect. Le Chat detects the auth method from the server (OAuth 2.1 with dynamic client registration) and opens the server login, where you enter your Polarion PAT.
5. Under Connectors > My Connectors > Polarion > Functions, keep write functions on Ask each time (the default) and set read functions to Always allow if you want; then use the connector in a new chat.

```
https://YOUR-SERVER/mcp
```

Le Chat registers itself (DCR). If login fails with a redirect_uri error, copy the rejected URI from the server log into MCP_ALLOWED_REDIRECT_PREFIXES. Mistral does not review third-party MCP servers; connect only servers you trust. Custom connectors do not yet support dynamic tool discovery, resources or automatic prompt templates.

## Check

### Server

Ask your assistant: `Which Polarion user am I? Use getCurrentUser.`

Expected: Le Chat calls getCurrentUser and shows your Polarion user.

## If it fails

### Server

| Symptom | Fix |
|---|---|
| "MCP connection requires additional information or is invalid" | Check the endpoint path (/mcp), HTTPS with a valid certificate, that unauthenticated requests get 401 with a WWW-Authenticate header, and that the server answers the initialize call. Test with the MCP Inspector or curl. |
| 401 "Polarion did not accept this token" | The PAT was cut off or expired. Create a new token and paste it unchanged. |
| Sign-in ends with a redirect_uri error | Add the rejected callback from the server log to MCP_ALLOWED_REDIRECT_PREFIXES and restart. |
| Add Connector or Custom MCP Connector not available | Only administrators can add custom connectors. Ask your Le Chat admin. |

## Sources

Checked against the vendor documentation on 2026-10-30.

- [Official documentation 1](https://docs.mistral.ai/le-chat/knowledge-integrations/connectors/mcp-connectors)
- [Official documentation 2](https://docs.mistral.ai/studio/connectors/management)

Not confirmed in the vendor documentation:

- Mistral does not document a fixed OAuth callback URL for Le Chat, so no built-in preset exists.
- Mistral's docs do not say which menu group holds Connectors in every app version, or whether Team plans differ from Free/Pro/Student beyond 'administrator only'.
- Mistral's docs mention no client secret field for custom connectors; they only say OAuth 2.1 uses dynamic client registration. This server accepts public registration (no secret), an empty client_secret field, and secret-based registrations (tests/dcr-client-compat.test.ts); only Le Chat's real behaviour is untested.
- Not yet tested with a Le Chat account.

Back to the [client index](../../clients.md).
