// Act I v4.74: a door fight is a C.19 outing (design/C19_CAMPAIGN_FIGHTS.md,
// step 1). Bare node, real content: Act I writes the outing, Night Shift
// builds it, a getaway is played, and the receipt comes back exactly once.
import assert from 'node:assert/strict';
import fs from 'node:fs';

const store = new Map();
globalThis.localStorage = { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) };
let search = '';
globalThis.location = { get search() { return search; } };

const read = path => JSON.parse(fs.readFileSync(new URL(path, import.meta.url)));
const content = read('../../content/era1-slice-v1.json');
const places = read('../../content/places-v1.json');
const doors = read('../../content/doors-v1.json');
const { createState, SAVE_KEY, fighters, recordFight, fightsToday } = await import('../js/v3/state.js?v=9');
const { stageFight, doorFightStage } = await import('../js/v3/places.js?v=1');
const { doorFightEffects, templateOf } = await import('../js/v3/doors.js?v=3');
const O = await import('../js/v3/outing.js?v=1');
const { loadRun, saveKey, OUTING_SAVE_KEY, SAVE_KEY: NIGHT_KEY, launch, makeMission, missionCheckpoint, restoreMission, settle, toggleCrew, continueRun } = await import('../crew-run/run.js?v=11');
const { missionCue } = await import('../fight-module/readability.js?v=2');
const { coordinate } = await import('../fight-module/tactics.js?v=7');

const { nameFrom } = await import('../../people/roster.mjs?v=1');
// As content.js loads it: an authored slot is named by the generator.
const crewData = { content, crew: new Map(content.crew.map(c => [c.id, { ...c, name: c.name ?? nameFrom(c.id) }])) };

// ── the pure rules ─────────────────────────────────────────────────────────
assert.equal(O.cPlace('courtyard'), 'courtyard');
assert.equal(O.cPlace('yard'), 'yard');
assert.equal(O.cPlace('park'), 'park');
assert.equal(O.cPlace('street'), 'courtyard', 'a place C has not built yet falls back to the courtyard');
assert.equal(O.cPlace('quay'), 'courtyard');
assert.equal(O.cWeapon('lifted-handgun'), 'first-handgun', 'either handgun is C\'s handgun');
assert.equal(O.cWeapon('folding-knife'), 'folding-knife');
assert.equal(O.cWeapon('feature-phone'), 'folding-knife', 'a watcher has no C weapon yet: a knife until C has a spotter rule');
for (const blunt of ['pipe', 'baton', 'tire-iron', 'chain', 'baseball-bat']) assert.equal(O.cWeapon(blunt), 'baseball-bat', `${blunt} is a bat in C`);

// ── Act I raises the fight ─────────────────────────────────────────────────
// A door at Torkkelinmäki (a courtyard), the McCormicks' fight, three a side.
function actOne({ crew = ['crew-slot-runner', 'crew-slot-muscle'], nonce = 'test' } = {}) {
  const state = createState(content);
  state.scheduleIndex = 4;
  state.recruited = [...crew];
  state.deployed = [...crew];
  const template = templateOf(doors, 'favour-mccormick-name');
  const encounter = { id: 'door-4-favour-mccormick-name', door: template.id, anchor_override_id: 'torkkelinmaki' };
  const team = fighters(state, crewData);
  const authored = content.battles.find(b => b.id === template.fight.battle);
  const staged = stageFight(authored, doorFightStage(encounter, template), places, team.map(m => m.name));
  const outing = O.doorOuting(state, encounter, staged, team.slice(0, authored.player_deployed).map(m => m.id), { opening: 'The deal goes bad.', nonce, when: 'DAY 3 · NIGHT' });
  return { state, template, encounter, outing, authored };
}

const { state, template, outing, authored } = actOne();
assert.equal(outing.kind, 'door');
assert.equal(outing.status, 'open');
assert.equal(outing.kit, 'courtyard', 'Torkkelinmäki is fought in the courtyard');
assert.equal(outing.place, 'A Torkkelinmäki courtyard');
assert.equal(outing.wayOut, 'through the porttikongi');
assert.equal(outing.side, "the McCormicks' people");
assert.equal(outing.battle, 'battle-courtyard-3v3');
assert.equal(outing.when, 'DAY 3 · NIGHT', 'Night Shift reads Act I\'s clock');
assert.equal(outing.fighters.length, authored.player_deployed, 'the door battle\'s own size');
assert.equal(outing.fighters[0], 'aatami', 'Aatami is in the fight while he still fights (owner, 2026-10-24)');
assert.equal(outing.rivals.length, 3);
assert.deepEqual(outing.rivals.map(r => r.equipment), ['baseball-bat', 'folding-knife', 'baseball-bat'], 'tire-iron, phone, baton');
assert.ok(outing.rivals.every(r => r.name && r.id && r.cell), 'the people the board would have had, by name and place');
assert.equal(O.outingUrl(outing), `crew-run/?campaign=1&outing=${outing.id}&arena=courtyard`);
assert.equal(O.openOuting({ outing }), outing);
assert.equal(O.settledOuting({ outing }), null);
const other = O.doorOuting(state, { id: 'x', door: 'y' }, { place: {}, opponents: [] }, [], { nonce: 'later' });
assert.notEqual(other.id, O.doorOuting(state, { id: 'x', door: 'y' }, { place: {}, opponents: [] }, [], { nonce: 'sooner' }).id, 'two campaigns never share an outing id');

// Later in Act I he is the shot caller and does not fight.
{
  const later = actOne({ crew: ['crew-slot-runner', 'crew-slot-muscle', 'crew-slot-watcher'] });
  assert.ok(!later.outing.fighters.includes('aatami'), 'once three can fight, Aatami calls it from the edge');
  assert.equal(later.outing.fighters.length, 3);
}

// The campaign save carries the outing (restoreState spreads it back).
state.outing = outing;
recordFight(state, content);
assert.equal(fightsToday(state, content), 1, 'the fight counts toward the day\'s two when it starts');
localStorage.setItem(SAVE_KEY, JSON.stringify(state));

// ── Night Shift builds it ──────────────────────────────────────────────────
search = `?campaign=1&outing=${outing.id}&arena=courtyard`;
assert.equal(saveKey(), OUTING_SAVE_KEY, 'an outing never writes over the ordinary Night Shift roster');
const run = loadRun(localStorage.getItem(OUTING_SAVE_KEY), content);
assert.equal(run.outing.id, outing.id);
assert.deepEqual(run.selected, outing.fighters, 'who fights is Act I\'s answer');
assert.equal(run.crew.find(p => p.id === 'aatami')?.name, 'Aatami', 'Aatami projects into C');
assert.equal(toggleCrew(run, outing.fighters[0]), false, 'nobody is chosen in Night Shift');
const config = launch(run);
assert.equal(config.objective, 'getaway');
assert.equal(config.bridgeReceiptId, `${outing.id}:${outing.id}`);
const fight = makeMission(content, config), b = fight.battle;
assert.deepEqual(b.players.map(p => p.id), outing.fighters);
assert.ok(b.players.every(p => p.cell.endsWith(',5')), 'the crew stand where it went bad, deep in the place');
assert.deepEqual(b.enemies.filter(e => e.alive).map(e => e.name), outing.rivals.map(r => r.name), 'the door\'s own people');
assert.ok(b.enemies.filter(e => e.alive).every(e => Number(e.cell.split(',')[1]) < 5), 'they stand between the crew and the exit');
assert.equal(b.enemies.filter(e => e.waiting).length, 2, 'two more arrive under pressure, as in every outing');
assert.equal(new Set(b.players.concat(b.enemies).map(u => u.name.split(' ')[0])).size, b.players.length + b.enemies.length, 'no first name twice on one board');
assert.equal(fight.command('withdraw').ok, false, 'walking away is not offered: the way out is the exit');
assert.equal(fight.command('auto').ok, false);
assert.match(missionCue(b, coordinate).goal, /^Get everyone out/);
assert.match(b.objective, /^A Torkkelinmäki courtyard\. Get everyone out through the porttikongi/);

// A real, unmodified opening is winnable without a single attack: read the
// plans, step round them, and walk out.
const route = [
  ['select', 'aatami'], ['move', '3,3'], ['select', 'crew-slot-runner'], ['move', '2,4'], ['select', 'crew-slot-muscle'], ['move', '3,4'], ['end'],
  ['select', 'aatami'], ['move', '3,0'], ['extract'], ['select', 'crew-slot-muscle'], ['move', '3,0'], ['extract'], ['end'],
  ['select', 'crew-slot-runner'], ['move', '3,1'], ['end'],
  ['move', '3,0'], ['extract'],
];
for (const [type, value] of route) assert.ok(fight.command(type, value).ok, `${type} ${value ?? ''}`);
assert.equal(b.status, 'complete');
assert.equal(b.result, 'win', 'everyone out is the win');
assert.ok(b.enemies.some(e => e.alive), 'and nobody had to be beaten');
assert.ok(!fight.history.some(r => r.type === 'attack'), 'not one attack');
assert.deepEqual(restoreMission(content, config, missionCheckpoint(fight)).snapshot(), fight.snapshot(), 'a reload replays the same fight');

// Mid-fight, the outing save resumes the same fight rather than a new one.
run.active.checkpoint = missionCheckpoint(fight);
localStorage.setItem(OUTING_SAVE_KEY, JSON.stringify(run));
assert.equal(JSON.stringify(loadRun(localStorage.getItem(OUTING_SAVE_KEY), content)), JSON.stringify(run));

// ── the receipt ────────────────────────────────────────────────────────────
assert.ok(settle(run, fight));
assert.equal(run.last.title, 'Everyone got away');
assert.equal(run.last.outingId, outing.id);
assert.equal(run.last.result, 'win');
assert.equal(run.last.campaignApplied, true, 'written into the campaign save');
assert.equal(continueRun(run), false, 'an outing has no next night here: the way home is Act I');
const after = JSON.parse(localStorage.getItem(SAVE_KEY));
assert.equal(after.outing.status, 'settled');
assert.equal(after.outing.result, 'win');
assert.deepEqual(after.outing.missing, []);
assert.ok(after.flags.includes(`memory:c17-receipt:${config.bridgeReceiptId}`), 'the receipt applies once, by id');
assert.equal(after.battleHistory.at(-1).id, 'battle-courtyard-3v3');
assert.equal(after.battleHistory.at(-1).at, 'torkkelinmaki');
assert.equal(after.crewFights['crew-slot-runner'], undefined, 'named crew do not spend a career fight');
// Night Shift reloaded on the aftermath stays on it.
localStorage.setItem(OUTING_SAVE_KEY, JSON.stringify(run));
assert.equal(loadRun(localStorage.getItem(OUTING_SAVE_KEY), content).phase, 'aftermath');
// The ordinary Night Shift roster was never touched.
assert.equal(localStorage.getItem(NIGHT_KEY), null);

// Act I pays the door's own stakes for how it ended.
assert.equal(O.settledOuting(after), after.outing);
assert.deepEqual(doorFightEffects(doors, after.outing.door, after.outing.result), template.fight.win);
assert.deepEqual(O.outingLines(after.outing), ['Everyone got out of A Torkkelinmäki courtyard.']);
assert.equal(O.settledFlag(after.outing), `memory:outing-settled:${outing.id}`);

// ── not everyone gets out ──────────────────────────────────────────────────
{
  const second = actOne({ nonce: 'second' });
  second.state.outing = second.outing;
  localStorage.setItem(SAVE_KEY, JSON.stringify(second.state));
  search = `?campaign=1&outing=${second.outing.id}&arena=courtyard`;
  localStorage.removeItem(OUTING_SAVE_KEY);
  const r = loadRun(localStorage.getItem(OUTING_SAVE_KEY), content), cfg = launch(r), f = makeMission(content, cfg), fb = f.battle;
  assert.notEqual(r.outing.id, run.outing.id);
  // Aatami and the runner go down; the muscle walks out alone.
  for (const id of ['aatami', 'crew-slot-runner']) { const u = fb.players.find(p => p.id === id); u.alive = false; u.hp = 0; }
  const muscle = fb.players.find(p => p.id === 'crew-slot-muscle');
  f.command('select', muscle.id); muscle.cell = '3,1'; assert.ok(f.command('move', '3,0').ok); assert.ok(f.command('extract').ok);
  assert.equal(fb.result, 'withdraw', 'some got out, not everyone');
  assert.ok(settle(r, f));
  assert.equal(r.last.title, 'Not everyone got out');
  const aatami = r.last.changes.find(c => c.id === 'aatami'), runner = r.last.changes.find(c => c.id === 'crew-slot-runner');
  assert.equal(aatami.campaignEffect, 'carried', 'Aatami is never left behind: the crew carry him out');
  assert.equal(runner.campaignEffect, 'missing', 'anyone else left behind is missing');
  const camp = JSON.parse(localStorage.getItem(SAVE_KEY));
  assert.equal(camp.crewStatus.aatami.status, 'wounded', 'carried out, hurt');
  assert.ok(camp.crewStatus.aatami.condition >= 1, 'hurt, never critical');
  assert.equal(camp.crewStatus['crew-slot-runner'].status, 'missing');
  assert.equal(camp.outing.result, 'withdraw');
  assert.deepEqual(doorFightEffects(doors, camp.outing.door, camp.outing.result), template.fight.lose, 'the door\'s losing stakes');
  const lines = O.outingLines(camp.outing);
  assert.equal(lines[0], 'Not everyone got out of A Torkkelinmäki courtyard.');
  assert.match(lines[1], /^Aatami went down and was carried out, hurt\.$/);
  assert.match(lines[2], /did not make it out\. Missing\.$/);
}

// A settled fight cannot be reopened from Night Shift.
{
  localStorage.removeItem(OUTING_SAVE_KEY);
  assert.throws(() => loadRun(null, content), /already settled/);
  search = '?campaign=1&outing=not-a-fight';
  assert.throws(() => loadRun(null, content), /not in this campaign/);
}

console.log('C.19 outing: Act I raises a door fight, Night Shift builds it in its place with its people, a getaway is won without one attack, and the receipt comes back exactly once — Aatami carried, the rest missing — passed.');
