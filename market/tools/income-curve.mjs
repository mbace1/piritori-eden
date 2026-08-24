#!/usr/bin/env node
/**
 * What does the market pay, and what does a consignment actually cost you?
 *
 *   node market/tools/income-curve.mjs [--days 21] [--seeds 8]
 *
 * OWNER RULINGS 2026-08-24:
 *   "the dope wars side is a side hustle, the big bucks come from missions with
 *    risk"
 *   "a mission could be 'here are 10 units of drug x' go find buyers, not a
 *    retailer"
 *
 * Both are statements about ratios, and a ratio nobody has measured is a wish.
 * This measures both halves.
 *
 * PART ONE — the side hustle. Perfect play: full knowledge of every price, the
 * best route every block, no travel cost, no pressure, nothing going wrong. A
 * CEILING, not an expectation.
 *
 * PART TWO — the consignment. Somebody hands you N units and you go and find
 * buyers. There is no retailer to deliver to, so the difficulty is entirely the
 * market's own shape: saturation means you cannot put ten units into one place,
 * so you split them across the board and across days, and every block you spend
 * is a block the deadline eats and pressure builds.
 *
 * THE SIM RUNS IN BLOCKS, not days, and that mattered. Measured one trip per
 * day, every capacity band earned the same money — not because the model was
 * flat but because the question was: an operator with eight packs works several
 * buyers, and a sim that lets them make one trip cannot see it.
 */
import { readFileSync } from 'node:fs';
import { offer, GOODS, nodeProfile } from '../model.mjs';

const board = JSON.parse(readFileSync(new URL('../../map/kallio-era1-2003-v1.json', import.meta.url)));
const anchors = board.anchors.filter(a => a.sliceState !== 'locked');

const args = process.argv.slice(2);
const flag = (n, d) => { const i = args.indexOf(n); return i < 0 ? d : +args[i + 1]; };
const DAYS = flag('--days', 21), SEEDS = flag('--seeds', 8);
const BLOCKS = ['morning', 'day', 'evening'];     // three tradeable blocks a day
const RECOVER = 0.65;                              // a node forgets ~35% a day

const money = v => '€' + v.toFixed(0);
const priceAt = (a, day, block, seed, units) =>
  offer(a, 'piri', { day, block }, { seed, saturation: { units } });

/** One block of trading: buy somewhere, sell somewhere, up to `cap` packs.
 *  Returns the profit and mutates saturation. Route is chosen on TOTAL profit
 *  for the load — per-pack margin sends a big load to a place that cannot take
 *  a second pack. */
function tradeBlock(sat, day, block, seed, cap) {
  let best = null;
  for (const x of anchors) for (const y of anchors) {
    if (x.id === y.id) continue;
    let gain = 0, sF = sat.get(x.id), sT = sat.get(y.id), n = 0;
    for (let i = 0; i < cap; i++) {
      const m = priceAt(y, day, block, seed, sT).sell - priceAt(x, day, block, seed, sF).buy;
      if (m <= 0) break;
      gain += m; sF -= 1; sT += 1; n++;
    }
    if (n && (!best || gain > best.gain)) best = { gain, from: x, to: y, n };
  }
  if (!best) return 0;
  for (let i = 0; i < best.n; i++) {
    sat.set(best.from.id, sat.get(best.from.id) - 1);
    sat.set(best.to.id, sat.get(best.to.id) + 1);
  }
  return best.gain;
}

// ── part one: the side hustle ───────────────────────────────────────────────
const BANDS = [['street buyer', 2], ['neighbourhood seller', 4], ['network builder', 8]];
console.log(`\n  SIDE HUSTLE — perfect play, ${DAYS} days, mean of ${SEEDS} seeds, piri at ${money(GOODS.piri.base)}/pack\n`);
console.log('  capacity                packs/block   €/day   €/week   week 1   week 3');
const rows = [];
for (const [name, cap] of BANDS) {
  let sum = 0, w1 = 0, w3 = 0;
  for (let s = 0; s < SEEDS; s++) {
    const sat = new Map(anchors.map(a => [a.id, 0]));
    const daily = [];
    for (let day = 0; day < DAYS; day++) {
      for (const k of sat.keys()) sat.set(k, sat.get(k) * RECOVER);
      let g = 0;
      for (const b of BLOCKS) g += tradeBlock(sat, day, b, 'curve' + s, cap);
      daily.push(g); sum += g;
    }
    w1 += daily.slice(0, 7).reduce((a, b) => a + b, 0);
    w3 += daily.slice(14, 21).reduce((a, b) => a + b, 0);
  }
  const perDay = sum / SEEDS / DAYS;
  rows.push({ name, cap, perWeek: perDay * 7 });
  console.log('  ' + name.padEnd(24) + String(cap).padStart(6)
    + money(perDay).padStart(11) + money(perDay * 7).padStart(9)
    + money(w1 / SEEDS).padStart(9) + money(w3 / SEEDS).padStart(9));
}

// ── part two: the consignment ───────────────────────────────────────────────
// You are holding N units you did not pay for. Find buyers. Patience is a
// price: sell only above a floor and it takes longer; dump and you eat the
// saturation you created.
function consign(units, seed, floorFrac) {
  const sat = new Map(anchors.map(a => [a.id, 0]));
  const floor = GOODS.piri.base * floorFrac;
  let left = units, revenue = 0, blocks = 0, day = 0, bi = 0;
  while (left > 0 && blocks < 60) {
    const block = BLOCKS[bi];
    // best place to put ONE unit right now
    let best = null;
    for (const a of anchors) {
      const p = priceAt(a, day, block, seed, sat.get(a.id)).sell;
      if (!best || p > best.p) best = { p, a };
    }
    // Sell as many as this place will still take ABOVE THE FLOOR. That is where
    // patience becomes a price: a high floor takes one or two units a block and
    // walks away; a low floor keeps selling into a price you are yourself
    // pushing down. Selling one unit per block made the two identical, which is
    // the sim refusing to model the only decision in the mission.
    if (best && best.p >= floor) {
      for (let k = 0; k < 6 && left > 0; k++) {
        const p = priceAt(best.a, day, block, seed, sat.get(best.a.id)).sell;
        if (p < floor) break;
        revenue += p; left--;
        sat.set(best.a.id, sat.get(best.a.id) + 1);
      }
    }
    blocks++; bi++;
    if (bi >= BLOCKS.length) { bi = 0; day++; for (const k of sat.keys()) sat.set(k, sat.get(k) * RECOVER); }
  }
  return { left, revenue, blocks, days: day + 1 };
}

console.log(`\n  CONSIGNMENT — "here are N units, go find buyers"\n`);
console.log('  units   patience        blocks   days   revenue   €/unit   unplaced');
for (const units of [5, 10, 20]) {
  for (const [label, frac] of [['hold out (≥90% base)', 0.9], ['take what comes (≥65%)', 0.65]]) {
    let B = 0, D = 0, R = 0, L = 0;
    for (let s = 0; s < SEEDS; s++) {
      const r = consign(units, 'con' + s, frac);
      B += r.blocks; D += r.days; R += r.revenue; L += r.left;
    }
    const placed = units - L / SEEDS;
    console.log('  ' + String(units).padStart(5) + '   ' + label.padEnd(24)
      + (B / SEEDS).toFixed(0).padStart(4) + (D / SEEDS).toFixed(1).padStart(7)
      + money(R / SEEDS).padStart(10)
      + (placed > 0 ? money(R / SEEDS / placed).padStart(9) : '—'.padStart(9))
      + (L / SEEDS).toFixed(1).padStart(11));
  }
}

console.log(`\n  WHAT THIS SAYS`);
console.log(`  The side hustle ceiling is about ${money(rows[1].perWeek)} a week played perfectly, and`);
console.log(`  real play lands under it. A mission worth real risk should pay a`);
console.log(`  multiple of that, not a fraction.`);
console.log(`\n  A consignment is a TIME problem, not a selling problem. The board`);
console.log(`  cannot absorb a load in one place, so ten units is a route across`);
console.log(`  several days — which is what gives a deadline something to bite on,`);
console.log(`  and what makes "sell it fast" cost you money rather than effort.\n`);
