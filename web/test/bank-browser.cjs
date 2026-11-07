// The fixed-rate quote is visible before choosing and pays once through the
// real authored encounter. Fixtures place Aatami at the existing bank lead.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const TEST_URL = process.env.PIRITORI_TEST_URL || 'http://127.0.0.1:8781/web/';
const origin = new URL(TEST_URL).origin;
const shell = raw => { const u = new URL(raw); return u.origin === origin && ['localhost', '127.0.0.1', '[::1]'].includes(u.hostname) && u.pathname === '/hub/shell.js'; };
function watchErrors(page) {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', r => { if (r.status() >= 400 && !(r.status() === 404 && shell(r.url()))) errors.push(`HTTP ${r.status()} ${r.url()}`); });
  page.on('console', m => { if (m.type() === 'error' && !(m.location().url && shell(m.location().url) && /Failed to load resource: .*404/.test(m.text()))) errors.push(m.text()); });
  page.on('requestfailed', r => { if (r.failure()?.errorText !== 'net::ERR_ABORTED') errors.push(`${r.url()}: ${r.failure()?.errorText}`); });
  return errors;
}
const saved = p => p.evaluate(() => JSON.parse(localStorage.getItem('piritori-to-eden:v3')));
async function fixture(page, markka, mode = 'encounter') {
  await page.evaluate(async ({ markka, mode }) => {
    const { createState } = await import('./js/v3/state.js');
    const { data, debug } = window.__ptv3;
    const state = createState(data.content);
    state.scheduleIndex = 4; state.selectedAnchor = 'siltasaari';
    state.markka = markka; state.mode = mode;
    if (mode === 'encounter') state.newsSeen.push(data.content.schedule[4].news_before);
    debug.setState(state);
  }, { markka, mode });
}
const choice = (p, id) => p.locator(`[data-action="choose"][data-choice="${id}"]`);
const quote = (p, id) => choice(p, id).locator('.conversion-quote');
const normalized = text => text.replace(/\s+/g, ' ').trim();
(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_PATH ? { executablePath: process.env.BROWSER_PATH } : {}), args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    for (const [name, width, height] of [['phone', 390, 844], ['desktop', 1280, 800]]) {
      const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' });
      const errors = watchErrors(page);
      await page.goto(TEST_URL);
      await page.waitForFunction(() => window.__ptv3?.data);
      await page.locator('#beginButton').click();
      // Take the real news-before path, including Arvo's acknowledgement.
      await fixture(page, 300, 'route');
      await page.locator('[data-action="next-step"][data-step="enter"]').click();
      await page.locator('[data-action="ack-news"]').click();
      assert.equal((await saved(page)).mode, 'encounter');
      assert.equal(normalized(await quote(page, 'convert-all').innerText()), '300 mk → €50,45 · 0 mk kept');
      assert.equal(normalized(await quote(page, 'convert-part').innerText()), '120 mk → €20,18 · 180 mk kept');
      assert.match(await choice(page, 'convert-all').innerText(), /block and visible visit/);
      assert.match(await choice(page, 'convert-part').innerText(), /later family choice/);
      assert.equal(await quote(page, 'leave-queue').count(), 0);
      const before = await saved(page);
      const liveBefore = await page.evaluate(() => structuredClone(window.__ptv3.state));
      await page.evaluate(() => window.__ptv3.debug.render());
      assert.deepEqual(await saved(page), before, 'rendering quotes does not change any saved field');
      assert.deepEqual(await page.evaluate(() => structuredClone(window.__ptv3.state)), liveBefore, 'rendering quotes does not change live campaign state');
      const measures = await page.locator('.choice-list button').evaluateAll(els => els.map(el => { const r = el.getBoundingClientRect(); return { height: r.height, bottom: r.bottom }; }));
      assert(measures.every(r => r.height >= 44), 'choices keep touch targets');
      assert(measures.every(r => r.bottom <= height), 'all three choices fit the initial viewport');
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no horizontal overflow');
      if (process.env.PIRITORI_CAPTURE_DIR) {
        fs.mkdirSync(process.env.PIRITORI_CAPTURE_DIR, { recursive: true });
        await page.screenshot({ path: path.join(process.env.PIRITORI_CAPTURE_DIR, `bank-quotes-${name}.png`), fullPage: true });
      }
      await choice(page, 'convert-part').click();
      const paid = await saved(page);
      assert.equal(paid.cash, Math.round((before.cash + 20.18) * 100) / 100);
      assert.equal(paid.markka, 180); assert(paid.flags.includes('bank-visit-visible'));
      await page.reload(); await page.locator('#resumeButton').click();
      const restored = await saved(page);
      assert.equal(restored.cash, paid.cash); assert.equal(restored.markka, paid.markka);
      assert.equal(await page.locator('.conversion-quote').count(), 0, 'resolved exchange has no choice quotes');
      await page.locator('[data-action="advance"]').click(); await page.waitForSelector('.city-map');
      assert.equal((await saved(page)).scheduleIndex, 5);
      // Another carried amount changes the all quote, using floor-to-cent settlement.
      await fixture(page, 600);
      assert.equal(normalized(await quote(page, 'convert-all').innerText()), '600 mk → €100,91 · 0 mk kept');
      await choice(page, 'convert-all').click();
      assert.equal((await saved(page)).cash, 260.91); assert.equal((await saved(page)).markka, 0);
      await fixture(page, 119);
      assert.equal(await choice(page, 'convert-part').isDisabled(), true);
      assert.equal(await quote(page, 'convert-part').count(), 0, 'no quote for a locked choice');
      await fixture(page, 0);
      assert.equal(await choice(page, 'convert-all').isDisabled(), true);
      assert.equal(await page.locator('.conversion-quote').count(), 0);
      assert.equal(await choice(page, 'leave-queue').isEnabled(), true);
      assert.deepEqual(errors, []);
      console.log(`PASS bank ${name}: news → quotes, exact amounts, immutable preview, partial/all payment, reload, map return and locked choices`);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
