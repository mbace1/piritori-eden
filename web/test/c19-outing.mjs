// Act I v4.75: a door fight is a C.19 outing (design/C19_CAMPAIGN_FIGHTS.md §6).
// Bare node, real content: Act I writes the outing with its job, Night Shift
// builds it, and the rules the owner asked for hold — fighting 75%, escape 25%,
// Withdraw in every fight, and the police — with the receipt applied once.
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
const { createState, SAVE_KEY, fighters, recordFight, fightsToday } = await import('../js/v3/state.js?v=10');
const { stageFight, doorFightStage, roadFightStage } = await import('../js/v3/places.js?v=1');
const { doorFightEffects, templateOf } = await import('../js/v3/doors.js?v=4');
const O = await import('../js/v3/outing.js?v=5');
const R = await import('../crew-run/run.js?v=16');
const { missionCue } = await import('../fight-module/readability.js?v=4');
const { coordinate } = await import('../fight-module/tactics.js?v=9');
const { nameFrom } = await import('../../people/roster.mjs?v=1');

// As content.js loads it: an authored slot is named by the generator.
const crewData = { content, crew: new Map(content.crew.map(c => [c.id, { ...c, name: c.name ?? nameFrom(c.id) }])) };
const rowOf = cell => Number(cell.split(',')[1]);

// ── the job is data, and three in four fights are fights ──────────────────
const fights = doors.templates.filter(t => t.fight);
assert.ok(fights.every(t => ['fight', 'getaway'].includes(t.fight.goal)), 'every door fight carries its job');
const getaways = fights.filter(t => t.fight.goal === 'getaway').map(t => t.id).sort();
assert.deepEqual(getaways, ['pickup-fish-stall', 'pickup-yard-van', 'sale-quay-shift', 'watch-back-door'], 'the four getaways the plan names');
assert.equal(fights.length - getaways.length, 5, 'the other five doors are fights (with the four road fights and two missions: 11 of 15)');

// ── the pure rules ─────────────────────────────────────────────────────────
assert.equal(O.cPlace('street'), 'street', 'a street fight is fought on the street (v4.77)');
assert.equal(O.cPlace('quay'), 'quay', 'the quay fight is fought on the quay (v4.78)');
assert.equal(O.cPlace('nowhere'), 'courtyard', 'a place C has not built falls back to the courtyard');
assert.equal(O.cWeapon('lifted-handgun'), 'first-handgun');
assert.equal(O.cWeapon('feature-phone'), 'folding-knife');
for (const blunt of ['pipe', 'baton', 'tire-iron', 'chain']) assert.equal(O.cWeapon(blunt), 'baseball-bat');

// ── Act I raises a fight ───────────────────────────────────────────────────
function actOne(templateId, anchor, { crew = ['crew-slot-runner', 'crew-slot-muscle'], nonce = 'test', heat = 0 } = {}) {
  const state = createState(content);
  state.scheduleIndex = 15;
  state.recruited = [...crew];
  state.deployed = [...crew];
  state.pressure[anchor] = heat;
  const template = templateOf(doors, templateId);
  const encounter = { id: `door-15-${templateId}`, door: template.id, anchor_override_id: anchor };
  const team = fighters(state, crewData);
  const authored = content.battles.find(b => b.id === template.fight.battle);
  const staged = stageFight(authored, doorFightStage(encounter, template), places, team.map(m => m.name));
  const outing = O.doorOuting(state, encounter, staged, team.slice(0, authored.player_deployed).map(m => m.id),
    { opening: 'The deal goes bad.', nonce, when: 'DAY 8 · NIGHT', goal: template.fight.goal });
  state.outing = outing;
  recordFight(state, content);
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  return { state, template, outing };
}
/** Night Shift, as the browser opens it: the outing's own save key and URL. */
function nightShift(outing) {
  search = `?campaign=1&outing=${outing.id}&arena=${outing.kit}`;
  localStorage.removeItem(R.OUTING_SAVE_KEY);
  const run = R.loadRun(localStorage.getItem(R.OUTING_SAVE_KEY), content);
  const config = R.launch(run);
  return { run, config, fight: R.makeMission(content, config) };
}
const campaign = () => JSON.parse(localStorage.getItem(SAVE_KEY));
const down = (b, id) => { const u = [...b.players, ...b.enemies].find(x => x.id === id); u.hp = 0; u.alive = false; return u; };

// A fight job: the courtyard ledger, three a side, Aatami in front.
{
  const { state, template, outing } = actOne('hit-courtyard-ledger', 'torkkelinmaki', { heat: 2 });
  assert.equal(outing.goal, 'fight');
  assert.equal(outing.heat, 2, 'the place starts hot');
  assert.equal(outing.when, 'DAY 8 · NIGHT');
  assert.equal(outing.fighters[0], 'aatami', 'Aatami is in the fight while he still fights (owner, 2026-10-24)');
  assert.equal(fightsToday(state, content), 1, 'the fight counts toward the day\'s two when it starts');
  assert.equal(O.outingUrl(outing), `crew-run/?campaign=1&outing=${outing.id}&arena=courtyard`);

  const { run, config, fight } = nightShift(outing);
  const b = fight.battle, m = b.mission;
  void config;
  assert.equal(R.saveKey(), R.OUTING_SAVE_KEY, 'an outing never writes over the ordinary Night Shift roster');
  assert.deepEqual(run.selected, outing.fighters, 'who fights is Act I\'s answer');
  assert.equal(R.toggleCrew(run, outing.fighters[0]), false, 'nobody is chosen in Night Shift');
  assert.equal(config.objective, 'fight');
  assert.ok(b.players.every(p => rowOf(p.cell) === 1), 'a fight: the crew stand by their own way out');
  assert.ok(b.enemies.every(e => rowOf(e.cell) >= 4), 'and they stand across the yard in their own formation');
  assert.equal(b.enemies.filter(e => e.waiting).length, 0, 'no rival arrivals: the noise brings the police');
  assert.equal(m.heat, 2, 'pressure starts at the place\'s heat');
  assert.match(missionCue(b, coordinate).goal, /^Make them back off · 3 still standing/);
  assert.equal(fight.command('auto').ok, false);
  assert.equal(fight.command('talk').ok, false, 'talking is a later step');

  // They break: half their weight down, and the rest run.
  const tough = b.enemies.find(e => e.tough), other = b.enemies.find(e => !e.tough);
  assert.ok(tough && other, 'the courtyard has a tough one');
  down(b, other.id);
  assert.ok(fight.command('brace').ok);
  assert.equal(b.status, 'active', 'one of three down (1 of 4 weight) and they hold');
  down(b, tough.id);
  fight.command('select', 'crew-slot-runner');
  assert.ok(fight.command('brace').ok);
  assert.equal(m.routed, true, 'the tough one down too (3 of 4): the rest break and run');
  assert.ok(b.enemies.filter(e => e.fled).length === 1 && b.enemies.every(e => !e.alive));
  assert.equal(b.status, 'complete');
  assert.equal(b.result, 'win', 'none of them standing is the win');
  assert.ok(b.players.every(p => p.home), 'and the crew go home together');

  assert.ok(R.settle(run, fight));
  assert.equal(run.last.title, 'They ran');
  assert.equal(run.last.end, 'win');
  const after = campaign();
  assert.equal(after.outing.status, 'settled');
  assert.equal(after.outing.result, 'win');
  assert.equal(after.outing.routed, true);
  assert.deepEqual(doorFightEffects(doors, after.outing.door, after.outing.result), template.fight.win, 'the door\'s winning stakes');
  assert.deepEqual(O.outingLines(after.outing), ['They ran. A Torkkelinmäki courtyard is yours.']);
  assert.equal(R.settle(run, fight), false, 'settled exactly once');
}

// Withdraw is in every fight: the standing leave, the downed are missing, the job is lost.
{
  const { outing, template } = actOne('hit-courtyard-ledger', 'torkkelinmaki', { nonce: 'withdraw' });
  const { run, fight } = nightShift(outing), b = fight.battle;
  down(b, 'crew-slot-runner');
  assert.ok(fight.command('withdraw').ok, 'Withdraw is back');
  assert.equal(b.result, 'withdraw');
  assert.equal(b.log[0], 'The crew pulls out. The job is lost.', 'the log says what it costs');
  assert.ok(R.settle(run, fight));
  assert.equal(run.last.title, 'You pulled out');
  const camp = campaign();
  assert.equal(camp.crewStatus['crew-slot-runner'].status, 'missing', 'left on the ground, and no police on the way: missing');
  assert.equal(camp.outing.end, 'withdraw');
  assert.deepEqual(doorFightEffects(doors, camp.outing.door, camp.outing.result), template.fight.lose, 'pulling out pays the losing stakes');
  assert.equal(O.outingLines(camp.outing)[0], 'You pulled out of A Torkkelinmäki courtyard. The job is lost.');
}

// The police: announced at 5, in after the next enemy turn, and the fight stops on one question.
{
  const { outing, template } = actOne('hit-courtyard-ledger', 'torkkelinmaki', { nonce: 'police', heat: 3 });
  const { run, fight } = nightShift(outing), b = fight.battle, m = b.mission;
  // Lan Ho goes down; so does Aatami.
  const lan = down(b, 'crew-slot-muscle');
  down(b, 'aatami');
  assert.ok(fight.command('select', 'crew-slot-runner').ok);
  m.heat = 4;
  assert.ok(fight.command('end').ok);
  assert.ok(m.heat >= 5 && m.police.afterRound !== null, 'pressure reached 5: the police are announced');
  assert.ok(m.police.cells.length >= 2, 'their entry is marked on the board');
  assert.match(b.log.join(' '), /Sirens\. The police come in at the (south|north) end after enemy turn \d+\./);
  assert.equal(m.police.arrived, false, 'announced a round early, never a surprise');
  assert.ok(fight.command('end').ok);
  assert.equal(m.police.arrived, true, 'in after the next enemy turn');
  assert.equal(fight.command('brace').ok, false, 'nothing else until they are answered');
  assert.equal(fight.command('withdraw').ok, false);
  assert.match(missionCue(b, coordinate).goal, /^The police are here/);
  // The question names what each answer costs. Aatami is never taken.
  const backOff = R.policeOutcome(b, 'BACK_OFF');
  assert.ok(backOff.taken.includes(lan.id) && !backOff.taken.includes('aatami'), 'back off: the downed are taken, never Aatami');
  lan.cell = `2,${m.police.y}`;
  const help = R.policeOutcome(b, 'HELP_FRIENDS');
  assert.deepEqual(help.saved, [lan.id], 'help your friends: the standing pull the downed out');
  assert.deepEqual(help.taken, ['crew-slot-runner'], 'and one too close to the police is taken going in');
  assert.ok(fight.command('police', 'HELP_FRIENDS').ok, 'answering costs no one\'s action');
  assert.equal(b.status, 'complete');
  assert.equal(m.end, 'police');
  assert.ok(R.settle(run, fight));
  assert.equal(run.last.title, 'The police came');
  const changes = Object.fromEntries(run.last.changes.map(c => [c.id, c.campaignEffect]));
  assert.deepEqual(changes, { aatami: 'carried', 'crew-slot-runner': 'arrested', 'crew-slot-muscle': 'carried' });
  const camp = campaign();
  assert.ok(camp.arrestedCrew.includes('crew-slot-runner') && !camp.recruited.includes('crew-slot-runner'), 'arrested: gone from the roster, as Act I does it');
  assert.equal(camp.crewStatus.aatami.status, 'wounded', 'Aatami carried out, hurt');
  assert.deepEqual(doorFightEffects(doors, camp.outing.door, camp.outing.result), template.fight.lose, 'the police ending it pays the losing stakes');
  const lines = O.outingLines(camp.outing);
  assert.equal(lines[0], 'The police came to A Torkkelinmäki courtyard.');
  assert.ok(lines.some(l => /taken by the police\. Gone from the crew\.$/.test(l)));
}

// Withdraw with the police already on the way: the downed are found.
{
  const { outing } = actOne('hit-courtyard-ledger', 'torkkelinmaki', { nonce: 'found' });
  const { run, fight } = nightShift(outing), b = fight.battle, m = b.mission;
  down(b, 'crew-slot-muscle');
  fight.command('select', 'crew-slot-runner');
  m.heat = 4;
  fight.command('end');
  assert.ok(m.police.afterRound !== null && !m.police.arrived);
  assert.ok(fight.command('withdraw').ok, 'you can still pull out before they walk in');
  R.settle(run, fight);
  assert.equal(run.last.changes.find(c => c.id === 'crew-slot-muscle').campaignEffect, 'arrested', 'left on the ground with the police coming: taken');
}

// A getaway job: the yard van. The crew are deep in, the way out is behind them.
{
  const { outing } = actOne('pickup-yard-van', 'linjat_yard', { nonce: 'getaway' });
  assert.equal(outing.goal, 'getaway');
  assert.equal(outing.kit, 'yard');
  const { run, fight } = nightShift(outing), b = fight.battle;
  assert.ok(b.players.every(p => rowOf(p.cell) === 5), 'a getaway: the crew stand where it went bad');
  assert.ok(b.enemies.every(e => rowOf(e.cell) < 5), 'and they stand between them and the exit');
  assert.match(missionCue(b, coordinate).goal, /^Get everyone out/);
  b.players.forEach((p, i) => { p.cell = `${i + 1},0`; });
  for (const p of [...b.players]) {
    assert.ok(fight.command('select', p.id).ok);
    assert.ok(fight.command('extract').ok);
  }
  assert.equal(b.result, 'win', 'everyone out is the win');
  assert.ok(b.enemies.some(e => e.alive), 'and nobody had to be beaten');
  R.settle(run, fight);
  assert.equal(run.last.title, 'Everyone got out');
  assert.equal(O.outingLines(campaign().outing)[0], 'Everyone got out of The Linjat service yard.');
}

// A real, unmodified fight opening, played through the board's own commands.
{
  const { outing } = actOne('hit-courtyard-ledger', 'torkkelinmaki', { nonce: 'played' });
  const { run, config, fight } = nightShift(outing), b = fight.battle;
  for (let guard = 0; b.status === 'active' && guard < 40; guard += 1) {
    for (const p of b.players.filter(u => u.alive)) {
      if (b.status !== 'active') break;
      fight.command('select', p.id);
      if (b.enemies.some(e => e.alive && fight.command('attack', e.id).ok)) continue;
      const goal = b.enemies.find(e => e.alive);
      const [gx, gy] = goal.cell.split(',').map(Number);
      for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]]) if (fight.command('move', `${gx + dx},${gy + dy}`).ok) break;
      b.enemies.some(e => e.alive && fight.command('attack', e.id).ok);
    }
    if (b.status !== 'active') break;
    if (b.mission.police.arrived) fight.command('police', 'BACK_OFF');
    else fight.command('end');
  }
  assert.equal(b.status, 'complete', 'the fight ends');
  assert.deepEqual(R.restoreMission(content, config, R.missionCheckpoint(fight)).snapshot(), fight.snapshot(), 'a reload replays the whole fight, police answer included');
  assert.ok(R.settle(run, fight));
  console.log(`  a played opening: ${b.result} (${b.mission.end}) in ${b.round} rounds · pressure ${b.mission.heat} · ${b.mission.routed ? 'they ran' : 'no rout'} · police ${b.mission.police.arrived ? 'came' : 'did not come'}`);
}

// ── a road fight is an outing too (§6.4 step 2, v4.77) ────────────────────
{
  const roadEvents = read('../../content/road-events-v1.json');
  const event = roadEvents.events.find(e => e.id === 'road-retaliation-mccormick');
  const battleId = event.choices.find(c => c.id === 'stand').effects.find(e => e.startsWith('start-battle:')).split(':')[1];
  const state = createState(content);
  state.scheduleIndex = 12;
  state.recruited = ['crew-slot-runner', 'crew-slot-muscle'];
  state.deployed = [...state.recruited];
  const authored = content.battles.find(b => b.id === battleId);
  const team = fighters(state, crewData);
  const staged = stageFight(authored, roadFightStage({ from: 'kurvi', to: 'karhupuisto' }, event, state.scheduleIndex, places), places, team.map(m => m.name));
  const outing = O.roadOuting(state, event, staged, team.slice(0, authored.player_deployed).map(m => m.id), { nonce: 'road', when: 'DAY 7 · NIGHT' });
  assert.equal(outing.kind, 'road');
  assert.equal(outing.road, event.id);
  assert.equal(outing.door, null, 'a road fight has no door');
  assert.equal(outing.goal, 'fight', 'a road fight is always a fight');
  assert.equal(outing.battle, battleId);
  assert.ok(outing.place && outing.rivals.length >= 2, 'staged where it happened, against its people');
  assert.equal(outing.by, event.by ?? null, 'by the family that came for you');
  state.outing = outing;
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  const { run, fight } = nightShift(outing);
  const b = fight.battle;
  assert.equal(b.mission.goal, 'fight', 'Night Shift plays it as a fight');
  assert.ok(b.enemies.filter(e => e.rival).length >= 2, 'the people who came for you are on the board');
  assert.ok(fight.command('withdraw').ok, 'Withdraw is there in a road fight too');
  assert.ok(R.settle(run, fight));
  const camp = campaign();
  assert.equal(camp.outing.status, 'settled');
  assert.equal(camp.outing.end, 'withdraw', 'and it comes back to Act I once, as a road fight');
  assert.equal(camp.outing.kind, 'road');
}

// ── a mission battle is an outing too (§6.4 step 5, v4.79) ────────────────
{
  const { placeAt } = await import('../js/v3/places.js?v=1');
  const encounterOf = id => content.encounters.find(e => e.id === id);
  const missionOf = id => content.missions.find(m => m.id === id);
  for (const [encId, choiceId, kit, names] of [['enc-bear-path', 'hold-path', 'park', /Rinne|Leko/], ['enc-courtyard-last-call', 'take-positions', 'courtyard', /Kettunen|Peltola|Haddad/]]) {
    const encounter = encounterOf(encId);
    const battleId = encounter.choices.find(c => c.id === choiceId).effects.find(e => e.startsWith('start-battle:')).split(':')[1];
    const authored = content.battles.find(b => b.id === battleId);
    const place = placeAt(places, authored.location_anchor_id);
    assert.ok(place, `${battleId} has a fight place at ${authored.location_anchor_id}`);
    const state = createState(content);
    state.scheduleIndex = 10;
    state.recruited = ['crew-slot-runner', 'crew-slot-muscle', 'crew-slot-wheels'];
    state.deployed = [...state.recruited];
    const team = fighters(state, crewData);
    const staged = { ...authored, place: { anchor: authored.location_anchor_id, name: place.name, way_out: place.way_out, kit: place.kit, by: null, side: 'them' } };
    const outing = O.missionOuting(state, encounter, encounter.mission_id, staged, team.slice(0, authored.player_deployed).map(m => m.id), { nonce: 'mission', when: 'DAY 6 · NIGHT' });
    assert.equal(outing.kind, 'mission');
    assert.equal(outing.mission, encounter.mission_id);
    assert.equal(outing.door, null, 'a mission battle has no door');
    assert.equal(outing.goal, 'fight', 'a mission battle is a fight');
    assert.equal(outing.kit, kit, `${encId} is fought in the ${kit}, its own place`);
    assert.ok(outing.rivals.length === authored.opponents.length && outing.rivals.every(r => names.test(r.name)), 'against the battle\'s own, authored people');
    // The board's stakes, read the same way (battle.js resultEffects).
    const mission = missionOf(encounter.mission_id);
    assert.deepEqual(O.missionStakes(mission, 'win'), mission.success_effects);
    assert.deepEqual(O.missionStakes(mission, 'withdraw'), mission.partial_effects, 'pulling out is the mission\'s partial');
    assert.deepEqual(O.missionStakes(mission, 'loss'), mission.failure_effects);
    state.outing = outing;
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    const { run, fight } = nightShift(outing);
    const b = fight.battle;
    assert.equal(b.mission.goal, 'fight', 'Night Shift plays it as a fight');
    assert.ok(b.enemies.filter(e => e.rival).every(e => names.test(e.name)), 'the authored people are on the board');
    // Someone hurt who gets out: the courtyard receipts leave them critical.
    const hurt = b.players.find(p => p.id !== content.protagonist?.id);
    hurt.hp = 1;
    assert.ok(fight.command('withdraw').ok, 'Withdraw is there in a mission battle too');
    assert.ok(R.settle(run, fight));
    const camp = campaign();
    assert.equal(camp.outing.status, 'settled');
    assert.equal(camp.outing.kind, 'mission', 'and it comes back to Act I once, as a mission battle');
    assert.equal(camp.outing.end, 'withdraw');
    const status = camp.crewStatus[hurt.id];
    if (battleId === 'battle-courtyard-3v3') assert.equal(status.status, 'critical', `the courtyard receipts leave ${hurt.id} critical`);
    else assert.equal(status.status, 'wounded', 'only the courtyard receipts leave anyone critical');
  }
}

// Reopening a settled fight, or one from another campaign, is refused.
{
  localStorage.removeItem(R.OUTING_SAVE_KEY);
  assert.throws(() => R.loadRun(null, content), /already settled/);
  search = '?campaign=1&outing=not-a-fight';
  assert.throws(() => R.loadRun(null, content), /not in this campaign/);
}

console.log('C.19 outing v4.78: a job per fight (5 doors fight, 4 get away), road fights and both mission battles as outings, they break and run, Withdraw in every fight, the police announced and answered with Act I\'s two postures, arrests through Act I, Aatami never taken, and the receipt once — passed.');
