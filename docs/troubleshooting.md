# Troubleshooting

## HTTP Server Exits Immediately

- HTTP_API_KEY is required. Set it in your environment before starting.

## "No Polarion token is configured"

- The server starts without a token so that clients can list its tools, but refuses every call until one is set. In stdio mode and for the REST wrapper set BEARER_TOKEN to a Polarion Personal Access Token (the startup log warns when it is missing); on the Streamable HTTP server send it as `Authorization: Bearer <token>`.
- The same startup log warns when API_BASE_URL is unset and calls would go to the placeholder host.

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

## TLS or Certificate Errors

- For self-signed certificates, set NODE_TLS_REJECT_UNAUTHORIZED=0 for trusted internal servers only.

## Tool Not Found

- Use GET /api/tools to list valid tool names.
- Regenerate tools if the Polarion API version changed.

## SDK PDF Not Found

- The PDFs are not bundled; copy them into sdk/ under the names in sdk/README.md. Only present files are listed as resources.

## OpenAPI Generation Fails

- Ensure openapi.json exists at the repo root.
- Re-run download-spec with a valid BEARER_TOKEN.

## Missing Build Output

- Run npm run build to generate build/.

## read_when

- Use this guide when diagnosing setup, auth, or build issues.
