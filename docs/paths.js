/* Integration map: provider -> client -> Local/Server details. Without JavaScript the plain guide list stays visible; also the daily-use tabs. */
(() => {
  const root = document.getElementById('galaxy');
  const dataEl = document.getElementById('galaxy-data');
  if (root && dataEl) {
    const data = JSON.parse(dataEl.textContent);
    const SVG = 'http://www.w3.org/2000/svg';
    const stage = root.querySelector('.galaxy-stage');
    const layer = document.getElementById('galaxy-satellites');
    const hint = document.getElementById('galaxy-hint');
    const panel = document.getElementById('galaxy-panel');
    const sheet = document.getElementById('galaxy-sheet');
    const status = document.getElementById('path-status');
    const mobile = window.matchMedia('(max-width: 640px)');
    const nodes = new Map(data.nodes.map(node => [node.id, node]));
    const clients = new Map(data.clients.map(client => [client.id, client]));
    const state = { provider: null, client: null, env: 'local' };
    const esc = text => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const icon = (name, scale) => `<g class="ico" transform="translate(${-12 * scale} ${-12 * scale}) scale(${scale})">${data.icons[name] || ''}</g>`;
    const curve = (a, b, k) => {
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, dx = b.x - a.x, dy = b.y - a.y;
      return `M${a.x} ${a.y} Q${mx - dy * k} ${my + dx * k} ${b.x} ${b.y}`;
    };
    const envInfo = {
      local: ['Local', 'Run via npx on your computer'],
      server: ['Server', 'Connect to a Polarion MCP server by URL'],
    };
    const flowMiddle = env => (env === 'local' ? 'Polarion MCP (npx)' : 'Polarion MCP (Docker)');

    sheet.tabIndex = -1;
    root.classList.add('is-interactive');
    const edges = [...stage.querySelectorAll('.edge')];
    const primaries = [...stage.querySelectorAll('.node.primary')];
    const hub = document.getElementById('galaxy-hub');
    let satEdges = [];

    function defaultEnv(client) {
      return client.modes.local.supported ? 'local' : 'server';
    }

    function drawSatellites() {
      layer.innerHTML = '';
      satEdges = [];
      const node = nodes.get(state.provider);
      if (!node) return;
      const origin = node.position;
      node.clients.forEach(id => {
        const client = clients.get(id);
        const edge = document.createElementNS(SVG, 'path');
        edge.setAttribute('class', 'edge sat-edge');
        edge.setAttribute('d', curve(origin, client.satellite, 0.1));
        edge.style.setProperty('--c', node.color);
        edge.dataset.client = id;
        layer.appendChild(edge);
        satEdges.push(edge);
      });
      node.clients.forEach(id => {
        const client = clients.get(id);
        const g = document.createElementNS(SVG, 'g');
        g.setAttribute('class', 'node satellite');
        g.setAttribute('role', 'button');
        g.setAttribute('tabindex', '0');
        g.setAttribute('aria-label', client.label);
        g.setAttribute('transform', `translate(${client.satellite.x} ${client.satellite.y})`);
        g.style.setProperty('--c', node.color);
        g.dataset.client = id;
        g.innerHTML = `<circle class="disc" r="${data.radii.satellite}"/>${icon(client.icon, 1.1)}<text class="lbl s" y="45">${esc(client.label)}</text>`;
        g.addEventListener('click', () => selectClient(id));
        g.addEventListener('keydown', event => activate(event, () => selectClient(id)));
        layer.appendChild(g);
      });
    }

    function renderPanel() {
      const target = mobile.matches ? sheet : panel;
      const other = mobile.matches ? panel : sheet;
      other.hidden = true;
      other.innerHTML = '';
      const client = clients.get(state.client);
      if (!client) { target.hidden = true; target.innerHTML = ''; return; }
      const node = nodes.get(client.node);
      const modes = client.modes;
      const why = ['local', 'server'].filter(key => !modes[key].supported).map(key => `${envInfo[key][0]}: ${esc(modes[key].reason)}`);
      const envButton = key => {
        const supported = modes[key].supported;
        return `<button type="button" class="env${supported ? '' : ' off'}${supported && state.env === key ? ' on' : ''}" data-env="${key}" aria-pressed="${supported && state.env === key}"${supported ? '' : ' aria-disabled="true"'}><b>${envInfo[key][0]}</b><span>${envInfo[key][1]}</span></button>`;
      };
      const chips = modes[state.env].requirement.split('; ').filter(Boolean).map(item => `<li>${esc(item)}</li>`).join('');
      target.style.setProperty('--c', node.color);
      target.hidden = false;
      target.innerHTML = `<button type="button" class="x" aria-label="Close details">&times;</button>
<div class="ph"><div class="badge"><svg viewBox="-16 -16 32 32" width="30" height="30" style="--c:${node.color}">${icon(client.icon, 1.1)}</svg></div><div><h3>${esc(client.name)}</h3><small>${esc(node.name)}</small></div></div>
<p class="desc">${esc(client.summary)}</p>
<p class="lab">How do you want to connect?</p><div class="envs">${envButton('local')}${envButton('server')}</div>
${why.length ? `<p class="why">${why.join(' ')}</p>` : ''}
<p class="lab">Requirements</p><ul class="chips">${chips}</ul>
<div class="flow"><span class="p">${esc(client.label)}</span><span class="ln"></span><span class="p m">${flowMiddle(state.env)}</span><span class="ln"></span><span class="p">Polarion</span></div>
<a class="go guide-link" href="${esc(data.guideBase + client.guide)}" target="_blank" rel="noopener noreferrer">View setup guide &rarr;</a>`;
      target.querySelector('.x').addEventListener('click', closeClient);
      target.querySelectorAll('.env').forEach(button => button.addEventListener('click', () => {
        if (button.getAttribute('aria-disabled') === 'true') return;
        state.env = button.dataset.env;
        renderPanel();
        target.querySelector(`.env[data-env="${state.env}"]`).focus();
      }));
    }

    function sync() {
      primaries.forEach(el => {
        const open = el.dataset.node === state.provider;
        el.setAttribute('aria-expanded', String(open));
        el.classList.toggle('act', open);
        el.classList.toggle('dim', Boolean(state.provider) && !open);
      });
      edges.forEach(el => {
        const open = el.dataset.node === state.provider;
        const node = nodes.get(el.dataset.node);
        el.style.setProperty('--c', node.color);
        el.classList.toggle('dim', Boolean(state.provider) && !open);
        el.classList.toggle('hot', open && Boolean(state.client));
      });
      satEdges.forEach(el => el.classList.toggle('hot', el.dataset.client === state.client));
      layer.querySelectorAll('.satellite').forEach(el => el.classList.toggle('act', el.dataset.client === state.client));
      hint.textContent = !state.provider ? 'Select a provider to see its options' : state.client ? '' : 'Now pick your tool';
      renderPanel();
    }

    function announce(text) { if (status) status.textContent = text; }

    function selectProvider(id) {
      state.provider = state.provider === id ? null : id;
      state.client = null;
      drawSatellites();
      sync();
      announce(state.provider ? `${nodes.get(state.provider).name}: ${nodes.get(state.provider).clients.length} clients` : 'Overview');
    }

    function selectClient(id) {
      const client = clients.get(id);
      state.client = id;
      state.env = defaultEnv(client);
      sync();
      announce(`${client.name} details shown`);
      const target = mobile.matches ? sheet : panel;
      target.focus({ preventScroll: false });
    }

    function closeClient() {
      const previous = state.client;
      state.client = null;
      sync();
      const back = layer.querySelector(`.satellite[data-client="${previous}"]`);
      if (back) back.focus();
    }

    function reset() {
      state.provider = null;
      state.client = null;
      drawSatellites();
      sync();
    }

    function activate(event, action) {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); action(); }
    }

    primaries.forEach(el => {
      el.addEventListener('click', () => selectProvider(el.dataset.node));
      el.addEventListener('keydown', event => activate(event, () => selectProvider(el.dataset.node)));
    });
    hub.addEventListener('click', reset);
    hub.addEventListener('keydown', event => activate(event, reset));
    document.addEventListener('keydown', event => {
      if (event.key !== 'Escape') return;
      if (state.client) {
        const provider = state.provider;
        closeClient();
        if (!layer.querySelector('.satellite:focus')) primaries.find(el => el.dataset.node === provider)?.focus();
      } else if (state.provider) {
        const open = primaries.find(el => el.dataset.node === state.provider);
        selectProvider(state.provider);
        open?.focus();
      }
    });
    mobile.addEventListener('change', renderPanel);
    sync();
  }

  // Links to the removed inline panel (#setup/<client>) now land on the chooser.
  const legacyHash = () => { if (location.hash.startsWith('#setup')) location.replace('#clients'); };
  window.addEventListener('hashchange', legacyHash);
  legacyHash();

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
})();
