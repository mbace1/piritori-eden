#!/usr/bin/env node
/**
 * The whole board, every layer, and the facts beside it. Both eras.
 *
 *   node map/tools/master-plate.mjs           -> ux/kallio-master.svg
 *   node map/tools/master-plate.mjs --era2    -> ux/helsinki-era2-master.svg
 *   node map/tools/master-plate.mjs --both
 *
 * The other plates each answer one question — where does tram 9 go, which lines
 * share a corridor. This is the reference sheet: §3's L0–L5 stacked in order,
 * with an info column carrying the counts, the services, the provenance and —
 * the part a pretty map usually drops — what is missing.
 *
 * ONE RENDERER, TWO ERAS, deliberately. The eras differ in extent, in inputs and
 * in how a line is coloured; everything else is the same picture. A second file
 * would have been this repository growing two lineages of one thing again — see
 * eeri/PHASING.md for what that has already cost here.
 *
 * WHERE THEY DIFFER, and why:
 *
 *   ERA I — Kallio, the board's own bounds. Seven services, so each gets its own
 *   hue and the sheet is readable by colour alone. The board layers exist:
 *   anchors, edges, sites, portals.
 *
 *   ERA II — Tullinpuomi to Kaivopuisto, Postipuisto to Kalasatama. 27 services
 *   over four modes, which no palette survives, so colour goes back to MODE —
 *   HSL's own rule, tram green / metro orange / rail purple / ferry blue — and
 *   the NUMBER does the wayfinding. There is no anchor board yet, so orientation
 *   comes from the city's own sub-district names instead.
 *
 * Everything comes from committed files and no network.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');
const J = f => JSON.parse(readFileSync(path.join(root, f), 'utf8'));

const INK = '#171d20', PANEL = '#111719', PAPER = '#d6c5a5', MUTED = '#7d6b52';
const GOLD = '#e8c24a', DIM = '#5d5343';
const mono = 'ui-monospace,monospace';
const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Era I's palette. 1/6/7 are Wikidata's values; 3 is deepened off #007fc1 to
// clear line 1, which runs beside it down Helsinginkatu; 8 and 9 have none
// published anywhere. NOT HSL's — HSL has no per-line tram colour at all.
const HUE = {
  M: '#ff6319',
  1: '#00b4e5', 3: '#0b5299', 6: '#009757',
  7: '#d5007f', 8: '#8a5cf0', 9: '#b8d430',
};
// HSL's own, from hsl-map-publisher `colorsByMode`.
const MODE_COL = { tram: '#00985f', metro: '#ff6319', rail: '#8c4799', ferry: '#00b9e4' };

const ERAS = {
  1: {
    out: 'ux/kallio-master.svg',
    rail: 'map/kallio-rail-v1.json',
    cor: 'map/kallio-corridors-v1.json',
    board: 'map/kallio-era1-2003-v1.json',
    water: 'map/kallio-water-v1.json',
    districts: null,
    title: 'PIRITORI TO EDEN',
    colourBy: 'line',
    step: 3, gap: 5, stopR: 2, stopO: 0.42, lineW: 4.2, metroW: 8, chipEvery: 300,
  },
  2: {
    out: 'ux/helsinki-era2-master.svg',
    rail: 'map/helsinki-era2-rail-v1.json',
    cor: 'map/helsinki-era2-corridors-v1.json',
    board: null,
    water: 'map/helsinki-era2-water-v1.json',
    districts: 'map/helsinki-districts-v1.json',
    title: 'PIRITORI TO EDEN — ERA II',
    bounds: { south: 60.148, north: 60.218, west: 24.895, east: 24.995 },
    colourBy: 'mode',
    step: 4, gap: 0, stopR: 1.5, stopO: 0.30, lineW: 2.6, metroW: 5, chipEvery: 340,
  },
};

const MODE_ORDER = { metro: 0, rail: 1, tram: 2, ferry: 3 };

function sheet(era) {
  const C = ERAS[era];
  const rail = J(C.rail);
  const cor = J(C.cor);
  const board = C.board ? J(C.board) : null;
  const districts = C.districts ? J(C.districts).districts : null;

  // Water is a LAYER THAT MAY NOT EXIST YET. Every OSM source is refused by this
  // environment's egress policy, so the file is produced elsewhere (see
  // map/tools/water-import.mjs) and drawn here the moment it lands. Absent, the
  // sheet SAYS SO in the gaps column rather than drawing invented coastline.
  const water = existsSync(path.join(root, C.water)) ? J(C.water) : null;

  const bb = C.bounds || board.coordinateSystem.bounds;
  const B = { s: bb.south - 0.0012, n: bb.north + 0.0012, w: bb.west - 0.0016, e: bb.east + 0.0016 };
  const PHI = Math.cos(60.185 * Math.PI / 180);
  const wD = (B.e - B.w) * PHI, hD = B.n - B.s;
  const PAD = 62, MAP = 1130, MW = MAP * wD / hD;
  const COL = 528, GUT = 30;
  const W = Math.round(PAD + MW + GUT + COL + PAD), H = PAD + MAP + 74;
  const X = lon => PAD + ((lon - B.w) * PHI / wD) * MW;
  const Y = lat => PAD + ((B.n - lat) / hD) * MAP;
  const CX = PAD + MW + GUT;

  const px = shape => shape.map(p => [X(p[1]), Y(p[0])]);
  const d = pts => pts.map(([x, y], i) => (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1)).join(' ');
  const inMap = ([x, y]) => x >= PAD - 2 && x <= PAD + MW + 2 && y >= PAD - 2 && y <= PAD + MAP - 2;

  // Era I draws only what serves the board; Era II has no board to serve, so it
  // draws every line in the box. Direction 0 only in both — the two directions
  // of a route are the same street drawn twice.
  const served = rail.lines
    .filter(l => l.direction === 0 && (era === 2 || l.anchorSequence.length))
    .sort((a, b) => (MODE_ORDER[a.mode] - MODE_ORDER[b.mode])
      || a.service.localeCompare(b.service, 'en', { numeric: true }));
  const key = l => (l.mode === 'metro' && era === 1) ? 'M' : l.service;
  const colour = l => C.colourBy === 'line' ? HUE[key(l)] : MODE_COL[l.mode];
  const weight = l => l.mode === 'metro' ? C.metroW : l.mode === 'rail' ? C.lineW * 1.25 : C.lineW;

  // ── bundling ──────────────────────────────────────────────────────────────
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
  const NEAR = 10, SMOOTH = 17;
  const gridIndex = pts => {
    const g = new Map();
    for (const [x, y] of pts) {
      const k = `${Math.round(x / NEAR)},${Math.round(y / NEAR)}`;
      if (!g.has(k)) g.set(k, []);
      g.get(k).push([x, y]);
    }
    return g;
  };
  const hit = (g, x, y) => {
    const cx = Math.round(x / NEAR), cy = Math.round(y / NEAR);
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++)
      for (const [qx, qy] of g.get(`${cx + a},${cy + b}`) || [])
        if (Math.hypot(qx - x, qy - y) <= NEAR) return true;
    return false;
  };
  /** Fan shared corridors into parallel strands.
   *
   *  Per sample: which lines run here, in a stable order. That gives this line a
   *  SLOT and the slot a perpendicular offset. Slots come from the FULL
   *  membership set, not incrementally, so a strand keeps its side of the bundle
   *  while the same lines are in it — strands that swap sides mid-corridor read
   *  as a junction that is not there. Offsets are then smoothed, because
   *  membership flickers where two lines drift in and out of NEAR and the raw
   *  signal turns a straight run into a zip. */
  function bundle(sampled) {
    const idx = new Map([...sampled].map(([k, p]) => [k, gridIndex(p)]));
    const keys = [...sampled.keys()], out = new Map();
    for (const k of keys) {
      const pts = sampled.get(k);
      const raw = pts.map(([x, y]) => {
        const set = keys.filter(o => o === k || hit(idx.get(o), x, y));
        return (set.indexOf(k) - (set.length - 1) / 2) * C.gap;
      });
      const off = raw.map((_, i) => {
        let a = 0, n = 0;
        for (let j = Math.max(0, i - SMOOTH); j <= Math.min(raw.length - 1, i + SMOOTH); j++) { a += raw[j]; n++; }
        return a / n;
      });
      out.set(k, pts.map(([x, y], i) => {
        const a = pts[Math.max(0, i - 2)], b = pts[Math.min(pts.length - 1, i + 2)];
        const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
        return [x - dy / L * off[i], y + dx / L * off[i]];
      }));
    }
    return out;
  }

  // The metro is in a TUNNEL: it shares no street track, so fanning it into the
  // surface bundle would be a lie about the geometry. It is drawn separately.
  const surface = served.filter(l => l.mode !== 'metro');
  const metros = served.filter(l => l.mode === 'metro');
  // FANNING IS AN ERA I DEVICE. It exists so seven differently-coloured lines
  // over one corridor can be told apart. Era II colours by MODE, so fanning
  // thirteen commuter-rail lines that share the same physical track just draws
  // a 44 px purple ribbon through Pasila where there are two rails — the fan
  // stops describing the city and starts describing the legend. Drawn flat,
  // lines that share a track overdraw into one line, which is the truth.
  const strands = C.gap
    ? bundle(new Map(surface.map(l => [l.id, resample(px(l.shape), C.step)])))
    : new Map(surface.map(l => [l.id, px(l.shape)]));
  const lineById = new Map(served.map(l => [l.id, l]));

  const CHIP_H = 14;
  const chipW = lab => Math.max(18, 9 + String(lab).length * 7.2);
  const chip = (x, y, lab, fill) => {
    const w = chipW(lab);
    return `<rect x="${(x - w / 2).toFixed(1)}" y="${(y - CHIP_H / 2).toFixed(1)}" width="${w.toFixed(1)}" height="${CHIP_H}" rx="3.5" fill="${fill}" stroke="${INK}" stroke-width="1.5"/>`
      + `<text x="${x.toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="middle" fill="${INK}" font-family="${mono}" font-size="10.5" font-weight="700">${esc(lab)}</text>`;
  };

  // ═════════════════════════════════════════════════════════════════════════
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="t ds">`;
  s += `<title id="t">${esc(C.title)} — every layer</title>`;
  s += `<desc id="ds">Era ${era === 1 ? 'I Kallio' : 'II Helsinki'}: corridors that carry service, real HSL rail geometry and stops${board ? ", the board's anchors, edges, sites and portals" : ', and the city\'s sub-district names'}, with an information column giving counts, services, provenance and known gaps.</desc>`;
  s += `<defs><filter id="gl" x="-70%" y="-70%" width="240%" height="240%"><feGaussianBlur stdDeviation="${era === 1 ? 5.5 : 3.5}" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
  s += `<clipPath id="fr"><rect x="${PAD}" y="${PAD}" width="${MW.toFixed(1)}" height="${MAP}"/></clipPath></defs>`;
  s += `<rect width="${W}" height="${H}" fill="${INK}"/>`;
  s += `<g clip-path="url(#fr)">`;

  // ── L-1  water, if it exists ──────────────────────────────────────────────
  if (water) {
    for (const w of water.areas || []) {
      s += `<path d="${d(px(w.shape))} Z" fill="#0f2934" stroke="#17414f" stroke-width="1"/>`;
    }
    // Coastline is an OPEN line in OSM — the sea is implied, not drawn. Filling
    // it would put a lid across the harbour mouth, so it is stroked. That is
    // still enough to give the board its silhouette, which was the point.
    for (const e of water.edges || []) {
      s += `<path d="${d(px(e.shape))}" fill="none" stroke="#2b6076" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`;
    }
  }

  // ── L0  streets that carry service ────────────────────────────────────────
  s += `<g stroke-linecap="round" stroke-linejoin="round" fill="none">`;
  const maxW = Math.log(cor.corridors[0].trips + 1);
  for (const c of [...cor.corridors].sort((a, b) => a.trips - b.trips)) {
    const t = Math.log(c.trips + 1) / maxW;
    s += `<path d="${d(px(c.shape))}" stroke="#4a5a61" stroke-width="${(0.7 + t * (era === 1 ? 4.4 : 3.2)).toFixed(2)}" opacity="${(0.17 + t * 0.31).toFixed(3)}"/>`;
  }
  s += `</g>`;

  // ── L1  the board's own corridor graph ────────────────────────────────────
  // Dashed and STRAIGHT on purpose: these are topology, not geography, and a
  // curve would claim it knows a route it does not. That is L2's job.
  if (board) {
    const anchorById = new Map(board.anchors.map(a => [a.id, a]));
    for (const e of board.edges) {
      const a = anchorById.get(e.from), b = anchorById.get(e.to);
      if (!a || !b) continue;
      s += `<line x1="${X(a.wgs84[1]).toFixed(1)}" y1="${Y(a.wgs84[0]).toFixed(1)}" x2="${X(b.wgs84[1]).toFixed(1)}" y2="${Y(b.wgs84[0]).toFixed(1)}" stroke="#6f5f45" stroke-width="1.1" stroke-dasharray="5 5" opacity=".55"/>`;
    }
  }

  // ── L2  real rail ─────────────────────────────────────────────────────────
  for (const l of metros) {
    s += `<path d="${d(px(l.shape))}" fill="none" stroke="${colour(l)}" stroke-width="${weight(l)}" opacity=".9" stroke-linecap="round" stroke-linejoin="round" filter="url(#gl)"/>`;
  }
  for (const [id, pts] of strands) {
    const l = lineById.get(id);
    s += `<path d="${d(pts)}" fill="none" stroke="${colour(l)}" stroke-width="${weight(l)}" stroke-linecap="round" stroke-linejoin="round" filter="url(#gl)"/>`;
  }

  // ── L2  real stops, unlabelled ────────────────────────────────────────────
  // Labelling some at this scale is a lie of emphasis and labelling all is a
  // grey rectangle, so they are texture; the per-line plates carry the names.
  for (const st of rail.stops) {
    const x = X(st.lon), y = Y(st.lat);
    if (!inMap([x, y])) continue;
    s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${C.stopR}" fill="${PAPER}" opacity="${C.stopO}"/>`;
  }
  s += `</g><rect x="${PAD}" y="${PAD}" width="${MW.toFixed(1)}" height="${MAP}" fill="none" stroke="#2a3439" stroke-width="1"/>`;

  const blocked = [];        // rectangles route bullets must keep off

  // ── place names ───────────────────────────────────────────────────────────
  if (districts) {
    // A place label must fit INSIDE the frame and not sit on another one.
    // Without the first test MUSTIKKAAMAA-KORKEASAARI wrote itself off the
    // right edge; without the second, Vilhonvuori and Sompasaari overprinted.
    const laid = [];
    for (const dd of districts) {
      const x = X(dd.at[1]), y = Y(dd.at[0]);
      const hw = dd.name.length * 3.1 + 7;
      if (!inMap([x, y])) continue;
      if (x - hw < PAD + 2 || x + hw > PAD + MW - 2) continue;
      if (laid.some(([lx, ly, lw]) => Math.abs(lx - x) < lw + hw && Math.abs(ly - y) < 15)) continue;
      laid.push([x, y, hw]);
      blocked.push([x, y, hw * 2, 18]);
      s += `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" fill="#9a8a6c" font-family="${mono}" font-size="10" letter-spacing=".8" paint-order="stroke" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round">${esc(dd.name.toUpperCase())}</text>`;
    }
  }

  // ── L5  portals and anchors ───────────────────────────────────────────────
  const sitesByAnchor = new Map();
  if (board) {
    const CS = board.coordinateSystem;
    // Portals carry board x/y and no wgs84, unlike everything else. The
    // coordinateSystem block converts them; checked against the anchors, which
    // carry both and agree to five decimals. They sit outside the bounds by
    // design — they are where the board stops being the board.
    const fromBoard = b => [
      CS.origin.lat + (CS.board.offsetY - b.y) * CS.board.metresPerUnit / CS.metresPerDegree.lat,
      CS.origin.lon + (b.x - CS.board.offsetX) * CS.board.metresPerUnit / CS.metresPerDegree.lon,
    ];
    for (const p of board.portals) {
      const [lat, lon] = fromBoard(p.board);
      const x = X(lon), y = Y(lat);
      const cxm = Math.max(PAD + 8, Math.min(PAD + MW - 8, x));
      const cym = Math.max(PAD + 8, Math.min(PAD + MAP - 8, y));
      const edgeX = Math.abs(cxm - x) > Math.abs(cym - y);
      const ax = edgeX ? (x < cxm ? -1 : 1) : 0, ay = edgeX ? 0 : (y < cym ? -1 : 1);
      s += `<g transform="translate(${cxm.toFixed(1)},${cym.toFixed(1)})">`;
      s += `<path d="M ${ax * 9} ${ay * 9} L ${ax * 2 - ay * 6} ${ay * 2 - ax * 6} L ${ax * 2 + ay * 6} ${ay * 2 + ax * 6} Z" fill="${GOLD}" opacity=".8"/>`;
      s += `<text x="${ax ? -ax * 14 : 16}" y="${ay ? (ay > 0 ? -13 : 20) : 4}" text-anchor="${ax > 0 ? 'end' : 'start'}" fill="${GOLD}" font-family="${mono}" font-size="10" letter-spacing="1" opacity=".85" paint-order="stroke" stroke="${INK}" stroke-width="3.5">${esc(p.label)}</text></g>`;
    }

    for (const st of board.sites) {
      if (!sitesByAnchor.has(st.anchorId)) sitesByAnchor.set(st.anchorId, []);
      sitesByAnchor.get(st.anchorId).push(st);
    }
    for (const a of board.anchors) {
      const x = X(a.wgs84[1]), y = Y(a.wgs84[0]);
      if (!inMap([x, y])) continue;
      const n = (sitesByAnchor.get(a.id) || []).length;
      const locked = a.sliceState === 'locked';
      // The reserved box must sit where the LABEL is — 22 px BELOW the diamond
      // on this sheet, not left of it as on the other plates. Reserving the
      // diamond instead let a bullet land squarely on LINJAT / HÄMEENTIE.
      blocked.push([x, y + 18, a.label.length * 6.6 + 16, 19]);
      blocked.push([x, y, 26, 22]);
      s += `<rect x="${(x - 6.5).toFixed(1)}" y="${(y - 6.5).toFixed(1)}" width="13" height="13" fill="${INK}" stroke="${GOLD}" stroke-width="2.2" opacity="${locked ? '.45' : '1'}" transform="rotate(45 ${x.toFixed(1)} ${y.toFixed(1)})"/>`;
      if (n) s += `<circle cx="${(x + 10).toFixed(1)}" cy="${(y - 9).toFixed(1)}" r="6.5" fill="${GOLD}"/><text x="${(x + 10).toFixed(1)}" y="${(y - 6).toFixed(1)}" text-anchor="middle" fill="${INK}" font-family="${mono}" font-size="9" font-weight="700">${n}</text>`;
      s += `<text x="${x.toFixed(1)}" y="${(y + 22).toFixed(1)}" text-anchor="middle" fill="${GOLD}" font-family="${mono}" font-size="10.5" letter-spacing=".5" opacity="${locked ? '.5' : '1'}" paint-order="stroke" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round">${esc(a.label)}</text>`;
    }
  }

  // ── route bullets ─────────────────────────────────────────────────────────
  const placed = [...blocked];
  const free = ([x, y], w) => inMap([x, y]) && !placed.some(([bx, by, bw, bh]) =>
    Math.abs(bx - x) < (bw + w) / 2 + 4 && Math.abs(by - y) < (bh + CHIP_H) / 2 + 3);
  const bulletable = [...metros.map(l => [l, px(l.shape)]),
  ...[...strands].map(([id, pts]) => [lineById.get(id), pts])];
  bulletable.forEach(([l, pts], si) => {
    const lab = key(l), w = chipW(lab);
    let arc = 0, next = 70 + si * (era === 1 ? 104 : 46);
    for (let i = 1; i < pts.length; i++) {
      arc += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      if (arc < next) continue;
      let j = i;
      for (let t = 0; t < 46 && !free(pts[j], w) && j < pts.length - 1; t++) j = Math.min(pts.length - 1, j + 5);
      if (free(pts[j], w)) {
        placed.push([pts[j][0], pts[j][1], w, CHIP_H]);
        s += chip(pts[j][0], pts[j][1], lab, colour(l));
      }
      next = arc + C.chipEvery;
    }
  });

  // ═══ the info column ══════════════════════════════════════════════════════
  s += `<rect x="${CX}" y="${PAD}" width="${COL}" height="${MAP}" fill="${PANEL}" stroke="#222c30" stroke-width="1"/>`;
  let y = PAD + 30;
  const IX = CX + 22, IW = COL - 44;
  const put = (t, o = {}) => {
    s += `<text x="${o.x ?? IX}" y="${y}" fill="${o.fill || MUTED}" font-family="${mono}" font-size="${o.size || 11}"${o.ls ? ` letter-spacing="${o.ls}"` : ''}${o.anchor ? ` text-anchor="${o.anchor}"` : ''}${o.weight ? ` font-weight="${o.weight}"` : ''}>${esc(t)}</text>`;
    y += o.step ?? 15;
  };
  const rule = (g = 10) => { y += g; s += `<line x1="${IX}" y1="${y}" x2="${IX + IW}" y2="${y}" stroke="#263034" stroke-width="1"/>`; y += g + 6; };
  /** Wrap on WORDS at a character budget. Monospace makes this exact rather than
   *  approximate, which is why the gaps section carries real sentences. */
  const wrap = (t, cpl, o = {}) => {
    let line = '';
    for (const word of t.split(' ')) {
      if ((line + ' ' + word).trim().length > cpl) { put(line, { ...o, step: o.step ?? 14 }); line = word; }
      else line = (line + ' ' + word).trim();
    }
    if (line) put(line, { ...o, step: o.step ?? 14 });
  };

  s += `<text x="${IX}" y="${y}" fill="${PAPER}" font-family="${mono}" font-size="16" letter-spacing="2">${esc(C.title)}</text>`;
  y += 20;
  put(era === 1
    ? `${board.title.replace('Piritori to Eden — ', '')} · era ${board.era} · ${board.status}`
    : `Tullinpuomi – Postipuisto – Kalasatama – Kaivopuisto · live-feed era`, { fill: DIM });
  rule();

  // layers
  put('LAYERS', { fill: PAPER, ls: 2, size: 11.5 });
  y += 4;
  const swatch = (kind, col) => {
    if (kind === 'line') return `<line x1="${IX}" y1="${y - 4}" x2="${IX + 22}" y2="${y - 4}" stroke="${col}" stroke-width="3.4" stroke-linecap="round"/>`;
    if (kind === 'dash') return `<line x1="${IX}" y1="${y - 4}" x2="${IX + 22}" y2="${y - 4}" stroke="${col}" stroke-width="1.1" stroke-dasharray="5 5"/>`;
    if (kind === 'dot') return `<circle cx="${IX + 11}" cy="${y - 4}" r="2.4" fill="${col}" opacity=".7"/>`;
    if (kind === 'fill') return `<rect x="${IX}" y="${y - 10}" width="22" height="12" fill="${col}" stroke="#17414f" stroke-width="1"/>`;
    if (kind === 'text') return `<text x="${IX}" y="${y}" fill="${col}" font-family="${mono}" font-size="9" letter-spacing=".8">ABC</text>`;
    return `<rect x="${IX + 4.5}" y="${y - 10.5}" width="13" height="13" fill="${INK}" stroke="${col}" stroke-width="2.2" transform="rotate(45 ${IX + 11} ${y - 4})"/>`;
  };
  const LAYERS = [];
  LAYERS.push(water
    ? ['fill', '#0f2934', 'L−1', `water — ${water.areas.length} filled, ${(water.edges||[]).length} coastline runs · ${water.source?.attribution || 'imported'}`]
    : ['fill', '#243036', 'L−1', 'water — NOT PRESENT; every OSM source is blocked here (see gaps)']);
  LAYERS.push(['line', '#4a5a61', 'L0', `streets carrying service — ${cor.corridors.length} corridors, width = weekly trips`]);
  if (board) LAYERS.push(['dash', '#6f5f45', 'L1', `the board’s corridor graph — ${board.edges.length} edges, anchor to anchor`]);
  LAYERS.push(['line', MODE_COL.metro, 'L2', `real HSL rail — ${rail.lines.length} line directions, ${C.gap ? 'shared corridors fanned' : 'coloured by mode, shared track drawn once'}`]);
  LAYERS.push(['dot', PAPER, 'L2', `real HSL stops — ${rail.stops.length} in the box, unlabelled at this scale`]);
  if (districts) LAYERS.push(['text', '#9a8a6c', 'L5', `city sub-district names — ${districts.length} in frame, for orientation`]);
  if (board) LAYERS.push(['diam', GOLD, 'L5', `board anchors — ${board.anchors.length}, badge = sites (${board.sites.length} total)`]);
  for (const [kind, col, tag, text] of LAYERS) {
    s += swatch(kind, col);
    s += `<text x="${IX + 32}" y="${y}" fill="${PAPER}" font-family="${mono}" font-size="10.5" font-weight="700">${tag}</text>`;
    let line = '';
    const emit = t => { s += `<text x="${IX + 64}" y="${y}" fill="${MUTED}" font-family="${mono}" font-size="10.5">${esc(t)}</text>`; y += 13; };
    for (const word of text.split(' ')) {
      if ((line + ' ' + word).trim().length > 50) { emit(line); line = word; } else line = (line + ' ' + word).trim();
    }
    if (line) emit(line);
    y += 6;
  }
  rule(4);

  // services
  put(era === 1 ? 'SERVICES ON THE BOARD, TODAY' : 'SERVICES IN THE EXTENT, TODAY', { fill: PAPER, ls: 1.4, size: 11.5 });
  y += 6;
  if (era === 1) {
    for (const l of served) {
      const k = key(l), p = l.name.split(' - ');
      s += chip(IX + 9, y - 4, k, colour(l));
      s += `<text x="${IX + 26}" y="${y}" fill="${PAPER}" font-family="${mono}" font-size="10.5">${esc(p[0] + ' – ' + p[p.length - 1])}</text>`;
      s += `<text x="${IX + IW}" y="${y}" text-anchor="end" fill="${MUTED}" font-family="${mono}" font-size="10.5">${l.trips} trips · ${l.anchorSequence.length} anchors</text>`;
      y += 17;
    }
    y += 2;
    wrap('Trams 2, 4, 5 and 10 reach the extract box but never enter Kallio — nearest is 554 m. Six trams and the metro is the whole set.', 62, { size: 10, fill: DIM, step: 12.5 });
  } else {
    // 27 services will not fit as rows, and a list of endpoints nobody reads is
    // worse than a count. Grouped by mode, which is also how they are coloured.
    for (const m of ['metro', 'rail', 'tram', 'ferry']) {
      const ls = served.filter(l => l.mode === m);
      if (!ls.length) continue;
      const dirs = rail.lines.filter(l => l.mode === m).length;
      const trips = rail.lines.filter(l => l.mode === m).reduce((a, l) => a + l.trips, 0);
      s += `<rect x="${IX}" y="${(y - 9).toFixed(1)}" width="22" height="11" rx="2.5" fill="${MODE_COL[m]}"/>`;
      s += `<text x="${IX + 30}" y="${y}" fill="${PAPER}" font-family="${mono}" font-size="10.5" font-weight="700">${esc(m)}</text>`;
      s += `<text x="${IX + IW}" y="${y}" text-anchor="end" fill="${MUTED}" font-family="${mono}" font-size="10">${ls.length} lines · ${dirs} directions · ${trips} trips</text>`;
      y += 14;
      wrap(ls.map(l => l.service).join('  '), 58, { size: 10, fill: MUTED, step: 12.5, x: IX + 30 });
      y += 5;
    }
  }
  rule(4);

  if (era === 1) {
    put('ERA I — 2003, AS THE BOARD HAS IT', { fill: PAPER, ls: 1.4, size: 11.5 });
    y += 6;
    for (const ps of board.periodServices) {
      const documented = ps.sourceClass === 'documented';
      s += `<text x="${IX}" y="${y}" fill="${PAPER}" font-family="${mono}" font-size="10.5" font-weight="700">${esc(ps.label)}</text>`;
      s += `<text x="${(IX + Math.max(34, ps.label.length * 7.2 + 12)).toFixed(1)}" y="${y}" fill="${MUTED}" font-family="${mono}" font-size="10">${esc(ps.anchorSequence.join(' → '))}</text>`;
      s += `<text x="${IX + IW}" y="${y}" text-anchor="end" fill="${documented ? '#8fae6a' : '#a8894e'}" font-family="${mono}" font-size="9.5">${documented ? 'documented' : 'inferred'}</text>`;
      y += 16;
    }
    y += 2;
    wrap('Both inferred tram routes are corroborated by the modern lines that still run on the same rails — §10.5.', 62, { size: 10, fill: DIM, step: 12.5 });
    rule(4);
  }

  // gaps — the part a pretty map drops
  put('WHAT THIS MAP DOES NOT KNOW', { fill: '#c08a5a', ls: 1.4, size: 11.5 });
  y += 6;
  const GAPS = [];
  if (!water) GAPS.push('NO WATER — the biggest hole, because the coastline is what carries Helsinki’s silhouette. Every OSM source is refused by this environment’s egress policy. §11.2 has the query; water-import.mjs takes its output.');
  GAPS.push('L0 is corridors that carry service, NOT a street map. Any street with no route on it is absent.');
  // Was a hardcoded sentence about tram 13 being absent. It is present now, so
  // the sheet asks the data rather than repeating a claim that expired.
  {
    const names = new Set((rail.lines || []).map(l => String(l.service)));
    GAPS.push(names.has('13')
      ? `Feed is ${rail.source.feedVersion || 'unknown'}. Tram 13 (opened 12 Aug 2024) IS in it.`
      : `Feed is ${rail.source.feedVersion || 'unknown'}. Tram 13 opened 12 Aug 2024 through Kalasatama and Vallilanlaakso and is not in it.`);
  }
  if (era === 1) {
    GAPS.push('anchorSequence means PASSES, not CALLS AT. The metro runs under Karhupuisto and stops at Hakaniemi and Sörnäinen only.');
    GAPS.push('Line colours are ours, not HSL’s — HSL draws every tram one green and lets the number do the work.');
  } else {
    GAPS.push('No anchors, sites or edges: the Era II extent has real geometry and nothing authored on it yet. Orientation is the city’s own sub-district names.');
    GAPS.push('Colour is by MODE here, which is HSL’s own rule — 27 services is past what any palette survives.');
  }
  for (const g of GAPS) { wrap('· ' + g, 62, { size: 10, fill: MUTED, step: 12.5 }); y += 4; }

  // provenance, pinned to the bottom while everything above it flows — so they
  // can collide as content grows. The anchor roster ran through the copyright
  // line once; hence the guard at the end.
  const py = PAD + MAP - 44;
  if (era === 1) {
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
      y += 12;
    }
  } else if (districts) {
    rule(4);
    put('AREAS IN FRAME', { fill: PAPER, ls: 2, size: 11.5 });
    y += 3;
    wrap(districts.map(dd => dd.name).join(', '), 62, { size: 9.5, fill: MUTED, step: 12 });
  }

  const overflow = y > py - 20;
  s += `<line x1="${IX}" y1="${py - 14}" x2="${IX + IW}" y2="${py - 14}" stroke="#263034" stroke-width="1"/>`;
  s += `<text x="${IX}" y="${py}" fill="${DIM}" font-family="${mono}" font-size="10">${esc(rail.source.attribution)} · ${rail.source.licence} · GTFS ${esc(rail.source.feedVersion || 'unknown')}</text>`;
  s += `<text x="${IX}" y="${py + 14}" fill="${DIM}" font-family="${mono}" font-size="10">generated · no network · map/tools/master-plate.mjs${era === 2 ? ' --era2' : ''}</text>`;
  s += `<text x="${IX}" y="${py + 28}" fill="${DIM}" font-family="${mono}" font-size="10">TRANSIT_LAYERS.md §3 layer stack, §10–§11 the data</text>`;

  const kmW = (bb.east - bb.west) * PHI * 111320 / 1000;
  const kmH = (bb.north - bb.south) * 111320 / 1000;
  s += `<text x="${PAD}" y="${H - 26}" fill="${DIM}" font-family="${mono}" font-size="10.5">bounds ${bb.south}–${bb.north} N, ${bb.west}–${bb.east} E · ${kmW.toFixed(2)} × ${kmH.toFixed(2)} km · north up · frame padded past the bounds so an edge feature is not on the rule</text>`;
  s += `</svg>`;

  return { svg: s, W, H, overflow, y, py, served, rail, cor, districts, water };
}

const want = process.argv.includes('--both') ? [1, 2]
  : process.argv.includes('--era2') ? [2] : [1];
for (const era of want) {
  const r = sheet(era);
  writeFileSync(path.join(root, ERAS[era].out), r.svg + '\n');
  console.log(`→ ${ERAS[era].out}  ${r.W}×${r.H}`);
  console.log(`  L0 ${r.cor.corridors.length} corridors · L2 ${r.rail.lines.length} line directions, ${r.rail.stops.length} stops`
    + (r.districts ? ` · ${r.districts.length} areas` : '') + (r.water ? ` · ${r.water.areas.length} water areas` : ' · NO WATER'));
  if (r.overflow) console.warn(`  ! info column overflows: content reaches ${Math.round(r.y)}, provenance starts ${r.py - 14}`);
}
