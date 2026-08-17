// The encounter rules, in bare node.
//
// Added on owner override — BRIEF.md forbids a combat layer — so the checks
// here are mostly about the rules the brief DOES still impose on it: the
// telegraph always precedes the commit, walking away and paying are always
// available, and nothing is decided by an unreadable roll.

import { Fight, MOVES, INTENT, OPPONENTS, consequence } from '../js/fight.js?v=1';

let pass = 0, fail = 0;
const ok = (n, c, d) => { c ? (pass++, console.log('  ok   ' + n)) : (fail++, console.log('  FAIL ' + n + (d ? ' → ' + d : ''))); };

console.log('\npiritori encounters\n');

// deterministic from the seed
{
  const a = new Fight('rival', 5), b = new Fight('rival', 5);
  const seqA = [], seqB = [];
  for (let i = 0; i < 6 && !a.over; i++) { seqA.push(a.intent.id); a.play('guard'); }
  for (let i = 0; i < 6 && !b.over; i++) { seqB.push(b.intent.id); b.play('guard'); }
  ok('one seed, one fight', seqA.join() === seqB.join(), `${seqA} vs ${seqB}`);
  const c = new Fight('rival', 6);
  const seqC = [];
  for (let i = 0; i < 6 && !c.over; i++) { seqC.push(c.intent.id); c.play('guard'); }
  ok('a different seed differs', seqC.join() !== seqA.join());
}

// the telegraph is always available before a commit
{
  const f = new Fight('mccormick', 11);
  let told = true;
  for (let i = 0; i < 8 && !f.over; i++) {
    if (!f.tell() || !f.tell().includes(f.foe.name)) told = false;
    f.play('swing');
  }
  ok('every round telegraphs before you commit', told);
}

// the triangle actually resolves
{
  const f = new Fight('rival', 3);
  f.intent = INTENT.SWING;
  const before = f.foeGrit;
  f.play('guard');
  ok('guard answers a swing', f.foeGrit < before, `${before} → ${f.foeGrit}`);

  const g = new Fight('rival', 3);
  g.intent = INTENT.GRAB;
  const gb = g.grit;
  g.play('guard');
  ok('guard does not answer a grab', g.grit < gb);

  const h = new Fight('rival', 3);
  h.intent = INTENT.HOLD;
  const hb = h.grit, hf = h.foeGrit;
  h.play('guard');
  ok('a hold trades nothing either way', h.grit === hb && h.foeGrit === hf);

  const i = new Fight('rival', 3);
  i.intent = INTENT.HOLD;
  const ifg = i.foeGrit;
  i.play('shove');
  ok('shove answers a hold', i.foeGrit < ifg);
}

// walking away and paying are always real options
{
  for (const kind of Object.keys(OPPONENTS)) {
    const f = new Fight(kind, 9);
    ok(`${kind}: you can always walk away`, f.flee() === 'fled');
    const g = new Fight(kind, 9);
    ok(`${kind}: you can always pay`, g.pay() === 'paid');
    ok(`${kind}: paying costs money and no blood`, consequence('paid', kind).cash < 0
      && consequence('paid', kind).stockLoss === 0);
    ok(`${kind}: fleeing costs the load, not a life`, consequence('fled', kind).stockLoss > 0
      && consequence('fled', kind).cash === 0);
  }
}

// a fight always ends
{
  let longest = 0;
  for (let s = 0; s < 60; s++) {
    const f = new Fight('collector', s);
    let n = 0;
    while (!f.over && n < 200) { f.play(MOVES[n % 3].id); n++; }
    ok_quiet(f.over !== null);
    longest = Math.max(longest, n);
  }
  ok(`every fight resolves (longest ${longest} rounds)`, longest < 40);
}
function ok_quiet(c) { if (!c) { fail++; console.log('  FAIL a fight did not resolve'); } }

// nobody wins a prize made of weapons
{
  const text = Object.values(OPPONENTS).map(o => `${o.open}${o.win}${o.lose}${o.payLine}`).join(' ');
  ok('no gun is handed out as a reward', !/\b(gun|pistol|knife|blade|shooter)\b/i.test(text));
}

console.log(`\n  ${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
