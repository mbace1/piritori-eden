#!/usr/bin/env node
/**
 * build-hub-cabinet.mjs — assemble the arcade-hub copy of the browser build.
 *
 *   node web/tools/build-hub-cabinet.mjs <out-dir>
 *
 * The arcade (Suds-Jack `gh-pages`) serves this game from `/Suds-Jack/piritori/`,
 * and `DEPLOY_SPEC.md`'s first rule is that every path is relative — there is
 * no domain root to lean on. That creates one real difference from how this
 * repo's own Pages site serves the same files, and it is the only difference:
 *
 *   piritori-eden Pages   /web/index.html          data at /content/, /art/…
 *   the arcade cabinet    /piritori/index.html     data at /piritori/content/…
 *
 * The cabinet is FLAT — `index.html` at the game's own root rather than one
 * directory deeper — for two reasons, both checked against real URLs rather
 * than assumed:
 *
 *   1. It keeps this game's content/, map/ and art/ UNDER its own folder. A
 *      deeper layout resolves them to the ARCADE ROOT and scatters one game's
 *      assets across the whole site.
 *   2. `../hub/shell.js` — DEPLOY_SPEC.md rule 5, the HOME button that makes
 *      a page a cabinet — resolves correctly from `/piritori/index.html` with
 *      no fallback trickery. From a deeper path it does not.
 *
 * So the modules' own fetches and imports lose exactly one `../`, and
 * `ART_BASE` (which the BROWSER resolves against the page, not the module —
 * see content.js's own note) loses its `../` entirely.
 *
 * WHY THIS IS A SCRIPT, AND WHAT IT ALREADY CAUGHT. The rewrite was
 * previously done by hand, and the cabinet deployed that way on 2026-09-02
 * DOES NOT BOOT: `board.js` kept a three-level import of `market/model.mjs`,
 * which 404s at `/Suds-Jack/market/model.mjs`, and a 404 on a `type="module"`
 * import is a module-GRAPH failure that takes the whole app down — not a
 * degraded feature. Found by loading the real deployed URL in a browser, not
 * by reading a diff. Four files need the rewrite, not one, and this asserts
 * that none escaped.
 *
 * Nothing here edits the working tree — the rewrite happens on the COPY, so
 * `web/` on disk stays the version this repo's own Pages serves.
 */
import { cpSync, mkdirSync, readFileSync, writeFileSync, rmSync, existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const out = process.argv[2] ? resolve(process.argv[2]) : null;
if (!out) {
  console.error('usage: node web/tools/build-hub-cabinet.mjs <out-dir>');
  process.exit(1);
}

/** Exactly what the app reaches for at runtime — the same list deploy.yml
 *  ships, derived by grepping web/'s cross-root imports and content.js's
 *  fetch URLs. missions/model.mjs is deliberately absent: it exists and
 *  passes its own tests, but the live app never imports it. */
const DATA = [
  ['content/era1-slice-v1.json', 'content/'],
  ['map/kallio-era1-2003-v1.json', 'map/'],
  ['map/kallio-transit-layer-v1.json', 'map/'],
  ['market/model.mjs', 'market/'],
  ['people/hiring.mjs', 'people/'],
  ['people/roster.mjs', 'people/'],
];

/** Not shipped: the local dev server, the gates, and the package manifest —
 *  DEPLOY_SPEC.md rule 3, "ship dist/, not the toolchain". */
const STRIP = ['test', 'tools', 'package.json'];

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

// web/ contents go to the cabinet ROOT, not a web/ subdirectory — see header.
cpSync(join(root, 'web'), out, { recursive: true });
for (const name of STRIP) rmSync(join(out, name), { recursive: true, force: true });

for (const [from, to] of DATA) {
  mkdirSync(join(out, to), { recursive: true });
  cpSync(join(root, from), join(out, to, from.split('/').pop()));
}
mkdirSync(join(out, 'art'), { recursive: true });
cpSync(join(root, 'art/v3'), join(out, 'art/v3'), { recursive: true });

// ── the rewrite, applied to the copy, across EVERY module ─────────────────
// Discovered rather than listed: a hardcoded file list is how the hand-done
// version missed board.js in the first place.
function jsFiles(dir) {
  const found = [];
  for (const name of readdirSync(dir)) {
    const abs = join(dir, name);
    if (statSync(abs).isDirectory()) { found.push(...jsFiles(abs)); continue; }
    if (name.endsWith('.js') || name.endsWith('.mjs')) found.push(abs);
  }
  return found;
}

const THREE_LEVEL = /'\.\.\/\.\.\/\.\.\//;
const modules = jsFiles(join(out, 'js'));
const rewritten = [];
for (const abs of modules) {
  const before = readFileSync(abs, 'utf8');
  const src = before
    .replaceAll("'../../../", "'../../")                          // fetches + imports
    .replaceAll("ART_BASE = '../art/v3'", "ART_BASE = 'art/v3'");  // page-, not module-relative
  if (src !== before) { writeFileSync(abs, src); rewritten.push(abs.slice(out.length + 1)); }
}
if (!rewritten.length) {
  console.error('FAIL: no module matched the expected paths. The source layout ' +
    'changed — re-read this script\'s header before editing it blindly.');
  process.exit(1);
}

let bad = 0;

// The assertion that would have caught the live cabinet's failure. NOTHING may
// keep a three-level path: one survivor stops the whole app booting.
const leftovers = modules
  .filter(abs => THREE_LEVEL.test(readFileSync(abs, 'utf8')))
  .map(abs => abs.slice(out.length + 1));
if (leftovers.length) {
  console.error(`  FAIL three-level paths survived in ${leftovers.join(', ')} — ` +
    `a 404 on any one is a module-graph failure that stops the app booting`);
  bad += 1;
}

// And the positive checks, so "nothing matched" cannot pass as "all correct".
const contentSrc = readFileSync(join(out, 'js/v3/content.js'), 'utf8');
for (const [re, label] of [
  [/'\.\.\/\.\.\/content\/era1-slice-v1\.json'/, 'content fetch is two levels up'],
  [/'\.\.\/\.\.\/people\/roster\.mjs'/, 'roster import is two levels up'],
  [/ART_BASE = 'art\/v3'/, 'ART_BASE is page-relative'],
]) {
  if (!re.test(contentSrc)) { console.error(`  FAIL ${label}`); bad += 1; }
}

for (const f of ['index.html', 'js/v3/app.js', 'js/v3/render3d.js', 'art/v3/manifest.json',
  'content/era1-slice-v1.json', 'market/model.mjs', 'people/hiring.mjs',
  'art/v3/cast3d/clips/muscle-idle-v01.glb']) {
  if (!existsSync(join(out, f))) { console.error(`  FAIL missing ${f}`); bad += 1; }
}
if (bad) process.exit(1);

console.log(`hub cabinet built at ${out}`);
console.log(`  rewrote ${rewritten.length} module(s): ${rewritten.join(', ')}`);
console.log('  flat layout, paths asserted, toolchain stripped.');
console.log('  copy to Suds-Jack gh-pages as piritori/ and run test/hub-smoke.cjs.');
