const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const ROOT = path.resolve(__dirname, '../../..');
const OUT = path.resolve(process.env.CONSEQUENCE_CAPTURE_DIR || path.join(__dirname, 'captures'));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  let file = path.resolve(ROOT, `.${decodeURIComponent(req.url.split('?')[0])}`);
  if (!file.startsWith(`${ROOT}${path.sep}`)) { res.writeHead(403); res.end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file)) { res.writeHead(404); res.end('missing'); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' }); fs.createReadStream(file).pipe(res);
});
(async () => {
  const { CASES } = await import('./model.js');
  fs.mkdirSync(OUT, { recursive: true });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}/art-src/reviews/act1-consequences/`;
  const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_PATH ? { executablePath: process.env.BROWSER_PATH } : {}) });
  const verification = { reviewOnly: true, measuredBotOutcomes: false, cases: [], storageAccesses: 0, errors: [], sourceHashes: Object.fromEntries(['model.js', 'review.js', 'review.css', 'index.html'].map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname, file))).digest('hex')])) };
  try {
    for (const [view, width, height] of [['phone', 390, 844], ['desktop', 1280, 800]]) {
      const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
      page.on('response', response => { if (response.status() >= 400) errors.push(`HTTP ${response.status()}: ${response.url()}`); });
      page.on('requestfailed', request => { if (request.failure()?.errorText !== 'net::ERR_ABORTED') errors.push(`requestfailed: ${request.url()}`); });
      await page.addInitScript(() => {
        window.__reviewStorageAccesses = 0;
        Object.defineProperty(window, 'localStorage', { configurable: true, get() { window.__reviewStorageAccesses += 1; throw Error('Review tried to access campaign storage'); } });
      });
      await page.goto(`${base}?case=victory`); await page.waitForSelector('#workbench:not([hidden])'); await page.waitForLoadState('networkidle');
      assert.equal(await page.locator('#case-select option').count(), 9);
      await page.screenshot({ path: path.join(OUT, `${view}-before.png`) });
      for (const definition of CASES) {
        await page.locator('#case-select').selectOption(definition.id);
        await page.waitForFunction(id => window.__consequenceReview?.id === id, definition.id);
        const initial = await page.evaluate(() => window.__consequenceReview.state());
        await page.locator('#after-tab').click();
        assert.equal(await page.evaluate(() => window.__consequenceReview.applied), false, 'preview does not commit');
        assert.deepEqual(await page.evaluate(() => window.__consequenceReview.state()), initial, 'preview leaves fixture unchanged');
        await page.evaluate(() => scrollTo(0, 0));
        const box = await page.locator('#apply').boundingBox();
        assert(box && box.height >= 44, '44px primary action');
        if (view === 'phone') assert(box.y + box.height <= height, `${definition.id}: primary action appears in initial phone viewport (${JSON.stringify(box)})`);
        await page.locator('#apply').click();
        assert.equal(await page.evaluate(() => window.__consequenceReview.applied), true);
        assert.deepEqual(await page.evaluate(() => window.__consequenceReview.state()), await page.evaluate(() => window.__consequenceReview.projected()));
        if (['victory', 'withdraw', 'police', 'hire'].includes(definition.id)) {
          const settled = await page.evaluate(() => window.__consequenceReview.state());
          await page.locator('#repeat').click();
          assert.deepEqual(await page.evaluate(() => window.__consequenceReview.state()), settled, 'real duplicate API leaves complete fixture state unchanged');
          await page.locator('#reload').click();
          const restored = await page.evaluate(() => window.__consequenceReview.state());
          await page.locator('#repeat').click();
          assert.deepEqual(await page.evaluate(() => window.__consequenceReview.state()), restored, 'same result remains blocked after JSON restore');
        }
        await page.waitForLoadState('networkidle');
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no horizontal overflow');
        const undersized = await page.evaluate(() => [...document.querySelectorAll('body *')].filter(el => el.getClientRects().length && [...el.childNodes].some(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim()) && parseFloat(getComputedStyle(el).fontSize) < 12).map(el => el.tagName));
        assert.deepEqual(undersized, [], '12px visible text floor');
        assert.equal(await page.evaluate(() => window.__reviewStorageAccesses), 0);
        assert.deepEqual(errors, []);
        await page.evaluate(() => scrollTo(0, 0));
        await page.screenshot({ path: path.join(OUT, `${view}-${definition.id}-after.png`) });
        verification.cases.push({ view, width, height, id: definition.id, preview: true, applied: true, storageAccesses: 0, errors: [] });
        console.log(`PASS ${view}/${definition.id}: preview, real effects, isolated storage, visible action, responsive text${['victory', 'withdraw', 'police', 'hire'].includes(definition.id) ? ', duplicate + JSON restore' : ''}`);
      }
      await page.close();
    }
    fs.writeFileSync(path.join(OUT, 'verification.json'), JSON.stringify(verification, null, 2));
    console.log('Consequence browser: 18 fixture flows passed; 20 actual captures; zero campaign-storage access or browser errors.');
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
