# Code Mode

Code Mode is the default and replaces the tool list with two tools, so the model's context stays small however many operations the server has.

- `search` finds operations by keyword and returns TypeScript declarations for them.
- `execute` runs JavaScript that calls those operations as `await polarion.<operation>({...})`, then returns a small JSON result.

`search` returns declarations with sentence-based summaries. Use `offset` to page through matches and `detail` with operation names to retrieve full descriptions.

The model searches first, then writes one script for the whole task: loop, filter, join and return only what it needs. Intermediate data stays in the sandbox instead of passing through the model.

## When to use which mode

| Mode | Tool list | Best for |
|---|---|---|
| `full` | Every tool | Clients that cannot approve `execute` or need every tool visible |
| `code` (default) | `search`, `execute` | Everything else, including multi-step and bulk work |

## Client compatibility

Code Mode uses two ordinary MCP tools, so any client with MCP tool support can call them. It was exercised end to end with Claude (this project's development sessions) and with OpenAI Codex CLI (a GPT model) against a Polarion 2612 server: the model called `search`, then wrote one `execute` script, and the read results matched the REST API.

Two things to know:

- `execute` is annotated as able to write, so clients that ask for approval per tool call will ask before running it. A client that cannot ask (for example `codex exec` with approval policy `never`) refuses the call, even with `dry_run: true`. For read-only use set `MCP_READ_ONLY=true`: `execute` is then annotated read-only and runs without a prompt. For writes, approve the tool in the client's settings, or set `MCP_MODE=full`.
- Models differ in how well they write the script. Check your model on a real task before relying on it for bulk changes; `MCP_MODE=full` remains available.

## Token cost

Anthropic `count_tokens` measured each tool's name, description and input schema with Claude Sonnet 5.5 on November 24, 2026.

| Server and mode | Tools | Tokens |
|---|---:|---:|
| polarion-mcp 1.5.0 default | 293 | 213,143 |
| polarion-mcp 1.6.0 `MCP_MODE=full` | 315 | 229,769 |
| polarion-mcp 1.6.0 Code Mode (default) | 2 | 698 |
| Polarion 2612 built-in MCP, early-access build | 67 | 44,070 |

One `search` returns up to eight typed declarations, measured at 511 to 1,348 tokens.

Live runs used Claude Sonnet 5.5 through the Messages API, an agent loop with all tools loaded, prompt caching, and a real Polarion 2606. Each task ran twice per version. The figures are mean context tokens read across all model calls.

| Task | 1.5.0 all tools | 1.6.0 Code Mode | Correct runs (1.5.0 / Code Mode) |
|---|---:|---:|---|
| A: list 34 draft requirements | 646,127 | 8,314 | 2 of 2 / 2 of 2 |
| B: set severity on 20 work items | 874,107 | 40,528 | 2 of 2 / 2 of 2 |
| C: count open requirements in 5 projects | 431,595 | 10,055 | 2 of 2 / 2 of 2 |
| Total | 1,951,829 | 58,897 | 6 of 6 / 6 of 6 |

The total is 33x lower with Code Mode. With cache reads priced at 0.1 and writes at 1.25, billed equivalents are 334,602 and 20,155 tokens, a 17x difference. All 12 runs, six per version, were correct. Wall time and output tokens were similar.

Clients that load tools on demand see a smaller gap: Claude Code with tool search added 5,859 tokens at session start for 1.6.0 full and 819 for Code Mode.

### Reproduce offline

Run `npm run build` and `node scripts/bench-tokens.mjs`. This estimate uses characters / 4 and a local stub returning 100 work items per query.

| Mode | tools/list | A: find open requirements, list id and title | B: set a field on 20 work items | C: count in 5 projects |
|---|---|---|---|---|
| full (all tools) | 159,094 | 175,417 | 176,763 | 240,714 |
| code | 265 | 1,818 | 1,285 | 1,194 |

## What the sandbox is

Each `execute` runs in a fresh QuickJS interpreter compiled to WebAssembly (`quickjs-emscripten`). It has no file system, network, process, timers or modules. The only host function is `polarion.<operation>(args)`, and values cross as JSON copies, never as live objects.

Why not `node:vm`, `isolated-vm` or worker threads: `node:vm` is not a security boundary, `isolated-vm` is a native addon that must be rebuilt per platform, and a worker still runs inside a full Node host. QuickJS in WASM needs no native build, so it works in npm, Docker and `.mcpb` installs.

## What stays enforced

Every `polarion.<operation>` call goes through the same pipeline as a direct tool call, per call:

- Authentication and the per-user token: the token never enters the sandbox.
- `MCP_READ_ONLY`: write operations are not in the SDK.
- Policy hook, rate limit and audit log: each inner call is recorded, plus the `execute` call itself.
- Write guards, enum label checks, read-back verification and write limits.
- `MCP_MARK_UNTRUSTED` marking: marked data arrives marked inside the sandbox.
- Destructive confirmation: `confirm` set by code is ignored; only the user's confirmation counts. A call that needed confirmation is first sent only while the script is running; if the script has returned, thrown or timed out, it is held back and the `execute` result is an error that counts it in `not_sent_calls`. Await your writes.

## Limits

| Limit | Value |
|---|---|
| Wall time per `execute` | 30 s |
| Memory | 64 MB |
| Operation calls | 100 |
| Write calls | 20 |
| Result size | 256 KB, then truncated |
| `console.log` output | 8 KB |

The write cap counts operations, not items: one bulk operation is one write, and each `execute` call gets its own budget (the per-user rate limit still applies). Operations a script starts without awaiting are finished before `execute` returns. A single operation result above 256 KB is refused inside the sandbox; request fewer fields or a smaller page.

`execute` with `dry_run: true` turns every write into a preview. A write operation that cannot preview is refused in that run. `MCP_READ_ONLY=true` removes writes from Code Mode entirely.

Errors returned to the model are one line: no stack traces and no host paths.
