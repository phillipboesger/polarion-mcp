# Local (npm / npx)

The client starts `npx -y polarion-mcp` on your computer and talks to it over stdio (standard input and output). Nothing is hosted and no port is opened.

Your client starts the server on your computer (stdio). Needs Node.js 22+ and a Polarion token.

## Prerequisites

### Node.js 22 or newer

Install the LTS from https://nodejs.org, open a new terminal and check that it prints v22 or higher:
```
node -v
```

### Polarion REST URL and token (PAT)

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

### Optional: start the server once

macOS and Linux:
```
API_BASE_URL=https://YOUR-POLARION/polarion/rest/v1 BEARER_TOKEN=YOUR_PAT npx -y polarion-mcp
```
PowerShell: `$env:API_BASE_URL='...'; $env:BEARER_TOKEN='...'; npx -y polarion-mcp`
- No output is normal, it waits for a client. Stop with Ctrl+C.
- Use `polarion-mcp@latest` in the client config for updates, or `polarion-mcp@1.4.3` to pin.

Next: [choose your client](../clients.md).
