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
