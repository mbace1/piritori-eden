#!/usr/bin/env node
/**
 * Every line that serves the board, on one sheet, on top of each other.
 *
 *   node map/tools/network-plate.mjs            -> ux/kallio-network.svg   (per-line colour)
 *   node map/tools/network-plate.mjs --hsl      -> ux/kallio-network-hsl.svg (HSL's real colours)
 *   node map/tools/network-plate.mjs --both
 *
 * WHY THERE ARE TWO. The owner asked for "the line colors that HSL uses for
 * each tram line". HSL does not have any — verified from three of their own
 * sources, not from memory:
 *
 *   - hsl-map-publisher/src/util/domain.js, which draws the printed maps,
 *     keys colour off `colorsByMode`: TRAM #00985f, SUBWAY #ff6319,
 *     RAIL #8c4799, BUS #007AC9, FERRY #00B9E4, L_RAIL #0098A1.
 *   - digitransit-ui/app/configurations/config.hsl.js is the same: mode
 *     colours, no route table.
 *   - the GTFS has no `route_color` column at all.
 *
 * Helsinki DID have per-line tram colours, and dropped them in 1954. So the
 * modern answer to "what colour is tram 9" is: green, like every other tram,
 * and the NUMBER is the wayfinding.
 *
 * That is a real fork rather than a rule to recite, so this draws both and the
 * owner can look. `--hsl` is what a Helsinki player recognises. The default is
 * legibility-first: one hue per line, so six routes over one corridor can be
 * told apart at a glance. Its palette is NOT HSL's and says so on the sheet.
 *
 * Both modes BUNDLE. Six lines share Siltasaarenkatu and Hämeentie almost
 * exactly, so drawn honestly they are one line with five hidden underneath.
 * Shared corridors fan into parallel strands, which is what every real transit
 * map does and the only reason the sheet says anything at all.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');
const rail = JSON.parse(readFileSync(path.join(root, 'map/kallio-rail-v1.json'), 'utf8'));
const board = JSON.parse(readFileSync(path.join(root, 'map/kallio-era1-2003-v1.json'), 'utf8'));
const cor = JSON.parse(readFileSync(path.join(root, 'map/kallio-corridors-v1.json'), 'utf8'));

// Same crop as the per-line plates, so the two sheets can be laid side by side.
const B = { s: 60.1758, n: 60.1908, w: 24.9395, e: 24.9660 };
const PHI = Math.cos(60.185 * Math.PI / 180);
const wD = (B.e - B.w) * PHI, hD = B.n - B.s;
const PAD = 78, MAP = 980, MW = MAP * wD / hD;
const H = PAD + MAP + 218, W = Math.round(MW) + 2 * PAD;
const X = lon => PAD + ((lon - B.w) * PHI / wD) * MW;
const Y = lat => PAD + ((B.n - lat) / hD) * MAP;

// HSL's own, from hsl-map-publisher `colorsByMode`. Not per line — per MODE.
const HSL = { tram: '#00985f', metro: '#ff6319', lightRail: '#0098A1' };

// The legibility palette. Lines 1/6/7 are the values Wikidata carries for them
// (community data, not HSL's); 8 and 9 have none there and are chosen to sit in
// the same family without colliding with the gold the anchors use.
//
// 3 IS DEEPER THAN WIKIDATA'S #007fc1 on purpose. That value against 1's
// #00b4e5 is two blues a step apart, and 1 and 3 run side by side down
// Helsinginkatu and Siltasaarenkatu — precisely where telling them apart
// matters. Separation between ADJACENT lines beats fidelity to a community
// colour that HSL does not use either.
const HUE = {
  M: '#ff6319',
  1: '#00b4e5', 3: '#0b5299', 6: '#009757',
  7: '#d5007f', 8: '#8a5cf0', 9: '#b8d430',
};

const GOLD = '#e8c24a', INK = '#171d20', PAPER = '#d6c5a5', MUTED = '#7d6b52';
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

// ── the lines that actually serve the board ──────────────────────────────────
const served = rail.lines.filter(l => l.direction === 0 && l.anchorSequence.length);
const trams = served.filter(l => l.mode === 'tram').sort((a, b) => +a.service - +b.service);
const metro = served.find(l => l.mode === 'metro');

// ── geometry ────────────────────────────────────────────────────────────────
const px = shape => shape.map(p => [X(p[1]), Y(p[0])]);

/** Even samples along a polyline. Bundling compares point sets, so the two
 *  strands of a shared corridor have to be sampled at the same spacing or a
 *  sparse one reads as "nobody here" beside a dense one. */
function resample(pts, step) {
  const out = [pts[0]];
  let carry = 0;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    const L = Math.hypot(x1 - x0, y1 - y0);
    if (!L) continue;
    for (let d = step - carry; d < L; d += step) {
      out.push([x0 + (x1 - x0) * d / L, y0 + (y1 - y0) * d / L]);
    }
    carry = (carry + L) % step;
  }
  out.push(pts[pts.length - 1]);
  return out;
}

const STEP = 3, NEAR = 10, GAP = 5.2, SMOOTH = 17;

/** Grid hash so "which lines run here" is not O(n²) across six polylines. */
function index(pts) {
  const g = new Map();
  pts.forEach(([x, y]) => {
    const k = `${Math.round(x / NEAR)},${Math.round(y / NEAR)}`;
    if (!g.has(k)) g.set(k, []);
    g.get(k).push([x, y]);
  });
  return g;
}
const hits = (g, x, y) => {
  const cx = Math.round(x / NEAR), cy = Math.round(y / NEAR);
  for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
    for (const [px_, py] of g.get(`${cx + a},${cy + b}`) || []) {
      if (Math.hypot(px_ - x, py - y) <= NEAR) return true;
    }
  }
  return false;
};

/** Fan shared corridors into parallel strands.
 *
 *  Per sample: which services run here, in service order. That gives this
 *  service a SLOT, and the slot gives it a perpendicular offset. Slots are
 *  assigned from the full membership set rather than incrementally, so a line
 *  keeps the same side of the bundle for as long as the same lines are in it —
 *  strands that swap sides mid-corridor read as a junction that is not there.
 *
 *  The offsets are then smoothed along the strand. Membership flickers sample
 *  to sample where two lines drift in and out of NEAR of each other, and the
 *  raw signal turns a straight run into a zip.
 */
function bundle(sampled) {
  const idx = new Map([...sampled].map(([k, pts]) => [k, index(pts)]));
  const keys = [...sampled.keys()];
  const out = new Map();

  for (const k of keys) {
    const pts = sampled.get(k);
    const raw = pts.map(([x, y]) => {
      const here_ = keys.filter(o => o === k || hits(idx.get(o), x, y));
      return (here_.indexOf(k) - (here_.length - 1) / 2) * GAP;
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

const d = pts => pts.map(([x, y], i) => (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1)).join(' ');
const inMap = ([x, y]) => x >= PAD - 2 && x <= PAD + MW + 2 && y >= PAD - 2 && y <= PAD + MAP - 2;

/** Route bullets along each strand. Walks arc length and drops one every
 *  CHIP_EVERY px, shoving along the line when the slot is taken.
 *
 *  Two things it must dodge, both of which it did not at first:
 *
 *  - EACH OTHER. Parallel strands otherwise stamp their numbers on the same
 *    spot exactly where the bundle is densest and the label matters most.
 *    The start offset is also staggered per strand, or six chips queue into a
 *    vertical stack the moment six lines run together down Siltasaarenkatu.
 *  - THE ANCHOR LABELS. A route bullet through the middle of PIRITORI / KURVI
 *    costs the sheet the one piece of text that ties it to the board. Anchors
 *    are the board talking about itself and they win.
 */
const CHIP_W = 19, CHIP_H = 15, CHIP_EVERY = 320;
function chips(strands, blocked) {
  const placed = [...blocked];
  const out = [];
  const free = ([x, y]) => inMap([x, y]) && !placed.some(([bx, by, bw, bh]) =>
    Math.abs(bx - x) < (bw + CHIP_W) / 2 + 4 && Math.abs(by - y) < (bh + CHIP_H) / 2 + 3);

  strands.forEach(([k, pts], si) => {
    let arc = 0, next = 60 + si * 96;
    for (let i = 1; i < pts.length; i++) {
      arc += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      if (arc < next) continue;
      let j = i;
      for (let t = 0; t < 46 && !free(pts[j]) && j < pts.length - 1; t++) j = Math.min(pts.length - 1, j + 5);
      if (free(pts[j])) {
        placed.push([pts[j][0], pts[j][1], CHIP_W, CHIP_H]);
        out.push([k, pts[j]]);
      }
      next = arc + CHIP_EVERY;
    }
  });
  return out;
}

const chip = (x, y, label, fill) =>
  `<rect x="${(x - CHIP_W / 2).toFixed(1)}" y="${(y - CHIP_H / 2).toFixed(1)}" width="${CHIP_W}" height="${CHIP_H}" rx="3.5" fill="${fill}" stroke="${INK}" stroke-width="1.5"/>`
  + `<text x="${x.toFixed(1)}" y="${(y + 4.2).toFixed(1)}" text-anchor="middle" fill="${INK}" font-family="ui-monospace,monospace" font-size="11" font-weight="700">${esc(label)}</text>`;

/** The street underlay.
 *
 *  `map/kallio-corridors-v1.json` is every corridor HSL runs service along,
 *  with the weekly trip count on each. It is NOT a street map — a street with
 *  no route on it is not in it — but in Kallio it draws most of the grid that
 *  matters, and it is real geometry rather than a decorative scribble.
 *
 *  Weight drives width and brightness together, on a LOG scale: the busiest
 *  corridor here carries 10,943 trips a week and the quietest carries a
 *  handful, so linear scaling renders Hämeentie and leaves everything else at
 *  zero. Log gives a trunk, a street and a lane instead of a trunk and a void.
 */
function streets() {
  const max = Math.log(cor.corridors[0].trips + 1);
  let g = `<g stroke-linecap="round" stroke-linejoin="round" fill="none">`;
  // Quiet first, so a busy corridor is never buried by a bus diversion.
  for (const c of [...cor.corridors].sort((a, b) => a.trips - b.trips)) {
    const t = Math.log(c.trips + 1) / max;
    const w = (0.8 + t * 4.4).toFixed(2);
    const o = (0.17 + t * 0.33).toFixed(3);
    g += `<path d="${d(px(c.shape))}" stroke="#4a5a61" stroke-width="${w}" opacity="${o}"/>`;
  }
  return g + `</g>`;
}

// ── the sheet ───────────────────────────────────────────────────────────────
function sheet(mode) {
  const hsl = mode === 'hsl';
  const col = k => hsl ? (k === 'M' ? HSL.metro : HSL.tram) : HUE[k];

  const sampled = new Map(trams.map(l => [l.service, resample(px(l.shape), STEP)]));
  const strands = bundle(sampled);

  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="t ds">`;
  s += `<title id="t">Every line through Kallio${hsl ? ', in HSL colours' : ''}</title>`;
  s += `<desc id="ds">Real HSL geometry for the metro and trams 1, 3, 6, 7, 8 and 9 where they cross the Piritori board, drawn on one sheet with shared corridors fanned into parallel strands.</desc>`;
  s += `<defs><filter id="gl" x="-70%" y="-70%" width="240%" height="240%"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
  s += `<clipPath id="fr"><rect x="${PAD}" y="${PAD}" width="${MW.toFixed(1)}" height="${MAP}"/></clipPath></defs>`;
  s += `<rect width="${W}" height="${H}" fill="${INK}"/><rect width="${W}" height="66" fill="#111719"/>`;
  s += `<text x="${PAD}" y="30" fill="${PAPER}" font-family="ui-monospace,monospace" font-size="17" letter-spacing="2">EVERY LINE THROUGH KALLIO</text>`;
  s += `<text x="${PAD}" y="52" fill="${MUTED}" font-family="ui-monospace,monospace" font-size="11.5">`
    + `metro + trams 1 3 6 7 8 9 · shared corridors fanned apart · `
    + (hsl ? `HSL's own colours — every tram one green, the NUMBER is the wayfinding`
      : `one hue per line — a legibility device, NOT an HSL system`) + `</text>`;

  s += `<g clip-path="url(#fr)">`;
  s += streets();
  // metro first and unbundled: it is in a tunnel under all of this, not sharing
  // street track with anything, so fanning it into the tram bundle would be a
  // lie about the geometry.
  s += `<path d="${d(px(metro.shape))}" fill="none" stroke="${col('M')}" stroke-width="9" opacity=".9" stroke-linecap="round" stroke-linejoin="round" filter="url(#gl)"/>`;
  for (const [k, pts] of strands) {
    s += `<path d="${d(pts)}" fill="none" stroke="${col(k)}" stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round" filter="url(#gl)"/>`;
  }
  s += `</g><rect x="${PAD}" y="${PAD}" width="${MW.toFixed(1)}" height="${MAP}" fill="none" stroke="#2a3439" stroke-width="1"/>`;

  // Anchors, and the rectangles they claim so the route bullets keep off. The
  // label runs LEFT from the diamond, so the box it owns is centred left of it.
  const blocked = [];
  for (const a of board.anchors) {
    const cx = X(a.wgs84[1]), cy = Y(a.wgs84[0]);
    if (!inMap([cx, cy])) continue;
    const tw = a.label.length * 6.4 + 16;
    blocked.push([cx - tw / 2 + 2, cy, tw, 17]);
    s += `<rect x="${(cx - 6.5).toFixed(1)}" y="${(cy - 6.5).toFixed(1)}" width="13" height="13" fill="${INK}" stroke="${GOLD}" stroke-width="2.2" transform="rotate(45 ${cx.toFixed(1)} ${cy.toFixed(1)})"/>`;
    // Haloed. Six strands run through HAKANIEMI's label on the way to the
    // bridge, and a route line drawn across a letter eats it.
    s += `<text x="${(cx - 13).toFixed(1)}" y="${(cy + 3.8).toFixed(1)}" text-anchor="end" fill="${GOLD}" font-family="ui-monospace,monospace" font-size="10.5" letter-spacing=".5" paint-order="stroke" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round">${esc(a.label)}</text>`;
  }

  const marks = chips([['M', px(metro.shape)], ...strands], blocked);
  for (const [k, [x, y]] of marks) s += chip(x, y, k === 'M' ? 'M' : k, col(k));

  // legend
  const LY = PAD + MAP + 40;
  s += `<text x="${PAD}" y="${LY - 18}" fill="${MUTED}" font-family="ui-monospace,monospace" font-size="11">`
    + (hsl ? `mode colour — HSL draws every tram the same green (hsl-map-publisher, colorsByMode)`
      : `per-line colour — 1/6/7 are Wikidata's values; 3 is deepened off it to clear line 1, and 8/9 have none published`)
    + `</text>`;
  // The first cut labelled each entry with the route name's FIRST token, which
  // gave two lines called "länsiterminaali" and one called "eira". Endpoints
  // are what tells a route from its neighbour.
  const ends = l => { const p = l.name.split(' - '); return `${p[0]} – ${p[p.length - 1]}`; };
  let lx = PAD, ly = LY;
  for (const [k, name] of [['M', ends(metro)], ...trams.map(l => [l.service, ends(l)])]) {
    const w = CHIP_W + 9 + name.length * 6.55 + 22;
    if (lx > PAD && lx + w > PAD + MW) { lx = PAD; ly += 22; }
    s += chip(lx + CHIP_W / 2, ly, k, col(k));
    s += `<text x="${lx + CHIP_W + 9}" y="${ly + 4}" fill="${MUTED}" font-family="ui-monospace,monospace" font-size="11">${esc(name)}</text>`;
    lx += w;
  }
  s += `<g transform="translate(${PAD},${ly + 30})"><rect x="0" y="-6.5" width="13" height="13" fill="${INK}" stroke="${GOLD}" stroke-width="2.2" transform="rotate(45 6.5 0)"/>`;
  s += `<text x="22" y="4" fill="${MUTED}" font-family="ui-monospace,monospace" font-size="11">board anchor · stop names are on the per-line plates</text></g>`;
  s += `<text x="${PAD}" y="${H - 42}" fill="#5d5343" font-family="ui-monospace,monospace" font-size="11">${esc(rail.source.attribution)} · ${rail.source.licence} · feed 2022-02-22 · the fan is a drawing device — the real track is the centre of each bundle</text>`;
  s += `<text x="${PAD}" y="${H - 24}" fill="#4a4237" font-family="ui-monospace,monospace" font-size="10.5">grey underlay = corridors that carry service, weighted by weekly trips. NOT a street map: a street with no route on it is not in it (§10.8)</text></svg>`;
  return s;
}

const argv = process.argv.slice(2);
const want = argv.includes('--both') ? ['hue', 'hsl'] : argv.includes('--hsl') ? ['hsl'] : ['hue'];
for (const m of want) {
  const file = m === 'hsl' ? 'ux/kallio-network-hsl.svg' : 'ux/kallio-network.svg';
  writeFileSync(path.join(root, file), sheet(m) + '\n');
  console.log(`→ ${file.padEnd(30)} metro + ${trams.length} trams, ${trams.map(l => l.service).join(' ')}`);
}
