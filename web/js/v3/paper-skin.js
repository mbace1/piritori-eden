// Cut paper behind live UI — AD2 (design/ART_DIRECTION_NON_BATTLE.md).
//
// The kit draws each card; the element keeps its own text. A card is drawn to
// the element's size and placed as a <canvas class="paper-card"> behind the
// element's content, with room for its shadow. Treatment A, owner 2026-10-17
// ("A, restrained"): clean scissor and knife cuts, faint grain, one contact
// shadow, no marker.
//
// One practical light for the whole screen (Art Bible §6.2): the counter's
// lantern, top-left. Each card's shadow falls away from it.
//
// Performance (CLAUDE.md rule 9). Measured 2026-10-18 at 4x CPU throttle: the
// first version encoded each card as a PNG data URL at full device resolution,
// and one screen cost ~16 s — the column alone was an 820x2600 card, 1 MB.
// Now: no encoding (the canvas itself is placed), a pixel budget per card
// (paper is low-frequency; a big backing card is drawn small and scaled), and
// the kit's shadow no longer uses a blur filter.
import { card, LIGHT, PAL, HOUSE } from './paper-kit.js?v=2';

const SKINS = {
  slab: { paper: 'kraft', edge: 'scissor' },                       // Toko's words: kraft, ledger ink
  panel: { paper: 'heavy', edge: 'knife' },                        // the column the band sits on
  button: { paper: 'heavy', edge: 'knife' },                       // a choice
  plate: { paper: 'kraft', edge: 'scissor' },                      // the place's name
};
const BUDGET = { panel: 110000, default: 200000 };                  // pixels per card, before its shadow margin; the dark backing needs few
const cache = new Map();
let observer = null, frame = 0;

// Three variants per kind and size: identical buttons reuse a card instead of each
// drawing its own (they still differ from their neighbours).
let nth = 0;
function seedOf(el) { if (!el.dataset.paperSeed) el.dataset.paperSeed = String(1 + (nth++ % 3)); return Number(el.dataset.paperSeed) * 131; }

function draw(el, light, r) {
  const kind = el.dataset.paper, s = SKINS[kind]; if (!s) return;
  if (r.width < 4 || r.height < 4) return;
  const scale = Math.min(Math.min(devicePixelRatio || 1, 2), Math.sqrt((BUDGET[kind] ?? BUDGET.default) / (r.width * r.height)));
  const w = Math.max(4, Math.round(r.width * scale)), h = Math.max(4, Math.round(r.height * scale));
  // the cached card has no light in it: identical buttons share one card, and the
  // shadow is offset per element when it is placed (one image copy each)
  const key = `${kind}|${w}x${h}|${seedOf(el)}`;
  let cd = cache.get(key);
  if (!cd) {
    const e = s.edge;
    cd = card({ w, h, paper: s.paper, edges: { top: e, right: e, bottom: e, left: e }, seed: seedOf(el), tooth: HOUSE.tooth, blur: Math.max(3, 6 * scale) });
    cache.set(key, cd); if (cache.size > 60) cache.delete(cache.keys().next().value);
  }
  const dx = (r.left + r.width / 2 - light.x), dy = (r.top + r.height / 2 - light.y), L = Math.hypot(dx, dy) || 1;
  const sx = Math.round((dx / L) * 7 * scale), sy = Math.round((dy / L) * 7 * scale + 2 * scale), tab = el.dataset.tab ? PAL[el.dataset.tab] : null;
  const stamp = `${key}|${sx},${sy}|${tab}`;
  let cv = el.querySelector(':scope > canvas.paper-card');
  if (!cv) { cv = document.createElement('canvas'); cv.className = 'paper-card'; cv.setAttribute('aria-hidden', 'true'); el.prepend(cv); }
  if (cv.dataset.stamp !== stamp) {
    cv.width = cd.c.width; cv.height = cd.c.height; const g = cv.getContext('2d');
    g.globalAlpha = 0.5; g.drawImage(cd.s, sx, sy); g.globalAlpha = 1; g.drawImage(cd.c, 0, 0);
    if (tab) {   // the construction-paper tab: a cut strip with a hairline shadow, drawn straight onto the card
      const x = cd.pad + 8 * scale, y = cd.pad + 7 * scale, tw = Math.max(3, 8 * scale), th = Math.max(4, h - 14 * scale);
      g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x + 1.5 * scale, y + 2 * scale, tw, th);
      g.fillStyle = tab; g.beginPath(); g.moveTo(x, y + 0.6 * scale); g.lineTo(x + tw, y); g.lineTo(x + tw - 0.4 * scale, y + th); g.lineTo(x + 0.3 * scale, y + th - 0.5 * scale); g.closePath(); g.fill();
    }
    cv.dataset.stamp = stamp;
  }
  el.style.setProperty('--paper-pad', `${cd.pad / scale}px`);
  el.classList.add('papered');
}

export function disposePaperSkin() { observer?.disconnect(); observer = null; cancelAnimationFrame(frame); }

/** Skin every [data-paper] under root; re-skin when they change size. */
export function mountPaperSkin(root, light = { x: 0, y: 0 }) {
  disposePaperSkin();
  if (!root) return;
  const els = [...root.querySelectorAll('[data-paper]')];
  // Drawn in slices, top of the screen first, ~8 ms a frame: a first visit never
  // blocks the page for the whole screen's worth of cards. Each card fades in
  // (CSS); later visits hit the cache. Sizes are read before any card is written.
  const run = () => {
    cancelAnimationFrame(frame);
    const lit = typeof light === 'function' ? light() : light, rects = els.map(el => el.getBoundingClientRect());
    const queue = els.map((el, i) => [el, rects[i]]).sort((x, y) => x[1].top - y[1].top);
    const slice = () => { const t = performance.now(); while (queue.length && performance.now() - t < 8) { const [el, r] = queue.shift(); draw(el, lit, r); } if (queue.length) frame = requestAnimationFrame(slice); };
    slice();
  };
  run();
  observer = new ResizeObserver(() => { cancelAnimationFrame(frame); frame = requestAnimationFrame(run); });
  for (const el of els) observer.observe(el);
}
