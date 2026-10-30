# Connect Microsoft 365 Copilot / Teams

Declarative agents in Microsoft 365 Copilot Chat and Teams. Default: **Server**.

Official documentation: [learn.microsoft.com](https://learn.microsoft.com/en-us/microsoft-365/copilot/extensibility/plugin-authentication-oauth), [microsoft.github.io](https://microsoft.github.io/copilot-camp/pages/extend-m365-copilot/10-mcp-auth), [learn.microsoft.com](https://learn.microsoft.com/en-us/microsoft-365/copilot/extensibility/build-mcp-plugins)

Verification status:

- Server: verified by documentation only

Sideloading for development needs the Upload custom apps setting; publishing to the whole organisation depends on the method and may need an admin. Preview alternative: Work IQ Dev Tools (wiqd CLI, Node.js 24+) or the agentConnectors section of the app manifest.

- **Local is not supported:** Microsoft 365 Copilot calls the MCP server from Microsoft’s cloud, so it needs a public HTTPS server.

## Prerequisites

### Server

- [Server (Docker) guide](../server-docker.md): start here if you have not set it up yet.
- Microsoft 365 tenant where an admin turned on Upload custom apps. A Microsoft 365 Copilot licence is only needed for agents grounded in organisation data; custom actions also work in Copilot Chat
- VS Code with Microsoft 365 Agents Toolkit 6.12.0 or later
- Public HTTPS server address with OAuth and dynamic client registration (m365 preset). Microsoft requires protected resource metadata at /.well-known/oauth-protected-resource, authorization server metadata with a registration_endpoint, and a registration that issues a client secret

Server example (HTTPS team server for Microsoft 365 Copilot):

```bash
docker run -d --name polarion-mcp \
  -p 127.0.0.1:3000:3000 \
  -e API_BASE_URL=https://polarion.company.example/polarion/rest/v1 \
  -e MCP_ALLOWED_HOSTS=YOUR-SERVER \
  -e MCP_PUBLIC_URL=https://YOUR-SERVER \
  -e MCP_TOKEN_SECRET=YOUR_RANDOM_SECRET_AT_LEAST_32_CHARS \
  -e MCP_ALLOWED_REDIRECT_PRESETS=m365 \
  -e TRUST_PROXY=1 \
  ghcr.io/phillipboesger/polarion-mcp:1.4.5
```

Put a TLS reverse proxy at https://YOUR-SERVER in front of 127.0.0.1:3000 and forward the public Host. TRUST_PROXY=1 assumes exactly one trusted hop. The m365 preset allows only Microsoft’s fixed callback https://teams.microsoft.com/api/platform/v1.0/oAuthRedirect. Generate a stable secret of at least 32 characters.

## Steps

### Server

1. Set up the server with Docker and the m365 preset (see the server example under Prerequisites), reachable at https://YOUR-SERVER/mcp.
2. Ask your tenant admin to allow custom apps: Teams admin center > Teams apps > Setup policies > Global (Org-wide default) > Upload custom apps On.
3. In VS Code, install Microsoft 365 Agents Toolkit 6.12.0 or later and open it from the Activity Bar.
4. In the Accounts pane select Sign in to Microsoft 365 and confirm that both Custom App Upload Enabled and Copilot Access Enabled show.
5. Select Create a New Agent/App > Declarative Agent > Add an Action > Start with an MCP Server.
6. Enter https://YOUR-SERVER/mcp as the server URL.
7. For the authentication type choose OAuth (with dynamic registration). The toolkit reads the registration details from the server's well-known endpoints and creates the auth config; no client ID or secret is entered. (The other options are OAuth with static registration, Entra SSO and None.)
8. Choose a project location and name the agent. The toolkit generates the project and opens it in a new VS Code window.
9. Tools: by default the agent resolves all polarion tools from the server at runtime, so there is nothing to select. To pin a subset instead, open .vscode/mcp.json, select Start (and Allow if asked to authenticate), choose ATK: Fetch action from MCP > ai-plugin.json and tick the tools.
10. In the Lifecycle pane select Provision, read the dialog and select Confirm, then wait until provisioning finishes.
11. Open https://m365.cloud.microsoft/chat, find the agent under Agents in the sidebar (its name ends with dev) and select it.
12. Send a prompt. If asked, allow the agent to send data to the plugin, then select Sign in to {agent name} and sign in with your Polarion PAT on the server login page.
13. To sign out later, use Chat settings > Agents in Microsoft 365 Copilot; this clears the stored OAuth token.

```
https://YOUR-SERVER/mcp
```

Sideloading for development needs the Upload custom apps setting; publishing to the whole organisation depends on the method and may need an admin. Preview alternative: Work IQ Dev Tools (wiqd CLI, Node.js 24+) or the agentConnectors section of the app manifest.

## Check

### Server

Ask your assistant: `Which Polarion user am I? Use getCurrentUser.`

Expected: The agent calls getCurrentUser and shows your Polarion user.

## If it fails

### Server

| Symptom | Fix |
|---|---|
| 401 "Polarion did not accept this token" | The PAT was cut off or expired. Create a new token and paste it unchanged. |
| Sign-in ends with a redirect_uri error | The administrator must set MCP_ALLOWED_REDIRECT_PRESETS=m365 on the server. |
| Provisioning works but every tool call returns 404 | The auth config ID in the manifest is wrong or the registration is bound to a Teams app ID. Recreate it with Any Teams app. |
| Custom App Upload Enabled or Copilot Access Enabled is missing in the Accounts pane | Ask your Microsoft 365 admin to turn on Upload custom apps and Copilot access for your account. |
| Provisioning cannot register a client with the server | Open the server's /.well-known/oauth-authorization-server URL in a browser and check that it returns registration_endpoint. In the Microsoft lab you also set wellKnownAuthorizationServer under dcr/register in m365agents.yml to that URL. |
| The agent is not in the sidebar | Look under Agents for the agent name with dev appended. Sideloaded apps are managed in Teams under Apps > Manage your apps. |
| You want to see why Copilot did or did not pick a tool | In a licensed Microsoft 365 Copilot chat type -developer on (and -developer off to stop). Developer mode is not available without the licence. |

## Sources

Checked against the vendor documentation on 2026-10-30.

- [Official documentation 1](https://learn.microsoft.com/en-us/microsoft-365/copilot/extensibility/plugin-authentication-oauth)
- [Official documentation 2](https://microsoft.github.io/copilot-camp/pages/extend-m365-copilot/10-mcp-auth)
- [Official documentation 3](https://learn.microsoft.com/en-us/microsoft-365/copilot/extensibility/build-mcp-plugins)
- [Official documentation 4](https://learn.microsoft.com/en-us/microsoft-365/copilot/extensibility/plugin-authentication)
- [Official documentation 5](https://learn.microsoft.com/en-us/microsoft-365/copilot/extensibility/plugin-authentication-dynamic-client-registration)
- [Official documentation 6](https://learn.microsoft.com/en-us/microsoft-365/copilot/extensibility/plugin-dynamic-tool-discovery)
- [Official documentation 7](https://learn.microsoft.com/en-us/microsoft-365/copilot/extensibility/prerequisites)
- [Official documentation 8](https://learn.microsoft.com/en-us/microsoft-365/copilot/extensibility/publish)
- [Official documentation 9](https://learn.microsoft.com/en-us/microsoft-365/copilot/extensibility/configure-plugin-mcp-servers)
- [Official documentation 10](https://learn.microsoft.com/en-us/microsoft-365/copilot/extensibility/build-reuse-mcp-servers)

Not confirmed in the vendor documentation:

- End-to-end run in an M365 tenant has not been done yet (planned in T3.4). Agents Toolkit labels come from Microsoft Learn (build-mcp-plugins, updated 2026-09-30) and the Microsoft lab and may change.
- Microsoft states that dynamic client registration without a client secret is not supported yet and that the authorization server must issue a secret at registration. This server issues a secret for client_secret_post and client_secret_basic registrations and rejects a wrong one (covered by tests/dcr-client-compat.test.ts); only Microsoft's actual client behaviour is untested.
- Microsoft documents the steps to publish to the whole organisation only per method (publish-plugin-organization was not read); this guide covers sideloading for development.
- Microsoft documents no timeout or tool-count limit for MCP plugins in declarative agents; the 30 second tool-call limit and TLS 1.2 requirement appear only for the Work IQ Dev Tools connector route.

Back to the [client index](../../clients.md).
