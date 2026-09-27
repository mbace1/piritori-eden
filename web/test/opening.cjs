// The arrival and the city's sound (Act I v4.59).
//
//   NODE_PATH=$(npm root -g) node web/test/opening.cjs
//
// Owner, 2026-09-27: "sure, setting up" (an arrival on Begin) and "yes" to a
// tram bell, the till and rain. Held here: the arrival plays on a NEW run and
// not on Resume or with ?skip; it is skippable from frame one by a tap, the
// SKIP button or a key, and goes on its own; it never changes the save; under
// reduced motion it is one still frame; after it the next step is lit. Sound
// wakes on Begin, goes through one master gain, and the pause menu's SOUND
// switch really stops it and is remembered.
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.webp': 'image/webp', '.png': 'image/png', '.glb': 'model/gltf-binary',
  '.woff2': 'font/woff2', '.ttf': 'font/ttf',
};
const server = http.createServer((req, res) => {
  const requestPath = decodeURIComponent(req.url.split('?')[0]);
  let file = path.resolve(ROOT, `.${requestPath}`);
  if (!file.startsWith(`${ROOT}${path.sep}`) && file !== ROOT) { res.writeHead(403); res.end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file)) { res.writeHead(404); res.end('missing'); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

let passed = 0, failed = 0;
function ok(name, condition, detail = '') {
  if (condition) { passed += 1; console.log(`  ok   ${name}`); return; }
  failed += 1;
  console.log(`  FAIL ${name}${detail ? ` → ${String(detail).slice(0, 400)}` : ''}`);
}

// ── page helpers ────────────────────────────────────────────────────
function watchErrors(page) {
  const errors = []; let shellMisses = 0;
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  // ../hub/shell.js only exists once deployed under the arcade: one known,
  // harmless 404 per load (v3-playthrough.cjs explains why it is forgiven
  // precisely rather than by loosening the check).
  page.on('response', r => { if (r.status() === 404 && new URL(r.url()).pathname.endsWith('/hub/shell.js')) shellMisses += 1; });
  // A failed request is an error too — except that same one known resource.
  page.on('requestfailed', r => { if (!new URL(r.url()).pathname.endsWith('/hub/shell.js')) errors.push(`requestfailed: ${r.url()}`); });
  return () => {
    let forgive = shellMisses;
    return errors.filter(e => !(forgive > 0 && /Failed to load resource: .*404/.test(e) && forgive--));
  };
}


const ready = page => page.waitForFunction(() => Boolean(window.__ptv3?.data));
const save = page => page.evaluate(() => JSON.stringify(window.__ptv3.state));

server.listen(0, '127.0.0.1', async () => {
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
  try {
    for (const [name, vp, touch] of [['desktop', { width: 1280, height: 800 }, false], ['phone', { width: 390, height: 844 }, true]]) {
      const ctx = await browser.newContext({ viewport: vp, hasTouch: touch, isMobile: touch });
      const page = await ctx.newPage();
      const errors = watchErrors(page);
      await page.goto(`${base}/web/`); await ready(page);
      await page.locator('#beginButton').click();
      ok(`${name}: Begin opens the arrival`, await page.locator('#opening').isVisible());
      const text = await page.locator('#opening .opening-lines').innerText();
      ok(`${name}: it names the place, the year and what Aatami carries`, /Kallio, 2003/.test(text) && /Piritori/.test(text) && /€160/.test(text), text);
      const s0 = await save(page);
      const sound = await page.evaluate(() => window.__ptv3.sound);
      ok(`${name}: sound woke on Begin, through one master gain`, sound.on && sound.running && sound.gain > 0, JSON.stringify(sound));
      await page.waitForTimeout(1200);
      const tram = await page.locator('.op-tram').evaluate(el => getComputedStyle(el).transform);
      ok(`${name}: the tram is moving in`, tram !== 'none', tram);
      // Skip by the button on desktop, by a tap anywhere on a phone.
      if (touch) await page.locator('.opening-scene').tap(); else await page.locator('.opening-skip').click();
      await page.waitForSelector('#opening', { state: 'detached', timeout: 3000 }).catch(() => {});
      ok(`${name}: skipping ends it at once`, await page.locator('#opening').count() === 0);
      ok(`${name}: the arrival never changed the save`, await save(page) === s0);
      ok(`${name}: after it, one lit next step`, await page.locator('.next-step .primary').count() === 1);
      // A key skips too, and it goes on its own.
      await page.goto(`${base}/web/`); await ready(page);
      await page.locator('#beginButton').click();
      await page.keyboard.press('Space');
      await page.waitForSelector('#opening', { state: 'detached', timeout: 3000 }).catch(() => {});
      ok(`${name}: a key skips it`, await page.locator('#opening').count() === 0);
      await page.goto(`${base}/web/`); await ready(page);
      await page.locator('#beginButton').click();
      await page.waitForSelector('#opening', { state: 'detached', timeout: 12000 }).catch(() => {});
      ok(`${name}: left alone, it ends by itself`, await page.locator('#opening').count() === 0);
      // Resume and ?skip never replay it.
      await page.goto(`${base}/web/`); await ready(page);
      await page.locator('#resumeButton').click();
      ok(`${name}: Resume goes straight to the city`, await page.locator('#opening').count() === 0);
      await page.goto(`${base}/web/?skip`); await ready(page);
      await page.locator('#beginButton').click();
      ok(`${name}: ?skip goes straight to the city`, await page.locator('#opening').count() === 0);
      // The pause menu's SOUND switch.
      await page.locator('#pauseButton').click();
      const sw = page.locator('[data-pause="sound"]');
      ok(`${name}: the pause menu has a SOUND switch, ON`, /ON/.test(await sw.innerText()));
      await sw.click();
      const off = await page.evaluate(() => window.__ptv3.sound);
      ok(`${name}: SOUND OFF stops every voice`, !off.on && !off.running, JSON.stringify(off));
      ok(`${name}: and says so`, /OFF/.test(await page.locator('[data-pause="sound"]').innerText()));
      await page.goto(`${base}/web/?skip`); await ready(page);
      await page.locator('#resumeButton').click();
      const kept = await page.evaluate(() => window.__ptv3.sound);
      ok(`${name}: the switch is remembered`, !kept.on && !kept.running, JSON.stringify(kept));
      ok(`${name}: no page errors`, errors().length === 0, errors().join(' | '));
      await ctx.close();
    }
    // Reduced motion: one still frame, the same lines, no movement.
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.goto(`${base}/web/`); await ready(page);
    await page.locator('#beginButton').click();
    const still = await page.evaluate(() => [...document.querySelectorAll('#opening *')].every(el => getComputedStyle(el).animationName === 'none'));
    ok('reduced motion: the arrival is a still frame', still && await page.locator('.opening.still').count() === 1);
    ok('reduced motion: the lines are all there at once', await page.locator('.opening-lines p').evaluateAll(ps => ps.every(p => getComputedStyle(p).opacity === '1')));
    await ctx.close();
  } catch (error) {
    ok('unhandled opening gate error', false, error.stack || error.message);
  } finally {
    await browser.close(); server.close();
    console.log(`\n  ${passed} passed, ${failed} failed`);
    process.exit(failed ? 1 : 0);
  }
});
