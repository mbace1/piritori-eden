#!/usr/bin/env node
/**
 * Stance vectors — same reversed direction as port/chrome-vectors.mjs.
 * Godot's fight_manager.gd is canonical (COMBAT.md §6.2's rules are
 * authored there); web/js/v3/stance.js is the port, checked against a
 * fixture rather than trusted by inspection.
 *
 *   godot --headless --path godot tools/stance_dump.tscn   (regenerates the fixture)
 *   node port/stance-vectors.mjs --check                    the gate
 *
 * Whoever changes fight_manager.gd's stance_weight() re-runs the dump and
 * re-commits port/vectors/stance.json. This script only notices stance.js
 * drifting from the fixture; it cannot know the fixture itself is stale.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { stanceWeight, STANCES } from '../web/js/v3/stance.js';

const here = dirname(fileURLToPath(import.meta.url));
const fixturePath = join(here, 'vectors', 'stance.json');
const check = process.argv.includes('--check');

const TYPES = ['ATTACK', 'GUARD', 'REPOSITION', 'ITEM', 'STAND_DOWN', 'AUTO', 'WITHDRAW', 'MARK'];

const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
let failed = 0;
let checked = 0;

for (const stance of STANCES) {
  const row = fixture.rows[stance];
  if (!row) {
    console.log(`  MISSING  ${stance}  no row in port/vectors/stance.json`);
    failed++;
    continue;
  }
  for (const type of TYPES) {
    checked++;
    const expected = row[type];
    const got = stanceWeight(stance, type);
    if (got !== expected) {
      console.log(`  DRIFT    ${stance}.${type}  fixture=${expected} stance.js=${got}`);
      failed++;
    }
  }
}

if (failed) {
  console.log(`\nstance vectors: ${failed} of ${checked} drifted from port/vectors/stance.json.`);
  console.log('Either web/js/v3/stance.js needs fixing, or fight_manager.gd changed and the');
  console.log('fixture is stale — re-run tools/stance_dump.tscn before assuming stance.js is wrong.');
  process.exit(1);
} else {
  console.log(`stance vectors: all ${checked} (stance, command type) pairs match port/vectors/stance.json.`);
  if (!check) console.log('(run with --check in gates; this run already checked)');
}
