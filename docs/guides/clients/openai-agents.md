# Connect OpenAI Agents SDK

Python agents built with the OpenAI Agents SDK. Default: **Local**.

Verification status:

- Local: verified by documentation only
- Server: verified by documentation only

## Prerequisites

### Local

- [Local (npm / npx) guide](../local-npm.md): start here if you have not set it up yet.
- Python 3.10+, OpenAI API key
- Node.js 22+

### Server

- [Server (Docker) guide](../server-docker.md): start here if you have not set it up yet.
- An OpenAI API key
- Python 3.10+

Server example (Docker team server):

```bash
docker run -d --name polarion-mcp \
  -p 127.0.0.1:3000:3000 \
  -e API_BASE_URL=https://polarion.company.example/polarion/rest/v1 \
  -e MCP_ALLOWED_HOSTS=localhost:3000,127.0.0.1:3000 \
  ghcr.io/phillipboesger/polarion-mcp:1.4.5
```

The image starts Streamable HTTP at http://localhost:3000/mcp. Each caller sends their own Polarion PAT. For team access, proxy HTTPS to the loopback port, forward the public Host, and add your public hostname to MCP_ALLOWED_HOSTS. Cloud connectors also need OAuth; their Docker choice includes that configuration.

## Steps

### Local

1. Run: pip install openai-agents, and set OPENAI_API_KEY
2. Save the snippet as polarion_agent.py
3. Replace YOUR-POLARION (URL ends in /polarion/rest/v1) and YOUR_POLARION_PAT
4. Run: python polarion_agent.py

```python
import asyncio
from agents import Agent, Runner
from agents.mcp import MCPServerStdio

async def main():
    async with MCPServerStdio(
        name="Polarion",
        params={
            "command": "npx",
            "args": ["-y", "polarion-mcp"],
            "env": {
                "API_BASE_URL": "https://YOUR-POLARION/polarion/rest/v1",
                "BEARER_TOKEN": "YOUR_POLARION_PAT",
            },
        },
        client_session_timeout_seconds=60,
    ) as server:
        agent = Agent(name="Polarion assistant", mcp_servers=[server])
        result = await Runner.run(agent, "Which Polarion user am I? Use getCurrentUser.")
        print(result.final_output)

asyncio.run(main())
```

Keep the Polarion PAT and your provider API key in your application secret store.

### Server

1. Run: pip install openai-agents, and set OPENAI_API_KEY
2. Save the snippet as polarion_agent.py
3. Replace https://YOUR-SERVER/mcp and YOUR_POLARION_PAT
4. Run: python polarion_agent.py

```python
import asyncio
from agents import Agent, Runner
from agents.mcp import MCPServerStreamableHttp

async def main():
    async with MCPServerStreamableHttp(
        name="Polarion",
        params={
            "url": "https://YOUR-SERVER/mcp",
            "headers": {"Authorization": "Bearer YOUR_POLARION_PAT"},
        },
        cache_tools_list=True,
    ) as server:
        agent = Agent(name="Polarion assistant", mcp_servers=[server])
        result = await Runner.run(agent, "Which Polarion user am I? Use getCurrentUser.")
        print(result.final_output)

asyncio.run(main())
```

Use inside your async application with openai-agents installed and Agent imported from agents. Run the agent while the server context is open. Keep API keys and PATs in your application secret store.

## Check

### Local

Ask your assistant: `Which Polarion user am I? Use getCurrentUser.`

Expected: The printed final_output names your Polarion user.

### Server

Ask your assistant: `Which Polarion user am I? Use getCurrentUser.`

Expected: The printed final_output names your Polarion user.

## If it fails

### Local

| Symptom | Fix |
|---|---|
| RuntimeError or 'server not initialized' | Use the server only inside the async with block, and call Runner.run before it ends. |
| Timeout while starting the server | Run npx -y polarion-mcp once in a terminal so the package is cached, then retry. |
| 401 "Polarion did not accept this token" | The PAT was cut off, has expired or is for another Polarion. Create a new token and paste it unchanged. |

### Server

| Symptom | Fix |
|---|---|
| RuntimeError or 'server not initialized' | Use the server only inside the async with block, and call Runner.run before it ends. |
| 401 from the server | The header must be exactly Authorization: Bearer <your PAT>. |

## Sources

Checked against the vendor documentation on 2026-10-24.

- [Official documentation 1](https://openai.github.io/openai-agents-python/mcp/)
- [Official documentation 2](https://openai.github.io/openai-agents-python/ref/mcp/server/)

Not confirmed in the vendor documentation:

- Minimum Python version.
- The official MCP guide shows 'pip install' only for the mcp package pins; 'pip install openai-agents' is the package name used by the repo.
- client_session_timeout_seconds is documented as a constructor option for MCPServerStreamableHttp; for MCPServerStdio it is assumed to exist on the shared base class (not shown on the page).
- Environment variables for stdio: MCPServerStdioParams includes env (verified in the API reference).

Back to the [client index](../../clients.md).
