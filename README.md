<div align="center">

# Polarion MCP

**Your Polarion work, one conversation away.**

Find requirements, review documents and prepare test runs through your AI assistant.
An open-source [Model Context Protocol](https://modelcontextprotocol.io) server with **284 tools** generated from the Polarion REST API.

[![CI](https://github.com/phillipboesger/polarion-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/phillipboesger/polarion-mcp/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/polarion-mcp)](https://www.npmjs.com/package/polarion-mcp)
[![Docker image](https://img.shields.io/badge/ghcr.io-polarion--mcp-2496ED?logo=docker&logoColor=white)](https://github.com/phillipboesger/polarion-mcp/pkgs/container/polarion-mcp)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

[**Connect your assistant**](https://polarion-mcp.boesger.com/#clients) · [Daily workflows](https://polarion-mcp.boesger.com/#daily-use) · [Tool catalog](src/tools.ts)

</div>

On this page:

- [What the connector does for you](#what-the-connector-does-for-you)
- [A day with Polarion MCP](#a-day-with-polarion-mcp)
- [Get connected](#get-connected)
- [FAQ](#faq)
- [Feedback and community](#feedback-and-community)
- [Documentation](#documentation)
- [License](#license)

## What the connector does for you

**Your AI client → Polarion MCP → your Polarion REST API.** Ask a question; the assistant chooses tools, reads the returned data and proposes an answer or change.

- **Find answers:** search requirements and defects, read LiveDocs and inspect traceability links.
- **Prepare work:** draft test cases, prepare runs and record the test outcomes your team supplies.
- **Control changes:** `MCP_READ_ONLY=1` exposes read-only tools and blocks writes. With writes enabled, `dry_run: true` previews a mutating REST request without sending the write. Set approval rules in your AI client; previews do not create an approval lock.
- **Inspect what you run:** MIT source, release SBOMs, build provenance and signed container images. See [supply-chain verification](docs/quality/supply-chain.md).

| Domain | Outcome |
|---|---|
| Work items | Find requirements, triage defects, prepare field updates. |
| Documents and pages | Read LiveDocs, inspect parts, manage attachments and supported pages. |
| Test management | Prepare runs and record supplied results. |
| Plans and collections | Review release scope and document collections. |
| Projects, people and configuration | Discover accessible projects, users, allowed field values and metadata. |

The [landing page](https://polarion-mcp.boesger.com/#features) shows counts by domain, computed from `src/tools.ts`. The **284 tools** count covers generated REST operations; configured toolsets and additional helpers change the exposed catalog. Selected Work Item writes validate enumeration values, custom-field keys and user references. [Features and limits](docs/features.md) describe the scope.

## A day with Polarion MCP

These are illustrative conversations using real tools, not recorded outputs. Project types, link roles and permissions vary.

| Ask your assistant | Tools and result | Your control |
|---|---|---|
| “Which open defects could block this release?” | `getWorkItems`, `getWorkItem`: a scoped list of severity, owners and missing information. | Read-only triage; approve any later reassignment. |
| “Review this LiveDoc and propose clearer acceptance criteria for REQ-17.” | `getDocument`, `getDocumentParts`, `getWorkItem`, `patchWorkItem`: a rewrite of the requirement’s description. | Preview with `dry_run: true`; approve before saving. |
| “Draft tests from these requirements, then record the results I provide.” | `getWorkItems`, `postWorkItems`, `postTestRuns`, `postTestRecords`: proposed cases and a run, then supplied outcomes. | Check existing tests, preview each write and approve. The connector does not execute product tests. |
| “Summarize this release plan and its latest test runs.” | `getPlan`, `getWorkItems`, `getTestRuns`: a draft status update with source IDs and missing data. | You decide release readiness. |
| “Find requirements without a verifies link to a test case.” | `getWorkItems`, `getLinkedWorkItems`: a scoped gap list and existing candidate tests. | Confirm link roles and scope before creating anything. |

[Explore the chat-style walkthroughs](https://polarion-mcp.boesger.com/#daily-use). For larger work, follow the [worked task](docs/example-task.md): read items one by one, check existing coverage, propose changes, then verify the result.

## Get connected

**First: how do you run the server?** You need a REST-enabled Polarion instance and a PAT.

| Server choice | Use it when | What runs |
|---|---|---|
| **npm / npx** | Your desktop or coding client supports local MCP. | The client launches a stdio process with Node.js 22+ and your PAT. |
| **Docker** | You are setting up your own or a team server. | Streamable HTTP, with each caller’s PAT. Add HTTPS and OAuth for cloud connectors. |
| **Remote URL** | Your team already hosts it. | Nothing to install locally; get the endpoint from your administrator. |

Choose your client in the [inline setup picker](https://polarion-mcp.boesger.com/#clients). It recommends a server choice, explains unsupported options, and shows the server command, client snippet and short steps together. Claude Desktop, Claude Code, Cursor and VS Code accept local or remote setups. **claude.ai and ChatGPT’s hosted connector path use a reachable HTTPS server**, rather than directly launching npx. OpenAI also offers [Secure MCP Tunnel](https://developers.openai.com/api/docs/guides/secure-mcp-tunnels) for private servers; that requires separate setup and permissions.

<!-- clients:start -->
| Group | Setup |
|---|---|
| [Claude](https://polarion-mcp.boesger.com/#setup/claude-desktop) | Claude Desktop and Claude Code: local or remote; claude.ai and API: HTTPS server. |
| [ChatGPT / APIs](https://polarion-mcp.boesger.com/#setup/chatgpt-apps) | ChatGPT connector and Responses API: HTTPS; GPT Actions: REST/OpenAPI; SDK and Codex: local or remote. |
| [Editors / other providers](https://polarion-mcp.boesger.com/#setup/cursor) | VS Code, Cursor, Gemini and more; client-specific steps and supported server choices. |
| [Custom / team server](https://polarion-mcp.boesger.com/#setup/generic-stdio) | Other AI provider / any MCP client: stdio or HTTP; Docker, REST/OpenAPI and n8n. |
<!-- clients:end -->

**Local example:** paste this into Claude Desktop’s Developer config or a compatible client’s private MCP settings. Replace the URL and PAT, merge with existing settings, then reconnect. Fully quit and restart Claude Desktop.

```json
{
  "mcpServers": {
    "polarion": {
      "command": "npx",
      "args": ["-y", "polarion-mcp"],
      "env": {
        "API_BASE_URL": "https://YOUR-POLARION/polarion/rest/v1",
        "BEARER_TOKEN": "YOUR_POLARION_PAT"
      }
    }
  }
}
```

**Docker example:** the published image starts an HTTP server on a loopback port.

```bash
docker run -d --name polarion-mcp \
  -p 127.0.0.1:3000:3000 \
  -e API_BASE_URL=https://YOUR-POLARION/polarion/rest/v1 \
  -e MCP_ALLOWED_HOSTS=localhost:3000,127.0.0.1:3000 \
  ghcr.io/phillipboesger/polarion-mcp:1.4.0
```

For a local HTTP client, use `http://localhost:3000/mcp` with `Authorization: Bearer YOUR_POLARION_PAT`. For a team, proxy HTTPS to that port and add the public hostname to `MCP_ALLOWED_HOSTS`. Cloud connectors also need `MCP_PUBLIC_URL`, a stable `MCP_TOKEN_SECRET`, exact redirect allowlists and a `TRUST_PROXY` setting matching the real proxy chain. The picker includes that server configuration for claude.ai and ChatGPT. See [deployment](docs/deployment.md#docker) for operations details.

**Other AI provider / any MCP client:** choose [the generic entry](https://polarion-mcp.boesger.com/#setup/generic-stdio) for stdio or HTTP connection shapes. For OpenAPI clients, Custom GPT Actions and n8n, run the **separate REST wrapper** with a deployment PAT and `HTTP_API_KEY`; the [REST setup](https://polarion-mcp.boesger.com/#setup/rest-wrapper) includes its command and schema URLs.

Keep credentials out of Git. There is no public Polarion relay. Finish with a read-only check: “List the Polarion projects I can access.” [Vendor sources and compatibility notes](docs/clients.md) explain the documented paths.

## FAQ

<details><summary>Which setup do I need?</summary>

Start with npx for a local desktop or coding client. Use Docker to host a server, or Remote URL if your team already runs one. claude.ai and ChatGPT’s hosted connector path need HTTPS and OAuth. Custom GPT Actions uses the REST wrapper. The picker shows supported choices per client.

</details>
<details><summary>Is my data safe? Which permissions apply?</summary>

Polarion enforces the token owner’s permissions. Stdio uses the configured PAT; remote MCP uses each caller’s PAT directly or through OAuth login. REST calls use the deployment PAT. Results go back to your AI client, so provider data policies and your organization’s rules apply. Use HTTPS remotely and grant only the access you need.

</details>
<details><summary>Can I use read-only mode?</summary>

Set `MCP_READ_ONLY=1` in the server environment and restart or reconnect. Only read-only tools are exposed and writes are blocked. In a write-enabled session, `dry_run: true` previews a mutating REST request without saving it.

</details>
<details><summary>Which Polarion versions work?</summary>

Live integration tests have passed on **Polarion 2506 and 2606**. Generated tools do not guarantee identical coverage on every version. REST enablement, available endpoints and permissions affect behavior; verify the operations you rely on. See [version support](docs/polarion-versioning.md).

</details>
<details><summary>Which AI clients can I use?</summary>

Use any compatible MCP stdio or Streamable HTTP client, or the separate REST/OpenAPI wrapper. The picker includes major assistants, IDEs and a generic provider entry. Account permissions and tool budgets vary; restrict the exposed toolset when needed.

</details>
<details><summary>How do I update?</summary>

For local npx, refresh the package and reconnect. Use `npx -y polarion-mcp@latest` through your client, or pin a release for predictable updates. For Docker, pull your chosen release tag and recreate the container with the same configuration and stable OAuth secret. A team server’s administrator updates it; clients refresh the tool list or reconnect. OpenAPI regeneration is a maintainer task.

</details>

## Feedback and community

**Feedback and questions:** [open an issue](https://github.com/phillipboesger/polarion-mcp/issues). Include what you tried, your client and server mode, and what you expected. Leave credentials out.

Nothing documented for your case? Open an issue or PR on the repo and go wild. A clearer example, a small fix or a new integration can help the next team. Read [Contributing](CONTRIBUTING.md) for source builds and checks. Report vulnerabilities through the [security policy](SECURITY.md).

Built by [Phillip Bösger](https://github.com/phillipboesger), building on [@Jonasdero](https://github.com/Jonasdero).

## Documentation

[Docs index](docs/README.md) · [Configuration](docs/configuration.md) · [Deployment](docs/deployment.md) · [Security](docs/security.md) · [Usage](docs/usage.md) · [Architecture](docs/architecture.md) · [Extensions](docs/extensions.md) · [Releases](https://github.com/phillipboesger/polarion-mcp/releases)

## License

[MIT](LICENSE) © Phillip Bösger
