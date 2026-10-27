# Deployment

## Render Deployment

- render.yaml defines a web service using Node.
- The build command runs `npm ci --include=dev --ignore-scripts && npm run build:http` (the TypeScript compiler is a dev dependency, which Render skips when `NODE_ENV=production`), which copies the REST wrapper (`build/http-server.js`) over `build/index.js`.
- The service starts with node build/index.js, which on Render is therefore the REST HTTP server, not the stdio entry point it is in a normal build.
- Configure environment variables in the Render dashboard.

Required environment variables on Render:

- API_BASE_URL
- BEARER_TOKEN
- HTTP_API_KEY

Optional environment variables:

- HTTP_PORT when the platform does not provide PORT-like routing automatically.
- MCP_PUBLIC_URL, MCP_TOKEN_SECRET, MCP_ALLOWED_REDIRECT_PREFIXES (or MCP_ALLOWED_REDIRECT_PRESETS), and TRUST_PROXY when deploying the Streamable HTTP MCP server with OAuth. Render must start `node build/mcp-http-server.js` for that mode; the provided blueprint currently builds the REST wrapper.
- NODE_EXTRA_CA_CERTS for an additional company CA PEM; keep certificate verification enabled.

## Cloud and team connectivity

Cloud clients such as claude.ai and ChatGPT make two separate network connections:

1. The provider connects to the MCP endpoint at a **publicly reachable HTTPS** URL such as `https://mcp.company.example/mcp`. HTTPS is required even when the MCP server runs on a laptop. A cloud provider cannot use the laptop's `localhost` address.
2. The MCP container connects outbound to Polarion using `API_BASE_URL`, for example `https://polarion.company.example/polarion/rest/v1`. This Polarion URL may be private and reachable only from the server's network or VPN. The Polarion server does not need to be public if the MCP container can reach it.

`MCP_ALLOWED_HOSTS` validates the public Host header arriving at the MCP server (for example `mcp.company.example`). It does not allow or block outbound connections to Polarion. `ALLOWED_HOSTS` is an input used by the Polarion Docker image; it is unrelated to this MCP server's Host-header allowlist.

### Ordered setup

1. Choose the Polarion REST URL from the MCP container's network and verify it ends in `/polarion/rest/v1`; use the final HTTPS URL, not a redirecting alias. Keep the PAT in a secret manager.
2. Deploy the Streamable HTTP server on port 3000 and set `API_BASE_URL` to that Polarion URL. The caller supplies their PAT, or configure OAuth as below.
3. Publish the MCP endpoint behind a TLS reverse proxy at a stable hostname. Forward the public Host and client IP, bind the app privately where practical, and set `MCP_ALLOWED_HOSTS` to the MCP hostname. Never expose the plaintext port to the internet.
4. For OAuth, set `MCP_PUBLIC_URL` to the HTTPS origin only (no path), set a stable `MCP_TOKEN_SECRET` of at least 32 characters, allow the exact client callback URI through `MCP_ALLOWED_REDIRECT_PREFIXES` (or use a verified preset such as `claude`), and keep dynamic client registration (DCR) enabled unless CIMD is explicitly required. Set `TRUST_PROXY` to the actual trusted proxy hop count or address.
5. Check `https://mcp.company.example/health` for liveness, then use the container-side Polarion probe in [troubleshooting](troubleshooting.md#probe-polarion-from-the-mcp-container). A healthy `/health` response does not prove Polarion connectivity.

If Polarion uses a company CA, mount its PEM certificate into the MCP container and set `NODE_EXTRA_CA_CERTS` to that path. TLS certificate verification remains enabled.

## Docker and reverse proxies

The Dockerfile runs the Streamable HTTP MCP server on port 3000. Set `API_BASE_URL`; each caller supplies their own Polarion PAT. For OAuth login also set a stable `MCP_TOKEN_SECRET`, `MCP_PUBLIC_URL`, and redirect allowlist. When a TLS proxy sits in front, forward the public Host and client IP, set `TRUST_PROXY` to the trusted hop count or proxy address, and consider binding the container service privately. Do not use `TRUST_PROXY=true` on a public listener.

Render's checked-in `render.yaml` builds and starts the REST wrapper. To deploy Streamable HTTP on Render, change the start command to `node build/mcp-http-server.js` and configure MCP environment variables. Configure `TRUST_PROXY` based on the actual trusted proxy chain. Without it, all requests may appear to share Render's proxy egress IP; a single user's failed logins can exhaust the shared IP rate limit and lock out other users. Confirm the platform's forwarded-header behavior before trusting a hop count.

## Docker

The published image runs Streamable HTTP by default. A local PAT-authenticated server:

```bash
docker run -d --name polarion-mcp \
  -p 127.0.0.1:3000:3000 \
  -e API_BASE_URL=https://YOUR-POLARION/polarion/rest/v1 \
  -e MCP_ALLOWED_HOSTS=localhost:3000,127.0.0.1:3000 \
  ghcr.io/phillipboesger/polarion-mcp:1.4.2
```

Connect to `http://localhost:3000/mcp` with `Authorization: Bearer YOUR_POLARION_PAT`. The image holds no shared Polarion credentials in this mode. Each caller supplies their own PAT.

For team access, proxy HTTPS to the loopback port and include the public hostname in `MCP_ALLOWED_HOSTS`. For OAuth connectors, set `MCP_PUBLIC_URL` to the HTTPS origin, provide a stable `MCP_TOKEN_SECRET` of at least 32 characters, and configure exact redirect allowlists. Claude can use `MCP_ALLOWED_REDIRECT_PRESETS=claude`; add the callback supplied by ChatGPT as an exact `MCP_ALLOWED_REDIRECT_PREFIXES` entry. Use dynamic client registration (DCR) unless CIMD was explicitly enabled. Configure `TRUST_PROXY` for the actual trusted proxy chain. The Apache example below explains proxying and OAuth in more detail.

For stdio, run the same image with `docker run -i --rm`, pass `API_BASE_URL` and `BEARER_TOKEN`, and override the command with `node build/index.js`. Do not detach a stdio container.

For REST/OpenAPI, override the command with `node build/http-server.js`, configure `API_BASE_URL`, `BEARER_TOKEN`, `HTTP_API_KEY` and `PUBLIC_URL`, and keep the loopback port mapping. REST callers authenticate with `HTTP_API_KEY`; calls run under the deployment PAT. The [inline REST setup](https://polarion-mcp.boesger.com/#setup/rest-wrapper) contains the complete command.

## Other Platforms

- REST HTTP deployments run node build/http-server.js (or build/index.js after `npm run build:http`).
- Streamable HTTP MCP deployments run node build/mcp-http-server.js.
- stdio MCP runs node build/index.js under an MCP client (after a normal `npm run build`).
- Ensure HTTP_PORT is provided by the platform or set explicitly.

## Mode-Specific Deployment Notes

- MCP stdio mode is usually not deployed as a public service. It is launched by the assistant client on demand.
- Streamable HTTP MCP mode (`node build/mcp-http-server.js`, `npm run start:mcp-http`) is the network-facing target for remote MCP clients such as Claude.ai custom connectors. It is deployed without credentials — each client sends its own Polarion PAT. Because that token travels in the request header, terminate TLS in front of it (reverse proxy / platform), bind the plaintext port to loopback with MCP_HTTP_HOST=127.0.0.1, and set MCP_ALLOWED_HOSTS for DNS-rebinding protection.
- REST HTTP mode (`node build/http-server.js`) is the network-facing target for ChatGPT Custom GPT Actions. It still uses the server-side BEARER_TOKEN.
- Tool execution always needs a Polarion token: stdio and REST HTTP mode take it from BEARER_TOKEN, the Streamable HTTP MCP transport from the request.

## On the Polarion server itself, behind its Apache

A Polarion server already terminates TLS and already proxies `/polarion` over
AJP, so it can serve this MCP server too. No Docker needed.

**1. Node.** Polarion bundles a Node that is far too old, so install a current
one next to the app instead of replacing anything system-wide:

```bash
mkdir -p /opt/polarion-mcp && cd /opt/polarion-mcp
curl -fsSLO https://nodejs.org/dist/v22.14.0/node-v22.14.0-linux-x64.tar.xz
curl -fsSL https://nodejs.org/dist/v22.14.0/SHASUMS256.txt -o SHASUMS256.txt
grep " node-v22.14.0-linux-x64.tar.xz$" SHASUMS256.txt | sha256sum -c -
tar xf node-v22.14.0-linux-x64.tar.xz && mv node-v22.14.0-linux-x64 node
```

**2. The app.** Copy the repository to `/opt/polarion-mcp/app`, then:

```bash
cd /opt/polarion-mcp/app
export PATH=/opt/polarion-mcp/node/bin:$PATH
npm ci --ignore-scripts && npm run build
useradd --system --home /opt/polarion-mcp --shell /usr/sbin/nologin polarion-mcp
chown -R polarion-mcp:polarion-mcp /opt/polarion-mcp
```

**3. The service** — `/etc/systemd/system/polarion-mcp.service`. It holds no
credentials; `MCP_HTTP_HOST` keeps the plaintext port off the network:

```ini
[Unit]
Description=Polarion MCP server (Streamable HTTP, per-request Polarion PAT)
After=network.target

[Service]
Type=simple
User=polarion-mcp
WorkingDirectory=/opt/polarion-mcp/app
Environment=API_BASE_URL=https://polarion.example.com/polarion/rest/v1
Environment=MCP_PUBLIC_URL=https://polarion.example.com
# Keeps logins valid across restarts; readable by root only.
EnvironmentFile=/etc/polarion-mcp/secrets.env
Environment=MCP_HTTP_HOST=127.0.0.1
Environment=MCP_HTTP_PORT=3000
Environment=MCP_ALLOWED_HOSTS=polarion.example.com
# Apache on the same host: rate limits per client, not one counter for everyone.
Environment=TRUST_PROXY=loopback
# Only these OAuth callbacks may register; add one per client you support.
Environment=MCP_ALLOWED_REDIRECT_PREFIXES=https://claude.ai/api/mcp/auth_callback
# Optional: expose fewer tools, e.g. MCP_READ_ONLY=true or MCP_TOOLS=getWorkItems,getWorkItem,...
ExecStart=/opt/polarion-mcp/node/bin/node build/mcp-http-server.js
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true

[Install]
WantedBy=multi-user.target
```

`/etc/polarion-mcp/secrets.env` (`chmod 600`, owned by root) holds
`MCP_TOKEN_SECRET=<openssl rand -base64 48>`, and for Custom GPT OAuth also
`GPT_CLIENT_ID=...` and `GPT_CLIENT_SECRET=...`.

```bash
systemctl daemon-reload && systemctl enable --now polarion-mcp
curl -s http://127.0.0.1:3000/health
```

**4. Apache.** Enable `proxy_http` (Polarion's own config only loads `proxy`
and `proxy_ajp`), then add the block below **to the TLS virtual host only** —
never to `conf-enabled/`, because that would also publish these paths on port
80, where a client's Polarion token would travel in clear text:

```bash
a2enmod proxy_http
```

```apache
# in <VirtualHost *:443>, alongside Polarion's own /polarion AJP proxy
ProxyPreserveHost On
ProxyPass /mcp http://127.0.0.1:3000/mcp timeout=600 flushpackets=on
ProxyPassReverse /mcp http://127.0.0.1:3000/mcp

# Only needed when the OAuth login is enabled (MCP_PUBLIC_URL set).
# All of these must be reachable, or the client's login fails mid-flow.
ProxyPass /authorize http://127.0.0.1:3000/authorize timeout=600
ProxyPassReverse /authorize http://127.0.0.1:3000/authorize
ProxyPass /token http://127.0.0.1:3000/token timeout=600
ProxyPassReverse /token http://127.0.0.1:3000/token
ProxyPass /register http://127.0.0.1:3000/register timeout=600
ProxyPassReverse /register http://127.0.0.1:3000/register
ProxyPass /polarion-login http://127.0.0.1:3000/polarion-login timeout=600
ProxyPassReverse /polarion-login http://127.0.0.1:3000/polarion-login
ProxyPass /.well-known/oauth-authorization-server http://127.0.0.1:3000/.well-known/oauth-authorization-server timeout=600
ProxyPassReverse /.well-known/oauth-authorization-server http://127.0.0.1:3000/.well-known/oauth-authorization-server
ProxyPass /.well-known/oauth-protected-resource http://127.0.0.1:3000/.well-known/oauth-protected-resource timeout=600
ProxyPassReverse /.well-known/oauth-protected-resource http://127.0.0.1:3000/.well-known/oauth-protected-resource

# Only needed for Custom GPT OAuth (GPT_CLIENT_ID set).
ProxyPass /gpt/ http://127.0.0.1:3000/gpt/ timeout=600
ProxyPassReverse /gpt/ http://127.0.0.1:3000/gpt/
ProxyPass /api/tools http://127.0.0.1:3000/api/tools timeout=600
ProxyPassReverse /api/tools http://127.0.0.1:3000/api/tools
ProxyPass /openapi-gpt.json http://127.0.0.1:3000/openapi-gpt.json
ProxyPassReverse /openapi-gpt.json http://127.0.0.1:3000/openapi-gpt.json
ProxyPass /openapi.json http://127.0.0.1:3000/openapi.json
ProxyPassReverse /openapi.json http://127.0.0.1:3000/openapi.json
```

`ProxyPreserveHost On` passes the public host name through, which is what
`MCP_ALLOWED_HOSTS` checks.

**Own subdomain for the MCP server?** Polarion's installer may define its
`/polarion` proxy globally (in `conf-enabled/`), and Apache then applies it to
every virtual host, including a dedicated `mcp.example.com`. In such a vhost,
deny everything and open only the MCP and OAuth paths:

```apache
<Location />
    Require all denied
</Location>
<LocationMatch "^/(mcp|authorize|token|register|polarion-login|health|\.well-known/oauth-(authorization-server|protected-resource)(/.*)?)$">
    Require all granted
</LocationMatch>
```

Add `gpt/`, `api/tools` and the `openapi*.json` paths to the pattern if you use Custom GPT OAuth.

Reload and verify:

```bash
apache2ctl configtest && systemctl reload apache2

# 401 plus a pointer to the login: what makes a Claude.ai connector offer to log in
curl -si -X POST https://polarion.example.com/mcp \
  -H 'content-type: application/json' \
  -H 'accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}' | grep -i www-authenticate

# the plaintext port must not answer from outside
curl -s --max-time 5 http://polarion.example.com:3000/health || echo "refused, as it should be"
```

Connector URL for the MCP client: `https://polarion.example.com/mcp`.
