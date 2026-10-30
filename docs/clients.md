# Connect your client

The landing page lists every client and links here. Pick the guide for your client.

## Two setups

- **Local:** your client starts `npx -y polarion-mcp` on your computer. Needs Node.js 22+ and a Polarion token. See [Local setup](guides/local-npm.md).
- **Server:** you host the server with Docker and the client connects by URL. Cloud clients (claude.ai, ChatGPT) also need public HTTPS and OAuth. See [Server setup](guides/server-docker.md).

Connecting to a team's server URL is the client side of the Server setup: it needs a running server, yours or your team's.

## Clients

| Client | Local | Server | Guide |
|---|---|---|---|
| Claude Desktop | Yes (docs) | Yes (docs) | [Open guide](https://github.com/phillipboesger/polarion-mcp/blob/main/docs/guides/clients/claude-desktop.md) |
| claude.ai | No | Yes (docs) | [Open guide](https://github.com/phillipboesger/polarion-mcp/blob/main/docs/guides/clients/claude-web-desktop.md) |
| Claude Code | Yes (docs) | Yes (docs) | [Open guide](https://github.com/phillipboesger/polarion-mcp/blob/main/docs/guides/clients/claude-code.md) |
| Claude API | No | Yes (docs) | [Open guide](https://github.com/phillipboesger/polarion-mcp/blob/main/docs/guides/clients/claude-api.md) |
| ChatGPT connector | No | Yes (docs) | [Open guide](https://github.com/phillipboesger/polarion-mcp/blob/main/docs/guides/clients/chatgpt-apps.md) |
| Custom GPT Actions | No | Yes (docs) | [Open guide](https://github.com/phillipboesger/polarion-mcp/blob/main/docs/guides/clients/custom-gpt.md) |
| OpenAI Responses API | No | Yes (docs) | [Open guide](https://github.com/phillipboesger/polarion-mcp/blob/main/docs/guides/clients/openai-api.md) |
| OpenAI Agents SDK | Yes (docs) | Yes (docs) | [Open guide](https://github.com/phillipboesger/polarion-mcp/blob/main/docs/guides/clients/openai-agents.md) |
| Codex | Yes (docs) | Yes (docs) | [Open guide](https://github.com/phillipboesger/polarion-mcp/blob/main/docs/guides/clients/codex-cli.md) |
| Microsoft Copilot Studio | No | Yes (docs) | [Open guide](https://github.com/phillipboesger/polarion-mcp/blob/main/docs/guides/clients/copilot-studio.md) |
| GitHub Copilot | Yes (docs) | Yes (docs) | [Open guide](https://github.com/phillipboesger/polarion-mcp/blob/main/docs/guides/clients/github-copilot.md) |
| Antigravity (CLI + IDE) | Yes (docs) | Yes (docs) | [Open guide](https://github.com/phillipboesger/polarion-mcp/blob/main/docs/guides/clients/antigravity.md) |
| Gemini Enterprise | No | Yes (docs) | [Open guide](https://github.com/phillipboesger/polarion-mcp/blob/main/docs/guides/clients/gemini-enterprise.md) |
| Cursor | Yes (docs) | Yes (docs) | [Open guide](https://github.com/phillipboesger/polarion-mcp/blob/main/docs/guides/clients/cursor.md) |
| Windsurf / Cascade | Yes (docs) | Yes (docs) | [Open guide](https://github.com/phillipboesger/polarion-mcp/blob/main/docs/guides/clients/windsurf.md) |
| JetBrains AI Assistant | Yes (docs) | No | [Open guide](https://github.com/phillipboesger/polarion-mcp/blob/main/docs/guides/clients/jetbrains-ai.md) |
| Docker team server | No | Yes (docs) | [Open guide](https://github.com/phillipboesger/polarion-mcp/blob/main/docs/guides/clients/docker.md) |
| Other AI provider / any MCP client | Yes (docs) | Yes (docs) | [Open guide](https://github.com/phillipboesger/polarion-mcp/blob/main/docs/guides/clients/generic-stdio.md) |
| Generic HTTP client | No | Yes (docs) | [Open guide](https://github.com/phillipboesger/polarion-mcp/blob/main/docs/guides/clients/generic-http.md) |
| REST wrapper / OpenAPI | No | Yes (docs) | [Open guide](https://github.com/phillipboesger/polarion-mcp/blob/main/docs/guides/clients/rest-wrapper.md) |
| n8n REST workflow | No | Yes (docs) | [Open guide](https://github.com/phillipboesger/polarion-mcp/blob/main/docs/guides/clients/n8n.md) |
| Microsoft 365 Copilot / Teams | No | Yes (docs) | [Open guide](https://github.com/phillipboesger/polarion-mcp/blob/main/docs/guides/clients/m365-copilot.md) |
| Mistral Le Chat | No | Yes (docs) | [Open guide](https://github.com/phillipboesger/polarion-mcp/blob/main/docs/guides/clients/mistral-le-chat.md) |
| Self-hosted models (Open WebUI) | No | Yes (docs) | [Open guide](https://github.com/phillipboesger/polarion-mcp/blob/main/docs/guides/clients/self-hosted.md) |

Guides record the vendor sources checked on 2026-10-24. In the table, **developer** means the maintainer ran the setup end to end and recorded it in a dated `verified` block in the guide. **docs** means the setup follows the vendor documentation but was not run by the maintainer. The source of truth is [clients.json](clients.json); run `npm run docs:clients` and `npm run docs:site` after editing it.

## Team server prerequisites

Cloud connectors need a server reachable by their provider. Deploy Streamable HTTP with TLS, `MCP_PUBLIC_URL`, a stable `MCP_TOKEN_SECRET`, trusted proxy settings, and exact OAuth redirect allowlists. Claude can use `MCP_ALLOWED_REDIRECT_PRESETS=claude` and Microsoft 365 Copilot `m365`; ChatGPT supplies its callback during setup. Use DCR unless CIMD is explicitly enabled on the server. Follow [deployment](deployment.md) for TLS and OAuth, and see [security](security.md) and [configuration](configuration.md).

## Optional smaller tool lists

The full catalog remains enabled by default. If you prefer a smaller list for a particular connection, choose the selector that matches the setup:

- **Claude Desktop, Claude Code, Codex, VS Code, Cursor, Windsurf, Antigravity, and other local stdio clients:** set `MCP_TOOLSETS` on the local server process (for example `MCP_TOOLSETS=work-items,documents`) or `MCP_TOOLS` to an explicit comma-separated allowlist. Add `MCP_READ_ONLY=true` to expose only read-only tools. Set `MCP_MODE=discover` to expose `search_tools`, `describe_tool`, and `call_tool` for the enabled tools.
- **claude.ai, ChatGPT, Copilot Studio, and other HTTP clients:** the server administrator can set `MCP_TOOLSETS` or `MCP_READ_ONLY` for every connection. An HTTP client can narrow an individual request with `X-MCP-Toolsets: work-items,documents`, or connect to `/mcp/work-items,documents`. `MCP_TOOLS` is a server environment allowlist. `MCP_MODE=discover` is also a server setting and presents the three discovery tools instead of the full tool list.
- **REST wrapper clients:** `/api/tools` lists the wrapper's configured operations. The wrapper does not use MCP toolset selectors; use the MCP endpoint when you need `MCP_TOOLSETS`, `MCP_TOOLS`, `MCP_READ_ONLY`, or discovery mode.

These are optional configuration choices for managing the tool surface. Client-specific tool limits are not assumed. See [usage](usage.md) and [configuration](configuration.md) for selector behavior and accepted toolset names.

## More questions

### It says 401 "Polarion did not accept this token".

The token was cut off, has expired, or belongs to another Polarion. Test the token with the `/metadata` request in the setup guide (docs/guides/local-npm.md or docs/troubleshooting.md) and create a new token.

### It says 403 "Polarion denied access".

Polarion denied access. Check the user's license and REST or item permissions for the affected tool. The metadata authentication probe requires Polarion 2512+ and does not require global REST GET permission. A 403 during login is rejected.

### The connector login in claude.ai or ChatGPT fails or loops.

Check `MCP_PUBLIC_URL` (exact https address, no path), the padlock, that the redirect preset or callback is allowed (`MCP_ALLOWED_REDIRECT_PRESETS=claude`; the log says `redirect_uri rejected`), and that `MCP_TOKEN_SECRET` did not change.

### Does HTTP/OAuth work with Polarion 2506 or older?

HTTP MCP and OAuth need Polarion 2512+: the login check calls GET /metadata, which older versions answer with 404. Use the local setup (stdio with your own BEARER_TOKEN) or upgrade Polarion. The server does not fall back to project listing or accept a 403. Tool access still follows your Polarion permissions.

### What does Bearer mean in an Authorization header?

It is just the word Bearer, one space, then your token: `Bearer YOUR_POLARION_PAT`. Without the word Bearer the server answers 401.

### Where do I keep my token safely?

In your personal client settings or an environment variable, never in a file inside a shared project or repository. Anyone who can read the file can act as you in Polarion. With the OAuth connectors you type the token only on the server's login page and the AI client never stores it.

### Which Polarion versions work?

Live integration tests run against Polarion 2506 (stdio) and 2606. HTTP/OAuth connectors such as claude.ai and ChatGPT need Polarion 2512 or newer. The tools are generated from a Polarion OpenAPI definition, which does not guarantee every operation on every release. Verify the operations you rely on against your own instance.

### Which AI clients can I use?

Any client that supports MCP over stdio or Streamable HTTP. The setup guide above lists the tested paths for Claude, ChatGPT and Codex, Copilot Studio, VS Code, Gemini, Cursor, Windsurf and JetBrains. Other clients can use the generic stdio or HTTP entries, or the REST wrapper.

### It says 503 "Polarion could not be reached".

The server got no usable answer from Polarion. Read the `Polarion token probe GET /metadata failed` line in `docker logs polarion-mcp`. Check that `API_BASE_URL` is the full `/polarion/rest/v1` URL and reachable from the MCP container (not `localhost` inside Docker). Use the container-side probe in docs/troubleshooting.md. `/health` only confirms the MCP server runs.

### Can claude.ai or ChatGPT connect to a server on my own laptop?

The provider must reach the MCP endpoint over public HTTPS, so `http://localhost` does not work for claude.ai or ChatGPT. Polarion itself can stay private if the MCP container can reach it over your network or VPN. Desktop and command-line clients may use `http://localhost:3000/mcp`. Use a local stdio setup if you do not want to publish an endpoint.

### What is the difference between the ChatGPT connector and a Custom GPT?

The ChatGPT connector speaks MCP and everyone signs in with their own Polarion token. A Custom GPT uses the separate REST wrapper with one shared key (`HTTP_API_KEY`), so every call runs as the one Polarion user whose token the wrapper holds.

### Certificate errors: the public HTTPS address does not work.

For cloud connectors, ensure the MCP hostname resolves publicly, ports 80 and 443 reach the TLS proxy, and the certificate is valid for that hostname. Keep certificate verification enabled. A private Polarion hostname may still be used for the separate connection from the MCP container.

### My Polarion uses a company or self-signed certificate.

Keep TLS verification enabled. Mount the company CA PEM into the MCP container and set `NODE_EXTRA_CA_CERTS=/certs/ca.pem` (for example `-v /path/ca.pem:/certs/ca.pem:ro -e NODE_EXTRA_CA_CERTS=/certs/ca.pem`). For npm mode, set `NODE_EXTRA_CA_CERTS` in the client environment. This adds trusted roots without disabling certificate checks.

### Should I use polarion-mcp@latest or a pinned version?

The plain `npx -y polarion-mcp` can keep using an older copy from npm's cache. `polarion-mcp@latest` checks the registry at every start and picks up new releases, which can change the tool list without notice. `polarion-mcp@1.4.5` always runs exactly that release. Teams should pin and upgrade on purpose. To force a refresh, switch to `@latest` or a newer pinned version and restart the client.

### How do I update the Docker server?

Choose the new tag on the GitHub package page, then run `docker pull ghcr.io/phillipboesger/polarion-mcp:NEWTAG`, `docker rm -f polarion-mcp`, and the same `docker run` command with the new tag. Keep `MCP_TOKEN_SECRET` unchanged so users stay signed in. With a team URL the administrator updates the server and you only reconnect.

### It says "Unsupported engine" or the Node version is too old.

The package needs Node.js 22 or newer: `node -v` must print v22 or higher. Install the LTS from nodejs.org and open a new terminal; with nvm run `nvm install 22 && nvm use 22`. Desktop apps can use a different Node than your terminal, so install Node system-wide and fully restart the app. Docker avoids this because the image bundles Node 22.

### Windows: the client cannot start npx.

Typical symptoms are `spawn npx ENOENT` or a server that never starts. Use `cmd` as the command with the arguments `/c`, `npx`, `-y`, `polarion-mcp`, because npx is `npx.cmd` on Windows. Backslashes in JSON paths must be doubled (`C:\\path\\ca.pem`). Restart the app completely after every change.

### Port 3000 is already in use.

Change only the left number of the port mapping: `-p 127.0.0.1:3100:3000`, then use `http://localhost:3100/mcp` and set `MCP_ALLOWED_HOSTS=localhost:3100,127.0.0.1:3100`. Remove an old container with `docker rm -f polarion-mcp`. On macOS and Linux `lsof -i :3000` shows who uses the port; on Windows use `netstat -ano | findstr :3000`.

### It says 429 "Too many requests".

The server limits requests per address. Behind a proxy set `TRUST_PROXY=1`, otherwise all users share one counter, then wait 15 minutes for the window to reset. The REST wrapper has a fixed limit per 15 minutes.

### Gemini CLI says it was replaced. Which tool should I use?

Google's page says Gemini CLI was replaced by Antigravity CLI on 18 June 2026 for no-cost-tier and Google One users. If your Gemini CLI still runs, for example with an API key or a company license, the steps in this guide work. Antigravity CLI has its own setup that this guide does not cover yet.

### Windsurf now says Devin. Which steps do I follow?

The vendor docs moved to docs.devin.ai and describe this configuration only for the legacy Cascade agent. If your tab uses the Devin Local agent, MCP servers are set up in Devin CLI config files, which this guide does not cover yet.

### The error says `request_rejected HTTP 400`.

Polarion or a proxy in front of it refused the hostname in `API_BASE_URL`. Use the address your users open in the browser. For the Polarion Docker image, add the name (for example `host.docker.internal`) to `ALLOWED_HOSTS` on the Polarion container and recreate it. See "ALLOWED_HOSTS recipe" in docs/troubleshooting.md. `MCP_ALLOWED_HOSTS` is a different setting.

### Every call returns 404, or `/rest/v1` does not exist.

The REST API is not enabled or the path is wrong. Open `https://YOUR-POLARION/polarion/rest/v1/swagger-ui` in a browser; it must load. `API_BASE_URL` has to end in `/polarion/rest/v1`. Ask your Polarion administrator to enable the REST API if the page is missing.

### The PAT page says token generation is not allowed, or my token stopped working.

An administrator must set `com.siemens.polarion.rest.security.restApiToken.enabled=true` and restart Polarion before PATs exist. A token also stops working when it expires or is revoked. Create a new one and replace it in your client; never paste it into a chat.

### My client warns about too many tools (VS Code 128, Cursor, Windsurf 100).

The full catalog has 284 tools. Set `MCP_TOOLSETS` (for example `work-items,documents`) or `MCP_TOOLS` on the server, add `MCP_READ_ONLY=true`, or use `MCP_MODE=discover`. In VS Code you can also untick tools in the tools picker.

### GitHub Copilot shows no MCP servers on Business or Enterprise.

The organization policy "MCP servers in Copilot" is off by default. An organization or enterprise owner must enable it in the Copilot policies. Free and Pro plans are not affected by this policy.

### My network needs a proxy to reach Polarion.

Set `HTTPS_PROXY` (for example `http://proxy.corp:3128`, credentials as `user:pass@` are allowed) and `NO_PROXY` (for example `.corp.example,localhost`) in the environment of the local server or the container. Only https:// Polarion URLs go through the proxy, using CONNECT. A 407 means the proxy credentials are wrong.

### My Ollama or other self-hosted model never calls the tools.

The model must support tool calling; many small models do not. Pick one that does, enable native function calling for it in Open WebUI, and make sure the MCP URL is reachable from the Open WebUI container (use the container name, not `localhost`).
