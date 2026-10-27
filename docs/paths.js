/* "Choose your path" filters client cards by Local or Server (without JavaScript every card stays visible); also the daily-use tabs. */
(() => {
  const radios = document.querySelectorAll('[name="path"]');
  const cards = document.querySelectorAll('.client-card');
  const status = document.getElementById('path-status');
  const apply = value => {
    let shown = 0;
    cards.forEach(card => {
      const visible = value === 'all' || card.dataset[value] === 'true';
      card.hidden = !visible;
      if (visible) shown++;
    });
    document.querySelectorAll('.client-group').forEach(group => { group.hidden = !group.querySelector('.client-card:not([hidden])'); });
    status.textContent = `${shown} clients shown`;
  };
  radios.forEach(radio => radio.addEventListener('change', () => apply(radio.value)));
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
