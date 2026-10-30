# Connect OpenAI Agents SDK

Python agents built with the OpenAI Agents SDK. Default: **Local**.

Official documentation: [openai.github.io](https://openai.github.io/openai-agents-python/mcp/), [openai.github.io](https://openai.github.io/openai-agents-python/ref/mcp/server/), [openai.github.io](https://openai.github.io/openai-agents-python/quickstart/)

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

1. Run: pip install openai-agents (inside a virtual environment: python -m venv .venv, then source .venv/bin/activate or .venv\Scripts\activate on Windows), and set OPENAI_API_KEY (macOS/Linux: export OPENAI_API_KEY=sk-...; PowerShell: $env:OPENAI_API_KEY = "sk-...")
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

Keep the Polarion PAT and your provider API key in your application secret store. The default client_session_timeout_seconds is 5, so the snippet raises it to 60 to give npx time on first start; the SDK docs say npx -y can download packages on first start and recommend preinstalling. MCPServerStdio closes the subprocess pipes when the async with block ends. Streamable HTTP defaults in the source: timeout 5 s, sse_read_timeout 5 min, terminate_on_close on. Python 3.10 or newer is required.

### Server

1. Run: pip install openai-agents (inside a virtual environment: python -m venv .venv, then source .venv/bin/activate or .venv\Scripts\activate on Windows), and set OPENAI_API_KEY (macOS/Linux: export OPENAI_API_KEY=sk-...; PowerShell: $env:OPENAI_API_KEY = "sk-...")
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

Put the token in headers, not in the URL. cache_tools_list=True is only for servers whose tool list rarely changes; call invalidate_tools_cache() to refresh. client_session_timeout_seconds defaults to 5 seconds. MCPServerStreamableHttp is the vendor's recommended class for self-managed remote servers. Alternative: HostedMCPTool lets OpenAI's Responses API connect to the server; it works only with OpenAI models that support hosted MCP and is not added to mcp_servers. Streamable HTTP defaults in the source: timeout 5 s, sse_read_timeout 5 min, terminate_on_close on. Python 3.10 or newer is required.

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
| Timeout while starting the server | The default client_session_timeout_seconds is 5. Raise it (the snippet uses 60) and run npx -y polarion-mcp once in a terminal so the package is cached, then retry. |
| 401 "Polarion did not accept this token" | The PAT was cut off, has expired or is for another Polarion. Create a new token and paste it unchanged. |

### Server

| Symptom | Fix |
|---|---|
| RuntimeError or 'server not initialized' | Use the server only inside the async with block, and call Runner.run before it ends. |
| 401 from the server | The header must be exactly Authorization: Bearer <your PAT>. |
| Tools list looks outdated | cache_tools_list=True caches the list. Call server.invalidate_tools_cache() or remove the option. |

## Sources

Checked against the vendor documentation on 2026-10-30.

- [Official documentation 1](https://openai.github.io/openai-agents-python/mcp/)
- [Official documentation 2](https://openai.github.io/openai-agents-python/ref/mcp/server/)
- [Official documentation 3](https://openai.github.io/openai-agents-python/quickstart/)
- [Official documentation 4](https://pypi.org/project/openai-agents/)
- [Official documentation 5](https://github.com/openai/openai-agents-python/blob/cd26bbbc52847845fde73b9952b51e62e2bcbdc0/src/agents/mcp/server.py)
- [Official documentation 6](https://github.com/openai/openai-agents-python/blob/cd26bbbc52847845fde73b9952b51e62e2bcbdc0/pyproject.toml)

Not confirmed in the vendor documentation:

- The current main branch of openai-agents-python pins mcp>=1.30.0,<3 (excluding 2.0 and 2.1); the MCP guide still shows mcp>=1.19.0,<3. Which range this server needs, and behaviour with MCP v2, was not tested against this server.
- Whether the env of MCPServerStdio is merged with or replaces the parent environment: that is implemented in the mcp SDK, not in openai-agents.

Back to the [client index](../../clients.md).
