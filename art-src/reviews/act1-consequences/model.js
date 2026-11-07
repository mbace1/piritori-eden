// Review-only fixtures. Pure state APIs: no saveState, loadRun, R.settle or storage.
import { createState, restoreState, transactOffer, offerPrice, hiringPoolFor, hireFromPool, fighters, applyEffects, takeLoot, advanceSchedule } from '../../../web/js/v3/state.js?v=12';
import { applyCampaignReceipt } from '../../../web/crew-run/campaign-adapter.js?v=13';
import { stageFight, doorFightStage } from '../../../web/js/v3/places.js?v=1';
import { doorFightEffects } from '../../../web/js/v3/doors.js?v=6';
import { doorOuting, outingSpoils, settledFlag, outingLines } from '../../../web/js/v3/outing.js?v=7';
import { nameFrom } from '../../../people/roster.mjs?v=1';

export const CASES = [
  { id: 'trade', title: 'One pack, one clear price', short: 'Trade', place: 'Piritori', scene: 'scene-piritori-square-v01', action: 'Buy one pack', provenance: 'Existing offer + transaction API', source: 'era1-slice-v1.json · offer-piritori-buy', premise: 'The street quote is €45. See the money and carrying space together before buying.', proposed: 'A compact receipt beside the seller, then a quiet return to the map.', limit: 'Each pack is a new transaction in the game. This preview applies one purchase per reset; it does not claim trades are idempotent.', roadmap: '4 · City and UI; G4 later adds the approved travel/trade time cost.' },
  { id: 'hire', title: 'A signing fee is not the whole cost', short: 'Recruitment', place: 'Piritori', scene: 'scene-piritori-square-v01', action: 'Hire this candidate', provenance: 'Existing deterministic hiring pool + hire API', source: 'state.js · hiringPoolFor / hireFromPool', premise: 'The candidate comes from the existing seeded hiring pool. Their fee and nightly wage stay visible.', proposed: 'Show the immediate fee beside the recurring commitment; add the person to the same crew strip.', limit: 'The signing-fee rule is an existing unplaytested placeholder. This workbench does not approve or rebalance it.', roadmap: '4 · City and UI; 2 · Crew and combat.' },
  { id: 'victory', title: 'The job pays. The wound comes home.', short: 'C.19 victory + loot', place: 'Torkkelinmäki courtyard', scene: 'scene-courtyard-prototype-v05', action: 'Apply winning fixture receipt', provenance: 'Illustrative terminal receipt → real settlement APIs', source: 'hit-courtyard-ledger · fight.win; campaign-adapter.js; outingSpoils', premise: 'A fixture of a won courtyard fight: rivals break, one crew member is wounded, and a fallen rival leaves a weapon.', proposed: 'One aftermath strip: what was won, who was hurt, what reached the stash, and the next route. Job cash is not fence income; recovered weapons must still be sold.', limit: 'This is a terminal receipt fixture, not a played or simulated battle. C.19 remains the 3D tactical battle. Loot only comes from downed rivals, never those who ran.', roadmap: '5 / G2 · Consequences; 2 / G1 remains the combat balance track.' },
  { id: 'withdraw', title: 'A way out still costs someone', short: 'Withdrawal + missing', place: 'Torkkelinmäki courtyard', scene: 'scene-courtyard-prototype-v05', action: 'Apply withdrawal fixture receipt', provenance: 'Illustrative terminal receipt → real missing/stakes APIs', source: 'hit-courtyard-ledger · fight.lose; campaign-adapter.js', premise: 'This withdrawal fixture brings Aatami home hurt and leaves a crew member missing. The job is lost.', proposed: 'Name the missing person once, show the lost job and local pressure, then point toward the existing rescue door.', limit: 'The missing person is selected in the fixture, not calculated by a battle. Aatami is carried out under the existing rule; he is never made missing.', roadmap: '5 / G2 · Consequences and recovery.' },
  { id: 'police', title: 'The police take a person, not a number', short: 'Police + arrest', place: 'Torkkelinmäki courtyard', scene: 'scene-courtyard-prototype-v05', action: 'Apply police fixture receipt', provenance: 'Illustrative terminal receipt → real arrest API', source: 'campaign-adapter.js · arrested; state.js · arrestCrew', premise: 'A police-ending fixture removes a taken crew member from the working roster. The lost job also raises local pressure.', proposed: 'Show the person taken, the remaining crew, and the existing bail route in the same place.', limit: 'No police fight is offered here. Timing and who is taken belong to C.19; this workbench only previews their settled consequences.', roadmap: '5 / G2 · Persistent consequences; G0 device acceptance still open.' },
  { id: 'rescue', title: 'Home does not mean healed', short: 'Missing → rescued', place: 'Torkkelinmäki', scene: 'scene-kallio-backyard-v01', action: 'Go and get them', provenance: 'Existing authored rescue choice + state API', source: 'doors-v1.json · favour-find-them / go', premise: 'The existing rescue door brings the missing person home wounded. It spends a block that could have earned money.', proposed: 'A clear “home, still hurt” result with the person restored to the roster and the time cost visible.', limit: 'This preview uses the authored peaceful rescue effect. It adds no rescue battle or free full heal.', roadmap: '5 / G2 · Recovery; 4 · City and UI.' },
  { id: 'treatment', title: 'Pay to remove the known death risk', short: 'Critical injury → treated', place: 'Staffed bank', scene: 'scene-bank-counter-v01', action: 'Treat critical wounds · €80', provenance: 'Existing authored treatment choice + state API', source: 'era1-slice-v1.json · enc-pasila-ledger / treat-crew', premise: 'A fixture crew member has a critical wound. The authored choice costs €80 and removes critical status.', proposed: 'Show “critical → wounded” beside the €80 cost; do not imply full recovery.', limit: 'The original choice is a Day 7 story decision. This fixture isolates its effects; it does not add an anytime clinic or change the story calendar.', roadmap: '5 / G2 · Consequences; 6 / G4 verifies complete chapter reachability.' },
  { id: 'bail', title: 'The way home has a cash price', short: 'Arrested → bailed out', place: 'Piritori / Pasila', scene: 'scene-piritori-square-v01', action: 'Pay the bail · €120', provenance: 'Existing authored bail choice + state API', source: 'doors-v1.json · favour-bail / pay', premise: 'The existing bail door offers a cash route home. Its Jaska-favour alternative remains an authored option outside this fixture.', proposed: 'Put the cash cost, returned person and restored roster in one short result.', limit: 'This fixture uses the authored €120 cash choice, not a new bail formula. It shows the existing full-condition restoration rule without endorsing it as final balance.', roadmap: '5 / G2 · Recovery; 4 · City and UI.' },
  { id: 'pressure', title: 'The neighbourhood remembers the job', short: 'Local pressure', place: 'Torkkelinmäki', scene: 'scene-kallio-backyard-v01', action: 'Apply authored failed-job effects', provenance: 'Existing authored pressure + relationship effects', source: 'doors-v1.json · hit-courtyard-ledger / fight.lose', premise: 'The failed courtyard job adds one local pressure and costs one point of Jade Lantern standing.', proposed: 'Show the local change at its address, with a quieter map and a short lasting reminder.', limit: 'This is local pressure, not territorial ownership. Posting crew on corners remains shelved. No new capture or passive-income system is proposed here.', roadmap: '4 · City and UI; 5 / G2 · Consequences.' },
];
const clone = value => structuredClone(value);
export const caseOf = id => CASES.find(item => item.id === id) || CASES[0];
export function indexData(content, doors, places, artManifest) {
  return { content, doors, places, artManifest, crew: new Map(content.crew.map(p => [p.id, { ...p, name: p.name || nameFrom(p.id) }])), equipment: new Map(content.equipment.map(e => [e.id, e])) };
}
export async function loadData() {
  const files = ['content/era1-slice-v1.json', 'content/doors-v1.json', 'content/places-v1.json', 'art/v3/manifest.json'];
  const values = await Promise.all(files.map(async path => { const response = await fetch(new URL(`../../../${path}`, import.meta.url)); if (!response.ok) throw Error(`${path}: HTTP ${response.status}`); return response.json(); }));
  return indexData(...values);
}
function baseState(data) {
  const state = createState(data.content);
  // Explicit fixture setup, not an observed campaign or a bot outcome.
  state.scheduleIndex = 14; state.selectedAnchor = 'torkkelinmaki'; state.pressure.torkkelinmaki = 1;
  state.recruited = ['crew-slot-runner', 'crew-slot-muscle']; state.deployed = [...state.recruited];
  return state;
}
function makeOuting(state, data, id) {
  const template = data.doors.templates.find(t => t.id === 'hit-courtyard-ledger');
  const encounter = { id: `review-${id}`, door: template.id, anchor_override_id: 'torkkelinmaki' };
  const team = fighters(state, data);
  const authored = data.content.battles.find(b => b.id === template.fight.battle);
  const staged = stageFight(authored, doorFightStage(encounter, template), data.places, team.map(p => p.name));
  return doorOuting(state, encounter, staged, team.slice(0, authored.player_deployed).map(p => p.id), { nonce: `review-${id}`, goal: template.fight.goal, when: 'DAY 8 · NIGHT' });
}
export function createFixture(data, id) {
  const definition = caseOf(id), state = baseState(data);
  const fixture = { id: definition.id, definition, state, applied: false, receipt: null, candidate: null, effects: null };
  if (definition.id === 'trade') { state.selectedAnchor = 'piritori'; state.stock.piri = 0; fixture.offer = data.content.market_offers.find(o => o.id === 'offer-piritori-buy'); }
  if (definition.id === 'hire') { state.selectedAnchor = 'piritori'; fixture.candidate = hiringPoolFor(state, data)[0]; }
  if (['victory', 'withdraw', 'police'].includes(definition.id)) {
    state.scheduleIndex = 15; // The authored courtyard-ledger door is night-only.
    state.outing = makeOuting(state, data, definition.id);
    const [aatami, runner, muscle] = state.outing.fighters;
    const name = personId => data.crew.get(personId)?.name || data.content.protagonist.name || 'Aatami';
    const result = definition.id === 'victory' ? 'win' : 'withdraw';
    const effects = definition.id === 'withdraw' ? ['carried', 'unchanged', 'missing'] : definition.id === 'police' ? ['unchanged', 'damage', 'arrested'] : ['unchanged', 'damage', 'unchanged'];
    fixture.receipt = { bridgeReceiptId: state.outing.id, outingId: state.outing.id, deployedIds: [...state.outing.fighters], result, end: definition.id === 'police' ? 'police' : definition.id === 'withdraw' ? 'withdraw' : 'win', success: result === 'win', routed: result === 'win', rounds: 3, heat: 2, down: result === 'win' ? state.outing.rivals.slice(0, 2).map(p => p.id) : [], changes: [aatami, runner, muscle].map((personId, i) => ({ id: personId, name: name(personId), campaignEffect: effects[i] })), text: 'Illustrative terminal receipt for the review workbench.' };
  }
  if (definition.id === 'rescue') { Object.assign(state.crewStatus['crew-slot-runner'], { status: 'missing', condition: 0 }); fixture.effects = data.doors.templates.find(t => t.id === 'favour-find-them').choices.find(c => c.id === 'go').effects; }
  if (definition.id === 'treatment') { state.scheduleIndex = data.content.schedule.findIndex(s => s.encounter_id === 'enc-pasila-ledger'); state.selectedAnchor = data.content.schedule[state.scheduleIndex].anchor_id; Object.assign(state.crewStatus['crew-slot-muscle'], { status: 'critical', critical: true, condition: 1 }); fixture.effects = data.content.encounters.find(e => e.id === 'enc-pasila-ledger').choices.find(c => c.id === 'treat-crew').effects; }
  if (definition.id === 'bail') { state.selectedAnchor = 'piritori'; state.recruited = state.recruited.filter(id => id !== 'crew-slot-muscle'); state.arrestedCrew = ['crew-slot-muscle']; Object.assign(state.crewStatus['crew-slot-muscle'], { status: 'missing', condition: 0 }); fixture.effects = data.doors.templates.find(t => t.id === 'favour-bail').choices.find(c => c.id === 'pay').effects; }
  if (definition.id === 'pressure') fixture.effects = doorFightEffects(data.doors, 'hit-courtyard-ledger', 'withdraw');
  fixture.before = clone(state);
  return fixture;
}
// Review harness mirrors the city's exported effect calls; it does not import
// app.js or call any storage-writing campaign/tactical entry point.
function settleReceipt(fixture, data) {
  const state = fixture.state;
  if (!applyCampaignReceipt(state, data.content, fixture.receipt)) return { ok: false, duplicate: true, message: 'Receipt already applied: nothing paid or changed twice.' };
  const outing = state.outing, marker = settledFlag(outing);
  if (state.flags.includes(marker)) return { ok: false, duplicate: true, message: 'City stakes already applied.' };
  state.flags.push(marker);
  const cashBeforeStakes = state.cash;
  applyEffects(state, doorFightEffects(data.doors, outing.door, outing.result), data, `review:${fixture.id}`);
  const jobCash = state.cash - cashBeforeStakes;
  outing.took = takeLoot(state, data, outingSpoils(outing, id => data.equipment.get(id)?.kind));
  const lines = outingLines(outing);
  state.outing = null;
  // Calendar-valid night fixture: the existing block API settles real wages
  // and interest. Optional Kello/family-event dispatch is outside this harness.
  const cashBeforeClock = state.cash, debtBeforeClock = state.debt;
  advanceSchedule(state, data);
  return { ok: true, message: lines.join(' '), duplicate: false, jobCash, nightlyPaid: cashBeforeClock - state.cash, debtAdded: state.debt - debtBeforeClock };
}
export function applyFixture(fixture, data) {
  let result;
  if (fixture.receipt) result = settleReceipt(fixture, data);
  else if (fixture.id === 'hire') { const ok = hireFromPool(fixture.state, data, fixture.candidate.id); result = { ok, duplicate: !ok, message: ok ? 'Candidate signing fee paid; their existing nightly wage is still due.' : 'Already on the roster. No second signing fee.' }; }
  else if (fixture.applied) result = { ok: false, duplicate: false, message: 'This preview shows one action per reset. Transactions may repeat in the game.' };
  else if (fixture.id === 'trade') result = transactOffer(fixture.state, fixture.offer);
  else {
    const effectResult = applyEffects(fixture.state, fixture.effects, data, `review:${fixture.id}`);
    if (['rescue', 'bail'].includes(fixture.id)) advanceSchedule(fixture.state, data);
    result = { ok: true, message: effectResult.messages.join(' ') || 'Authored effects applied to this fixture.' };
  }
  if (result.ok) fixture.applied = true;
  fixture.lastResult = result;
  return result;
}
export function reloadFixture(fixture, data) { fixture.state = restoreState(JSON.parse(JSON.stringify(fixture.state)), data.content); return fixture.state; }
export function projectFixture(data, id) { const fixture = createFixture(data, id); applyFixture(fixture, data); return fixture; }
export function summarize(state, data) {
  const protagonist = data.content.protagonist;
  const hurtAatami = state.crewStatus[protagonist.id]?.status !== 'available' ? [protagonist.id] : [];
  const names = [...new Set([...hurtAatami, ...state.recruited, ...state.arrestedCrew])];
  return { cash: state.cash, debt: state.debt, stock: state.stock.piri || 0, roster: state.recruited.length, pressure: state.pressure[state.selectedAnchor] || 0, chapterEarned: state.chapterEarned, history: state.battleHistory.length, block: state.scheduleIndex, gear: state.equipment.map(e => data.equipment.get(e.id)?.name || e.id.replaceAll('-', ' ')), people: names.map(id => ({ id, name: state.hiredCrew[id]?.name || data.crew.get(id)?.name || (id === protagonist.id ? protagonist.name || 'Aatami' : id), status: state.arrestedCrew.includes(id) ? 'arrested' : state.crewStatus[id]?.status || 'available', condition: state.crewStatus[id]?.condition ?? 0, max: state.crewStatus[id]?.maxCondition ?? 0 })) };
}
export function actionCost(fixture) { return fixture.id === 'trade' ? `€${offerPrice(fixture.offer)} · one pack` : fixture.id === 'hire' ? `€${fixture.candidate.wage_eur} now · €${fixture.candidate.wage_eur}/night` : ['victory', 'withdraw', 'police', 'rescue', 'bail'].includes(fixture.id) ? 'One block · authored result costs shown below' : fixture.id === 'treatment' ? '€80 · critical becomes wounded' : 'Local pressure +1 · Jade standing −1'; }
