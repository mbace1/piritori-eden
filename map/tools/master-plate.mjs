#!/usr/bin/env node
/**
 * The whole board, every layer, and the facts beside it.
 *
 *   node map/tools/master-plate.mjs        -> ux/kallio-master.svg
 *
 * The other plates each answer one question — where does tram 9 go, which
 * lines share a corridor. This one is the reference sheet: L0 to L5 of
 * `TRANSIT_LAYERS.md` §3 stacked in order over the FULL board bounds rather
 * than the Kallio crop, with an info column carrying the counts, the services,
 * the provenance and — the part a pretty map usually drops — what is missing.
 *
 * Everything on it comes from three committed files and no network:
 *   map/kallio-corridors-v1.json   L0  streets that carry service
 *   map/kallio-era1-2003-v1.json   L1  the board: anchors, edges, sites, portals
 *   map/kallio-rail-v1.json        L2  real rail geometry and stops
 *
 * The crop is the BOARD's own bounds from its `coordinateSystem`, so the sheet
 * shows the game's actual extent — including the three eastern anchors the
 * Kallio crop cuts off, which is where the tram-13 gap in §10.9 lands.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const here = path.dirname(new URL(import.meta.url).pathname);
const root = path.resolve(here, '..', '..');
const rail = JSON.parse(readFileSync(path.join(root, 'map/kallio-rail-v1.json'), 'utf8'));
const board = JSON.parse(readFileSync(path.join(root, 'map/kallio-era1-2003-v1.json'), 'utf8'));
const cor = JSON.parse(readFileSync(path.join(root, 'map/kallio-corridors-v1.json'), 'utf8'));

// The board's own bounds, padded a little so an anchor on the edge is not
// standing on the frame.
const bb = board.coordinateSystem.bounds;
const B = { s: bb.south - 0.0012, n: bb.north + 0.0012, w: bb.west - 0.0016, e: bb.east + 0.0016 };
const PHI = Math.cos(60.185 * Math.PI / 180);
const wD = (B.e - B.w) * PHI, hD = B.n - B.s;

const PAD = 62, MAP = 1130, MW = MAP * wD / hD;
const COL = 528;                                   // the info column
const GUT = 30;
const W = Math.round(PAD + MW + GUT + COL + PAD), H = PAD + MAP + 74;
const X = lon => PAD + ((lon - B.w) * PHI / wD) * MW;
const Y = lat => PAD + ((B.n - lat) / hD) * MAP;
const CX = PAD + MW + GUT;                         // info column left edge

const INK = '#171d20', PANEL = '#111719', PAPER = '#d6c5a5', MUTED = '#7d6b52';
const GOLD = '#e8c24a', DIM = '#5d5343';
const HUE = {
  M: '#ff6319',
  1: '#00b4e5', 3: '#0b5299', 6: '#009757',
  7: '#d5007f', 8: '#8a5cf0', 9: '#b8d430',
};

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const mono = 'ui-monospace,monospace';

// ── the board→WGS transform, so PORTALS can be placed ───────────────────────
// Portals carry board x/y and no wgs84, unlike every other feature. The
// coordinateSystem block is enough to convert: verified against the anchors,
// which carry BOTH and agree to five decimal places.
const CS = board.coordinateSystem;
const fromBoard = b => [
  CS.origin.lat + (CS.board.offsetY - b.y) * CS.board.metresPerUnit / CS.metresPerDegree.lat,
  CS.origin.lon + (b.x - CS.board.offsetX) * CS.board.metresPerUnit / CS.metresPerDegree.lon,
];

const served = rail.lines.filter(l => l.direction === 0 && l.anchorSequence.length);
const trams = served.filter(l => l.mode === 'tram').sort((a, b) => +a.service - +b.service);
const metro = served.find(l => l.mode === 'metro');
const anchorById = new Map(board.anchors.map(a => [a.id, a]));

const px = shape => shape.map(p => [X(p[1]), Y(p[0])]);
const d = pts => pts.map(([x, y], i) => (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1)).join(' ');
const inMap = ([x, y]) => x >= PAD - 2 && x <= PAD + MW + 2 && y >= PAD - 2 && y <= PAD + MAP - 2;

// ── bundling, same rule as network-plate.mjs ────────────────────────────────
function resample(pts, step) {
  const out = [pts[0]]; let carry = 0;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    const L = Math.hypot(x1 - x0, y1 - y0);
    if (!L) continue;
    for (let t = step - carry; t < L; t += step) out.push([x0 + (x1 - x0) * t / L, y0 + (y1 - y0) * t / L]);
    carry = (carry + L) % step;
  }
  out.push(pts[pts.length - 1]);
  return out;
}
const STEP = 3, NEAR = 10, GAP = 5, SMOOTH = 17;
function index(pts) {
  const g = new Map();
  for (const [x, y] of pts) {
    const k = `${Math.round(x / NEAR)},${Math.round(y / NEAR)}`;
    if (!g.has(k)) g.set(k, []);
    g.get(k).push([x, y]);
  }
  return g;
}
const hit = (g, x, y) => {
  const cx = Math.round(x / NEAR), cy = Math.round(y / NEAR);
  for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++)
    for (const [qx, qy] of g.get(`${cx + a},${cy + b}`) || [])
      if (Math.hypot(qx - x, qy - y) <= NEAR) return true;
  return false;
};
function bundle(sampled) {
  const idx = new Map([...sampled].map(([k, p]) => [k, index(p)]));
  const keys = [...sampled.keys()], out = new Map();
  for (const k of keys) {
    const pts = sampled.get(k);
    const raw = pts.map(([x, y]) => {
      const set = keys.filter(o => o === k || hit(idx.get(o), x, y));
      return (set.indexOf(k) - (set.length - 1) / 2) * GAP;
    });
    const off = raw.map((_, i) => {
      let s = 0, n = 0;
      for (let j = Math.max(0, i - SMOOTH); j <= Math.min(raw.length - 1, i + SMOOTH); j++) { s += raw[j]; n++; }
      return s / n;
    });
    out.set(k, pts.map(([x, y], i) => {
      const a = pts[Math.max(0, i - 2)], b = pts[Math.min(pts.length - 1, i + 2)];
      const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
      return [x - dy / L * off[i], y + dx / L * off[i]];
    }));
  }
  return out;
}

const CHIP_W = 18, CHIP_H = 14;
const chip = (x, y, label, fill) =>
  `<rect x="${(x - CHIP_W / 2).toFixed(1)}" y="${(y - CHIP_H / 2).toFixed(1)}" width="${CHIP_W}" height="${CHIP_H}" rx="3.5" fill="${fill}" stroke="${INK}" stroke-width="1.5"/>`
  + `<text x="${x.toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="middle" fill="${INK}" font-family="${mono}" font-size="10.5" font-weight="700">${esc(label)}</text>`;

// ═══════════════════════════════════════════════════════════════════════════
let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="t ds">`;
s += `<title id="t">Piritori to Eden — Era I Kallio, every layer</title>`;
s += `<desc id="ds">The full board with all six layers stacked: streets that carry service, the board's own corridor graph, real HSL rail geometry and stops, board anchors, sites and portals — with an information column giving counts, services, provenance and known gaps.</desc>`;
s += `<defs><filter id="gl" x="-70%" y="-70%" width="240%" height="240%"><feGaussianBlur stdDeviation="5.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
s += `<clipPath id="fr"><rect x="${PAD}" y="${PAD}" width="${MW.toFixed(1)}" height="${MAP}"/></clipPath></defs>`;
s += `<rect width="${W}" height="${H}" fill="${INK}"/>`;

// ── L0  streets that carry service ─────────────────────────────────────────
s += `<g clip-path="url(#fr)"><g stroke-linecap="round" stroke-linejoin="round" fill="none">`;
const maxW = Math.log(cor.corridors[0].trips + 1);
for (const c of [...cor.corridors].sort((a, b) => a.trips - b.trips)) {
  const t = Math.log(c.trips + 1) / maxW;
  s += `<path d="${d(px(c.shape))}" stroke="#4a5a61" stroke-width="${(0.8 + t * 4.4).toFixed(2)}" opacity="${(0.17 + t * 0.31).toFixed(3)}"/>`;
}
s += `</g>`;

// ── L1  the board's own corridor graph ─────────────────────────────────────
// The 24 edges are the game's topology, not geography: anchor to anchor, with
// the modes that edge allows. Drawn dashed and straight ON PURPOSE — a curve
// would claim it knows the route, and it does not. That is L2's job.
for (const e of board.edges) {
  const a = anchorById.get(e.from), b = anchorById.get(e.to);
  if (!a || !b) continue;
  s += `<line x1="${X(a.wgs84[1]).toFixed(1)}" y1="${Y(a.wgs84[0]).toFixed(1)}" x2="${X(b.wgs84[1]).toFixed(1)}" y2="${Y(b.wgs84[0]).toFixed(1)}" stroke="#6f5f45" stroke-width="1.1" stroke-dasharray="5 5" opacity=".55"/>`;
}

// ── L2  real rail: the metro unbundled, the trams fanned ───────────────────
s += `<path d="${d(px(metro.shape))}" fill="none" stroke="${HUE.M}" stroke-width="8" opacity=".9" stroke-linecap="round" stroke-linejoin="round" filter="url(#gl)"/>`;
const strands = bundle(new Map(trams.map(l => [l.service, resample(px(l.shape), STEP)])));
for (const [k, pts] of strands) {
  s += `<path d="${d(pts)}" fill="none" stroke="${HUE[k]}" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round" filter="url(#gl)"/>`;
}

// ── L2  real HSL stops, unlabelled ─────────────────────────────────────────
// 287 of them. Labelling any is a lie of emphasis at this scale and labelling
// all is a grey rectangle, so they are texture: the map reads as a network with
// stops on it, and the per-line plates carry the names.
for (const st of rail.stops) {
  const x = X(st.lon), y = Y(st.lat);
  if (!inMap([x, y])) continue;
  s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2" fill="${PAPER}" opacity=".42"/>`;
}
s += `</g><rect x="${PAD}" y="${PAD}" width="${MW.toFixed(1)}" height="${MAP}" fill="none" stroke="#2a3439" stroke-width="1"/>`;

// ── L5  portals, on the frame ──────────────────────────────────────────────
// They sit outside the bounds by design — they are where the board stops being
// the board. Clamped to the edge and drawn as an arrow out of it.
for (const p of board.portals) {
  const [lat, lon] = fromBoard(p.board);
  let x = X(lon), y = Y(lat);
  const cxm = Math.max(PAD + 8, Math.min(PAD + MW - 8, x));
  const cym = Math.max(PAD + 8, Math.min(PAD + MAP - 8, y));
  const edgeX = Math.abs(cxm - x) > Math.abs(cym - y);
  const ax = edgeX ? (x < cxm ? -1 : 1) : 0, ay = edgeX ? 0 : (y < cym ? -1 : 1);
  s += `<g transform="translate(${cxm.toFixed(1)},${cym.toFixed(1)})">`;
  s += `<path d="M ${ax * 9} ${ay * 9} L ${ax * 2 - ay * 6} ${ay * 2 - ax * 6} L ${ax * 2 + ay * 6} ${ay * 2 + ax * 6} Z" fill="${GOLD}" opacity=".8"/>`;
  s += `<text x="${ax ? -ax * 14 : 16}" y="${ay ? (ay > 0 ? -13 : 20) : 4}" text-anchor="${ax > 0 ? 'end' : ax < 0 ? 'start' : 'start'}" fill="${GOLD}" font-family="${mono}" font-size="10" letter-spacing="1" opacity=".85" paint-order="stroke" stroke="${INK}" stroke-width="3.5">${esc(p.label)}</text></g>`;
}

// ── L5  anchors, with their site count ─────────────────────────────────────
const sitesByAnchor = new Map();
for (const st of board.sites) {
  if (!sitesByAnchor.has(st.anchorId)) sitesByAnchor.set(st.anchorId, []);
  sitesByAnchor.get(st.anchorId).push(st);
}
const chipBlock = [];
for (const a of board.anchors) {
  const x = X(a.wgs84[1]), y = Y(a.wgs84[0]);
  if (!inMap([x, y])) continue;
  const n = (sitesByAnchor.get(a.id) || []).length;
  const locked = a.sliceState === 'locked';
  // The reserved box must sit where the LABEL is, which on this sheet is
  // centred 22 px BELOW the diamond, not left of it as on the other plates.
  // Reserving the diamond's own position instead let a route bullet land
  // squarely on LINJAT / HÄMEENTIE.
  chipBlock.push([x, y + 18, a.label.length * 6.6 + 16, 19]);
  chipBlock.push([x, y, 26, 22]);                     // the diamond and its badge
  s += `<rect x="${(x - 6.5).toFixed(1)}" y="${(y - 6.5).toFixed(1)}" width="13" height="13" fill="${INK}" stroke="${GOLD}" stroke-width="2.2" opacity="${locked ? '.45' : '1'}" transform="rotate(45 ${x.toFixed(1)} ${y.toFixed(1)})"/>`;
  if (n) s += `<circle cx="${(x + 10).toFixed(1)}" cy="${(y - 9).toFixed(1)}" r="6.5" fill="${GOLD}"/><text x="${(x + 10).toFixed(1)}" y="${(y - 6).toFixed(1)}" text-anchor="middle" fill="${INK}" font-family="${mono}" font-size="9" font-weight="700">${n}</text>`;
  s += `<text x="${x.toFixed(1)}" y="${(y + 22).toFixed(1)}" text-anchor="middle" fill="${GOLD}" font-family="${mono}" font-size="10.5" letter-spacing=".5" opacity="${locked ? '.5' : '1'}" paint-order="stroke" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round">${esc(a.label)}</text>`;
}

// route bullets, dodging the anchor labels and each other
const placed = [...chipBlock];
const free = ([x, y]) => inMap([x, y]) && !placed.some(([bx, by, bw, bh]) =>
  Math.abs(bx - x) < (bw + CHIP_W) / 2 + 4 && Math.abs(by - y) < (bh + CHIP_H) / 2 + 3);
[['M', px(metro.shape)], ...strands].forEach(([k, pts], si) => {
  let arc = 0, next = 70 + si * 104;
  for (let i = 1; i < pts.length; i++) {
    arc += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (arc < next) continue;
    let j = i;
    for (let t = 0; t < 46 && !free(pts[j]) && j < pts.length - 1; t++) j = Math.min(pts.length - 1, j + 5);
    if (free(pts[j])) { placed.push([pts[j][0], pts[j][1], CHIP_W, CHIP_H]); s += chip(pts[j][0], pts[j][1], k, HUE[k]); }
    next = arc + 300;
  }
});

// ═══ the info column ═══════════════════════════════════════════════════════
s += `<rect x="${CX}" y="${PAD}" width="${COL}" height="${MAP}" fill="${PANEL}" stroke="#222c30" stroke-width="1"/>`;
let y = PAD + 30;
const IX = CX + 22, IW = COL - 44;
const put = (t, o = {}) => {
  s += `<text x="${o.x ?? IX}" y="${y}" fill="${o.fill || MUTED}" font-family="${mono}" font-size="${o.size || 11}"${o.ls ? ` letter-spacing="${o.ls}"` : ''}${o.anchor ? ` text-anchor="${o.anchor}"` : ''}${o.weight ? ` font-weight="${o.weight}"` : ''}>${esc(t)}</text>`;
  y += o.step ?? 15;
};
const rule = (g = 10) => { y += g; s += `<line x1="${IX}" y1="${y}" x2="${IX + IW}" y2="${y}" stroke="#263034" stroke-width="1"/>`; y += g + 6; };
/** Wrap on WORDS at a character budget. A monospace column makes this exact
 *  rather than approximate, which is why the gaps section can carry real
 *  sentences instead of being cut to fit. */
const wrap = (t, cpl, o = {}) => {
  const words = t.split(' ');
  let line = '';
  for (const w of words) {
    if ((line + ' ' + w).trim().length > cpl) { put(line, { ...o, step: o.step ?? 14 }); line = w; }
    else line = (line + ' ' + w).trim();
  }
  if (line) put(line, { ...o, step: o.step ?? 14 });
};

s += `<text x="${IX}" y="${y}" fill="${PAPER}" font-family="${mono}" font-size="16" letter-spacing="2">PIRITORI TO EDEN</text>`;
y += 20;
put(`${board.title.replace('Piritori to Eden — ', '')} · era ${board.era} · ${board.status}`, { fill: DIM });
rule();

// layers
put('LAYERS', { fill: PAPER, ls: 2, size: 11.5 });
y += 4;
const swatch = (kind, col) => {
  if (kind === 'line') return `<line x1="${IX}" y1="${y - 4}" x2="${IX + 22}" y2="${y - 4}" stroke="${col}" stroke-width="3.4" stroke-linecap="round"/>`;
  if (kind === 'dash') return `<line x1="${IX}" y1="${y - 4}" x2="${IX + 22}" y2="${y - 4}" stroke="${col}" stroke-width="1.1" stroke-dasharray="5 5"/>`;
  if (kind === 'dot') return `<circle cx="${IX + 11}" cy="${y - 4}" r="2.4" fill="${col}" opacity=".7"/>`;
  return `<rect x="${IX + 4.5}" y="${y - 10.5}" width="13" height="13" fill="${INK}" stroke="${col}" stroke-width="2.2" transform="rotate(45 ${IX + 11} ${y - 4})"/>`;
};
const LAYERS = [
  ['line', '#4a5a61', 'L0', `streets carrying service — ${cor.corridors.length} corridors, width = weekly trips`],
  ['dash', '#6f5f45', 'L1', `the board's corridor graph — ${board.edges.length} edges, anchor to anchor`],
  ['line', HUE.M, 'L2', `real HSL rail — ${rail.lines.length} line directions, shared corridors fanned`],
  ['dot', PAPER, 'L2', `real HSL stops — ${rail.stops.length} in the box, unlabelled at this scale`],
  ['diam', GOLD, 'L5', `board anchors — ${board.anchors.length}, badge = sites (${board.sites.length} total)`],
];
for (const [kind, col, tag, text] of LAYERS) {
  s += swatch(kind, col);
  s += `<text x="${IX + 32}" y="${y}" fill="${PAPER}" font-family="${mono}" font-size="10.5" font-weight="700">${tag}</text>`;
  y += 0;
  const words = text.split(' '); let line = '';
  const emit = t => { s += `<text x="${IX + 60}" y="${y}" fill="${MUTED}" font-family="${mono}" font-size="10.5">${esc(t)}</text>`; y += 13; };
  for (const w of words) {
    if ((line + ' ' + w).trim().length > 52) { emit(line); line = w; } else line = (line + ' ' + w).trim();
  }
  if (line) emit(line);
  y += 6;
}
rule(4);

// services
put('SERVICES ON THE BOARD, TODAY', { fill: PAPER, ls: 1.4, size: 11.5 });
y += 6;
for (const l of [metro, ...trams]) {
  const k = l.mode === 'metro' ? 'M' : l.service;
  const p = l.name.split(' - ');
  s += chip(IX + 9, y - 4, k, HUE[k]);
  s += `<text x="${IX + 26}" y="${y}" fill="${PAPER}" font-family="${mono}" font-size="10.5">${esc(p[0] + ' – ' + p[p.length - 1])}</text>`;
  s += `<text x="${IX + IW}" y="${y}" text-anchor="end" fill="${MUTED}" font-family="${mono}" font-size="10.5">${l.trips} trips · ${l.anchorSequence.length} anchors</text>`;
  y += 17;
}
y += 2;
wrap('Trams 2, 4, 5 and 10 reach the extract box but never enter Kallio — nearest is 554 m. Six trams and the metro is the whole set.', 62, { size: 10, fill: DIM, step: 12.5 });
rule(4);

// era I
put('ERA I — 2003, AS THE BOARD HAS IT', { fill: PAPER, ls: 1.4, size: 11.5 });
y += 6;
for (const ps of board.periodServices) {
  const documented = ps.sourceClass === 'documented';
  // The sequence column starts after the LABEL, measured. A fixed 34 px put
  // "hakaniemi → …" straight through the service called HÄMEENTIE.
  s += `<text x="${IX}" y="${y}" fill="${PAPER}" font-family="${mono}" font-size="10.5" font-weight="700">${esc(ps.label)}</text>`;
  s += `<text x="${(IX + Math.max(34, ps.label.length * 7.2 + 12)).toFixed(1)}" y="${y}" fill="${MUTED}" font-family="${mono}" font-size="10">${esc(ps.anchorSequence.join(' → '))}</text>`;
  s += `<text x="${IX + IW}" y="${y}" text-anchor="end" fill="${documented ? '#8fae6a' : '#a8894e'}" font-family="${mono}" font-size="9.5">${documented ? 'documented' : 'inferred'}</text>`;
  y += 16;
}
y += 2;
wrap('Both inferred tram routes are corroborated by the modern lines that still run on the same rails — §10.5.', 62, { size: 10, fill: DIM, step: 12.5 });
rule(4);

// gaps — the part a pretty map drops
put('WHAT THIS MAP DOES NOT KNOW', { fill: '#c08a5a', ls: 1.4, size: 11.5 });
y += 6;
for (const g of [
  'Feed is 2022-02-22. Tram 13 opened 12 Aug 2024 through Kalasatama and Vallilanlaakso — not drawn, and it probably serves the Suvilahti and Vallila anchors, which still read here as off-network.',
  'L0 is corridors that carry service, NOT a street map. Every street with no route on it is absent — Torkkelinkatu, Agricolankatu, most of Torkkelinmäki. Of 64.7 km of corridor in the Kallio crop, 12.8 km (20%) is genuinely off the rail lines.',
  'No water. Kallio is shaped by Eläintarhanlahti and the harbour, and neither is here; it matters more to the read than the missing streets do.',
  'anchorSequence means PASSES, not CALLS AT. The metro runs under Karhupuisto and stops at Hakaniemi and Sörnäinen only.',
  'Line colours are ours, not HSL\'s — HSL draws every tram one green and lets the number do the work.',
]) { wrap('· ' + g, 62, { size: 10, fill: MUTED, step: 12.5 }); y += 4; }

// ── the anchor roster ──────────────────────────────────────────────────────
// The map can show WHERE the anchors are and how many sites hang off each; it
// cannot show what they are for. This is the half the diamonds cannot carry.
rule(4);
put('ANCHORS', { fill: PAPER, ls: 2, size: 11.5 });
y += 5;
for (const a of board.anchors) {
  const n = (sitesByAnchor.get(a.id) || []).length;
  const locked = a.sliceState === 'locked';
  s += `<text x="${IX}" y="${y}" fill="${locked ? DIM : PAPER}" font-family="${mono}" font-size="9.5">${esc(a.label)}</text>`;
  s += `<text x="${IX + 172}" y="${y}" fill="${MUTED}" font-family="${mono}" font-size="9.5">${esc(a.roles.slice(0, 3).join(' · '))}</text>`;
  if (n) s += `<text x="${IX + IW - 46}" y="${y}" text-anchor="end" fill="${GOLD}" font-family="${mono}" font-size="9.5">${n} site${n > 1 ? 's' : ''}</text>`;
  s += `<text x="${IX + IW}" y="${y}" text-anchor="end" fill="${locked ? '#7a5f4a' : '#6d7f56'}" font-family="${mono}" font-size="9.5">${esc(a.sliceState)}</text>`;
  y += 12.5;
}

// Provenance is PINNED to the bottom of the column while everything above it
// flows, so the two can collide as content grows — the anchor roster ran
// straight through the copyright line the first time. Cheap guard: say so.
const py = PAD + MAP - 44;
if (y > py - 20) {
  console.warn(`  ! info column overflows: content reaches ${Math.round(y)}, provenance starts ${py - 14}`);
}
s += `<line x1="${IX}" y1="${py - 14}" x2="${IX + IW}" y2="${py - 14}" stroke="#263034" stroke-width="1"/>`;
s += `<text x="${IX}" y="${py}" fill="${DIM}" font-family="${mono}" font-size="10">${esc(rail.source.attribution)} · ${rail.source.licence} · GTFS 2022-02-22</text>`;
s += `<text x="${IX}" y="${py + 14}" fill="${DIM}" font-family="${mono}" font-size="10">generated · no network · map/tools/master-plate.mjs</text>`;
s += `<text x="${IX}" y="${py + 28}" fill="${DIM}" font-family="${mono}" font-size="10">TRANSIT_LAYERS.md §3 layer stack, §10 the data</text>`;

// The km must measure the BOUNDS the sentence names, not the padded crop the
// sheet is drawn at — quoting one and measuring the other is how a caption
// starts lying quietly.
const kmW = (bb.east - bb.west) * PHI * 111320 / 1000;
const kmH = (bb.north - bb.south) * 111320 / 1000;
s += `<text x="${PAD}" y="${H - 26}" fill="${DIM}" font-family="${mono}" font-size="10.5">board bounds ${bb.south}–${bb.north} N, ${bb.west}–${bb.east} E · ${kmW.toFixed(2)} × ${kmH.toFixed(2)} km · north up · frame is padded past the bounds so an edge anchor is not on the rule</text>`;
s += `</svg>`;

writeFileSync(path.join(root, 'ux/kallio-master.svg'), s + '\n');
console.log(`→ ux/kallio-master.svg  ${W}×${H}`);
console.log(`  L0 ${cor.corridors.length} corridors · L1 ${board.edges.length} edges · L2 ${rail.lines.length} lines, ${rail.stops.length} stops`);
console.log(`  L5 ${board.anchors.length} anchors, ${board.sites.length} sites, ${board.portals.length} portals`);
