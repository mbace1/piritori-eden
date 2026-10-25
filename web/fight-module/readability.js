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
  // Act I v4.75: a campaign fight's job is a fight (make them back off) or a
  // getaway (everyone out). The police, once here, outrank both.
  if (m.goal) {
    // v4.78: with nobody on the ground both answers cost the same, so there
    // is no question, only the way out (crew-run/run.js policeOutcome).
    if (m.police?.arrived && !m.police.resolved) {
      const down = battle.players.some(p => !p.alive && !p.evacuated && !p.taken && p.id !== m.protagonist);
      return {goal: down ? 'The police are here · Back off, or help your friends' : 'The police are here · Nobody is down: clear out', exit: 'EXIT · A1–F1', cost: 'ANSWER · NO ACTION'};
    }
    const fallen = battle.players.find(p => !p.alive && !p.evacuated && !p.helped);
    if (m.goal === 'fight') {
      const standing = battle.enemies.filter(e => e.alive).length;
      return {goal: `Make them back off · ${standing} still standing${fallen ? ` · help ${fallen.name} at ${coordinate(fallen.cell)}` : ''}`, exit: 'EXIT · A1–F1', cost: 'WITHDRAW · THE JOB IS LOST'};
    }
    const out = battle.players.filter(p => p.extracted).length, all = battle.players.length;
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
