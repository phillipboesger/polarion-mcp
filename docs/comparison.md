# Polarion MCP and the built-in MCP server in Polarion 2612

Polarion 2612 ships its own MCP endpoint at `/polarion/mcp/`. It is a good fit for many teams. This page explains where each server is the better choice, so you can pick on facts and, if you like, run both.

## Short version

- Use the **built-in server** when you are on Polarion 2612 or newer, want nothing to install, and your agent needs a compact set of everyday tools.
- Use **this community server** when you want the same REST coverage on older releases, stronger protection on writes, Markdown reading of LiveDocs, imports, or a setup you control (local, Docker, claude.ai, ChatGPT).

The two do not conflict. Both act as the signed-in Polarion user, so permissions stay in Polarion.

## Comparison

| | Built-in MCP (2612) | This server |
|---|---|---|
| Setup | Nothing to deploy. Switch it on in `polarion.properties`. | Run `npx`, a container or the `.mcpb` bundle, then connect a client. |
| Polarion releases | 2612 and newer | 2506, 2512, 2606 and 2612; features that need a newer release say so instead of failing silently |
| Tool list size | Small (about 196 KB, roughly 49k tokens) | The full catalog is large (about 290 tools). Toolsets, `discover` and Code Mode bring it down, see [Code Mode](code-mode.md) |
| Workflow transitions | Built in | `get_workitem_actions` and `transition_workitem_status`: resolve by action name or target status, check required fields first, verify the new status afterwards |
| Write checks | The REST API's own validation | Enum labels and custom-field keys are checked before the call; a custom-enum label sent instead of an id is refused with the id to use |
| Preview | | `dry_run` on writes shows the request and a read-back diff |
| Write verification | | Create and patch read back and report `verified`, `mismatch` or `uncertain` |
| Read-only and delete protection | Follows the user's permissions | `MCP_READ_ONLY`, confirmation for deletes and bulk writes, per-user rate limit |
| LiveDocs | Document parts as REST resources | Markdown reading and section patching, plus document import and attachment upload |
| Untrusted content | | Optional markers around user-written text (`MCP_MARK_UNTRUSTED`) |
| Where it runs | Inside Polarion | Next to your client or on a server you operate; OAuth for claude.ai and ChatGPT |

## Token cost

A large tool list costs tokens on every conversation. This server offers three ways to keep that low:

1. **Toolsets** (`MCP_TOOLSETS`): expose only the groups you need.
2. **`MCP_MODE=discover`**: three small tools to search, describe and call the rest.
3. **`MCP_MODE=code`**: two tools, `search` and `execute`. The agent writes a short script against typed operations. Writes still go through validation, `dry_run`, read-only mode and verification.

Measured numbers for each mode are in [Code Mode](code-mode.md#token-cost).

## Honest limits

- The built-in server needs no deployment; this one does. For a quick start on 2612, that is a real advantage for the built-in server.
- Polarion 2612 is an early-access release. This server's trace and workflow helpers were checked against it; the full live test suite on 2612 is still to be run.
- Code Mode runs model-written code in a sandbox. It is off by default (`full` mode stays the default).
