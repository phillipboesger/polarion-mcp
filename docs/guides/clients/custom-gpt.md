# Connect Custom GPT Actions

Custom GPT with Actions over REST/OpenAPI. Default: **Server**.

Official documentation: [developers.openai.com](https://developers.openai.com/api/docs/actions/getting-started), [developers.openai.com](https://developers.openai.com/api/docs/actions/authentication)

Verification status:

- Server: verified by documentation only

- **Local is not supported:** GPT Actions need a public REST wrapper, not the MCP server or npx.

## Prerequisites

### Server

- [Server (Docker) guide](../server-docker.md): start here if you have not set it up yet.
- ChatGPT plan that can create GPTs with Actions
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
  ghcr.io/phillipboesger/polarion-mcp:1.5.0 \
  node build/http-server.js
```

All calls use the deployment PAT. Clients send Authorization: Bearer <HTTP_API_KEY>. Serve this behind HTTPS; schemas are at /openapi.json and /openapi-gpt.json. Forward the public Host through your TLS proxy. HTTP_API_KEY is a random secret you invent (for example from openssl rand -hex 32); callers send it as the Bearer token. TRUST_PROXY=1 lets the 100-requests-per-15-minutes limit count each caller separately behind your proxy.

## Steps

### Server

1. Ask your admin for https://YOUR-SERVER/openapi-gpt.json and the HTTP_API_KEY.
2. Open your GPT editor. Enter a name, description and image for the GPT if you have not yet.
3. Open the Action section and paste in the OpenAPI schema. To get it, open https://YOUR-SERVER/openapi-gpt.json in a browser and copy the content (the address needs no key). Note the action names, for example getProject, and their parameters.
4. Open the authentication settings and choose API Key. Paste HTTP_API_KEY and select the Bearer style if the editor offers one. The key is stored encrypted.
5. Click the Test button next to the action and run getProject with your projectId. It shows the detailed input and output.
6. Back on the main page, add instructions with Context, Instructions and Additional Notes sections. Name the actions and their parameters there, for example getProject with projectId.
7. Save or update the GPT, then check it with 5 to 10 typical questions and confirm it calls the right actions with the right parameters.

```
https://YOUR-SERVER/openapi-gpt.json
```

Calls run as one fixed Polarion user (the deployment PAT), not your own. OpenAI recommends clear schema descriptions: ChatGPT reads the info section, especially description, to decide whether an action fits a question. OAuth, with a callback URL of the form https://chatgpt.com/aip/g-YOUR-GPT-ID/oauth/callback, is a vendor option but is not used by this server.

## Check

### Server

Ask your assistant: `Show project YOUR_PROJECT_ID. Use getProject.`

Expected: The GPT asks to allow the action, then shows the project with that ID.

## If it fails

### Server

| Symptom | Fix |
|---|---|
| Test returns 401 or 403 | Re-enter HTTP_API_KEY, choose API Key with Bearer style, and avoid extra spaces. |
| Schema import fails | The REST wrapper must be reachable over HTTPS. The schema address needs no key. If import by URL is not offered, paste the schema content into the Action section. |
| The GPT answers without calling the action, or picks the wrong one | Name the action and its parameters in the GPT instructions, and make the schema descriptions clear. Use the Test button to see the exact input and output. |

## Sources

Checked against the vendor documentation on 2026-10-30.

- [Official documentation 1](https://developers.openai.com/api/docs/actions/getting-started)
- [Official documentation 2](https://developers.openai.com/api/docs/actions/authentication)

Not confirmed in the vendor documentation:

- Which ChatGPT plans can create GPTs with Actions: not stated on the Actions pages; help.openai.com returns 403 to our fetcher.
- Current editor labels: the Actions pages only name the 'Action section', 'paste in the OpenAPI schema', authentication settings (None, API Key, OAuth) and the Test button. Labels such as Configure tab, Create new action or Import from URL are not documented there.
- Sub-options of API Key (Basic, Bearer, Custom): the authentication page does not describe them. It only says the user's token is sent in the Authorization header as '[Bearer/Basic] [token]' for OAuth. Whether the Bearer choice exists for API Key is therefore unconfirmed.
- Limits (schema size, timeouts, action count): not stated by OpenAI on these pages.

Back to the [client index](../../clients.md).
