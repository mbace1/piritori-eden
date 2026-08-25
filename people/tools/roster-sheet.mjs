#!/usr/bin/env node
/**
 * Print hirelings so you can read them.
 *
 *   node people/tools/roster-sheet.mjs [--seed kallio] [--n 8] [--traits 2]
 *   node people/tools/roster-sheet.mjs --compare
 *
 * `--compare` prints the SAME six people at one, two, three and five traits,
 * which is how COMBAT.md §10.2 gets answered: not by argument but by reading
 * them and seeing where a person stops being a person and becomes a list.
 */
import { roster, APTITUDES } from '../roster.mjs';

const a = process.argv.slice(2);
const flag = (n, d) => { const i = a.indexOf(n); return i < 0 ? d : a[i + 1]; };
const SEED = flag('--seed', 'kallio');

const verb = k => APTITUDES[k].for || APTITUDES[k].does;

function show(p) {
  const name = p.nick ? `${p.name} “${p.nick}”` : p.name;
  console.log(`\n  ${name}`);
  console.log(`  ${p.aptitudes.join(' + ')}   ·   ${p.stage}, ${p.fights}/10 fights`);
  console.log(`  \x1b[2m${verb(p.aptitudes[0])}\x1b[0m`);
  for (const t of p.traits) console.log(`    – ${t.text}`);
}

if (a.includes('--compare')) {
  for (const n of [1, 2, 3, 5]) {
    console.log(`\n${'═'.repeat(66)}\n  ${n} TRAIT${n > 1 ? 'S' : ''} EACH\n${'═'.repeat(66)}`);
    for (const p of roster(SEED, 4, { traits: n })) show(p);
  }
  console.log('\n');
} else {
  const n = +flag('--n', 8), t = +flag('--traits', 2);
  console.log(`\n  ${n} hirelings — seed "${SEED}", ${t} traits each\n${'─'.repeat(66)}`);
  for (const p of roster(SEED, n, { traits: t })) show(p);
  console.log('\n');
}
