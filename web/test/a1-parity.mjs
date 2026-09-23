#!/usr/bin/env node
/**
 * a1-parity.mjs — Option A (TURF base) against Option C (C.19) on ONE request.
 *
 *   node web/test/a1-parity.mjs            the gate
 *   node web/test/a1-parity.mjs --report   the gate, then the measurement table
 *
 * PIRITORI_LONG_TERM_SCOPE.md, "Now" step 3: "Measure A/Turf against the
 * contract." A is measured twice, as two columns of one table:
 *
 *   A.1  TURF's own rules — the engine as it ships, fed the request.
 *   A.2  TURF v43's 'piritori-c11' profile — the same engine held to C's
 *        rules (turf/js/rules.js). This is what A plays by default.
 *
 * Two different kinds of output, kept apart on purpose:
 *
 *   THE GATE asserts what must be true for the comparison to mean anything:
 *   both candidates accept the frozen request, both finish it, both answer in
 *   the result vocabulary, both are deterministic from the seed; A.1's list of
 *   what TURF cannot represent has not grown behind anyone's back; and under
 *   the profile, A and C agree command for command wherever the rival brain
 *   is not involved — that last one is A.2's whole claim, so it is a gate.
 *
 *   THE REPORT measures how far apart the rule sets are, by asking each
 *   candidate's own functions the same question about the same board.
 */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { RESULT_VOCABULARY, RESULT_VERSION } from '../../port/battle-contract.mjs';
import { cSessionFromRequest, cResult } from '../../port/battle-fixture.mjs';
import { routes, forecast, sightCells, targets } from '../fight-module/tactics.js?v=7';
import { createTurfSession } from '../turf-base/adapter.mjs';
import { moveRange, hasLOS, key } from '../vendor/turf/grid.js?v=7';
import { forecastAttack } from '../vendor/turf/combat.js?v=23';

const ROOT = new URL('../../', import.meta.url);
const REQ = JSON.parse(fs.readFileSync(new URL('fixtures/battle-request-lab6-v1.json', ROOT)));
const REPORT = process.argv.includes('--report');
const TURF_RULES = { rules: 'turf' };

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
const cell = u => `${u.x},${u.y}`;

/** What a fighter IS after a command, read the same way off either engine. */
function boardC(c) {
  const b = c.battle;
  return b.players.concat(b.enemies).map(u => ({ id: u.id, cell: u.cell, hp: Math.max(0, u.hp), guard: u.guard, ammo: u.ammo ?? null, items: [...(u.itemIds || [])], alive: u.alive }));
}
function boardA(a) {
  return a.snapshot().units.map(u => ({ id: u.id, cell: u.cell, hp: u.hp, guard: u.guard, ammo: u.ammo, items: u.items, alive: u.alive }));
}

/**
 * Round one, player side only: a seeded random script of legal commands —
 * select, move, attack, brace, bandage, reload — chosen from C's own legal
 * moves and played on BOTH. The rival brain never acts, so under shared rules
 * every board must match after every command, dice included.
 */
function commandParity(req, seed, aOptions = {}) {
  const r = rng(seed ^ 0x9e3779b9), c = cSessionFromRequest(req), a = createTurfSession(req, aOptions);
  const pick = xs => xs[Math.floor(r() * xs.length)];
  let same = 0, total = 0, accepted = 0, firstDiff = null;
  const compare = what => {
    total++;
    const x = JSON.stringify(boardC(c)), y = JSON.stringify(boardA(a));
    if (x === y) same++; else firstDiff ??= { what, c: boardC(c), a: boardA(a) };
  };
  for (const u of c.battle.players.filter(p => p.alive)) {
    if (c.battle.status !== 'active') break;
    for (const s of [c, a]) s.command('select', u.id);
    for (let n = 0; n < 2; n++) {
      const cu = c.battle.players.find(p => p.id === u.id), verb = pick(['move', 'attack', 'brace', 'item', 'reload']);
      let value;
      if (verb === 'move') value = pick([...routes(c.battle, cu).keys()].filter(k => k !== cu.cell));
      if (verb === 'attack') value = pick(targets(c.battle, cu).map(t => t.id));
      if ((verb === 'move' || verb === 'attack') && value == null) continue;
      const rc = c.command(verb, value), ra = a.command(verb, value);
      if (rc.ok === ra.ok) accepted++;
      compare(`${u.id} ${verb} ${value ?? ''} (C ${rc.ok ? 'took' : 'refused'}, A ${ra.ok ? 'took' : 'refused'})`);
    }
  }
  return { same, total, accepted, firstDiff };
}

// ── THE GATE ────────────────────────────────────────────────────────
const LOSSY_KINDS = ['guard', 'items', 'cover', 'command brace', 'command item'];
{
  const a = createTurfSession(REQ, TURF_RULES);
  const kinds = new Set(a.lossy.map(l => l.startsWith('command') ? l.split(' (')[0] : l.includes(': guard') ? 'guard' : l.includes(': items') ? 'items' : l.startsWith('cover') ? 'cover' : l));
  assert.deepEqual([...kinds].sort(), [...LOSSY_KINDS].sort(),
    `A.1's unrepresentable list changed: ${[...kinds].join(' | ')} — a new kind is a new rule TURF cannot carry; record it before accepting it`);
  assert.equal(a.lossy.filter(l => l.startsWith('cover')).length, REQ.cover.filter(c => c.kind === 'partial').length);
  // Under TURF's own rules brace and item do not exist: A.1 must REFUSE
  // them, not silently do something else.
  assert.equal(a.command('brace').ok, false); assert.equal(a.command('item').ok, false);
  const p = createTurfSession(REQ);
  assert.equal(p.rules, 'piritori-c11', 'A plays the Piritori profile by default');
  assert.deepEqual(p.lossy, [], 'under the profile, nothing in the request is lost');
}
const outcomes = { A: [], 'A.1': [], C: [] };
for (let seed = 1; seed <= 60; seed++) {
  const req = { ...REQ, seed: Math.imul(seed, 2654435761) >>> 0 };
  for (const [name, make] of [['A', () => createTurfSession(req)], ['A.1', () => createTurfSession(req, TURF_RULES)], ['C', () => wrap(cSessionFromRequest(req))]]) {
    const runs = [0, 1].map(() => { const s = make(); playOut(s, 'auto'); return s; });
    const res = runs.map(s => (name === 'C' ? { ...cResult(s, req), candidate: 'C' } : s.result()));
    assert.deepEqual(res[0], res[1], `${name} is not deterministic from seed ${req.seed}`);
    const r = res[0];
    assert.equal(r.schema_version, RESULT_VERSION);
    assert.ok(RESULT_VOCABULARY.includes(r.result), `${name} seed ${req.seed}: '${r.result}' — did not finish, or answered outside the vocabulary`);
    assert.deepEqual([...r.survivors, ...r.downed].sort(), REQ.units.map(u => u.id).sort(), `${name} lost track of a fighter`);
    outcomes[name].push(r);
  }
}
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
// A.2's claim: with the rival brain out of it, the two engines are one game.
const PARITY_BOARDS = 200;
const cmd = { same: 0, total: 0, accepted: 0 };
for (let i = 0; i < PARITY_BOARDS; i++) {
  const r = commandParity(i ? scatter(REQ, i) : REQ, i + 1);
  if (r.firstDiff) assert.fail(`board ${i}: A and C diverged after ${r.firstDiff.what}\n  C ${JSON.stringify(r.firstDiff.c)}\n  A ${JSON.stringify(r.firstDiff.a)}`);
  cmd.same += r.same; cmd.total += r.total; cmd.accepted += r.accepted;
}
assert.equal(cmd.accepted, cmd.total, 'A and C accept and refuse the same commands');
console.log(`a1-parity: gate ok — A, A.1 and C each finished ${outcomes.A.length} seeded fights in one vocabulary; under the profile A matched C after all ${cmd.total} player commands on ${PARITY_BOARDS} boards`);

// ── THE REPORT ──────────────────────────────────────────────────────
if (REPORT) {
  const BOARDS = 200;
  const measure = (aOptions = {}, transform = r => r) => {
    const m = { reach: [0, 0], reachUnits: [0, 0], sight: [0, 0], sightC: 0, sightA: 0, sightCover: [0, 0], odds: [0, 0], dmg: [0, 0], raw: [0, 0], validBoth: 0, validC: 0, validA: 0, plans: [0, 0] };
    for (let i = 0; i < BOARDS; i++) {
      const req = transform(i ? scatter(REQ, i) : structuredClone(REQ));
      const c = cSessionFromRequest(req), b = c.battle, a = createTurfSession(req, aOptions), st = a.state;
      const cu = id => b.players.concat(b.enemies).find(u => u.id === id);
      for (const u of req.units) {
        const cr = new Set(routes(b, cu(u.id)).keys()), ar = new Set(moveRange(st, a.unitOf(u.id)).keys());
        const all = new Set([...cr, ...ar]); let same = 0; for (const k of all) if (cr.has(k) === ar.has(k)) same++;
        m.reach[0] += same; m.reach[1] += all.size;
        m.reachUnits[0] += same === all.size ? 1 : 0; m.reachUnits[1]++;
      }
      for (const u of req.units) for (const v of req.units) if (u.side !== v.side) {
        const cs = !sightCells(u.cell, v.cell).some(k => b.cover.get(k)?.hardBlock || b.players.concat(b.enemies).some(w => w.alive && w.id !== u.id && w.id !== v.id && w.cell === k));
        const as = hasLOS(st, a.unitOf(u.id), a.unitOf(v.id));
        m.sight[0] += cs === as ? 1 : 0; m.sight[1]++; m.sightC += cs; m.sightA += as;
        // Fighters taken out of C's blockers: the two ALGORITHMS on cover alone.
        const cc = !sightCells(u.cell, v.cell).some(k => b.cover.get(k)?.hardBlock);
        m.sightCover[0] += cc === as ? 1 : 0; m.sightCover[1]++;
      }
      for (const u of req.units) for (const v of req.units) if (u.side !== v.side) {
        const f = forecast(b, cu(u.id), cu(v.id)), au = a.unitOf(u.id), av = a.unitOf(v.id);
        const inRange = Math.abs(au.x - av.x) + Math.abs(au.y - av.y) <= au.weapon.range && hasLOS(st, au, av);
        const g = forecastAttack(st, au, av, au.weapon);
        m.validC += f.valid; m.validA += inRange;
        if (f.valid && inRange) {
          m.validBoth++;
          m.odds[0] += Math.round(g.chance * 100) === f.chance ? 1 : 0; m.odds[1]++;
          m.dmg[0] += (g.hpDamage ?? g.damage) === f.hpDamage ? 1 : 0; m.dmg[1]++;
          m.raw[0] += g.damage === f.damage ? 1 : 0; m.raw[1]++;
        }
      }
      for (const p of b.plans) {
        const t = st.telegraph.get(a.unitOf(p.id).uid);
        const at = t?.targetUid ? a.idOf(t.targetUid) : null, to = t?.moveTo ? key(t.moveTo.x, t.moveTo.y) : cell(a.unitOf(p.id));
        m.plans[0] += at === (p.target ?? null) && to === p.to ? 1 : 0; m.plans[1]++;
      }
    }
    return m;
  };
  const noPartial = r => ({ ...r, cover: r.cover.filter(c => c.kind === 'full') });
  const one = measure(TURF_RULES), two = measure(), ctl = measure(TURF_RULES, noPartial);
  const cmd1 = { same: 0, total: 0 };
  for (let i = 0; i < BOARDS; i++) { const r = commandParity(i ? scatter(REQ, i) : REQ, i + 1, TURF_RULES); cmd1.same += r.same; cmd1.total += r.total; }
  const tally = rs => { const o = Object.fromEntries(RESULT_VOCABULARY.map(k => [k, 0])); let rounds = 0, left = 0; for (const r of rs) { o[r.result]++; rounds += r.rounds; left += r.survivors.filter(id => REQ.units.find(u => u.id === id).side === 'player').length; } return { ...o, rounds: (rounds / rs.length).toFixed(1), crewLeft: (left / rs.length).toFixed(2) }; };
  const src = JSON.parse(fs.readFileSync(new URL('web/vendor/turf/SOURCE.json', ROOT)));
  console.log(`\nA vs C — ${REQ.id}, rules ${REQ.rules.id}, TURF v${src.turf_version} (${src.commit.slice(0, 8)}), ${BOARDS} boards (the fixture + ${BOARDS - 1} scatters)\n`);
  console.log('| question | A.1 — TURF rules | A.2 — piritori-c11 profile |');
  console.log('|---|---|---|');
  const row = (q, f) => console.log(`| ${q} | ${f(one)} | ${f(two)} |`);
  row('reach: cells both agree a fighter can / cannot reach', m => `${pct(...m.reach)} (${pct(...m.reachUnits)} of fighters identical)`);
  row('sight: opposing pairs where both agree', m => `${pct(...m.sight)} (C sees ${pct(m.sightC, m.sight[1])}, A ${pct(m.sightA, m.sight[1])})`);
  // Only an A.1 question: it takes bodies out of C's blockers to compare the
  // two sight ALGORITHMS, and under the profile A's bodies do block.
  console.log(`| sight, cover only (fighters not blocking in either) | ${pct(...one.sightCover)} | — |`);
  row('shots legal in place (C / A / both)', m => `${m.validC} / ${m.validA} / ${m.validBoth}`);
  row('odds identical, where both allow the shot', m => pct(...m.odds));
  row('weapon damage identical (before guard)', m => pct(...m.raw));
  row('HP lost identical (after guard)', m => pct(...m.dmg));
  row('rival plan identical (target and destination)', m => pct(...m.plans));
  console.log(`| player commands: whole board identical after each | ${pct(cmd1.same, cmd1.total)} | ${pct(cmd.same, cmd.total)} of ${cmd.total} |`);
  console.log(`| control, A.1 with partial cover removed: reach / odds | ${pct(...ctl.reach)} / ${pct(...ctl.odds)} | — |`);
  console.log(`\n| auto vs auto, ${outcomes.A.length} seeds | win | loss | mean rounds | mean crew standing |`);
  console.log('|---|---|---|---|---|');
  for (const [n, k] of [['A.1 (TURF rules)', 'A.1'], ['A.2 (piritori-c11)', 'A'], ['C (c11-v1)', 'C']]) {
    const t = tally(outcomes[k]); console.log(`| ${n} | ${pct(t.win, outcomes[k].length)} | ${pct(t.loss, outcomes[k].length)} | ${t.rounds} | ${t.crewLeft} |`);
  }
  console.log("\nThe auto rows are each candidate's OWN player brain against its OWN rivals: rules and brains together, not a verdict on which is better.");
}
