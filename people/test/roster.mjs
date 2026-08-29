#!/usr/bin/env node
/**
 * The roster gate. Bare node.
 *
 *   node people/test/roster.mjs
 *
 * It checks the things COMBAT.md actually rules, so a later edit cannot quietly
 * break one — including the two that are locks rather than taste: §5.2 (a trait
 * is a behaviour, never a number) and DESIGN_LOCKS §9.2 (no name touches any
 * aptitude, trait or stat).
 */
import { hireling, roster, APTITUDES, TRAITS, GIVEN } from '../roster.mjs';

let pass = 0, fail = 0;
const ok = (c, w) => { if (c) pass++; else { fail++; console.log('  FAIL  ' + w); } };

// determinism
{
  const a = hireling('s', 3), b = hireling('s', 3);
  ok(JSON.stringify(a) === JSON.stringify(b), 'the same seed is the same person');
  ok(JSON.stringify(hireling('t', 3)) !== JSON.stringify(a), 'a different seed is different people');
}

// §9.12 — two, some three; appearance follows the first
{
  const R = roster('apt', 2000);
  const counts = R.map(p => p.aptitudes.length);
  ok(counts.every(n => n === 2 || n === 3), 'everyone holds two or three aptitudes');
  const three = counts.filter(n => n === 3).length / R.length;
  ok(three > 0.2 && three < 0.36, `three is a minority, not the reward for a good roll (${(three * 100).toFixed(0)}%)`);
  ok(R.every(p => new Set(p.aptitudes).size === p.aptitudes.length), 'nobody holds the same aptitude twice');
  ok(R.every(p => p.look === p.aptitudes[0]), 'appearance follows the first aptitude');

  const seen = {};
  for (const p of R) for (const a of p.aptitudes) seen[a] = (seen[a] || 0) + 1;
  const share = Object.values(seen).map(v => v / (R.length * 2.28));
  ok(Object.keys(seen).length === Object.keys(APTITUDES).length, 'every aptitude appears');
  ok(Math.min(...share) > 0.06 && Math.max(...share) < 0.11,
    `no aptitude dominates the pool (${(Math.min(...share) * 100).toFixed(1)}–${(Math.max(...share) * 100).toFixed(1)}%)`);
}

// §10.2 — traits: two, some three, never the same observation twice
{
  const R = roster('tr', 2000);
  const n = R.map(p => p.traits.length);
  ok(n.every(v => v === 2 || v === 3), 'everyone carries two or three traits');
  const three = n.filter(v => v === 3).length / R.length;
  ok(three > 0.2 && three < 0.36, `three traits is a minority (${(three * 100).toFixed(0)}%)`);
  ok(R.every(p => new Set(p.traits.map(t => t.tag)).size === p.traits.length),
    'no two traits on one person are the same kind of observation');
  const used = new Set(R.flatMap(p => p.traits.map(t => t.id)));
  ok(used.size === TRAITS.length, `every trait can actually come up (${used.size}/${TRAITS.length})`);
}

// §5.2 — a trait changes what you can do; it is never a number you compute
{
  const numeric = TRAITS.filter(t => /[+-]\s?\d|\d\s?%|\bper cent\b/.test(t.text));
  ok(numeric.length === 0,
    `no trait is a modifier (${numeric.map(t => t.id).join(', ') || 'none'})`);
  ok(TRAITS.every(t => t.text && t.text.length > 12), 'every trait is written as a sentence');
}

// DESIGN_LOCKS §9.2 — a name is never coupled to a capability.
//
// The first version of this asked whether the same capability profile turns up
// under two names. With twelve aptitudes, thirty-six traits and ten career
// states, almost every profile is unique, so it failed on combinatorics rather
// than on coupling — the test was wrong, not the generator.
//
// The property that actually matters is STATISTICAL INDEPENDENCE: split the
// roster by name origin and the capability distributions must not move. If a
// name reached any aptitude or trait, this is where it would show.
//
// Origin is read back off the given name via `GIVEN` (people/roster.mjs,
// `crew_generator.gd`'s own tables) rather than a hand-kept list of "the
// non-Finnish ones" — the old list was itself the bug this test's sibling
// fix was for (`VERSIONS.md`, roster naming): a hand-kept set of first names
// drifts the moment the pool it was copied from changes, silently.
{
  const originOf = new Map();
  for (const [origin, names] of Object.entries(GIVEN)) for (const n of names) originOf.set(n, origin);
  const R = roster('lock', 6000);
  const groups = {
    a: R.filter(p => originOf.get(p.name.split(' ')[0]) !== 'fi'),
    b: R.filter(p => originOf.get(p.name.split(' ')[0]) === 'fi'),
  };
  ok(groups.a.length > 500 && groups.b.length > 500,
    `both groups are big enough to compare (${groups.a.length} / ${groups.b.length})`);

  const share = (list, key) => {
    const c = {};
    for (const p of list) for (const v of p[key].map(x => x.id || x)) c[v] = (c[v] || 0) + 1;
    const tot = Object.values(c).reduce((x, y) => x + y, 0);
    return Object.fromEntries(Object.entries(c).map(([k, v]) => [k, v / tot]));
  };
  const drift = (x, y) => Math.max(...Object.keys({ ...x, ...y })
    .map(k => Math.abs((x[k] || 0) - (y[k] || 0))));

  const aptDrift = drift(share(groups.a, 'aptitudes'), share(groups.b, 'aptitudes'));
  const trDrift = drift(share(groups.a, 'traits'), share(groups.b, 'traits'));
  ok(aptDrift < 0.02, `aptitude spread does not move with name origin (max drift ${(aptDrift * 100).toFixed(2)}pp)`);
  ok(trDrift < 0.02, `trait spread does not move with name origin (max drift ${(trDrift * 100).toFixed(2)}pp)`);

  const mean = l => l.reduce((s2, p) => s2 + p.fights, 0) / l.length;
  ok(Math.abs(mean(groups.a) - mean(groups.b)) < 0.4,
    `career length does not move with name origin (${mean(groups.a).toFixed(2)} vs ${mean(groups.b).toFixed(2)})`);

  const names = new Set(R.slice(0, 300).map(p => p.name));
  ok(names.size > 150, `names vary widely (${names.size} distinct in 300)`);
}

// §7.2 — the conveyor belt
{
  const R = roster('car', 1000);
  ok(R.every(p => p.fights >= 0 && p.fights < 10), 'nobody starts past the career ceiling');
  ok(R.every(p => p.left === 10 - p.fights), 'what is left is what the ceiling leaves');
  ok(R.filter(p => p.fights === 0).length / R.length > 0.15, 'plenty of people are new');
  ok(R.filter(p => p.stage === 'nearly out').length > 0, 'and some are nearly out');
}

console.log(`\nroster — ${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
