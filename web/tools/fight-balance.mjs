// How Act I's fights play (ROADMAP.md G1). A measuring instrument, never a
// gate: every Act I fight (the door fights, the road fights, the two mission
// battles) played through Night Shift's own commands by simple policies, over
// seeds and the place's starting heat. It prints one JSON row per fight,
// heat (0, 2 and 3) and policy: win/withdraw/loss rates, rounds, HP lost,
// average downs, the percentage of fights with a down, rout and police rates.
//
//   node web/tools/fight-balance.mjs              # the table, 12 seeds
//   SEEDS=30 node web/tools/fight-balance.mjs     # more seeds
//   TRACE=door:hit-courtyard-ledger node web/tools/fight-balance.mjs   # one fight's log
//
// Policies: `fight` closes on the nearest rival and swings (the floor a
// careless player reaches); `run` heads for the exit row and extracts (a
// getaway's obvious line); `careful` reads the rivals' plans and plays
// against them (ROADMAP §5's third way of playing). If the floor wins
// everything at no cost, the fight has no decision in it; that was the
// 2026-10-25 reading. If careful does no better than careless, thinking does
// not pay, and that is the other half of the question.
//
//   TABLE=1 node web/tools/fight-balance.mjs      # ROADMAP §5's nine rows against their targets
//   TRACE=door:hit-courtyard-ledger POLICY=careful node web/tools/fight-balance.mjs
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
const R = await import('../crew-run/run.js?v=16');
const T = await import('../fight-module/tactics.js?v=9');
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
// Policy: careful. What a thinking player does with what the screen shows.
// The rivals' plans are on the board before the crew moves, so for each person
// in turn it tries every cell they can reach and everything they can do there
// (swing before the step or after it, Brace, get a friend up, step out at the
// exit, or nothing), plays the rivals' shown plans against each (`threats`,
// the same preview the game draws) and takes the best. Worth having: a rival
// put down, the tough first, the rest broken. Counted against: HP the plans
// would take and anyone they would put down. It reads only what the player can
// see (plans, HP, guard, the objective's rule for when they break), never the
// dice. On a getaway it heads out and swings only when that costs nothing,
// because the field notes say to leave them standing and a body is +2 on the
// police clock. Answering the police, it takes whichever answer costs fewer people.
const ROUT_AT = R.ROUT_AT ?? 1 / 2;
const weight = e => (e.tough ? 2 : 1);
const dist = (a, c) => { const [x, y] = a.split(',').map(Number), [u, v] = c.split(',').map(Number); return Math.abs(x - u) + Math.abs(y - v); };
function sideBroken(b) {
  const side = b.enemies.filter(e => e.rival), total = side.reduce((n, e) => n + weight(e), 0);
  const down = side.filter(e => !e.alive && !e.fled).reduce((n, e) => n + weight(e), 0);
  return !side.some(e => e.alive) || down >= total * ROUT_AT;
}
// What the shown plans would cost the crew this enemy turn.
function outlook(b) {
  if (b.mission.goal === 'fight' && sideBroken(b)) return { hp: 0, downs: 0, ends: true };
  const { totals } = T.threats(b);
  let hp = 0, downs = 0;
  for (const p of b.players) { const t = totals[p.id]; if (!t || !p.alive) continue; hp += Math.min(p.hp, t.hp); if (t.hp >= p.hp) downs += 1; }
  return { hp, downs, ends: false };
}
function carefulChoices(b, p, to) {
  const out = [{ type: 'none' }, { type: 'brace' }];
  for (const e of b.enemies.filter(e => e.alive)) {
    const before = T.forecast(b, p, e, p.cell), after = T.forecast(b, p, e, to);
    if (before.valid) out.push({ type: 'attack', target: e.id, first: true, f: before });
    if (to !== p.cell && after.valid) out.push({ type: 'attack', target: e.id, first: false, f: after });
  }
  for (const a of b.players) if (!a.alive && !a.evacuated && !a.taken && !a.helped && a.id !== p.id && dist(a.cell, to) <= 1 && !b.players.concat(b.enemies).some(v => v.alive && v.cell === a.cell)) out.push({ type: 'help', target: a.id });
  if (b.mission.goal === 'getaway' && rowOf(to) === 0) out.push({ type: 'extract' });
  return out;
}
function carefulScore(b, p, to, c) {
  const sim = { ...b, log: [], players: b.players.map(u => ({ ...u })), enemies: b.enemies.map(u => ({ ...u })) };
  const me = sim.players.find(u => u.id === p.id), goal = b.mission.goal;
  let gain = 0;
  if (c.type === 'attack') {
    const t = sim.enemies.find(u => u.id === c.target), odds = c.f.chance / 100;
    gain += odds * c.f.hpDamage * (t.tough ? 1.5 : 1);
    if (odds >= 0.5) { t.hp -= c.f.hpDamage; t.guard -= c.f.guardDamage; t.alive = t.hp > 0; if (!t.alive) gain += t.tough ? 4 : 2; }
    // A getaway is won by leaving. The field notes say so ("Leave opponents
    // alive if you can"), and a body is +2 pressure on the police clock.
    if (goal === 'getaway') gain = 0.2 * odds * c.f.hpDamage - (t.alive ? 0 : 1);
  }
  if (c.type === 'brace') me.guard = Math.min(4, me.guard + 2);
  if (c.type === 'help') { const a = sim.players.find(u => u.id === c.target); a.alive = true; a.hp = p.kit === 'medical' ? 3 : 1; gain += 4; }
  me.cell = to;
  if (c.type === 'extract') { me.alive = false; me.evacuated = true; gain += 8; }
  const o = outlook(sim);
  let score = gain - 1.5 * o.hp - 4 * o.downs + (o.ends ? 6 : 0);
  if (goal === 'getaway' && c.type !== 'extract') score -= 1.0 * rowOf(to);
  if (goal === 'fight') { const near = sim.enemies.filter(e => e.alive).map(e => dist(to, e.cell)); if (near.length) score -= 0.1 * Math.min(...near); }
  return score;
}
function carefulPolicy(fight) {
  const b = fight.battle;
  for (const p of b.players.filter(u => u.alive && !u.evacuated)) {
    if (b.status !== 'active') return;
    if (!fight.command('select', p.id).ok) continue;
    let best = null;
    for (const to of T.routes(b, p).keys()) for (const c of carefulChoices(b, p, to)) {
      const score = carefulScore(b, p, to, c);
      if (!best || score > best.score) best = { to, c, score };
    }
    if (!best) continue;
    const act = () => (best.c.type === 'none' ? true : fight.command(best.c.type, best.c.target).ok);
    if (best.c.type === 'attack' && best.c.first) { act(); if (b.status === 'active' && p.alive && best.to !== p.cell) fight.command('move', best.to); }
    else { if (best.to !== p.cell) fight.command('move', best.to); if (b.status === 'active') act(); }
  }
}
carefulPolicy.police = b => (R.policeOutcome(b, 'HELP_FRIENDS').taken.length < R.policeOutcome(b, 'BACK_OFF').taken.length ? 'HELP_FRIENDS' : 'BACK_OFF');
const POLICIES = { fight: fightPolicy, run: runPolicy, careful: carefulPolicy };

function play(outing, policy) {
  const fight = nightShift(outing), b = fight.battle;
  const hp0 = b.players.reduce((n, p) => n + p.hp, 0);
  for (let guard = 0; b.status === 'active' && guard < 40; guard += 1) {
    policy(fight);
    if (b.status !== 'active') break;
    if (b.mission.police.arrived && !b.mission.police.resolved) fight.command('police', policy.police?.(b) ?? 'BACK_OFF');
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
  const policy = POLICIES[process.env.POLICY || 'fight'];
  for (let guard = 0; b.status === 'active' && guard < 40; guard += 1) {
    policy(fight); if (b.status !== 'active') break;
    if (b.mission.police.arrived && !b.mission.police.resolved) fight.command('police', policy.police?.(b) ?? 'BACK_OFF'); else fight.command('end');
  }
  console.log([...b.log].reverse().join('\n'));
  console.log('RESULT', b.result, 'round', b.round);
  process.exit(0);
}
const SEEDS = Number(process.env.SEEDS || 12);
const rows = [];
// ONLY=getaway (a pattern on the fight's name or goal) and POLICY=careful narrow a run while tuning.
const only = process.env.ONLY ? new RegExp(process.env.ONLY) : null, onlyPolicy = process.env.POLICY;
for (const f of fights.filter(f => !only || only.test(`${f.name} ${f.goal}`))) for (const heat of [0, 2, 3]) for (const policyName of (f.goal === 'getaway' ? ['run', 'careful', 'fight'] : ['fight', 'careful']).filter(p => !onlyPolicy || p === onlyPolicy)) {
  const res = [];
  for (let s = 0; s < SEEDS; s += 1) res.push(play(f.make(heat, `m${s}h${heat}`), POLICIES[policyName]));
  const n = res.length, pct = k => Math.round(100 * res.filter(k).length / n);
  const avg = k => (res.reduce((a, r) => a + r[k], 0) / n).toFixed(1);
  rows.push({ fight: f.name, goal: f.goal, heat, policy: policyName, win: pct(r => r.result === 'win'), withdraw: pct(r => r.result === 'withdraw'), loss: pct(r => r.result === 'loss'), rounds: avg('rounds'), routed: pct(r => r.routed), police: pct(r => r.police), hpLost: avg('hpLost'), downs: avg('downs'), downed: pct(r => r.downs > 0), stuck: pct(r => r.stuck) });
}
if (!process.env.TABLE) { console.log(JSON.stringify(rows)); process.exit(0); }

// ROADMAP §5's nine rows. Each figure is the mean over the fights and the
// three heats; the police rows read the 15 fights as each is played by
// default (careless for a fight job, straight out for a getaway).
const mean = (pick, k) => { const s = rows.filter(pick); return s.reduce((n, r) => n + Number(r[k]), 0) / s.length; };
const job = p => r => r.goal === 'fight' && r.policy === p, out = p => r => r.goal === 'getaway' && r.policy === p;
const main = h => r => r.heat === h && (r.goal === 'fight' ? r.policy === 'fight' : r.policy === 'run');
const n0 = x => x.toFixed(0), n1 = x => x.toFixed(1), within = (x, lo, hi) => x >= lo && x <= hi;
const won = mean(job('fight'), 'win'), rounds = mean(job('fight'), 'rounds'), hp = mean(job('fight'), 'hpLost'), downed = mean(job('fight'), 'downed');
const cWon = mean(job('careful'), 'win'), cHp = mean(job('careful'), 'hpLost');
const run = mean(out('run'), 'win'), gWon = mean(out('careful'), 'win');
const gRounds = mean(out('careful'), 'rounds') - mean(out('run'), 'rounds'), gHp = mean(out('careful'), 'hpLost') - mean(out('run'), 'hpLost');
const sign = x => (x >= 0 ? '+' : '') + x;
const table = [
  [1, 'Fight jobs, careless: won', `${n0(won)}%`, '60-75%', within(won, 60, 75)],
  [2, 'Fight jobs, careless: rounds', n1(rounds), '4-6', within(rounds, 4, 6)],
  [3, 'Fight jobs, careless: crew HP lost', n1(hp), '2-4', within(hp, 2, 4)],
  [4, 'Fight jobs, careless: someone goes down', `${n0(downed)}%`, '20-30%', within(downed, 20, 30)],
  [5, 'Fight jobs, careful over careless', `${sign(n0(cWon - won))} pts won, ${n1(hp - cHp)} HP less lost`, '+15 pts, 1+ HP less', cWon - won >= 15 && hp - cHp >= 1],
  [6, 'Getaways, straight out: won', `${n0(run)}%`, 'under 50%', run < 50],
  [7, 'Getaways, careful: won', `${n0(gWon)}%, ${sign(n1(gRounds))} rounds, ${sign(n1(gHp))} HP against straight out`, '70%+, at a cost', gWon >= 70 && (gRounds >= 1 || gHp >= 1)],
  [8, 'Police arrive, heat 0', `${n0(mean(main(0), 'police'))}% of fights`, 'under 20%', mean(main(0), 'police') < 20],
  [9, 'Police arrive, heat 3', `${n0(mean(main(3), 'police'))}% of fights`, 'over 50%', mean(main(3), 'police') > 50],
];
for (const [i, what, now, target, ok] of table) console.log(`${ok ? 'MET' : '---'} ${i}. ${what}: ${now} (target ${target})`);
console.log(`${table.filter(r => r[4]).length} of 9 targets met. ${SEEDS} seeds, heats 0, 2 and 3.`);
