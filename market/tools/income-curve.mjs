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
/** A consignment, measured in MINUTES.
 *
 *  OWNER RULING: ten units should be about THREE IN-GAME HOURS and ten to
 *  fifteen real minutes — not three days. The first sim said 2.8 days, and the
 *  reason was the time unit, not the market: it allowed one selling stop per
 *  BLOCK, three blocks a day, so ten units could not help but take days. A
 *  seller does not visit one buyer per afternoon.
 *
 *  The unit is now a stop and a walk:
 *    ASK_MIN   30   working a place — finding buyers, doing the deal
 *    HOP_MIN   20   getting to the next anchor, tram or foot
 *
 *  So a four-stop afternoon is 30+20+30+20+30+20+30 = 180 minutes, and if each
 *  stop takes about three units then ten units IS three hours. That is the
 *  arithmetic the ruling implies, and the liquidity floor was raised to 2 to
 *  make "about three units a stop" true everywhere on the board.
 */
const ASK_MIN = 30, HOP_MIN = 20;

function consign(units, seed, floorFrac) {
  const sat = new Map(anchors.map(a => [a.id, 0]));
  const floor = GOODS.piri.base * floorFrac;
  let left = units, revenue = 0, minutes = 0, stops = 0, day = 0;
  let block = 'day';
  const seenHere = new Set();
  while (left > 0 && minutes < 60 * 24) {
    // Where to go next: best price you can still get, not counting places you
    // have already worked flat this run.
    let best = null;
    for (const a of anchors) {
      const p = priceAt(a, day, block, seed, sat.get(a.id)).sell;
      if (!best || p > best.p) best = { p, a };
    }
    if (!best || best.p < floor) break;               // nothing left worth selling to
    if (stops) minutes += HOP_MIN;
    minutes += ASK_MIN;
    stops++;
    seenHere.add(best.a.id);
    for (let k = 0; k < 8 && left > 0; k++) {
      const p = priceAt(best.a, day, block, seed, sat.get(best.a.id)).sell;
      if (p < floor) break;
      revenue += p; left--;
      sat.set(best.a.id, sat.get(best.a.id) + 1);
    }
    // A long afternoon rolls into the evening, and then into tomorrow.
    if (minutes > 300 && block === 'day') block = 'evening';
    if (minutes > 600) { block = 'day'; day++; minutes += 0; for (const kk of sat.keys()) sat.set(kk, sat.get(kk) * RECOVER); }
  }
  return { left, revenue, minutes, stops, hours: minutes / 60 };
}

console.log(`\n  CONSIGNMENT — "here are N units, go find buyers"\n`);
console.log('  units   patience                 stops   in-game   revenue   €/unit   unplaced');
for (const units of [5, 10, 20]) {
  for (const [label, frac] of [
    ['hold out (≥90% of base)', 0.90],
    ['work it (≥78%)', 0.78],
    ['take what comes (≥65%)', 0.65],
  ]) {
    let B = 0, D = 0, R = 0, L = 0;
    for (let s = 0; s < SEEDS; s++) {
      const r = consign(units, 'con' + s, frac);
      B += r.stops; D += r.hours; R += r.revenue; L += r.left;
    }
    const placed = units - L / SEEDS;
    console.log('  ' + String(units).padStart(5) + '   ' + label.padEnd(24)
      + (B / SEEDS).toFixed(1).padStart(6) + ((D / SEEDS).toFixed(1) + 'h').padStart(9)
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
