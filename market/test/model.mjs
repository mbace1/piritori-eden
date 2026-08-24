#!/usr/bin/env node
/**
 * The market gate. Bare node — no browser, no GPU — so it runs on every edit.
 *
 *   node market/test/model.mjs
 *
 * It asserts the four claims MARKET.md makes, because a design document that
 * says "deterministic" and "the explanation cannot disagree with the number" is
 * making testable promises, and the whole point of this repo's gates is that a
 * promise nobody checks drifts.
 */
import { readFileSync } from 'node:fs';
import { GOODS, nodeProfile, offer, present, decay, INFO } from '../model.mjs';

const board = JSON.parse(readFileSync(new URL('../../map/kallio-era1-2003-v1.json', import.meta.url)));
const anchors = board.anchors;
const BLOCKS = ['morning', 'day', 'evening', 'night'];

let pass = 0, fail = 0;
const ok = (cond, what) => { if (cond) { pass++; } else { fail++; console.log('  FAIL  ' + what); } };

// ── 1. determinism ──────────────────────────────────────────────────────────
{
  let same = true;
  for (const a of anchors) for (let day = 0; day < 14; day++) {
    const x = offer(a, 'piri', { day, block: 'day' }, { seed: 's' });
    const y = offer(a, 'piri', { day, block: 'day' }, { seed: 's' });
    if (x.buy !== y.buy || x.sell !== y.sell || x.cause !== y.cause) same = false;
  }
  ok(same, 'same inputs give the same offer');

  const a = anchors[0];
  const s1 = offer(a, 'piri', { day: 3, block: 'day' }, { seed: 'one' });
  const s2 = offer(a, 'piri', { day: 3, block: 'day' }, { seed: 'two' });
  ok(s1.buy !== s2.buy, 'a different seed is a different city');
}

// ── 2. bounds ───────────────────────────────────────────────────────────────
{
  const g = GOODS.piri;
  let lo = Infinity, hi = -Infinity, wide = 0, bad = 0;
  const shocks = [
    { id: 'dry', node: null, good: 'piri', from: 0, to: 60, factor: 1.5, text: 'dry week' },
    { id: 'raid', node: null, good: 'piri', from: 0, to: 60, factor: 1.35, text: 'pressure' },
  ];
  for (const a of anchors) for (let day = 0; day < 60; day++) for (const block of BLOCKS) {
    for (const sat of [{ units: -20 }, { units: 0 }, { units: 20 }]) {
      const o = offer(a, 'piri', { day, block }, { seed: 'b', shocks, saturation: sat });
      lo = Math.min(lo, o.marketMid); hi = Math.max(hi, o.marketMid);
      wide = Math.max(wide, o.buy);
      if (!(o.sell < o.mid && o.mid < o.buy)) bad++;
      if (!Number.isFinite(o.buy) || o.buy <= 0) bad++;
    }
  }
  ok(bad === 0, 'sell < mid < buy always, and every price is finite and positive');
  ok(lo >= g.base * 0.6 - 0.01 && hi <= g.base * 1.75 + 0.01,
    `the MARKET mid stays inside its clamp under stacked shocks (saw ${lo.toFixed(0)}–${hi.toFixed(0)} of ${g.base})`);
  // The quoted book can sit outside that — your own footprint is priced into
  // one side of it — but not by an absurd amount. This is the assertion that
  // caught saturation escaping its bound and quoting €1,090,289.
  ok(wide < g.base * 3.5, `the worst quoted buy stays sane (€${wide.toFixed(0)} vs base €${g.base})`);
}

// ── 3. the explanation cannot disagree with the number ──────────────────────
// MARKET.md's structural claim. The reported cause must be the named factor
// furthest from 1 in log space, drift excluded.
{
  let bad = 0, quiet = 0;
  const shocks = [{ id: 'closure', node: 'hakaniemi', good: 'piri', from: 2, to: 5, factor: 1.6, text: 'station closure' }];
  for (const a of anchors) for (let day = 0; day < 21; day++) for (const block of BLOCKS) {
    const o = offer(a, 'piri', { day, block }, { seed: 'e', shocks, saturation: { units: (day % 7) - 3 } });
    const named = Object.entries(o.factors).filter(([id]) => id !== 'drift');
    const top = named.reduce((m, kv) => Math.abs(Math.log(kv[1])) > Math.abs(Math.log(m[1])) ? kv : m);
    if (o.cause === 'ordinary') { quiet++; continue; }
    if (o.cause !== top[0]) bad++;
  }
  ok(bad === 0, 'the stated cause is always the dominant named factor');
  ok(quiet > 0, 'some offers honestly report that nothing much is moving them');
}

// ── 4. saturation actually bites, and recovers ──────────────────────────────
{
  const a = anchors.find(x => x.roles.includes('market'));
  const clean = offer(a, 'piri', { day: 5, block: 'day' }, { seed: 'sat', saturation: { units: 0 } });
  const sold = offer(a, 'piri', { day: 5, block: 'day' }, { seed: 'sat', saturation: { units: 8 } });
  const bought = offer(a, 'piri', { day: 5, block: 'day' }, { seed: 'sat', saturation: { units: -8 } });
  ok(sold.sell < clean.sell, 'selling into a place lowers what it pays you');
  ok(bought.buy > clean.buy, 'buying a place out raises what it charges you');

  let monotone = true, prev = Infinity;
  for (let u = 0; u <= 12; u++) {
    const o = offer(a, 'piri', { day: 5, block: 'day' }, { seed: 'sat', saturation: { units: u } });
    if (o.mid > prev + 1e-9) monotone = false;
    prev = o.mid;
  }
  ok(monotone, 'more volume never helps you — saturation is monotone');
}

// ── 5. a place with more roles is not simply a bigger place ─────────────────
{
  let bad = 0;
  for (const a of anchors) {
    const p = nodeProfile(a);
    if (p.demand < 0.72 || p.demand > 1.42) bad++;
    if (p.spread < 0.06 || p.spread > 0.34) bad++;
    if (p.liquidity < 2 || p.liquidity > 10) bad++;
  }
  ok(bad === 0, 'every anchor profile is inside its clamps, whatever its role count');
}

// ── 6. information decays one way, and a range never lies ───────────────────
{
  ok(decay(INFO.QUOTE, 0) === INFO.QUOTE, 'a fresh quote is a quote');
  ok(decay(INFO.QUOTE, 3) === INFO.RANGE, 'a quote becomes a range');
  ok(decay(INFO.QUOTE, 8) === INFO.RUMOUR, 'a range becomes a rumour');
  ok(decay(INFO.QUOTE, 40) === INFO.NONE, 'eventually you know nothing again');
  ok(decay(INFO.RUMOUR, 0) === INFO.RUMOUR, 'age never improves information');

  let outside = 0, checked = 0;
  for (const a of anchors) for (let day = 0; day < 10; day++) for (let age = 2; age <= 9; age++) {
    const t = offer(a, 'piri', { day, block: 'day' }, { seed: 'i' });
    const p = present(t, INFO.QUOTE, age, 'i', a.id, 'piri');
    if (p.level !== INFO.RANGE) continue;
    checked++;
    if (t.buy < p.lowBuy || t.buy > p.highBuy) outside++;
    if (t.sell < p.lowSell || t.sell > p.highSell) outside++;
  }
  ok(checked > 0 && outside === 0, `a range always contains the true price (${checked} bands checked)`);
}

// ── 7. the board actually supports a trade ──────────────────────────────────
// A market mini-game with no profitable route is not a mini-game. This asserts
// the spread does not eat every opportunity — and, just as importantly, that
// the opportunity is not everywhere.
{
  const day = 3, clock = { day, block: 'day' };
  const os = anchors.map(a => ({ a, o: offer(a, 'piri', clock, { seed: 'trade' }) }));
  let best = null, pairs = 0, profitable = 0;
  for (const x of os) for (const y of os) {
    if (x.a.id === y.a.id) continue;
    pairs++;
    const margin = y.o.sell - x.o.buy;
    if (margin > 0) profitable++;
    if (!best || margin > best.margin) best = { from: x.a.label, to: y.a.label, margin };
  }
  ok(best && best.margin > 5, `a worthwhile route exists (${best.from} → ${best.to}, €${best.margin.toFixed(2)}/pack)`);
  const share = profitable / pairs;
  ok(share < 0.5, `most pairs are NOT worth the trip (${(share * 100).toFixed(0)}% profitable)`);
}

console.log(`\nmarket model — ${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
