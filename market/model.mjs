/**
 * The market model — one pure function from (place, good, clock, history) to an
 * offer, plus the reason for it.
 *
 * This implements GDD §7.2–§7.3 and DESIGN_LOCKS §5 and §9.1. It invents no
 * policy: the goods are abstract tiers, the numbers are BALANCE VALUES tuned for
 * a play curve and are not researched prices of anything. Nothing here models
 * dose, preparation, concealment, consumption or transport method, and nothing
 * should be added that does.
 *
 * THE ONE STRUCTURAL DECISION, and everything else follows from it:
 *
 *   A price is a PRODUCT OF NAMED FACTORS, never a number with a note attached.
 *
 * §7.2 requires the UI to explain the dominant cause of a change — "dry week",
 * "station closure", "old quote". If the price were computed one way and
 * explained another, the two would drift the first time somebody tuned a
 * constant, and the explanation would start lying. Because the price is
 * `base × Π factor`, the explanation is just the factor furthest from 1.0, and
 * it cannot disagree with the number. The rule that falls out of that is worth
 * stating plainly: **if a cause cannot be named, it cannot be in the price.**
 *
 * Determinism is the second decision. Every roll comes from a hash of
 * (seed, node, good, day) rather than a live RNG, so the same save on the same
 * day quotes the same price, a test can assert a value, and a player who walks
 * away and comes back is not re-rolling the city. No server, no state to sync.
 */

// ── seeded noise ────────────────────────────────────────────────────────────
// xmur3 + mulberry32. A string in, a repeatable float out.
function hash(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}
export function rand01(...parts) {
  let t = hash(parts.join('|'))();
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

// ── goods ───────────────────────────────────────────────────────────────────
// The slice trades PIRI ONLY (DESIGN_LOCKS §9.1). The rest exist so the model
// is shaped for the full Era I roster rather than retrofitted later, and are
// marked inactive. `base` is euros per abstract pack — a game unit, not a
// quantity of anything.
// OWNER RULING 2026-08-24: the scale is HALVED from the first cut. A pack of
// piri is €60, so a good route clears €20–35 and a bad week clears nothing.
// The point of the smaller scale is that the opening debt and the exit fund
// loom larger against earnings without any mechanic changing — campaign
// pressure comes from the ratio, not from the size of the numbers.
export const GOODS = {
  piri: { label: 'piri', tier: 3, base: 60, volatility: 0.16, bulk: 1, active: true },
  pilvi: { label: 'pilvi', tier: 1, base: 22, volatility: 0.09, bulk: 2.2, active: false },
  hasis: { label: 'hasis', tier: 1, base: 28, volatility: 0.10, bulk: 1.8, active: false },
  subu: { label: 'subu', tier: 2, base: 45, volatility: 0.14, bulk: 0.7, active: false },
  koka: { label: 'koka', tier: 4, base: 130, volatility: 0.22, bulk: 0.8, active: false },
  hepo: { label: 'hepo', tier: 5, base: 150, volatility: 0.26, bulk: 0.8, active: false },
};

// ── a node's structural profile, DERIVED FROM ITS ROLES ─────────────────────
// The board already says what each anchor is for: `market`, `nightlife`,
// `residential`, `docks`, `crowd-source`. Deriving the profile from those
// instead of hand-authoring thirteen rows keeps pillar §2.2 honest — the
// economy is attached to places rather than sitting in a spreadsheet beside
// them — and it means a new anchor gets a market the moment it gets a role.
const ROLE = {
  //                 demand  supply  liquidity  volatility  spread  watch
  market: [0.10, 0.30, 0.30, 0.05, -0.05, 0.20],
  'crowd-source': [0.22, 0.00, 0.25, 0.08, -0.02, 0.15],
  nightlife: [0.30, 0.05, 0.20, 0.18, -0.03, 0.10],
  transfer: [0.08, 0.15, 0.15, 0.04, -0.04, 0.25],
  residential: [0.12, -0.05, -0.15, -0.08, 0.08, -0.15],
  home: [0.05, -0.05, -0.10, -0.06, 0.06, -0.20],
  family: [0.00, -0.05, -0.10, -0.05, 0.05, -0.20],
  docks: [-0.10, 0.35, 0.10, 0.10, 0.02, -0.05],
  industrial: [-0.12, 0.28, 0.05, 0.08, 0.03, -0.10],
  faction: [0.05, 0.30, 0.15, 0.15, -0.06, 0.05],
  park: [0.15, 0.00, 0.05, 0.06, 0.02, 0.00],
  social: [0.14, 0.00, 0.08, 0.05, 0.00, 0.02],
  shops: [0.06, 0.05, 0.05, 0.00, 0.02, 0.10],
  service: [0.04, 0.05, 0.05, 0.00, 0.01, 0.05],
  information: [0.00, 0.05, 0.00, -0.02, -0.10, 0.05],
  nightclub: [0.28, 0.05, 0.18, 0.16, -0.02, 0.10],
  landmark: [-0.05, -0.05, -0.10, 0.00, 0.06, 0.10],
  orientation: [0.00, 0.00, -0.05, 0.00, 0.03, 0.05],
  threshold: [0.05, 0.05, 0.05, 0.02, 0.00, 0.10],
  sport: [0.08, 0.00, 0.05, 0.04, 0.02, 0.02],
  recruitment: [0.02, 0.05, 0.05, 0.02, 0.00, 0.05],
  mission: [0.00, 0.00, 0.00, 0.02, 0.00, 0.05],
  weather: [0.00, 0.00, 0.00, 0.03, 0.00, 0.00],
  opening: [0.05, 0.05, 0.05, 0.02, 0.00, 0.05],
  expansion: [0.00, 0.05, 0.05, 0.05, 0.04, -0.05],
  'rail-edge': [-0.05, 0.15, 0.00, 0.06, 0.05, -0.05],
};

export function nodeProfile(anchor) {
  const p = { demand: 0, supply: 0, liquidity: 0, volatility: 0, spread: 0, watch: 0 };
  for (const r of anchor.roles || []) {
    const v = ROLE[r];
    if (!v) continue;
    p.demand += v[0]; p.supply += v[1]; p.liquidity += v[2];
    p.volatility += v[3]; p.spread += v[4]; p.watch += v[5];
  }
  // Baselines, then clamps. A node with five roles must not end up with three
  // times the demand of a node with two — roles say WHAT a place is, not how
  // much of it there is.
  return {
    demand: clamp(1 + p.demand, 0.72, 1.42),
    supply: clamp(1 + p.supply, 0.72, 1.55),
    // FLOOR RAISED FROM 1 TO 2 (owner ruling: ten units is three in-game hours,
    // not three days). A node that can only take a single unit forces a
    // consignment to crawl across the whole board over days. Every anchor now
    // absorbs about three units before the price turns hard, which is what makes
    // a ten-unit load a three-or-four-stop afternoon.
    liquidity: clamp(2 + p.liquidity * 6, 2, 10),         // packs before saturation bites
    volatility: clamp(1 + p.volatility, 0.7, 1.6),
    spread: clamp(0.16 + p.spread, 0.06, 0.34),           // buy/sell gap, fraction of mid
    watch: clamp(1 + p.watch, 0.5, 1.6),
  };
}
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// ── the factors ─────────────────────────────────────────────────────────────
// Each returns [multiplier, causeId, human]. A factor of 1 is "nothing to say".

/** Structural: what this place is, permanently. Demand raises the price a buyer
 *  pays and the price a seller gets; supply lowers both. */
function fSite(prof) {
  const m = prof.demand / prof.supply;
  return [m, 'site', m > 1.08 ? 'thin supply here' : m < 0.93 ? 'well supplied here' : 'ordinary for the area'];
}

/** The week has a shape. Nightlife nodes spike Friday and Saturday; residential
 *  ones barely move. day 0 = Monday. */
function fDay(prof, day) {
  const weekend = (day % 7) >= 4 && (day % 7) <= 5;
  const swing = (prof.volatility - 1) * 0.5 + 0.06;
  const m = weekend ? 1 + swing : 1 - swing * 0.35;
  return [m, weekend ? 'weekend' : 'midweek', weekend ? 'weekend crowd' : 'quiet midweek'];
}

/** The canon blocks, and there are three of them.
 *
 *  `DESIGN_LOCKS.md` §1: the seven-day SLICE runs two — Day and Night — and the
 *  full Era I target runs three, adding Evening. There is no MORNING anywhere in
 *  canon, and this model had one: `fBlock` gave it its own multiplier and the
 *  gate swept four blocks, which meant a quarter of every price surface tested
 *  here described a time of day the game does not have.
 *
 *  Nothing was wrong with the numbers. The clock was wrong, and a clock is what
 *  a mission's deadline is denominated in — see `MISSIONS.md` §2. Recorded
 *  rather than quietly averaged, per DESIGN_AUTHORITY's rule for two sources
 *  disagreeing.
 *
 *  Slice content passes only 'day' and 'night'; 'evening' is here so the model
 *  is ready for §1.2 without a second edit. Anything else falls to day. */
export const BLOCKS = ['day', 'evening', 'night'];
export const SLICE_BLOCKS = ['day', 'night'];

/** Blocks are the campaign clock (§3.4). Closed places do not quote at all —
 *  that is handled by the caller; this is only the pressure of the hour. */
function fBlock(prof, block) {
  const swing = (prof.volatility - 1) * 0.35;
  if (block === 'night') return [1 + swing + 0.05, 'hour', 'late hour'];
  // Evening is the block where both halves of the day's argument are live —
  // the shops are shut and the street is awake — so it leans the same way as
  // night at about half the strength rather than being an ordinary hour.
  if (block === 'evening') return [1 + swing * 0.5 + 0.02, 'hour', 'evening trade'];
  return [1, 'hour', 'ordinary hour'];
}

/** Seeded daily jitter. Small, and the only unnamed movement in the model —
 *  which is why it is capped below every other factor's reach: noise must never
 *  be the dominant cause, or the UI would have to say "no reason". */
function fNoise(prof, good, nodeId, day, seed) {
  const g = GOODS[good];
  const r = rand01(seed, nodeId, good, day);
  const amp = g.volatility * prof.volatility * 0.5;
  const m = 1 + (r * 2 - 1) * amp;
  return [m, 'drift', 'ordinary week-to-week drift'];
}

/** Events. Supplied by the campaign, not invented here — a shock is a thing
 *  that happened in the fiction and has a name the player can be told. */
function fShock(shocks, nodeId, good, day) {
  let m = 1, id = null, text = null;
  for (const s of shocks || []) {
    if (s.good && s.good !== good) continue;
    if (s.node && s.node !== nodeId) continue;
    if (day < s.from || day > s.to) continue;
    m *= s.factor;
    if (!id || Math.abs(Math.log(s.factor)) > Math.abs(Math.log(m / s.factor))) { id = s.id; text = s.text; }
  }
  return [m, id || 'shock', text || 'nothing unusual'];
}

/** The player's own footprint. Dope Wars let you farm one pair of towns forever;
 *  §7.2 asks for "recent player saturation" and this is it.
 *
 *  IT IS APPLIED ASYMMETRICALLY, and the symmetric version was a real exploit
 *  rather than a rough edge. Moved onto the mid price, dumping stock into a
 *  place lowered BOTH sides of its book — so the node you had just flooded
 *  became the cheapest place in the city to buy from, and a simulated week
 *  turned into a pump-and-dump ping-pong between Torkkelinmäki and Siltasaari
 *  at over 100% margin. Saturating a market must make it stop PAYING, never
 *  start SUPPLYING.
 *
 *  So the factor only ever moves the side that hurts: sell into a place and it
 *  pays you less; buy a place out and it charges you more. `offer` applies it
 *  after the spread rather than inside the product. */
function fSaturation(prof, sat) {
  const net = (sat?.units || 0);
  if (!net) return [1, 'saturation', 'you have not worked this place recently'];
  // CLAMPED, and it has to be. Inside the product it was bounded by the
  // product's clamp; moved outside so it could hit one side only, it was not —
  // twenty packs against a liquidity-1 residential block is exp(9.1), and the
  // gate caught a quote of €1,090,289. Saturation can take a side by 45% and
  // no further; past that the place simply stops dealing with you, which is a
  // relationship event and belongs in the encounter layer, not the price.
  // The upper bound is 1.6 rather than 1.8 because the corner cases multiply:
  // dearest market mid (1.75) x widest spread (+17%) x saturation is what the
  // player actually pays, and at 1.8 that reached 3.7x base. At 1.6 the worst
  // quote in the game is 3.3x, which is a place gouging someone who has bought
  // it out in a dry week — extortionate, explainable, and bounded.
  // THE SCALE CONSTANT IS 4.5, NOT 2.2, and the difference is the whole feel of
  // volume play. `liquidity` is documented as "packs you can move before the
  // price turns against you", so moving exactly `liquidity` packs should cost
  // about 20% — that is exp(-1/k) = 0.8, so k = 4.5. At 2.2 the curve was twice
  // as steep as the number it was named after: Torkkelinmäki, at liquidity 1.0,
  // lost 36% of its price to a SINGLE pack, which is a cliff rather than a
  // market. It also flattened §7.8's capacity bands into each other — a street
  // buyer and a network builder both earned €22 a day, because nowhere on the
  // board could absorb a second pack.
  const m = clamp(Math.exp(-net / (prof.liquidity * 4.5)), 0.55, 1.6);
  return [m, 'saturation', net > 0 ? 'you have been selling here' : 'you have been buying here out'];
}

// ── the offer ───────────────────────────────────────────────────────────────
/**
 * @param {object} a   anchor record from the board JSON (id, roles)
 * @param {string} good  key into GOODS
 * @param {object} clock {day:int, block:'morning'|'day'|'evening'|'night'}
 * @param {object} ctx   {seed, shocks:[], saturation:{units}, }
 * @returns {{mid,buy,sell,spread,cause,causeText,factors}}
 */
export function offer(a, good, clock, ctx = {}) {
  const g = GOODS[good];
  if (!g) throw new Error(`unknown good: ${good}`);
  const prof = nodeProfile(a);
  const seed = ctx.seed ?? 'piritori';

  const sat = fSaturation(prof, ctx.saturation);
  const F = [
    fSite(prof),
    fDay(prof, clock.day),
    fBlock(prof, clock.block),
    fShock(ctx.shocks, a.id, good, clock.day),
    sat,
    fNoise(prof, good, a.id, clock.day, seed),
  ];

  // The MID is the market's own price and does not include the player's
  // footprint — see fSaturation. Everything else multiplies in.
  let m = 1;
  for (const [f, id] of F) if (id !== 'saturation') m *= f;
  // A clamp on the PRODUCT, not on each factor: three ordinary factors leaning
  // the same way is a real story and should move the price. But the first cut
  // allowed 0.45–2.25, which is a FIVEFOLD spread across one small board and
  // produced routes paying more than the goods cost. 0.6–1.75 still lets the
  // harbour and the hill be three times apart.
  m = clamp(m, 0.6, 1.75);
  const mid0 = g.base * m;

  // The dominant cause is the factor furthest from 1 — in LOG space, so that
  // halving and doubling count the same. Noise is excluded from winning: it has
  // no story, and "no reason" is not an explanation the UI is allowed to give.
  let best = null;
  for (const [f, id, text] of F) {
    if (id === 'drift') continue;
    const w = Math.abs(Math.log(f));
    if (!best || w > best.w) best = { w, id, text, f };
  }
  const quiet = !best || best.w < 0.04;

  // RAPPORT NARROWS THE SPREAD. Owner ruling: drinking with people, smoking
  // with them, showing up — these buy cheaper prices and better terms. That
  // lands here rather than on the mid, because a relationship does not change
  // what a thing is worth in Kallio; it changes how much of the gap the other
  // party keeps. At full rapport the spread halves, which on a wide residential
  // book is worth more than any day-of-week swing — being known somewhere is
  // the strongest thing you can do to a price without moving stock.
  const rapport = clamp(ctx.rapport || 0, 0, 1);
  prof.spread *= 1 - rapport * 0.5;

  // Saturation lands on one side only, whichever one costs the player.
  const net = ctx.saturation?.units || 0;
  let buy = mid0 * (1 + prof.spread / 2);
  let sell = mid0 * (1 - prof.spread / 2);
  if (net > 0) sell *= sat[0];          // you have been selling here: it pays less
  else if (net < 0) buy *= sat[0];      // you have been buying it out: it charges more

  return {
    // TWO MIDS, and they are different numbers on purpose. `marketMid` is the
    // place's own price, which the clamp governs. `mid` is the midpoint of the
    // book YOU are being shown, and once your own footprint is priced into one
    // side it can legitimately sit outside the market's clamp. Conflating them
    // is what made the bounds test fail with a price that was not wrong.
    marketMid: round2(mid0),
    mid: round2((buy + sell) / 2),
    buy: round2(buy),
    sell: round2(sell),
    spread: +prof.spread.toFixed(3),
    cause: quiet ? 'ordinary' : best.id,
    causeText: quiet ? 'nothing much moving it' : best.text,
    factors: Object.fromEntries(F.map(([f, id]) => [id, +f.toFixed(4)])),
    profile: prof,
  };
}
const round2 = v => Math.round(v * 100) / 100;

// ── information ─────────────────────────────────────────────────────────────
// §7.3: rumour / range / quote, and a previous quote stays visible WITH ITS AGE.
// The mechanic worth having is that these are not three separate sources but
// ONE THING DECAYING: a quote you took four blocks ago is a range, and a range
// left another day is a rumour. Information is perishable stock.
export const INFO = { QUOTE: 'quote', RANGE: 'range', RUMOUR: 'rumour', NONE: 'none' };

/** How good is what you know, given when you learned it?
 *  `blocks` is campaign blocks elapsed since the observation.
 *
 *  AGE SETS A CEILING; it does not push you down a ladder. The first version
 *  stepped DOWN from whatever level you started at, which meant a rumour heard
 *  two blocks ago had already decayed to nothing — Suvilahti went blank on the
 *  plate while a nine-block-old quote at the harbour was still readable, which
 *  is exactly backwards. A vague thing does not get vaguer as fast as a precise
 *  thing; it is already vague, and it stays roughly true for a while.
 *
 *  So: precision(age) is the best any observation can be at that age, and what
 *  you have is the WORSE of that and what you were originally told. */
export function decay(level, blocks, opts = {}) {
  const order = [INFO.QUOTE, INFO.RANGE, INFO.RUMOUR, INFO.NONE];
  // OWNER RULING: a place you have WORKED keeps ringing you. Once you have been
  // somewhere, someone there will still call with a direction — so a visited
  // anchor never falls below RUMOUR however old the last real number is, and an
  // anchor you have never worked stays blank however long you stare at the map.
  // That is the floor on ignorance: the board you have walked keeps talking, the
  // board you have not stays dark, and exploration is what moves the line.
  const floor = opts.visited ? 2 : 3;
  if (level === INFO.NONE) return order[Math.min(3, floor)];
  const ceiling = blocks <= 1 ? 0 : blocks <= 4 ? 1 : blocks <= 12 ? 2 : 3;
  return order[Math.min(floor, Math.max(order.indexOf(level), ceiling))];
}

/** What the player is shown, given what they know. The TRUE offer is never
 *  handed to the UI at a lower level — a range is generated around the truth,
 *  so a range never excludes the real price and the player can trust the band
 *  even when they cannot trust the middle. */
export function present(trueOffer, level, blocks = 0, seed = 'piritori', nodeId = '', good = '', opts = {}) {
  const lv = decay(level, blocks, opts);
  if (lv === INFO.NONE) return { level: lv };
  if (lv === INFO.QUOTE) return { level: lv, buy: trueOffer.buy, sell: trueOffer.sell, ageBlocks: blocks, cause: trueOffer.cause, causeText: trueOffer.causeText };
  if (lv === INFO.RANGE) {
    // Band width grows with age. Off-centre by a seeded amount so the middle of
    // the band is not a free exact answer.
    const w = 0.08 + Math.min(0.22, blocks * 0.02);
    const off = (rand01(seed, nodeId, good, 'band', blocks) * 2 - 1) * w * 0.4;
    return {
      level: lv, ageBlocks: blocks,
      lowBuy: round2(trueOffer.buy * (1 - w + off)),
      highBuy: round2(trueOffer.buy * (1 + w + off)),
      lowSell: round2(trueOffer.sell * (1 - w + off)),
      highSell: round2(trueOffer.sell * (1 + w + off)),
      cause: trueOffer.cause, causeText: trueOffer.causeText,
    };
  }
  const g = GOODS[good] || GOODS.piri;
  const rel = trueOffer.mid / g.base;
  return {
    level: lv, ageBlocks: blocks,
    direction: rel > 1.12 ? 'dear' : rel < 0.9 ? 'cheap' : 'ordinary',
    causeText: trueOffer.causeText,
  };
}

// ── exposure ────────────────────────────────────────────────────────────────
/**
 * How much attention are you drawing, right now, and WHY?
 *
 * OWNER DIRECTION 2026-08-24, and the whole subsystem comes out of it:
 *
 *   "there may be situations you need to drink with others, smoke weed, or
 *    other drug use. This will give police a good reason to talk to you at
 *    certain spots, travel and central spots are always a risk at day time
 *    drunk, night time almost a requirement. You can lose your bag drunk. If
 *    you travel with a big crew and weapons it can arouse suspicion etc"
 *
 * THE SAME STRUCTURAL RULE AS PRICE: exposure is a product of NAMED factors and
 * the dominant one is the reason the player is told. A risk system that cannot
 * say why is indistinguishable from the game cheating, and the point of §7c is
 * that a player can repeat the reason afterwards — *somebody saw me and there
 * was a car on Hämeentie* — rather than shrugging.
 *
 * THE SHARP BIT, which is §2.1's pillar rather than a balance number: **the same
 * state is camouflage or a flare depending on where and when.** Drunk at
 * midnight in Kallio is what everyone around you is; drunk at eleven in the
 * morning on a transfer platform is the one thing in the frame that is wrong.
 * So condition is never read on its own — only against the hour and the place.
 *
 * DESIGN_LOCKS §9.1 keeps this abstract: a condition is a STATE with named
 * effects on attention and on what you can keep hold of. The model has no dose,
 * no substance quantity, no effect curve and nowhere to put one. It knows that
 * you are drunk the way a doorman knows.
 */
export const CONDITION = {
  clear: { label: 'clear', slip: 0 },
  drinking: { label: 'drinking', slip: 0.02 },
  drunk: { label: 'drunk', slip: 0.12 },
  stoned: { label: 'stoned', slip: 0.06 },
};

const NIGHT = b => b === 'night' || b === 'evening';

/** @returns {{score, band, cause, causeText, factors, slipChance}} */
export function exposure(a, ctx = {}) {
  const prof = nodeProfile(a);
  const block = ctx.block || 'day';
  const cond = CONDITION[ctx.condition || 'clear'] || CONDITION.clear;
  const F = [];

  // The place's own appetite for police. Already computed from its roles —
  // transfer and market nodes score high because that is where people are.
  F.push([prof.watch, 'place',
    prof.watch > 1.15 ? `${a.label.toLowerCase()} draws police`
      : prof.watch < 0.85 ? 'quiet corner' : 'ordinary street']);

  // Condition, READ AGAINST THE HOUR AND THE PLACE. This is the one factor that
  // can go either way, and it is the reason the subsystem is interesting.
  if (cond !== CONDITION.clear) {
    const busy = prof.watch > 1.05;
    let m, text;
    if (NIGHT(block)) {
      m = busy ? 0.95 : 1.0;
      text = `${cond.label} at night — so is everyone`;
    } else {
      m = busy ? 1.75 : 1.25;
      text = busy ? `${cond.label} in daylight, somewhere with eyes`
        : `${cond.label} in daylight`;
    }
    F.push([m, 'condition', text]);
  }

  // A crew is a shape people notice. Two is a pair; five is a firm.
  const crew = Math.max(1, ctx.crew || 1);
  if (crew > 2) F.push([1 + (crew - 2) * 0.22, 'crew', `${crew} of you moving together`]);

  // Weapons are the loudest thing you can be carrying that is not the goods.
  if (ctx.armed) F.push([1.5, 'armed', 'somebody is carrying']);

  // What you are holding. Modest — the goods are not the tell, the behaviour is.
  const units = ctx.units || 0;
  if (units > 0) F.push([1 + Math.min(0.35, units * 0.02), 'load', `holding ${units}`]);

  // A TELL is per good and per context, and it is answered by KIT rather than by
  // knowing anything. §7c: the game may name the tell and name the remedy, and
  // must never describe the method.
  if (ctx.tell && !ctx.kit) F.push([1.4, 'tell', ctx.tell]);

  let score = 1;
  for (const [m] of F) score *= m;
  score = clamp(score, 0.35, 4);

  let best = null;
  for (const [m, id, text] of F) {
    const w = Math.abs(Math.log(m));
    if (!best || w > best.w) best = { w, id, text };
  }
  const quiet = !best || best.w < 0.05;

  return {
    score: +score.toFixed(3),
    band: score < 0.8 ? 'unremarkable' : score < 1.3 ? 'noticed' : score < 2.2 ? 'watched' : 'a good reason to talk to you',
    cause: quiet ? 'ordinary' : best.id,
    causeText: quiet ? 'nothing about you stands out' : best.text,
    factors: Object.fromEntries(F.map(([m, id]) => [id, +m.toFixed(3)])),
    // Losing the bag is NOT exposure — it is its own named accident, and it is
    // the one consequence of being drunk that has nothing to do with police.
    slipChance: cond.slip,
  };
}
