// The chapter turn in a browser (H7, owner greenlight 2026-09-29).
//
//   NODE_PATH=$(npm root -g) node web/test/chapter-browser.cjs
//
// chapter.mjs holds the rules; this holds the screen. Fixtures only set the
// scene (money earned, where Aatami stands); the shipment is a real tap, and
// the panel must then say what crosses into chapter 2 without applying it.
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
server.listen(0, '127.0.0.1', async () => {
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    for (const [name, vp, touch] of [['desktop', { width: 1280, height: 800 }, false], ['phone', { width: 390, height: 844 }, true]]) {
      const page = await browser.newPage({ viewport: vp, hasTouch: touch, isMobile: touch });
      const errors = watchErrors(page);
      await page.goto(`${base}/web/?skip`);
      await page.waitForFunction(() => Boolean(window.__ptv3?.data && window.__ptv3.story?.case));
      await page.locator('#beginButton').click(); await page.waitForSelector('.city-map');
      const anchor = await page.evaluate(() => window.__ptv3.data.content.chapters[0].ending.anchor_id);
      await fixture(page, 's.cash = 700; s.chapterEarned = 450; s.stock.piri = 2; s.selectedAnchor = a; s.equipment.push({ id: "knife", cond: 0 });', anchor);
      const button = page.locator('[data-action="attempt-chapter-ending"]').first();
      await page.locator('[data-mode-target="ledger"]:visible').first().click();
      ok(`${name}: the shipment can be attempted`, await button.isEnabled());
      await button.click();
      const list = page.locator('.turn-list');
      await list.waitFor({ timeout: 5000 }).catch(() => {});
      ok(`${name}: the panel says what goes into chapter 2`, await list.isVisible() && /INTO CHAPTER 2/.test(await page.locator('.paper-panel:has(.turn-list)').innerText()));
      const text = await list.innerText();
      const stake = await page.evaluate(() => window.__ptv3.data.content.chapter_turn.opening_cash_eur);
      ok(`${name}: cash goes to the stake`, new RegExp(`Cash[\\s\\S]*€${stake}[\\s\\S]*STANDARD STAKE`, 'i').test(text), text);
      ok(`${name}: stock resets and weapons carry`, /Stock[\s\S]*2 → 0[\s\S]*RESETS/i.test(text) && /Weapons and gear[\s\S]*CARRIES/i.test(text), text);
      const s = await S(page);
      ok(`${name}: shown, not applied`, s.chapter === 1 && s.chapterCleared && s.stock.piri === 2);
      ok(`${name}: chapter 2 is not authored yet, and it says so`, /later build/.test(await page.locator('.paper-panel:has(.turn-list)').innerText()));
      ok(`${name}: no overflow`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      if (name === 'phone') await page.locator('.paper-panel:has(.turn-list)').screenshot({ path: path.join(require('os').tmpdir(), 'chapter-turn-phone.png') });
      const e = errors();
      ok(`${name}: no errors`, e.length === 0, e.join(' | '));
      await page.close();
    }
  } catch (err) { failed += 1; console.log('  FAIL crashed →', err.stack); }
  await browser.close(); server.close();
  console.log(`chapter-browser: ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
});
