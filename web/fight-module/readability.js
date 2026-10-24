// Presentation only. These views never edit a battle or its committed history.
export function fighterLabel(battle, unit, {targetId = null, full = false} = {}) {
  const selected = battle.selectedId === unit.id;
  const targeted = targetId === unit.id;
  const objective = battle.mission?.targetId === unit.id && !unit.evacuated;
  const badge = objective ? (unit.alive ? 'ESCORT' : unit.helped ? 'DOWN' : 'HELP') : '';
  return {selected, targeted, objective, badge,
    detail: full || selected || targeted || !unit.alive ? 'full' : 'compact',
    description: `${unit.label || unit.id} · ${unit.name} · ${unit.evacuated ? 'home' : unit.alive ? `HP ${unit.hp}/${unit.maxHp}, guard ${unit.guard}` : 'down'}${badge ? ' · ' + badge : ''}`};
}

export function missionCue(battle, coordinate) {
  const m = battle.mission;
  if (!m) return null;
  // Act I v4.74: every campaign fight is a getaway. Nobody has to be beaten;
  // everyone has to reach the exit, and a fallen friend has to be got up first.
  if (m.objective === 'getaway') {
    const out = battle.players.filter(p => p.extracted).length, all = battle.players.length;
    const fallen = battle.players.find(p => !p.alive && !p.evacuated && !p.helped);
    const goal = fallen ? `Help ${fallen.name} at ${coordinate(fallen.cell)}, then everyone out → EXIT A1–F1`
      : out ? `${out}/${all} out · everyone out → EXIT A1–F1` : 'Get everyone out → EXIT A1–F1';
    return {goal, exit: 'EXIT · A1–F1', cost: 'EXTRACT · 1 ACTION'};
  }
  const target = battle.players.find(p => p.id === m.targetId);
  const carrier = battle.players.find(p => p.id === m.carrierId);
  let goal;
  if (target?.extracted) goal = 'Colleague home · extract the remaining crew';
  else if (target?.alive) goal = `Escort ${target.name} → EXIT A1–F1`;
  else if (target?.helped) goal = `${target.name} is down again · rescue unavailable this outing`;
  else if (target) goal = `Help ${target.name} at ${coordinate(target.cell)} → EXIT A1–F1`;
  else if (carrier?.extracted) goal = 'Kit secured · extract the remaining crew';
  else if (carrier?.alive) goal = `${carrier.name} has the kit → EXIT A1–F1`;
  else if (carrier?.helped) goal = `${carrier.name} is down again with the kit · rescue unavailable this outing`;
  else if (carrier) goal = `${carrier.name} is down with the kit · check Help`;
  else goal = `Recover kit at ${coordinate(m.targetCell)} → EXIT A1–F1`;
  return {goal, exit: 'EXIT · A1–F1', cost: 'EXTRACT · 1 ACTION'};
}
