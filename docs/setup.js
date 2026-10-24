/* One inline panel per configuration family. No credentials are entered on this site. */
(() => {
  const data = JSON.parse(document.getElementById('client-data').textContent);
  const panel = document.getElementById('setup');
  const select = document.getElementById('setup-client');
  const code = document.getElementById('setup-code');
  const copy = document.getElementById('copy-setup');
  const status = document.getElementById('setup-status');
  let copyReset;
  const text = (id, value) => { document.getElementById(id).textContent = value; };

  function show(id, navigate = false) {
    const client = data.clients.find(client => client.id === id);
    if (!client) return;
    const setup = data.setups.find(setup => setup.id === client.setup);
    const compatible = data.clients.filter(client => client.setup === setup.id);
    text('setup-kind', setup.kind);
    text('setup-title', setup.title);
    select.replaceChildren(...compatible.map(client => new Option(client.name, client.id)));
    select.value = id;
    text('setup-compatibility', compatible.length > 1 ? `Same format: ${compatible.map(client => client.label).join(' · ')}` : `For ${client.name}`);
    document.getElementById('setup-steps').replaceChildren(...client.steps.map(step => {
      const item = document.createElement('li');
      item.textContent = step;
      return item;
    }));
    code.textContent = client.snippet ?? setup.snippet;
    text('snippet-language', setup.language);
    text('setup-note', [client.note, setup.note].filter(Boolean).join(' '));
    document.getElementById('setup-source').href = client.source;
    document.querySelectorAll('[data-client]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.client === id)));
    clearTimeout(copyReset);
    copy.textContent = 'Copy snippet';
    status.textContent = `${client.name} setup selected.`;
    if (navigate) {
      history.replaceState(null, '', `#setup/${id}`);
      // Keep the choice and its instructions together on narrow screens.
      if (matchMedia('(max-width: 1000px)').matches) panel.scrollIntoView({ block: 'start' });
      panel.focus({ preventScroll: true });
    }
  }

  document.querySelectorAll('[data-client]').forEach(button => button.addEventListener('click', () => show(button.dataset.client, true)));
  document.querySelectorAll('a[href^="#setup/"]').forEach(link => link.addEventListener('click', event => {
    event.preventDefault();
    show(link.hash.slice(7), true);
    panel.scrollIntoView({ block: 'start' });
  }));
  select.addEventListener('change', () => show(select.value, true));
  copy.addEventListener('click', async () => {
    const snippet = code.textContent;
    try {
      await navigator.clipboard.writeText(snippet);
      copy.textContent = 'Copied';
      status.textContent = 'Setup snippet copied.';
    } catch {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(code);
      selection.removeAllRanges();
      selection.addRange(range);
      copy.textContent = 'Select & copy';
      status.textContent = 'Clipboard unavailable. Snippet selected; press Ctrl+C or Command+C.';
    }
    copyReset = setTimeout(() => { copy.textContent = 'Copy snippet'; }, 3000);
  });
  function fromHash() {
    if (location.hash.startsWith('#setup/')) {
      show(location.hash.slice(7));
      panel.scrollIntoView({ block: 'start' });
    }
  }
  window.addEventListener('hashchange', fromHash);
  fromHash();
})();
