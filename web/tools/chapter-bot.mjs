// The ten-day chapter, played by a bot on the web's own rules (ROADMAP G4).
//
//   node web/tools/chapter-bot.mjs            # every policy, one table
//   POLICY=trader TRACE=1 node web/tools/chapter-bot.mjs
//   SEEDS=200 node web/tools/chapter-bot.mjs   # the shipment's outcome over 200 seeds
//   NOTIME=1 node web/tools/chapter-bot.mjs    # the same chapter before D002 (v4.98)
//
// A measuring tool, like fight-balance.mjs, not a gate. It walks every block
// the way the app does (web/js/v3/app.js): journeys are real journeys, so D002
// (v4.98) charges their time and the road rolls its events; a free block takes
// a door; the scene is played where it stands; a choice is followed by the
// block turning, and a night by Kello's cut and the families' books. What it
// cannot do is fight: every policy prefers a choice that starts no fight, and
// a fight it cannot avoid (a bad deal turning, a road event) is settled on the
// door's or event's own stakes as a WIN (FIGHTS=lose to see the other side),
// with no loot. The careless fight rate is fight-balance.mjs's question.
//
// Policies (each plays every scene; only the choice differs):
//   forward  the first open quiet choice: buy, complete, hire, take the deal
//   decline  the last open quiet choice: walk away from everything
//   cash     whatever pays most in cash now
//   trader   forward's choices, and every spare trip and seller visit spent
//            buying at Piritori and selling at the best buyer it knows
//   lean     the trader, but it hires nobody and pays for nothing it can
//            refuse: the cheapest way to hold the €400 stake
//   saver    the trader that hires everyone it can but pays for nothing else
import { readFile } from 'node:fs/promises';

const root = new URL('../../', import.meta.url);
const json = async p => JSON.parse(await readFile(new URL(p, root), 'utf8'));
const S = await import('../js/v3/state.js?v=16');
const J = await import('../js/v3/journey.js?v=5');
const D = await import('../js/v3/doors.js?v=10');
const R = await import('../js/v3/road.js?v=12');
const { shortestPath } = await import('../js/v3/content.js?v=2');
const { settleCut } = await import('../js/v3/story.js?v=11');
const { settleStanding } = await import('../js/v3/standing.js?v=1');

const content = await json('content/era1-slice-v1.json');
const map = await json('map/kallio-era1-2003-v1.json');
const roadEvents = await json('content/road-events-v1.json');
const story = await json('content/act1-story-v1.json');
const doors = await json('content/doors-v1.json');
const families = await json('content/families-v1.json');
const data = {
  content, map, families,
  encounters: new Map(content.encounters.map(e => [e.id, e])),
  missions: new Map(content.missions.map(m => [m.id, m])),
  battles: new Map(content.battles.map(b => [b.id, b])),
  equipment: new Map(content.equipment.map(e => [e.id, e])),
  offers: new Map(content.market_offers.map(o => [o.id, o])),
  anchors: new Map(map.anchors.map(a => [a.id, a])),
  sites: new Map(map.sites.map(s => [s.id, s])),
  crew: new Map(content.crew.map(c => [c.id, c])),
};
const FIGHT_RESULT = process.env.FIGHTS === 'lose' ? 'lose' : 'win';
// NOTIME=1 plays the chapter as it was before D002: trips and visits free.
if (process.env.NOTIME) Object.assign(S.TIME, { trip: 0, visit: 0 });
const TRACE = Boolean(process.env.TRACE);
const fights = fx => (fx ?? []).some(f => /^(start-battle|start-negotiation|battle-on-failure):/.test(f));
// Which mission a mission battle reports to: battle.js's BATTLE_MISSION, which
// it does not export. A won one pays the mission's success_effects, a lost one
// its failure_effects, as resultEffects() does.
const MISSION_OF = { 'battle-karhupuisto-2v2': 'mission-bear-path', 'battle-courtyard-3v3': 'mission-courtyard-receipts', 'battle-kattilahalli-3v3': 'mission-courtyard-receipts' };
const missionStakes = battleId => { const m = data.missions.get(MISSION_OF[battleId]); return (FIGHT_RESULT === 'win' ? m?.success_effects : m?.failure_effects) ?? []; };
const cashOf = fx => (fx ?? []).filter(f => f.startsWith('cash:')).reduce((n, f) => n + Number(f.slice(5)), 0);

function play(policy, seed) {
  const s = S.createState(content);
  if (seed) s.seed = seed;
  const log = [], tally = { journeys: 0, roadEvents: 0, refusedTrades: 0, trades: 0, unavoidableFights: 0, scenes: 0, doors: 0, outOfTime: 0, routed: 0, goalDay: '', unplayable: [] };
  const say = line => { if (TRACE) log.push(`[${S.formatBlock(s, content)}] ${line}`); };

  // The road: resolve whatever is pending with the first open choice that
  // starts no fight, or settle the fight on its stakes.
  function answerRoad() {
    const event = R.pendingRoad(s, roadEvents);
    if (!event) return;
    tally.roadEvents += 1;
    const open = event.choices.filter(c => R.choiceOpen(c, s, data).ok);
    const quiet = open.find(c => !c.fight && !fights(c.effects)) ?? open[0];
    const result = R.resolveRoad(s, data, roadEvents, quiet.id);
    if (result.startBattle) {
      tally.unavoidableFights += 1;
      const stakes = event.fight?.[FIGHT_RESULT] ?? [];
      S.applyEffects(s, stakes, data, `road:${event.id}:${FIGHT_RESULT}`);
    }
    if (s.road) s.road.last = null;
    say(`road ${event.id}: ${quiet.id}`);
  }
  function walk(to) {
    if (s.selectedAnchor === to) return true;
    const result = J.commitJourney(s, data, J.previewJourney(s, data, to));
    if (!result.ok) return false;
    tally.journeys += 1;
    if (R.rollRoad(s, data, roadEvents, result)) answerRoad();
    return true;
  }
  // The trader's spare time: sell what it carries at the best buyer it
  // knows, else buy at Piritori, one step at a time, while time is left.
  // Packs go down a route to the best buyer first, since a route costs Aatami
  // no time (D002) but holds only what ordinary traffic leaves free that block.
  // On the last day it only sells, so whatever it holds is cash on the night. A block where it still had a step to take when the time
  // ran out counts in outOfTime: that is the rule biting.
  function trade() {
    const buy = data.offers.get('offer-piritori-buy');
    const buyers = content.market_offers.filter(o => o.side === 'sell' && s.revealedOffers.includes(o.id))
      .sort((a, b) => S.offerPrice(b) - S.offerPrice(a));
    for (let step = 0; step < 6; step += 1) {
      const stock = s.stock.piri ?? 0;
      const here = buyers.find(o => o.anchor_id === s.selectedAnchor);
      const wants = stock > 0 ? buyers.length > 0 : buyers.length > 0 && S.currentSchedule(s, content).day < content.campaign.days && s.cash >= S.offerPrice(buy);
      if (!wants) return;
      if (S.actionsLeft(s) === 0 && !(stock > 0 && here && !S.tradeBlocker(s, here.anchor_id))) { tally.outOfTime += 1; return; }
      if (stock > 0 && here) { while (S.transactOffer(s, here).ok) tally.trades += 1; if (s.stock.piri) { tally.refusedTrades += 1; return; } continue; }
      if (stock > 0 && !s.route?.path || stock > 0 && s.route.path.at(-1) !== buyers[0].anchor_id || stock > 0 && s.route.path[0] !== s.selectedAnchor) S.commitRoute(s, shortestPath(map, s.selectedAnchor, buyers[0].anchor_id));
      let sent = 0;
      while ((s.stock.piri ?? 0) > 0 && S.sendOnRoute(s, data).ok) { sent += 1; tally.routed += 1; }
      if (sent) continue;
      if (stock > 0) { walk(buyers[0].anchor_id); continue; }
      if (s.selectedAnchor !== 'piritori') { walk('piritori'); continue; }
      let bought = 0;
      for (;;) { const r = S.transactOffer(s, buy); if (!r.ok) { if (/No time/.test(r.message)) tally.refusedTrades += 1; break; } bought += 1; tally.trades += 1; }
      if (!bought) return;
    }
  }
  function choose(encounter) {
    const open = encounter.choices.filter(c => S.choiceStatus(c, s, data).ok);
    const quiet = open.filter(c => !fights(c.effects));
    const pool = quiet.length ? quiet : open;
    if (!pool.length) return null;
    if (encounter.id === 'enc-shipment-night') return open.find(c => c.id === 'run-shipment' && S.chapterEndingAvailable(s, data) && s.cash >= 400) ?? open.find(c => c.id === 'sell-the-slot') ?? pool.at(-1);
    if (policy === 'cash') return [...pool].sort((a, b) => cashOf(b.effects) - cashOf(a.effects))[0];
    if (policy === 'decline') return pool.at(-1);
    if (policy === 'lean') return pool.find(c => cashOf(c.effects) >= 0 && !c.effects.some(f => f.startsWith('recruit'))) ?? pool[0];
    if (policy === 'saver') return pool.find(c => cashOf(c.effects) >= 0) ?? pool[0];
    return pool[0];
  }
  // The app's advanceAndSettle: the block turns, and a night settles.
  function turn() {
    const ended = S.currentSchedule(s, content);
    if (!tally.goalDay && S.chapterGoalMet(s)) tally.goalDay = `day ${ended.day} ${ended.block}`;
    if (ended?.block === 'night') say(`night ends: cash €${Math.round(s.cash)}, earned €${S.chapterProgress(s)}, stock ${s.stock.piri ?? 0}, crew ${s.recruited.length}`);
    S.advanceSchedule(s, data);
    if (ended?.block !== 'night') return;
    const cut = settleCut(s, story);
    if (cut.foundOut) R.forceRoad(s, roadEvents, story.case.cut.found_out_event, s.selectedAnchor);
    const settled = settleStanding(s, families);
    if (settled.raise) R.forceRoad(s, roadEvents, settled.raise, s.selectedAnchor);
    answerRoad();
  }

  for (let guard = 0; guard < 40 && S.currentSchedule(s, content) && !s.chapterCleared; guard += 1) {
    const slot = S.currentSchedule(s, content);
    if (['trader', 'lean', 'saver'].includes(policy)) trade();
    if (D.isDoorBlock(s, content) && !s.doors.taken[s.scheduleIndex]) {
      const offers = D.offerDoors(s, data, doors);
      const pick = offers.find(o => !D.templateOf?.(doors, o.template)?.fight) ?? offers[0];
      if (!pick) { tally.unplayable.push(s.scheduleIndex); S.advanceSchedule(s, data); continue; }
      const taken = D.takeDoor(s, data, doors, pick.template, roadEvents);
      if (!taken.ok) { tally.unplayable.push(s.scheduleIndex); S.advanceSchedule(s, data); continue; }
      tally.doors += 1;
    }
    const lead = S.currentSchedule(s, content).anchor_id;
    if (!walk(lead)) { tally.unplayable.push(s.scheduleIndex); }
    const encounter = S.currentEncounter(s, data);
    const choice = encounter && choose(encounter);
    if (!choice) { tally.unplayable.push(s.scheduleIndex); turn(); continue; }
    const result = S.chooseEncounter(s, encounter, choice, data);
    if (!result.ok) { tally.unplayable.push(s.scheduleIndex); turn(); continue; }
    tally.scenes += 1;
    say(`${encounter.id}: ${choice.id}${slot.door ? ' (door)' : ''}`);
    if (result.startBattle) {
      tally.unavoidableFights += 1;
      const stakes = encounter.door ? D.doorFightEffects(doors, encounter.door, FIGHT_RESULT) : missionStakes(result.startBattle);
      S.applyEffects(s, stakes, data, `fight:${encounter.id}:${FIGHT_RESULT}`);
    } else if (encounter.door) {
      const bad = D.escalation(s, data, doors, encounter.door, choice.id);
      if (bad?.battle) { tally.unavoidableFights += 1; S.applyEffects(s, D.doorFightEffects(doors, encounter.door, FIGHT_RESULT), data, `door:${encounter.door}:${FIGHT_RESULT}`); }
      else if (bad?.effects) S.applyEffects(s, bad.effects, data, `door:${encounter.door}:alone`);
    }
    if (s.chapterCleared) break;
    turn();
  }
  return {
    policy, earned: S.chapterProgress(s), goal: s.chapterThreshold, goalMet: S.chapterGoalMet(s),
    cash: s.cash, debt: s.debt, outcome: s.lastEndingOutcome ?? 'not reached', blocks: s.scheduleIndex,
    forecast: S.forecastEnding(s, data)?.id ?? '', ...tally, log,
  };
}

const policies = process.env.POLICY ? [process.env.POLICY] : ['forward', 'decline', 'cash', 'trader', 'lean', 'saver'];
const SEEDS = Number(process.env.SEEDS) || 0;
if (SEEDS) {
  // Only the operation itself reads the campaign seed; the road and the deals
  // roll on the block, so every seed walks the same ten days to the same night.
  for (const policy of policies) {
    const count = {};
    for (let seed = 1; seed <= SEEDS; seed += 1) { const o = play(policy, seed).outcome; count[o] = (count[o] ?? 0) + 1; }
    console.log(`${policy.padEnd(7)} ${Object.entries(count).map(([o, n]) => `${o} ${Math.round(100 * n / SEEDS)}%`).join(' · ')}`);
  }
  process.exit(0);
}
for (const policy of policies) {
  const r = play(policy);
  console.log(`${policy.padEnd(7)} earned €${r.earned}/${r.goal}${r.goalMet ? ` ✓ (${r.goalDay})` : ''} · cash €${Math.round(r.cash)} · debt €${Math.round(r.debt)} · shipment: ${r.outcome}`
    + ` · ${r.scenes} scenes, ${r.doors} doors, ${r.journeys} journeys, ${r.roadEvents} road events, ${r.trades} trades and ${r.routed} sent down a route (${r.outOfTime} blocks out of time), ${r.unavoidableFights} fights settled as ${FIGHT_RESULT}`
    + (r.unplayable.length ? ` · UNPLAYABLE blocks ${r.unplayable.join(',')}` : ''));
  if (TRACE) for (const line of r.log) console.log('   ', line);
}
