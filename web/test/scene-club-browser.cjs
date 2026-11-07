// Authored Scene Club stakes remain visible and settle once through the campaign.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const TEST_URL = process.env.PIRITORI_TEST_URL || 'http://127.0.0.1:8781/web/';
const testOrigin = new URL(TEST_URL).origin;
// The arcade shell exists only in the deployed hub. Exempt this exact local
// URL, never an arbitrary 404 or console error with similar wording.
const isLocalHubShell = raw => {
  const url = new URL(raw);
  return url.origin === testOrigin && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)
    && url.pathname === '/hub/shell.js';
};
function watchErrors(page) {
  const errors = [];
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
  page.on('response', response => {
    if (response.status() < 400) return;
    if (response.status() === 404 && isLocalHubShell(response.url())) return;
    errors.push(`HTTP ${response.status()}: ${response.url()}`);
  });
  page.on('console', message => {
    if (message.type() !== 'error') return;
    const url = message.location().url;
    if (url && isLocalHubShell(url) && /Failed to load resource: .*404/.test(message.text())) return;
    errors.push(`console: ${message.text()} (${url || 'no source URL'})`);
  });
  page.on('requestfailed', request => {
    const why = request.failure()?.errorText || '';
    // Reloads cancel in-flight requests; this is the existing browser-suite
    // convention. HTTP failures above are always checked by exact URL.
    if (why === 'net::ERR_ABORTED') return;
    errors.push(`requestfailed: ${request.url()} (${why})`);
  });
  return () => errors;
}

async function checkCanvasMotion(page, speaker, reducedMotion, interval = 350) {
  const result = await page.locator('.cutin-canvas').evaluate(async (canvas, { speaker, interval, reducedMotion }) => {
    // Let attach's first real frame paint before sampling. Compare actual
    // RGBA pixels in the figure region, not pose metadata or a mocked clock.
    if (reducedMotion !== 'reduce') await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const read = () => {
      if (canvas.closest('.cutin').getAttribute('aria-label') !== speaker) throw Error('Speaker changed during frame comparison');
      const top = Math.floor(canvas.height * 0.38);
      return canvas.getContext('2d').getImageData(0, top, Math.floor(canvas.width * 0.7), canvas.height - top).data;
    };
    const first = read();
    await new Promise(resolve => setTimeout(resolve, interval));
    const second = read();
    return {
      drawn: first.some((value, i) => i % 4 === 3 && value > 0) && second.some((value, i) => i % 4 === 3 && value > 0),
      changed: first.some((value, i) => value !== second[i]),
    };
  }, { speaker, interval, reducedMotion });
  assert(result.drawn, `${speaker}: nonblank canvas frames`);
  assert.equal(result.changed, reducedMotion !== 'reduce', `${speaker}: ${reducedMotion} canvas motion`);
}

(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_PATH ? { executablePath: process.env.BROWSER_PATH } : {}), args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    for (const reducedMotion of ['reduce', 'no-preference']) {
      for (const [name, width, height] of [['phone', 390, 844], ['desktop', 1280, 800], ['landscape', 844, 390]]) {
        const page = await browser.newPage({ viewport: { width, height }, reducedMotion });
        const errors = watchErrors(page);
        await page.goto(TEST_URL);
        await page.waitForFunction(() => window.__ptv3?.data);
        await page.evaluate(async () => {
          const { createState, SAVE_KEY } = await import('./js/v3/state.js');
          const c = await (await fetch('../content/era1-slice-v1.json')).json();
          const s = createState(c); s.scheduleIndex = 2; s.mode = 'encounter'; s.selectedAnchor = c.schedule[2].anchor_id;
          localStorage.setItem(SAVE_KEY, JSON.stringify(s));
        });
        await page.reload(); await page.locator('#resumeButton').click();
        await page.waitForSelector('.cutin canvas[data-status="ready"]');
        assert.equal(await page.locator('.cutin').getAttribute('aria-modal'), 'true');
        assert.equal(await page.locator('.cutin').getAttribute('aria-label'), 'JASKA');
        await checkCanvasMotion(page, 'JASKA', reducedMotion);
        await page.locator('.cutin-options button').first().focus();
        await page.keyboard.press('Shift+Tab');
        assert.equal(await page.evaluate(() => document.activeElement.textContent.trim()), 'Look around');
        await page.keyboard.press('Tab');
        assert.match(await page.evaluate(() => document.activeElement.textContent), /Ask before taking/);
        const notes = page.locator('.cutin-options small'); assert.equal(await notes.count(), 3);
        assert.match(await notes.first().innerText(), /preserve trust/);
        const boxes = await page.locator('.cutin-options button').evaluateAll(els => els.map(e => { const r = e.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, height: r.height }; }));
        // Landscape may scroll within its bounded decision panel; portrait and desktop fit all choices.
        if (name !== 'landscape') for (const r of boxes) assert(r.top >= 0 && r.bottom <= height && r.height >= 44, JSON.stringify(r));
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        if (process.env.PIRITORI_CAPTURE_DIR) {
          fs.mkdirSync(process.env.PIRITORI_CAPTURE_DIR, { recursive: true });
          await page.screenshot({ path: `${process.env.PIRITORI_CAPTURE_DIR}/scene-after-${name}-${reducedMotion}.png` });
        }
        const initial = await page.evaluate(() => JSON.parse(localStorage.getItem('piritori-to-eden:v3')));
        await page.locator('.cutin-options button').first().click();
        assert.equal(await page.locator('.cutin').getAttribute('aria-label'), 'AATAMI');
        await checkCanvasMotion(page, 'AATAMI', reducedMotion, 180);
        await page.getByRole('button', { name: 'Continue', exact: true }).click();
        await page.waitForSelector('.city-map');
        const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('piritori-to-eden:v3')));
        const before = await saved(); assert.equal(before.choices['enc-jaska-receipt'], 'ask-envelope');
        await page.reload(); await page.locator('#resumeButton').click(); await page.waitForSelector('.city-map');
        const after = await saved(); assert.deepEqual(after.relationships, before.relationships); assert.equal(after.markka, before.markka); assert.equal(before.markka, initial.markka + 300); assert.equal(before.relationships.jaska, (initial.relationships.jaska || 0) + 1); assert(before.flags.includes('markka-explained'));
        assert.equal(await page.locator('.cutin[data-talk]').count(), 0); assert.deepEqual(errors(), []);
        console.log(`PASS Scene Club ${name}/${reducedMotion}: ${reducedMotion === 'reduce' ? 'Jaska/Aatami pixels stay still' : 'Jaska/Aatami pixels animate'}, strict errors, forecasts, keyboard, choice, map, reload`);
        await page.close();
      }
    }
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
