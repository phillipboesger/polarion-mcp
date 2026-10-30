# Connect Custom GPT Actions

Custom GPT with Actions over REST/OpenAPI. Default: **Server**.

Verification status:

- Server: verified by documentation only

- **Local is not supported:** GPT Actions need a public REST wrapper, not the MCP server or npx.

## Prerequisites

### Server

- [Server (Docker) guide](../server-docker.md): start here if you have not set it up yet.
- ChatGPT plan with GPT Actions
- REST wrapper URL and HTTP_API_KEY

Server example (REST wrapper / OpenAPI):

```bash
docker run -d --name polarion-rest \
  -p 127.0.0.1:3000:3000 \
  -e API_BASE_URL=https://YOUR-POLARION/polarion/rest/v1 \
  -e BEARER_TOKEN=YOUR_POLARION_PAT \
  -e HTTP_API_KEY=YOUR_WRAPPER_API_KEY \
  -e PUBLIC_URL=https://YOUR-SERVER \
  -e TRUST_PROXY=1 \
  ghcr.io/phillipboesger/polarion-mcp:1.4.5 \
  node build/http-server.js
```

All calls use the deployment PAT. Clients send Authorization: Bearer <HTTP_API_KEY>. Serve this behind HTTPS; schemas are at /openapi.json and /openapi-gpt.json. Forward the public Host through your TLS proxy. HTTP_API_KEY is a random secret you invent (for example from openssl rand -hex 32); callers send it as the Bearer token. TRUST_PROXY=1 lets the 100-requests-per-15-minutes limit count each caller separately behind your proxy.

## Steps

### Server

1. Ask your admin for https://YOUR-SERVER/openapi-gpt.json and the HTTP_API_KEY.
2. Open your GPT editor, go to Actions and add a new action.
3. Import the schema from https://YOUR-SERVER/openapi-gpt.json.
4. Set authentication to API Key with Bearer style and paste HTTP_API_KEY.
5. Click Test and run getProject with your projectId.
6. Save or update the GPT.

```
https://YOUR-SERVER/openapi-gpt.json
```

Calls run as one fixed Polarion user (the deployment PAT), not your own.

## Check

### Server

Ask your assistant: `Show project YOUR_PROJECT_ID. Use getProject.`

Expected: The GPT asks to allow the action, then shows the project with that ID.

## If it fails

### Server

| Symptom | Fix |
|---|---|
| Test returns 401 or 403 | Re-enter HTTP_API_KEY, choose API Key with Bearer style, and avoid extra spaces. |
| Schema import fails | The REST wrapper must be reachable over HTTPS. The schema address needs no key. |

## Sources

Checked against the vendor documentation on 2026-10-24.

- [Official documentation 1](https://developers.openai.com/api/docs/actions/getting-started)
- [Official documentation 2](https://developers.openai.com/api/docs/actions/authentication)

Not confirmed in the vendor documentation:

- Exact current GPT editor labels (Configure tab, 'Create new action', 'Import from URL', Auth Type 'Bearer'): OpenAI's developer pages describe only 'Action section', 'paste in your Open API schema', 'authentication settings' (None / API Key / OAuth) and the Test button. The steps use those and avoid other labels.
- Which ChatGPT plans can create GPTs with Actions.
- Schema import by URL and the Bearer sub-option of API Key: not stated in the pages checked (help.openai.com returned 403).
- Behaviour: the openapi-gpt.json address must not require a key; the repo's http-server.ts lets /openapi-gpt.json bypass the key check, which is consistent.

Back to the [client index](../../clients.md).
