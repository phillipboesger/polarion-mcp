# Troubleshooting

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
- Connecting does not need global GET. The login check uses `GET /metadata` on Polarion 2512+.
- Do not grant global write permissions to make onboarding pass.
- Upgrading from 1.4.1 to 1.4.2 changes the login check to `/metadata`. Update the image or package and recreate the container; a restart keeps the old image.

## Connection and Login Errors (Q&A)

Direct PAT initialization, OAuth login, and refresh check authentication against Polarion (`GET <API_BASE_URL>/metadata`), and Polarion's answer decides. The server log shows it as `Polarion token check failed: HTTP <status> - <Polarion's message>`. A host-side curl can test the URL from that host, but it does not prove the Docker container can reach the same address. Use the container-side probe below for deployment diagnostics. Do not put a real PAT in a command argument, shell history, or logs.

HTTP 200 with a usable metadata response allows connection. HTTP 401 rejects the PAT; HTTP 403 denies access. The probe requires Polarion 2512+ and does not require global REST GET permission.

**Does HTTP/OAuth work with Polarion 2506 or older?**
HTTP MCP initialization and OAuth login/refresh require Polarion 2512 or newer. They validate the PAT through GET /metadata, which is available from 2512 without global REST GET permission. Polarion 2506 and older return 404 on this endpoint, so HTTP/OAuth connections fail the preflight. Use stdio mode with API_BASE_URL and your own BEARER_TOKEN, or upgrade Polarion to 2512+. The server does not fall back to project/user listing or accept 403 as successful validation. Tool access still depends on your Polarion permissions.

**I get 401, "Polarion did not accept this token".**
Polarion does not know the token. Check that it was copied completely (no line break), has not expired or been revoked, and that API_BASE_URL points to the right Polarion instance.

**I get 403, "Polarion denied access".**
Polarion denied access. Check the user's license and REST endpoint or item permissions for the affected operation. See [Permissions: Three Separate Controls](#permissions-three-separate-controls). On Polarion 2512+, `/metadata` does not require global REST GET permission; a 403 during login is rejected rather than accepted as successful authentication.

**I get 503, "Polarion could not be reached".**
The server could not get a usable answer (the log shows why, e.g. `HTTP 404` or a connection error): wrong host, port or path in API_BASE_URL (it must end in `/polarion/rest/v1`), network or firewall between the MCP server and Polarion, Polarion down, or a TLS error (see below). The authentication probe does not follow redirects: configure API_BASE_URL with the final HTTPS host and REST path directly, rather than a redirecting alias. Test from inside the MCP container; a request from your laptop does not test the container network path.

**The server answers on /health and /mcp, but tools fail.**
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
