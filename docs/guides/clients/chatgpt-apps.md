# Connect ChatGPT connector

ChatGPT connector, connects from the cloud. Default: **Server**.

Official documentation: [developers.openai.com](https://developers.openai.com/api/docs/guides/custom-mcp-server)

Verification status:

- Server: verified by documentation only

Custom MCP access depends on your ChatGPT workspace permissions. Use DCR for this server unless the administrator explicitly enabled CIMD. This guide covers the public HTTPS connector path. OpenAI also documents Secure MCP Tunnel for private servers; that requires its own tunnel runtime and permissions, so local npx is not a direct connector setup.

- **Local is not supported:** ChatGPT's cloud cannot start npx. Use Remote or Docker mode.

## Prerequisites

### Server

- [Server (Docker) guide](../server-docker.md): start here if you have not set it up yet.
- ChatGPT on the web, with a workspace that allows custom MCP servers (Lockdown and other security restrictions can block it)
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
  ghcr.io/phillipboesger/polarion-mcp:1.5.0
```

Before connecting, replace MCP_ALLOWED_REDIRECT_PREFIXES with the exact callback shown by ChatGPT. Put a TLS reverse proxy at https://YOUR-SERVER in front of 127.0.0.1:3000 and forward the public Host. TRUST_PROXY=1 assumes exactly one trusted hop; adjust it to your network. Generate a stable secret of at least 32 characters. Use dynamic client registration (DCR).

## Steps

### Server

1. Use ChatGPT on the web (the vendor page documents the flow for ChatGPT web only). Open https://chatgpt.com/plugins and select the plus button, then Add custom MCP server.
2. Enter a name and, optionally, a description.
3. Under Connection, paste https://YOUR-SERVER/mcp as the Server URL (the Tunnel option is for OpenAI's Secure MCP Tunnel and is not used here).
4. Set authentication to OAuth and leave client credentials empty (DCR). The other choices are No authentication and OAuth or no authentication.
5. Read the risk warning, select I understand and want to continue, then select Create as a plugin.
6. Install the plugin (it appears in your personal plugins or in the workspace where you created it) and sign in with your PAT.
7. In the prompt box type @ and select the plugin. In the app settings you can open the app's details page to switch single tools on or off and to refresh the app after the server's tools change.

```
https://YOUR-SERVER/mcp
```

Use DCR unless the administrator explicitly enabled CIMD. Access depends on workspace permissions and security restrictions, including Lockdown. Write actions need your confirmation by default; tools without a readOnlyHint annotation count as write actions. Remembering an approval applies to that conversation only. Connect only trusted servers.

## Check

### Server

Ask your assistant: `@Polarion Which Polarion user am I? Use the Polarion tool getCurrentUser.`

Expected: ChatGPT calls a Polarion tool and shows your Polarion user. Expand the tool call details to see the full JSON input and output.

## If it fails

### Server

| Symptom | Fix |
|---|---|
| Add custom MCP server option is missing | Your workspace administrator has not allowed custom MCP servers for you, or Lockdown or another security restriction applies. Ask them to enable it. |
| Sign-in fails with a redirect_uri error | Send the callback address ChatGPT shows to the admin for MCP_ALLOWED_REDIRECT_PREFIXES. |
| 401 "Polarion did not accept this token" | The PAT was cut off, has expired or is for another Polarion. Create a new token and paste it unchanged. |
| ChatGPT does not show new or changed Polarion tools | Open the app's details page in the app settings and refresh the app. Refreshing pulls new tools, descriptions and server instructions. |
| ChatGPT calls the wrong tool or no tool | Name the app and the tool in the prompt, for example use the Polarion tool getCurrentUser, or tell it which tools to avoid. |

## Sources

Checked against the vendor documentation on 2026-10-30.

- [Official documentation](https://developers.openai.com/api/docs/guides/custom-mcp-server)

Not confirmed in the vendor documentation:

- Which ChatGPT plans (Plus, Pro, Business, Enterprise, Edu) can add custom MCP servers: the OpenAI custom-MCP page names no plan or role, only workspace permissions and security restrictions. The help article on developer mode (help.openai.com/articles/12584461) returns 403 to our fetcher; search snippets say custom MCP apps are for Business and Enterprise/Edu on web, which we did not confirm on the page itself.
- The exact OAuth callback address ChatGPT uses: the vendor page lists none; read it from ChatGPT or from the server's rejected-redirect log.
- Exact wording of the sign-in step: how a PAT is entered depends on this server's login page, not on OpenAI.
- Whether DCR with this server works end-to-end in ChatGPT was not tested; the vendor page only documents DCR as an option.

Back to the [client index](../../clients.md).
