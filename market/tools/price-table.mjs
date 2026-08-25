#!/usr/bin/env node
/**
 * What the board actually quotes, as a table you can read.
 *
 *   node market/tools/price-table.mjs [--day 3] [--block day] [--good piri]
 *   node market/tools/price-table.mjs --week
 *
 * A gate proves the model's invariants; it cannot tell you whether the market
 * is INTERESTING. That needs looking at the numbers — the same rule this
 * repository already applies to art, where a green suite says *works* and only
 * a render says *looks*.
 */
import { readFileSync } from 'node:fs';
import { offer, nodeProfile, GOODS } from '../model.mjs';

const board = JSON.parse(readFileSync(new URL('../../map/kallio-era1-2003-v1.json', import.meta.url)));
const args = process.argv.slice(2);
const flag = (n, d) => { const i = args.indexOf(n); return i < 0 ? d : args[i + 1]; };
const good = flag('--good', 'piri');
const seed = flag('--seed', 'piritori');
const active = board.anchors.filter(a => a.sliceState !== 'locked');

const money = v => ('€' + v.toFixed(0)).padStart(5);

function table(day, block) {
  const rows = active.map(a => ({ a, o: offer(a, good, { day, block }, { seed }) }))
    .sort((x, y) => x.o.mid - y.o.mid);
  console.log(`\n  day ${day} (${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][day % 7]}), ${block} · ${good} · base €${GOODS[good].base}\n`);
  console.log('  place                    buy   sell  spread  liq   why');
  for (const { a, o } of rows) {
    console.log('  ' + a.label.padEnd(22)
      + money(o.buy) + ' ' + money(o.sell)
      + '   ' + (o.spread * 100).toFixed(0).padStart(2) + '%'
      + '   ' + o.profile.liquidity.toFixed(1).padStart(3)
      + '   ' + o.causeText);
  }
  // The trade the board is offering today, and what it is worth per pack.
  let best = null;
  for (const x of rows) for (const y of rows) {
    if (x.a.id === y.a.id) continue;
    const m = y.o.sell - x.o.buy;
    if (!best || m > best.m) best = { m, from: x.a.label, to: y.a.label };
  }
  const n = rows.length * (rows.length - 1);
  let profitable = 0;
  for (const x of rows) for (const y of rows) if (x.a.id !== y.a.id && y.o.sell > x.o.buy) profitable++;
  console.log(`\n  best route  ${best.from} → ${best.to}  €${best.m.toFixed(2)}/pack`
    + `   ·   ${profitable}/${n} pairs profitable (${(profitable / n * 100).toFixed(0)}%)`);
}

if (args.includes('--week')) {
  for (let day = 0; day < 7; day++) table(day, 'day');
} else {
  table(+flag('--day', 3), flag('--block', 'day'));
}
