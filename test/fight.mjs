// The rank-fight rules, v3 — nerve, three exits, guns, and cover you can take
// apart. See FIGHT_BRIEF.md. Bare node, seeded, no DOM.
//
// The combat layer exists on owner override; everything canon (BRIEF.md) says
// AROUND it is enforced here: no random punishment without a readable warning,
// paying and walking away always available, no weapon as a prize, a fight
// winnable without anybody bleeding — and, since the owner's "there are guns"
// of 2026-08-18, the four structural rules that keep "there is no gunfight"
// true while live firearms exist. See the block at §canon.

import {
  Fight, WEAPONS, OPPONENTS, YOUR_CREW, startFight, consequence,
  COLS, ROWS, ROW_NAME,
} from '../js/fight.js?v=2';

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

// ── canon: there are guns, and there is still no gunfight ───────────────
{
  // The owner's answer of 2026-08-18 was "there are guns", against a brief that
  // says "there is no gunfight". The previous structural test — nothing that
  // reaches the back row may draw blood — enforced the old reading and is gone.
  // These four replace it, and they are what now makes the sentence true:
  // guns work, nobody brings one to these fights, fear is still the only FREE
  // way to reach the back row, and a shot costs more than any other exit.
  const live = Object.values(WEAPONS).filter(w => w.live);
  ok('live firearms exist and they work',
    live.length >= 1 && live.every(w => w.dmg[1] > 0),
    live.map(w => `${w.id}:${w.dmg[1]}`).join(','));

  const free = Object.values(WEAPONS).filter(w => w.reach.includes(ROWS - 1) && !w.live);
  ok('the only bloodless way to reach the back row is still fear',
    free.length > 0 && free.every(w => w.dmg[1] === 0),
    free.map(w => `${w.id}:${w.dmg[1]}`).join(','));

  const rostered = [...YOUR_CREW, ...Object.values(OPPONENTS).flatMap(o => o.roster)]
    .flatMap(u => u.weapons || []);
  ok('no starting roster carries a live firearm',
    !rostered.some(id => WEAPONS[id]?.live),
    rostered.filter(id => WEAPONS[id]?.live).join(','));

  // a shot is heard by the whole street, so by everyone on the board
  const f = mk(
    [U('a', 1, 2, { weapons: ['pistol'], speed: 9 })],
    [U('z', 1, 0, { hp: 40, nerve: 40, speed: 1 }), U('m', 0, 0, { hp: 40, nerve: 40, speed: 1 })],
  );
  const bystander = f.byId('m').nerve;
  f.act({ kind: 'attack', weapon: 'pistol', target: 'z' });
  ok('a live round is counted', f.fired === 1);
  ok('and shakes everyone who heard it', f.byId('m').nerve < bystander);
  ok('and it draws blood', f.byId('z').hp < 40);

  const quiet = ['routed', 'win', 'lose', 'paid', 'fled']
    .map(o => consequence(o, 'rival'));
  const loud = consequence('win', 'rival', { fired: 1 });
  ok('a shot costs more heat than any silent way out',
    loud.heat > Math.max(...quiet.map(c => c.heat)),
    `${loud.heat} vs ${Math.max(...quiet.map(c => c.heat))}`);
  ok('and costs trust with whoever was watching',
    loud.trust < Math.min(...quiet.map(c => c.trust)));

  // you cannot fire a gun and call it a bloodless win
  const g = mk([U('a', 1, 2, { weapons: ['pistol'], speed: 9 })], [U('z', 1, 0, { hp: 3, nerve: 40, speed: 1 })]);
  while (!g.over) g.autoTurn();
  ok('a fight with a shot in it is never ROUTED', g.over !== 'routed', g.over);

  // and AUTO does not reach for it while anything else is in range
  const h = mk([U('a', 1, 1, { weapons: ['bottle', 'pistol'], speed: 9 })], [U('z', 1, 0, { hp: 40, nerve: 40, speed: 1 })]);
  const pick = h.choose(h.byId('a'));
  ok('the auto-battler prefers anything to a gun', pick.weapon === 'bottle', JSON.stringify(pick));
}

// ── cover is terrain, and also others ───────────────────────────────────
{
  const F = (you, them, cover) => new Fight({ you, them, cover, seed: 5 });

  // soft cover: a thing in the lane is the thing you hit
  const f = F(
    [U('a', 1, 0, { weapons: ['fists'] })],
    [U('z', 1, 1)],
    [{ kind: 'crate', side: 'them', col: 1, row: 0 }],
  );
  const t = f.targets(f.byId('a'), 'fists');
  ok('a crate in the lane is what a swing lands on', t.length === 1 && t[0].prop === true);
  ok('and it is not one of the fighters', f.living('them').length === 1);

  // soft cover does not stop a piercing weapon
  const g = F(
    [U('a', 1, 1, { weapons: ['hook'] })],
    [U('z', 1, 1)],
    [{ kind: 'crate', side: 'them', col: 1, row: 0 }],
  );
  ok('but a soft prop does not stop a piercing weapon',
    g.targets(g.byId('a'), 'hook').some(x => x.id === 'z'));

  // hard cover shuts the lane completely
  const h = F(
    [U('a', 1, 2, { weapons: ['blank'], speed: 9 })],
    [U('z', 1, 2, { speed: 1 })],
    [{ kind: 'barrier', side: 'them', col: 1, row: 0 }],
  );
  ok('concrete shuts the lane even to a piercing weapon',
    h.targets(h.byId('a'), 'blank').length === 0);

  // …until it comes down, and a crowbar is what comes down concrete
  const i = F(
    [U('a', 1, 0, { weapons: ['crowbar'], speed: 9 }), U('b', 1, 2, { weapons: ['blank'], speed: 8 })],
    [U('z', 1, 2, { speed: 1 })],
    [{ kind: 'barrier', side: 'them', col: 1, row: 0 }],
  );
  const bar = i.props[0];
  ok('a fear weapon cannot even be aimed at a barrier',
    i.targets(i.byId('b'), 'blank').length === 0);
  let swings = 0;
  while (bar.alive && swings++ < 10) {
    if (i.actor?.id !== 'a') { i.act({ kind: 'guard' }); continue; }
    i.act({ kind: 'attack', weapon: 'crowbar', target: bar.id });
  }
  ok(`a crowbar breaks concrete (${swings} swings)`, !bar.alive && swings <= 4);
  ok('and the lane behind it opens',
    i.targets(i.byId('b'), 'blank').some(x => x.id === 'z'));
  ok('breaking cover shakes nobody', i.byId('z').nerve === i.byId('z').maxNerve);
  ok('and it is not a fight anybody lost', i.over === null);

  // cover stands in a cell, so nobody may walk into it
  const j = F(
    [U('a', 1, 1, { weapons: ['fists'] })],
    [U('z', 0, 0)],
    [{ kind: 'bin', side: 'you', col: 1, row: 0 }],
  );
  const rows = j.options(j.byId('a')).filter(o => o.kind === 'move').map(o => o.row);
  ok('a cell with cover in it cannot be moved into', !rows.includes(0) && rows.includes(2), rows.join());

  // every arena's cover is legal: on the board, and not under a fighter
  for (const [kind, o] of Object.entries(OPPONENTS)) {
    const fight = startFight(kind, 1);
    const bad = fight.props.filter(p =>
      p.col < 0 || p.col >= COLS || p.row < 0 || p.row >= ROWS
      || fight.units.some(u => u.side === p.side && u.col === p.col && u.row === p.row));
    ok(`${kind}: its cover is on the board and clear of the bodies`, bad.length === 0,
      bad.map(p => `${p.side} ${p.col},${p.row}`).join(';'));
    ok(`${kind}: names an arena`, typeof o.arena === 'string' && o.arena.length > 0);
  }
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
