# Server setup (Docker)

The server runs in a Docker container and your client connects to its URL. This is the supported way to host the HTTP server (other hosting options are in [Deployment](../deployment.md)). Use it for claude.ai, ChatGPT and other cloud clients, and for a team that shares one server.

The only thing assumed is that your AI platform exists. Do Steps 1 and 2 first. Do Step 3 only if Polarion runs on the machine that runs Docker. In Option B that machine is the server from B1, so do Steps 2 and 3 there. Then do Option A or Option B:

- Option A: your client runs on your own computer (for example Claude Code or Cursor). No HTTPS needed.
- Option B: a cloud client or a team connects from the internet. Needs a public HTTPS address.

## Words used here

- Polarion: the ALM (application lifecycle management) system your AI works with. REST is the web interface the server uses to read it.
- PAT (personal access token): a password-like token that lets the server act as you in Polarion.
- Bearer: the word before the token in `Authorization: Bearer YOUR_PAT`. Type it as shown.
- Docker: runs programs in isolated containers. Docker Compose starts several containers from one file.
- Caddy: a web server that sits in front of the MCP server and handles HTTPS.
- HTTPS and TLS: encrypted web traffic. The padlock in the browser shows it works. A certificate proves the site's identity.
- DNS A record: a DNS entry that points a hostname such as `mcp.example.com` to a server's IP address.
- Reverse proxy: a program in front of the server that accepts internet traffic and forwards it. Caddy is one.
- OAuth: the browser sign-in that claude.ai and ChatGPT use. The server handles it with a secret.
- Container and image: a container is one running, isolated program. An image is the packaged program it starts from.
- VPS and SSH: a VPS is a rented virtual server. SSH logs in to it from your terminal.
- `localhost`: your own computer. Inside a container it means the container itself.
- `YOUR-MCP-HOST`: the full hostname you choose for the server, for example `mcp.example.com`. Use the same value everywhere.
- Placeholders: capitals such as `YOUR-POLARION`, `YOUR_PAT`, `YOUR_USERNAME` and `YOUR-MCP-HOST` are placeholders. Replace them with your own values.
- Commands are for macOS and Linux (Bash). On Windows run them in WSL (Windows Subsystem for Linux) or Git Bash.

## Prerequisites

### Step 1: Install Docker

Docker runs the server in an isolated container.

1. Install Docker Desktop (macOS, Windows) or Docker Engine (Linux): <https://docs.docker.com/get-started/get-docker/>. On Linux also install the Compose plugin.
2. Start Docker.
3. Check both tools (on Linux you may need `sudo`, or add your user to the `docker` group):

```bash
docker run --rm hello-world
docker compose version
```

Expected: a "Hello from Docker!" message, then a Compose version.

If not: `Cannot connect to the Docker daemon` means Docker is not running. Start Docker Desktop, or on Linux `sudo systemctl start docker`.

### Step 2: Polarion REST URL and token (PAT)

- URL: your Polarion address plus `/polarion/rest/v1`, for example `https://polarion.mycompany.com/polarion/rest/v1`. The container must be able to reach it. A VPN-only Polarion is fine if the Docker host is on the VPN.
- PAT: a password-like token. Open `https://YOUR-POLARION/polarion/#/user_tokens?id=YOUR_USERNAME`, enter a name and expiry, click Create Token and copy it at once.
- "X-Rest-Token generation is not allowed"? Ask your Polarion administrator to add this to `polarion.properties` and restart Polarion:

```
com.siemens.polarion.rest.enabled=true
com.siemens.polarion.rest.security.restApiToken.enabled=true
```

Test it (Windows PowerShell: `curl.exe`):

```bash
curl -i -H "Authorization: Bearer YOUR_PAT" "https://YOUR-POLARION/polarion/rest/v1/metadata"
```

Expected: `HTTP/1.1 200` with JSON containing `metadata` (Polarion 2512 or newer). On 2506, `/metadata` returns 404 and the server checks tokens with `GET /projects` instead, so the user needs global REST GET.

If not: 401 means the token is wrong or expired. 403 means access denied. 404 means a wrong URL or Polarion 2506 or older, which the HTTP server does not support (use [Local setup](local-npm.md) or upgrade). A timeout means a wrong address or a missing VPN.

### Step 3: Polarion runs on the same machine as Docker (development only)

Skip this for a real Polarion hostname. Inside a container `localhost` is the container itself, so it cannot reach Polarion that way.

- Docker Desktop: use `host.docker.internal` as the host in `API_BASE_URL`.
- Linux: add `--add-host=host.docker.internal:host-gateway` (or `extra_hosts: ["host.docker.internal:host-gateway"]` in Compose) and use the same host.
- Polarion answers `request_rejected HTTP 400`? Polarion's own host allowlist rejects that name. Add it to `ALLOWED_HOSTS` on the Polarion container and recreate the container (a restart is not enough). Example value: `localhost,127.0.0.1,0.0.0.0,host.docker.internal`. See [Troubleshooting](../troubleshooting.md).

## Option A: client on your own computer

Start the container:

```bash
docker run -d --name polarion-mcp \
  -p 127.0.0.1:3000:3000 \
  -e API_BASE_URL=https://YOUR-POLARION/polarion/rest/v1 \
  -e MCP_ALLOWED_HOSTS=localhost:3000,127.0.0.1:3000 \
  ghcr.io/phillipboesger/polarion-mcp:1.4.5
```

Windows PowerShell: put the whole `docker run` command on one line and remove the `\` line endings.

Check it:

```bash
curl http://localhost:3000/health
```

Expected: JSON that contains `"status":"ok"`. This proves only that the server runs, not that Polarion is reachable.

If not: `docker ps` shows whether the container runs. `docker logs polarion-mcp` shows why not. Name already in use? Run `docker rm -f polarion-mcp`, then start it again. Port 3000 taken? Change the left number, for example `-p 127.0.0.1:3100:3000`, and use that port everywhere.

Your client connects to `http://localhost:3000/mcp` and sends `Authorization: Bearer YOUR_PAT` (your client guide shows where the token goes). The container holds no Polarion credentials.

## Option B: public HTTPS server for claude.ai, ChatGPT or a team

Cloud clients connect from the internet, so the server needs a public HTTPS address such as `https://YOUR-MCP-HOST/mcp`. Polarion itself can stay private. Steps B1 to B4 build that with one Docker Compose file and Caddy.

### B1: Get a machine with a public IP

1. Rent a small VPS (a virtual server from a hosting provider) or use any Linux server reachable from the internet. Note its public IPv4 address.
2. Log in with SSH (`ssh user@IP-ADDRESS`) and repeat Step 1 on that machine to install Docker. Then run `docker run --rm hello-world` there.
3. In its firewall (or the provider's security group) open ports 80 and 443 (plus 22 for SSH, or you lock yourself out), never 3000. Caddy needs port 80 to obtain the certificate.

Expected: `hello-world` prints "Hello from Docker!".

If not: check the IP address and that port 22 is open.

### B2: Point a hostname at it (DNS A record)

1. In the DNS settings of your domain provider, create an A record: name `mcp` (giving `mcp.example.com` for the domain `example.com`; use this full name as `YOUR-MCP-HOST`), value the server's public IPv4 address.
2. Wait a few minutes.
3. Check from your computer:

```bash
nslookup YOUR-MCP-HOST
```

Expected: the output lists the server's IP address.

If not: DNS changes can take up to an hour. Check the record for typos.

### B3: Create a token secret

OAuth needs a secret of at least 32 characters. Create it once and keep it. A new secret logs everyone out. Never commit it.

```bash
openssl rand -hex 32
```

Expected: one line of 64 letters and digits. Copy it for the `.env` file below.

No openssl? Use:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### B4: Write the Compose file, Caddyfile and start

On the server, create an empty folder and open a terminal in it (`mkdir polarion-mcp && cd polarion-mcp`). Create these three files there, with exactly these names and no extension. The image is public, so no login is needed.

`.env` (replace the secret with yours; keep this file private):

```
MCP_TOKEN_SECRET=PASTE_YOUR_SECRET_HERE
```

`Caddyfile` (replace the hostname):

```
YOUR-MCP-HOST {
    reverse_proxy mcp:3000
}
```

`compose.yaml` (replace the hostname and the Polarion URL):

```yaml
services:
  mcp:
    image: ghcr.io/phillipboesger/polarion-mcp:1.4.5
    restart: unless-stopped
    environment:
      API_BASE_URL: https://YOUR-POLARION/polarion/rest/v1
      MCP_PUBLIC_URL: https://YOUR-MCP-HOST
      MCP_ALLOWED_HOSTS: YOUR-MCP-HOST
      MCP_TOKEN_SECRET: ${MCP_TOKEN_SECRET}
      TRUST_PROXY: "1"
  caddy:
    image: caddy:2
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
    depends_on:
      - mcp
volumes:
  caddy_data:
```

What the settings mean:

- `MCP_PUBLIC_URL`: the public address, origin only, no path.
- `MCP_ALLOWED_HOSTS`: the hostname clients use. The server rejects other Host headers.
- No redirect setting yet: pick the overlay for your client in the next step.
- `TRUST_PROXY=1`: one proxy (Caddy) sits in front.
- The `mcp` service publishes no port, so only Caddy can reach it.

Check the folder first:

```bash
ls -a
```

Expected: `.env`, `Caddyfile` and `compose.yaml` are listed.

Start everything (run it in the same folder):

```bash
docker compose up -d
```

Expected: both containers start. Check:

```bash
docker compose ps
```

Expected: `mcp` and `caddy` with state `running`.

If not: a "variable is not set" message means `.env` is missing or misnamed. `docker compose logs caddy` shows certificate problems (usually DNS not ready, or port 80 closed). `docker compose logs mcp` shows server errors.

Apache or nginx instead of Caddy: see [Deployment](../deployment.md).

## Behind a corporate proxy (optional)

Add `-e HTTPS_PROXY=http://proxy.company.example:3128` and `-e NO_PROXY=.company.example` to `docker run`, or the same two lines under `environment:` in the Compose file. Only `https://` Polarion URLs go through the proxy. A `407` error in the log means the proxy credentials in the URL are wrong.

### B5: Add the overlay for your client

The base file starts a server that accepts personal access tokens. OAuth clients also need an overlay that sets the allowed sign-in callbacks. Copy the matching file from [docs/examples/overlays](../examples/overlays/) next to `compose.yaml` and start with both files, for example for Microsoft 365 Copilot:

```bash
docker compose -f compose.yaml -f m365.yaml up -d
```

| Overlay | For | Sets |
|---|---|---|
| `claude.yaml` | claude.ai, Claude Desktop | `MCP_ALLOWED_REDIRECT_PRESETS: claude` |
| `m365.yaml` | Microsoft 365 Copilot, Teams | `MCP_ALLOWED_REDIRECT_PRESETS: m365` |
| `chatgpt.yaml` | ChatGPT connector | `MCP_ALLOWED_REDIRECT_PREFIXES` with the callback ChatGPT shows (see the [ChatGPT guide](clients/chatgpt-apps.md)) |
| `mistral.yaml` | Mistral Le Chat | `MCP_ALLOWED_REDIRECT_PREFIXES` with the callback from the server log |
| `proxy.yaml` | Outbound proxy to Polarion | `HTTPS_PROXY`, `NO_PROXY` |

Polarion answers `request_rejected 400` when it does not accept the host name in `API_BASE_URL`. For the Polarion Docker image add that name to `ALLOWED_HOSTS` on the Polarion container (the [troubleshooting entry](../troubleshooting.md#allowed_hosts-recipe) has the full recipe).

## Check that it works

Option A: the `/health` check in Option A plus the client check at the end. Option B, run all three:

1. Liveness (from any computer):

```bash
curl https://YOUR-MCP-HOST/health
```

Expected: JSON that contains `"status":"ok"`, with a valid certificate (no warning).

2. Polarion reachability and token, read-only. Run the probe in [Troubleshooting](../troubleshooting.md#probe-polarion-from-the-mcp-container), but replace `docker exec -i polarion-mcp` with `docker compose exec -T mcp` and run it in the Compose folder. Expected: `Polarion metadata HTTP 200: authenticated`.

3. A real tool call over HTTP, with your PAT. The server first opens a session (`initialize`), then you call a tool with the session ID. Run in Bash (replace the URL). Nothing shows while you paste the PAT, then press Enter. If `session:` stays empty, the PAT is wrong (401) or access is denied (403):

```bash
URL=https://YOUR-MCP-HOST/mcp
read -rsp 'Polarion PAT: ' PAT; printf '\n'
SID=$(curl -s -D - -o /dev/null -X POST "$URL" \
  -H "Authorization: Bearer $PAT" -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"curl","version":"1"}}}' \
  | tr -d '\r' | awk -F': ' 'tolower($1)=="mcp-session-id"{print $2}')
echo "session: $SID"
curl -s -X POST "$URL" \
  -H "Authorization: Bearer $PAT" -H "mcp-session-id: $SID" \
  -H "Content-Type: application/json" -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"getCurrentUser","arguments":{}}}'
unset PAT
```

Expected: a session ID, then a `data:` line whose result contains your Polarion user.

## If it fails

| Symptom | Fix |
|---|---|
| Certificate error | DNS is not ready yet or ports 80/443 are closed. Run `docker compose logs caddy`. |
| 403 Origin or Host rejected | `MCP_ALLOWED_HOSTS` must equal the hostname in the URL exactly. |
| 401 | The PAT is wrong or expired. Repeat the test in Step 2. |
| 503 "Polarion could not be reached" | The container cannot reach `API_BASE_URL`. Check VPN, DNS and Step 3. |
| Sign-in loops or `redirect_uri rejected` | Check `MCP_PUBLIC_URL`, the redirect setting and that `MCP_TOKEN_SECRET` did not change. |

## Update and stop

Update:

```bash
docker compose pull && docker compose up -d
```

Stop everything:

```bash
docker compose down
```

Pin a version by changing the image tag (`1.4.5`).

## Connect your client

Open the [guide for your client](../clients.md). Use `https://YOUR-MCP-HOST/mcp` (Option B) or `http://localhost:3000/mcp` (Option A, with your port if you changed it) as the server URL.

Final check in your client: ask `Which Polarion user am I? Use getCurrentUser.` Expected: the client calls a Polarion tool and shows your user.
