// Piritori's market, debt and inventory.
//
// Three abstract classes, per the brief — the core never sees a substance name
// and neither does this file's arithmetic. Street register belongs to the
// narrative layer.
//
// Straight from BRIEF.md § Market:
//   · every district has a changing buy and sell range;
//   · events shift supply or demand for a readable reason;
//   · the player acts on imperfect information, and yesterday's price stays
//     visible so choices feel learned rather than random;
//   · travel consumes time, so a consignment settles where and when it lands.

import { Rng } from '../../flow-core/rng.js?v=1';

export const CLASSES = [
  { id: 'bulk', name: 'bulk', min: 6, max: 18, start: 10, vol: 0.10, weight: 3 },
  { id: 'steady', name: 'steady', min: 14, max: 44, start: 24, vol: 0.18, weight: 2 },
  { id: 'scarce', name: 'scarce', min: 40, max: 150, start: 70, vol: 0.34, weight: 1 },
];

export class Market {
  constructor(graph, seed, ticksPerDay) {
    this.graph = graph;
    this.rng = new Rng(seed, 'market');
    this.ticksPerDay = ticksPerDay;
    this.base = Object.fromEntries(CLASSES.map(c => [c.id, c.start]));
    this.bias = {};
    for (const n of graph.nodes.values()) {
      this.bias[n.id] = Object.fromEntries(CLASSES.map(c =>
        [c.id, this.rng.float(0.78, 1.26)]));
    }
    this.mods = [];                       // {cls, mult, until}
    this.history = Object.fromEntries(CLASSES.map(c => [c.id, []]));
    this.cash = 400;
    this.debt = 2000;
    this.rate = 0.06;
    this.stock = Object.fromEntries(CLASSES.map(c => [c.id, 0]));
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
      for (const c of CLASSES) {
        const p = this.base[c.id] * this.bias[n.id][c.id] * this.mult(c.id, tick);
        this.prices[n.id][c.id] = Math.max(1, Math.round(p));
      }
    }
  }

  // Prices drift every tick, not every day: a consignment in transit must be
  // able to arrive into a moved market, or latency costs nothing.
  step(tick) {
    if (tick % 12 !== 0) return;
    for (const c of CLASSES) {
      const step = 1 + this.rng.float(-1, 1) * c.vol * 0.25;
      this.base[c.id] = Math.min(c.max, Math.max(c.min, this.base[c.id] * step));
    }
    this.recalc(tick);
    if (tick % 60 === 0) {
      for (const c of CLASSES) {
        const h = this.history[c.id];
        h.push(Math.round(this.base[c.id]));
        if (h.length > 40) h.shift();
      }
    }
  }

  shock(clsId, mult, ticks, tick) {
    this.mods.push({ cls: clsId, mult, until: tick + ticks });
    this.recalc(tick);
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

  // A consignment already left; this is what it fetches on arrival.
  settleArrival(nodeId, clsId, n) {
    const p = this.price(nodeId, clsId);
    this.cash += n * p;
    return n * p;
  }

  hold(clsId, n) {
    const can = Math.min(n, this.stock[clsId]);
    this.stock[clsId] -= can;
    return can;
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
