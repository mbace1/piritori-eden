#!/usr/bin/env node
/**
 * vendor-turf.mjs — Option A's copy of TURF's engine, and the guard on it.
 *
 *   node web/tools/vendor-turf.mjs --check            vendored bytes == SOURCE.json
 *   node web/tools/vendor-turf.mjs <suds-jack-root>   refresh from a Suds-Jack checkout
 *
 * Option A is "Turf as the first implementation base" (DESIGN_AUTHORITY.md,
 * 2026-09-10). TURF lives in mbace1/Suds-Jack at turf/js and is an active
 * game with its own gates, so this is a PINNED COPY, like web/vendor/three:
 * the seven pure modules (no DOM, no canvas) that make up its rules, brain
 * and phase. Nothing in web/vendor/turf is edited here. A rule A needs that
 * TURF does not have goes into web/turf-base/ as an adapter, or upstream into
 * TURF — never into these files, or the next refresh silently deletes it.
 * --check is what makes that true: a local edit changes a hash.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const DIR = new URL('../vendor/turf/', import.meta.url);
const SOURCE = new URL('SOURCE.json', DIR);
export const MODULES = ['combat', 'grid', 'rng', 'momentum', 'abilities', 'ammo', 'autoplay'];
const sha = buf => crypto.createHash('sha256').update(buf).digest('hex');

function check() {
  const src = JSON.parse(fs.readFileSync(SOURCE, 'utf8'));
  const bad = MODULES.filter(m => sha(fs.readFileSync(new URL(`${m}.js`, DIR))) !== src.sha256[`${m}.js`]);
  if (bad.length) {
    console.error(`vendor-turf: ${bad.join(', ')} differ from ${src.repository}@${src.commit.slice(0, 8)}. ` +
      'Vendored TURF is never edited in place — refresh from Suds-Jack, or adapt in web/turf-base/.');
    process.exit(1);
  }
  console.log(`vendor-turf: ok — ${MODULES.length} modules match ${src.repository}@${src.commit.slice(0, 8)} (TURF v${src.turf_version})`);
}

function refresh(root) {
  const git = (...a) => execFileSync('git', ['-C', root, ...a], { encoding: 'utf8' }).trim();
  const commit = git('rev-parse', 'HEAD');
  const dirty = git('status', '--porcelain', '--', 'turf/js');
  if (dirty) throw new Error(`turf/js has uncommitted changes in ${root}; vendor a commit, not a working tree`);
  const version = (fs.readFileSync(path.join(root, 'turf/VERSIONS.md'), 'utf8').match(/^## v(\d+)/m) || [])[1] || null;
  const sums = {};
  for (const m of MODULES) {
    const buf = fs.readFileSync(path.join(root, 'turf/js', `${m}.js`));
    fs.writeFileSync(new URL(`${m}.js`, DIR), buf);
    sums[`${m}.js`] = sha(buf);
  }
  fs.writeFileSync(SOURCE, JSON.stringify({
    repository: 'mbace1/Suds-Jack', path: 'turf/js', commit, turf_version: version,
    note: 'Pinned copy for Option A. Do not edit; see web/tools/vendor-turf.mjs.',
    sha256: sums,
  }, null, 1) + '\n');
  console.log(`vendored ${MODULES.length} TURF modules from ${commit.slice(0, 8)} (v${version})`);
}

const arg = process.argv[2];
if (arg === '--check') check();
else if (arg) refresh(path.resolve(arg));
else { console.error('usage: vendor-turf.mjs --check | <suds-jack-root>'); process.exit(2); }
