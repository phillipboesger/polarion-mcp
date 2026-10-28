export const ICON_PATHS = {
  desktop: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3.5 3.5 3.5 14.500 0 18M12 3c-3.500 3.500-3.500 14.500 0 18"/>',
  terminal: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9l3 3-3 3M13 15h4"/>',
  api: '<path d="M8 4C6 4 5 5 5 7v2c0 1.500-1 3-2 3 1 0 2 1.500 2 3v2c0 2 1 3 3 3M16 4c2 0 3 1 3 3v2c0 1.500 1 3 2 3-1 0-2 1.500-2 3v2c0 2-1 3-3 3"/>',
  code: '<path d="M8 8l-4 4 4 4M16 8l4 4-4 4M13.500 6l-3 12"/>',
  building: '<rect x="5" y="3" width="14" height="18" rx="1.500"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M10 21v-4h4v4"/>',
  chat: '<path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-5 4z"/>',
  bot: '<rect x="4" y="8" width="16" height="11" rx="3"/><path d="M12 8V5"/><circle cx="12" cy="4" r="1"/><circle class="f" cx="9" cy="13.500" r="1.200"/><circle class="f" cx="15" cy="13.500" r="1.200"/>',
  plug: '<path d="M9 3v5M15 3v5M6 8h12v3a6 6 0 0 1-12 0zM12 17v4"/>',
  swap: '<path d="M4 8h14l-3-3M20 16H6l3 3"/>',
  nodes: '<circle cx="5" cy="12" r="2"/><circle cx="19" cy="6" r="2"/><circle cx="19" cy="18" r="2"/><path d="M7 12h4l6-5M11 12l6 5"/>',
  box: '<path d="M12 3l8 4v10l-8 4-8-4V7zM4 7l8 4 8-4M12 11v10"/>',
  sliders: '<path d="M4 7h9M19 7h1M4 17h1M11 17h9"/><circle cx="16" cy="7" r="2.200"/><circle cx="8" cy="17" r="2.200"/>',
  cursor: '<path d="M5 3l14 7-6 2-2 6z"/>',
  sail: '<path d="M12 3v15M12 4c4 3 6 7 6 12h-6M12 9c-3 2-5 4-5 7h5M4 20h16"/>',
  ide: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 16h5M8 8v5"/>',
  server: '<rect x="3" y="4" width="18" height="6" rx="1.5"/><rect x="3" y="14" width="18" height="6" rx="1.5"/><path d="M7 7h.01M7 17h.01"/>',
};

const icon = (name, color, scale = 1.25) => `<g class="ico" style="--c:${color}" transform="translate(${-12 * scale} ${-12 * scale}) scale(${scale})">${ICON_PATHS[name] ?? ICON_PATHS.code}</g>`;

export function renderNodeLogo(id, color) {
  switch (id) {
    case 'claude': {
      let rays = '';
      for (let i = 0; i < 12; i += 1) {
        const length = i % 2 ? 10 : 15;
        rays += `<line x1="0" y1="-3" x2="0" y2="${-length - 3}" transform="rotate(${i * 30})" stroke="${color}" stroke-width="3.4" stroke-linecap="round"/>`;
      }
      return rays;
    }
    case 'openai': return [0, 60, 120].map(rotation => `<rect x="-7" y="-16" width="14" height="32" rx="7" transform="rotate(${rotation})" fill="none" stroke="${color}" stroke-width="2.3"/>`).join('');
    case 'google': return '<path d="M0-18C2-6 6-2 18 0 6 2 2 6 0 18-2 6-6 2-18 0-6-2-2-6 0-18Z" fill="url(#gem)"/>';
    case 'ms': return '<rect x="-15" y="-15" width="14" height="14" fill="#f25022"/><rect x="1" y="-15" width="14" height="14" fill="#7fba00"/><rect x="-15" y="1" width="14" height="14" fill="#00a4ef"/><rect x="1" y="1" width="14" height="14" fill="#ffb900"/>';
    case 'editors': return icon('code', color);
    default: return icon('api', color);
  }
}
