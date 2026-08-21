#!/usr/bin/env node
/**
 * sync-data.mjs — the canon seam.
 *
 * GODOT_HANDOFF.md §3 says the canonical JSON files stay the comparison source
 * and must be imported rather than rewritten. Godot can only load from res://,
 * which is `piritori/godot/`, so the canon files (which live above it) are
 * COPIED in byte-for-byte and never edited here.
 *
 *   node tools/sync-data.mjs           copy canon -> data/
 *   node tools/sync-data.mjs --check   fail if data/ has drifted from canon
 *
 * The --check mode is the gate. It is what makes the copy safe: a copy nobody
 * verifies is a second lineage, which is the failure this repo has paid for
 * three times in eeri/.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const godotRoot = resolve(here, '..');
const piritori = resolve(godotRoot, '..');
const dataDir = resolve(godotRoot, 'data');

/** canon source -> res://data/ filename */
const FILES = [
  ['map/kallio-era1-2003-v1.json', 'kallio-era1-2003-v1.json'],
  ['content/era1-slice-v1.json', 'era1-slice-v1.json'],
  ['art/v3/manifest.json', 'art-v3-manifest.json'],
];

const check = process.argv.includes('--check');
let drift = 0;
let copied = 0;

if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });

for (const [src, dest] of FILES) {
  const srcPath = resolve(piritori, src);
  const destPath = resolve(dataDir, dest);

  if (!existsSync(srcPath)) {
    console.error(`MISSING CANON: ${relative(piritori, srcPath)}`);
    drift++;
    continue;
  }

  const canon = readFileSync(srcPath);

  // Parse to prove it is loadable before it reaches the engine.
  try {
    JSON.parse(canon.toString('utf8'));
  } catch (err) {
    console.error(`INVALID JSON: ${src} — ${err.message}`);
    drift++;
    continue;
  }

  const current = existsSync(destPath) ? readFileSync(destPath) : null;
  const same = current && current.equals(canon);

  if (check) {
    if (!same) {
      console.error(`DRIFT: data/${dest} does not match ${src}`);
      drift++;
    }
  } else if (!same) {
    writeFileSync(destPath, canon);
    console.log(`synced  data/${dest}  (${canon.length} bytes)`);
    copied++;
  }
}

// ── registered runtime art ────────────────────────────────────────────────
// art/v3/manifest.json registers each runtime derivative with a sha256. Copy
// them under data/art/ and verify the hash, so a corrupted or swapped file is
// caught at sync time rather than showing up as a silently wrong picture.
const artManifestPath = resolve(piritori, 'art/v3/manifest.json');
if (existsSync(artManifestPath)) {
  const manifest = JSON.parse(readFileSync(artManifestPath, 'utf8'));
  const artDest = resolve(dataDir, 'art');
  let artCopied = 0;
  let hashBad = 0;

  for (const asset of manifest.assets ?? []) {
    if (!asset.file) continue;
    const srcPath = resolve(piritori, 'art/v3', asset.file);
    const destPath = resolve(artDest, asset.file);

    if (!existsSync(srcPath)) {
      console.error(`MISSING ART: ${asset.id} -> art/v3/${asset.file}`);
      drift++;
      continue;
    }

    const bytes = readFileSync(srcPath);

    if (asset.sha256) {
      const actual = createHash('sha256').update(bytes).digest('hex');
      if (actual !== asset.sha256) {
        console.error(`HASH MISMATCH: ${asset.id}
  manifest ${asset.sha256}
  actual   ${actual}`);
        hashBad++;
        drift++;
        continue;
      }
    }

    const cur = existsSync(destPath) ? readFileSync(destPath) : null;
    if (cur && cur.equals(bytes)) continue;

    if (check) {
      console.error(`DRIFT: data/art/${asset.file}`);
      drift++;
    } else {
      mkdirSync(dirname(destPath), { recursive: true });
      writeFileSync(destPath, bytes);
      artCopied++;
    }
  }

  if (!check && artCopied) console.log(`synced  data/art/  (${artCopied} registered assets)`);
  if (!hashBad && !check) console.log(`art hashes verified against manifest (${(manifest.assets ?? []).length} entries)`);
}

if (check) {
  if (drift) {
    console.error(`\nFAIL: ${drift} file(s) drifted. Run: node tools/sync-data.mjs`);
    process.exit(1);
  }
  console.log(`DATA OK: ${FILES.length} canonical files match their source.`);
} else {
  console.log(copied ? `\n${copied} file(s) synced.` : 'DATA OK: already in sync.');
}
