# Connect Mistral Le Chat

Mistral’s chat assistant, EU-hosted. Default: **Server**.

Verification status:

- Server: verified by documentation only

Operated by Mistral AI in France. Le Chat registers itself (DCR) and may send an empty client secret.

- **Local is not supported:** Le Chat connects from Mistral’s cloud, so it needs a public HTTPS server.

## Prerequisites

### Server

- [Server (Docker) guide](../server-docker.md): start here if you have not set it up yet.
- Le Chat account (admin role on Team plans)
- Public HTTPS server address with OAuth

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
  ghcr.io/phillipboesger/polarion-mcp:1.4.5
```

Mistral does not document the Le Chat callback URL, so there is no built-in mistral preset (it stays empty and denies everything). Add the connector once, copy the redirect_uri that the server rejects from its log, put it in MCP_ALLOWED_REDIRECT_PREFIXES and restart. Put a TLS reverse proxy at https://YOUR-SERVER in front of 127.0.0.1:3000. Generate a stable secret of at least 32 characters.

## Steps

### Server

1. Set up the server with Docker and OAuth (see the server example under Prerequisites), reachable at https://YOUR-SERVER/mcp.
2. In Le Chat open Intelligence > Connectors > Add Connector > Custom MCP Connector (on Team plans an admin must do this).
3. Enter name Polarion and the URL https://YOUR-SERVER/mcp; leave the client secret empty so Le Chat registers itself.
4. Click Connect and enter your Polarion PAT on the server login page.
5. Enable the connector in a new chat.

```
https://YOUR-SERVER/mcp
```

If login fails with a redirect_uri error, copy the rejected URI from the server log into MCP_ALLOWED_REDIRECT_PREFIXES.

## Check

### Server

Ask your assistant: `Which Polarion user am I? Use getCurrentUser.`

Expected: Le Chat calls getCurrentUser and shows your Polarion user.

## If it fails

### Server

| Symptom | Fix |
|---|---|
| 401 "Polarion did not accept this token" | The PAT was cut off or expired. Create a new token and paste it unchanged. |
| Sign-in ends with a redirect_uri error | Add the rejected callback from the server log to MCP_ALLOWED_REDIRECT_PREFIXES and restart. |

## Sources

Checked against third-party guides on 2026-10-30.

- [Third-party guide 1](https://docs.civic.com/civic/quickstart/clients/mistral-lechat)
- [Third-party guide 2](https://docs.bko.finologee.com/docs/mcp-mistral)

Not confirmed in the vendor documentation:

- Mistral’s own documentation for custom connectors was not available; steps come from two third-party guides.
- The Le Chat callback URL is not documented, so no built-in preset exists.
- Not yet tested with a Le Chat account (T5.3).

Back to the [client index](../../clients.md).
