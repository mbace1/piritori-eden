// Cut paper behind live UI — AD2 (design/ART_DIRECTION_NON_BATTLE.md).
//
// The kit draws each card; the element keeps its own text. A card is rendered
// to the element's size (device pixels, capped at 2x) and set as the
// element's --paper; CSS puts it on a ::before behind the content, with room
// for the shadow. Treatment A, owner 2026-10-17 ("A, restrained"): clean
// scissor and knife cuts, faint grain, one contact shadow, no marker.
//
// One practical light for the whole screen (Art Bible §6.2): the counter's
// lantern, top-left. Each card's shadow falls away from it.
import { card, LIGHT, PAL, HOUSE } from './paper-kit.js?v=1';

const SKINS = {
  slab: { paper: 'kraft', edge: 'scissor' },                       // Toko's words: kraft, ledger ink
  panel: { paper: 'heavy', edge: 'knife' },                        // the column the band sits on
  button: { paper: 'heavy', edge: 'knife' },                       // a choice
  plate: { paper: 'kraft', edge: 'scissor' },                      // the place's name
};
const cache = new Map();
let observer = null;

function seedOf(el) { let h = 2166136261; for (const ch of (el.dataset.paper + (el.textContent || '').slice(0, 24))) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; }

function skin(el, light) {
  const kind = el.dataset.paper, s = SKINS[kind]; if (!s) return;
  const r = el.getBoundingClientRect(); if (r.width < 4 || r.height < 4) return;
  const d = Math.min(devicePixelRatio || 1, 2), w = Math.round(r.width * d), h = Math.round(r.height * d);
  const tab = el.dataset.tab ? PAL[el.dataset.tab] : null;
  const key = `${kind}|${w}x${h}|${tab}|${seedOf(el)}|${Math.round((light.x - r.left) / 40)}|${Math.round((light.y - r.top) / 40)}`;
  let url = cache.get(key);
  if (!url) {
    LIGHT.x = (light.x - r.left) * d; LIGHT.y = (light.y - r.top) * d; LIGHT.col = PAL.ochre;
    const e = s.edge, cd = card({ w, h, paper: s.paper, edges: { top: e, right: e, bottom: e, left: e }, seed: seedOf(el) % 997 + 1, tooth: HOUSE.tooth, blur: 6 * d });
    const out = document.createElement('canvas'); out.width = cd.c.width; out.height = cd.c.height;
    const g = out.getContext('2d'), dx = (r.left + r.width / 2 - light.x), dy = (r.top + r.height / 2 - light.y), L = Math.hypot(dx, dy) || 1;
    g.globalAlpha = 0.5; g.drawImage(cd.s, (dx / L) * 7 * d, (dy / L) * 7 * d + 2 * d); g.globalAlpha = 1; g.drawImage(cd.c, 0, 0);
    if (tab) { const tc = card({ w: Math.round(8 * d), h: Math.max(4, h - Math.round(14 * d)), paper: 'construction', col: tab, edges: { top: 'scissor', right: 'scissor', bottom: 'scissor', left: 'scissor' }, seed: 31, tooth: HOUSE.tooth, blur: 3 * d }); g.drawImage(tc.c, cd.pad + Math.round(8 * d) - tc.pad, cd.pad + Math.round(7 * d) - tc.pad); }
    url = out.toDataURL('image/png'); cache.set(key, url);
    if (cache.size > 80) cache.delete(cache.keys().next().value);
  }
  el.style.setProperty('--paper', `url(${url})`);
  el.style.setProperty('--paper-pad', `${30 / d}px`);
  el.classList.add('papered');
}

export function disposePaperSkin() { observer?.disconnect(); observer = null; }

/** Skin every [data-paper] under root; re-skin when they change size. */
export function mountPaperSkin(root, light = { x: 0, y: 0 }) {
  disposePaperSkin();
  if (!root) return;
  const els = [...root.querySelectorAll('[data-paper]')];
  const run = () => { const lit = typeof light === 'function' ? light() : light; for (const el of els) skin(el, lit); };
  run();
  observer = new ResizeObserver(() => requestAnimationFrame(run)); for (const el of els) observer.observe(el);
}
