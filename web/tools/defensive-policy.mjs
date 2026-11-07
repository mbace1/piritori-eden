// Opt-in measuring policy, not gameplay AI or a combat-rule change.
// Uses the same pure route/forecast/intent functions as C.19's interface.
import { routes, forecast, threats, weapon } from '../fight-module/tactics.js?v=11';

const row = cell => Number(cell.split(',')[1]);
const distance = (a, b) => {
  const [ax, ay] = a.split(',').map(Number), [bx, by] = b.split(',').map(Number);
  return Math.abs(ax - bx) + Math.abs(ay - by);
};
// Preview mutations stay on copied people; plans and cover are read-only.
const previewBattle = battle => ({ ...battle,
  players: battle.players.map(person => ({ ...person })),
  enemies: battle.enemies.map(person => ({ ...person })),
});

/** Conservative intent risk, not an exact stochastic combat solver.
 * The shared forecast assumes earlier announced hits land when consuming guard;
 * chance-weighting those views is a heuristic. No RNG or live state is consumed.
 */
export function defensiveExposure(battle) {
  const intent = threats(battle), byPerson = {};
  let cost = 0;
  for (const person of battle.players.filter(p => p.alive && !p.evacuated)) {
    const views = intent.views.filter(view => view.valid && view.type === 'attack' && view.target === person.id);
    const expectedHp = views.reduce((sum, view) => sum + view.hpDamage * view.chance / 100, 0);
    const expectedGuard = views.reduce((sum, view) => sum + view.guardDamage * view.chance / 100, 0);
    const worstHp = intent.totals[person.id]?.hp ?? 0;
    const worstDown = worstHp >= person.hp && views.length > 0;
    // Avoid a forecast down, especially for low-health crew. Guard is useful,
    // but it is not treated as HP or as proof a foe will actually hit.
    const risk = expectedHp * 1.7 + expectedGuard * 0.06 + (worstDown ? 8 : 0);
    byPerson[person.id] = { expectedHp, expectedGuard, worstHp, worstDown, attacks: views.length };
    cost += risk;
  }
  return { cost, byPerson };
}

/** Choose one legal Move + Action plan. All score constants are bot heuristics. */
export function chooseDefensiveDecision(battle, person) {
  if (!person?.alive || person.evacuated || battle.status !== 'active') return null;
  const enemies = battle.enemies.filter(enemy => enemy.alive)
    .sort((a, b) => Number(Boolean(b.tough)) - Number(Boolean(a.tough)) || a.hp - b.hp);
  if (!enemies.length) return null;
  const getaway = battle.mission?.goal === 'getaway';
  const target = enemies[0], oldDistance = distance(person.cell, target.cell);
  const cells = battle.moved.includes(person.id) ? new Map([[person.cell, []]]) : routes(battle, person);
  const actionUsed = battle.acted.includes(person.id);
  const pressure = Math.min(1, (battle.mission?.heat ?? 0) / (battle.mission?.police?.at || 6));
  let best = null;
  for (const [cell, path] of cells) {
    const sim = previewBattle(battle), actor = sim.players.find(p => p.id === person.id);
    actor.cell = cell;
    const before = defensiveExposure(sim), actorRisk = before.byPerson[actor.id];
    const closing = oldDistance - distance(cell, target.cell);
    const south = row(person.cell) - row(cell);
    const progress = getaway ? south * 1.6 : closing * 0.8;
    const baseScore = progress - path.length * 0.04;
    const offer = (type, value, actionValue, risk, details = {}) => {
      const score = baseScore + actionValue - risk;
      const decision = { actor: person.id, cell, type, value, score,
        intent: actorRisk, ...details };
      if (!best || score > best.score + 1e-9) best = decision;
    };
    offer('hold', null, 0, before.cost);
    if (actionUsed) continue;
    if (getaway && row(cell) === 0) {
      const extracted = previewBattle(sim), gone = extracted.players.find(p => p.id === actor.id);
      gone.alive = false; gone.evacuated = true;
      offer('extract', null, 30, defensiveExposure(extracted).cost);
    }
    let legalAttackSeen = false;
    for (const enemy of sim.enemies.filter(e => e.alive)) {
      const hit = forecast(sim, actor, enemy);
      if (!hit.valid) continue;
      legalAttackSeen = true;
      const onHit = previewBattle(sim), hurt = onHit.enemies.find(e => e.id === enemy.id);
      hurt.guard -= hit.guardDamage; hurt.hp -= hit.hpDamage; hurt.alive = hurt.hp > 0;
      const chance = hit.chance / 100, killed = !hurt.alive;
      const risk = chance * defensiveExposure(onHit).cost + (1 - chance) * before.cost;
      const attackValue = chance * (hit.hpDamage * 1.1 + hit.guardDamage * 0.4
        + (killed ? 4 + (enemy.tough ? 2 : 0) : 0)) * (1 + pressure * 0.5);
      offer('attack', enemy.id, attackValue, risk, { forecast: hit });
    }
    const gain = Math.min(4, actor.guard + 2) - actor.guard;
    if (gain > 0) {
      const braced = previewBattle(sim);
      braced.players.find(p => p.id === actor.id).guard += gain;
      const after = defensiveExposure(braced);
      // If Move closes distance and no attack wins the comparison, spending a
      // spare Action on persistent guard does not consume an extra round.
      // Holding still with no incoming threat earns no preparation bonus.
      const preparation = !legalAttackSeen && (getaway ? south > 0 : closing > 0) ? gain * 0.3 : 0;
      if (after.cost < before.cost || preparation > 0) {
        offer('brace', null, preparation, after.cost, {
          guardGain: gain, riskSaved: before.cost - after.cost,
          worstDownPrevented: actorRisk?.worstDown && !after.byPerson[actor.id]?.worstDown,
          spareActionPreparation: preparation > 0 && !actorRisk?.attacks,
        });
      }
    }
    if (actor.itemIds?.includes('training-bandage') && actor.hp < actor.maxHp) {
      const healed = previewBattle(sim), heal = Math.min(2, actor.maxHp - actor.hp);
      healed.players.find(p => p.id === actor.id).hp += heal;
      offer('item', null, heal * 1.1, defensiveExposure(healed).cost, { heal });
    }
    if (weapon(actor).magazine && actor.ammo < 1) offer('reload', null, 1.5, before.cost);
  }
  return best;
}

export function defensivePolicy(fight, onDecision = () => {}) {
  const battle = fight.battle;
  if (battle.mission?.police?.arrived && !battle.mission.police.resolved) return;
  const people = battle.players.filter(p => p.alive && !p.evacuated)
    .sort((a, b) => Number(Boolean(b.carrying)) - Number(Boolean(a.carrying)) || a.hp - b.hp);
  for (const person of people) {
    if (battle.status !== 'active') return;
    if (!fight.command('select', person.id).ok) continue;
    const decision = chooseDefensiveDecision(battle, person);
    if (!decision) continue;
    let moved = null;
    if (decision.cell !== person.cell) moved = fight.command('move', decision.cell);
    const result = decision.type === 'hold' ? null : fight.command(decision.type, decision.value);
    onDecision({ ...decision, moveOK: moved?.ok ?? null, actionOK: result?.ok ?? null });
  }
}
