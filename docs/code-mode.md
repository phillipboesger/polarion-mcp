# Code Mode

`MCP_MODE=code` replaces the tool list with two tools, so the model's context stays small however many operations the server has.

- `search` finds operations by keyword and returns TypeScript declarations for them.
- `execute` runs JavaScript that calls those operations as `await polarion.<operation>({...})`, then returns a small JSON result.

The model searches first, then writes one script for the whole task: loop, filter, join and return only what it needs. Intermediate data stays in the sandbox instead of passing through the model.

## When to use which mode

| Mode | Tool list | Best for |
|---|---|---|
| `full` (default) | Every enabled tool | Small catalogs (see `MCP_TOOLSETS`), clients that need every tool visible |
| `discover` | `search_tools`, `describe_tool`, `call_tool` | Large catalogs, one call at a time |
| `code` | `search`, `execute` | Large catalogs, multi-step and bulk work |

## Token cost

Measured with `node scripts/bench-tokens.mjs` (after `npm run build`) against a local Polarion stub that returns 100 work items per query. Tokens are estimated as characters / 4 for the tool list plus every call and result the model sees.

| Mode | tools/list | A: list open requirements | B: set a field on 20 items | C: count in 5 projects |
|---|---|---|---|---|
| `full`, all tools | 270,139 | 286,462 | 287,808 | 351,759 |
| `full`, `MCP_TOOLSETS=work-items,documents` | 105,532 | 121,855 | 123,201 | 187,152 |
| `discover` | 224 | 18,020 | 20,078 | 83,348 |
| `code` | 311 | 1,864 | 1,331 | 1,240 |

The gain on multi-step tasks comes from two places: one script replaces many round trips, and the script returns only what the model needs instead of every raw result. The numbers compare modes against a stub; they say nothing about answer quality. `full` stays the default until quality is compared on real prompts.

## What the sandbox is

Each `execute` runs in a fresh QuickJS interpreter compiled to WebAssembly (`quickjs-emscripten`). It has no file system, network, process, timers or modules. The only host function is `polarion.<operation>(args)`, and values cross as JSON copies, never as live objects.

Why not `node:vm`, `isolated-vm` or worker threads: `node:vm` is not a security boundary, `isolated-vm` is a native addon that must be rebuilt per platform, and a worker still runs inside a full Node host. QuickJS in WASM needs no native build, so it works in npm, Docker and `.mcpb` installs.

## What stays enforced

Every `polarion.<operation>` call goes through the same pipeline as a direct tool call, per call:

- Authentication and the per-user token: the token never enters the sandbox.
- `MCP_READ_ONLY`, `MCP_TOOLS` and `MCP_TOOLSETS`: operations outside the filter are not in the SDK.
- Policy hook, rate limit and audit log: each inner call is recorded, plus the `execute` call itself.
- Write guards, enum label checks, read-back verification and write limits.
- `MCP_MARK_UNTRUSTED` marking: marked data arrives marked inside the sandbox.
- Destructive confirmation: `confirm` set by code is ignored; only the user's confirmation counts.

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

`execute` with `dry_run: true` turns every write into a preview. A write operation that cannot preview is refused in that run. `MCP_CODE_MODE_WRITES=false` removes writes from Code Mode entirely.

Errors returned to the model are one line: no stack traces and no host paths.
