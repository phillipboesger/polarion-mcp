# Deployment

## Render Deployment

- render.yaml defines a web service using Node.
- The build command runs `npm ci && npm run build:http`.
- The service starts with node build/index.js (HTTP server).
- Configure environment variables in the Render dashboard.

Required environment variables on Render:

- API_BASE_URL
- BEARER_TOKEN
- HTTP_API_KEY

Optional environment variables:

- HTTP_PORT when the platform does not provide PORT-like routing automatically.
- NODE_TLS_REJECT_UNAUTHORIZED only for trusted internal deployments with self-signed certificates.

## Other Platforms

- HTTP deployments run node build/index.js.
- MCP deployments run node build/index.js under a stdio MCP client.
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
`MCP_ALLOWED_HOSTS` checks. Reload and verify:

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

## read_when

- Use this guide when deploying to Render, onto a Polarion server behind its own Apache, or another hosting platform.
