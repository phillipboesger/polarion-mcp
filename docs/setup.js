/* One inline client/server setup panel. No credentials are entered on this site. */
(() => {
  const data = JSON.parse(document.getElementById('client-data').textContent);
  const panel = document.getElementById('setup');
  const select = document.getElementById('setup-client');
  const code = document.getElementById('setup-code');
  const status = document.getElementById('setup-status');
  let copyReset;
  const text = (id, value) => { document.getElementById(id).textContent = value; };

  let selectedClient = data.clients[0].id;
  select.replaceChildren(...data.clients.map(client => new Option(client.name, client.id)));

  // "how" texts may contain ```fenced``` blocks, "- " bullets, "1) " steps and `inline code`;
  // everything is written with textContent only.
  function inline(parent, value) {
    value.split('`').forEach((part, i) => {
      if (!part) return;
      if (i % 2) { const codeEl = document.createElement('code'); codeEl.textContent = part; parent.append(codeEl); }
      else parent.append(part);
    });
  }
  function richText(container, value) {
    const nodes = [];
    value.split(/```(?:\w+)?\n?/).forEach((part, i) => {
      if (i % 2) {
        const pre = document.createElement('pre'); const codeEl = document.createElement('code');
        codeEl.textContent = part.trim(); pre.append(codeEl); pre.tabIndex = 0; nodes.push(pre);
        return;
      }
      let list;
      for (const line of part.split('\n').map(line => line.trim()).filter(Boolean)) {
        const match = /^(?:(-)|\d+\))\s+(.*)$/.exec(line);
        if (match) {
          const tag = match[1] ? 'ul' : 'ol';
          if (list?.localName !== tag) { list = document.createElement(tag); nodes.push(list); }
          const item = document.createElement('li'); inline(item, match[2]); list.append(item);
        } else {
          list = undefined;
          const paragraph = document.createElement('p'); inline(paragraph, line); nodes.push(paragraph);
        }
      }
    });
    container.replaceChildren(...nodes);
  }
  function show(id, navigate = false, requestedMode) {
    const client = data.clients.find(client => client.id === id);
    if (!client) return;
    const mode = client.connections[requestedMode]?.setup ? requestedMode : client.defaultMode;
    const connection = client.connections[mode];
    const setup = data.setups.find(setup => setup.id === connection.setup);
    selectedClient = id;
    text('setup-kind', data.serverModes.find(item => item.id === mode).label);
    text('setup-title', client.name);
    select.value = id;
    text('setup-compatibility', `${client.name} · ${setup.title}`);
    document.querySelectorAll('[name="server-mode"]').forEach(input => {
      const reason = client.connections[input.value].reason;
      input.disabled = Boolean(reason);
      input.checked = input.value === mode;
      input.setAttribute('aria-describedby', `reason-${input.value}`);
      input.closest('label').classList.toggle('unsupported', Boolean(reason));
      text(`description-${input.value}`, client.connections[input.value].description || data.serverModes.find(mode => mode.id === input.value).description);
      text(`reason-${input.value}`, reason || (input.value === client.defaultMode ? 'Recommended for this client' : 'Supported'));
    });
    const before = data.serverModes.find(item => item.id === mode).before || [];
    document.getElementById('setup-before').hidden = !before.length;
    text('before-title', `Before you start (${data.serverModes.find(item => item.id === mode).label})`);
    document.getElementById('before-items').replaceChildren(...before.map(entry => {
      const details = document.createElement('details');
      const summary = document.createElement('summary');
      summary.textContent = entry.title;
      const body = document.createElement('div');
      richText(body, entry.how);
      details.append(summary, body);
      return details;
    }));
    const needs = connection.needs || [];
    document.getElementById('setup-needs').hidden = !needs.length;
    text('setup-needs', `Needs: ${needs.join(' · ')}`);
    document.getElementById('setup-steps').replaceChildren(...connection.steps.map(step => {
      const item = document.createElement('li');
      item.textContent = step;
      return item;
    }));
    const verify = connection.verify;
    document.getElementById('setup-verify').hidden = !verify;
    text('verify-prompt', verify ? `Ask: \u201c${verify.prompt}\u201d` : '');
    text('verify-expect', verify ? verify.expect : '');
    const fails = connection.fails || [];
    document.getElementById('setup-fails').hidden = !fails.length;
    document.getElementById('fails-list').replaceChildren(...fails.flatMap(fail => {
      const term = document.createElement('dt');
      const detail = document.createElement('dd');
      term.textContent = fail.symptom;
      detail.textContent = fail.fix;
      return [term, detail];
    }));
    code.textContent = connection.snippet ?? setup.snippet;
    text('snippet-language', `${connection.language || setup.language} · client configuration`);
    text('setup-note', connection.note || setup.note);
    const serverSetup = data.setups.find(setup => setup.id === connection.serverSetup);
    document.getElementById('server-command').hidden = !serverSetup;
    text('server-code', serverSetup?.snippet || '');
    text('server-note', serverSetup?.note || '');
    const source = document.getElementById('setup-source');
    source.removeAttribute('href');
    try {
      const sourceUrl = new URL(client.source);
      // Only HTTPS URLs may reach this DOM sink, even if manifest data is changed.
      if (sourceUrl.protocol === 'https:') source.href = sourceUrl.href;
    } catch { /* Invalid source URLs remain plain, non-clickable text. */ }
    document.querySelectorAll('[data-client]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.client === id)));
    clearTimeout(copyReset);
    document.querySelectorAll('[data-copy]').forEach(button => { button.textContent = button.dataset.copy === 'server-code' ? 'Copy server command' : 'Copy snippet'; });
    status.textContent = `${client.name}: ${data.serverModes.find(item => item.id === mode).label} selected.`;
    if (navigate) {
      history.replaceState(null, '', `#setup/${id}/${mode}`);
      if (matchMedia('(max-width: 1000px)').matches) panel.scrollIntoView({ block: 'start' });
      panel.focus({ preventScroll: true });
    }
  }

  document.querySelectorAll('[data-client]').forEach(button => button.addEventListener('click', () => show(button.dataset.client, true)));
  document.querySelectorAll('a[href^="#setup/"]').forEach(link => link.addEventListener('click', event => {
    event.preventDefault();
    const [id, mode] = link.hash.slice(7).split('/');
    show(id, true, mode);
    panel.scrollIntoView({ block: 'start' });
  }));
  select.addEventListener('change', () => show(select.value, true));
  document.querySelectorAll('[name="server-mode"]').forEach(input => input.addEventListener('change', () => show(selectedClient, true, input.value)));
  document.querySelectorAll('[data-copy]').forEach(button => button.addEventListener('click', async () => {
    const target = document.getElementById(button.dataset.copy);
    const snippet = target.textContent;
    try {
      await navigator.clipboard.writeText(snippet);
      button.textContent = 'Copied';
      status.textContent = 'Setup snippet copied.';
    } catch {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(target);
      selection.removeAllRanges();
      selection.addRange(range);
      button.textContent = 'Select & copy';
      status.textContent = 'Clipboard unavailable. Snippet selected; press Ctrl+C or Command+C.';
    }
    clearTimeout(copyReset);
    copyReset = setTimeout(() => { document.querySelectorAll('[data-copy]').forEach(item => { item.textContent = item.dataset.copy === 'server-code' ? 'Copy server command' : 'Copy snippet'; }); }, 3000);
  }));
  function fromHash() {
    if (location.hash.startsWith('#setup/')) {
      const [id, mode] = location.hash.slice(7).split('/');
      show(id, false, mode);
      panel.scrollIntoView({ block: 'start' });
    }
  }
  window.addEventListener('hashchange', fromHash);
  show(data.clients[0].id);
  fromHash();

  const tabs = [...document.querySelectorAll('.day-tabs [role="tab"]')];
  function showDay(tab) {
    tabs.forEach(item => {
      const active = item === tab;
      item.setAttribute('aria-selected', String(active));
      item.tabIndex = active ? 0 : -1;
      document.getElementById(item.getAttribute('aria-controls')).hidden = !active;
    });
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => showDay(tab));
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowDown' || event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next !== undefined) { event.preventDefault(); showDay(tabs[next]); tabs[next].focus(); }
    });
  });
  if (tabs.length) showDay(tabs[0]);

  // Public release and repository links provide current details without sending visitor data to an API.
})();
