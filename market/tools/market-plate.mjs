#!/usr/bin/env node
/**
 * What the player actually sees when they check prices.
 *
 *   node market/tools/market-plate.mjs   -> ux/market-era1.svg
 *
 * The price table proves the model is interesting; this proves it is
 * PRESENTABLE, which is a different claim. The sheet is in three parts:
 *
 *   left    the board as the LEDGER knows it — what you know, not what is true.
 *           A node you have never worked shows nothing at all.
 *   right   the location board at one anchor, which is the screen the ask
 *           described: "check local prices here".
 *   bottom  the same four nodes at all four information levels, side by side,
 *           so the decay is visible as a row rather than described as a rule.
 *
 * The rule this picture exists to enforce: the MAP NEVER SHOWS A PRICE THE
 * PLAYER HAS NOT LEARNED. DESIGN_LOCKS §5 says Era I is not a smartphone app,
 * and the fastest way to break that is a map that quietly knows everything.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { offer, present, decay, INFO, GOODS, nodeProfile } from '../model.mjs';

const here = path.dirname(new URL(import.meta.url).pathname);
const root = path.resolve(here, '..', '..');
const J = f => JSON.parse(readFileSync(path.join(root, f), 'utf8'));
const board = J('map/kallio-era1-2003-v1.json');
const cor = J('map/kallio-corridors-v1.json');

const INK = '#171d20', PANEL = '#111719', PAPER = '#d6c5a5', MUTED = '#7d6b52';
const GOLD = '#e8c24a', DIM = '#5d5343';
const CHEAP = '#6d9e5c', DEAR = '#c4614a', COLD = '#3f5560';
const mono = 'ui-monospace,monospace';
const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const money = v => '€' + v.toFixed(0);

// ── the fiction of one save ─────────────────────────────────────────────────
// A believable middle of a campaign: some places quoted this block, some stale,
// some only ever heard about, some never visited. Hand-set so the picture shows
// every state rather than whatever a random walk happened to produce.
const DAY = 3, BLOCK = 'day', SEED = 'piritori', GOOD = 'piri';
const KNOWN = {
  piritori: { level: INFO.QUOTE, age: 0, visited: true },
  hakaniemi: { level: INFO.QUOTE, age: 1, visited: true },
  siltasaari: { level: INFO.QUOTE, age: 3, visited: true },
  linjat_yard: { level: INFO.QUOTE, age: 5, visited: true },
  vaasankatu: { level: INFO.QUOTE, age: 2, visited: true },
  harju: { level: INFO.RANGE, age: 4, visited: true },
  karhupuisto: { level: INFO.RUMOUR, age: 6, visited: true },
  sornainen_harbour: { level: INFO.QUOTE, age: 9, visited: true },
  torkkelinmaki: { level: INFO.NONE, age: 0 },
  kallio_church: { level: INFO.NONE, age: 0 },
  suvilahti: { level: INFO.RUMOUR, age: 2, visited: true },
};
const SHOCKS = [
  { id: 'closure', node: 'hakaniemi', good: 'piri', from: 2, to: 5, factor: 1.42, text: 'metro works, crowd rerouted' },
];
const HERE = 'piritori';

const anchors = board.anchors.filter(a => a.sliceState !== 'locked');
const truth = new Map(anchors.map(a => [a.id,
  offer(a, GOOD, { day: DAY, block: BLOCK }, { seed: SEED, shocks: SHOCKS })]));
const seen = new Map(anchors.map(a => {
  const k = KNOWN[a.id] || { level: INFO.NONE, age: 0 };
  // `visited` is the owner's rumour rule: a place you have WORKED keeps ringing
  // you, so it never falls below a direction however stale the last number is.
  // Torkkelinmäki and Kallion kirkko have never been worked and stay dark.
  return [a.id, present(truth.get(a.id), k.level, k.age, SEED, a.id, GOOD, { visited: !!k.visited })];
}));

// ── layout ──────────────────────────────────────────────────────────────────
const B = { s: 60.1748, n: 60.1918, w: 24.9375, e: 24.9680 };
const PHI = Math.cos(60.185 * Math.PI / 180);
const wD = (B.e - B.w) * PHI, hD = B.n - B.s;
const PAD = 58, MAP = 880, MW = MAP * wD / hD;
const COL = 470, GUT = 26, STRIP = 176;
const W = Math.round(PAD + MW + GUT + COL + PAD), H = PAD + MAP + STRIP + 46;
const X = lon => PAD + ((lon - B.w) * PHI / wD) * MW;
const Y = lat => PAD + ((B.n - lat) / hD) * MAP;
const CX = PAD + MW + GUT;

const d = pts => pts.map(([x, y], i) => (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1)).join(' ');
const px = shape => shape.map(p => [X(p[1]), Y(p[0])]);
const inMap = ([x, y]) => x >= PAD && x <= PAD + MW && y >= PAD && y <= PAD + MAP;

/** Colour by how the price sits against base — but ONLY where the player has a
 *  number. A rumour gets the direction colour at low strength; an unknown node
 *  gets no colour at all, because colour is information. */
function tone(v) {
  if (v == null) return COLD;
  const r = v / GOODS[GOOD].base;
  return r > 1.12 ? DEAR : r < 0.9 ? CHEAP : '#8a8663';
}

let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="t ds">`;
s += `<title id="t">The market as the ledger knows it</title>`;
s += `<desc id="ds">The Kallio board showing only the prices the player has actually learned, a location price board for one anchor, and the four information levels side by side.</desc>`;
s += `<defs><filter id="gl" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
s += `<clipPath id="fr"><rect x="${PAD}" y="${PAD}" width="${MW.toFixed(1)}" height="${MAP}"/></clipPath></defs>`;
s += `<rect width="${W}" height="${H}" fill="${INK}"/>`;

// streets, faint — the city is context here, not the subject
s += `<g clip-path="url(#fr)"><g fill="none" stroke-linecap="round" stroke-linejoin="round">`;
const maxW = Math.log(cor.corridors[0].trips + 1);
for (const c of [...cor.corridors].sort((a, b) => a.trips - b.trips)) {
  const t = Math.log(c.trips + 1) / maxW;
  s += `<path d="${d(px(c.shape))}" stroke="#3d4a50" stroke-width="${(0.7 + t * 3.4).toFixed(2)}" opacity="${(0.14 + t * 0.22).toFixed(3)}"/>`;
}
s += `</g></g><rect x="${PAD}" y="${PAD}" width="${MW.toFixed(1)}" height="${MAP}" fill="none" stroke="#2a3439" stroke-width="1"/>`;

s += `<text x="${PAD}" y="34" fill="${PAPER}" font-family="${mono}" font-size="15" letter-spacing="2">WHAT THE LEDGER KNOWS</text>`;
s += `<text x="${PAD + 300}" y="34" fill="${DIM}" font-family="${mono}" font-size="11">day ${DAY} · ${BLOCK} · piri · not what is true — what you have learned</text>`;

// ── the nodes, drawn at the level the player has ────────────────────────────
const placed = [];
for (const a of anchors) {
  const x = X(a.wgs84[1]), y = Y(a.wgs84[0]);
  if (!inMap([x, y])) continue;
  const v = seen.get(a.id);
  const isHere = a.id === HERE;
  const val = v.level === INFO.QUOTE ? v.sell
    : v.level === INFO.RANGE ? (v.lowSell + v.highSell) / 2 : null;
  const col = v.level === INFO.NONE ? COLD
    : v.level === INFO.RUMOUR ? (v.direction === 'dear' ? DEAR : v.direction === 'cheap' ? CHEAP : '#8a8663')
      : tone(val);

  // The mark says the LEVEL: a filled disc is a quote, a ring is a range, a
  // dotted ring is a rumour, a bare cross is a place you have never worked.
  if (v.level === INFO.NONE) {
    s += `<path d="M${(x - 5).toFixed(1)} ${y.toFixed(1)}h10M${x.toFixed(1)} ${(y - 5).toFixed(1)}v10" stroke="${COLD}" stroke-width="1.6"/>`;
  } else if (v.level === INFO.RUMOUR) {
    s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="7" fill="none" stroke="${col}" stroke-width="1.8" stroke-dasharray="3 3" opacity=".9"/>`;
  } else if (v.level === INFO.RANGE) {
    s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="7.5" fill="none" stroke="${col}" stroke-width="2.4"/>`;
  } else {
    s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="7.5" fill="${col}" stroke="${INK}" stroke-width="1.5"${isHere ? ' filter="url(#gl)"' : ''}/>`;
  }
  if (isHere) s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="14" fill="none" stroke="${GOLD}" stroke-width="1.6"/>`;

  // label: name, then the number ONLY if there is one to show
  let line2 = '';
  if (v.level === INFO.QUOTE) line2 = `${money(v.buy)} / ${money(v.sell)}` + (v.ageBlocks ? `  ${v.ageBlocks}b old` : '  now');
  else if (v.level === INFO.RANGE) line2 = `${money(v.lowSell)}–${money(v.highSell)} sell  ${v.ageBlocks}b`;
  else if (v.level === INFO.RUMOUR) line2 = `“${v.direction}”  ${v.ageBlocks}b`;
  else line2 = 'never worked';

  s += `<text x="${x.toFixed(1)}" y="${(y + 24).toFixed(1)}" text-anchor="middle" fill="${v.level === INFO.NONE ? DIM : GOLD}" font-family="${mono}" font-size="10" letter-spacing=".4" paint-order="stroke" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round">${esc(a.label)}</text>`;
  s += `<text x="${x.toFixed(1)}" y="${(y + 37).toFixed(1)}" text-anchor="middle" fill="${v.level === INFO.NONE ? DIM : col}" font-family="${mono}" font-size="10" paint-order="stroke" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round">${esc(line2)}</text>`;
}

// ── the location board ──────────────────────────────────────────────────────
const A_HERE = anchors.find(a => a.id === HERE);
const oHere = truth.get(HERE);
const profHere = nodeProfile(A_HERE);
s += `<rect x="${CX}" y="${PAD}" width="${COL}" height="${MAP}" fill="${PANEL}" stroke="#222c30" stroke-width="1"/>`;
let y = PAD + 34;
const IX = CX + 22, IW = COL - 44;
const put = (t, o = {}) => {
  s += `<text x="${o.x ?? IX}" y="${y}" fill="${o.fill || MUTED}" font-family="${mono}" font-size="${o.size || 11}"${o.ls ? ` letter-spacing="${o.ls}"` : ''}${o.anchor ? ` text-anchor="${o.anchor}"` : ''}${o.weight ? ` font-weight="${o.weight}"` : ''}>${esc(t)}</text>`;
  y += o.step ?? 15;
};
const rule = (g = 10) => { y += g; s += `<line x1="${IX}" y1="${y}" x2="${IX + IW}" y2="${y}" stroke="#263034" stroke-width="1"/>`; y += g + 4; };
const wrap = (t, cpl, o = {}) => {
  let line = '';
  for (const w of t.split(' ')) {
    if ((line + ' ' + w).trim().length > cpl) { put(line, { ...o, step: o.step ?? 13 }); line = w; }
    else line = (line + ' ' + w).trim();
  }
  if (line) put(line, { ...o, step: o.step ?? 13 });
};

s += `<text x="${IX}" y="${y}" fill="${PAPER}" font-family="${mono}" font-size="15" letter-spacing="2">${esc(A_HERE.label)}</text>`;
y += 19;
put(`you are here · day ${DAY}, ${BLOCK} · asked in person`, { fill: DIM });
rule();

put('PIRI', { fill: PAPER, ls: 2, size: 11.5 });
y += 8;
// the two numbers that matter, big
s += `<text x="${IX}" y="${y + 12}" fill="${DEAR}" font-family="${mono}" font-size="27" font-weight="700">${esc(money(oHere.buy))}</text>`;
s += `<text x="${IX + 96}" y="${y + 12}" fill="${MUTED}" font-family="${mono}" font-size="11">they sell at</text>`;
s += `<text x="${IX + 220}" y="${y + 12}" fill="${CHEAP}" font-family="${mono}" font-size="27" font-weight="700">${esc(money(oHere.sell))}</text>`;
s += `<text x="${IX + 320}" y="${y + 12}" fill="${MUTED}" font-family="${mono}" font-size="11">they buy at</text>`;
y += 40;
put(`spread ${(oHere.spread * 100).toFixed(0)}%  ·  they will take about ${profHere.liquidity.toFixed(0)} packs before the price moves`, { fill: DIM, size: 10.5 });
rule(8);

put('WHY', { fill: PAPER, ls: 2, size: 11.5 });
y += 6;
wrap(`“${oHere.causeText}.”`, 46, { fill: GOLD, size: 12, step: 15 });
y += 4;
wrap('The dominant cause is not a note attached to the number — it is the factor '
  + 'furthest from 1 in the product that made the number. It cannot disagree with '
  + 'the price.', 52, { size: 10, fill: DIM, step: 12.5 });
rule(8);

// the ledger's own list — every other place, best first
put('THE LEDGER', { fill: PAPER, ls: 2, size: 11.5 });
y += 4;
put('what you could get for a pack elsewhere, as far as you know', { fill: DIM, size: 10, step: 16 });
const rows = anchors.filter(a => a.id !== HERE).map(a => {
  const v = seen.get(a.id);
  const est = v.level === INFO.QUOTE ? v.sell
    : v.level === INFO.RANGE ? (v.lowSell + v.highSell) / 2 : null;
  return { a, v, est, margin: est == null ? null : est - oHere.buy };
}).sort((p, q) => (q.margin ?? -1e9) - (p.margin ?? -1e9));
for (const r of rows) {
  const lv = r.v.level;
  const tag = lv === INFO.QUOTE ? (r.v.ageBlocks ? `quote ${r.v.ageBlocks}b` : 'quote now')
    : lv === INFO.RANGE ? `range ${r.v.ageBlocks}b`
      : lv === INFO.RUMOUR ? `rumour ${r.v.ageBlocks}b` : '—';
  const col = lv === INFO.NONE ? DIM : PAPER;
  s += `<text x="${IX}" y="${y}" fill="${col}" font-family="${mono}" font-size="10">${esc(r.a.label)}</text>`;
  s += `<text x="${IX + 168}" y="${y}" fill="${DIM}" font-family="${mono}" font-size="9.5">${esc(tag)}</text>`;
  if (r.est != null) {
    s += `<text x="${IX + 272}" y="${y}" text-anchor="end" fill="${MUTED}" font-family="${mono}" font-size="10">${esc(money(r.est))}</text>`;
    const good = r.margin > 0;
    s += `<text x="${IX + IW}" y="${y}" text-anchor="end" fill="${good ? CHEAP : DEAR}" font-family="${mono}" font-size="10">${good ? '+' : ''}${esc(money(r.margin))}/pack</text>`;
  } else {
    s += `<text x="${IX + IW}" y="${y}" text-anchor="end" fill="${DIM}" font-family="${mono}" font-size="10">${lv === INFO.RUMOUR ? esc('“' + r.v.direction + '”') : 'nothing known'}</text>`;
  }
  y += 14.5;
}
y += 4;
wrap('The ledger records; it does not quote. Every number here was learned from a '
  + 'person or a place, and it is ageing. DESIGN_LOCKS §5.', 52, { size: 10, fill: DIM, step: 12.5 });
rule(8);

// ── the factors, shown as the bars they are ─────────────────────────────────
// This is the panel that makes the model legible rather than magic: the price
// IS this row of bars multiplied together, and the longest bar is the sentence
// under WHY. Showing it is also the cheapest way to keep the two honest.
put('WHAT IS MOVING IT', { fill: PAPER, ls: 2, size: 11.5 });
y += 4;
put(`base €${GOODS[GOOD].base} × six named factors = €${oHere.marketMid.toFixed(0)} market mid`, { fill: DIM, size: 10, step: 18 });
const NAMES = {
  site: 'what this place is',
  weekend: 'day of the week', midweek: 'day of the week',
  hour: 'time of day',
  closure: 'metro works', shock: 'events',
  saturation: 'your own footprint',
  drift: 'ordinary drift',
};
const BARX = IX + 150, BARW = IW - 150;
for (const [id, f] of Object.entries(oHere.factors)) {
  const lg = Math.log(f) / Math.log(2.2);            // ±1 spans the clamp
  const w = Math.min(1, Math.abs(lg)) * (BARW / 2);
  const up = f >= 1;
  const dominant = id === oHere.cause;
  s += `<text x="${IX}" y="${y}" fill="${dominant ? PAPER : MUTED}" font-family="${mono}" font-size="10">${esc(NAMES[id] || id)}</text>`;
  s += `<line x1="${BARX + BARW / 2}" y1="${y - 10}" x2="${BARX + BARW / 2}" y2="${y + 2}" stroke="#2a3439" stroke-width="1"/>`;
  if (w > 0.6) {
    s += `<rect x="${(up ? BARX + BARW / 2 : BARX + BARW / 2 - w).toFixed(1)}" y="${(y - 8).toFixed(1)}" width="${w.toFixed(1)}" height="8" fill="${up ? DEAR : CHEAP}" opacity="${dominant ? 1 : 0.55}"/>`;
  }
  s += `<text x="${IX + IW}" y="${y}" text-anchor="end" fill="${dominant ? PAPER : DIM}" font-family="${mono}" font-size="9.5">×${f.toFixed(2)}</text>`;
  y += 15;
}
y += 2;
wrap('Right of the line is dearer, left is cheaper. The longest bar is the '
  + 'sentence under WHY — not because anyone wrote it there, but because that is '
  + 'how the number was made.', 52, { size: 10, fill: DIM, step: 12.5 });

// ── the decay strip ─────────────────────────────────────────────────────────
const SY = PAD + MAP + 34;
s += `<text x="${PAD}" y="${SY}" fill="${PAPER}" font-family="${mono}" font-size="12" letter-spacing="2">ONE PLACE, FOUR AGES</text>`;
s += `<text x="${PAD + 250}" y="${SY}" fill="${DIM}" font-family="${mono}" font-size="10.5">the levels are not three sources — they are one observation perishing</text>`;
const demo = anchors.find(a => a.id === 'karhupuisto');
const tOff = truth.get('karhupuisto');
const AGES = [0, 3, 8, 40];
const cw = (W - 2 * PAD) / 4;
AGES.forEach((age, i) => {
  const x = PAD + i * cw;
  const v = present(tOff, INFO.QUOTE, age, SEED, demo.id, GOOD);
  s += `<rect x="${x}" y="${SY + 14}" width="${cw - 16}" height="98" fill="${PANEL}" stroke="#222c30"/>`;
  s += `<text x="${x + 14}" y="${SY + 36}" fill="${DIM}" font-family="${mono}" font-size="10">${age === 0 ? 'asked just now' : `${age} blocks later`}</text>`;
  s += `<text x="${x + 14}" y="${SY + 56}" fill="${GOLD}" font-family="${mono}" font-size="11" letter-spacing="1.4">${esc(v.level.toUpperCase())}</text>`;
  let txt = '';
  if (v.level === INFO.QUOTE) txt = `${money(v.buy)} buy · ${money(v.sell)} sell`;
  else if (v.level === INFO.RANGE) txt = `sell ${money(v.lowSell)}–${money(v.highSell)}`;
  else if (v.level === INFO.RUMOUR) txt = `“${v.direction} up there”`;
  else txt = 'you would have to go and look';
  s += `<text x="${x + 14}" y="${SY + 76}" fill="${PAPER}" font-family="${mono}" font-size="11.5">${esc(txt)}</text>`;
  s += `<text x="${x + 14}" y="${SY + 95}" fill="${MUTED}" font-family="${mono}" font-size="9.5">${esc(v.causeText ? v.causeText : '—')}</text>`;
});

s += `<text x="${PAD}" y="${H - 14}" fill="${DIM}" font-family="${mono}" font-size="10">generated · market/tools/market-plate.mjs · model in market/model.mjs, gate in market/test/model.mjs · prices are balance values, not researched figures</text>`;
s += `</svg>`;

writeFileSync(path.join(root, 'ux/market-era1.svg'), s + '\n');
console.log(`→ ux/market-era1.svg  ${W}×${H}`);
console.log(`  ${anchors.length} anchors · here: ${A_HERE.label} buy ${money(oHere.buy)} / sell ${money(oHere.sell)} · "${oHere.causeText}"`);
const best = rows.find(r => r.margin != null);
console.log(`  best known route from here: ${best.a.label} ${best.margin > 0 ? '+' : ''}${money(best.margin)}/pack`);
