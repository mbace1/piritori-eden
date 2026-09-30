// The families standing in a browser (H5).
//
//   NODE_PATH=$(npm root -g) node web/test/standing-browser.cjs
//
// standing.mjs holds the rules; this holds the screens. Fixtures set the
// scene (the block, where Aatami stands, a family's number, cash); the
// choice that insults them, the nights that settle it, and the answers are
// all real taps.
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


const S = page => page.evaluate(() => structuredClone(window.__ptv3.state));
const fixture = (page, body, arg) => page.evaluate(([b, a]) => { const s = structuredClone(window.__ptv3.state); new Function('s', 'a', b)(s, a); window.__ptv3.debug.setState(s); }, [body, arg]);
async function playBeat(page, choice) {
  await page.locator('[data-action="next-step"][data-step="enter"]').click();
  await page.locator(`[data-action="choose"][data-choice="${choice}"]`).click();
  await page.locator('[data-action="advance"]').click();
}

server.listen(0, '127.0.0.1', async () => {
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    for (const [name, vp, touch] of [['desktop', { width: 1280, height: 800 }, false], ['phone', { width: 390, height: 844 }, true]]) {
      const page = await browser.newPage({ viewport: vp, hasTouch: touch, isMobile: touch });
      const errors = watchErrors(page);
      await page.goto(`${base}/web/?skip`);
      await page.waitForFunction(() => Boolean(window.__ptv3?.data?.families && window.__ptv3.story?.case));
      await page.locator('#beginButton').click(); await page.waitForSelector('.city-map');
      await page.locator('[data-mode-target="ledger"]:visible').first().click();
      ok(`${name}: the ledger shows both families`, await page.locator('.family-card').count() === 2);
      ok(`${name}: both start neutral`, await page.locator('.family-card[data-rung="neutral"]').count() === 2);
      // Day 9's night: stalling the families insults the McCormicks (-1 -> -2).
      await fixture(page, 's.scheduleIndex = 17; s.selectedAnchor = "linjat_yard"; s.relationships.mccormick_family = -1; s.cash = 200; s.mode = "route";');
      await page.locator('[data-mode-target="route"]:visible').first().click();
      await playBeat(page, 'stall');
      let s = await S(page);
      ok(`${name}: the night brings their bill`, s.mode === 'road' && s.road.pending?.id === 'road-restitution-mccormick');
      ok(`${name}: and it reads as theirs`, /The McCormicks send a bill/i.test(await page.locator('main, #app, body').first().innerText()));
      await page.locator('[data-action="road-choose"][data-choice="pay"]').click();
      await page.locator('[data-action="road-continue"]').click();
      s = await S(page);
      ok(`${name}: paying buys them back to wary`, s.relationships.mccormick_family === -1 && s.cash === 120);
      // Retaliating: a warning one night, the McCormicks the next.
      await fixture(page, 's.scheduleIndex = 17; s.selectedAnchor = "linjat_yard"; s.relationships.mccormick_family = -2; s.relationships.jade_lantern_network = 0; s.standing = { warned: {}, demanded: { mccormick_family: true } }; s.choices = {}; s.mode = "route"; s.road.pending = null;');
      await playBeat(page, 'stall');
      s = await S(page);
      ok(`${name}: retaliating, first they warn you`, s.relationships.mccormick_family === -3 && s.standing.warned.mccormick_family && s.mode !== 'road', JSON.stringify({ rel: s.relationships, st: s.standing, mode: s.mode, pend: s.road?.pending, idx: s.scheduleIndex }));
      await page.locator('[data-mode-target="ledger"]:visible').first().click();
      const card = page.locator('.family-card[data-family="mccormick_family"]');
      ok(`${name}: the card says retaliating, and when`, (await card.getAttribute('data-rung')) === 'retaliating' && /Tomorrow night/.test(await card.innerText()));
      await fixture(page, 's.scheduleIndex = 19; s.selectedAnchor = "sornainen_harbour"; s.mode = "route";');
      await page.locator('[data-mode-target="route"]:visible').first().click();
      await playBeat(page, 'let-it-go');
      s = await S(page);
      ok(`${name}: the next night they come`, s.mode === 'road' && s.road.pending?.id === 'road-retaliation-mccormick');
      const stand = page.locator('[data-action="road-choose"][data-choice="stand"]');
      ok(`${name}: alone, Aatami cannot stand against them`, await stand.isDisabled());
      ok(`${name}: no overflow`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      if (name === 'phone') {
        await page.locator('[data-action="road-choose"][data-choice="take-it"]').click();
        await page.locator('[data-action="road-continue"]').click();
        await page.locator('[data-mode-target="ledger"]:visible').first().click();
        await page.locator('.family-board').screenshot({ path: path.join(require('os').tmpdir(), 'families-phone.png') });
      }
      const e = errors();
      ok(`${name}: no errors`, e.length === 0, e.join(' | '));
      await page.close();
    }
  } catch (err) { failed += 1; console.log('  FAIL crashed →', err.stack); }
  await browser.close(); server.close();
  console.log(`standing-browser: ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
});
