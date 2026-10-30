# Connect Microsoft 365 Copilot / Teams

Declarative agents in Microsoft 365 Copilot Chat and Teams. Default: **Server**.

A declarative agent calls the MCP server as an action. Sign-in uses Microsoft’s fixed OAuth callback, so the server only needs the m365 preset. Do not bind the OAuth registration to an existing Teams app ID for an MCP server.

- **Local is not supported:** Microsoft 365 Copilot calls the MCP server from Microsoft’s cloud, so it needs a public HTTPS server.

## Prerequisites

### Server

- [Server (Docker) guide](../server-docker.md): start here if you have not set it up yet.
- Microsoft 365 tenant with a Copilot licence and custom app upload
- Microsoft 365 Agents Toolkit
- Public HTTPS server address with OAuth

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

1. Set up the server with Docker and the m365 preset (the server example below), reachable at https://YOUR-SERVER/mcp.
2. In VS Code, install Microsoft 365 Agents Toolkit and create a Declarative Agent with an action from an existing MCP server.
3. Enter https://YOUR-SERVER/mcp as the server URL and choose OAuth with dynamic client registration; the toolkit creates the auth config.
4. Select the polarion tools the agent should use (a subset is better than all).
5. Provision the agent, then open it in Microsoft 365 Copilot Chat or Teams and sign in with your Polarion PAT on the server login page.

```
https://YOUR-SERVER/mcp
```

Teams publishing needs an admin to allow the app. Select only the tools the agent needs.

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

## Sources

Checked against the vendor documentation on 2026-10-30.

- [Official documentation 1](https://learn.microsoft.com/en-us/microsoft-365/copilot/extensibility/plugin-authentication-oauth)
- [Official documentation 2](https://microsoft.github.io/copilot-camp/pages/extend-m365-copilot/10-mcp-auth)

Not confirmed in the vendor documentation:

- End-to-end run in an M365 tenant with a Copilot licence has not been done yet (planned in T3.4). Agents Toolkit menu labels come from the Microsoft lab and may change.
- Whether Copilot sends the DCR client without a secret to this server is untested.

Back to the [client index](../../clients.md).
