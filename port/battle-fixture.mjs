#!/usr/bin/env node
/**
 * battle-fixture.mjs — freezes the matched 3v3 battle request both battle
 * candidates are measured against (PIRITORI_LONG_TERM_SCOPE.md, "Now" 1).
 *
 *   node port/battle-fixture.mjs           write fixtures/battle-request-lab6-v1.json
 *   node port/battle-fixture.mjs --check   fail if C and the fixture disagree
 *
 * The fixture is C.19's own `lab-6` (3v3, mixed loadout, neutral stand-ins,
 * the seven lab cover pieces), CAPTURED from web/fight-module rather than
 * written out, because the only description of that board was the code.
 *
 * --check asks three questions, each of which has a way to be wrong that a
 * byte comparison alone cannot see:
 *
 *   1. Does C still produce this request?          (the fixture is not stale)
 *   2. Does tactics.js still obey RULES_C11_V1?    (the numbers A reads are
 *      the numbers C plays — probed through C's own functions, since those
 *      numbers are literals inside routes()/forecast()/the brace branch)
 *   3. Is the request SUFFICIENT? C rebuilt from nothing but the request
 *      must play the same game as C built natively, command by command,
 *      through a whole fight. A request that dropped a field C needs would
 *      still validate — and describe a different battle.
 */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { requestFromTactical, applyRequestToTactical, validateRequest, makeResult, RULES_C11_V1 } from './battle-contract.mjs';
import { createSession } from '../web/fight-module/session.js?v=12';
import { createTacticalSession, WEAPONS, routes, forecast } from '../web/fight-module/tactics.js?v=7';

const ROOT = new URL('../', import.meta.url);
const OUT = new URL('fixtures/battle-request-lab6-v1.json', ROOT);
const content = JSON.parse(fs.readFileSync(new URL('content/era1-slice-v1.json', ROOT)));

export const FIXTURE_ID = 'lab-6-mixed';
// A session remembers how long its log was at birth, so comparisons read
// only what COMMANDS wrote: the opening lines are each scaffold's own prose.
const born = s => (s.bornLog = s.battle.log.length, s);
export const nativeSession = () => born(createSession(content, 'mixed', 'lab-6'));

export function buildRequest() {
  return requestFromTactical(nativeSession().battle, { id: FIXTURE_ID, weapons: WEAPONS });
}

/** C, rebuilt from the request alone. The scaffold is lab-2 on purpose: a
 *  DIFFERENT fixture, so anything the request fails to carry shows up as
 *  lab-2 leaking through rather than lab-6 quietly surviving. */
export function cSessionFromRequest(req) {
  validateRequest(req);
  const base = createSession(content, 'mixed', 'lab-2'), b = base.battle;
  const template = { player: structuredClone(b.players[0]), enemy: structuredClone(b.enemies[0]) };
  return born(createTacticalSession(b, 'mixed', req.id, base.data, {
    rules: req.rules.id,
    prepare: battle => applyRequestToTactical(battle, req, template),
  }));
}

// What changes an outcome. Presentation (modelId, head/torso/legs) is left
// out on purpose: two candidates may draw a fighter differently.
const MECH = ['id', 'side', 'label', 'role', 'cell', 'equipment', 'hp', 'maxHp', 'guard', 'harmBonus', 'ammo', 'maxAmmo', 'itemIds', 'alive'];
export function mechanical(s) {
  const b = s.battle;
  return JSON.stringify({
    round: b.round, status: b.status, result: b.result, rng: b.rng, selectedId: b.selectedId,
    moved: b.moved, acted: b.acted, plans: b.plans, log: b.log.slice(0, b.log.length - (s.bornLog ?? 0)),
    // harmBonus: C reads it as Number(x) || 0, so absent and 0 are one rule.
    units: b.players.concat(b.enemies).map(u => Object.fromEntries(MECH.map(k => [k, k === 'harmBonus' ? Number(u[k]) || 0 : u[k] ?? null]))),
  });
}

/** Result v1 from a finished (or abandoned) C session. */
export function cResult(s, req) {
  const b = s.battle;
  return makeResult({ request: req, candidate: 'C', result: b.result, round: b.round,
    units: b.players.concat(b.enemies), actions: s.history.map(({ type, actor, value }) => ({ type, actor, value })) });
}

function probeRules(rules) {
  // Grid and step budget: an unobstructed fighter's reach is a diamond of
  // radius `steps`, clipped to the board.
  const s = nativeSession(), b = s.battle, u = b.players[0];
  b.cover = new Map(); for (const v of b.players.concat(b.enemies)) if (v !== u) v.alive = false;
  u.cell = '0,0';
  const reach = [...routes(b, u).keys()].map(c => c.split(',').map(Number));
  assert.equal(Math.max(...reach.map(([x, y]) => x + y)), rules.movement.steps, 'movement.steps');
  u.cell = `${rules.grid.cols - 1},${rules.grid.rows - 1}`;
  const far = [...routes(b, u).keys()].map(c => c.split(',').map(Number));
  assert.ok(far.every(([x, y]) => x < rules.grid.cols && y < rules.grid.rows), 'grid bounds');
  assert.ok(far.some(([x]) => x === rules.grid.cols - 1) && far.some(([, y]) => y === rules.grid.rows - 1), 'grid reaches its own edge');
  // Brace.
  const s2 = nativeSession(), g0 = s2.battle.players[0].guard;
  assert.ok(s2.command('brace').ok);
  assert.equal(s2.battle.players[0].guard, Math.min(rules.brace.cap, g0 + rules.brace.guard), 'brace');
  // Partial cover penalty: a handgun shot across a partial edge.
  const s3 = createSession(content, 'ranged', 'lab-2'), b3 = s3.battle, gun = b3.players[0], t = b3.enemies[0];
  gun.cell = '1,4'; t.cell = '1,3';
  const clear = WEAPONS[gun.equipment].accuracy;
  assert.equal(forecast(b3, gun, t).chance, clear - 25, 'partial cover penalty');
  assert.match(rules.cover.partial, /-25 percentage points/);
}

/** Play whole fights in both sessions and compare after every command.
 *  Seeds vary the dice (C's rng is read only at a roll, never at planning,
 *  so setting it before the first command is the same as a different seed
 *  in the request). */
export const SEEDS = Array.from({ length: 25 }, (_, i) => i ? (Math.imul(i, 2654435761) >>> 0) : null);
function playBoth(req) {
  assert.equal(mechanical(cSessionFromRequest(req)), mechanical(nativeSession()), 'request-built C differs from native C before any command');
  let commands = 0;
  const pair = seed => {
    const a = nativeSession(), r = cSessionFromRequest(seed == null ? req : { ...req, seed });
    if (seed != null) a.battle.rng = seed;
    return [a, r];
  };
  const step = (a, r, type, value, tag) => {
    const ra = a.command(type, value), rr = r.command(type, value);
    assert.equal(rr.ok, ra.ok, `${tag}: ${type} accepted by one and not the other`);
    assert.equal(mechanical(r), mechanical(a), `${tag}: diverged after ${type} ${value ?? ''}`);
    commands++;
  };
  // The player's own auto (every verb its brain uses, the rivals' whole
  // phase, the dice), and a pure end-turn run where the rivals do the work.
  for (const seed of SEEDS) for (const script of ['auto', 'end']) {
    const [a, r] = pair(seed);
    for (let i = 0; i < 40 && a.battle.status === 'active'; i++) step(a, r, script, undefined, `seed ${seed} ${script} #${i}`);
    assert.notEqual(a.battle.status, 'active', `seed ${seed}: the ${script} script finished the fight`);
    assert.deepEqual(cResult(r, req), cResult(a, req));
  }
  // Every other verb by hand: select, move, attack, brace, item, reload,
  // then each way out that is not a knockout.
  for (const exit of ['withdraw', 'talk']) {
    const [a, r] = pair(null), tag = `hand ${exit}`;
    step(a, r, 'select', 'f02', tag); step(a, r, 'move', '2,3', tag);
    step(a, r, 'attack', 'op-f02', tag);
    step(a, r, 'select', 'f01', tag); step(a, r, 'brace', undefined, tag);
    step(a, r, 'select', 'f03', tag); step(a, r, 'item', undefined, tag);
    step(a, r, 'end', undefined, tag);
    step(a, r, 'select', 'f02', tag); step(a, r, 'reload', undefined, tag);
    step(a, r, exit, undefined, tag);
    assert.equal(a.battle.result, exit === 'withdraw' ? 'withdraw' : 'partial');
    assert.deepEqual(cResult(r, req), cResult(a, req));
  }
  return commands;
}

function main() {
  const check = process.argv.includes('--check');
  const req = buildRequest();
  const text = JSON.stringify(req, null, 1) + '\n';
  probeRules(req.rules);
  assert.deepEqual(req.rules, JSON.parse(JSON.stringify(RULES_C11_V1)));
  const commands = playBoth(req);
  if (check) {
    const had = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : null;
    if (had !== text) { console.error('fixtures/battle-request-lab6-v1.json is stale: run node port/battle-fixture.mjs'); process.exit(1); }
    console.log(`battle-fixture: ok — ${req.units.length} fighters, ${req.cover.length} cover, rules ${req.rules.id}; C from request matched native C over ${commands} commands`);
  } else {
    fs.writeFileSync(OUT, text);
    console.log(`wrote ${OUT.pathname} (${commands} commands matched)`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) main();
