// Builds the self-contained replay page from a transcript. Pure functions: no I/O except reading the
// static client script, so tests can build a page from a fixture transcript without a browser.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CAPTION, MOCK_WATERMARK } from './common.mjs';

const CLIENT_SCRIPT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'replay-client.js');
const REPO_URL = 'github.com/phillipboesger/polarion-mcp';

const textOf = result => (result?.content ?? []).map(part => part?.text ?? '').join('\n');

function parseJsonAfterFirstLine(text) {
  const newline = text.indexOf('\n');
  if (newline < 0) return undefined;
  try { return JSON.parse(text.slice(newline + 1)); } catch { return undefined; }
}

/** Field names the dry-run guard reported as unknown, e.g. "Unknown field key(s) asil, foo for a new ...". */
function flaggedFields(warnings) {
  const names = new Set();
  for (const warning of warnings) {
    const match = /Unknown field key\(s\) (.+?) for /.exec(warning);
    if (match) for (const name of match[1].split(',')) names.add(name.trim());
  }
  return names;
}

const unique = list => [...new Set(list)];

/** Condenses a recorded tool step into what the panel shows. Everything shown is taken from the recorded args and response. */
export function summarizeToolStep(step) {
  const result = step.result ?? {};
  const text = textOf(result);
  const structured = result.structuredContent;
  const body = step.args?.requestBody?.data;
  const items = Array.isArray(body) ? body : [];
  const dryRun = step.args?.dry_run === true;

  let preview = structured?.dry_run ? structured.preview : undefined;
  if (!preview && dryRun && !result.isError) preview = parseJsonAfterFirstLine(text);
  const warnings = unique(preview?.warnings ?? []);
  const flagged = flaggedFields(warnings);

  const view = {
    tool: step.tool,
    badge: dryRun ? 'dry_run' : 'write',
    durationMs: step.durationMs ?? null,
    project: step.args?.projectId ?? '',
    items: items.map(item => ({
      title: String(item?.attributes?.title ?? ''),
      fields: Object.entries(item?.attributes ?? {})
        .filter(([name]) => !['title', 'type', 'description'].includes(name))
        .map(([name, value]) => ({ name, value: typeof value === 'string' ? value : JSON.stringify(value), flagged: flagged.has(name) })),
    })),
    attributes: unique(items.flatMap(item => Object.keys(item?.attributes ?? {}))),
    outcome: { kind: 'error', headline: 'Error', warnings: [], lines: [text.slice(0, 400)] },
  };

  if (result.isError || result.thrown) {
    view.outcome = { kind: 'error', headline: 'Refused or failed', warnings, lines: [String(result.thrown ?? text).slice(0, 400)] };
  } else if (preview) {
    let target;
    try { target = new URL(preview.url).pathname.replace(/^\/polarion\/rest\/v1/, ''); } catch { target = String(preview.url ?? ''); }
    view.outcome = {
      kind: 'preview',
      headline: 'Dry run: nothing was sent to Polarion',
      warnings,
      lines: [`${preview.method ?? 'POST'} ${target}`, `${items.length} work item${items.length === 1 ? '' : 's'} validated against project fields`],
    };
  } else {
    const verification = structured?.verification ?? parseJsonAfterFirstLine(text)?.verification;
    const created = (structured?.data ?? []).map(entry => String(entry?.id ?? '').split('/').pop()).filter(Boolean);
    view.outcome = {
      kind: 'created',
      headline: created.length ? `Created ${created.join(', ')}` : 'Write accepted',
      warnings: [],
      lines: [],
      verification: verification ? {
        status: verification.status,
        mismatches: (verification.mismatches ?? []).length,
        uncertain: (verification.uncertain ?? []).length,
        skipped: unique((verification.skipped ?? []).map(entry => entry.reason)),
        reason: verification.reason ?? '',
      } : undefined,
    };
  }
  return view;
}

/** Total playback length in seconds. */
export function totalSeconds(transcript) {
  const steps = transcript.steps.reduce((sum, step) => sum + (step.holdSec ?? 5), 0);
  return steps + (transcript.liveDocSec ?? 15) + (transcript.endCardSec ?? 5);
}

/** The requirement titles the placeholder LiveDoc shows after the write (taken from the recorded write args). */
function placeholderRows(transcript) {
  const write = [...transcript.steps].reverse().find(step => step.kind === 'tool' && step.args?.dry_run !== true);
  return (write?.args?.requestBody?.data ?? []).map(item => String(item?.attributes?.title ?? ''));
}

/** JSON safe inside a <script> block. */
function jsonIsland(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}

const escapeHtml = text => text.replace(/[&<>"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char]);

/**
 * @param {object} transcript  recorded transcript (schema 1)
 * @param {{ screenshots?: { before?: string|null, after?: string|null } }} [options] data: URIs of the LiveDoc captures
 */
export function buildReplayPage(transcript, { screenshots = {} } = {}) {
  const mock = transcript.mode === 'mock';
  const data = {
    mode: transcript.mode,
    mock,
    caption: transcript.caption ?? CAPTION,
    watermark: MOCK_WATERMARK,
    repo: REPO_URL,
    project: transcript.project,
    liveDocSec: transcript.liveDocSec ?? 15,
    endCardSec: transcript.endCardSec ?? 5,
    total: totalSeconds(transcript),
    steps: transcript.steps.map(step => step.kind === 'tool'
      ? { kind: 'tool', holdSec: step.holdSec ?? 10, view: summarizeToolStep(step) }
      : { kind: step.kind, holdSec: step.holdSec ?? 5, text: String(step.text ?? '') }),
    screenshots: { before: screenshots.before ?? null, after: screenshots.after ?? null },
    placeholderRows: placeholderRows(transcript),
  };
  const title = `polarion-mcp demo replay${mock ? ' (MOCK)' : ''}`;
  return `<!doctype html>
<html lang="en" data-mode="${escapeHtml(String(transcript.mode))}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=1280">
<title>${escapeHtml(title)}</title>
<style>
:root { --bg:#0b1020; --panel:#121a33; --line:#25305a; --text:#e8ecfa; --muted:#93a0c8; --cyan:#27d4f2; --green:#3ddc97; --amber:#ffc857; --red:#ff6b6b; --mono:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace; --sans:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif; }
* { box-sizing:border-box; margin:0; }
html,body { width:1280px; height:720px; overflow:hidden; background:var(--bg); color:var(--text); font-family:var(--sans); }
#stage { position:relative; width:1280px; height:720px; background:linear-gradient(160deg,#0b1020,#10183a); }
#top { position:absolute; inset:0 0 auto 0; height:48px; display:flex; align-items:center; padding:0 24px; border-bottom:1px solid var(--line); font-size:15px; color:var(--muted); }
#top b { color:var(--cyan); margin-right:10px; }
#chat { position:absolute; left:24px; top:64px; width:430px; bottom:56px; display:flex; flex-direction:column; gap:14px; overflow:hidden; }
.bubble { padding:14px 16px; border-radius:14px; font-size:18px; line-height:1.4; border:1px solid var(--line); }
.bubble small { display:block; font-size:12px; letter-spacing:.08em; text-transform:uppercase; color:var(--muted); margin-bottom:6px; }
.bubble.user { background:#1b2650; align-self:flex-end; }
.bubble.assistant { background:var(--panel); }
#panel { position:absolute; left:474px; top:64px; right:24px; bottom:56px; background:var(--panel); border:1px solid var(--line); border-radius:14px; padding:18px 22px; font-family:var(--mono); font-size:15px; line-height:1.5; overflow:hidden; }
#panel .empty { color:var(--muted); font-family:var(--sans); font-size:16px; }
.head { display:flex; align-items:center; gap:10px; margin-bottom:12px; }
.head .tool { font-size:20px; color:var(--cyan); }
.chip { padding:2px 10px; border-radius:999px; font-size:13px; border:1px solid var(--line); color:var(--muted); }
.chip.dry { color:var(--amber); border-color:var(--amber); }
.chip.write { color:var(--green); border-color:var(--green); }
.head .ms { margin-left:auto; color:var(--muted); font-size:13px; }
.kv { color:var(--muted); margin-bottom:6px; } .kv b { color:var(--text); font-weight:500; }
.item { padding:6px 10px; margin:4px 0; border:1px solid var(--line); border-radius:8px; display:flex; gap:10px; justify-content:space-between; }
.item .t { color:var(--text); } .item .f { color:var(--muted); white-space:nowrap; }
.item .f .flag { color:var(--red); font-weight:700; }
.result { margin-top:14px; padding-top:12px; border-top:1px dashed var(--line); }
.result h3 { font-size:17px; font-weight:600; font-family:var(--sans); margin-bottom:8px; }
.warn { padding:8px 10px; margin:6px 0; border-left:4px solid var(--amber); background:#2a2412; color:#ffe9b0; border-radius:4px; font-size:14px; }
.badge { display:inline-block; padding:3px 12px; border-radius:6px; font-weight:700; font-size:16px; }
.badge.verified { background:#12382a; color:var(--green); border:1px solid var(--green); }
.badge.mismatch { background:#3a1414; color:var(--red); border:1px solid var(--red); }
.badge.uncertain,.badge.skipped { background:#2a2412; color:var(--amber); border:1px solid var(--amber); }
.muted { color:var(--muted); font-size:14px; margin-top:6px; }
#livedoc,#endcard { position:absolute; left:0; right:0; top:48px; bottom:40px; background:var(--bg); display:none; padding:20px 24px; }
#livedoc.on,#endcard.on { display:block; }
.shots { display:flex; gap:20px; height:100%; }
.shot { flex:1; display:flex; flex-direction:column; gap:8px; min-width:0; }
.shot h4 { font-size:15px; letter-spacing:.06em; text-transform:uppercase; color:var(--muted); font-weight:600; }
.shot .frame { flex:1; border:1px solid var(--line); border-radius:10px; overflow:hidden; background:#fff; position:relative; }
.shot img { width:100%; height:100%; object-fit:cover; object-position:top left; display:block; }
.ph { color:#222; font-family:var(--sans); padding:18px; font-size:15px; }
.ph .bar { font-weight:700; border-bottom:2px solid #1c6fb8; padding-bottom:6px; margin-bottom:10px; color:#1c6fb8; }
.ph .row { padding:8px; margin:6px 0; border:1px solid #cfd8e6; border-radius:4px; background:#f4f8fd; }
.ph .row i { float:right; color:#555; font-style:normal; }
.ph .none { color:#777; font-style:italic; }
.ph .note { margin-top:14px; font-size:12px; color:#a33; }
#endcard { text-align:center; padding-top:170px; }
#endcard h1 { font-size:64px; color:var(--cyan); letter-spacing:-.01em; }
#endcard p { font-size:26px; margin-top:20px; } #endcard .repo { font-family:var(--mono); color:var(--muted); font-size:22px; margin-top:28px; }
#foot { position:absolute; left:0; right:0; bottom:0; height:40px; display:flex; align-items:center; padding:0 24px; font-size:15px; color:var(--muted); background:#0a0f20; border-top:1px solid var(--line); z-index:5; }
#watermark { display:none; position:absolute; inset:0; z-index:9; pointer-events:none; align-items:center; justify-content:center; }
html[data-mode="mock"] #watermark { display:flex; }
#watermark span { transform:rotate(-18deg); font-size:84px; font-weight:900; letter-spacing:.04em; color:rgba(255,60,60,.38); border:8px solid rgba(255,60,60,.38); padding:6px 28px; border-radius:12px; white-space:nowrap; background:rgba(0,0,0,.18); }
.mockbar { display:none; margin-left:auto; color:var(--red); font-weight:700; }
html[data-mode="mock"] .mockbar { display:inline; }
@media (prefers-reduced-motion: reduce) { * { animation:none !important; transition:none !important; } }
</style>
</head>
<body data-state="loading">
<div id="stage">
  <div id="top"><b>polarion-mcp</b><span id="topline">scripted prompt, real tool calls</span></div>
  <div id="chat" aria-live="polite"></div>
  <div id="panel"><div class="empty">Tool calls appear here.</div></div>
  <div id="livedoc"><div class="shots"></div></div>
  <div id="endcard"><h1>polarion-mcp</h1><p>dry_run + verified writes</p><div class="repo">${REPO_URL}</div></div>
  <div id="foot"><span id="caption"></span><span class="mockbar">${escapeHtml(MOCK_WATERMARK)}</span></div>
  <div id="watermark"><span>${escapeHtml(MOCK_WATERMARK)}</span></div>
</div>
<noscript><p style="position:absolute;top:8px;left:8px;color:#fff">This replay needs JavaScript. Transcript: ${escapeHtml(String(data.steps.length))} steps.</p></noscript>
<script type="application/json" id="demo-data">${jsonIsland(data)}</script>
<script>
${fs.readFileSync(CLIENT_SCRIPT, 'utf8')}
</script>
</body>
</html>
`;
}
