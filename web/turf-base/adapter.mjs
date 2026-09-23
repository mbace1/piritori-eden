/**
 * Option A — Turf battle base (A.1). TURF's engine, run from Piritori's
 * battle request, answering in Piritori's result vocabulary.
 *
 * DESIGN_AUTHORITY.md (2026-09-10): "reuse Turf rules and assets where they
 * satisfy Piritori canon; adapt through the shared request/result boundary
 * rather than copying campaign assumptions into the battle; document which
 * parts remain Turf-specific and the cost of maintaining them."
 *
 * So this file does the ADAPTING and nothing else. TURF's rules are run
 * unchanged from a pinned copy (web/vendor/turf, guarded by
 * web/tools/vendor-turf.mjs --check); where a request says something TURF
 * cannot represent, the adapter records it in `lossy` instead of quietly
 * approximating it. web/test/a1-parity.mjs measures what that costs.
 *
 * The session has C's shape (`command(type, value)`, `snapshot()`,
 * `result()`) so one harness, and later one UI, can drive either candidate.
 */
import {
  createEncounterState, selectUnit, moveUnit, attack, reloadUnit, endPlayerTurn, stepEnemyPhase,
  endUnitTurn, getUnit, braceUnit, useItem,
} from '../vendor/turf/combat.js?v=23';
import { autoTurn } from '../vendor/turf/autoplay.js?v=10';
import { validateRequest, makeResult } from '../../port/battle-contract.mjs';

const xy = c => c.split(',').map(Number);
const cell = u => `${u.x},${u.y}`;

// Which TURF rule profile (turf/js/rules.js, TURF v43) plays which request
// rules. A.2: Piritori's c11-v1 has its own profile on TURF's engine, so the
// request's armour, items, walled faces and verbs are CARRIED rather than
// listed as lost. `{ rules: 'turf' }` plays TURF's own rules instead — A.1's
// measurement, kept as the control column.
export const PROFILE_FOR = Object.freeze({ 'c11-v1': 'piritori-c11' });

/**
 * Request -> TURF's own inputs. Returns the four data arguments
 * createEncounterState takes, the id mapping, and every place the request
 * said something the chosen rules have no field for.
 */
export function turfInputs(req, { rules = PROFILE_FOR[req.rules?.id] ?? 'turf' } = {}) {
  validateRequest(req);
  const lossy = [];
  if (rules !== 'turf') return profileInputs(req, rules);
  const weaponDefs = Object.entries(req.weapons).map(([id, w]) => {
    if (w.pierce) lossy.push(`weapon ${id}: pierce ${w.pierce} (TURF has no guard to pierce)`);
    return {
      id, name: w.name, archetype: w.magazine ? 'ranged' : 'melee',
      range: w.range, damage: w.damage, hitChance: w.accuracy / 100,
      knockback: 0, ...(w.magazine ? { mag: w.magazine } : {}),
    };
  });
  const defOf = u => ({
    id: u.id, name: u.name, role: u.role, weapon: u.weapon, hp: u.maxHp, move: req.rules.movement.steps,
    ...(u.side === 'enemy' ? { behaviour: 'charger', focus: 'nearest' } : {}),
  });
  const players = req.units.filter(u => u.side === 'player'), enemies = req.units.filter(u => u.side === 'enemy');
  for (const u of req.units) {
    if (u.guard) lossy.push(`unit ${u.id}: guard ${u.guard} (TURF's 'guard' is an ally's evasion aura, not armour — not carried)`);
    if (u.items.length) lossy.push(`unit ${u.id}: items ${u.items.join(', ')} (TURF has no item verb)`);
  }
  const partial = req.cover.filter(c => c.kind === 'partial');
  for (const c of partial) lossy.push(`cover ${c.cell}: partial on its ${c.edge} edge only (TURF partial cover is the whole tile, and does not block movement)`);
  const encounter = {
    id: req.id, name: req.id, grid: { ...req.rules.grid },
    playerSpawns: players.map(u => { const [x, y] = xy(u.cell); return { unit: u.id, x, y }; }),
    enemySpawns: enemies.map(u => { const [x, y] = xy(u.cell); return { enemy: u.id, x, y }; }),
    cover: {
      full: req.cover.filter(c => c.kind === 'full').map(c => xy(c.cell)),
      partial: partial.map(c => xy(c.cell)),
    },
    win: { mode: 'eliminate' },
  };
  if (req.commands.includes('brace')) lossy.push('command brace (TURF has no brace)');
  if (req.commands.includes('item')) lossy.push('command item (TURF has no item verb)');
  return { encounter, unitDefs: players.map(defOf), enemyDefs: enemies.map(defOf), weaponDefs, lossy };
}

// The request, under a Piritori profile: nothing is lost in translation.
function profileInputs(req, rules) {
  const weaponDefs = Object.entries(req.weapons).map(([id, w]) => ({
    id, name: w.name, archetype: w.magazine ? 'ranged' : 'melee',
    range: w.range, damage: w.damage, hitChance: w.accuracy / 100, knockback: 0,
    ...(w.magazine ? { mag: w.magazine } : {}), ...(w.pierce ? { pierce: w.pierce } : {}),
  }));
  const defOf = u => ({
    id: u.id, name: u.name, role: u.role, weapon: u.weapon, hp: u.maxHp, move: req.rules.movement.steps,
    armour: u.guard, items: [...u.items],
    ...(u.side === 'enemy' ? { behaviour: 'charger', focus: 'nearest' } : {}),
  });
  const players = req.units.filter(u => u.side === 'player'), enemies = req.units.filter(u => u.side === 'enemy');
  const encounter = {
    id: req.id, name: req.id, grid: { ...req.rules.grid }, rules, items: structuredClone(req.items),
    playerSpawns: players.map(u => { const [x, y] = xy(u.cell); return { unit: u.id, x, y }; }),
    enemySpawns: enemies.map(u => { const [x, y] = xy(u.cell); return { enemy: u.id, x, y }; }),
    cover: {
      full: req.cover.filter(c => c.kind === 'full').map(c => xy(c.cell)),
      partial: req.cover.filter(c => c.kind === 'partial').map(c => [...xy(c.cell), c.edge]),
    },
    win: { mode: 'eliminate' },
  };
  return { encounter, unitDefs: players.map(defOf), enemyDefs: enemies.map(defOf), weaponDefs, lossy: [] };
}

// TURF says 'lose'; the campaign's word is 'loss'. Everything else is
// already the same word.
const RESULT = { win: 'win', lose: 'loss' };

export function createTurfSession(req, options = {}) {
  const { encounter, unitDefs, enemyDefs, weaponDefs, lossy } = turfInputs(req, options);
  const state = createEncounterState(encounter, unitDefs, weaponDefs, enemyDefs, req.seed >>> 0);
  // uid <-> request id. TURF numbers its units p0/e0; the request's ids are
  // what a result must name.
  const byId = new Map(), idOf = new Map();
  for (const u of state.units) {
    const r = req.units.find(v => v.id === u.defId && v.side === u.faction);
    Object.assign(u, { hp: r.hp, maxHp: r.maxHp, label: r.label, id: r.id });
    if (r.ammo != null) u.ammo = r.ammo;
    byId.set(r.id, u); idOf.set(u.uid, r.id);
  }
  let ended = null; // withdraw/partial: ends the fight without TURF knowing
  const history = [];
  const outcome = () => ended ?? (state.result ? RESULT[state.result] : null);
  const status = () => (outcome() ? 'complete' : 'active');
  state.selected = byId.get(req.selected)?.uid ?? null;

  function enemyPhase() {
    if (endPlayerTurn(state).ok) for (let i = 0; i < 64; i++) { const r = stepEnemyPhase(state); if (!r || r.done || state.result) break; }
  }

  function command(type, value) {
    if (status() !== 'active') return { ok: false, reason: 'complete' };
    const u = state.selected && getUnit(state, state.selected);
    let r;
    if (type === 'select') { const t = byId.get(value); r = t ? selectUnit(state, t.uid) : { ok: false }; if (r.ok) return r; }
    else if (type === 'move') { const [x, y] = xy(String(value)); r = u ? moveUnit(state, u.uid, x, y) : { ok: false }; }
    else if (type === 'attack') { const t = byId.get(value); r = u && t ? attack(state, u.uid, t.uid) : { ok: false }; }
    else if (type === 'reload') r = u ? reloadUnit(state, u.uid) : { ok: false };
    else if (type === 'brace') r = u ? braceUnit(state, u.uid) : { ok: false };
    else if (type === 'item') r = u ? useItem(state, u.uid, (u.items || [])[0]) : { ok: false };
    else if (type === 'end') { enemyPhase(); r = { ok: true }; }
    else if (type === 'auto') {
      for (const p of state.units.filter(v => v.faction === 'player' && v.hp > 0)) {
        if (state.result) break;
        autoTurn(state, p, []);
        if (!state.result) endUnitTurn(state, p.uid);
      }
      if (!state.result) enemyPhase();
      r = { ok: true };
    }
    else if (type === 'withdraw') { ended = 'withdraw'; r = { ok: true }; }
    else if (type === 'talk') { r = state.round >= req.rules.victory.talk_from_round ? (ended = 'partial', { ok: true }) : { ok: false, reason: 'too-early' }; }
    else r = { ok: false, reason: `TURF has no '${type}'` };
    if (r?.ok) history.push({ type, actor: u ? idOf.get(u.uid) : null, value });
    return r ?? { ok: false };
  }

  const units = () => state.units.filter(u => u.faction !== 'objective')
    .map(u => ({ id: idOf.get(u.uid), side: u.faction, cell: cell(u), hp: u.hp, maxHp: u.maxHp, ammo: u.ammo ?? null,
      ...(u.armour != null ? { guard: u.armour } : {}), ...(u.items ? { items: [...u.items] } : {}), alive: u.hp > 0 }));
  return {
    candidate: 'A', rules: state.rules?.id ?? 'turf', state, lossy, history, command,
    get status() { return status(); },
    snapshot: () => ({ round: state.round, status: status(), result: outcome(), units: units() }),
    result: () => makeResult({ request: req, candidate: 'A', result: outcome(), round: state.round, units: units(), actions: history.slice() }),
    idOf: uid => idOf.get(uid), unitOf: id => byId.get(id),
  };
}
