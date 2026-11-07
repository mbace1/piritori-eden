import assert from 'node:assert/strict';
import fs from 'node:fs';
Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw Error('Treatment preview accessed storage'); } });
const S = await import('../js/v3/state.js?v=13');
const { previewTreatment, treatmentChange, isTreatmentChoice } = await import('../js/v3/treatment.js?v=2');
const { nameFrom } = await import('../../people/roster.mjs?v=1');
const content = JSON.parse(fs.readFileSync(new URL('../../content/era1-slice-v1.json', import.meta.url)));
const data = { content, crew: new Map(content.crew.map(p => [p.id, { ...p, name: p.name || nameFrom(p.id) }])) };
const encounter = content.encounters.find(e => e.id === 'enc-pasila-ledger');
const choice = encounter.choices.find(c => c.id === 'treat-crew');
let checks = 0;
const check = (condition, message) => { assert(condition, message); checks += 1; };
const fixture = () => { const s = S.createState(content); s.scheduleIndex = 12; s.mode = 'encounter'; s.selectedAnchor = 'siltasaari'; s.recruited = ['crew-slot-muscle', 'crew-slot-runner']; s.deployed = [...s.recruited]; return s; };
const wound = (s, id, condition) => Object.assign(s.crewStatus[id], { status: 'critical', critical: true, condition });
function settle(state, expectedId) {
  const before = structuredClone(state), serialized = JSON.stringify(state);
  const preview = previewTreatment(state, choice, data);
  check(preview?.id === expectedId, 'preview follows actual engine target');
  check(JSON.stringify(state) === serialized, 'preview changes no state, log or flag');
  check(Math.abs(preview.cost - 80) < 1e-9, 'authored €80 cost');
  check(preview.status === 'wounded', 'preview does not promise a full heal');
  check(S.chooseEncounter(state, encounter, choice, data).ok, 'actual choice succeeds');
  assert.deepEqual(treatmentChange(before, state, data), preview); checks += 1;
  check(state.crewStatus[expectedId].critical === false && state.crewStatus[expectedId].status === 'wounded', 'actual critical risk cleared, wound remains');
  check(state.cash === before.cash - 80 && state.scheduleIndex === before.scheduleIndex, 'same cost and no premature block advance');
  check(state.flags.includes('crew-prioritised'), 'authored flag retained');
  const paid = JSON.stringify(state);
  check(S.chooseEncounter(state, encounter, choice, data).ok === false && JSON.stringify(state) === paid, 'same encounter pays once');
  const restored = S.restoreState(JSON.parse(paid), content), restoredJSON = JSON.stringify(restored);
  check(S.chooseEncounter(restored, encounter, choice, data).ok === false && JSON.stringify(restored) === restoredJSON, 'reload retains once-only guard');
  return preview;
}
{
  const s = fixture(); wound(s, 'crew-slot-muscle', 0);
  const result = settle(s, 'crew-slot-muscle'); check(result.condition === 1, 'existing minimum condition floor retained'); check(result.name === data.crew.get('crew-slot-muscle').name, 'actual named roster record');
}
{
  const s = fixture(); wound(s, 'crew-slot-runner', 2); wound(s, 'crew-slot-muscle', 1);
  settle(s, 'crew-slot-runner');
  check(s.crewStatus['crew-slot-muscle'].critical && s.crewStatus['crew-slot-muscle'].condition === 1, 'another critical person remains critical');
  check(s.crewStatus['crew-slot-runner'].condition === 2, 'treatment does not add health beyond current floor');
}
{
  const s = fixture(); s.cash = 79; wound(s, 'crew-slot-runner', 1); const before = JSON.stringify(s);
  check(previewTreatment(s, choice, data) === null, 'cash blocker retained');
  check(S.chooseEncounter(s, encounter, choice, data).ok === false && JSON.stringify(s) === before, 'poor choice cannot charge or heal');
}
{
  const s = fixture(), before = JSON.stringify(s);
  check(previewTreatment(s, choice, data) === null, 'no critical wound has no valid preview');
  check(S.chooseEncounter(s, encounter, choice, data).ok === false && JSON.stringify(s) === before, 'no-wound blocker retained');
}
{
  const s = fixture(), candidate = S.hiringPoolFor(s, data)[0];
  check(S.hireFromPool(s, data, candidate.id), 'existing generated hire fixture'); wound(s, candidate.id, 1);
  const result = settle(s, candidate.id); check(result.name === candidate.name, 'generated person uses actual hired name');
}
{
  const s = fixture(); s.recruited = ['crew-slot-muscle']; s.deployed = [...s.recruited]; wound(s, 'crew-slot-runner', 1); wound(s, 'crew-slot-muscle', 1);
  settle(s, 'crew-slot-runner'); check(s.crewStatus['crew-slot-muscle'].critical, 'preview does not silently filter the existing target policy by current roster');
}
check(!isTreatmentChoice(encounter.choices[0]) && previewTreatment(fixture(), encounter.choices[0], data) === null, 'other decisions unchanged');
check(treatmentChange(fixture(), fixture(), data) === null, 'no result invented without an actual treatment change');
console.log(`Treatment presentation: ${checks} checks passed; exact engine selection/cost/blockers, unchanged previews, remaining wounds, generated names and reload-once guard.`);
