// The rank-fight rules, in bare node. See FIGHT_BRIEF.md.
//
// Added on owner override — BRIEF.md forbids a combat layer — so alongside the
// tactical rules these check the constraints the brief still imposes: paying
// and walking away always available, an explicit telegraph, and no weapon
// handed out as a prize.

import {
  Fight, WEAPONS, OPPONENTS, YOUR_CREW, startFight, consequence,
  COLS, ROWS, ROW_NAME,
} from '../js/fight.js?v=1';

let pass = 0, fail = 0;
const ok = (n, c, d) => { c ? (pass++, console.log('  ok   ' + n)) : (fail++, console.log('  FAIL ' + n + (d ? ' → ' + d : ''))); };

console.log('\npiritori rank fights\n');

const mk = (you, them, seed = 3) => new Fight({ you, them, seed });
const U = (id, col, row, extra = {}) =>
  ({ id, name: id, col, row, hp: 10, speed: 5, ...extra });

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
  const f = mk([U('a', 1, 2, { weapons: ['bat', 'pistol'] })], [U('z', 1, 0)]);
  const a = f.byId('a');
  ok('a bat cannot be used from the back', !f.canUse(a, 'bat'));
  ok('a pistol can', f.canUse(a, 'pistol'));
  a.row = 0;
  ok('and in the front row that reverses',
    f.canUse(a, 'bat') && !f.canUse(a, 'pistol'));
}

// ── cover: a body in front is cover ─────────────────────────────────────
{
  const f = mk(
    [U('a', 1, 0, { weapons: ['fists'] })],
    [U('front', 1, 0), U('back', 1, 2)],
  );
  const a = f.byId('a');
  const t = f.targets(a, 'fists').map(u => u.id);
  ok('a non-piercing weapon can only reach the frontmost body', t.join() === 'front');

  f.byId('front').hp = 0;                       // the cover falls
  const t2 = f.targets(a, 'fists').map(u => u.id);
  ok('and once the cover is down the back is exposed... if it is in reach',
    t2.length === 0, `reach is front only, got ${t2}`);

  // a piercing weapon ignores the body in front entirely
  const g = mk(
    [U('a', 1, 2, { weapons: ['pistol'] })],
    [U('front', 1, 0), U('back', 1, 2)],
  );
  const pt = f2ids(g.targets(g.byId('a'), 'pistol'));
  ok('a piercing weapon ignores cover', pt.includes('front') && pt.includes('back'), pt.join());
}
function f2ids(us) { return us.map(u => u.id); }

// ── formation-breakers ──────────────────────────────────────────────────
{
  const f = mk([U('a', 1, 0, { weapons: ['bat'] })], [U('z', 1, 0, { hp: 40 })]);
  f.act({ kind: 'attack', weapon: 'bat', target: 'z' });
  ok('shove drives the target back a row', f.byId('z').row === 1);

  const g = mk([U('a', 1, 1, { weapons: ['hook'] })], [U('z', 1, 1, { hp: 40 })]);
  g.act({ kind: 'attack', weapon: 'hook', target: 'z' });
  ok('pull drags the target forward a row', g.byId('z').row === 0);

  // the blank gun: no damage at all, and one of the strongest pieces
  const h = mk([U('a', 1, 2, { weapons: ['blank'] })], [U('z', 1, 1, { hp: 40 })]);
  const hpBefore = h.byId('z').hp;
  h.act({ kind: 'attack', weapon: 'blank', target: 'z' });
  ok('a blank gun does no damage', h.byId('z').hp === hpBefore);
  ok('but it moves people out of position', h.byId('z').row === 2);

  const i = mk([U('a', 1, 2, { weapons: ['blank'] })], [U('z', 1, 2, { hp: 40 })]);
  i.act({ kind: 'attack', weapon: 'blank', target: 'z' });
  ok('and with nowhere left to back into, it empties the back row', !i.byId('z').alive);
}

// ── movement is one rank and costs the turn ─────────────────────────────
{
  const f = mk([U('a', 1, 1)], [U('z', 1, 0)]);
  const moves = f.options(f.byId('a')).filter(o => o.kind === 'move').map(o => o.row);
  ok('a unit may step one row either way', moves.sort().join() === '0,2');
  const g = mk([U('a', 1, 1), U('b', 1, 0)], [U('z', 1, 0)]);
  const gm = g.options(g.byId('a')).filter(o => o.kind === 'move').map(o => o.row);
  ok('and never into an occupied cell', gm.join() === '2');
}

// ── determinism ─────────────────────────────────────────────────────────
{
  const play = seed => {
    const f = startFight('collector', seed);
    f.auto = true;
    let n = 0;
    while (!f.over && n++ < 400) f.autoTurn();
    return `${f.over}:${f.round}:${f.units.map(u => u.hp).join(',')}`;
  };
  ok('one seed, one fight', play(9) === play(9));
  ok('a different seed differs', play(9) !== play(10));
}

// ── the auto-battler is the same resolver both sides use ────────────────
{
  const f = startFight('rival', 4);
  const u = f.living('them')[0];
  const a1 = f.choose(u);
  const a2 = f.choose(u);
  ok('the resolver is stable for a given board', JSON.stringify(a1) === JSON.stringify(a2));
  ok('and it is offered to the player too', typeof f.choose === 'function' && 'auto' in f);
}

// ── every fight terminates, from every roster ───────────────────────────
{
  let longest = 0, stuck = 0;
  for (const kind of Object.keys(OPPONENTS)) {
    for (let s = 0; s < 40; s++) {
      const f = startFight(kind, s);
      f.auto = true;
      let n = 0;
      while (!f.over && n++ < 400) f.autoTurn();
      if (!f.over) stuck++;
      longest = Math.max(longest, f.round);
    }
  }
  ok(`every fight resolves (longest ${longest} rounds)`, stuck === 0, `${stuck} stuck`);
}

// ── walking away and paying are always real options ─────────────────────
{
  for (const kind of Object.keys(OPPONENTS)) {
    ok(`${kind}: you can always walk away`, startFight(kind, 2).flee() === 'fled');
    ok(`${kind}: you can always pay`, startFight(kind, 2).pay() === 'paid');
    const p = consequence('paid', kind), fl = consequence('fled', kind);
    ok(`${kind}: paying costs money and no blood`, p.cash < 0 && p.stockLoss === 0);
    ok(`${kind}: fleeing costs the load, not a life`, fl.stockLoss > 0 && fl.cash === 0);
  }
}

// ── the telegraph, and the tone rules ───────────────────────────────────
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
  ok('no gun is handed out as a reward', !/\b(gun|pistol|knife|blade|shooter)\b/i.test(text));
  ok('the player never fields more than the grid holds', YOUR_CREW.length <= COLS * ROWS);
  ok('every weapon declares its rows',
    Object.values(WEAPONS).every(w => w.from?.length && w.reach?.length));
}

console.log(`\n  ${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
