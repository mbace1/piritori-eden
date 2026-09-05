#!/usr/bin/env node
/**
 * Capture — the same discipline `godot/tools/capture.gd` already has, for
 * this build. Landscape, portrait and phone, for city (route), an encounter,
 * ledger and a battle.
 *
 *   NODE_PATH=$(npm root -g) node web/tools/capture.mjs [outDir]
 *
 * This tool exists because of a real failure, not a nice-to-have. This
 * session built a pause menu, a market panel and committed-context CSS
 * entirely against `v3.css`'s existing flat dark panels — without once
 * rendering the Godot build sitting in the same checkout, which had already
 * moved to a torn-carton chrome material (`godot/ui/chrome.gd`,
 * `art-library/ux-concepts/README.md`) weeks earlier. `PORTING.md` §11 now
 * requires running BOTH this tool and `capture.gd` before touching UI on
 * either side — having them side by side in one output directory is what
 * makes skipping that check a choice instead of an accident.
 *
 * File names deliberately echo `capture.gd`'s own convention
 * (`piritori-<screen>-<size>-<lang>.png`, prefixed `web-` here) so the two
 * sets sort next to each other in a directory listing.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, mkdirSync } from 'node:fs';
import { extname, join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '../..');
const outDir = resolve(process.argv[2] || join(here, '../../.capture'));
mkdirSync(outDir, { recursive: true });

/**
 * The same three shots as `capture.gd`'s SHOTS, so a screen can be compared at
 * each — but in CSS PIXELS, with the device ratio supplied separately.
 *
 * THIS WAS WRONG, AND IT HID A BUG FOR MONTHS. `phone` used to be
 * `1079 x 2047`: `capture.gd`'s numbers copied across unchanged. Godot renders
 * at DEVICE resolution and has no CSS, so 1079 is right there. A browser lays
 * out in CSS pixels, and 1079 of them is WIDER than this build's own
 * two-column breakpoint — so every "phone" shot ever taken by this tool was
 * really a narrow-desktop shot, and the stacked layout the owner actually sees
 * on a Pixel had never once been rendered here. The overlapping header in
 * QUEUE.md is what that concealed: at a real 412px viewport the "DAY 1" status
 * chip lands on top of the wordmark.
 *
 * So the layout width is CSS and the ratio is applied on top, which gets both
 * halves right at once: the page reflows the way the real device reflows, and
 * the PNG still comes out at the device's real pixel count, close enough to
 * `capture.gd`'s output that the two sets still sort and read together.
 *
 * Pixel 10 — the device this project is actually tested on — is 1080 x 2424
 * at a ratio of 2.625, which is 411 x 923 CSS.
 */
const SIZES = [
  // label, CSS width, CSS height, device pixel ratio
  ['landscape', 1366, 768, 1],
  ['portrait', 390, 844, 2],
  ['phone', 411, 923, 2.625],
];

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png' };
const server = createServer((req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '');
  const f = join(repo, p);
  if (existsSync(f) && statSync(f).isFile()) {
    res.writeHead(200, { 'content-type': TYPES[extname(f)] || 'application/octet-stream' });
    return res.end(readFileSync(f));
  }
  res.writeHead(404).end('capture.mjs: no ' + p);
});
await new Promise(r => server.listen(0, r));
const port = server.address().port;

const browser = await chromium.launch({
  args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'],
});
const errors = [];

async function shoot(label, width, height, dpr, setup, name) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: dpr });
  page.on('pageerror', e => errors.push(`${name}: ${e}`));
  page.on('response', r => { if (r.status() >= 400 && !r.url().includes('hub/shell.js')) errors.push(`${name}: ${r.status()} ${r.url()}`); });
  page.on('console', m => {
    if (m.type() !== 'error') return;
    // The optional `../hub/shell.js` dynamic import (PORTING.md's own house
    // pattern: a missing arcade shell is a missing nicety, never a boot
    // failure) logs this generic line with no URL in it to match on.
    if (/Failed to load resource/.test(m.text())) return;
    errors.push(`${name}: ${m.text().slice(0, 160)}`);
  });
  await page.goto(`http://127.0.0.1:${port}/web/index.html`, { waitUntil: 'load' });
  await page.locator('#beginButton').click();
  await page.waitForTimeout(300);
  if (setup) await setup(page);
  const path = join(outDir, `piritori-web-${name}-${label}-en.png`);
  await page.screenshot({ path });
  console.log('wrote', path);
  await page.close();
}

const SCREENS = [
  ['route', null],
  ['encounter', async page => {
    // The same jump the pause menu's THINGS TO TEST uses, driven directly —
    // capture must not depend on the menu it is meant to verify.
    await page.evaluate(() => {
      const idx = window.__ptv3.data.content.schedule.findIndex(s => s.encounter_id === 'enc-toko-quiet-voice');
      window.__ptv3.debug.setState({ ...window.__ptv3.state, scheduleIndex: idx, mode: 'encounter' });
    });
    await page.waitForTimeout(200);
  }],
  ['ledger', async page => {
    await page.evaluate(() => window.__ptv3.debug.setState({ ...window.__ptv3.state, mode: 'ledger' }));
    await page.waitForTimeout(200);
  }],
  ['battle', async page => {
    await page.evaluate(() => {
      const s = { ...window.__ptv3.state };
      const need = window.__ptv3.data.battles.get('battle-karhupuisto-2v2')?.player_deployed ?? 2;
      s.recruited = window.__ptv3.data.content.crew.slice(0, need).map(c => c.id);
      window.__ptv3.debug.setState(s);
      window.__ptv3.debug.startBattle('battle-karhupuisto-2v2');
    });
    // GLBs need real time. Measuring contrast before `stage3d-ready` captures the
    // 2D grid fallback and lies about the night-grade gate (QUEUE 2026-09-04).
    try {
      await page.waitForSelector('.battle-stage.stage3d-ready', { timeout: 20000 });
      await page.waitForTimeout(300);
    } catch {
      // Keep the shot anyway — but the missing class is itself a finding.
      await page.waitForTimeout(500);
    }
  }],
];

for (const [label, width, height, dpr] of SIZES) {
  for (const [name, setup] of SCREENS) {
    await shoot(label, width, height, dpr, setup, name);
  }
}

await browser.close();
server.close();

if (errors.length) {
  console.log(`\n${errors.length} page error(s):`);
  for (const e of errors) console.log('  ' + e);
}
console.log(`\n${SIZES.length * SCREENS.length} screenshots in ${outDir}`);
