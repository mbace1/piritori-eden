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
const { journeyBlocker } = await import('../js/v3/journey.js?v=5');
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

// ── crew status (M3) ───────────────────────────────────────────────────────
// Where a person stands and how hurt they are were one `status` string plus a
// `critical` flag and three lists, kept three different ways (the board's
// recordBattleConsequences, Night Shift's receipt, the effects). Each test
// below is a fault v4.100 had.
{
  const content = JSON.parse(fs.readFileSync(new URL('../../content/era1-slice-v1.json', import.meta.url)));
  const St = await import('../js/v3/state.js?v=16');
  const data = { content, crew: new Map(content.crew.map(c => [c.id, c])) };
  const fresh = () => { const s = St.createState(content); s.recruited = ['crew-slot-runner', 'crew-slot-muscle', 'crew-slot-fixer']; return s; };
  const hurt = (s, id) => Object.assign(s.crewStatus[id], { status: 'critical', critical: true, condition: 1 });

  assert.deepEqual(St.CREW.states, ['available', 'wounded', 'critical', 'missing', 'arrested', 'retired', 'dead']);
  for (const line of describe(St.CREW)) assert.ok(doc.includes(`\`${line}\``), `design/STATE_MACHINES.md lists crew's move ${line}`);

  // The board: someone already critical, hurt again, stays critical. v4.100
  // relabelled them 'wounded' and left the flag, so the card said WOUNDED
  // while the ending counted them dead.
  let s = fresh(); hurt(s, 'crew-slot-runner');
  St.battleCrew(s, data, { injured: ['crew-slot-runner', 'crew-slot-muscle'], taken: [], maim: false });
  assert.equal(St.crewState(s, 'crew-slot-runner'), 'critical');
  assert.equal(s.crewStatus['crew-slot-runner'].status, 'critical', 'the card says what the ending reads');
  assert.equal(St.crewState(s, 'crew-slot-muscle'), 'wounded');
  assert.equal(s.crewStatus['crew-slot-muscle'].condition, Math.max(1, content.crew.find(c => c.id === 'crew-slot-muscle').condition - 4), 'a board wound costs 4, never below 1');

  // The courtyard receipts leave the downed critical, Aatami excepted.
  s = fresh();
  St.battleCrew(s, data, { injured: ['crew-slot-muscle', content.protagonist.id], taken: [], maim: true });
  assert.equal(St.crewState(s, 'crew-slot-muscle'), 'critical');
  assert.notEqual(St.crewState(s, content.protagonist.id), 'critical', 'Aatami is hurt, never critical');

  // The police take someone critical: arrested, not dying. v4.100 left the
  // flag on, so an arrested person made the ending 'haunted'.
  s = fresh(); hurt(s, 'crew-slot-runner');
  St.battleCrew(s, data, { injured: ['crew-slot-runner'], taken: ['crew-slot-runner', 'crew-slot-muscle'], maim: false });
  for (const id of ['crew-slot-runner', 'crew-slot-muscle']) {
    assert.equal(St.crewState(s, id), 'arrested');
    assert.ok(!s.recruited.includes(id) && s.arrestedCrew.includes(id), 'off the roster, on the arrested list');
    assert.equal(s.crewStatus[id].critical, false);
  }
  assert.notEqual(St.forecastEnding(s, data)?.id, 'pasila-haunted', 'the arrested do not count as the dead');

  // Taken by the police in the fight that would have been their last: they
  // do not also retire (v4.100 did both, and bail brought back a person the
  // game still counted as retired, who then never aged again).
  s = fresh(); s.crewFights['crew-slot-fixer'] = 9;
  St.battleCrew(s, data, { injured: [], taken: ['crew-slot-fixer'], maim: false });
  St.ageCrew(s, data, ['crew-slot-fixer', 'crew-slot-runner']);
  assert.equal(St.crewState(s, 'crew-slot-fixer'), 'arrested');
  assert.ok(!s.retiredCrew.includes('crew-slot-fixer'), 'arrested, not also retired');
  assert.equal(s.crewFights['crew-slot-fixer'], 9, 'and not one fight older for a fight they were taken from');
  St.applyEffects(s, ['bail:arrested'], data, 'test');
  assert.equal(St.crewState(s, 'crew-slot-fixer'), 'available', 'bailed back onto the roster');
  assert.ok(s.recruited.includes('crew-slot-fixer'));

  // Retiring waits while someone is critical or missing: a critical wound is
  // still the player's to treat, and the missing are still to be found.
  s = fresh(); s.crewFights['crew-slot-fixer'] = 9; hurt(s, 'crew-slot-fixer');
  assert.deepEqual(St.ageCrew(s, data, ['crew-slot-fixer']), [], 'not while critical');
  assert.equal(s.crewFights['crew-slot-fixer'], 10, 'the fight still counts');
  assert.ok(s.recruited.includes('crew-slot-fixer'));
  St.applyEffects(s, ['resolve-critical-wound:one'], data, 'test');
  assert.equal(St.crewState(s, 'crew-slot-fixer'), 'wounded', 'treated');
  assert.deepEqual(St.ageCrew(s, data, ['crew-slot-fixer']), ['crew-slot-fixer'], 'then they retire after their next fight');
  assert.equal(St.crewState(s, 'crew-slot-fixer'), 'retired');

  // The one function refuses what the table does not allow, and changes nothing.
  s = fresh();
  St.moveCrew(s, data, 'crew-slot-runner', 'arrest');
  const before = JSON.stringify(s);
  assert.equal(St.moveCrew(s, data, 'crew-slot-runner', 'wound', { loss: 1 }).ok, false, 'the arrested are not hurt in a fight they are not in');
  assert.equal(St.moveCrew(s, data, 'crew-slot-runner', 'rescue').ok, false, 'bail, not rescue, brings the arrested back');
  assert.equal(JSON.stringify(s), before);

  // A save written before v4.101 comes back consistent.
  const raw = fresh();
  Object.assign(raw.crewStatus['crew-slot-runner'], { status: 'wounded', critical: true });
  raw.recruited = raw.recruited.filter(id => id !== 'crew-slot-muscle');
  raw.arrestedCrew = ['crew-slot-muscle'];
  Object.assign(raw.crewStatus['crew-slot-muscle'], { status: 'missing', critical: true });
  raw.retiredCrew = ['crew-slot-muscle', 'crew-slot-fixer'];
  const loaded = St.restoreState(JSON.parse(JSON.stringify(raw)), content);
  assert.equal(loaded.crewStatus['crew-slot-runner'].status, 'critical', 'wounded-but-critical shows as critical');
  assert.equal(loaded.crewStatus['crew-slot-muscle'].critical, false, 'arrested is not critical');
  assert.ok(!loaded.retiredCrew.includes('crew-slot-muscle'), 'arrested is not also retired');
  assert.ok(!loaded.retiredCrew.includes('crew-slot-fixer') && loaded.recruited.includes('crew-slot-fixer'), 'on the roster is not retired (the bail bug): they retire after their next fight');
}

console.log(`PASS machines: the primitive, ${O.OUTING.name} (${describe(O.OUTING).length} moves), the city's ${SCREENS.length} screens and crew status, each as the doc says`);
