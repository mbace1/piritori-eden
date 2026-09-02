#!/usr/bin/env node
/**
 * enforce-texture-budget.mjs — bring registered GLB textures down to the
 * house rule, and keep the manifest honest while doing it.
 *
 *   node art-src/meshy-input/enforce-texture-budget.mjs --check   report only
 *   node art-src/meshy-input/enforce-texture-budget.mjs --apply   rewrite
 *
 * WHY. `PORTING.md` §6's mesh-intake list states "**textures are stripped to
 * 512**" as *"already the house rule"*. Measured 2026-09-02, it is not
 * applied: 14 of 15 registered cast/presenter textures are 1024², which is
 * **57 MB of uncompressed VRAM where 14 MB would do** — a 4x reduction
 * available for free, with no regeneration and no Meshy credits, because
 * `glb_retex.py`'s own header already established that these bodies are
 * downscales of the same masters rather than different generations.
 *
 * Checked before writing this: Toko's canon gold mask — the most
 * detail-critical texture in the catalogue, and the one thing that would
 * visibly break — is indistinguishable at 512 from 1024 when rendered
 * head-on and cropped to the face, which is a far closer view than the game
 * ever shows (a fighter on the battle board is roughly 40px tall).
 *
 * THE PART THAT IS EASY TO GET WRONG, and the reason this is a tool rather
 * than a shell loop: `godot/tools/sync-data.mjs` HARD-VERIFIES every
 * registered asset's `sha256` and refuses to sync on a mismatch. Rewriting a
 * GLB without updating the manifest in the same step leaves a repo whose
 * Godot build cannot sync at all. This updates `sha256` and `bytes` for every
 * file it rewrites, atomically with the rewrite.
 *
 * It shells out to the existing `glb_retex.py` rather than reimplementing the
 * repack — that script already handles the one subtlety (a shorter image left
 * at its old bufferView length produces a technically valid GLB that reads
 * garbage past the end of the JPEG).
 */
import { readFileSync, writeFileSync, existsSync, renameSync, unlinkSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const MANIFEST = resolve(root, 'art/v3/manifest.json');
const RETEX = resolve(here, 'glb_retex.py');
const PY = process.env.PIRITORI_PY
  || 'C:/Users/Mikael/.nano-banana/venv/Scripts/python.exe';

/** The house rule, PORTING.md §6. */
const MAX = 512;

/** SCOPE, and this is a real distinction rather than caution.
 *
 * §6's rule lives in the MESH INTAKE list, next to "it is rigged" and "its
 * height is human" — it is about CHARACTER BODIES. A fighter on the battle
 * board is roughly 40px tall, so 512 is already generous for one. A
 * `stage3d/` diorama is the opposite case: it fills the frame, the camera
 * sits inside it, and `kallio-backyard-3d-v01` ships a 2048 texture for
 * exactly that reason.
 *
 * Blanket-applying a character rule to arenas would be over-applying it past
 * its own scope, so stages are REPORTED and skipped. They are the larger
 * share of the saving (49 of the 69 MB), and worth their own decision with a
 * rendered before/after — not a decision to make silently inside a tool
 * called "enforce".
 */
const SKIP_PREFIX = 'stage3d/';

const apply = process.argv.includes('--apply');
if (!apply && !process.argv.includes('--check')) {
  console.error('usage: enforce-texture-budget.mjs --check | --apply');
  process.exit(1);
}

/** Every GLB image's pixel size, read straight out of the container. */
function textures(buf) {
  const jsonLen = buf.readUInt32LE(12);
  const gltf = JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8'));
  const binOff = 20 + jsonLen + 8;
  return (gltf.images ?? []).map(img => {
    const bv = gltf.bufferViews[img.bufferView];
    const at = binOff + (bv.byteOffset ?? 0);
    const bytes = buf.subarray(at, at + bv.byteLength);
    // JPEG SOF0/SOF2 and PNG IHDR are enough; these are all Meshy JPEGs.
    if (bytes[0] === 0xFF && bytes[1] === 0xD8) {
      let i = 2;
      while (i < bytes.length) {
        if (bytes[i] !== 0xFF) { i += 1; continue; }
        const marker = bytes[i + 1];
        if (marker >= 0xC0 && marker <= 0xCF && marker !== 0xC4 && marker !== 0xC8 && marker !== 0xCC) {
          return { h: bytes.readUInt16BE(i + 5), w: bytes.readUInt16BE(i + 7) };
        }
        i += 2 + bytes.readUInt16BE(i + 2);
      }
    }
    if (bytes.readUInt32BE(0) === 0x89504E47) {
      return { w: bytes.readUInt32BE(16), h: bytes.readUInt32BE(20) };
    }
    return null;
  }).filter(Boolean);
}

const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
const targets = [];
const skipped = [];
let vramBefore = 0;
let vramAfter = 0;

for (const asset of manifest.assets) {
  const files = [];
  if (asset.file) files.push({ file: asset.file, holder: asset });
  for (const f of asset.frames ?? []) files.push({ file: f.file, holder: f });
  for (const m of asset.members ?? []) files.push({ file: m.file, holder: m });

  for (const { file, holder } of files) {
    if (!file?.endsWith('.glb')) continue;
    const abs = resolve(root, 'art/v3', file);
    if (!existsSync(abs)) continue;
    const tex = textures(readFileSync(abs));
    if (!tex.length) continue;
    const over = tex.filter(t => t.w > MAX || t.h > MAX);
    const inScope = !file.startsWith(SKIP_PREFIX);
    for (const t of tex) {
      vramBefore += t.w * t.h * 4;
      vramAfter += inScope
        ? Math.min(t.w, MAX) * Math.min(t.h, MAX) * 4
        : t.w * t.h * 4;
    }
    if (!over.length) continue;
    const entry = { file, abs, holder, sizes: over.map(t => `${t.w}x${t.h}`) };
    if (file.startsWith(SKIP_PREFIX)) { skipped.push(entry); continue; }
    targets.push(entry);
  }
}

const mb = n => (n / 1048576).toFixed(1);
console.log(`registered GLB textures over ${MAX}px: ${targets.length}`);
console.log(`uncompressed VRAM: ${mb(vramBefore)} MB -> ${mb(vramAfter)} MB ` +
  `(${(vramBefore / vramAfter).toFixed(1)}x)`);
for (const t of targets) console.log(`  ${t.file}  ${t.sizes.join(', ')}`);
if (skipped.length) {
  console.log(`
out of scope (arenas fill the frame; §6 is a character-mesh ` +
    `rule) — reported, not rewritten:`);
  for (const t of skipped) console.log(`  ${t.file}  ${t.sizes.join(', ')}`);
}

if (!apply) {
  if (targets.length) {
    console.log(`\nnot applied. Re-run with --apply to rewrite and re-register.`);
  }
  process.exit(0);
}

// ── rewrite, then re-register in the SAME pass ────────────────────────────
let done = 0;
for (const t of targets) {
  const tmp = join(tmpdir(), `retex-${Date.now()}-${done}.glb`);
  execFileSync(PY, [RETEX, t.abs, tmp, String(MAX)], { stdio: 'pipe' });
  const bytes = readFileSync(tmp);
  // The manifest's sha256 is HARD-VERIFIED by godot/tools/sync-data.mjs.
  // Updating it here, in the same loop that rewrites the file, is what keeps
  // the Godot build syncable — a rewrite without this bricks it.
  if ('sha256' in t.holder) t.holder.sha256 = createHash('sha256').update(bytes).digest('hex');
  if ('bytes' in t.holder) t.holder.bytes = bytes.length;
  renameSync(tmp, t.abs);
  done += 1;
  console.log(`  rewrote ${t.file}`);
}
if (done) {
  writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`\nrewrote ${done} file(s) and updated their manifest sha256/bytes.`);
  console.log('Now run: cd godot && node tools/sync-data.mjs');
}
