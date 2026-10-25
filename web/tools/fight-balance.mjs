// How Act I's fights play (ROADMAP.md G1). A measuring instrument, never a
// gate: every Act I fight (the door fights, the road fights, the two mission
// battles) played through Night Shift's own commands by simple policies, over
// seeds and the place's starting heat. It prints one JSON row per fight,
// heat and policy: win/withdraw/loss rates, rounds, HP lost, downs, rout and
// police rates.
//
//   node web/tools/fight-balance.mjs              # the table, 12 seeds
//   SEEDS=30 node web/tools/fight-balance.mjs     # more seeds
//   TRACE=door:hit-courtyard-ledger node web/tools/fight-balance.mjs   # one fight's log
//
// Policies: `fight` closes on the nearest rival and swings (the floor a
// careless player reaches); `run` heads for the exit row and extracts (a
// getaway's obvious line). If the floor wins everything at no cost, the fight
// has no decision in it; that was the 2026-10-25 reading.
import fs from 'node:fs';

const store = new Map();
globalThis.localStorage = { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) };
let search = '';
globalThis.location = { get search() { return search; } };

const read = path => JSON.parse(fs.readFileSync(new URL(path, import.meta.url)));
const content = read('../../content/era1-slice-v1.json');
const places = read('../../content/places-v1.json');
const doors = read('../../content/doors-v1.json');
const roadEvents = read('../../content/road-events-v1.json');
const { createState, SAVE_KEY, fighters } = await import('../js/v3/state.js?v=10');
const { stageFight, doorFightStage, roadFightStage, placeAt } = await import('../js/v3/places.js?v=1');
const { templateOf } = await import('../js/v3/doors.js?v=4');
const O = await import('../js/v3/outing.js?v=5');
const R = await import('../crew-run/run.js?v=14');
const { nameFrom } = await import('../../people/roster.mjs?v=1');
const crewData = { content, crew: new Map(content.crew.map(c => [c.id, { ...c, name: c.name ?? nameFrom(c.id) }])) };
const rowOf = cell => Number(cell.split(',')[1]);

function nightShift(outing) {
  search = `?campaign=1&outing=${outing.id}&arena=${outing.kit}`;
  localStorage.removeItem(R.OUTING_SAVE_KEY);
  const run = R.loadRun(localStorage.getItem(R.OUTING_SAVE_KEY), content);
  return R.makeMission(content, R.launch(run));
}
function baseState(heat, anchor) {
  const state = createState(content);
  state.scheduleIndex = 15;
  state.recruited = ['crew-slot-runner', 'crew-slot-muscle', 'crew-slot-wheels'];
  state.deployed = [...state.recruited];
  if (anchor) state.pressure[anchor] = heat;
  return state;
}
// Policy: close on the nearest rival and swing; answer the police by backing off.
function fightPolicy(fight) {
  const b = fight.battle;
  for (const p of b.players.filter(u => u.alive)) {
    if (b.status !== 'active') return;
    fight.command('select', p.id);
    if (b.enemies.some(e => e.alive && fight.command('attack', e.id).ok)) continue;
    const goal = b.enemies.find(e => e.alive); if (!goal) return;
    const [gx, gy] = goal.cell.split(',').map(Number);
    for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]]) if (fight.command('move', `${gx + dx},${gy + dy}`).ok) break;
    b.enemies.some(e => e.alive && fight.command('attack', e.id).ok);
  }
}
// Policy: a getaway — everyone heads for row 0 and extracts; swing only if blocked.
function runPolicy(fight) {
  const b = fight.battle;
  for (const p of b.players.filter(u => u.alive && !u.evacuated)) {
    if (b.status !== 'active') return;
    fight.command('select', p.id);
    if (rowOf(p.cell) === 0 && fight.command('extract').ok) continue;
    const [x, y] = p.cell.split(',').map(Number);
    let moved = false;
    for (let ty = 0; ty < y && !moved; ty += 1) for (const tx of [x, x - 1, x + 1, x - 2, x + 2]) if (fight.command('move', `${tx},${ty}`).ok) { moved = true; break; }
    if (rowOf(p.cell) === 0 && fight.command('extract').ok) continue;
    b.enemies.some(e => e.alive && fight.command('attack', e.id).ok);
  }
}
function play(outing, policy) {
  const fight = nightShift(outing), b = fight.battle;
  const hp0 = b.players.reduce((n, p) => n + p.hp, 0);
  for (let guard = 0; b.status === 'active' && guard < 40; guard += 1) {
    policy(fight);
    if (b.status !== 'active') break;
    if (b.mission.police.arrived && !b.mission.police.resolved) fight.command('police', 'BACK_OFF');
    else fight.command('end');
  }
  const hp1 = b.players.reduce((n, p) => n + Math.max(0, p.alive || p.evacuated ? p.hp : 0), 0);
  return { result: b.result, end: b.mission.end, rounds: b.round, routed: b.mission.routed, police: b.mission.police.arrived, hpLost: hp0 - hp1, downs: b.players.filter(p => p.wasDown || p.taken || (!p.alive && !p.evacuated)).length, stuck: b.status === 'active' };
}

const fights = [];
for (const t of doors.templates.filter(t => t.fight)) {
  const anchor = t.anchors?.[0] ?? 'torkkelinmaki';
  fights.push({ name: `door:${t.id}`, goal: t.fight.goal, make: (heat, nonce) => {
    const state = baseState(heat, anchor);
    const encounter = { id: `door-15-${t.id}`, door: t.id, anchor_override_id: anchor };
    const team = fighters(state, crewData);
    const authored = content.battles.find(b => b.id === t.fight.battle);
    const staged = stageFight(authored, doorFightStage(encounter, t), places, team.map(m => m.name));
    const outing = O.doorOuting(state, encounter, staged, team.slice(0, authored.player_deployed).map(m => m.id), { nonce, goal: t.fight.goal });
    state.outing = outing; localStorage.setItem(SAVE_KEY, JSON.stringify(state)); return outing; } });
}
for (const ev of roadEvents.events.filter(e => e.choices?.some(c => c.effects?.some(x => String(x).startsWith('start-battle:'))))) {
  fights.push({ name: `road:${ev.id}`, goal: 'fight', make: (heat, nonce) => {
    const state = baseState(heat, 'karhupuisto');
    const battleId = ev.choices.flatMap(c => c.effects ?? []).find(x => String(x).startsWith('start-battle:')).split(':')[1];
    const team = fighters(state, crewData);
    const authored = content.battles.find(b => b.id === battleId);
    const staged = stageFight(authored, roadFightStage({ from: 'kurvi', to: 'karhupuisto' }, ev, state.scheduleIndex, places), places, team.map(m => m.name));
    const outing = O.roadOuting(state, ev, staged, team.slice(0, authored.player_deployed).map(m => m.id), { nonce });
    state.outing = outing; localStorage.setItem(SAVE_KEY, JSON.stringify(state)); return outing; } });
}
for (const [encId, choice] of [['enc-bear-path', 'hold-path'], ['enc-courtyard-last-call', 'take-positions']]) {
  fights.push({ name: `mission:${encId}`, goal: 'fight', make: (heat, nonce) => {
    const encounter = content.encounters.find(e => e.id === encId);
    const battleId = encounter.choices.find(c => c.id === choice).effects.find(x => x.startsWith('start-battle:')).split(':')[1];
    const authored = content.battles.find(b => b.id === battleId);
    const state = baseState(heat, authored.location_anchor_id);
    const place = placeAt(places, authored.location_anchor_id);
    const team = fighters(state, crewData);
    const staged = { ...authored, place: { anchor: authored.location_anchor_id, name: place.name, way_out: place.way_out, kit: place.kit, by: null, side: 'them' } };
    const outing = O.missionOuting(state, encounter, encounter.mission_id, staged, team.slice(0, authored.player_deployed).map(m => m.id), { nonce });
    state.outing = outing; localStorage.setItem(SAVE_KEY, JSON.stringify(state)); return outing; } });
}

if (process.env.TRACE) {
  const f = fights.find(x => x.name === process.env.TRACE);
  const fight = nightShift(f.make(0, 'trace')), b = fight.battle;
  console.log('players', b.players.map(p => `${p.name} hp${p.hp} g${p.guard} ${p.cell}`).join(' | '));
  console.log('rivals ', b.enemies.map(e => `${e.name} hp${e.hp} g${e.guard} ${e.cell} ${e.tough ? 'tough' : ''}`).join(' | '));
  for (let guard = 0; b.status === 'active' && guard < 40; guard += 1) { fightPolicy(fight); if (b.status !== 'active') break; fight.command('end'); }
  console.log([...b.log].reverse().join('\n'));
  console.log('RESULT', b.result, 'round', b.round);
  process.exit(0);
}
const SEEDS = Number(process.env.SEEDS || 12);
const rows = [];
for (const f of fights) for (const heat of [0, 2]) for (const policyName of f.goal === 'getaway' ? ['run', 'fight'] : ['fight']) {
  const res = [];
  for (let s = 0; s < SEEDS; s += 1) res.push(play(f.make(heat, `m${s}h${heat}`), policyName === 'run' ? runPolicy : fightPolicy));
  const n = res.length, pct = k => Math.round(100 * res.filter(k).length / n);
  const avg = k => (res.reduce((a, r) => a + r[k], 0) / n).toFixed(1);
  rows.push({ fight: f.name, goal: f.goal, heat, policy: policyName, win: pct(r => r.result === 'win'), withdraw: pct(r => r.result === 'withdraw'), loss: pct(r => r.result === 'loss'), rounds: avg('rounds'), routed: pct(r => r.routed), police: pct(r => r.police), hpLost: avg('hpLost'), downs: avg('downs'), stuck: pct(r => r.stuck) });
}
console.log(JSON.stringify(rows));
