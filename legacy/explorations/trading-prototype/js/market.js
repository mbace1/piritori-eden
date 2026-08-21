// The Drug Wars half: one run's state and the arithmetic that moves it.
// No DOM in here — main.js renders whatever this returns, and the smoke test
// drives this directly, so everything is deterministic given the seed.

import { STATIONS, GOODS, WIRE, STORY, ENDINGS, BUSTED_ENDING } from './data.js?v=1';

// mulberry32 — seeded so a bug report can name a run
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const stationById = id => STATIONS.find(s => s.id === id);

export function newRun(seed = (Date.now() % 2 ** 31)) {
  const run = {
    seed, rnd: rng(seed),
    day: 1, maxDay: 30,
    at: 'piritori',
    cash: 500, debt: 2000, rate: 0.05,
    stash: Object.fromEntries(GOODS.map(g => [g.id, 0])),
    cap: 40,
    heat: 8, busts: 0, protection: false,
    base: Object.fromEntries(GOODS.map(g => [g.id, g.start])),
    mods: [],                   // active price effects {good, mult, until}
    pendingEffect: null,        // aired tonight, lands tomorrow
    tip: null,                  // tomorrow's bulletin, if Toko told you
    usedSpecial: false,         // one special action per evening
    news: null,                 // tonight's bulletin {text, effect}
    story: STORY.find(b => b.day === 1) || null,
    over: null,                 // an ending object once the run ends
    log: [],
  };
  rollPrices(run);
  pickNews(run);
  return run;
}

function say(run, line) { run.log.unshift(line); run.log.length = Math.min(run.log.length, 30); }

// ── prices ──────────────────────────────────────────────────────────────
function activeMult(run, goodId) {
  return run.mods.filter(m => m.good === goodId && m.until >= run.day)
    .reduce((k, m) => k * m.mult, 1);
}

function rollPrices(run) {
  run.prices = {};
  for (const s of STATIONS) {
    run.prices[s.id] = {};
    for (const g of GOODS) {
      const jitter = 0.82 + run.rnd() * 0.36;
      const p = run.base[g.id] * (s.bias[g.id] ?? 1) * activeMult(run, g.id) * jitter;
      run.prices[s.id][g.id] = Math.max(1, Math.round(p));
    }
  }
}

function walkBases(run) {
  for (const g of GOODS) {
    const step = 1 + (run.rnd() * 2 - 1) * g.drift;
    run.base[g.id] = Math.min(g.max, Math.max(g.min, run.base[g.id] * step));
  }
}

export function priceAt(run, goodId) { return run.prices[run.at][goodId]; }

export function stashUsed(run) { return Object.values(run.stash).reduce((a, b) => a + b, 0); }

export function stashValue(run) {
  return GOODS.reduce((sum, g) => sum + run.stash[g.id] * priceAt(run, g.id), 0);
}

export function netWorth(run) { return run.cash - Math.round(run.debt) + stashValue(run); }

// ── the wire ────────────────────────────────────────────────────────────
// One bulletin a night. Roughly every third night the wire moves a market;
// its effect lands TOMORROW, which is what makes tonight's broadcast (and
// Toko Slomo's early copy of tomorrow's) worth anything.
function pickNews(run) {
  if (run.tip) { run.news = run.tip; run.tip = null; }
  else {
    const movers = WIRE.filter(w => w.effect);
    const colour = WIRE.filter(w => !w.effect);
    run.news = run.rnd() < 0.34
      ? movers[Math.floor(run.rnd() * movers.length)]
      : colour[Math.floor(run.rnd() * colour.length)];
  }
  run.pendingEffect = run.news.effect || null;
}

// ── travel: the only clock ──────────────────────────────────────────────
// Moving anywhere costs the evening. Interest ticks, prices reroll, the
// pending bulletin's effect lands, and the night can go wrong on arrival.
export function travel(run, stationId) {
  if (run.over || stationId === run.at) return null;
  run.at = stationId;
  run.day += 1;
  run.usedSpecial = false;
  run.debt = run.debt * (1 + run.rate);
  run.heat = Math.max(0, run.heat - 2);
  if (run.pendingEffect) {
    run.mods.push({ ...run.pendingEffect, until: run.day + run.pendingEffect.days - 1 });
    run.pendingEffect = null;
  }
  walkBases(run);
  rollPrices(run);
  pickNews(run);
  run.story = STORY.find(b => b.day === run.day) || null;

  if (run.day > run.maxDay) { endRun(run); return null; }
  return arrivalEvent(run);
}

// What can meet you when you step off. Returns an event object main.js
// renders as a modal, or null for a quiet arrival.
function arrivalEvent(run) {
  const here = stationById(run.at);
  const carrying = stashUsed(run);
  const exposure = (here.heat + run.heat) / 200 * (0.35 + Math.min(1, carrying / run.cap));
  if (carrying > 0 && run.rnd() < exposure) {
    const bribe = Math.max(100, Math.round(run.cash * 0.22));
    return {
      type: 'police', bribe,
      text: 'Two constables step out of a doorway that had nobody in it. One of them already has your description.',
    };
  }
  if (!run.protection && run.cash > 600 && (here.id === 'kurvi' || here.id === 'piritori') && run.rnd() < 0.13) {
    const cut = Math.round(run.cash * (0.15 + run.rnd() * 0.15));
    run.cash -= cut;
    say(run, `Jumped near ${here.name} — they knew your pockets. −${cut} €`);
    return {
      type: 'mugged', cut,
      text: `Three of them, fast, professional. They take ${cut} € and leave the jacket, which in this line counts as courtesy. The McCormicks sell insurance against nights like this.`,
    };
  }
  return null;
}

export function resolvePolice(run, choice) {
  if (choice === 'bribe' && run.cash >= 0) {
    const bribe = Math.max(100, Math.round(run.cash * 0.22));
    run.cash = Math.max(0, run.cash - bribe);
    run.heat += 6;
    say(run, `Paid the evening tax. −${bribe} €`);
    return { text: 'Money folds into a notebook that writes nothing down. "Early night," says the taller one, and it is.' };
  }
  // run for it
  let lost = 0;
  for (const g of GOODS) { const drop = Math.ceil(run.stash[g.id] / 2); run.stash[g.id] -= drop; lost += drop; }
  run.heat += 14; run.busts += 1;
  say(run, `Ran through the yards — half the stash into a snowbank that will not melt till someone finds it.`);
  if (run.busts >= 3) { run.over = { ...BUSTED_ENDING, worth: netWorth(run) }; return { text: 'You do not make the corner.' }; }
  return { text: `You know the yards better than they do — but the stash knows gravity. ${lost} units gone. Strike ${run.busts} of 3.` };
}

// ── trading ─────────────────────────────────────────────────────────────
export function buy(run, goodId, n) {
  const price = priceAt(run, goodId);
  const can = Math.min(n, Math.floor(run.cash / price), run.cap - stashUsed(run));
  if (can <= 0) return 0;
  run.cash -= can * price;
  run.stash[goodId] += can;
  run.heat += can > 5 ? 2 : 1;
  return can;
}

export function sell(run, goodId, n) {
  const price = priceAt(run, goodId);
  const can = Math.min(n, run.stash[goodId]);
  if (can <= 0) return 0;
  run.cash += can * price;
  run.stash[goodId] -= can;
  const here = stationById(run.at);
  run.heat += here.heat > 20 ? 3 : 1;
  return can;
}

export function payDebt(run, amount) {
  const pay = Math.min(amount, run.cash, Math.ceil(run.debt));
  run.cash -= pay; run.debt = Math.max(0, run.debt - pay);
  if (pay > 0) say(run, `Wired ${pay} € east. Igor's silence gets one day longer.`);
  return pay;
}

// ── station specials — free, once per evening ───────────────────────────
export function special(run) {
  const here = stationById(run.at);
  if (!here.special || run.usedSpecial || run.over) return null;
  run.usedSpecial = true;
  switch (here.special) {
    case 'ramen': {
      if (run.cash < 10) { run.usedSpecial = false; return { text: 'Ten euros for the bowl and the talk. Tonight you have neither.' }; }
      run.cash -= 10; run.heat = Math.max(0, run.heat - 5);
      const movers = WIRE.filter(w => w.effect);
      const colour = WIRE.filter(w => !w.effect);
      run.tip = run.rnd() < 0.6
        ? movers[Math.floor(run.rnd() * movers.length)]
        : colour[Math.floor(run.rnd() * colour.length)];
      say(run, 'Ramen with Toko Slomo. Tomorrow\'s wire, tonight.');
      return { text: `Toko Slomo leans on the counter while you eat. "Tomorrow Arvi will read this," he says, and tells you, word for word:\n\n"${run.tip.text}"` };
    }
    case 'mccormick': {
      if (run.protection) return { text: 'Sean nods from the taps. You drink for free now, which is how they remind you what you paid.' };
      if (run.cash < 400) return { text: '"Four hundred, Finn, and nobody touches you on this side of the bridge." You do not have it, and Sean does not repeat himself.' };
      run.cash -= 400; run.protection = true;
      say(run, 'Bought the McCormick handshake. −400 €');
      return { text: 'Four hundred across the bar. Sean shakes your hand like he is testing a rope. "Family now," he says. "Small print applies."' };
    }
    case 'sit': {
      run.heat = Math.max(0, run.heat - 12);
      say(run, 'Sat under the grey tower until the pulse slowed.');
      return { text: 'You sit at the foot of the tower until the bells go. Nobody looks at you. It is the best thing about churches: nobody looks at you.' };
    }
    case 'jaska': {
      run.heat = Math.max(0, run.heat - 4);
      return { text: 'Jaska is on the bench with charcoal on his fingers. He shows you a drawing of the square: everyone on it faceless except one figure, drawn sharp, standing exactly where you stand. "Working title," he says, "Sinä saat."' };
    }
    case 'igor': {
      if (run.debt <= 0) return { text: 'The back booth is empty. Paid men do not get a booth; they get to leave.' };
      return { text: `Igor turns his glass a quarter turn. "${Math.ceil(run.debt)} tonight. Tomorrow, more. Numbers are honest, Aatami. It is their best feature." You can pay him from the ledger below.`, pay: true };
    }
  }
  return null;
}

// ── the end of the season ───────────────────────────────────────────────
export function endRun(run) {
  // stash fences at street value on the last night
  run.cash += stashValue(run);
  for (const g of GOODS) run.stash[g.id] = 0;
  const worth = run.cash - Math.round(run.debt);
  const ending = run.debt > run.cash
    ? ENDINGS.find(e => e.id === 'igor')
    : ENDINGS.filter(e => worth >= e.min).sort((a, b) => b.min - a.min)[0];
  run.over = { ...ending, worth };
}

export { stationById };
