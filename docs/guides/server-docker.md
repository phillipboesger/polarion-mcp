# Server (Docker)

The server runs in Docker and your client connects to its URL. Cloud clients such as claude.ai and ChatGPT also need public HTTPS and OAuth (a browser sign-in handled by the server).

A server your client connects to by URL. Needs Docker to host it; cloud clients also need public HTTPS and OAuth.

## Prerequisites

### Docker

Install Docker Desktop or Engine (https://docs.docker.com/get-started/get-docker/), start it, then check:
```
docker run --rm hello-world
```

### Polarion REST URL and token (PAT)

- URL: set `API_BASE_URL` to your Polarion REST URL, e.g. `https://polarion.company.example/polarion/rest/v1`. The container must reach it; VPN-only is fine.
- Token: Polarion user page > Personal Access Token (`https://YOUR-POLARION/polarion/#/user_tokens?id=YOUR_USERNAME`) > Create Token. Copy it at once, it is shown only once.
- "X-Rest-Token generation is not allowed"? Ask your Polarion administrator to set this in polarion.properties and restart Polarion:
```
com.siemens.polarion.rest.enabled=true
com.siemens.polarion.rest.security.restApiToken.enabled=true
```
To test the PAT and network path, use the container-side probe in docs/troubleshooting.md, section "Probe Polarion from the MCP container". Never pass the PAT as a curl argument.

### Local development only: Polarion on the Docker host

Only if Polarion runs on the same machine and the container cannot reach its company hostname. Inside a container `localhost` is the container itself.
- Docker Desktop: use `https://host.docker.internal/...` as host.
- Linux: add `--add-host=host.docker.internal:host-gateway` and use the same host.
- Set `API_BASE_URL` to the full REST URL; the Docker host needs VPN access.
- Polarion answers `request_rejected HTTP 400`? Add the hostname to `ALLOWED_HOSTS` on the Polarion container and recreate it (a restart is not enough). See docs/troubleshooting.md.
For team or cloud use, prefer the real Polarion hostname.

### Team or cloud: hostname and HTTPS

Cloud connectors (claude.ai, ChatGPT) need the MCP server at a public HTTPS address such as `https://mcp.mycompany.com/mcp`, even if the container runs on your laptop. Polarion itself may stay private. A local-only client can use `http://localhost:3000/mcp`.
1. Create a DNS A record for the MCP hostname pointing to the server.
1. Put a TLS proxy in front of port 3000, e.g. Caddy (https://caddyserver.com/docs/install), with the Caddyfile below. Start it with `caddy run`.
1. Open only ports 80 and 443, never 3000. Apache and nginx work too (docs/deployment.md).
1. Open `https://mcp.mycompany.com/health`. It confirms the server is up, not that Polarion is reachable.
Caddyfile:
```
mcp.mycompany.com {
    reverse_proxy 127.0.0.1:3000
}
```

### Cloud connectors only: token secret

claude.ai, ChatGPT and Claude Desktop connectors use OAuth, which needs a secret of at least 32 characters. Create it once, keep it, reuse it on every restart (a new one logs everyone out). Never commit it.
```
openssl rand -hex 32
```
No openssl? Use `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
Set these on the container (details in docs/configuration.md):
- `MCP_PUBLIC_URL=https://mcp.mycompany.com` (origin only, no path)
- `MCP_ALLOWED_HOSTS=mcp.mycompany.com`
- `MCP_TOKEN_SECRET`: your secret
- `MCP_ALLOWED_REDIRECT_PRESETS=claude` (or the exact callback in `MCP_ALLOWED_REDIRECT_PREFIXES`)
- `TRUST_PROXY`: number of proxy hops, usually 1

### Check that it runs

- `docker ps` shows the container, `docker logs polarion-mcp` its log.
- `curl http://localhost:3000/health` checks liveness only, not Polarion or the PAT. For that use the probe in docs/troubleshooting.md.
- Port 3000 taken? Change the left number, e.g. `-p 127.0.0.1:3100:3000`.

### Using a server your team already runs

You need two things from whoever runs the server:
- The server URL, ending in `/mcp`. Check that `https://THEIR-SERVER/health` answers {"status":"ok"} (VPN may be needed).
- How you sign in: OAuth in the browser (claude.ai, ChatGPT; the server must allow your client's redirect preset) or your own PAT as `Authorization: Bearer` header (Claude Code, Cursor, VS Code, API clients).

### Your Polarion token (PAT)

- URL: your Polarion address plus `/polarion/rest/v1`, e.g. `https://polarion.mycompany.com/polarion/rest/v1` (keep the port if there is one).
- Token: Polarion user page > Personal Access Token (`https://YOUR-POLARION/polarion/#/user_tokens?id=YOUR_USERNAME`) > Create Token. Copy it at once, it is shown only once.
- "X-Rest-Token generation is not allowed"? Ask your Polarion administrator to set this in polarion.properties and restart Polarion:
```
com.siemens.polarion.rest.enabled=true
com.siemens.polarion.rest.security.restApiToken.enabled=true
```
Test it (Windows PowerShell: `curl.exe`):
```
curl -i -H "Authorization: Bearer YOUR_PAT" "https://YOUR-POLARION/polarion/rest/v1/metadata"
```
- 200 with metadata: works (Polarion 2512+)
- 401: token wrong or expired
- 403: access denied
- 404 on Polarion 2506 or older: use stdio mode or upgrade to 2512+
- 404 or timeout otherwise: wrong URL or network

Next: [choose your client](../clients.md).
