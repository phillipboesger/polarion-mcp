# Troubleshooting

Setup problems: follow the [Local setup](guides/local-npm.md) or [Server setup](guides/server-docker.md) guide first; each contains a check and an "If it fails" table.

## HTTP Server Exits Immediately

- The REST wrapper requires `HTTP_API_KEY`. Set it before starting `build/http-server.js`.

## "No Polarion token is configured"

- Stdio and REST HTTP mode need `BEARER_TOKEN`. The Streamable HTTP MCP server needs `Authorization: Bearer <PAT>` on each MCP request.
- If `API_BASE_URL` is unset, calls use the placeholder `https://polarion.example.com/polarion/rest/v1`.

## Permissions: Three Separate Controls

Polarion checks three things. A failure in one does not mean the others are wrong.

1. **REST service enabled.** The instance must have its REST API active. If it is off, every call fails, including the login check.
2. **REST method permission.** The account needs the method (GET, or a write method) for the endpoint, granted globally or in a project. A GET grant in one project does not allow global endpoints such as `/user` or `/projects`. Global grants can reach project roles, but they never bypass item access.
3. **Item and resource permissions.** Access to a specific work item, document or test run is checked per item.

What this means in practice:

- `getCurrentUser` calls `GET /user`, a global endpoint. A project-only account can get a 403 there and still read its projects with `getProject(projectId)`. That 403 limits the endpoint; it is not a failed login.
- Connecting does not need global GET on Polarion 2512+: the login check uses `GET /metadata`. On 2506 there is no `/metadata`, so the check reads `GET /projects` and the user needs global REST GET. A log line `GET /projects failed: permission_denied` means exactly that.
- Do not grant global write permissions to make onboarding pass.
- Upgrading from 1.4.1 to 1.4.2 changes the login check to `/metadata`. Update the image or package and recreate the container; a restart keeps the old image.

## Connection and Login Errors (Q&A)

Direct PAT initialization, OAuth login, and refresh check authentication against Polarion (`GET <API_BASE_URL>/metadata`), and Polarion's answer decides. The server log shows it as `Polarion token probe GET /metadata failed: <category> HTTP <status> - <Polarion's message>`, for example `request_rejected HTTP 400`. The same category and status appear in the error shown to the user; Polarion's own message appears only in the log. A host-side curl can test the URL from that host, but it does not prove the Docker container can reach the same address. Use the container-side probe below for deployment diagnostics. Do not put a real PAT in a command argument, shell history, or logs.

HTTP 200 with a usable metadata response allows connection. HTTP 401 rejects the PAT; HTTP 403 denies access. The probe requires Polarion 2512+ and does not require global REST GET permission.

<!-- faq:start -->
**It says 401 "Polarion did not accept this token".**
The token was cut off, has expired, or belongs to another Polarion. Test the token with the `/metadata` request in the setup guide (docs/guides/local-npm.md or docs/troubleshooting.md) and create a new token.

**It says 403 "Polarion denied access".**
Polarion denied access. Check the user's license and REST or item permissions for the affected tool. On Polarion 2512+ the login check reads /metadata and needs no global REST GET permission. On 2506 it reads /projects, which does. A 403 during login is rejected.

**The connector login in claude.ai or ChatGPT fails or loops.**
Check `MCP_PUBLIC_URL` (exact https address, no path), the padlock, that the redirect preset or callback is allowed (`MCP_ALLOWED_REDIRECT_PRESETS=claude`; the log says `redirect_uri rejected`), and that `MCP_TOKEN_SECRET` did not change.

**Does HTTP/OAuth work with Polarion 2506?**
Yes. On 2512+ the login check calls GET /metadata and needs no global REST GET permission. 2506 has no /metadata, so the server reads GET /projects instead; that user must be allowed global REST GET. A 403 is never accepted. Tool access still follows your Polarion permissions.

**What does Bearer mean in an Authorization header?**
It is just the word Bearer, one space, then your token: `Bearer YOUR_POLARION_PAT`. Without the word Bearer the server answers 401.

**Where do I keep my token safely?**
In your personal client settings or an environment variable, never in a file inside a shared project or repository. Anyone who can read the file can act as you in Polarion. With the OAuth connectors you type the token only on the server's login page and the AI client never stores it.

**Which Polarion versions work?**
Live integration tests run against Polarion 2506, 2512 and 2606, including HTTP/OAuth. The full tool set is targeted at the newest release; 2506 and 2512 stay usable with the limits in Polarion versions. The tools are generated from a Polarion OpenAPI definition, which does not guarantee every operation on every release. Verify the operations you rely on against your own instance.

**Which AI clients can I use?**
Any client that supports MCP over stdio or Streamable HTTP. The setup guide above lists the tested paths for Claude, ChatGPT and Codex, Copilot Studio, VS Code, Gemini, Cursor, Windsurf and JetBrains. Other clients can use the generic stdio or HTTP entries, or the REST wrapper.

**It says 503 "Polarion could not be reached".**
The server got no usable answer from Polarion. Read the `Polarion token probe GET /metadata failed` line in `docker logs polarion-mcp`. Check that `API_BASE_URL` is the full `/polarion/rest/v1` URL and reachable from the MCP container (not `localhost` inside Docker). Use the container-side probe in docs/troubleshooting.md. `/health` only confirms the MCP server runs.

**Can claude.ai or ChatGPT connect to a server on my own laptop?**
The provider must reach the MCP endpoint over public HTTPS, so `http://localhost` does not work for claude.ai or ChatGPT. Polarion itself can stay private if the MCP container can reach it over your network or VPN. Desktop and command-line clients may use `http://localhost:3000/mcp`. Use a local stdio setup if you do not want to publish an endpoint.

**What is the difference between the ChatGPT connector and a Custom GPT?**
The ChatGPT connector speaks MCP and everyone signs in with their own Polarion token. A Custom GPT uses the separate REST wrapper with one shared key (`HTTP_API_KEY`), so every call runs as the one Polarion user whose token the wrapper holds.

**Certificate errors: the public HTTPS address does not work.**
For cloud connectors, ensure the MCP hostname resolves publicly, ports 80 and 443 reach the TLS proxy, and the certificate is valid for that hostname. Keep certificate verification enabled. A private Polarion hostname may still be used for the separate connection from the MCP container.

**My Polarion uses a company or self-signed certificate.**
Keep TLS verification enabled. Mount the company CA PEM into the MCP container and set `NODE_EXTRA_CA_CERTS=/certs/ca.pem` (for example `-v /path/ca.pem:/certs/ca.pem:ro -e NODE_EXTRA_CA_CERTS=/certs/ca.pem`). For npm mode, set `NODE_EXTRA_CA_CERTS` in the client environment. This adds trusted roots without disabling certificate checks.

**Should I use polarion-mcp@latest or a pinned version?**
The plain `npx -y polarion-mcp` can keep using an older copy from npm's cache. `polarion-mcp@latest` checks the registry at every start and picks up new releases, which can change the tool list without notice. `polarion-mcp@1.4.5` always runs exactly that release. Teams should pin and upgrade on purpose. To force a refresh, switch to `@latest` or a newer pinned version and restart the client.

**How do I update the Docker server?**
Choose the new tag on the GitHub package page, then run `docker pull ghcr.io/phillipboesger/polarion-mcp:NEWTAG`, `docker rm -f polarion-mcp`, and the same `docker run` command with the new tag. Keep `MCP_TOKEN_SECRET` unchanged so users stay signed in. With a team URL the administrator updates the server and you only reconnect.

**It says "Unsupported engine" or the Node version is too old.**
The package needs Node.js 22 or newer: `node -v` must print v22 or higher. Install the LTS from nodejs.org and open a new terminal; with nvm run `nvm install 22 && nvm use 22`. Desktop apps can use a different Node than your terminal, so install Node system-wide and fully restart the app. Docker avoids this because the image bundles Node 22.

**Windows: the client cannot start npx.**
Typical symptoms are `spawn npx ENOENT` or a server that never starts. Use `cmd` as the command with the arguments `/c`, `npx`, `-y`, `polarion-mcp`, because npx is `npx.cmd` on Windows. Backslashes in JSON paths must be doubled (`C:\\path\\ca.pem`). Restart the app completely after every change.

**Port 3000 is already in use.**
Change only the left number of the port mapping: `-p 127.0.0.1:3100:3000`, then use `http://localhost:3100/mcp` and set `MCP_ALLOWED_HOSTS=localhost:3100,127.0.0.1:3100`. Remove an old container with `docker rm -f polarion-mcp`. On macOS and Linux `lsof -i :3000` shows who uses the port; on Windows use `netstat -ano | findstr :3000`.

**It says 429 "Too many requests".**
The server limits requests per address. Behind a proxy set `TRUST_PROXY=1`, otherwise all users share one counter, then wait 15 minutes for the window to reset. The REST wrapper has a fixed limit per 15 minutes.

**Gemini CLI says it was replaced. Which tool should I use?**
Google's page says Gemini CLI was replaced by Antigravity CLI on 18 June 2026 for no-cost-tier and Google One users. If your Gemini CLI still runs, for example with an API key or a company license, the steps in this guide work. Antigravity CLI has its own setup that this guide does not cover yet.

**Windsurf now says Devin. Which steps do I follow?**
The vendor docs moved to docs.devin.ai and describe this configuration only for the legacy Cascade agent. If your tab uses the Devin Local agent, MCP servers are set up in Devin CLI config files, which this guide does not cover yet.

**The error says `request_rejected HTTP 400`.**
Polarion or a proxy in front of it refused the hostname in `API_BASE_URL`. Use the address your users open in the browser. For the Polarion Docker image, add the name (for example `host.docker.internal`) to `ALLOWED_HOSTS` on the Polarion container and recreate it. See "ALLOWED_HOSTS recipe" in docs/troubleshooting.md. `MCP_ALLOWED_HOSTS` is a different setting.

**Every call returns 404, or `/rest/v1` does not exist.**
The REST API is not enabled or the path is wrong. Open `https://YOUR-POLARION/polarion/rest/v1/swagger-ui` in a browser; it must load. `API_BASE_URL` has to end in `/polarion/rest/v1`. Ask your Polarion administrator to enable the REST API if the page is missing.

**The PAT page says token generation is not allowed, or my token stopped working.**
An administrator must set `com.siemens.polarion.rest.security.restApiToken.enabled=true` and restart Polarion before PATs exist. A token also stops working when it expires or is revoked. Create a new one and replace it in your client; never paste it into a chat.

**My client warns about too many tools (VS Code 128, Cursor, Windsurf 100).**
The full catalog has 284 tools. Set `MCP_TOOLSETS` (for example `work-items,documents`) or `MCP_TOOLS` on the server, add `MCP_READ_ONLY=true`, or use `MCP_MODE=discover`. In VS Code you can also untick tools in the tools picker.

**GitHub Copilot shows no MCP servers on Business or Enterprise.**
The organization policy "MCP servers in Copilot" is off by default. An organization or enterprise owner must enable it in the Copilot policies. Free and Pro plans are not affected by this policy.

**My network needs a proxy to reach Polarion.**
Set `HTTPS_PROXY` (for example `http://proxy.corp:3128`, credentials as `user:pass@` are allowed) and `NO_PROXY` (for example `.corp.example,localhost`) in the environment of the local server or the container. Only https:// Polarion URLs go through the proxy, using CONNECT. A 407 means the proxy credentials are wrong.

**My Ollama or other self-hosted model never calls the tools.**
The model must support tool calling; many small models do not. Pick one that does, enable native function calling for it in Open WebUI, and make sure the MCP URL is reachable from the Open WebUI container (use the container name, not `localhost`).
<!-- faq:end -->

### ALLOWED_HOSTS recipe

Polarion or a proxy in front of it refused the request itself, usually because it does not accept the hostname in `API_BASE_URL`. Use the address your users open in the browser (the hostname Polarion and its proxy are configured for), not an IP address or an internal alias. The log line shows Polarion's own message. If you run Polarion from the Polarion Docker image and reach it under a name that the image does not know (for example `host.docker.internal` in a local development setup), set `ALLOWED_HOSTS` on the **Polarion** container to include that name, for example `ALLOWED_HOSTS=localhost,127.0.0.1,0.0.0.0,host.docker.internal`, and recreate the Polarion container (its entrypoint rewrites the setting at start, so editing the properties file and restarting does not work). This is separate from `MCP_ALLOWED_HOSTS`, which only filters requests arriving at the MCP server.

### The server answers on /health and /mcp, but tools fail

Both only prove that the MCP server runs. Polarion is only contacted when a token is checked or a tool is called, so look at the log line above.

## Probe Polarion from the MCP container

The MCP image includes Node.js but not curl. Run this probe in Bash. It reads the PAT without echoing it, passes it through stdin, and uses the container's configured `API_BASE_URL` and certificate trust. It does not follow redirects and requires an actual metadata resource, so an SSO login page cannot pass the check.

```bash
read -rsp 'Polarion PAT: ' POLARION_PAT; printf '\n'
printf '%s' "$POLARION_PAT" | docker exec -i polarion-mcp node --input-type=module -e '
let input = "";
for await (const chunk of process.stdin) input += chunk;
try {
  const base = process.env.API_BASE_URL?.trim().replace(/\/+$/, "");
  if (!base) throw new Error("API_BASE_URL is not set");
  const response = await fetch(`${base}/metadata`, {
    headers: { Authorization: `Bearer ${input.trim()}`, Accept: "application/json" },
    redirect: "manual", signal: AbortSignal.timeout(10000)
  });
  const type = response.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
  const body = await response.json().catch(() => null);
  const valid = response.ok && ["application/json", "application/vnd.api+json"].includes(type)
    && body && typeof body === "object" && !Array.isArray(body) && !("errors" in body) && body.data?.type === "metadata" && body.data?.id === "metadata";
  console.log(`Polarion metadata HTTP ${response.status}: ${valid ? "authenticated" : "probe failed"}`);
  if (!valid) process.exitCode = 1;
} catch (error) {
  console.error(`Polarion request failed: ${error.cause?.code || error.name}`);
  process.exitCode = 1;
}
'
probe_status=$?
unset POLARION_PAT
(exit "$probe_status")
```

The PAT is not printed or placed in command arguments. An authenticated metadata response confirms the PAT on Polarion 2512+. HTTP 401 indicates a bad or expired PAT; 403 indicates denial; 400 may indicate an unacceptable hostname or request; 404 requires checking the REST URL and supported Polarion version. Redirects or HTML require checking SSO/proxy routing. For DNS, timeout, or TLS errors, check container network access and certificate trust. For a company CA, mount its PEM and set `NODE_EXTRA_CA_CERTS=/certs/company-ca.pem`; keep certificate verification enabled. `/health` checks MCP liveness only, not Polarion readiness.

## 403 Origin Rejected

- `Origin is not allowed` means a browser sent an Origin not listed in `MCP_ALLOWED_ORIGINS` and not equal to the `MCP_PUBLIC_URL` origin. Add the exact trusted origin and restart.
- Requests without an Origin header do not use this browser-origin check. Check `MCP_ALLOWED_HOSTS` separately if the Host header is rejected.

## 429 Rate Limited

- A 429 means the in-memory rate limit for that route and client/IP bucket was exceeded. Wait for its 15-minute or one-hour window to reset.
- Behind a reverse proxy, set `TRUST_PROXY` to the trusted hop count or address. Otherwise traffic may be counted under the proxy's shared IP and one client can block everyone. Check server logs and response rate-limit headers before raising limits.
- OAuth failed token ceilings can be adjusted with `MCP_RATE_LIMIT_TOKEN_IP`; registration ceiling with `MCP_RATE_LIMIT_REGISTER`. Successful token requests do not count against failure ceilings.

## redirect_uri Rejected

- Add the callback as an exact URI or trailing-slash prefix in `MCP_ALLOWED_REDIRECT_PREFIXES`, or enable a matching `MCP_ALLOWED_REDIRECT_PRESETS` name. Presets: `claude`, `chatgpt`, `vscode`, `cursor`, `copilot-studio`, `gemini`, `loopback`. Some presets intentionally contain no fixed callback; configure a verified exact callback for those clients.
- Check server logs for rejected registration URIs. CIMD clients must exactly match the redirect URI in their metadata document and use a loopback callback.

## Login Loops After Upgrade

- Resource-bound OAuth tokens use the deployment URL as their audience. After upgrading an existing deployment, users must authenticate once again. Also confirm `MCP_PUBLIC_URL` is the stable public origin and that OAuth proxy routes reach the same deployment.
- If the sealing key changed, restore the old key in `MCP_TOKEN_SECRET_PREVIOUS` during rotation, or users must log in again. An unset random key changes on restart.

## TLS or Certificate Errors

- Keep certificate verification enabled. For a company CA, set `NODE_EXTRA_CA_CERTS` to the mounted PEM path. Do not disable TLS verification.

## Tool Not Found

- Use `GET /api/tools` to list REST tool names. Check `MCP_TOOLS`, `MCP_READ_ONLY`, `MCP_TOOLSETS`, and request selectors for filters that hide the tool.

## SDK PDF Not Found

- SDK PDFs are not bundled. Copy files listed in `sdk/README.md` into `sdk/`.

## OpenAPI Generation Fails

- Ensure `openapi.json` exists at the repository root and use a valid `BEARER_TOKEN` for download.

## Missing Build Output

- Run `npm run build` to generate `build/`.
