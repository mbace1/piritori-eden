// The auto-battler — the player side, played by the machine.
//
// WHERE THIS BOT CAME FROM, and why it is not the one in the gates. The
// balance gate (test/balance.mjs) drives a deliberately NAIVE bot: attack
// from where you stand, otherwise close. That bot exists to measure a floor,
// so it must stay bad. Watching it play is watching the scrum the movement
// economy was built to break up.
//
// This is the other bot from that experiment — the one that scored cover and
// exposure, won 92% against the naive bot's 57%, and is what proved the first
// negative result was my heuristic's fault rather than the design's (v24's
// log has the whole table). It is the strongest player-side behaviour this
// project has measured, which is the only honest thing to put behind a switch
// labelled AUTO.
//
// It is NOT the enemy brain. The rival brain (combat.js's planIntent) plans one unit at a time against a
// telegraph the player has to be able to read; this plans a turn to win it.
// Sharing them would make one of the two worse.
import { manhattan, hasLOS, coverSoftens, key } from './grid.js?v=7';
import { movableTiles, attackableTargets, moveUnit, orderAttack, endUnitTurn, useAbility, reloadUnit } from './combat.js?v=23';
import { needsReload } from './ammo.js?v=3';
import { abilitiesFor, canAfford, abilityTargets } from './abilities.js?v=5';

// What a tile is worth to stand on and shoot from. Positive is good. The
// weights are the ones the v24 experiment settled on; the only addition is
// momentum, which now buys abilities rather than only damage.
const W_COVER = 1.6, W_EXPOSURE = 1.4, W_MOMENTUM = 0.35, W_HAZARD = 1.5;

function hazardCost(state, x, y) {
  const h = state.hazards && state.hazards.get(key(x, y));
  if (!h) return 0;
  return h.lethal ? 99 : (h.onEnter || 0) + (h.lingers || 0);
}

// How many enemy guns bear on this tile, softened by whatever it stands
// behind. The term that stops the bot sprinting into the open for a shot.
function exposure(state, tile, foes) {
  let n = 0;
  for (const f of foes) {
    // An objective has no weapon and threatens nothing. Reading `f.weapon`
    // unguarded crashed AUTO outright on the destroy map, because widening
    // "foes" to everything-not-mine (so a cache is a target like any other)
    // also let a weaponless crate into the threat model.
    if (!f.weapon) continue;
    if (manhattan(tile, f) > f.weapon.range + 2) continue;
    if (!hasLOS(state, f, tile)) continue;
    n += coverSoftens(state, f, tile) ? 0.4 : 1;
  }
  return n;
}

// THE OBJECTIVE COMES FIRST, and it has to, for a reason that is about
// measurement rather than play: `balance.mjs` asks "is this encounter
// winnable", and a bot that only ever fought would report 0% on an
// extraction mission and 0% on a destroy mission — which says nothing about
// the encounter and everything about the bot. A mode the bots cannot pursue
// is a mode nobody can balance.
//
// Deliberately simple. Extraction walks at the pads; destroy treats the
// cache as a target like any other. Neither tries to be clever about the
// fight on the way, which is exactly what leaves headroom for a person.
function objectiveMove(state, unit) {
  const win = state.win || {};
  if (win.mode === 'extract' && state.extract && state.extract.size) {
    if (state.extract.has(key(unit.x, unit.y))) return true; // already out; hold the tile
    const pads = [...state.extract].map(k => {
      const [x, y] = k.split(',').map(Number); return { x, y };
    });
    let best = null, bestD = Infinity;
    for (const t of movableTiles(state, unit).values()) {
      const d = Math.min(...pads.map(p => manhattan(t, p))) + W_HAZARD * hazardCost(state, t.x, t.y);
      if (d < bestD) { bestD = d; best = t; }
    }
    if (best && (best.x !== unit.x || best.y !== unit.y)) {
      moveUnit(state, unit.uid, best.x, best.y);
      // Standing on the pad can END the encounter, so nothing after this may
      // assume the fight is still running.
      if (state.result) return true;
    }
    return true;
  }
  return false;
}

// One operator's whole turn: reposition if a better firing tile exists, then
// spend the run on an ability if one is affordable and worth it, else swing.
export function autoTurn(state, unit, abilityDefs) {
  if (objectiveMove(state, unit)) {
    if (!state.result) {
      // A free swing on the way out — but ONLY at something already in range
      // from where the unit now stands. attackableTargets answers "could
      // reach and hit", and since v28 orderAttack walks to the BEST firing
      // tile rather than the nearest, taking one of those would drag the
      // operator off the extraction route to go and find cover. Measured:
      // AUTO on `the-crossing` fell from 27% to 8% before this line existed.
      const here = attackableTargets(state, unit).filter(uid => {
        const f = state.units.find(u => u.uid === uid);
        return f && manhattan(unit, f) <= unit.weapon.range && hasLOS(state, unit, f);
      });
      if (here.length) orderAttack(state, unit.uid, here[0]); else endUnitTurn(state, unit.uid);
    }
    return;
  }
  // A cache is a target like any other (combat.js makes it a third faction
  // precisely so no code has to special-case it), so `destroy` needs no
  // branch here at all — it falls out of "shoot whatever you can reach".
  const foes = state.units.filter(f => f.faction !== unit.faction && f.hp > 0);
  if (!foes.length) { endUnitTurn(state, unit.uid); return; }

  if (!unit.actedMove) {
    const here = { x: unit.x, y: unit.y, cost: 0 };
    const canHitFrom = t => foes.filter(f =>
      manhattan(t, f) <= unit.weapon.range && hasLOS(state, t, f));
    let best = null, bestScore = -Infinity;
    for (const t of [...movableTiles(state, unit).values(), here]) {
      const hits = canHitFrom(t);
      if (!hits.length) continue;
      const target = hits.slice().sort((a, b) => a.hp - b.hp || (a.uid < b.uid ? -1 : 1))[0];
      const moved = manhattan(t, here);
      const score = W_COVER * (coverSoftens(state, target, t) ? 1 : 0)
        - W_EXPOSURE * exposure(state, t, foes)
        + W_MOMENTUM * moved
        - W_HAZARD * hazardCost(state, t.x, t.y);
      // Ties break on the tile key, never on iteration order: an auto-battler
      // that plays a different game on a replay of the same seed is not a
      // demonstration of anything.
      if (score > bestScore || (score === bestScore && best && key(t.x, t.y) < key(best.x, best.y))) {
        bestScore = score; best = t;
      }
    }
    // No firing tile anywhere — close the distance instead, the one thing
    // the naive bot does that is actually correct.
    if (!best) {
      const near = foes.slice().sort((a, b) => manhattan(unit, a) - manhattan(unit, b))[0];
      let step = null, stepD = manhattan(unit, near);
      for (const t of movableTiles(state, unit).values()) {
        const d = manhattan(t, near) + W_HAZARD * hazardCost(state, t.x, t.y);
        if (d < stepD) { stepD = d; step = t; }
      }
      if (step) moveUnit(state, unit.uid, step.x, step.y);
    } else if (best.x !== unit.x || best.y !== unit.y) {
      moveUnit(state, unit.uid, best.x, best.y);
    }
  }

  // An empty gun ends the turn one way only. Checked AFTER the reposition,
  // because a reload costs the action and not the move — the whole reason
  // the mechanic is interesting is that an empty turn is still a turn you
  // spend going somewhere.
  if (needsReload(unit)) { reloadUnit(state, unit.uid); return; }

  // The run is banked; see whether it buys something better than a swing.
  const played = tryAbility(state, unit, abilityDefs);
  if (played) return;

  const targets = attackableTargets(state, unit);
  if (targets.length) {
    // Finish the hurt one — the same `weakest` focus the enemies use, and
    // for the same reason: a body that stops shooting is worth more than a
    // dent in one that does not.
    const best = targets
      .map(uid => state.units.find(u => u.uid === uid))
      .sort((a, b) => a.hp - b.hp || (a.uid < b.uid ? -1 : 1))[0];
    orderAttack(state, unit.uid, best.uid);
  } else {
    endUnitTurn(state, unit.uid);
  }
}

// Abilities, in the order they are worth having. Deliberately simple and
// deliberately readable: this is a demonstration of the kit, so it should
// USE the kit rather than min-max around it — a bot that never cleaved would
// be evidence that cleave is pointless when in fact it is evidence about the
// bot.
function tryAbility(state, unit, abilityDefs) {
  const kit = abilitiesFor(unit, abilityDefs).filter(a => canAfford(unit, a));
  if (!kit.length) return false;
  const foes = state.units.filter(f => f.faction !== unit.faction && f.hp > 0);
  const adjacent = foes.filter(f => manhattan(unit, f) <= 1);

  const pick = id => kit.find(a => a.id === id);
  const use = (ab, target) => useAbility(state, unit.uid, ab.id, target, abilityDefs).ok;
  const first = ab => abilityTargets(state, unit, ab)[0];
  const nextTo = who => state.units.some(a =>
    a.faction === unit.faction && a.uid !== unit.uid && a.hp > 0 && manhattan(a, who) <= 1);
  const weakestOf = list => list
    .map(t => state.units.find(u => u.uid === t.uid))
    .filter(Boolean)
    .sort((a, b) => a.hp - b.hp || (a.uid < b.uid ? -1 : 1))[0];

  // Backstab first when it is on. abilityTargets only offers FLANKED rivals,
  // so an empty list is itself the answer to "has anyone set one up" and the
  // bot never reimplements the flank rule.
  const backstab = pick('backstab');
  if (backstab) { const t = first(backstab); if (t) return use(backstab, t); }

  // Cleave only pays against two or more; against one it is a worse swing.
  const cleave = pick('cleave');
  if (cleave && adjacent.length >= 2) { const t = first(cleave); if (t) return use(cleave, t); }

  // Takedown when it finishes something the ordinary swing would not.
  const takedown = pick('takedown');
  if (takedown && adjacent.length) {
    const kill = adjacent.find(f => f.hp > unit.weapon.damage && f.hp <= unit.weapon.damage + takedown.damage);
    if (kill) return use(takedown, { uid: kill.uid });
  }

  // Steady is the answer to a shot the dice would probably lose.
  const steady = pick('steady');
  if (steady) {
    const hurt = weakestOf(abilityTargets(state, unit, steady));
    if (hurt && hurt.hp <= unit.weapon.damage + 1) return use(steady, { uid: hurt.uid });
  }

  // Openings only pays against something an ally already has busy.
  const openings = pick('openings');
  if (openings) {
    const busy = abilityTargets(state, unit, openings)
      .map(o => state.units.find(u => u.uid === o.uid))
      .filter(u => u && nextTo(u));
    const t = busy.sort((a, b) => a.hp - b.hp || (a.uid < b.uid ? -1 : 1))[0];
    if (t) return use(openings, { uid: t.uid });
  }

  // Shove and Wallop want somewhere worth shoving INTO.
  for (const id of ['wallop', 'shove']) {
    const ab = pick(id);
    if (!ab || !adjacent.length) continue;
    const victim = adjacent.find(f => shoveLandsBadly(state, unit, f));
    if (victim) return use(ab, { uid: victim.uid });
  }

  // Cripple whoever is closing fastest and is not already slowed.
  const cripple = pick('cripple');
  if (cripple) {
    const runner = abilityTargets(state, unit, cripple)
      .map(t => state.units.find(u => u.uid === t.uid))
      .filter(u => u && u.move >= 4 && !u.slowed)
      .sort((a, b) => manhattan(unit, a) - manhattan(unit, b))[0];
    if (runner) return use(cripple, { uid: runner.uid });
  }

  // Snap shot at anything two ordinary shots would not finish.
  const snap = pick('snapshot');
  if (snap) {
    const hurt = weakestOf(abilityTargets(state, unit, snap));
    if (hurt && hurt.hp <= unit.weapon.damage * 2) return use(snap, { uid: hurt.uid });
  }

  // The rest are "I have nothing better to do with the action" moves, which
  // is exactly the turn that used to be wasted.
  if (!attackableTargets(state, unit).length) {
    const planted = pick('planted');
    if (planted && nextTo(unit)) return use(planted, { self: true });
    const over = pick('overwatch');
    if (over) return use(over, { self: true });
    // Barricade had NO rule here through v28, which MST_PARITY §3 recorded as
    // a gap in the bot rather than evidence about the ability — it meant
    // nothing had ever measured whether it earns its cost. Now it does:
    // drop cover when exposed with nothing to shoot at.
    const barricade = pick('barricade');
    if (barricade) {
      const t = abilityTargets(state, unit, barricade)
        .find(tile => exposure(state, tile, foes) < exposure(state, unit, foes));
      if (t) return use(barricade, t);
    }
  }

  return false;
}

// Would a shove put this body somewhere that hurts it? The pipe's whole
// reason to exist, and the one line of this bot that reads the hazard map
// offensively rather than defensively.
function shoveLandsBadly(state, unit, foe) {
  const dx = Math.sign(foe.x - unit.x), dy = Math.sign(foe.y - unit.y);
  for (let i = 1; i <= 3; i++) {
    const c = hazardCost(state, foe.x + dx * i, foe.y + dy * i);
    if (c > 0) return true;
  }
  return false;
}
