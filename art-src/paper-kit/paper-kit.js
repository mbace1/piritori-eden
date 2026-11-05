// Piritori paper kit — AD1 (design/ART_DIRECTION_NON_BATTLE.md).
//
// The cut-paper register of ART_BIBLE.md, drawn in code: the six paper families
// (§3.1), the edge vocabulary (§3.2), relief and one contact shadow per layer
// (§3.3), sparse crooked marker (§3.4), Era I palette tokens (§4) and one
// practical light (§6.2). The technique — cards as cached canvases, a shadow
// that follows the light — is borrowed from the Radio Free papercut films; the
// look is this repo's. No dependencies.
//
// Everything is seeded: the same seed draws the same card, and a different seed
// never draws the same contour twice (§3.4).

export const PAL = {
  // §4.1 world
  night: '#121719', charcoal: '#24282A', wetBlue: '#183542', plaster: '#817F75',
  kraft: '#C7AA79', offwhite: '#E2D8C2', ochre: '#D09535', tram: '#315A4B',
  moss: '#52664B', rust: '#9A4E34',
  // §4.2 system accents
  cyan: '#38B8C8', magenta: '#B84D83', orange: '#C87539', mustard: '#C5A044',
  green: '#648F63', blue: '#4F7FA0', red: '#A94B43', grey: '#676B6B',
  ink: '#17191A',
};

export function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
// smooth 1D noise, seeded
function noise1(seed) {
  const r = rng(seed), g = Array.from({ length: 256 }, () => r() * 2 - 1);
  return (x) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return g[i & 255] * (1 - u) + g[(i + 1) & 255] * u; };
}
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
export const shade = (h, k) => { const c = hex(h).map((v) => Math.max(0, Math.min(255, Math.round(k > 0 ? v + (255 - v) * k : v * (1 + k))))); return `rgb(${c})`; };
const rgba = (h, a) => `rgba(${hex(h)},${a})`;

// ── edges (§3.2) ────────────────────────────────────────────────────────────
// Each card side is resampled and pushed along its outward normal by the edge
// type's profile. One dominant treatment per card, at most one secondary.
const PROFILE = {
  // scissor: a soft curve, and a small step where each snip ends
  scissor: (n, r) => { let next = 50 + r() * 40, step = 0; return (t) => { if (t > next) { step += (r() - 0.5) * 2.4; next += 55 + r() * 45; } return n(t / 60) * 1.6 + step; }; },
  // blunt knife: dead straight runs, slightly off the square, with a hard kink
  knife: (n, r) => { const skew = (r() - 0.5) * 0.02, at = 120 + r() * 300, kink = (r() - 0.5) * 5; return (t) => t * skew + (t > at ? kink : 0); },
  torn: (n, r) => (t) => n(t / 30) * 5 + n(t / 9 + 40) * 2.4 + (r() - 0.5) * 2.2,
  corrugated: (n, r) => (t) => n(t / 18) * 2.2 + (r() - 0.5) * 1.2,
  clean: () => () => 0,
};
function sidePoints(p0, p1, type, seed, step = 3) {
  const n = noise1(seed), r = rng(seed + 7), f = (PROFILE[type] || PROFILE.clean)(n, r);
  const dx = p1[0] - p0[0], dy = p1[1] - p0[1], L = Math.hypot(dx, dy), nx = dy / L, ny = -dx / L, out = [];
  for (let s = 0; s < L; s += step) { const o = f(s) * (s < 8 || L - s < 8 ? Math.min(s, L - s) / 8 : 1); out.push([p0[0] + (dx * s) / L + nx * o, p0[1] + (dy * s) / L + ny * o]); }
  return out;
}
// a card outline: rect with per-side edge types; `fold` takes one corner off
export function outline(w, h, edges, seed, fold = 0) {
  const c = [[0, 0], [w, 0], [w, h], [0, h]];
  if (fold) c.splice(1, 1, [w - fold, 0], [w, fold]);            // the top-right corner folded under
  const types = fold ? [edges.top, 'clean', edges.right, edges.bottom, edges.left] : [edges.top, edges.right, edges.bottom, edges.left];
  const pts = [];
  for (let i = 0; i < c.length; i++) pts.push(...sidePoints(c[i], c[(i + 1) % c.length], types[i] || 'scissor', seed + i * 101));
  return pts;
}
const tracePath = (g, pts) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); };

// ── paper families (§3.1) ──────────────────────────────────────────────────
// fill(g, w, h, r): the paper itself. Texture budget (§3.5): fibre is the last
// thing you notice, so every family keeps its tooth faint.
export const PAPER = {
  heavy: { base: PAL.charcoal, core: '#3a3f40', tooth: 0.05, fibre: 0, job: 'night ground, water, HUD backing' },
  construction: { base: PAL.tram, core: '#6f8f80', tooth: 0.07, fibre: 0.4, job: 'clothing, route strips, buttons, signs' },
  kraft: { base: PAL.kraft, core: '#e2cfa6', tooth: 0.08, fibre: 1, job: 'labels, dialogue, walls, counters' },
  packaging: { base: '#d9d2bf', core: '#efe9da', tooth: 0.05, fibre: 0, print: 'pack', job: 'one local accent, a prop face' },
  newsprint: { base: '#d2cbb8', core: '#e8e2d2', tooth: 0.06, fibre: 0.3, print: 'news', job: 'broadcasts, ledger, dated notices' },
  vellum: { base: '#f3efe4', core: '#ffffff', tooth: 0, fibre: 0, alpha: 0.26, job: 'fog, window glow, breath, TV bloom' },
};
function fillPaper(g, w, h, paper, col, r, tooth) {
  g.fillStyle = col || paper.base; g.fillRect(-20, -20, w + 40, h + 40);
  // low cloudiness: the sheet is never one flat colour, but no shape may read
  // before the card's own silhouette (§3.5) — a coarse noise field, upscaled smooth
  { const m = document.createElement('canvas'), mw = Math.ceil(w / 24) + 2, mh = Math.ceil(h / 24) + 2; m.width = mw; m.height = mh; const mg = m.getContext('2d'), id = mg.createImageData(mw, mh);
    for (let i = 0; i < mw * mh; i++) { const v = r() < 0.5 ? 255 : 0; id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = v; id.data[i * 4 + 3] = Math.round(r() * 10); }
    mg.putImageData(id, 0, 0); g.save(); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(m, -24, -24, mw * 24, mh * 24); g.restore(); }
  const t = tooth ?? paper.tooth;
  for (let i = 0; i < (w * h) / 260; i++) { g.fillStyle = r() < 0.5 ? `rgba(255,250,235,${t})` : `rgba(0,0,0,${t * 1.2})`; g.fillRect(r() * w, r() * h, 1 + r() * 1.5, 1); }
  if (paper.fibre) { g.lineWidth = 1; for (let i = 0; i < (w * h * paper.fibre) / 5000; i++) { const x = r() * w, y = r() * h, a = r() * 6.3, l = 4 + r() * 10; g.strokeStyle = r() < 0.6 ? 'rgba(255,240,210,.10)' : 'rgba(60,40,20,.10)'; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + (r() - 0.5) * 3, y + Math.sin(a) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); } }
  if (paper.print === 'pack') printPack(g, w, h, r);
  if (paper.print === 'news') printNews(g, w, h, r);
}
function printPack(g, w, h, r) {        // a found fragment of a 2003 carton: bands, a halftone, a bit of a word
  g.save(); g.globalAlpha = 0.85;
  g.fillStyle = PAL.rust; g.fillRect(-20, h * 0.18, w + 40, h * 0.16);
  g.fillStyle = PAL.mustard; g.fillRect(-20, h * 0.34, w + 40, h * 0.05);
  g.fillStyle = 'rgba(40,30,25,.55)'; for (let y = h * 0.5; y < h; y += 9) for (let x = (y / 9) % 2 ? 4 : 0; x < w * 0.55; x += 9) { const d = 1.2 + 2.4 * (1 - (y - h * 0.5) / (h * 0.5)) * (x / (w * 0.55)); g.beginPath(); g.arc(x, y, d, 0, 7); g.fill(); }
  g.fillStyle = '#f4efe2'; g.font = `700 ${Math.round(h * 0.12)}px "Barlow Condensed"`; g.fillText('MAITO', w * 0.08, h * 0.31);
  g.restore();
}
function printNews(g, w, h, r) {         // newsprint: a headline bar, columns of grey text lines, one halftone photo
  g.save(); g.fillStyle = 'rgba(30,30,30,.72)'; g.fillRect(w * 0.06, h * 0.08, w * 0.7, h * 0.07);
  g.fillStyle = 'rgba(40,40,40,.35)';
  const cols = 3, cw = (w * 0.88) / cols;
  for (let c = 0; c < cols; c++) for (let y = h * 0.24; y < h * 0.94; y += 9) { if (c === 2 && y < h * 0.6) continue; g.fillRect(w * 0.06 + c * cw, y, cw * (0.78 + r() * 0.18), 3); }
  g.fillStyle = 'rgba(30,30,30,.5)'; for (let y = h * 0.24; y < h * 0.58; y += 7) for (let x = w * 0.06 + 2 * cw; x < w * 0.94; x += 7) { g.beginPath(); g.arc(x, y, 0.8 + r() * 2.2, 0, 7); g.fill(); }
  g.restore();
}

// ── a card: paper + edge + rim + cached shadow ──────────────────────────────
// spec: { w, h, paper, col, edges:{top,right,bottom,left}, fold, seed, tooth, draw(g) }
export function card(spec) {
  const { w, h, seed = 1 } = spec, paper = PAPER[spec.paper] || PAPER.kraft, pad = 30;
  const c = document.createElement('canvas'); c.width = w + 2 * pad; c.height = h + 2 * pad;
  const g = c.getContext('2d'); g.translate(pad, pad);
  const pts = outline(w, h, spec.edges || {}, seed, spec.fold || 0), r = rng(seed * 31 + 5);
  g.save(); tracePath(g, pts); g.clip(); fillPaper(g, w, h, paper, spec.col, r, spec.tooth); if (spec.draw) spec.draw(g, r); g.restore();
  // torn and corrugated sides show the paper's core: a pale, ragged rim (§3.2)
  rims(g, w, h, spec, paper, seed);
  if (spec.fold) { const f = spec.fold; g.fillStyle = shade(spec.col || paper.base, -0.28); g.beginPath(); g.moveTo(w - f, 0); g.lineTo(w, f); g.lineTo(w - f, f); g.closePath(); g.fill(); g.strokeStyle = 'rgba(255,245,225,.35)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(w - f, 0); g.lineTo(w, f); g.stroke(); }
  if (paper.alpha) { const v = document.createElement('canvas'); v.width = c.width; v.height = c.height; const vg = v.getContext('2d'); vg.globalAlpha = paper.alpha; vg.drawImage(c, 0, 0); return finish(v, pad, spec, true); }
  return finish(c, pad, spec, false);
}
function rims(g, w, h, spec, paper, seed) {
  const e = spec.edges || {}, sides = { top: [[0, 0], [w, 0]], right: [[w, 0], [w, h]], bottom: [[w, h], [0, h]], left: [[0, h], [0, 0]] };
  const idx = { top: 0, right: 1, bottom: 2, left: 3 };
  for (const [k, [a, b]] of Object.entries(sides)) {
    const pts = sidePoints(a, b, e[k] || 'scissor', seed + idx[k] * 101), dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L; // inward normal
    if (e[k] === 'torn') {
      // the paper's pale core shows where fibres tore: a band of varying width, inside the edge
      const r = rng(seed + idx[k] * 13), n = noise1(seed + idx[k] * 17);
      g.fillStyle = rgba(paper.core, 0.62); g.beginPath();
      pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
      for (let i = pts.length - 1; i >= 0; i--) { const wd = 1.5 + Math.max(0, n(i / 9)) * 5 + r() * 1.2; g.lineTo(pts[i][0] + nx * wd, pts[i][1] + ny * wd); }
      g.closePath(); g.fill();
    }
    if (e[k] === 'corrugated') {
      // a broken carton edge shows its section: liner, the wave of the flute, liner
      g.save(); g.strokeStyle = 'rgba(222,198,150,.95)'; g.lineWidth = 2.2;
      for (const d of [1.5, 16]) { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo : g.moveTo).call(g, x + nx * d, y + ny * d)); g.stroke(); }
      g.beginPath(); pts.forEach(([x, y], i) => { const d = 8.75 + Math.sin(i * 0.8) * 6; (i ? g.lineTo : g.moveTo).call(g, x + nx * d, y + ny * d); }); g.stroke(); g.restore();
    }
    if (e[k] === 'knife') { g.strokeStyle = 'rgba(0,0,0,.28)'; g.lineWidth = 1.6; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo : g.moveTo).call(g, x + nx, y + ny)); g.stroke(); }
  }
}
function finish(c, pad, spec) {
  const s = document.createElement('canvas'); s.width = c.width; s.height = c.height; const sg = s.getContext('2d');
  sg.drawImage(c, 0, 0); sg.globalCompositeOperation = 'source-in'; sg.fillStyle = '#000'; sg.fillRect(0, 0, s.width, s.height);
  const b = document.createElement('canvas'); b.width = c.width; b.height = c.height; const bg = b.getContext('2d'); bg.filter = `blur(${spec.blur ?? 7}px)`; bg.drawImage(s, 0, 0);
  return { c, s: b, pad, w: spec.w, h: spec.h };
}

// ── the light (§6.2): one practical source; shadows fall away from it ───────
export const LIGHT = { x: 0, y: 0, col: PAL.ochre, power: 1 };
export function place(g, cd, x, y, { lift = 1, rot = 0, shadow = 0.5 } = {}) {
  const cx = x + cd.w / 2, cy = y + cd.h / 2, dx = cx - LIGHT.x, dy = cy - LIGHT.y, L = Math.hypot(dx, dy) || 1;
  const off = 6 + 8 * lift, ox = (dx / L) * off, oy = (dy / L) * off + 2 * lift;
  for (const [img, a, sx, sy] of [[cd.s, shadow, ox, oy], [cd.c, 1, 0, 0]]) {
    g.save(); g.globalAlpha = a; g.translate(cx + sx, cy + sy); g.rotate(rot); g.drawImage(img, -cd.w / 2 - cd.pad, -cd.h / 2 - cd.pad); g.restore();
  }
  // the edge that faces the light catches it: a thin warm line, nothing more
  g.save(); g.translate(cx, cy); g.rotate(rot); g.globalCompositeOperation = 'lighter'; g.strokeStyle = rgba(LIGHT.col, 0.16 * LIGHT.power);
  g.lineWidth = 2; g.beginPath(); const lx = -dx / L, ly = -dy / L;
  if (Math.abs(lx) > 0.3) { const sx = Math.sign(lx) * cd.w / 2; g.moveTo(sx, -cd.h / 2 + 4); g.lineTo(sx, cd.h / 2 - 4); }
  if (Math.abs(ly) > 0.3) { const sy = Math.sign(ly) * cd.h / 2; g.moveTo(-cd.w / 2 + 4, sy); g.lineTo(cd.w / 2 - 4, sy); }
  g.stroke(); g.restore();
}
// the practical's pool over a whole board: warm near the source, falling to night
export function pool(g, w, h, a = 0.22) {
  const gr = g.createRadialGradient(LIGHT.x, LIGHT.y, 0, LIGHT.x, LIGHT.y, Math.max(w, h) * 0.9);
  gr.addColorStop(0, rgba(LIGHT.col, a)); gr.addColorStop(0.5, rgba(LIGHT.col, a * 0.25)); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.save(); g.globalCompositeOperation = 'soft-light'; g.fillStyle = gr; g.fillRect(0, 0, w, h); g.restore();
}

// ── marker (§3.4): wobble, taper, skip, dry out, overshoot ─────────────────
// opts: { width, col, seed, wobble, taper, skip, dry, overshoot, alpha }
export function marker(g, pts, o = {}) {
  const { width = 6, col = PAL.ink, seed = 1, wobble = 1, taper = 1, skip = 0, dry = 0, overshoot = 1, alpha = 0.9 } = o;
  const n = noise1(seed), r = rng(seed + 3);
  // resample the polyline, extending past both ends a touch (overshoot)
  const seg = []; for (let i = 0; i < pts.length - 1; i++) seg.push([pts[i], pts[i + 1]]);
  const samples = [];
  const ext = (a, b, k) => [a[0] + (a[0] - b[0]) * k, a[1] + (a[1] - b[1]) * k];
  const P = [ext(pts[0], pts[1], 0.06 * overshoot), ...pts, ext(pts[pts.length - 1], pts[pts.length - 2], 0.08 * overshoot)];
  for (let i = 0; i < P.length - 1; i++) { const [a, b] = [P[i], P[i + 1]], L = Math.hypot(b[0] - a[0], b[1] - a[1]); for (let s = 0; s < L; s += 1.5) samples.push([a[0] + ((b[0] - a[0]) * s) / L, a[1] + ((b[1] - a[1]) * s) / L, (b[1] - a[1]) / L, -(b[0] - a[0]) / L]); }
  const N = samples.length; let gap = 0;
  g.save(); g.fillStyle = col;
  for (let i = 0; i < N; i++) {
    const t = i / N, [x, y, nx, ny] = samples[i];
    if (skip && gap <= 0 && r() < skip * 0.02) gap = 4 + r() * 14; if (gap > 0) { gap--; continue; }
    const wob = n(i / 40) * width * 0.55 * wobble;
    const wt = width * (taper ? Math.min(1, 0.35 + t * 3) * Math.min(1, 0.3 + (1 - t) * 2.2) : 1);
    const dryA = dry ? Math.max(0.15, 1 - Math.max(0, t - 0.55) * 2.2 * dry) : 1;
    g.globalAlpha = alpha * dryA * (dry && t > 0.6 && r() < 0.35 * dry ? 0.25 : 1);
    g.beginPath(); g.ellipse(x + nx * wob, y + ny * wob, wt / 2, wt / 2.6, Math.atan2(-nx, ny), 0, 7); g.fill();
  }
  g.restore();
}
// a hand-drawn box or circle as marker: never the same twice
export function markerBox(g, x, y, w, h, o = {}) {
  const r = rng(o.seed || 1), j = () => (r() - 0.5) * (o.jitter ?? 5);
  marker(g, [[x + j(), y + j()], [x + w + j(), y + j()], [x + w + j(), y + h + j()], [x + j(), y + h + j()], [x + j() + 6, y + j() - 2]], o);
}
export function markerRing(g, cx, cy, rx, ry, o = {}) {
  const r = rng(o.seed || 1), pts = [];
  for (let a = -0.4; a < Math.PI * 2 + 0.5; a += 0.12) { const k = 1 + (r() - 0.5) * 0.06; pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]); }
  marker(g, pts, o);
}

// ── treatments (AD1 board 4) ───────────────────────────────────────────────
// Owner, 2026-10-17, picking from AD1 board 4: "A, restrained". A is the house
// treatment for the non-battle cut-paper register. B and C are kept as the
// record of what was shown, not as options to use.
export const TREATMENTS = {
  A: { name: 'A · RESTRAINED', sub: 'clean cuts, almost no marker, faint grain', edge: 'scissor', slab: { top: 'scissor', bottom: 'scissor' }, tooth: 0.03, rims: false, fold: 0, mark: 0, extras: 0 },
  B: { name: 'B · BALANCED', sub: 'torn slab, knife-cut buttons, sparse marker', edge: 'knife', slab: { top: 'torn', bottom: 'torn' }, tooth: null, rims: true, fold: 34, mark: 1, extras: 1 },
  C: { name: 'C · RICH (the limit)', sub: 'everything torn, folds, heavy marker, print', edge: 'torn', slab: { top: 'torn', bottom: 'torn' }, tooth: 0.13, rims: true, fold: 44, mark: 2, extras: 2 },
};
export const HOUSE = TREATMENTS.A;
