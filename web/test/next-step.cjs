// The first two minutes always offer ONE next step (Act I v4.57).
//
//   NODE_PATH=$(npm root -g) node web/test/next-step.cjs
//
// Measured on v4.56 (design/FIRST_TWO_MINUTES.md): 3 of 11 opening steps on a
// desktop and 5 on a phone had no lit action in view, and every time the
// story moved the lead the copy said "go to the newly highlighted anchor" and
// offered no button. The pinned bar holds exactly one lit action and only
// routes to the ordinary actions (enter / plan / travel), so the M1/M2
// contracts stay the ones already gated.
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


// A cold player follows only what the screen offers. On the route screen that
// must be exactly ONE lit action, in view, that moves the story on.
const litInView = page => page.evaluate(() => [...document.querySelectorAll('.paper-button.primary, .choice-card')]
  .filter(e => !e.disabled && e.offsetParent !== null)
  .filter(e => { const r = e.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight && r.width > 0; })
  .map(e => e.textContent.trim().replace(/\s+/g, ' ')));
const S = page => page.evaluate(() => structuredClone(window.__ptv3.state));

server.listen(0, '127.0.0.1', async () => {
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  try {
    for (const [name, vp, touch] of [['phone', { width: 390, height: 844 }, true], ['landscape phone', { width: 844, height: 390 }, true], ['desktop', { width: 1280, height: 800 }, false]]) {
      const page = await browser.newPage({ viewport: vp, hasTouch: touch, isMobile: touch });
      const errs = watchErrors(page);
      const press = async () => { const b = page.locator('[data-action="next-step"]'); touch ? await b.tap() : await b.click(); };
      const onlyNext = async label => {
        await page.waitForSelector('.city-map');
        const lit = await litInView(page);
        ok(`${name} ${label}: exactly one lit action in view`, lit.length === 1, JSON.stringify(lit));
        ok(`${name} ${label}: and it is the next step`, await page.locator('[data-action="next-step"]').isVisible() && lit[0] === (await page.locator('[data-action="next-step"]').textContent()).trim(), JSON.stringify(lit));
      };
      await page.goto(`${base}/web/`);
      await page.waitForFunction(() => Boolean(window.__ptv3?.data));
      await page.locator('#beginButton').click();
      await onlyNext('day 1, at the lead');
      ok(`${name}: the step says ENTER`, /^ENTER · /.test(await page.locator('[data-action="next-step"]').textContent()));
      await press();
      ok(`${name}: it opens the story encounter`, await page.locator('#game').getAttribute('data-mode') === 'encounter');
      await page.locator('[data-choice="buy"]').click();
      await page.locator('[data-action="advance"]').click();
      await onlyNext('after the purchase, away from the lead');
      ok(`${name}: the map is at the top again`, await page.evaluate(() => document.getElementById('modeRoot').scrollTop === 0));
      ok(`${name}: the step says TRAVEL TO SILTASAARI`, /TRAVEL TO SILTASAARI/i.test(await page.locator('[data-action="next-step"]').textContent()));
      const before = await S(page);
      await press();
      const planned = await S(page);
      ok(`${name}: planning through the bar changes nothing`, JSON.stringify(planned) === JSON.stringify(before));
      await onlyNext('journey planned');
      await press();
      const arrived = await S(page);
      ok(`${name}: TRAVEL arrives once, free (D002)`, arrived.selectedAnchor === 'siltasaari' && arrived.cash === before.cash && arrived.scheduleIndex === before.scheduleIndex);
      await onlyNext('arrived');
      await press();
      await page.locator('[data-choice="complete"]').click();
      ok(`${name}: the sale lands at €183`, (await S(page)).cash === 183);
      ok(`${name}: the cash card names the change`, (await page.locator('.cash-delta').textContent().catch(() => '')).includes('+€68'));
      await page.locator('[data-action="advance"]').click();
      await onlyNext('day 2');
      ok(`${name}: no browser errors`, errs().length === 0, errs().join(' | '));
      await page.close();
    }
  } catch (error) {
    ok('unhandled next-step gate error', false, error.stack || error.message);
  } finally {
    await browser.close(); server.close();
    console.log(`\n  ${passed} passed, ${failed} failed`);
    process.exit(failed ? 1 : 0);
  }
});
