import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  createState, currentSchedule, currentEncounter, choiceStatus, chooseEncounter,
  advanceSchedule, transactOffer, requirementStatus,
  canShopHere, buyOf, buyEquipment, isPurchasable, countOf,
} from '../js/v3/state.js?v=7';
import { previewJourney, commitJourney, JOURNEY_EXTRA_BLOCKS } from '../js/v3/journey.js?v=1';

const content = JSON.parse(await readFile(new URL('../../content/era1-slice-v1.json', import.meta.url)));
const map = JSON.parse(await readFile(new URL('../../map/kallio-era1-2003-v1.json', import.meta.url)));
const data = {
  content,
  encounters: new Map(content.encounters.map(item => [item.id, item])),
  missions: new Map(content.missions.map(item => [item.id, item])),
  battles: new Map(content.battles.map(item => [item.id, item])),
  crew: new Map(content.crew.map(item => [item.id, item])),
  offers: new Map(content.market_offers.map(item => [item.id, item])),
  equipment: new Map(content.equipment.map(item => [item.id, item])),
  anchors: new Map(map.anchors.map(item => [item.id, item])),
  map,
};

const state = createState(content);
assert.equal(currentSchedule(state, content).encounter_id, 'enc-first-purchase');
assert.equal(state.cash, 160);
assert.equal(state.markka, 300);
assert.deepEqual(state.revealedOffers, ['offer-piritori-buy']);

const opening = currentEncounter(state, data);
const walk = opening.choices.find(choice => choice.id === 'walk');
assert.equal(choiceStatus(walk, state, data).ok, true);
assert.equal(chooseEncounter(state, opening, walk, data).ok, true);
assert.equal(state.cash, 160, 'walking away preserves cash');
assert(state.flags.includes('first-purchase-deferred'));

const firstOffer = data.offers.get('offer-piritori-buy');
assert.equal(transactOffer(state, firstOffer).ok, true, 'deferred purchase remains possible in ledger');
assert.equal(state.stock.piri, 1);
assert.equal(state.cash, 115);

advanceSchedule(state, data);
assert.equal(currentSchedule(state, content).encounter_id, 'enc-first-sale',
  'the first highlighted destination after Piritori is the profit tutorial');
assert.equal(state.selectedAnchor, 'piritori', 'M2: the story moves the lead, not Aatami');
assert.equal(currentSchedule(state, content).anchor_id, 'siltasaari');

// M2 journey contract (design/CLAUDE_MAP_MISSION_NEXT_STEPS.md §2).
{
  const j = JSON.parse(JSON.stringify(state));
  const snapshot = JSON.stringify(j);
  const plan = previewJourney(j, data, 'siltasaari');
  assert.equal(plan.ok, true);
  assert.equal(plan.path[0], 'piritori');
  assert.equal(plan.path.at(-1), 'siltasaari');
  assert.equal(plan.extraBlocks, 0);
  assert.equal(JOURNEY_EXTRA_BLOCKS, 0, 'D002 unresolved: no invented travel time');
  assert.equal(JSON.stringify(j), snapshot, 'a preview changes nothing');
  for (const [dest, reason] of [['piritori', 'already-here'], ['nowhere', 'unknown']]) {
    assert.equal(previewJourney(j, data, dest).reason, reason);
  }
  const sealed = map.anchors.find(a => ['locked', 'teaser'].includes(a.sliceState));
  const landmark = map.anchors.find(a => a.sliceState === 'landmark');
  for (const a of [sealed, landmark]) if (a) assert.equal(previewJourney(j, data, a.id).reason, 'sealed', a.id);
  assert.equal(JSON.stringify(j), snapshot, 'refused previews change nothing');
  assert.equal(commitJourney(j, data, null).reason, 'no-preview');
  // Stale: the story turned a block under the plan.
  const turned = JSON.parse(snapshot);
  turned.scheduleIndex += 1;
  assert.equal(commitJourney(turned, data, plan).reason, 'stale');
  assert.equal(turned.selectedAnchor, 'piritori');
  // Commit once; the same plan again (a double tap) is stale and moves nothing.
  const seenBefore = j.seen?.siltasaari;
  const cash = j.cash, stock = JSON.stringify(j.stock), index = j.scheduleIndex, logs = j.logs.length;
  assert.equal(commitJourney(j, data, plan).ok, true);
  assert.equal(j.selectedAnchor, 'siltasaari');
  assert.notEqual(j.seen?.siltasaari, undefined, 'arrival observes the destination');
  assert.equal(seenBefore, undefined, 'and nothing before arrival did');
  assert.deepEqual([j.cash, JSON.stringify(j.stock), j.scheduleIndex], [cash, stock, index], 'no money, stock or clock');
  assert.deepEqual(j.route, state.route, 'personal travel never touches the delivery route');
  assert.equal(j.logs.length, Math.min(24, logs + 1));
  const afterOnce = JSON.stringify(j);
  assert.equal(commitJourney(j, data, plan).reason, 'stale');
  assert.equal(JSON.stringify(j), afterOnce, 'a replayed plan changes nothing');
  // Disconnected: the same place with every street to it removed.
  const cut = { ...data, map: { ...map, edges: map.edges.filter(e => e.from !== 'makelansilta' && e.to !== 'makelansilta') } };
  assert.equal(previewJourney(j, cut, 'makelansilta').reason, 'disconnected');
  // Nothing incompatible going on: not mid-visit, not mid-fight.
  assert.equal(previewJourney({ ...j, activeVisit: 'x' }, data, 'hakaniemi').reason, 'in-visit');
  assert.equal(previewJourney({ ...j, battle: { status: 'active' } }, data, 'hakaniemi').reason, 'in-battle');
  assert.equal(previewJourney({ ...j, endingId: 'x' }, data, 'hakaniemi').reason, 'campaign-over');
  // Arrival survives a save round trip.
  assert.equal(JSON.parse(JSON.stringify(j)).selectedAnchor, 'siltasaari');
}

assert.equal(requirementStatus('cash>=100', state, data).ok, true);
assert.equal(requirementStatus('stock:piri>=1', state, data).ok, true);
assert.equal(requirementStatus('flag:first-purchase-made', state, data).ok, false);

const full = createState(content);
const choicePlan = [
  'buy', 'complete', 'ask-envelope', 'hire-fair', 'convert-part', 'eat-and-listen',
  'hire-watcher', 'hire-rauno', 'withdraw', 'refuse', 'push-door',
  'leave-receipts', 'ask-jaska', 'name-the-cost',
];
let journeys = 0;
for (const choiceId of choicePlan) {
  const encounter = currentEncounter(full, data);
  assert(encounter, `encounter exists at schedule ${full.scheduleIndex}`);
  const choice = encounter.choices.find(item => item.id === choiceId);
  assert(choice, `${choiceId} exists in ${encounter.id}`);
  // M2: the schedule no longer carries Aatami — he walks to every lead.
  const lead = currentSchedule(full, content).anchor_id;
  if (full.selectedAnchor !== lead) {
    const plan = previewJourney(full, data, lead);
    assert.equal(plan.ok, true, `${lead} is reachable from ${full.selectedAnchor}: ${plan.reason}`);
    const before = { cash: full.cash, index: full.scheduleIndex, stock: JSON.stringify(full.stock) };
    assert.equal(commitJourney(full, data, plan).ok, true);
    assert.deepEqual({ cash: full.cash, index: full.scheduleIndex, stock: JSON.stringify(full.stock) }, before,
      'a journey costs no money, stock or block');
    journeys += 1;
  }
  assert.equal(full.selectedAnchor, lead, `Aatami stands at ${lead} for ${encounter.id}`);
  const status = choiceStatus(choice, full, data);
  assert.equal(status.ok, true, `${choiceId} is available: ${status.reasons.join(', ')}`);
  const result = chooseEncounter(full, encounter, choice, data);
  assert.equal(result.ok, true);
  if (!full.endingId) advanceSchedule(full, data);
}
assert.equal(full.scheduleIndex, 13, 'ending resolves inside the fourteenth block');
assert(journeys >= 8, `the full route travels explicitly (${journeys} journeys)`);
assert(full.endingId, 'the final authored choice resolves an ending');
assert.equal(full.choices['enc-first-firearm'], 'refuse', 'firearm refusal remains viable');
assert.equal(full.missionStatus['mission-courtyard-receipts'], 'fail', 'non-combat courtyard path remains viable');


// Equipment shop (COMBAT.md §8) — market at Piritori; taken-only refused.
{
  const shop = createState(content);
  shop.selectedAnchor = 'hakaniemi';
  assert.equal(canShopHere(shop), false, 'shop closed away from Piritori');
  assert.equal(buyEquipment(shop, data, 'pipe').ok, false, 'buy refused off-site');

  shop.selectedAnchor = 'piritori';
  assert.equal(canShopHere(shop), true, 'shop open at Piritori');
  assert.equal(isPurchasable(data, 'sawn-off'), false, 'sawn-off taken-only');
  assert.equal(isPurchasable(data, 'tire-iron'), false, 'tire-iron taken-only');
  assert.equal(isPurchasable(data, 'lifted-handgun'), false, 'lifted-handgun taken-only');
  assert.equal(buyEquipment(shop, data, 'sawn-off').ok, false, 'cannot buy taken-only');

  const price = buyOf(data, 'pipe');
  assert.ok(price > 0, 'pipe has buy_eur');
  shop.cash = price - 1;
  assert.equal(buyEquipment(shop, data, 'pipe').ok, false, 'short cash refused');
  shop.cash = price;
  const before = countOf(shop, 'pipe');
  const bought = buyEquipment(shop, data, 'pipe');
  assert.equal(bought.ok, true, 'pipe buys when rich enough at Piritori');
  assert.equal(bought.paid, price);
  assert.equal(shop.cash, 0);
  assert.equal(countOf(shop, 'pipe'), before + 1);
}

console.log(`V3 STATE OK: ${content.schedule.length} blocks, deferred purchase, fixed choices and ending ${full.endingId}.`);

// ── Growth loop (GameState.gd Phase D / COMBAT.md §9.11) ───────────────────
{
  const {
    levelOf, unspentPerkPoints, perkValue, skillsOf, skillOffer, spendPerk,
    learnSkill, spendPerkPointOnSkill, grantLevel, grantGlory, train, ageCrew,
    FIGHTS_PER_LEVEL, GLORY_PERK_POINTS, SKILL_OFFER_SIZE,
    fightsOf, careerLeft, saveState, loadState, hasAptitude, aptitudesOf,
    createState: freshState,
  } = await import('../js/v3/state.js?v=7');

  const CAREER = 10;

  const g = freshState(content);
  let who = '';
  for (const c of content.crew) {
    if (!c.named) { who = c.id; break; }
  }
  assert.ok(who, 'slice has a non-named crew member');
  if (!g.recruited.includes(who)) g.recruited.push(who);

  assert.equal(levelOf(g, who), 1, 'everyone starts at level one');
  assert.equal(unspentPerkPoints(g, who), 0, 'with nothing to spend');

  for (let i = 0; i < FIGHTS_PER_LEVEL; i += 1) ageCrew(g, data, [who]);
  assert.equal(levelOf(g, who), 2, 'fights buy a level');
  assert.ok(unspentPerkPoints(g, who) >= 1, 'and a level gives a point to spend');

  assert.equal(spendPerk(g, data, who, 'speed'), true, 'a point buys a perk');
  assert.equal(perkValue(g, who, 'speed'), 1, 'and the perk stuck');
  assert.equal(unspentPerkPoints(g, who), 0, 'spending a point costs it');
  assert.equal(spendPerk(g, data, who, 'speed'), false, 'cannot spend what you do not have');

  grantLevel(g, who);
  assert.equal(spendPerk(g, data, who, 'charisma'), false, 'unknown perk refused');
  assert.equal(unspentPerkPoints(g, who), 1, 'and the point was not eaten');

  const offer = skillOffer(g, data, who);
  assert.ok(offer.length > 0, 'there is something to learn');
  assert.ok(offer.length <= SKILL_OFFER_SIZE, 'offer no bigger than three');
  const learn = offer[0].id;
  assert.equal(learnSkill(g, data, who, learn), true, 'a skill is learned');
  assert.equal(learnSkill(g, data, who, learn), false, 'and not learned twice');
  assert.ok(skillsOf(g, who).includes(learn), 'it is on the person');

  // Aptitude gate: back-door is a driver trick — only refuse if they lack driver.
  if (!hasAptitude(g, data, who, 'driver')) {
    assert.equal(learnSkill(g, data, who, 'back-door'), false, "stranger's trick refused");
  }

  const before = unspentPerkPoints(g, who);
  grantGlory(g, who);
  assert.equal(unspentPerkPoints(g, who), before + GLORY_PERK_POINTS, 'glory pays two');
  assert.ok(g.flags.includes(`memory:glory:${who}`), 'city hears about glory');

  // Stable offer
  const again = skillOffer(g, data, who);
  assert.deepEqual(again.map(s => s.id), skillOffer(g, data, who).map(s => s.id), 'same offer comes back');

  // Save/load roundtrip
  const storage = { _d: null, setItem(_k, v) { this._d = v; }, getItem() { return this._d; } };
  saveState(g, storage);
  const blank = freshState(content);
  assert.equal(perkValue(blank, who, 'speed'), 0, 'a new campaign forgets');
  const reloaded = loadState(content, storage);
  assert.equal(perkValue(reloaded, who, 'speed'), 1, 'perk came back');
  assert.ok(skillsOf(reloaded, who).includes(learn), 'skill came back');
  assert.ok(Array.isArray(reloaded.trainedCrew), 'trainedCrew persisted shape');

  // train(): needs a retiree; +2 fights; no grantLevel; once only
  const rookieState = freshState(content);
  let veteran = '';
  let rookie = '';
  for (const c of content.crew) {
    if (c.named) continue;
    if (!veteran) veteran = c.id;
    else if (!rookie) { rookie = c.id; break; }
  }
  assert.ok(veteran && rookie, 'two non-named crew for train test');
  rookieState.recruited.push(veteran, rookie);
  // Age veteran to retirement
  for (let i = 0; i < CAREER + 2; i += 1) ageCrew(rookieState, data, [veteran]);
  assert.ok(rookieState.retiredCrew.includes(veteran), 'veteran retired');
  const fightsBefore = fightsOf(rookieState, rookie);
  const levelBefore = levelOf(rookieState, rookie);
  const pointsBefore = unspentPerkPoints(rookieState, rookie);
  assert.equal(train(rookieState, data, rookie), true, 'veteran starts the next one ahead');
  assert.equal(fightsOf(rookieState, rookie), fightsBefore + 2, '+2 fights');
  // Match Godot: train does NOT call grantLevel even if level boundary crossed.
  assert.equal(unspentPerkPoints(rookieState, rookie), pointsBefore, 'train does not grantLevel');
  assert.equal(train(rookieState, data, rookie), false, 'but only once');
  assert.ok(careerLeft(rookieState, data, rookie) < CAREER, 'shorter career left');

  // Authored crew fall back to role aptitude
  const authored = content.crew[0].id;
  assert.ok(aptitudesOf(g, data, authored).length >= 1, 'authored crew answers aptitudes');

  console.log('V3 STATE growth-loop OK');
}


// Chapter income must include the main market loop, not only fenced weapons.
{
  const { chapterProgress, chapterEndingAvailable, commitRoute, sendOnRoute,
    restoreState } = await import('../js/v3/state.js?v=7');
  const trader = createState(content);
  const buy = data.offers.get('offer-piritori-buy');
  const sell = content.market_offers.find(offer => offer.side === 'sell');
  assert(sell, 'authored buyer exists');
  const price = sell.quote.kind === 'exact' ? sell.quote.eur :
    Math.round((sell.quote.min_eur + sell.quote.max_eur) / 2);
  assert.equal(transactOffer(trader, buy).ok, true);
  assert.equal(chapterProgress(trader), 0, 'purchases do not count as income');
  assert.equal(transactOffer(trader, sell).ok, true);
  assert.equal(chapterProgress(trader), price, 'a successful market sale counts once');
  const afterSale = JSON.stringify(trader);
  assert.equal(transactOffer(trader, sell).ok, false);
  assert.equal(JSON.stringify(trader), afterSale, 'failed sale changes nothing');
  trader.stock.piri = 1;
  trader.revealedOffers.push(sell.id);
  commitRoute(trader, ['piritori', sell.anchor_id]);
  const beforeDelivery = chapterProgress(trader);
  assert.equal(sendOnRoute(trader, data).ok, true);
  assert.equal(chapterProgress(trader), beforeDelivery + price, 'delivery counts its actual receipt once');
  const afterDelivery = JSON.stringify(trader);
  assert.equal(sendOnRoute(trader, data).ok, false);
  assert.equal(JSON.stringify(trader), afterDelivery, 'failed delivery changes nothing');
  trader.chapterEarned = trader.chapterThreshold - price;
  trader.stock.piri = 1;
  assert.equal(chapterEndingAvailable(trader, data), false);
  assert.equal(transactOffer(trader, sell).ok, true);
  assert.equal(chapterEndingAvailable(trader, data), true, 'trade unlocks the existing climax');
  assert.equal(trader.chapterCleared, false, 'earning the threshold does not force an ending');
  const restored = restoreState(JSON.parse(JSON.stringify(trader)), content);
  assert.equal(chapterProgress(restored), trader.chapterThreshold, 'progress survives save/load');
}
console.log('PASS chapter progress through sales and route deliveries');
