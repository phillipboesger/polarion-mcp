/* global document, window, performance, requestAnimationFrame */
// Browser side of the replay page (inlined into the HTML by page.mjs). It only builds DOM with
// textContent, never innerHTML, because the transcript text comes from tool responses.
(function () {
  const data = JSON.parse(document.getElementById('demo-data').textContent);
  const params = new URLSearchParams(window.location.search);
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const frozenAt = params.has('t') ? Number(params.get('t')) : null;

  const SAFE_IMAGE_URI = /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/;
  // Class names built from transcript values are restricted to known words.
  const pick = (value, allowed, fallback) => (allowed.indexOf(value) >= 0 ? value : fallback);

  const el = (tag, cls, text) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  // Timeline: recorded steps in order, then the LiveDoc scene, then the end card.
  let cursor = 0;
  const steps = data.steps.map(step => {
    const entry = Object.assign({}, step, { start: cursor, end: cursor + step.holdSec });
    cursor = entry.end;
    return entry;
  });
  const liveStart = cursor;
  const endStart = liveStart + data.liveDocSec;
  const total = endStart + data.endCardSec;

  const chat = document.getElementById('chat');
  const panel = document.getElementById('panel');
  const livedoc = document.getElementById('livedoc');
  const endcard = document.getElementById('endcard');
  document.getElementById('caption').textContent = data.caption;
  if (data.mock) document.getElementById('topline').textContent = 'MOCK run: fake Polarion, not real data';

  // ---- LiveDoc scene (built once) ----
  function shot(label, uri, rows) {
    const box = el('div', 'shot');
    box.appendChild(el('h4', '', label));
    const frame = el('div', 'frame');
    // Only inline PNG/JPEG data URIs reach img.src; anything else (javascript:, http:, ...) falls back to the placeholder.
    if (typeof uri === 'string' && SAFE_IMAGE_URI.test(uri)) {
      const img = el('img');
      img.src = uri;
      img.alt = 'Polarion LiveDoc ' + label.toLowerCase();
      frame.appendChild(img);
    } else {
      const ph = el('div', 'ph');
      ph.appendChild(el('div', 'bar', 'Polarion LiveDoc: Brake System Requirements'));
      if (rows.length) {
        rows.forEach(function (title, index) {
          const row = el('div', 'row', title);
          row.appendChild(el('i', '', 'BRK-' + (index + 1)));
          ph.appendChild(row);
        });
      } else ph.appendChild(el('div', 'none', 'No requirements yet'));
      ph.appendChild(el('div', 'note', 'Placeholder panel: no Polarion screenshot was captured for this run.'));
      frame.appendChild(ph);
    }
    box.appendChild(frame);
    return box;
  }
  const shots = livedoc.querySelector('.shots');
  const beforeBox = shot('Before', data.screenshots.before, []);
  const afterBox = shot('After', data.screenshots.after, data.placeholderRows);
  shots.appendChild(beforeBox);
  shots.appendChild(afterBox);

  // ---- Tool panel ----
  function renderPanel(view, revealed) {
    panel.replaceChildren();
    const head = el('div', 'head');
    head.appendChild(el('span', 'tool', view.tool));
    head.appendChild(el('span', 'chip ' + (view.badge === 'dry_run' ? 'dry' : 'write'), view.badge === 'dry_run' ? 'dry_run: true' : 'real write'));
    if (view.durationMs !== null) head.appendChild(el('span', 'ms', view.durationMs + ' ms'));
    panel.appendChild(head);
    const project = el('div', 'kv');
    project.appendChild(document.createTextNode('projectId  '));
    project.appendChild(el('b', '', view.project));
    panel.appendChild(project);
    panel.appendChild(el('div', 'kv', 'work items (' + view.items.length + ')'));
    view.items.forEach(function (item) {
      const row = el('div', 'item');
      row.appendChild(el('span', 't', item.title));
      const fields = el('span', 'f');
      item.fields.forEach(function (field, index) {
        if (index) fields.appendChild(document.createTextNode('  '));
        fields.appendChild(el('span', field.flagged ? 'flag' : '', field.name + ': ' + field.value));
      });
      row.appendChild(fields);
      panel.appendChild(row);
    });
    if (!revealed) return;
    const outcome = view.outcome;
    const result = el('div', 'result');
    result.appendChild(el('h3', '', outcome.headline));
    outcome.warnings.forEach(function (warning) { result.appendChild(el('div', 'warn', warning)); });
    outcome.lines.forEach(function (line) { result.appendChild(el('div', 'muted', line)); });
    if (outcome.verification) {
      const v = outcome.verification;
      const line = el('div');
      line.appendChild(document.createTextNode('verification: '));
      line.appendChild(el('span', 'badge ' + pick(v.status, ['verified', 'mismatch', 'uncertain', 'skipped'], 'skipped'), String(v.status)));
      result.appendChild(line);
      result.appendChild(el('div', 'muted', 'read back: ' + view.attributes.join(', ') + ' | mismatches ' + v.mismatches + ', uncertain ' + v.uncertain));
      if (v.skipped.length) result.appendChild(el('div', 'muted', 'not verified: ' + v.skipped.join('; ')));
      if (v.reason) result.appendChild(el('div', 'muted', v.reason));
    }
    panel.appendChild(result);
  }

  // ---- Frame renderer (stateless in t; DOM rebuilt only when the discrete state changes) ----
  const keys = { chat: '', panel: '', scene: '' };
  function render(t) {
    const chatItems = [];
    steps.forEach(function (step, index) {
      if (step.kind === 'tool' || t < step.start) return;
      let text = step.text;
      if (!reduced && t < step.end) {
        const typeSec = Math.max(0.5, Math.min(step.holdSec * 0.6, step.text.length / 30));
        text = step.text.slice(0, Math.ceil(step.text.length * Math.min(1, (t - step.start) / typeSec)));
      }
      chatItems.push({ index: index, kind: step.kind, text: text });
    });
    const chatKey = JSON.stringify(chatItems);
    if (chatKey !== keys.chat) {
      keys.chat = chatKey;
      chat.replaceChildren();
      chatItems.forEach(function (item) {
        const bubble = el('div', 'bubble ' + pick(item.kind, ['user', 'assistant'], 'assistant'));
        bubble.appendChild(el('small', '', item.kind === 'user' ? 'You' : 'Assistant (scripted)'));
        bubble.appendChild(document.createTextNode(item.text));
        chat.appendChild(bubble);
      });
    }

    let activeTool = null;
    steps.forEach(function (step) { if (step.kind === 'tool' && t >= step.start) activeTool = step; });
    if (activeTool) {
      const revealed = reduced || t >= activeTool.start + activeTool.holdSec * 0.35 || t >= activeTool.end;
      const panelKey = activeTool.start + ':' + revealed;
      if (panelKey !== keys.panel) { keys.panel = panelKey; renderPanel(activeTool.view, revealed); }
    }

    const scene = t >= endStart ? 'end' : t >= liveStart ? 'live' : 'steps';
    const afterVisible = t >= liveStart + data.liveDocSec * 0.35;
    const sceneKey = scene + ':' + afterVisible;
    if (sceneKey !== keys.scene) {
      keys.scene = sceneKey;
      livedoc.classList.toggle('on', scene === 'live');
      endcard.classList.toggle('on', scene === 'end');
      afterBox.style.visibility = afterVisible || reduced ? 'visible' : 'hidden';
    }
  }

  window.__demo = { total: total, liveStart: liveStart, endStart: endStart, reduced: reduced, started: false };
  document.body.dataset.total = String(total);

  function finish() { document.body.dataset.done = 'true'; document.body.dataset.state = 'done'; }

  function start() {
    if (window.__demo.started) return;
    window.__demo.started = true;
    document.body.dataset.state = 'playing';
    const t0 = performance.now();
    (function tick() {
      const t = (performance.now() - t0) / 1000;
      render(Math.min(t, total));
      if (t >= total) return finish();
      requestAnimationFrame(tick);
    })();
  }
  window.__demo.start = start;

  if (frozenAt !== null) {
    render(frozenAt);
    document.body.dataset.state = 'frozen';
  } else if (reduced) {
    // Reduced motion: no animation. Show the final state of the last tool call with all chat visible.
    render(Math.max(0, liveStart - 0.01));
    finish();
    document.body.dataset.state = 'static';
  } else if (params.has('manual')) {
    render(0);
    document.body.dataset.state = 'ready';
  } else {
    start();
  }
})();
