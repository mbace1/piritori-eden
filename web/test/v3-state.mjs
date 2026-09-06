import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  createState, currentSchedule, currentEncounter, choiceStatus, chooseEncounter,
  advanceSchedule, transactOffer, requirementStatus,
  canShopHere, buyOf, buyEquipment, isPurchasable, countOf,
} from '../js/v3/state.js';

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

assert.equal(requirementStatus('cash>=100', state, data).ok, true);
assert.equal(requirementStatus('stock:piri>=1', state, data).ok, true);
assert.equal(requirementStatus('flag:first-purchase-made', state, data).ok, false);

const full = createState(content);
const choicePlan = [
  'buy', 'complete', 'ask-envelope', 'hire-fair', 'convert-part', 'eat-and-listen',
  'hire-watcher', 'hire-rauno', 'withdraw', 'refuse', 'push-door',
  'leave-receipts', 'ask-jaska', 'name-the-cost',
];
for (const choiceId of choicePlan) {
  const encounter = currentEncounter(full, data);
  assert(encounter, `encounter exists at schedule ${full.scheduleIndex}`);
  const choice = encounter.choices.find(item => item.id === choiceId);
  assert(choice, `${choiceId} exists in ${encounter.id}`);
  const status = choiceStatus(choice, full, data);
  assert.equal(status.ok, true, `${choiceId} is available: ${status.reasons.join(', ')}`);
  const result = chooseEncounter(full, encounter, choice, data);
  assert.equal(result.ok, true);
  if (!full.endingId) advanceSchedule(full, data);
}
assert.equal(full.scheduleIndex, 13, 'ending resolves inside the fourteenth block');
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
  } = await import('../js/v3/state.js');

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
