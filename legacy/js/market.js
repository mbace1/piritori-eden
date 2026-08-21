// Piritori's market, debt, inventory — and what is actually in the bag.
//
// OWNER OVERRIDE 4 (2026-08-18). BRIEF.md § Market asks for "a small set of
// abstract product classes … cheap/bulky, stable/mid-risk and scarce/high-risk",
// and this file used to be exactly that: three things called bulk, steady and
// scarce. The owner's answer to the open question was *"substance names are same
// as in Dope Wars, all nicknames are ok. there can even be people that sell you
// fake drugs, etc"*.
//
// So the goods are NAMED, in the street register of Kallio in 2003 — and the
// abstraction is kept where it was actually doing work rather than deleted: a
// good declares a TIER, and the tier owns every number the economy runs on.
// Nothing in the arithmetic knows what a thing is called, which is what lets
// the 2024 act (Pasila, and Peukku) add goods without touching the model.
//
// Straight from BRIEF.md § Market, all still true:
//   · every district has a changing buy and sell range;
//   · events shift supply or demand for a readable reason;
//   · the player acts on imperfect information, and yesterday's price stays
//     visible so choices feel learned rather than random;
//   · travel consumes time, so a consignment settles where and when it lands.

import { Rng } from '../../flow-core/rng.js?v=1';

// The economy. Three tiers, and every number lives here.
export const TIERS = {
  bulk: { id: 'bulk', min: 6, max: 18, start: 10, vol: 0.10, weight: 3 },
  steady: { id: 'steady', min: 14, max: 44, start: 24, vol: 0.18, weight: 2 },
  scarce: { id: 'scarce', min: 40, max: 150, start: 70, vol: 0.34, weight: 1 },
};

// The register. Six, Kallio 2003 — and `piri` is not decoration: the square is
// named after it, which is the one piece of street language that was already in
// canon before this decision.
export const GOODS = [
  { id: 'pilvi', name: 'pilvi', tier: 'bulk', k: 0.85 },
  { id: 'hasis', name: 'hasis', tier: 'bulk', k: 1.15 },
  { id: 'subu', name: 'subu', tier: 'steady', k: 1.20 },
  { id: 'piri', name: 'piri', tier: 'steady', k: 0.86 },
  { id: 'koka', name: 'koka', tier: 'scarce', k: 1.10 },
  { id: 'hepo', name: 'hepo', tier: 'scarce', k: 0.90 },
];

// `CLASSES` was the old name and half the product imports it. Kept as the same
// array rather than a copy, so the two can never drift apart.
export const CLASSES = GOODS;

export const GOOD = Object.fromEntries(GOODS.map(g => [g.id, g]));
export const tierOf = id => TIERS[GOOD[id]?.tier] ?? TIERS.steady;
export const goodsInTier = tier => GOODS.filter(g => g.tier === tier);

// What a bag of nothing fetches. Not zero: it is cut, not empty, and somebody
// down the line pays for it once.
export const FAKE_RATE = 0.12;

export class Market {
  constructor(graph, seed, ticksPerDay) {
    this.graph = graph;
    this.rng = new Rng(seed, 'market');
    this.deals = new Rng(seed, 'deals');   // its own fork: adding a deal must
    this.ticksPerDay = ticksPerDay;        // not shift tomorrow's prices
    this.base = Object.fromEntries(GOODS.map(g => [g.id, tierOf(g.id).start * g.k]));
    this.bias = {};
    for (const n of graph.nodes.values()) {
      this.bias[n.id] = Object.fromEntries(GOODS.map(g =>
        [g.id, this.rng.float(0.78, 1.26)]));
    }
    this.mods = [];                       // {cls, mult, until}
    this.history = Object.fromEntries(GOODS.map(g => [g.id, []]));
    this.cash = 400;
    this.debt = 2000;
    this.rate = 0.06;
    this.stock = Object.fromEntries(GOODS.map(g => [g.id, 0]));
    // How many of the units you are holding are not what they say. Tracked per
    // good rather than per unit: a bag is a bag, and you cannot tell them apart
    // by looking, which is the entire point.
    this.fake = Object.fromEntries(GOODS.map(g => [g.id, 0]));
    this.exitFund = 0;
    this.recalc(0);
  }

  price(nodeId, clsId) { return this.prices[nodeId][clsId]; }

  mult(clsId, tick) {
    return this.mods.filter(m => m.cls === clsId && m.until > tick)
      .reduce((k, m) => k * m.mult, 1);
  }

  recalc(tick) {
    this.prices = {};
    for (const n of this.graph.nodes.values()) {
      this.prices[n.id] = {};
      for (const g of GOODS) {
        const p = this.base[g.id] * this.bias[n.id][g.id] * this.mult(g.id, tick);
        this.prices[n.id][g.id] = Math.max(1, Math.round(p));
      }
    }
  }

  // Prices drift every tick, not every day: a consignment in transit must be
  // able to arrive into a moved market, or latency costs nothing.
  step(tick) {
    if (tick % 12 !== 0) return;
    for (const g of GOODS) {
      const t = tierOf(g.id);
      const step = 1 + this.rng.float(-1, 1) * t.vol * 0.25;
      this.base[g.id] = Math.min(t.max * g.k, Math.max(t.min * g.k, this.base[g.id] * step));
    }
    this.recalc(tick);
    if (tick % 60 === 0) {
      for (const g of GOODS) {
        const h = this.history[g.id];
        h.push(Math.round(this.base[g.id]));
        if (h.length > 40) h.shift();
      }
    }
  }

  // A shock names a TIER or a GOOD. An event that dries up the scarce end
  // should move both ends of it, and one that hits a single good should not.
  shock(what, mult, ticks, tick) {
    const ids = TIERS[what] ? goodsInTier(what).map(g => g.id) : [what];
    for (const id of ids) this.mods.push({ cls: id, mult, until: tick + ticks });
    this.recalc(tick);
    return ids;
  }

  // yesterday's price stays visible so choices feel learned, not random
  lastSeen(clsId) {
    const h = this.history[clsId];
    return h.length ? h[h.length - 1] : Math.round(this.base[clsId]);
  }

  buy(nodeId, clsId, n) {
    const p = this.price(nodeId, clsId);
    const can = Math.min(n, Math.floor(this.cash / p));
    if (can <= 0) return 0;
    this.cash -= can * p;
    this.stock[clsId] += can;
    return can;
  }

  // ── the bargain ───────────────────────────────────────────────────────
  // "There can even be people that sell you fake drugs." The rule this has to
  // obey is canon's, not mine: BRIEF's do-not-copy list forbids random
  // punishment without a readable warning. So the warning is the RELATIONSHIP.
  //
  // Trust decides both how steep the discount is and how likely the bag is
  // cut, in the same direction — somebody you burned offers you the best price
  // in the game and means none of it. The player is told the discount and told
  // who is offering, and that is the whole of the information. No hidden roll
  // is ever the reason: the roll only fires where trust already said it might.
  dealFor(day, sellerId, trust = 0) {
    // a NAMED fork, so adding a seller or a day cannot shift anybody else's
    // offer — same parent seed + same name is the same sequence, always
    const r = this.deals.fork(`${sellerId}:${day}`);
    if (r.float(0, 1) > 0.55) return null;
    const good = GOODS[r.int(0, GOODS.length - 1)];
    // −1 trust → 0.50 off and a coin-flip bag. +3 trust → 0.18 off, honest.
    const t = Math.max(-2, Math.min(3, trust));
    const discount = +(0.44 - t * 0.08 + r.float(-0.04, 0.04)).toFixed(2);
    const fakeChance = Math.max(0, 0.42 - t * 0.16);
    return {
      id: `${sellerId}:${day}`,
      seller: sellerId, day, good: good.id, n: 5,
      discount: Math.max(0.05, discount),
      fake: r.float(0, 1) < fakeChance,
      trust: t,
    };
  }

  // What the player is shown BEFORE committing. Never says "this is fake" —
  // it says what is true and lets the discount and the name do the arguing.
  dealTell(deal) {
    if (!deal) return null;
    const off = Math.round(deal.discount * 100);
    if (deal.trust <= -1) return `${off}% under. He will not meet your eye.`;
    if (deal.trust === 0) return `${off}% under. You do not know him well enough to say.`;
    if (deal.trust >= 2) return `${off}% under, and he tells you where it came from.`;
    return `${off}% under. He has been straight with you so far.`;
  }

  dealPrice(nodeId, deal) {
    return Math.max(1, Math.round(this.price(nodeId, deal.good) * (1 - deal.discount)));
  }

  takeDeal(nodeId, deal) {
    const p = this.dealPrice(nodeId, deal);
    const can = Math.min(deal.n, Math.floor(this.cash / p));
    if (can <= 0) return { n: 0, spent: 0 };
    this.cash -= can * p;
    this.stock[deal.good] += can;
    if (deal.fake) this.fake[deal.good] += can;
    return { n: can, spent: can * p };
  }

  // ── the appraisal ─────────────────────────────────────────────────────
  // You cannot ask the man selling you a bag whether the bag is real. You can
  // ask SOMEBODY ELSE, and that is the whole shape of it: the one genuinely
  // hidden fact in this game is bought with money and a SECOND relationship,
  // never with the first.
  //
  // It does not break the rule the bargain obeys. Trust is still the warning —
  // this only lets a player who has kept more than one person around convert
  // money into certainty, and a contact you have burned takes the money and
  // tells you nothing, which is its own information about them.
  appraisalCost(trust) {
    const t = Math.max(-2, Math.min(3, trust));
    return Math.round(200 - t * 40);        // a friend charges less to look
  }

  appraise(deal, trust) {
    if (!deal) return { told: false, why: 'nothing to look at' };
    const cost = this.appraisalCost(trust);
    if (this.cash < cost) return { told: false, why: 'you cannot cover it', cost };
    this.cash -= cost;
    if (trust < 1) return { told: false, why: 'shrug', cost };
    return { told: true, cut: !!deal.fake, cost };
  }

  // What share of what you are holding is cut. This is the number the player
  // never sees — the game's one genuinely hidden fact, and it is hidden because
  // the fiction says you cannot tell by looking.
  fakeShare(clsId) {
    const held = this.stock[clsId];
    return held > 0 ? this.fake[clsId] / held : 0;
  }

  // A consignment takes a PROPORTIONAL share of whatever is in the pile, and
  // takes it out of the pile — so a bad batch cannot be quarantined by sending
  // the good stuff first, and cannot be duplicated by sending it twice.
  hold(clsId, n) {
    const can = Math.min(n, this.stock[clsId]);
    if (can <= 0) return { n: 0, fake: 0 };
    const fake = Math.min(this.fake[clsId], Math.round(can * this.fakeShare(clsId)));
    this.stock[clsId] -= can;
    this.fake[clsId] -= fake;
    return { n: can, fake };
  }

  // A consignment already left; this is what it fetches on arrival — and the
  // arrival is where a cut bag is finally found out, by the money.
  settleArrival(nodeId, clsId, n, fake = 0) {
    const p = this.price(nodeId, clsId);
    const real = Math.max(0, n - fake);
    const got = real * p + fake * Math.max(1, Math.round(p * FAKE_RATE));
    this.cash += got;
    return { got, fake, real, price: p };
  }

  // Interest advances at settlement, never while a menu is open (brief).
  settleDay() {
    this.debt = this.debt * (1 + this.rate);
    return Math.round(this.debt);
  }

  payDebt(n) {
    const pay = Math.min(n, this.cash, Math.ceil(this.debt));
    this.cash -= pay; this.debt = Math.max(0, this.debt - pay);
    return pay;
  }

  // "Bank profit" at settlement (BRIEF § Settle). The exit fund is one of the
  // four axes the ending matrix reads; how it is filled is the player's call.
  bank(n) {
    const put = Math.min(n, this.cash);
    this.cash -= put; this.exitFund += put;
    return put;
  }
}
