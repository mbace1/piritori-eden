// The app's explicit state machines (design/STATE_MACHINES.md): the primitive,
// each declared table, and the city's screen rules. Bare node.
//
//   node web/test/machines.mjs
//
// The outing's own story (begun in Night Shift, fought on the board, finished
// in a stale tab) is played end to end in c19-outing.mjs; this file holds the
// tables and the rules, and checks the doc says what the code does.
import assert from 'node:assert/strict';
import fs from 'node:fs';

const { machine, step, describe } = await import('../js/v3/machine.js?v=1');
const O = await import('../js/v3/outing.js?v=8');
const { SCREENS, settleScreen, enterScreen } = await import('../js/v3/screens.js?v=2');
const { journeyBlocker } = await import('../js/v3/journey.js?v=4');
const doc = fs.readFileSync(new URL('../../design/STATE_MACHINES.md', import.meta.url), 'utf8');

// ── the primitive ──────────────────────────────────────────────────────────
assert.throws(() => machine('bad', { a: { go: 'b' } }), /b is not a state/, 'a table cannot point at a state it does not declare');
const door = machine('door', { shut: { open: 'ajar' }, ajar: { close: 'shut' } });
assert.deepEqual(step(door, 'shut', 'open'), { ok: true, from: 'shut', event: 'open', to: 'ajar' });
assert.equal(step(door, 'shut', 'close').ok, false);
assert.equal(step(door, 'shut', 'close').reason, 'door: close is not allowed from shut', 'a refusal names the machine, the event and the state');
assert.equal(step(door, 'gone', 'open').ok, false, 'an unknown state accepts nothing');
assert.equal(step(door, 'shut', 'toString').ok, false, 'inherited names are not events');
assert.ok(Object.isFrozen(door.table) && Object.isFrozen(door.table.shut), 'a declared table cannot be edited at run time');
assert.deepEqual(describe(door), ['shut --open--> ajar', 'ajar --close--> shut']);

// ── every declared machine is in the doc, move for move ────────────────────
for (const m of [O.OUTING]) {
  for (const line of describe(m)) assert.ok(doc.includes(`\`${line}\``), `design/STATE_MACHINES.md lists ${m.name}'s move ${line}`);
}
for (const screen of SCREENS) assert.ok(doc.includes(`\`${screen}\``), `design/STATE_MACHINES.md names the ${screen} screen`);

// ── the city's screen (M2) ─────────────────────────────────────────────────
const city = (extra = {}) => ({ mode: 'route', activeVisit: null, road: null, outing: null, battle: null, selectedAnchor: 'piritori', ...extra });

{ const s = city({ mode: 'somewhere' }); assert.equal(settleScreen(s), 'route', 'an unknown screen is the map'); }
{ const s = city({ mode: 'encounter', road: { pending: { id: 'road-x' } } }); assert.equal(settleScreen(s), 'road', 'a pending road event holds the screen'); }
{ const s = city({ mode: 'battle', road: { pending: { id: 'road-x' } } }); assert.equal(settleScreen(s), 'battle', 'except over a fight'); }
{ const s = city({ mode: 'route', outing: { id: 'o', status: 'open' } }); assert.equal(settleScreen(s), 'outing', 'an open outing holds the screen'); }
{ const s = city({ mode: 'outing', outing: { id: 'o', status: 'settled' } }); assert.equal(settleScreen(s), 'route', 'a settled one lets it go'); }
{ const s = city({ mode: 'road', road: { pending: null, last: null } }); assert.equal(settleScreen(s), 'route', 'an empty road screen is the map (it was blank after a road fight)'); }
{ const s = city({ mode: 'road', road: { pending: null, last: { id: 'road-x' } } }); assert.equal(settleScreen(s), 'road', 'a road result still waiting to be read stays'); }

// The travel lock: a visit left by the nav bar kept `activeVisit`, and every
// journey said 'in-visit' for the rest of the campaign.
{
  const data = { anchors: new Map([['siltasaari', { sliceState: 'active' }]]) };
  const locked = city({ mode: 'route', activeVisit: 'visit-jaska-bench' });
  assert.equal(journeyBlocker(locked, data, 'siltasaari'), 'in-visit', 'the lock as a save written before v4.100 holds it');
  settleScreen(locked);
  assert.equal(locked.activeVisit, null, 'reading the save repairs it');
  assert.equal(journeyBlocker(locked, data, 'siltasaari'), '', 'and Aatami can travel again');

  const inVisit = city({ mode: 'visit', activeVisit: 'visit-jaska-bench' });
  assert.equal(settleScreen(inVisit), 'visit');
  assert.equal(inVisit.activeVisit, 'visit-jaska-bench', 'a visit on its own screen stays open');
  assert.ok(enterScreen(inVisit, 'route').ok);
  assert.equal(inVisit.activeVisit, null, 'the nav bar out of a visit closes it');
}

// A fight's result stays until it is finished: leaving it turned the block twice.
{
  const s = city({ mode: 'battle', battle: { status: 'resolved', result: 'win' } });
  const refused = enterScreen(s, 'encounter');
  assert.equal(refused.ok, false);
  assert.match(refused.reason, /Finish the fight first/);
  assert.equal(s.mode, 'battle', 'a refusal changes nothing');
  assert.ok(enterScreen(s, 'battle').ok, 'staying is allowed');
  const live = city({ mode: 'battle', battle: { status: 'active' } });
  assert.ok(enterScreen(live, 'ledger').ok, 'a fight still going can be looked away from, as before');
  assert.equal(enterScreen(city(), 'nowhere').ok, false, 'the nav bar names only real screens');
}

console.log(`PASS machines: the primitive, ${O.OUTING.name} (${describe(O.OUTING).length} moves) and the city's ${SCREENS.length} screens, each as the doc says`);
