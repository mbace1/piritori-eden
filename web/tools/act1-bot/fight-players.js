// The two fight players from web/tools/fight-balance.mjs, as a browser module.
// careless: close on the nearest rival and swing. careful: read the shown
// plans and play against them (see fight-balance.mjs for the full reasoning).
export function players(R, T) {
  const rowOf = cell => Number(cell.split(',')[1]);
  const dist = (a, c) => { const [x, y] = a.split(',').map(Number), [u, v] = c.split(',').map(Number); return Math.abs(x - u) + Math.abs(y - v); };
  function careless(fight) {
    const b = fight.battle;
    if (b.mission.goal === 'getaway') return runOut(fight);
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
  function runOut(fight) {
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
  // Night Shift's own rout rule: routs(b) where the build has it, else RULES.rout of their weight (a tough one weighs two).
  const broken = b => {
    const side = b.enemies.filter(e => e.rival);
    if (!side.some(e => e.alive)) return true;
    if (R.routs) return R.routs(b);
    const w = e => (e.tough ? 2 : 1), total = side.reduce((n, e) => n + w(e), 0), down = side.filter(e => !e.alive && !e.fled).reduce((n, e) => n + w(e), 0);
    return down >= total * (R.RULES?.rout ?? 0.5);
  };
  function outlook(b) {
    if (b.mission.goal === 'fight' && broken(b)) return { hp: 0, downs: 0, ends: true };
    const { totals } = T.threats(b);
    let hp = 0, downs = 0;
    for (const p of b.players) { const t = totals[p.id]; if (!t || !p.alive) continue; hp += Math.min(p.hp, t.hp); if (t.hp >= p.hp) downs += 1; }
    return { hp, downs, ends: false };
  }
  function choices(b, p, to) {
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
  function score(b, p, to, c) {
    const sim = { ...b, log: [], players: b.players.map(u => ({ ...u })), enemies: b.enemies.map(u => ({ ...u })) };
    const me = sim.players.find(u => u.id === p.id), goal = b.mission.goal;
    let gain = 0;
    if (c.type === 'attack') {
      const t = sim.enemies.find(u => u.id === c.target), odds = c.f.chance / 100;
      gain += odds * c.f.hpDamage * (t.tough ? 1.5 : 1);
      if (odds >= 0.5) { t.hp -= c.f.hpDamage; t.guard -= c.f.guardDamage; t.alive = t.hp > 0; if (!t.alive) gain += t.tough ? 4 : 2; }
      if (goal === 'getaway') gain = 0.2 * odds * c.f.hpDamage - (t.alive ? 0 : 1);
    }
    if (c.type === 'brace') me.guard = Math.min(4, me.guard + 2);
    if (c.type === 'help') { const a = sim.players.find(u => u.id === c.target); a.alive = true; a.hp = p.kit === 'medical' ? 3 : 1; gain += 4; }
    me.cell = to;
    if (c.type === 'extract') { me.alive = false; me.evacuated = true; gain += 8; }
    const o = outlook(sim);
    const pol = b.mission.police, late = goal === 'fight' && (pol.afterRound !== null || b.mission.heat >= pol.at - 2);
    let s = gain - (late ? 0.5 : 1.5) * o.hp - (late ? 1 : 4) * o.downs + (o.ends ? (late ? 12 : 6) : 0);
    if (goal === 'getaway' && c.type !== 'extract') s -= 1.0 * rowOf(to);
    if (goal === 'fight') { const near = sim.enemies.filter(e => e.alive).map(e => dist(to, e.cell)); if (near.length) s -= 0.1 * Math.min(...near); }
    return s;
  }
  function careful(fight) {
    const b = fight.battle;
    for (const p of b.players.filter(u => u.alive && !u.evacuated)) {
      if (b.status !== 'active') return;
      if (!fight.command('select', p.id).ok) continue;
      let best = null;
      for (const to of T.routes(b, p).keys()) for (const c of choices(b, p, to)) { const v = score(b, p, to, c); if (!best || v > best.v) best = { to, c, v }; }
      if (!best) continue;
      const act = () => (best.c.type === 'none' ? true : fight.command(best.c.type, best.c.target).ok);
      if (best.c.type === 'attack' && best.c.first) { act(); if (b.status === 'active' && p.alive && best.to !== p.cell) fight.command('move', best.to); }
      else { if (best.to !== p.cell) fight.command('move', best.to); if (b.status === 'active') act(); }
    }
  }
  const police = b => (R.policeOutcome(b, 'HELP_FRIENDS').taken.length < R.policeOutcome(b, 'BACK_OFF').taken.length ? 'HELP_FRIENDS' : 'BACK_OFF');
  function play(fight, how) {
    const b = fight.battle, hp0 = b.players.reduce((n, p) => n + p.hp, 0);
    for (let guard = 0; b.status === 'active' && guard < 40; guard += 1) {
      (how === 'careful' ? careful : careless)(fight);
      if (b.status !== 'active') break;
      if (b.mission.police.arrived && !b.mission.police.resolved) fight.command('police', how === 'careful' ? police(b) : 'BACK_OFF');
      else fight.command('end');
    }
    const hp1 = b.players.reduce((n, p) => n + Math.max(0, p.alive || p.evacuated ? p.hp : 0), 0);
    return { result: b.result, end: b.mission.end, goal: b.mission.goal, rounds: b.round, routed: b.mission.routed, police: b.mission.police.arrived, heat: b.mission.heat, hpLost: hp0 - hp1,
      downs: b.players.filter(p => p.wasDown || p.taken || (!p.alive && !p.evacuated)).length, crew: b.players.length, rivals: b.enemies.length };
  }
  return { play };
}
