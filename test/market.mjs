// The market, the named goods and the cut bag. Bare node, seeded, no DOM.
//
// This gate did not exist before the goods had names, which is the wrong way
// round: the economy is the game. It is here now because "there can even be
// people that sell you fake drugs" adds the one genuinely hidden fact in the
// build, and a hidden fact without a test is a bug waiting to be shipped.
//
// What it enforces, all of it from canon (BRIEF.md):
//   · no random punishment without a readable warning — a bad deal is ALWAYS
//     announced before it is taken, and what is announced is true;
//   · the abstraction survives the naming: the tiers still own every number;
//   · a seed replays — the same day and the same seller is the same offer,
//     whatever order anything is drawn in.

import {
  Market, GOODS, GOOD, TIERS, CLASSES, FAKE_RATE, tierOf, goodsInTier,
} from '../js/market.js?v=2';
import { KALLIO } from '../../flow-core/city.js?v=1';
import { Graph } from '../../flow-core/graph.js?v=1';

let pass = 0, fail = 0;
const ok = (n, c, d) => { c ? (pass++, console.log('  ok   ' + n)) : (fail++, console.log('  FAIL ' + n + (d ? ' → ' + d : ''))); };

console.log('\npiritori market — named goods, and what is in the bag\n');

const mk = (seed = 4) => new Market(new Graph(KALLIO), seed, 600);
const NODE = 'vaasanaukio';

// ── the register ────────────────────────────────────────────────────────
{
  ok('the goods have names', GOODS.length >= 3 && GOODS.every(g => g.name && g.id));
  ok('CLASSES is the same array, not a copy that can drift', CLASSES === GOODS);
  ok('every good declares a tier that exists',
    GOODS.every(g => TIERS[g.tier]),
    GOODS.filter(g => !TIERS[g.tier]).map(g => g.id).join());
  ok('all three tiers are actually used',
    Object.keys(TIERS).every(t => goodsInTier(t).length > 0));
  ok('piri is on the board — the square is named after it', !!GOOD.piri);

  // the abstraction is kept where it was doing work: nothing in the pricing
  // reads a NAME, it reads a tier
  const m = mk();
  for (const g of GOODS) {
    const t = tierOf(g.id);
    ok(`${g.id}: priced inside its tier's band`,
      m.base[g.id] >= t.min * g.k - 0.001 && m.base[g.id] <= t.max * g.k + 0.001,
      `${m.base[g.id].toFixed(1)} vs ${(t.min * g.k).toFixed(1)}–${(t.max * g.k).toFixed(1)}`);
  }
  // and two goods in one tier must not be the same good wearing two names
  const [a, b] = goodsInTier('scarce');
  ok('two goods in a tier have different prices', m.price(NODE, a.id) !== m.price(NODE, b.id));
}

// ── drift stays inside the band, forever ────────────────────────────────
{
  const m = mk(11);
  for (let t = 0; t < 4200; t += 12) m.step(t);
  let out = [];
  for (const g of GOODS) {
    const tr = tierOf(g.id);
    if (m.base[g.id] < tr.min * g.k - 0.001 || m.base[g.id] > tr.max * g.k + 0.001) out.push(g.id);
  }
  ok('after a full campaign nothing has escaped its band', out.length === 0, out.join());
  ok('and yesterday\'s price is still visible', GOODS.every(g => m.lastSeen(g.id) > 0));
}

// ── a shock names a tier OR a good ──────────────────────────────────────
{
  const m = mk(3);
  const before = GOODS.map(g => m.price(NODE, g.id));
  const hit = m.shock('scarce', 1.8, 400, 0);
  ok('a tier shock moves every good in that tier', hit.length === goodsInTier('scarce').length);
  const after = GOODS.map(g => m.price(NODE, g.id));
  const moved = GOODS.filter((g, i) => after[i] !== before[i]).map(g => g.tier);
  ok('and nothing outside it', moved.every(t => t === 'scarce'), moved.join());

  const m2 = mk(3);
  const one = m2.shock('piri', 2, 400, 0);
  ok('a good shock moves exactly one', one.length === 1 && one[0] === 'piri');
}

// ── the bargain: the warning is the whole mechanic ───────────────────────
{
  const m = mk(8);
  let offers = 0, told = 0, fakes = 0;
  for (let day = 0; day < 40; day++) {
    for (const who of ['igor', 'sean', 'toko', 'jaska']) {
      for (const trust of [-2, -1, 0, 1, 2, 3]) {
        const d = m.dealFor(day, who, trust);
        if (!d) continue;
        offers++;
        const tell = m.dealTell(d);
        // EVERY offer says something, and what it says is checkable: the
        // percentage in the sentence is the percentage that is charged
        if (tell && tell.includes(`${Math.round(d.discount * 100)}%`)) told++;
        if (d.fake) fakes++;
      }
    }
  }
  ok(`every offer is announced before it is taken (${offers} offers)`, offers > 0 && told === offers,
    `${told}/${offers}`);
  ok('and some of them are cut, or there is no mechanic', fakes > 0);

  // trust is the warning. It has to actually predict.
  const rate = trust => {
    let n = 0, bad = 0;
    for (let day = 0; day < 300; day++) {
      const d = m.dealFor(day, 'sean', trust);
      if (!d) continue;
      n++; if (d.fake) bad++;
    }
    return bad / n;
  };
  const burned = rate(-2), kept = rate(3);
  ok(`somebody you burned sells you chalk more often (${(burned * 100) | 0}% vs ${(kept * 100) | 0}%)`,
    burned > kept + 0.15);
  ok('and a trusted contact is not selling fakes at all', kept === 0, String(kept));

  // …and pays for it in the other direction: the burned man's price is better
  const worst = m.dealFor(5, 'sean', -2), best = m.dealFor(5, 'sean', 3);
  if (worst && best) {
    ok('the worse the relationship, the better the price', worst.discount > best.discount,
      `${worst.discount} vs ${best.discount}`);
  } else ok('the worse the relationship, the better the price', false, 'no offer to compare');
}

// ── the appraisal: buying the one hidden fact ───────────────────────────
{
  const m = mk(12);
  m.cash = 10000;
  const cut = { good: 'piri', n: 5, discount: 0.4, fake: true };
  const clean = { good: 'piri', n: 5, discount: 0.2, fake: false };

  ok('a friend charges less to look',
    m.appraisalCost(3) < m.appraisalCost(-2));

  const a = m.appraise(cut, 3);
  ok('somebody you kept tells you the truth', a.told === true && a.cut === true);
  const b = m.appraise(clean, 2);
  ok('and tells you when it is fine', b.told === true && b.cut === false);

  // …and somebody you burned takes the money anyway. That is the point: the
  // loss is the information.
  const before = m.cash;
  const c = m.appraise(cut, -1);
  ok('somebody you burned tells you nothing', c.told === false && c.why === 'shrug');
  ok('and still takes the money', m.cash === before - c.cost);

  // you cannot buy what you cannot afford, and it costs nothing to be refused
  m.cash = 5;
  const poor = m.cash;
  const d = m.appraise(cut, 3);
  ok('an empty pocket buys nothing', d.told === false && d.why === 'you cannot cover it');
  ok('and is not charged for trying', m.cash === poor);

  ok('asking about nothing is free and honest',
    m.appraise(null, 3).told === false);
}

// ── determinism ─────────────────────────────────────────────────────────
{
  const a = mk(21), b = mk(21);
  ok('one seed, one offer',
    JSON.stringify(a.dealFor(3, 'igor', 0)) === JSON.stringify(b.dealFor(3, 'igor', 0)));
  // drawing somebody else's offer first must not change yours — that is the
  // named-fork rule, and it is the whole reason deals have their own stream
  const c = mk(21);
  c.dealFor(3, 'sean', 2); c.dealFor(9, 'toko', -1); c.dealFor(3, 'jaska', 0);
  ok('and asking about other people first does not change it',
    JSON.stringify(c.dealFor(3, 'igor', 0)) === JSON.stringify(a.dealFor(3, 'igor', 0)));
  ok('a different day is a different offer',
    JSON.stringify(a.dealFor(4, 'igor', 0)) !== JSON.stringify(a.dealFor(3, 'igor', 0)));
}

// ── the cut bag ─────────────────────────────────────────────────────────
{
  const m = mk(6);
  m.cash = 100000;
  const deal = { id: 'x', seller: 'sean', day: 0, good: 'piri', n: 5, discount: 0.4, fake: true, trust: -1 };
  const p = m.dealPrice(NODE, deal);
  ok('a discount is a real discount', p < m.price(NODE, 'piri'));

  const took = m.takeDeal(NODE, deal);
  ok('taking it puts stock in your hands', m.stock.piri === took.n && took.n === 5);
  ok('and none of it is real', m.fake.piri === 5 && m.fakeShare('piri') === 1);

  // buy five honest ones on top: the pile is now half and half
  m.buy(NODE, 'piri', 5);
  ok('a mixed pile knows its own share', m.stock.piri === 10 && Math.abs(m.fakeShare('piri') - 0.5) < 1e-9);

  // sending takes a PROPORTIONAL share — you cannot send the good stuff first
  const held = m.hold('piri', 4);
  ok('a consignment carries its share of the bad', held.n === 4 && held.fake === 2,
    JSON.stringify(held));
  ok('and the pile keeps the rest', m.stock.piri === 6 && m.fake.piri === 3);

  // and it is found out by the money, at the far end
  const cashBefore = m.cash;
  const r = m.settleArrival('hakaniemi', 'piri', held.n, held.fake);
  const full = m.price('hakaniemi', 'piri') * held.n;
  ok('a cut consignment fetches less than a clean one', r.got < full, `${r.got} vs ${full}`);
  ok('but not nothing — it is cut, not empty', r.got > full * FAKE_RATE * 0.4);
  ok('and the money actually moved', m.cash === cashBefore + r.got);
  ok('the arrival reports what was wrong', r.fake === 2 && r.real === 2);
}

// ── fakes cannot be laundered by the accounting ──────────────────────────
{
  const m = mk(9);
  m.cash = 100000;
  m.takeDeal(NODE, { good: 'koka', n: 5, discount: 0.5, fake: true });
  // send it away in ones. Every unit was fake, so every unit must stay fake —
  // an off-by-one in the rounding here would quietly clean the pile.
  let sentFake = 0, sentN = 0;
  for (let i = 0; i < 5; i++) { const h = m.hold('koka', 1); sentN += h.n; sentFake += h.fake; }
  ok('five fake units sent one at a time are still five fake units',
    sentN === 5 && sentFake === 5, `${sentFake}/${sentN}`);
  ok('and the pile is empty rather than owing', m.stock.koka === 0 && m.fake.koka === 0);

  // the opposite: an entirely clean pile can never produce a fake
  const c = mk(9);
  c.cash = 100000;
  c.buy(NODE, 'hasis', 9);
  let bad = 0;
  for (let i = 0; i < 9; i++) bad += c.hold('hasis', 1).fake;
  ok('a clean pile never produces a cut bag', bad === 0);
  ok('holding more than you have takes what there is', c.hold('hasis', 50).n === 0);
}

console.log(`\n  ${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
