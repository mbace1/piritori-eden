#!/usr/bin/env node
/**
 * Do the board's anchors actually sit on the real network?
 *
 *   node map/tools/rail-anchors.mjs
 *
 * The board's thirteen anchors carry real WGS84, placed by hand from public
 * sources. `map/kallio-rail-v1.json` carries the real rail geometry, extracted
 * from HSL's published feed. Neither knew about the other, so laying them
 * together is a genuine check on both — and it needs no network, because both
 * files are committed.
 *
 * It reports rather than fails: three anchors are correctly nowhere near a
 * tram (Torkkelinmäki is a hill between two lines, and the harbour and
 * Suvilahti had no tram then and have none now), so a hard threshold would
 * only teach people to raise it.
 *
 * ONE MEASUREMENT NOTE, because getting it wrong the first time produced a
 * confident wrong answer: distance is point-to-SEGMENT, never point-to-vertex.
 * The extract is simplified, so a straight run can be 400 m between kept
 * points, and an anchor sitting beside the middle of it measures as far from
 * both ends while being metres from the line itself. Hakaniemi read as 180 m
 * that way and is 35 m.
 */
import { readFileSync } from 'node:fs';

const rail = JSON.parse(readFileSync(new URL('../kallio-rail-v1.json', import.meta.url)));
const board = JSON.parse(readFileSync(new URL('../kallio-era1-2003-v1.json', import.meta.url)));

const R = 6371000, rad = d => d * Math.PI / 180;
const PHI = rad(60.185);                       // the board's own latitude band
const xy = p => [rad(p[1]) * Math.cos(PHI) * R, rad(p[0]) * R];

function segDist(P, A, B) {
  const p = xy(P), a = xy(A), b = xy(B);
  const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy;
  const t = L ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L)) : 0;
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

function nearest(pt, mode) {
  let best = Infinity, who = '—';
  for (const L of rail.lines) {
    if (L.mode !== mode) continue;
    for (let i = 1; i < L.shape.length; i++) {
      const d = segDist(pt, L.shape[i - 1], L.shape[i]);
      if (d < best) { best = d; who = L.service; }
    }
  }
  return { d: best, who };
}

console.log(`\nboard anchors against the real network — ${rail.source.feed}\n`);
console.log('  anchor                    metro        tram');
let onTram = 0;
for (const a of board.anchors) {
  const m = nearest(a.wgs84, 'metro'), t = nearest(a.wgs84, 'tram');
  if (t.d <= 150) onTram++;
  console.log('  ' + a.label.padEnd(24)
    + `${Math.round(m.d)}m`.padStart(6) + '  '
    + `${Math.round(t.d)}m`.padStart(6) + `  ${t.who}`);
}
console.log(`\n  ${onTram}/${board.anchors.length} anchors within 150 m of a real tram line`);
console.log(`  ${rail.lines.length} line directions, ${rail.stops.length} stops in the box`);
console.log(`  ${rail.source.attribution} · ${rail.source.licence}\n`);
