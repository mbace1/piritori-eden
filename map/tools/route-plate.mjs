#!/usr/bin/env node
/**
 * One service, drawn at street level over the board.
 *
 *   node map/tools/route-plate.mjs 9            -> ux/tram9-kallio.svg
 *   node map/tools/route-plate.mjs M            -> ux/metro-kallio.svg
 *   node map/tools/route-plate.mjs all          -> every service that serves the board
 *
 * Reads only committed files, so it needs no network and no GTFS. `TRANSIT_
 * LAYERS.md` §10.5 is the prose; this is the picture, and there is one per line
 * because twenty tram directions in a single green is a tangle rather than a
 * set of routes.
 *
 * The crop is the KALLIO CORE rather than the whole extract box: these lines
 * all run from the city centre out to Pasila or Arabia, and a plate that fits
 * the whole run puts Kallio in a thumbnail. What is being shown is the part
 * that crosses the board.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const here = path.dirname(new URL(import.meta.url).pathname);
const root = path.resolve(here, '..', '..');
const rail = JSON.parse(readFileSync(path.join(root, 'map/kallio-rail-v1.json'), 'utf8'));
const board = JSON.parse(readFileSync(path.join(root, 'map/kallio-era1-2003-v1.json'), 'utf8'));
const cor = JSON.parse(readFileSync(path.join(root, 'map/kallio-corridors-v1.json'), 'utf8'));

// Kallio proper. Wider than the anchors so a line's approach reads, tighter
// than the extract box so the stop names are legible at 1:1.
const B = { s: 60.1758, n: 60.1908, w: 24.9395, e: 24.9660 };
const PHI = Math.cos(60.185 * Math.PI / 180);
const wD = (B.e - B.w) * PHI, hD = B.n - B.s;
const H = 1180, PAD = 78, MAP = H - 2 * PAD, MW = MAP * wD / hD;
const W = Math.round(MW) + 2 * PAD + 180;
const X = lon => PAD + ((lon - B.w) * PHI / wD) * MW;
const Y = lat => PAD + ((B.n - lat) / hD) * MAP;
// Marks are clipped to the MAP RECT, not to a loose latitude tolerance. The
// generous version let Alppiharju — which is north of the crop — draw its label
// through the title bar, which is the sort of thing a plate about legibility
// cannot have.
const inFrame = p => {
  const x = X(p[1]), y = Y(p[0]);
  return y >= PAD && y <= PAD + MAP && x >= PAD - 8 && x <= PAD + MW + 8;
};

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

function plate(service) {
  const mine = rail.lines.filter(l =>
    service === 'M' ? l.mode === 'metro' : (l.mode === 'tram' && l.service === service));
  if (!mine.length) return null;
  const d0 = mine.find(l => l.direction === 0) || mine[0];
  if (!d0.anchorSequence.length) return null;      // clips the box, serves nothing

  const colour = d0.mode === 'metro' ? '#FF6319' : '#00985F';
  const label = d0.mode === 'metro' ? 'METRO' : `TRAM ${service}`;
  const trips = mine.reduce((s, l) => s + l.trips, 0);

  // stops on THIS line, in order, that fall inside the crop
  const byName = new Map(rail.stops.map(s => [s.name, s]));
  const stops = d0.stopSequence.map(n => byName.get(n)).filter(s => s && inFrame([s.lat, s.lon]));
  // The caption counts what is DRAWN, not what the line touches. Saying "4
  // board anchors" over a picture showing three is the same class of bug as a
  // precache list a token behind the page: a number in one place disagreeing
  // with a number in another.
  const anchors = d0.anchorSequence
    .map(h => board.anchors.find(z => z.id === h.anchor))
    .filter(a => a && inFrame(a.wgs84));

  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="t d">`;
  s += `<title id="t">${esc(label)} through Kallio</title>`;
  s += `<desc id="d">Real HSL geometry and stops for ${esc(label)} where it crosses the Piritori board, with the board's own anchors marked.</desc>`;
  s += `<defs><filter id="gl" x="-70%" y="-70%" width="240%" height="240%"><feGaussianBlur stdDeviation="7" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
  // The network is CLIPPED to the map rect. Without this the line runs to the
  // edges of the page and its glow crosses the title bar — tram 3 comes up out
  // of Alppila at the top left and put a green wash straight through its own
  // subtitle. Clipping the geometry rather than nudging the bar is the fix that
  // holds for every service, including ones nobody has drawn yet.
  s += `<clipPath id="fr"><rect x="${PAD}" y="${PAD}" width="${MW.toFixed(1)}" height="${MAP}"/></clipPath></defs>`;
  s += `<rect width="${W}" height="${H}" fill="#171d20"/><rect width="${W}" height="66" fill="#111719"/>`;
  s += `<text x="${PAD}" y="30" fill="#d6c5a5" font-family="ui-monospace,monospace" font-size="17" letter-spacing="2">${esc(label)} THROUGH KALLIO</text>`;
  s += `<text x="${PAD}" y="52" fill="#7d6b52" font-family="ui-monospace,monospace" font-size="11.5">${esc(d0.name)} · ${trips} trips · ${anchors.length} board anchors · ${stops.length} stops in frame</text>`;

  // The street underlay, then the rest of the network faint, so the line has a
  // city to be in rather than a void. `kallio-corridors-v1.json` is corridors
  // that carry service, NOT a street map — see §10.8; width and brightness
  // follow weekly trips on a log scale so a trunk reads as a trunk.
  s += `<g clip-path="url(#fr)">`;
  const maxW = Math.log(cor.corridors[0].trips + 1);
  for (const c of [...cor.corridors].sort((a, b) => a.trips - b.trips)) {
    const t = Math.log(c.trips + 1) / maxW;
    s += `<path d="${c.shape.map((p, i) => (i ? 'L' : 'M') + X(p[1]).toFixed(1) + ' ' + Y(p[0]).toFixed(1)).join(' ')}" fill="none" stroke="#4a5a61" stroke-width="${(0.8 + t * 4.4).toFixed(2)}" opacity="${(0.15 + t * 0.28).toFixed(3)}" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  for (const L of rail.lines) {
    if (mine.includes(L)) continue;
    const c = L.mode === 'metro' ? '#4a3226' : '#232e28';
    s += `<path d="${L.shape.map((p, i) => (i ? 'L' : 'M') + X(p[1]).toFixed(1) + ' ' + Y(p[0]).toFixed(1)).join(' ')}" fill="none" stroke="${c}" stroke-width="${L.mode === 'metro' ? 4 : 1.6}"/>`;
  }
  for (const L of mine) {
    s += `<path d="${L.shape.map((p, i) => (i ? 'L' : 'M') + X(p[1]).toFixed(1) + ' ' + Y(p[0]).toFixed(1)).join(' ')}" fill="none" stroke="${colour}" stroke-width="6" opacity=".95" stroke-linecap="round" stroke-linejoin="round" filter="url(#gl)"/>`;
  }
  s += `</g><rect x="${PAD}" y="${PAD}" width="${MW.toFixed(1)}" height="${MAP}" fill="none" stroke="#2a3439" stroke-width="1"/>`;

  // anchors first — stop labels win any overlap, because a stop name is a fact
  // and an anchor label is the board talking about itself
  for (const a of anchors) {
    const cx = X(a.wgs84[1]), cy = Y(a.wgs84[0]);
    s += `<rect x="${(cx - 7).toFixed(1)}" y="${(cy - 7).toFixed(1)}" width="14" height="14" fill="#171d20" stroke="#e8c24a" stroke-width="2.2" transform="rotate(45 ${cx.toFixed(1)} ${cy.toFixed(1)})"/>`;
    s += `<text x="${(cx - 13).toFixed(1)}" y="${(cy + 4).toFixed(1)}" text-anchor="end" fill="#e8c24a" font-family="ui-monospace,monospace" font-size="11" letter-spacing=".6">${esc(a.label)}</text>`;
  }

  // stops, nudged down when two labels would sit on each other
  const taken = [];
  for (const st of stops) {
    const cx = X(st.lon), cy = Y(st.lat);
    let ly = cy + 4;
    while (taken.some(t => Math.abs(t - ly) < 15)) ly += 16;
    taken.push(ly);
    s += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="5" fill="#171d20" stroke="#d6c5a5" stroke-width="2.4"/>`;
    if (Math.abs(ly - (cy + 4)) > 2) {
      s += `<line x1="${(cx + 6).toFixed(1)}" y1="${cy.toFixed(1)}" x2="${(cx + 11).toFixed(1)}" y2="${(ly - 4).toFixed(1)}" stroke="#5d5343" stroke-width="1"/>`;
    }
    s += `<text x="${(cx + 13).toFixed(1)}" y="${ly.toFixed(1)}" fill="#d6c5a5" font-family="ui-monospace,monospace" font-size="12">${esc(st.name)}</text>`;
  }

  s += `<g transform="translate(${PAD},${H - 52})"><circle cx="6" cy="-4" r="5" fill="#171d20" stroke="#d6c5a5" stroke-width="2.4"/>`;
  s += `<text x="20" y="0" fill="#7d6b52" font-family="ui-monospace,monospace" font-size="11.5">real HSL stop</text>`;
  s += `<rect x="168" y="-11" width="14" height="14" fill="#171d20" stroke="#e8c24a" stroke-width="2.2" transform="rotate(45 175 -4)"/>`;
  s += `<text x="194" y="0" fill="#7d6b52" font-family="ui-monospace,monospace" font-size="11.5">board anchor the line passes</text></g>`;
  s += `<text x="${PAD}" y="${H - 24}" fill="#5d5343" font-family="ui-monospace,monospace" font-size="11">${esc(rail.source.attribution)} · ${rail.source.licence} · feed 2022-02-22 · grey is corridors that carry service, not a street map — see §10.8</text></svg>`;

  return { svg: s, stops: stops.length, anchors: anchors.length, touches: d0.anchorSequence.length };
}

const want = process.argv[2];
if (!want) { console.error('usage: node map/tools/route-plate.mjs <service|M|all>'); process.exit(1); }

const services = want === 'all'
  ? ['M', ...[...new Set(rail.lines.filter(l => l.mode === 'tram').map(l => l.service))]
    .sort((a, b) => +a - +b)]
  : [want];

for (const svc of services) {
  const r = plate(svc);
  const file = svc === 'M' ? 'ux/metro-kallio.svg' : `ux/tram${svc}-kallio.svg`;
  if (!r) { console.log(`   —    ${svc.padEnd(3)} serves no board anchor, no plate`); continue; }
  writeFileSync(path.join(root, file), r.svg + '\n');
  const off = r.touches - r.anchors;
  console.log(`→ ${file.padEnd(26)} ${String(r.anchors).padStart(2)} anchors, ${String(r.stops).padStart(2)} stops in frame`
    + (off ? `  (+${off} anchor${off > 1 ? 's' : ''} outside the crop)` : ''));
}
