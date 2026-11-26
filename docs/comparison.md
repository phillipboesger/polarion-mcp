# Polarion MCP and the built-in MCP server in Polarion 2612

Polarion 2612 ships its own MCP endpoint at `/polarion/mcp/`. It is a good fit for many teams. This page explains where each server is the better choice, so you can pick on facts and, if you like, run both.

## Short version

- Use the **built-in server** when you are on Polarion 2612 or newer, want nothing to install, and your agent needs a compact set of everyday tools.
- Use **this community server** when you want the same REST coverage on older releases, stronger protection on writes, Markdown reading of LiveDocs, imports, or a setup you control (local, Docker, claude.ai, ChatGPT).

The two do not conflict. Both act as the signed-in Polarion user, so permissions stay in Polarion.

## Comparison

| | Built-in MCP (2612) | This server |
|---|---|---|
| Setup | Nothing to deploy. Set `com.siemens.polarion.mcp.enabled=true` in `polarion.properties` and use a personal access token. | Run `npx`, a container or the `.mcpb` bundle, then connect a client. |
| Polarion releases | 2612 and newer | 2506, 2512, 2606 and 2612; features that need a newer release say so instead of failing silently |
| Tool list size | 67 tool definitions, 44,070 tokens | Code Mode (default): 2 tool definitions, 698 tokens, plus about 500 to 1,350 tokens per `search`. `MCP_MODE=full`: 315 tool definitions, 229,769 tokens |
| Workflow transitions | Built in | `get_workitem_actions` and `transition_workitem_status`: resolve by action name or target status, check required fields first, verify the new status afterwards |
| Write checks | None before the call; values go to Polarion as sent | Enum labels and custom-field keys are checked before the call; a custom-enum label sent instead of an id is refused with the id to use |
| Preview | Not available | `dry_run` on writes shows the request and a read-back diff |
| Write verification | Create and update return only the ID; status transitions report `status_verified` | Create and patch read back and report `verified`, `mismatch` or `uncertain` |
| Read-only and delete protection | Follows the user's permissions; no delete tools | `MCP_READ_ONLY`, optional confirmation for calls classified as destructive, per-user rate limit |
| LiveDocs | Document metadata, create documents, create and move parts; no body or Markdown reading | Markdown reading and section patching, plus document import and attachment upload |
| Untrusted content | Not available | Optional markers around user-written text (`MCP_MARK_UNTRUSTED`) |
| Where it runs | Inside Polarion | Next to your client or on a server you operate; OAuth for claude.ai and ChatGPT |

Method: Anthropic `count_tokens`, Claude Sonnet 5.5, name + description + input schema per tool; Polarion 2612 early-access build and polarion-mcp 1.6.0, November 2026.

## Token cost

A large tool list costs tokens on every conversation. This server avoids that by default:

**Code Mode** (the default): two tools, `search` and `execute`. The agent writes a short script against typed operations. Writes still go through validation, `dry_run`, read-only mode and verification.

In live runs, mean context tokens read across model calls totaled 1,951,829 for version 1.5.0 and 58,897 for Code Mode, a 33x difference. With cache pricing, the billed equivalents were 334,602 and 20,155, a 17x difference. See the [measurement details](code-mode.md#token-cost).

## Honest limits

- The built-in server needs no deployment; this one does. For a quick start on 2612, that is a real advantage for the built-in server.
- Polarion 2612 is an early-access release. This server's trace and workflow helpers were checked against it; the full live test suite on 2612 is still to be run.
- Code Mode runs model-written code in a sandbox. Clients that ask per tool call will ask before `execute`; `MCP_MODE=full` remains available.
