#!/usr/bin/env node
/**
 * a1-parity.mjs — Option A (TURF base) against Option C (C.19) on ONE request.
 *
 *   node web/test/a1-parity.mjs            the gate
 *   node web/test/a1-parity.mjs --report   the gate, then the measurement table
 *
 * PIRITORI_LONG_TERM_SCOPE.md, "Now" step 3: "Measure A/Turf against the
 * contract." Two different kinds of output, kept apart on purpose:
 *
 *   THE GATE asserts what must be true for the comparison to mean anything:
 *   both candidates accept the frozen request, both finish it, both answer in
 *   the result vocabulary, both are deterministic from the seed, and A's list
 *   of things it cannot represent has not grown behind anyone's back.
 *
 *   THE REPORT measures how far apart the two RULE SETS are, by asking each
 *   candidate's own functions the same question about the same board: where
 *   can this fighter go, who can see whom, what are the odds and the damage.
 *   Those numbers are findings, not pass/fail. A.1 runs TURF's rules as they
 *   are; closing the gap (or deciding which side of it is right) is A.2's
 *   decision to make with them in hand, not this file's.
 */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { RESULT_VOCABULARY, RESULT_VERSION } from '../../port/battle-contract.mjs';
import { cSessionFromRequest, cResult } from '../../port/battle-fixture.mjs';
import { routes, forecast, sightCells } from '../fight-module/tactics.js?v=7';
import { createTurfSession } from '../turf-base/adapter.mjs';
import { moveRange, hasLOS, key } from '../vendor/turf/grid.js?v=6';
import { forecastAttack } from '../vendor/turf/combat.js?v=22';

const ROOT = new URL('../../', import.meta.url);
const REQ = JSON.parse(fs.readFileSync(new URL('fixtures/battle-request-lab6-v1.json', ROOT)));
const REPORT = process.argv.includes('--report');

execFileSync(process.execPath, [new URL('web/tools/vendor-turf.mjs', ROOT).pathname, '--check'], { stdio: 'inherit' });

// ── helpers ─────────────────────────────────────────────────────────
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
/** The same fighters, cover and rules, standing somewhere else. */
function scatter(req, seed) {
  const r = rng(seed), { cols, rows } = req.rules.grid;
  const blocked = new Set(req.cover.filter(c => c.kind === 'full').map(c => c.cell)), used = new Set();
  const out = structuredClone(req);
  for (const u of out.units) {
    let c; do c = `${Math.floor(r() * cols)},${Math.floor(r() * rows)}`; while (blocked.has(c) || used.has(c));
    used.add(c); u.cell = c;
  }
  return out;
}
const playOut = (s, script) => { let n = 0; while (s.status === 'active' && n < 40) { s.command(script); n++; } return n; };
const pct = (a, b) => (b ? (100 * a / b).toFixed(1) + '%' : '—');
const status = s => s.battle ? s.battle.status : s.status;
const wrap = s => new Proxy(s, { get: (t, k) => k === 'status' ? status(t) : t[k] });

// ── THE GATE ────────────────────────────────────────────────────────
const LOSSY_KINDS = ['guard', 'items', 'cover', 'command brace', 'command item'];
{
  const a = createTurfSession(REQ);
  const kinds = new Set(a.lossy.map(l => l.startsWith('command') ? l.split(' (')[0] : l.includes(': guard') ? 'guard' : l.includes(': items') ? 'items' : l.startsWith('cover') ? 'cover' : l));
  assert.deepEqual([...kinds].sort(), [...LOSSY_KINDS].sort(),
    `A's unrepresentable list changed: ${[...kinds].join(' | ')} — a new kind is a new rule TURF cannot carry; record it before accepting it`);
  assert.equal(a.lossy.filter(l => l.startsWith('cover')).length, REQ.cover.filter(c => c.kind === 'partial').length);
}
const outcomes = { A: [], C: [] };
for (let seed = 1; seed <= 60; seed++) {
  const req = { ...REQ, seed: Math.imul(seed, 2654435761) >>> 0 };
  for (const [name, make] of [['A', () => createTurfSession(req)], ['C', () => wrap(cSessionFromRequest(req))]]) {
    const runs = [0, 1].map(() => { const s = make(); playOut(s, 'auto'); return s; });
    const res = runs.map(s => (name === 'A' ? s.result() : { ...cResult(s, req), candidate: 'C' }));
    assert.deepEqual(res[0], res[1], `${name} is not deterministic from seed ${req.seed}`);
    const r = res[0];
    assert.equal(r.schema_version, RESULT_VERSION);
    assert.ok(RESULT_VOCABULARY.includes(r.result), `${name} seed ${req.seed}: '${r.result}' — did not finish, or answered outside the vocabulary`);
    assert.deepEqual([...r.survivors, ...r.downed].sort(), REQ.units.map(u => u.id).sort(), `${name} lost track of a fighter`);
    outcomes[name].push(r);
  }
}
// The two exits that are not a knockout, in both.
for (const exit of ['withdraw', 'talk']) {
  const a = createTurfSession(REQ), c = wrap(cSessionFromRequest(REQ));
  for (const s of [a, c]) { s.command('end'); assert.ok(s.command(exit).ok, `${exit} refused`); }
  assert.equal(a.result().result, c.battle.result, `${exit}: A and C disagree on the word`);
}
// Standing still loses, in both, and both call it the same word — TURF's
// own word is 'lose', so this is the gate on the translation.
for (const [name, s] of [['A', createTurfSession(REQ)], ['C', wrap(cSessionFromRequest(REQ))]]) {
  playOut(s, 'end');
  assert.equal(name === 'A' ? s.result().result : s.battle.result, 'loss', `${name}: a crew that never acts should lose`);
}
// Brace and item are C verbs TURF has no rule for: A must REFUSE them, not
// silently do something else.
{ const a = createTurfSession(REQ); assert.equal(a.command('brace').ok, false); assert.equal(a.command('item').ok, false); }
console.log(`a1-parity: gate ok — both candidates finished ${outcomes.A.length} seeded fights from one request; results agree in shape and vocabulary`);

// ── THE REPORT ──────────────────────────────────────────────────────
if (REPORT) {
  const BOARDS = 200;
  const measure = (transform = r => r) => {
  const m = { reach: [0, 0], reachUnits: [0, 0], sight: [0, 0], sightC: 0, sightA: 0, sightCover: [0, 0], odds: [0, 0], dmg: [0, 0], raw: [0, 0], validBoth: 0, validC: 0, validA: 0, plans: [0, 0] };
  for (let i = 0; i < BOARDS; i++) {
    const req = transform(i ? scatter(REQ, i) : structuredClone(REQ));
    const c = cSessionFromRequest(req), b = c.battle, a = createTurfSession(req), st = a.state;
    const cu = id => b.players.concat(b.enemies).find(u => u.id === id);
    // 1. Reach.
    for (const u of req.units) {
      const cr = new Set(routes(b, cu(u.id)).keys()), ar = new Set(moveRange(st, a.unitOf(u.id)).keys());
      const all = new Set([...cr, ...ar]); let same = 0; for (const k of all) if (cr.has(k) === ar.has(k)) same++;
      m.reach[0] += same; m.reach[1] += all.size;
      m.reachUnits[0] += same === all.size ? 1 : 0; m.reachUnits[1]++;
    }
    // 2. Sight between every pair of fighters (fighters DO block C's sight).
    for (const u of req.units) for (const v of req.units) if (u.side !== v.side) {
      const cs = !sightCells(u.cell, v.cell).some(k => b.cover.get(k)?.hardBlock || b.players.concat(b.enemies).some(w => w.alive && w.id !== u.id && w.id !== v.id && w.cell === k));
      const as = hasLOS(st, a.unitOf(u.id), a.unitOf(v.id));
      m.sight[0] += cs === as ? 1 : 0; m.sight[1]++; m.sightC += cs; m.sightA += as;
      // The same question with fighters taken out of C's blockers: what is
      // left is the two ALGORITHMS disagreeing about cover alone.
      const cc = !sightCells(u.cell, v.cell).some(k => b.cover.get(k)?.hardBlock);
      m.sightCover[0] += cc === as ? 1 : 0; m.sightCover[1]++;
    }
    // 3. Odds and damage, in place, for every opposing pair both might shoot.
    for (const u of req.units) for (const v of req.units) if (u.side !== v.side) {
      const f = forecast(b, cu(u.id), cu(v.id)), au = a.unitOf(u.id), av = a.unitOf(v.id);
      const inRange = Math.abs(au.x - av.x) + Math.abs(au.y - av.y) <= au.weapon.range && hasLOS(st, au, av);
      const g = forecastAttack(st, au, av, au.weapon);
      m.validC += f.valid; m.validA += inRange;
      if (f.valid && inRange) {
        m.validBoth++;
        m.odds[0] += Math.round(g.chance * 100) === f.chance ? 1 : 0; m.odds[1]++;
        m.dmg[0] += g.damage === f.hpDamage ? 1 : 0; m.dmg[1]++;
        // The weapon's own number before guard: proves the mapping, so a gap
        // in the row above is guard and not a transcription error.
        m.raw[0] += g.damage === f.damage ? 1 : 0; m.raw[1]++;
      }
    }
    // 4. Rival plans: same target and same destination?
    for (const p of b.plans) {
      const t = st.telegraph.get(a.unitOf(p.id).uid);
      const at = t?.targetUid ? a.idOf(t.targetUid) : null, to = t?.moveTo ? key(t.moveTo.x, t.moveTo.y) : cell(a.unitOf(p.id));
      m.plans[0] += at === (p.target ?? null) && to === p.to ? 1 : 0; m.plans[1]++;
    }
  }
  return m;
  };
  const m = measure();
  // THE CONTROL: the same 200 boards with partial cover taken out of the
  // request. If the reach and odds rows go to 100% here, partial cover is
  // the WHOLE of their gap rather than merely part of it.
  const n = measure(r => ({ ...r, cover: r.cover.filter(c => c.kind === 'full') }));
  function cell(u) { return `${u.x},${u.y}`; }
  const tally = rs => { const o = Object.fromEntries(RESULT_VOCABULARY.map(k => [k, 0])); let rounds = 0, left = 0; for (const r of rs) { o[r.result]++; rounds += r.rounds; left += r.survivors.filter(id => REQ.units.find(u => u.id === id).side === 'player').length; } return { ...o, rounds: (rounds / rs.length).toFixed(1), crewLeft: (left / rs.length).toFixed(2) }; };
  const tA = tally(outcomes.A), tC = tally(outcomes.C);
  console.log(`\nA.1 parity — ${REQ.id}, rules ${REQ.rules.id}, TURF v${JSON.parse(fs.readFileSync(new URL('web/vendor/turf/SOURCE.json', ROOT))).turf_version}, ${BOARDS} boards (the fixture + ${BOARDS - 1} scatters)\n`);
  console.log('| question | agreement |');
  console.log('|---|---|');
  console.log(`| reach: cells both agree a fighter can / cannot reach | ${pct(...m.reach)} of cells; ${pct(...m.reachUnits)} of fighters identical |`);
  console.log(`| sight: opposing pairs where both agree on line of sight | ${pct(...m.sight)} (C sees ${pct(m.sightC, m.sight[1])}, A sees ${pct(m.sightA, m.sight[1])}) |`);
  console.log(`| sight, cover only (fighters not blocking in either) | ${pct(...m.sightCover)} |`);
  console.log(`| shots legal in place: C ${m.validC}, A ${m.validA}, both ${m.validBoth} | A allows every shot C does |`);
  console.log(`| odds identical, where both allow the shot | ${pct(...m.odds)} |`);
  console.log(`| weapon damage identical (before guard) | ${pct(...m.raw)} |`);
  console.log(`| HP lost identical (after C's guard) | ${pct(...m.dmg)} |`);
  console.log(`| rival plan identical (target and destination) | ${pct(...m.plans)} |`);
  console.log(`| control, partial cover removed: reach / odds | ${pct(...n.reach)} / ${pct(...n.odds)} |`);
  console.log(`\n| auto vs auto, ${outcomes.A.length} seeds | win | loss | mean rounds | mean crew standing |`);
  console.log('|---|---|---|---|---|');
  for (const [n, t] of [['A (TURF v42 rules)', tA], ['C (c11-v1)', tC]]) console.log(`| ${n} | ${pct(t.win, outcomes.A.length)} | ${pct(t.loss, outcomes.A.length)} | ${t.rounds} | ${t.crewLeft} |`);
  console.log('\nThe auto rows are each candidate\'s OWN player brain against its OWN rivals: they measure the rule sets and the brains together, and are not a comparison of which is better.');
}
