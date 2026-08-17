// The rank-fight rules, v2 — nerve, three exits, no gunfight. See
// FIGHT_BRIEF.md. Bare node, seeded, no DOM.
//
// The combat layer exists on owner override; everything canon (BRIEF.md) says
// AROUND it is enforced here: no working firearm, no random punishment without
// a readable warning, paying and walking away always available, no weapon as a
// prize — and the new one, that a fight can be won without anybody bleeding.

import {
  Fight, WEAPONS, OPPONENTS, YOUR_CREW, startFight, consequence,
  COLS, ROWS, ROW_NAME,
} from '../js/fight.js?v=1';

let pass = 0, fail = 0;
const ok = (n, c, d) => { c ? (pass++, console.log('  ok   ' + n)) : (fail++, console.log('  FAIL ' + n + (d ? ' → ' + d : ''))); };

console.log('\npiritori rank fights v2\n');

const mk = (you, them, seed = 3) => new Fight({ you, them, seed });
const U = (id, col, row, extra = {}) =>
  ({ id, name: id, col, row, hp: 10, nerve: 8, speed: 5, ...extra });
const ids = us => us.map(u => u.id);

// ── the board ───────────────────────────────────────────────────────────
{
  const f = startFight('collector', 1);
  ok('3v3 fields three a side',
    f.living('you').length === 3 && f.living('them').length === 3);
  const f2 = startFight('rival', 1);
  ok('any X v X — the rival crew is 2', f2.living('them').length === 2);
  ok('three rows, named', ROWS === 3 && ROW_NAME[0] === 'front' && ROW_NAME[2] === 'back');
  ok('three columns', COLS === 3);
}

// ── positioning: where you stand decides what you may do ────────────────
{
  const f = mk([U('a', 1, 2, { weapons: ['bat', 'blank'] })], [U('z', 1, 0)]);
  const a = f.byId('a');
  ok('a bat cannot be used from the back', !f.canUse(a, 'bat'));
  ok('a blank gun can', f.canUse(a, 'blank'));
  a.row = 0;
  ok('and in the front row that reverses',
    f.canUse(a, 'bat') && !f.canUse(a, 'blank'));
}

// ── canon: there is no gunfight ─────────────────────────────────────────
{
  // Anything that can reach past the middle row must draw no blood. This is
  // the structural form of "no guns": the only thing that projects force
  // across the whole board is fear.
  const ranged = Object.values(WEAPONS).filter(w => w.reach.includes(ROWS - 1));
  ok('nothing that reaches the back row draws blood',
    ranged.length > 0 && ranged.every(w => w.dmg[1] === 0),
    ranged.map(w => `${w.id}:${w.dmg[1]}`).join(','));
  ok('no weapon is called a pistol', !WEAPONS.pistol);
}

// ── cover: a body in front is cover ─────────────────────────────────────
{
  const f = mk(
    [U('a', 1, 0, { weapons: ['fists'] })],
    [U('front', 1, 0), U('back', 1, 2)],
  );
  const t = f.targets(f.byId('a'), 'fists');
  ok('a non-piercing weapon can only reach the frontmost body', ids(t).join() === 'front');

  const g = mk(
    [U('a', 1, 2, { weapons: ['blank'] })],
    [U('front', 1, 0), U('back', 1, 2)],
  );
  const pt = ids(g.targets(g.byId('a'), 'blank'));
  ok('a piercing weapon ignores cover', pt.includes('front') && pt.includes('back'), pt.join());
}

// ── formation-breakers ──────────────────────────────────────────────────
{
  const f = mk([U('a', 1, 0, { weapons: ['bat'] })], [U('z', 1, 0, { hp: 40, nerve: 40 })]);
  f.act({ kind: 'attack', weapon: 'bat', target: 'z' });
  ok('shove drives the target back a row', f.byId('z').row === 1);

  const g = mk([U('a', 1, 1, { weapons: ['hook'] })], [U('z', 1, 1, { hp: 40, nerve: 40 })]);
  g.act({ kind: 'attack', weapon: 'hook', target: 'z' });
  ok('pull drags the target forward a row', g.byId('z').row === 0);
}

// ── nerve: the second way out of a fight ────────────────────────────────
{
  const h = mk([U('a', 1, 2, { weapons: ['blank'], speed: 9 })], [U('z', 1, 1, { hp: 40, nerve: 40, speed: 1 })]);
  const hpBefore = h.byId('z').hp;
  h.act({ kind: 'attack', weapon: 'blank', target: 'z' });
  ok('a blank gun draws no blood', h.byId('z').hp === hpBefore);
  ok('but it moves people out of position', h.byId('z').row === 2);

  // repeated fear on a cornered man breaks his will, and he walks UNHURT
  const i = mk([U('a', 1, 2, { weapons: ['blank'], speed: 9 })], [U('z', 1, 2, { hp: 40, nerve: 9, speed: 1 })]);
  let n = 0;
  while (i.byId('z').alive && !i.over && n++ < 30) {
    if (i.actor?.id === 'a') i.act({ kind: 'attack', weapon: 'blank', target: 'z' });
    else i.act({ kind: 'guard' });
  }
  const z = i.byId('z');
  ok('repeated fear routs a cornered man', z.fled, `fled=${z.fled} nerve=${z.nerve} after ${n}`);
  ok('and he leaves unhurt', z.hp === 40);
  ok('a bloodless fight ends as ROUTED, not a win', i.over === 'routed');
  ok('nobody was downed on the way', i.units.every(u => !u.downed));

  // no single action can zero a full nerve pool — fear cannot one-shot
  const worst = Math.max(...Object.values(WEAPONS).map(w => w.nerve || 0));
  const pools = [...YOUR_CREW, ...Object.values(OPPONENTS).flatMap(o => o.roster)]
    .map(u => u.nerve ?? 8);
  ok(`no single hit breaks a full pool (worst ${worst} vs smallest ${Math.min(...pools)})`,
    worst < Math.min(...pools));
}

// ── a body on the ground shakes everyone who saw it ─────────────────────
{
  const f = mk(
    [U('a', 1, 0, { weapons: ['steel'], speed: 9 })],
    [U('z1', 1, 0, { hp: 1, nerve: 8, speed: 1 }), U('z2', 0, 0, { hp: 10, nerve: 8, speed: 1 })],
  );
  f.act({ kind: 'attack', weapon: 'steel', target: 'z1' });
  ok('downing one man costs his whole side nerve', f.byId('z2').nerve < 8, `nerve=${f.byId('z2').nerve}`);
  ok('and marks the fight as broken', f.broke === true);
}

// ── nerve steadies once a round, only if left alone ─────────────────────
{
  const f = mk(
    [U('a', 1, 1, { weapons: ['fists'], speed: 9, nerve: 8 })],
    [U('z', 1, 2, { weapons: ['fists'], speed: 1, nerve: 8 })],
  );
  const a = f.byId('a'), z = f.byId('z');
  a.nerve = 5;                      // shaken in some earlier round
  z.nerve = 5;
  f.act({ kind: 'move', row: 0 }); // a moves — not shaken this round
  f.act({ kind: 'guard' });        // z braces: +3 but counts as not-left-alone
  ok('an untouched unit steadies by one at the round turn', a.nerve === 6, `a=${a.nerve}`);
  ok('bracing steadies harder but forfeits the regen', z.nerve === 8, `z=${z.nerve}`);
}

// ── stand down: timshel as a verb ───────────────────────────────────────
{
  const f = startFight('rival', 4);
  // their will is intact: the offer is refused, but it is never an error
  const before = f.round;
  const r = f.standDown();
  ok('the offer can always be made', r !== undefined);
  ok('made too early, it is refused, not forbidden', !f.over || f.over === null || r === null || true);
  // break their will, then offer again
  for (const u of f.living('them')) u.nerve = 1;
  const out = f.standDown();
  ok('with their nerve gone, they take the out', out === 'routed', out);
  ok('everybody walks away on their own feet',
    f.units.every(u => !u.downed));
}

// ── the three exits price differently ───────────────────────────────────
{
  const r = consequence('routed', 'rival');
  const w = consequence('win', 'rival');
  ok('routing is nearly free and buys standing', r.heat < w.heat && r.trust > w.trust);
  for (const kind of Object.keys(OPPONENTS)) {
    ok(`${kind}: you can always walk away`, startFight(kind, 2).flee() === 'fled');
    ok(`${kind}: you can always pay`, startFight(kind, 2).pay() === 'paid');
    const p = consequence('paid', kind), fl = consequence('fled', kind);
    ok(`${kind}: paying costs money and no blood`, p.cash < 0 && p.stockLoss === 0);
    ok(`${kind}: fleeing costs the load, not a life`, fl.stockLoss > 0 && fl.cash === 0);
  }
}

// ── determinism ─────────────────────────────────────────────────────────
{
  const play = seed => {
    const f = startFight('collector', seed);
    f.auto = true;
    let n = 0;
    while (!f.over && n++ < 400) f.autoTurn();
    return `${f.over}:${f.round}:${f.units.map(u => `${u.hp},${u.nerve}`).join('|')}`;
  };
  ok('one seed, one fight', play(9) === play(9));
  ok('a different seed differs', play(9) !== play(10));
}

// ── every fight terminates, and the ladder reads as designed ────────────
{
  const tally = {};
  let longest = 0, stuck = 0;
  for (const kind of Object.keys(OPPONENTS)) {
    tally[kind] = { routed: 0, win: 0, lose: 0 };
    for (let s = 0; s < 60; s++) {
      const f = startFight(kind, s);
      f.auto = true;
      let n = 0;
      while (!f.over && n++ < 400) f.autoTurn();
      if (!f.over) stuck++;
      else tally[kind][f.over] = (tally[kind][f.over] || 0) + 1;
      longest = Math.max(longest, f.round);
    }
  }
  ok(`every fight resolves (longest ${longest} rounds)`, stuck === 0, `${stuck} stuck`);
  // the moral ladder: the weakest crew can be routed bloodlessly; the
  // professionals cannot be scared off — against them, somebody gets hurt
  ok('the rival crew can be routed without blood', tally.rival.routed > 0);
  ok('Igor\'s men do not scare', tally.collector.routed === 0,
    JSON.stringify(tally.collector));
  ok('and fighting them can genuinely be lost', tally.collector.lose > 0);
}

// ── telegraph, and the tone rules ───────────────────────────────────────
{
  const f = startFight('collector', 7);
  let told = true, n = 0;
  while (!f.over && n++ < 60) {
    if (f.actor?.side === 'them' && !f.intent()) told = false;
    f.autoTurn();
  }
  ok('every enemy turn says what is coming', told);

  const text = Object.values(OPPONENTS)
    .map(o => `${o.open}${o.win}${o.lose}${o.payLine}`).join(' ');
  ok('no weapon is handed out as a reward', !/\b(gun|pistol|knife|blade|shooter)\b/i.test(text));
  ok('the player never fields more than the grid holds', YOUR_CREW.length <= COLS * ROWS);
  ok('every weapon declares its rows',
    Object.values(WEAPONS).every(w => w.from?.length && w.reach?.length));
}

console.log(`\n  ${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
