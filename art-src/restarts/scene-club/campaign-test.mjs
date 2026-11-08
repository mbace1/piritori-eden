import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createState, chooseEncounter, advanceSchedule, chargeTrip, actionsLeft, formatBlock } from '../../../web/js/v3/state.js?v=14';
import { CANDIDATE_SAVE_KEY, SCENE_ENCOUNTER_ID, loadCandidate, chooseCandidate, returnToMap, restartCandidate, persistCandidate } from './campaign.js';

const read = path => readFile(new URL(path, import.meta.url), 'utf8').then(JSON.parse);
const [content, map] = await Promise.all([read('../../../content/era1-slice-v1.json'), read('../../../map/kallio-era1-2003-v1.json')]);
const data = { content, map, encounters: new Map(content.encounters.map(item => [item.id, item])) };
const encounter = data.encounters.get(SCENE_ENCOUNTER_ID);
const NORMAL_KEY = 'piritori-to-eden:v3';
const sentinel = '{"keep":"owner campaign and receipts unchanged"}';
const values = new Map([[NORMAL_KEY, sentinel], ['piritori:c19:receipt-sentinel', 'untouched']]);
const reads = [], writes = [];
const storage = {
  getItem(key) { assert.equal(key, CANDIDATE_SAVE_KEY, 'only candidate storage may be read'); reads.push(key); return values.get(key) ?? null; },
  setItem(key, value) { assert.equal(key, CANDIDATE_SAVE_KEY, 'only candidate storage may be written'); writes.push(key); values.set(key, value); },
};
Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw Error('Ambient storage accessed instead of isolated supplied storage'); } });
let checks = 0;
function equal(actual, expected, message) { assert.deepEqual(actual, expected, message); checks += 1; }
const snapshot = value => JSON.parse(JSON.stringify(value));

for (const choice of encounter.choices) {
  const candidate = restartCandidate(data, storage);
  const expected = createState(content);
  Object.assign(expected, { scheduleIndex: 2, selectedAnchor: 'makelansilta', mode: 'encounter' });
  equal(candidate.state, expected, 'checkpoint adds no invented earlier choices, costs or recruits');
  equal(candidate.phase, 'scene');
  equal(formatBlock(candidate.state, content), 'DAY 2 · DAY');
  equal(returnToMap(candidate, data, storage), { ok: false, reason: 'choice-required' }, 'cannot advance before choosing');
  const before = snapshot(candidate.state);
  equal(chooseEncounter(expected, encounter, choice, data).ok, true);
  equal(chooseCandidate(candidate, choice.id, data, storage).ok, true);
  equal(candidate.state, expected, 'full settlement equals the actual engine, not duplicated effect logic');
  equal(candidate.lastReceipt.before, before);
  equal(candidate.lastReceipt.after, expected);
  equal(candidate.lastReceipt.label, choice.label);
  equal(candidate.lastReceipt.forecast, choice.forecast);
  equal(candidate.phase, 'result');
  const paid = snapshot(candidate), writesBefore = writes.length;
  equal(chooseCandidate(candidate, choice.id, data, storage), { ok: false, reason: 'already-resolved' });
  equal(candidate, paid, 'duplicate does not change even one state or receipt field');
  equal(writes.length, writesBefore, 'duplicate cannot write another settlement');
  const reloaded = loadCandidate(data, storage);
  equal(reloaded, paid, 'reload resumes the actual recorded decision and full before/after snapshots');
  equal(chooseCandidate(reloaded, encounter.choices.find(item => item.id !== choice.id).id, data, storage).ok, false, 'reload cannot choose a different reward');
  advanceSchedule(expected, data);
  equal(returnToMap(reloaded, data, storage).ok, true);
  equal(reloaded.state, expected, 'Continue uses real advancement including latest clock semantics');
  equal(reloaded.phase, 'map');
  equal(formatBlock(reloaded.state, content), 'DAY 2 · NIGHT');
  equal(reloaded.state.selectedAnchor, 'makelansilta', 'next Harju lead does not teleport Aatami');
  equal(reloaded.lastReceipt.returned, expected);
  equal(reloaded.lastReceipt.before, before, 'original consequence remains available on quiet map');
  const returned = snapshot(reloaded), mapWrites = writes.length;
  equal(returnToMap(reloaded, data, storage), { ok: false, reason: 'already-returned' });
  equal(reloaded, returned, 'double Continue cannot skip another block');
  equal(writes.length, mapWrites);
  equal(loadCandidate(data, storage), returned, 'quiet map also survives reload');
}

// Meaningful authored outcomes, independently checked as well as full engine equality.
for (const [id, money, trust, flag] of [['ask-envelope', 300, 1, 'markka-explained'], ['take-envelope', 300, -1, 'jaska-money-taken'], ['leave-it', 0, 2, 'markka-left-with-jaska']]) {
  const candidate = restartCandidate({ content, map }, storage), before = snapshot(candidate.state);
  chooseCandidate(candidate, id, { content, map }, storage);
  equal(candidate.state.markka - before.markka, money);
  equal(candidate.state.relationships.jaska - before.relationships.jaska, trust);
  equal(candidate.state.flags.includes(flag), true);
  equal(candidate.state.cash, before.cash);
  equal(candidate.state.debt, before.debt);
  equal(candidate.state.recruited, []);
  equal(candidate.state.outing, undefined, 'this encounter does not invent a C.19 outing');
}

// Current v4.98 clock: an existing paid trip is neither reset nor charged again.
{
  const candidate = restartCandidate(data, storage);
  chargeTrip(candidate.state); chargeTrip(candidate.state); chargeTrip(candidate.state);
  equal(actionsLeft(candidate.state), 0);
  const clock = snapshot(candidate.state.time);
  chooseCandidate(candidate, 'leave-it', data, storage);
  equal(candidate.state.time, clock);
  returnToMap(candidate, data, storage);
  equal(candidate.state.time, clock, 'engine retains old block clock without manual reset');
  equal(actionsLeft(candidate.state), 3, 'new block gets its real action allowance');
  equal(loadCandidate(data, storage), candidate);
}
{
  const candidate = restartCandidate(data, storage), before = snapshot(candidate), n = writes.length;
  equal(chooseCandidate(candidate, 'invented-choice', data, storage), { ok: false, reason: 'unknown-choice' });
  equal(candidate, before); equal(writes.length, n);
}
for (const bad of ['not json', JSON.stringify({ version: 0 }), JSON.stringify({ ...restartCandidate(data, storage), state: { contentId: 'unrelated' } }), JSON.stringify({ version: 1, phase: 'scene', lastReceipt: null, state: { version: 3, contentId: content.id, selectedAnchor: 'makelansilta', scheduleIndex: 2, mode: 'encounter' } })]) {
  values.set(CANDIDATE_SAVE_KEY, bad);
  equal(loadCandidate(data, storage).phase, 'scene', 'malformed/unrelated candidate is not a campaign import');
}
{
  const unavailable = { getItem() { throw Error('unavailable'); }, setItem() { throw Error('unavailable'); } };
  const candidate = loadCandidate(data, unavailable);
  equal(persistCandidate(candidate, unavailable), false);
  equal(chooseCandidate(candidate, 'ask-envelope', data, unavailable).persisted, false, 'storage failure is reported without falsifying the real effect');
  equal(candidate.phase, 'result');
}
// Some browsers throw while obtaining localStorage, before getItem is reached.
// Play remains available in memory; persistence explicitly reports failure.
{
  const candidate = loadCandidate(data);
  equal(candidate.phase, 'scene');
  equal(chooseCandidate(candidate, 'leave-it', data).persisted, false);
  equal(candidate.phase, 'result');
  equal(returnToMap(candidate, data).persisted, false);
  equal(candidate.phase, 'map');
  equal(persistCandidate(candidate), false);
}
// The default browser path gets the same guarded candidate-only storage object.
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
const defaultCandidate = restartCandidate(data);
equal(defaultCandidate.phase, 'scene');
equal(loadCandidate(data).phase, 'scene');
equal(chooseCandidate(defaultCandidate, 'ask-envelope', data).ok, true);
equal(loadCandidate(data), defaultCandidate);
equal(returnToMap(defaultCandidate, data).ok, true);
equal(loadCandidate(data), defaultCandidate);
equal(values.get(NORMAL_KEY), sentinel);
equal(values.get('piritori:c19:receipt-sentinel'), 'untouched');
equal([...new Set([...reads, ...writes])], [CANDIDATE_SAVE_KEY]);
console.log(`PASS Scene Club campaign adapter: ${checks} checks; all 3 authored effects, exact engine settlement/clock, reload, once-only choice/return and isolated candidate storage.`);
