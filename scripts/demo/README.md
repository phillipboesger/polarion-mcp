# Demo harness

Regenerates the ~75 s product demo: an assistant drafts three requirements into a LiveDoc with `dry_run`, fixes a field name, then writes with read-back verification. The tool calls and responses are real (the built MCP server runs over stdio); the user and assistant text is scripted in `lib/steps.mjs`. The video caption says so: "Replay of real tool calls, assistant text scripted".

Not part of the npm package (`files` lists only `build` and `src`). Output goes to the gitignored `scripts/demo/out/`.

## Commands

```bash
npm run build
npm run demo:mock     # fake Polarion, no Docker; watermarked "MOCK - not for publication"
npm run demo:record   # real run: seed, screenshot before, record, screenshot after, render
```

`demo:record` needs a throwaway Polarion (for example a fresh 2606 container, see the `polarion-test-env` skill):

```bash
POLARION_BASE_URL=http://localhost POLARION_TOKEN=<personal access token> npm run demo:record
```

Optional: `POLARION_USER` / `POLARION_PASSWORD` for the UI screenshots (default `admin`/`admin` on a local URL), `DEMO_TEMPLATE_ID` for project creation (default `empty`), `DEMO_CHROMIUM` for a specific Chromium binary.

`seed.mjs`, `record.mjs` and `capture-polarion.mjs` create data or log in, so they refuse any non-local URL unless you pass `--i-know`.

## Prerequisites

- Project `brakedemo` needs a custom field `asilLevel` on `requirement` work items. The REST API cannot create custom fields; `seed.mjs` creates the project and LiveDoc, then warns (exit code 2) if the field is missing.
- `ffmpeg` on the PATH for mp4, webm (under 4 MB) and GIF (under 2 MB). Without it `render.mjs` writes only the poster and the raw Playwright video, and exits with code 3 for a live transcript.
- Playwright browsers: `npx playwright install chromium`.

## Files

| File | Purpose |
|---|---|
| `run.mjs` | Orchestrates the steps for `demo:record` and `demo:mock` |
| `seed.mjs` | Idempotent project and LiveDoc setup |
| `record.mjs` | Runs the scripted steps and writes `out/transcript.json` (secrets redacted) |
| `capture-polarion.mjs` | `before` / `after` LiveDoc screenshots with Playwright |
| `render.mjs` | Replay page, Playwright video, ffmpeg encodes, poster |
| `lib/` | Scripted steps, mock Polarion, redaction, page builder and its browser script |

Mock runs write `demo-mock.*`; only `demo.*` from a live transcript is meant for publication. The replay page honors `prefers-reduced-motion` (static final frame, no autoplay), and `replay.html?t=<seconds>` shows a single frozen frame.
