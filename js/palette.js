// Night paper. Charcoal, dirty off-white, cold blue water (BRIEF, Piritori skin).
// Warning orange is reserved for immediate pressure and is used for nothing
// else — the moment it decorates something, it stops meaning "now".

export const PAL = {
  paper: '#0f1216',
  grain: 'rgba(226,220,205,0.045)',
  ink: '#e2dccd',
  dim: '#8c8778',
  mark: '#b9b2a0',          // ordinary people — pale and civic
  latent: '#232a33',
  water: '#1b2c3a',
  warn: '#ff7a1a',          // immediate pressure ONLY
  slow: '#c8a24a',
  draft: '#57c8e8',
  magenta: '#F0027F',       // the product and the player. Never body copy.
  gold: '#e8c24a',
  // Four lines, distinguishable by hue AND by the dash pattern render.js pairs
  // with them — colour is never the only identifier.
  routeColours: ['#e2dccd', '#57c8e8', '#7fc98a', '#c98ad8'],
  // the city's own services, kept duller than anything the player draws — and
  // the metro's amber deliberately a step down from warn's orange, which stays
  // reserved for pressure
  modeColours: { metro: '#b06a2a', tram: '#5d6b5e', car: '#46525e' },
  font: "ui-monospace, 'SF Mono', Menlo, Consolas, monospace",
};

export const THEME = {
  ...PAL,
  // Vaasanaukio is the node's real name in the shared city; Piritori is the
  // street nickname, and applying it HERE is the seam doing its job.
  labelFor: n => (n.id === 'vaasanaukio' ? 'Piritori' : n.name),
  glyphFor: n => (n.has('transfer') ? '◇' : n.has('shop') ? '□' : n.has('service') ? '△' : '○'),
};
