// Real Day7 choice: exact current target/cost/wound shown before commitment,
// named actual receipt afterwards, saved once. Fixtures only set the scenario.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const ROOT = path.resolve(__dirname, '../..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png', '.glb': 'model/gltf-binary', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  let file = path.resolve(ROOT, `.${decodeURIComponent(req.url.split('?')[0])}`);
  if (!file.startsWith(`${ROOT}${path.sep}`)) { res.writeHead(403); res.end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file)) { res.writeHead(404); res.end('missing'); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' }); fs.createReadStream(file).pipe(res);
});
function watchErrors(page, base) {
  const errors = [], origin = new URL(base).origin;
  const shell = raw => { const u = new URL(raw); return u.origin === origin && u.pathname === '/hub/shell.js'; };
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400 && !(response.status() === 404 && shell(response.url()))) errors.push(`HTTP ${response.status()} ${response.url()}`); });
  page.on('console', message => { if (message.type() === 'error' && !(message.location().url && shell(message.location().url) && /Failed to load resource: .*404/.test(message.text()))) errors.push(message.text()); });
  page.on('requestfailed', request => { if (request.failure()?.errorText !== 'net::ERR_ABORTED') errors.push(`requestfailed: ${request.url()}`); });
  return errors;
}
const saved = page => page.evaluate(() => JSON.parse(localStorage.getItem('piritori-to-eden:v3')));
const live = page => page.evaluate(() => structuredClone(window.__ptv3.state));
const treatment = page => page.locator('[data-action="choose"][data-choice="treat-crew"]');
const fixture = (page, cash, criticals) => page.evaluate(async ({ cash, criticals }) => {
  const { createState } = await import('./js/v3/state.js');
  const { data, debug } = window.__ptv3;
  const s = createState(data.content); s.scheduleIndex = 12; s.mode = 'encounter'; s.selectedAnchor = 'siltasaari'; s.cash = cash;
  // Recruited/deployed order deliberately disagrees with crewStatus key order.
  s.recruited = ['crew-slot-muscle', 'crew-slot-runner']; s.deployed = [...s.recruited]; s.relationships.jaska = 1;
  for (const [id, condition] of Object.entries(criticals)) Object.assign(s.crewStatus[id], { critical: true, status: 'critical', condition });
  debug.setState(s);
}, { cash, criticals });
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_PATH ? { executablePath: process.env.BROWSER_PATH } : {}), args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const capture = async (page, name) => { if (process.env.PIRITORI_CAPTURE_DIR) { fs.mkdirSync(process.env.PIRITORI_CAPTURE_DIR, { recursive: true }); await page.screenshot({ path: path.join(process.env.PIRITORI_CAPTURE_DIR, name) }); } };
  try {
    for (const [name, width, height] of [['phone', 390, 844], ['desktop', 1280, 800]]) {
      const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' });
      const errors = watchErrors(page, base);
      await page.goto(`${base}/web/?skip`); await page.waitForFunction(() => window.__ptv3?.data); await page.locator('#beginButton').click();
      const names = await page.evaluate(() => Object.fromEntries([...window.__ptv3.data.crew].map(([id, person]) => [id, person.name])));
      await fixture(page, 160, { 'crew-slot-muscle': 1, 'crew-slot-runner': 2 });
      const quote = treatment(page).locator('.treatment-quote');
      assert.equal(await quote.innerText(), `€80 · ${names['crew-slot-runner']} · critical → wounded`);
      assert.match(await treatment(page).innerText(), /weaker financial ending/);
      const before = await live(page), beforeSave = await saved(page);
      await page.evaluate(() => window.__ptv3.debug.render());
      assert.deepEqual(await live(page), before, 'preview changes no in-memory state, logs or flags');
      assert.deepEqual(await saved(page), beforeSave, 'preview changes no persisted state');
      const rect = await treatment(page).boundingBox();
      assert(rect && rect.height >= 44 && rect.y >= 0 && rect.y + rect.height <= height, 'treatment choice is visible in the initial viewport');
      assert.equal(await quote.evaluate(el => parseFloat(getComputedStyle(el).fontSize) >= 12), true);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await capture(page, `treatment-before-${name}.png`);
      await treatment(page).click();
      const paid = await saved(page), receipt = page.locator('.outcome-card');
      assert.match(await receipt.innerText(), new RegExp(`${names['crew-slot-runner']} treated for €80`));
      assert.match(await receipt.innerText(), /still wounded/);
      assert.equal(paid.cash, 80); assert.equal(paid.scheduleIndex, 12);
      assert.equal(paid.crewStatus['crew-slot-runner'].critical, false); assert.equal(paid.crewStatus['crew-slot-runner'].status, 'wounded'); assert.equal(paid.crewStatus['crew-slot-runner'].condition, 2);
      assert.equal(paid.crewStatus['crew-slot-muscle'].critical, true, 'only the selected person is treated');
      assert.equal(paid.choices['enc-pasila-ledger'], 'treat-crew'); assert(paid.flags.includes('crew-prioritised'));
      await capture(page, `treatment-receipt-${name}.png`);
      await page.reload(); await page.locator('#resumeButton').click();
      const restored = await saved(page);
      assert.equal(restored.cash, paid.cash); assert.deepEqual(restored.crewStatus, paid.crewStatus); assert.deepEqual(restored.lastOutcome, paid.lastOutcome);
      assert.match(await page.locator('.outcome-card').innerText(), new RegExp(`${names['crew-slot-runner']} treated for €80`));
      assert.equal(await page.locator('.treatment-quote').count(), 0, 'no second target offered in a resolved encounter');
      await page.locator('[data-action="advance"]').click(); await page.waitForSelector('.city-map');
      const onward = await saved(page); assert.equal(onward.scheduleIndex, 13); assert.equal(onward.selectedAnchor, 'siltasaari'); assert.equal(onward.cash, 80); assert.equal(onward.crewStatus['crew-slot-muscle'].critical, true);
      console.log(`PASS treatment ${name}: actual target order, immutable quote, named receipt, one person/€80, reload once and map return`);
      // Exact affordability and zero-condition floor use the actual current rule.
      await fixture(page, 80, { 'crew-slot-muscle': 0 });
      assert.match(await treatment(page).innerText(), new RegExp(names['crew-slot-muscle']));
      await treatment(page).click(); const floor = await saved(page);
      assert.equal(floor.cash, 0); assert.equal(floor.crewStatus['crew-slot-muscle'].condition, 1); assert.equal(floor.crewStatus['crew-slot-muscle'].status, 'wounded');
      await capture(page, `treatment-floor-${name}.png`);
      await fixture(page, 79, { 'crew-slot-muscle': 1 });
      assert(await treatment(page).isDisabled()); assert.equal(await treatment(page).locator('.treatment-quote').count(), 0); assert.match(await treatment(page).innerText(), /cash >= 80/);
      const poor = await live(page); await page.evaluate(() => window.__ptv3.debug.render()); assert.deepEqual(await live(page), poor);
      await capture(page, `treatment-poor-${name}.png`);
      await fixture(page, 160, {});
      assert(await treatment(page).isDisabled()); assert.equal(await page.locator('.treatment-quote').count(), 0); assert.match(await treatment(page).innerText(), /crew-critical >= 1/);
      assert.equal((await saved(page)).cash, 160); assert.deepEqual(errors, []);
      await capture(page, `treatment-none-${name}.png`);
      console.log(`PASS treatment ${name}: exact affordability, minimum condition floor, still wounded, poor/no-critical blockers, no browser errors`);
      await page.close();
    }
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
