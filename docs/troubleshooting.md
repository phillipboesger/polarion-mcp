# Troubleshooting

## HTTP Server Exits Immediately

- The REST wrapper requires `HTTP_API_KEY`. Set it before starting `build/http-server.js`.

## "No Polarion token is configured"

- Stdio and REST HTTP mode need `BEARER_TOKEN`. The Streamable HTTP MCP server needs `Authorization: Bearer <PAT>` on each MCP request.
- If `API_BASE_URL` is unset, calls use the placeholder `https://polarion.example.com/polarion/rest/v1`.

## Connection and Login Errors (Q&A)

Every token is checked against Polarion first (`GET <API_BASE_URL>/projects?page[size]=1`), and Polarion's answer decides. The server log shows it as `Polarion token check failed: HTTP <status> - <Polarion's message>`. Quick test outside this server, it separates a Polarion problem from a server problem:

```
curl -i -H "Authorization: Bearer <PAT>" "<API_BASE_URL>/projects?page[size]=1"
```

The same status there means the cause is on the Polarion side.

**I get 401, "Polarion did not accept this token".**
Polarion does not know the token. Check that it was copied completely (no line break), has not expired or been revoked, and that API_BASE_URL points to the right Polarion instance.

**I get 403, "Polarion denied access".**
Polarion knows the token but refuses the request. A new token will not help. Check in this order:
1. REST API enabled: `com.siemens.polarion.rest.enabled=true` in `polarion.properties`, then restart Polarion.
2. The token's user has a license and read access to at least one project (the curl above must return 200 for that user).
3. Nothing in front of Polarion (reverse proxy, WAF, SSO filter) blocks the REST path or the `Authorization` header. If the log line shows only a bare `HTTP 403` without Polarion's message ("you do not have the necessary permissions"), the answer most likely did not come from Polarion.

**I get 503, "Polarion could not be reached".**
The server could not get a usable answer (the log shows why, e.g. `HTTP 404` or a connection error): wrong host, port or path in API_BASE_URL (it must end in `/polarion/rest/v1`), network or firewall between the MCP server and Polarion, Polarion down, or a TLS error (see below). Run the curl from the machine that hosts the MCP server, not from your laptop.

**The server answers on /health and /mcp, but tools fail.**
Both only prove that the MCP server runs. Polarion is only contacted when a token is checked or a tool is called, so look at the log line above.

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

- Keep certificate verification enabled. For a trusted internal server with a self-signed certificate only, `NODE_TLS_REJECT_UNAUTHORIZED=0` disables verification.

## Tool Not Found

- Use `GET /api/tools` to list REST tool names. Check `MCP_TOOLS`, `MCP_READ_ONLY`, `MCP_TOOLSETS`, and request selectors for filters that hide the tool.

## SDK PDF Not Found

- SDK PDFs are not bundled. Copy files listed in `sdk/README.md` into `sdk/`.

## OpenAPI Generation Fails

- Ensure `openapi.json` exists at the repository root and use a valid `BEARER_TOKEN` for download.

## Missing Build Output

- Run `npm run build` to generate `build/`.

## read_when

- Use this guide when diagnosing setup, authentication, or build issues.
