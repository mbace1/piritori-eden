#!/usr/bin/env node
/**
 * Print a mission so it can be READ rather than parsed.
 *
 *   node missions/tools/mission-sheet.mjs                # every authored one
 *   node missions/tools/mission-sheet.mjs three-vans     # one, by id fragment
 *
 * Same reason `people/tools/roster-sheet.mjs` exists: a validator tells you a
 * mission is wrong and a sheet tells you whether it is any good, and those are
 * different questions. This one puts the clock, the steps and the findings on
 * one screen, because a mission's problem is usually that its shape is fine and
 * its beat is dull.
 */
import { readFileSync } from 'node:fs';
import { validate, cost, VERBS, BLOCK_MINUTES, REAL_BUDGET } from '../model.mjs';

const slice = JSON.parse(readFileSync(new URL('../../content/era1-slice-v1.json', import.meta.url)));
const want = process.argv[2];
const missions = (slice.missions ?? []).filter(m => !want || m.id.includes(want));

if (!missions.length) {
  console.log(want ? `no mission matching '${want}'` : 'no missions in the slice');
  process.exit(1);
}

const bar = (used, ceiling, width = 24) => {
  const n = Math.min(width, Math.round((used / ceiling) * width));
  return '[' + '#'.repeat(n) + '.'.repeat(Math.max(0, width - n)) + ']';
};

for (const m of missions) {
  const v = validate(m);
  const c = v.cost;

  console.log('\n' + '─'.repeat(72));
  console.log(m.id + '   ' + (m.family ?? '—'));
  console.log('─'.repeat(72));
  console.log(`  signal      ${m.signal_encounter_id ?? '(none)'}`);
  console.log(`  deadline    day ${m.deadline?.day ?? '?'}, ${m.deadline?.block ?? '?'}`);
  if (m.requirements?.roles_any) console.log(`  wants       any of: ${m.requirements.roles_any.join(', ')}`);
  if (m.approaches) console.log(`  approaches  ${m.approaches.join(' · ')}`);

  console.log(`\n  in-game     ${bar(c.igm, BLOCK_MINUTES)} ${c.igm} of ${BLOCK_MINUTES} min` +
    (c.fitsBlock ? '' : '   OVER A BLOCK'));
  console.log(`  real        ${bar(c.real, REAL_BUDGET.max)} ~${c.real} of ${REAL_BUDGET.max} min` +
    (c.fitsReal ? '' : '   TOO LONG TO PLAY'));

  const steps = m.steps ?? [];
  if (!steps.length) {
    console.log('\n  steps       (none — one destination: ' + (m.destination_anchor_id ?? '?') + ')');
  } else {
    console.log('');
    for (const [i, s] of steps.entries()) {
      const vb = VERBS[s.verb];
      console.log(`  ${String(i + 1).padStart(2)}. ${(s.verb ?? '?').padEnd(5)} ${(s.anchor ?? '?').padEnd(16)} ${vb ? vb.note : '(unknown verb)'}`);
      if (s.triggers?.length) console.log(`      triggers: ${s.triggers.join(', ')}`);
      if (s.alternatives?.length) console.log(`      or: ${s.alternatives.join(' / ')}`);
    }
  }

  for (const k of ['success', 'partial', 'failure']) {
    const e = m[`${k}_effects`] ?? [];
    console.log(`\n  ${k.padEnd(8)}    ${e.length ? e.join('\n                ') : '(none)'}`);
  }

  if (v.findings.length) {
    console.log('');
    for (const f of v.findings) console.log(`  ${f.level === 'error' ? '!!' : ' ·'} ${f.what}`);
  } else {
    console.log('\n  · nothing to report');
  }
}
console.log('');
