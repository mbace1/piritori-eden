/**
 * transit-layer.mjs — the real HSL tram/metro network for the Kallio board,
 * in BOARD space (`map/kallio-era1-2003-v1.json`'s coordinate system).
 *
 * Moved out of `godot/tools/build-map-geometry.mjs` (2026-08-28) so both
 * sides of the engine can read the SAME derived layer instead of each
 * reimplementing it: `godot/tools/build-map-geometry.mjs` still calls this
 * to build Godot's `data/map-geometry.json` `public-transit` layer, and
 * `map/tools/build-transit-layer.mjs` calls it to write the committed
 * `map/kallio-transit-layer-v1.json` `web/` reads directly. One algorithm,
 * one file, `PORTING.md` §1's DATA kind — never ported, never duplicated.
 *
 * `TRANSIT_LAYERS.md` §9, §10.5: seven services actually serve Kallio, real
 * GTFS shapes, shared corridors fanned apart exactly as
 * `map/tools/master-plate.mjs`'s offline plates already prove out — this is
 * that same source, same colours, same fanning algorithm, just projected
 * into board units instead of plate pixels.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const mapRoot = resolve(here, '..');
export const RAIL = resolve(mapRoot, 'kallio-rail-v1.json');
export const BOARD_JSON = resolve(mapRoot, 'kallio-era1-2003-v1.json');

// 1/6/7 are Wikidata's published values; 3 is deepened off #007fc1 to clear
// line 1, which runs beside it down Helsinginkatu; 8 and 9 have no published
// colour anywhere. NOT HSL's own scheme — HSL draws every tram one green.
const LINE_HUE = {
  M: '#ff6319',
  1: '#00b4e5', 3: '#0b5299', 6: '#009757',
  7: '#d5007f', 8: '#8a5cf0', 9: '#b8d430',
};

/**
 * @param {string} [railPath] defaults to `map/kallio-rail-v1.json`
 * @param {string} [boardPath] defaults to `map/kallio-era1-2003-v1.json`
 * @returns {Array} transit-line items: { kind, service, mode, colour, points, chips }
 */
export function buildTransitLines(railPath = RAIL, boardPath = BOARD_JSON) {
  const rail = JSON.parse(readFileSync(railPath, 'utf8'));
  const board = JSON.parse(readFileSync(boardPath, 'utf8'));
  const CS = board.coordinateSystem;

  // wgs84 -> board. The inverse of the `fromBoard` this repo's plate tools
  // already use — checked against every anchor's own recorded (wgs84, board)
  // pair, which agree to two decimals.
  const toBoard = (lat, lon) => [
    CS.board.offsetX + (lon - CS.origin.lon) * CS.metresPerDegree.lon / CS.board.metresPerUnit,
    CS.board.offsetY - (lat - CS.origin.lat) * CS.metresPerDegree.lat / CS.board.metresPerUnit,
  ];

  // Same filter as master-plate.mjs's Era I sheet: direction 0 only (the
  // return leg is the same street drawn twice), and only lines that actually
  // pass a board anchor — TRANSIT_LAYERS.md §10.5's measured finding that
  // trams 2, 4, 5 and 10 reach the extract box but never enter Kallio.
  // Every metro branch (M1 toward Vuosaari, M2 toward Mellunmäki, ...) runs
  // the SAME physical tunnel through the Kallio band — `anchorSequence` is
  // identical for each. Keeping every branch would draw the same line N
  // times; one representative is the real geometry.
  // Reported directly, 2026-08-27: "the 1 and 1T stops look like way too
  // many, just take out 1T and see if the others are real" — a diagnostic
  // cut, not a data correction (1T IS a real HSL short working). Named
  // rather than silently dropped, so it is easy to reverse.
  const EXCLUDED_SERVICES = new Set(['1T']);
  const seenMetro = new Set();
  const served = rail.lines.filter((l) => {
    if (l.direction !== 0 || !l.anchorSequence.length) return false;
    if (EXCLUDED_SERVICES.has(l.service)) return false;
    if (l.mode !== 'metro') return true;
    if (seenMetro.has(l.mode)) return false;
    seenMetro.add(l.mode);
    return true;
  });
  const key = (l) => (l.mode === 'metro' ? 'M' : l.service);
  // A short working ("1T", "8T", "9N") is the same coloured service as its
  // base number, just a shortened run — the chip label keeps the letter, the
  // colour does not.
  const baseKey = (l) => (l.mode === 'metro' ? 'M' : l.service.replace(/[A-Za-z]+$/, ''));
  const px = (shape) => shape.map(([lat, lon]) => toBoard(lat, lon));

  // ── fan shared corridors into parallel strands (verbatim algorithm from
  // master-plate.mjs, recalibrated from plate pixels to board units) ──────
  const STEP = 6, GAP = 2.6, NEAR = 4.3, SMOOTH = 17;
  function resample(pts, step) {
    const out = [pts[0]];
    let carry = 0;
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
  const gridIndex = (pts) => {
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
  function bundle(sampled) {
    const idx = new Map([...sampled].map(([k, p]) => [k, gridIndex(p)]));
    const keys = [...sampled.keys()], out = new Map();
    for (const k of keys) {
      const pts = sampled.get(k);
      const raw = pts.map(([x, y]) => {
        const set = keys.filter((o) => o === k || hit(idx.get(o), x, y));
        return (set.indexOf(k) - (set.length - 1) / 2) * GAP;
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

  // The metro is in a tunnel: it shares no street track, so fanning it into
  // the surface bundle would be a lie about the geometry (same reasoning as
  // master-plate.mjs). Drawn on its own, unfanned.
  const surface = served.filter((l) => l.mode !== 'metro');
  const metros = served.filter((l) => l.mode === 'metro');
  const strands = bundle(new Map(surface.map((l) => [l.id, resample(px(l.shape), STEP)])));
  const lineById = new Map(served.map((l) => [l.id, l]));

  // ── number chips: A LABEL PER LINE, NOT A STRING OF BEADS ────────────────
  //
  // Reported directly, 2026-08-26: "The square frames still are there." One
  // chip every 90 board units put 107 of them on the board — nine lines'
  // worth of little bordered boxes strung along every corridor, which read as
  // a rash of squares over the whole map and buried the geography the rest of
  // this file works to get right. They were also the LAST square left after
  // the land was rebuilt from the real coastline, which is exactly why they
  // stood out.
  //
  // A transit map labels a line a couple of times so you can pick it out and
  // follow it; it does not stamp the number every few hundred metres. Two per
  // line, placed inside the visible board so they are actually useful, spaced
  // well apart, and kept off the anchors.
  const CHIP_MAX = 2, CHIP_CLEAR = 64;
  const bw = CS.board.width, bh = CS.board.height;
  const INSET = 70;   // keep labels off the frame edge, where they get cut
  const onBoard = ([x, y]) => x > INSET && x < bw - INSET && y > INSET && y < bh - INSET;
  const placedChips = board.anchors.map((a) => [a.board.x, a.board.y]);
  function chipsFor(pts) {
    // only the stretch actually on the visible board is worth labelling
    const vis = pts.filter(onBoard);
    if (!vis.length) return [];
    const out = [];
    // walk candidate positions spread across the visible run, take the first
    // CHIP_MAX that clear everything already placed
    const tries = 11;
    const order = [];
    for (let i = 1; i < tries; i++) order.push(Math.floor(vis.length * i / tries));
    for (const idx of order) {
      if (out.length >= CHIP_MAX) break;
      const [x, y] = vis[idx];
      if (placedChips.some(([px_, py_]) => Math.hypot(px_ - x, py_ - y) < CHIP_CLEAR)) continue;
      placedChips.push([x, y]);
      out.push([+x.toFixed(2), +y.toFixed(2)]);
    }
    return out;
  }

  const items = [];
  for (const l of metros) {
    items.push({
      kind: 'transit-line', service: key(l), mode: l.mode, colour: LINE_HUE[baseKey(l)] || '#999',
      points: px(l.shape).flat().map((n) => +n.toFixed(2)),
      chips: chipsFor(px(l.shape)),
    });
  }
  for (const [id, pts] of strands) {
    const l = lineById.get(id);
    items.push({
      kind: 'transit-line', service: key(l), mode: l.mode, colour: LINE_HUE[baseKey(l)] || '#999',
      points: pts.flat().map((n) => +n.toFixed(2)),
      chips: chipsFor(pts),
    });
  }
  return items;
}
