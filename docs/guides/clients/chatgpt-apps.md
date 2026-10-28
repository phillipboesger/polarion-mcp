# Connect ChatGPT connector

ChatGPT connector, connects from the cloud. Default: **Server**.

Custom MCP access depends on your ChatGPT workspace permissions. Use DCR for this server unless the administrator explicitly enabled CIMD. This guide covers the public HTTPS connector path. OpenAI also documents Secure MCP Tunnel for private servers; that requires its own tunnel runtime and permissions, so local npx is not a direct connector setup.

- **Local is not supported:** ChatGPT's cloud cannot start npx. Use Remote or Docker mode.

## Prerequisites

### Server

- [Server (Docker) guide](../server-docker.md): start here if you have not set it up yet.
- ChatGPT workspace allowing custom MCP servers
- OAuth set up on the server by your admin

Server example (HTTPS team server for ChatGPT):

```bash
docker run -d --name polarion-mcp \
  -p 127.0.0.1:3000:3000 \
  -e API_BASE_URL=https://polarion.company.example/polarion/rest/v1 \
  -e MCP_ALLOWED_HOSTS=YOUR-SERVER \
  -e MCP_PUBLIC_URL=https://YOUR-SERVER \
  -e MCP_TOKEN_SECRET=YOUR_RANDOM_SECRET_AT_LEAST_32_CHARS \
  -e MCP_ALLOWED_REDIRECT_PREFIXES=https://YOUR-CLIENT/EXACT-CALLBACK \
  -e TRUST_PROXY=1 \
  ghcr.io/phillipboesger/polarion-mcp:1.4.4
```

Before connecting, replace MCP_ALLOWED_REDIRECT_PREFIXES with the exact callback shown by ChatGPT. Put a TLS reverse proxy at https://YOUR-SERVER in front of 127.0.0.1:3000 and forward the public Host. TRUST_PROXY=1 assumes exactly one trusted hop; adjust it to your network. Generate a stable secret of at least 32 characters. Use dynamic client registration (DCR).

## Steps

### Server

1. Open https://chatgpt.com/plugins, select the plus button, then Add custom MCP server.
2. Name the server, paste https://YOUR-SERVER/mcp as the Server URL.
3. Set authentication to OAuth and leave client credentials empty (DCR).
4. Select I understand and want to continue, then Create as a plugin.
5. Install the plugin, sign in with your PAT, then select it with @.

```
https://YOUR-SERVER/mcp
```

Use DCR unless the administrator explicitly enabled CIMD. Access depends on workspace permissions.

## Check

### Server

Ask your assistant: `@Polarion Which Polarion user am I? Use the Polarion tool getCurrentUser.`

Expected: ChatGPT calls a Polarion tool and lists project names and IDs.

## If it fails

### Server

| Symptom | Fix |
|---|---|
| Add custom MCP server option is missing | Your workspace administrator has not allowed custom MCP servers for you. Ask them to enable it. |
| Sign-in fails with a redirect_uri error | Send the callback address ChatGPT shows to the admin for MCP_ALLOWED_REDIRECT_PREFIXES. |

## Sources

Checked against the vendor documentation on 2026-10-24.

- [Official documentation](https://developers.openai.com/api/docs/guides/custom-mcp-server)

Not confirmed in the vendor documentation:

- Which ChatGPT plans (Plus, Pro, Business, Enterprise, Edu) can add custom MCP servers: the OpenAI page only says workspace permissions and security restrictions apply.
- The exact OAuth callback address ChatGPT uses: not documented; the person must read it from ChatGPT (the page does not say where it is shown) or from the server's rejected-redirect log.
- Exact wording of the sign-in step: how a PAT is entered depends on this server's login page, not on OpenAI.
- Whether the Server URL field must be filled for OAuth DCR with this server was verified only as documented option; end-to-end not tested.

Back to the [client index](../../clients.md).
