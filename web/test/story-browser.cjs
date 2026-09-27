// The Thursday Load in a browser (Act I v4.62, owner greenlight G1-G7).
//
//   NODE_PATH=$(npm root -g) node web/test/story-browser.cjs
//
// story.mjs holds the rules; this holds the screens: the ledger's mission
// briefings and case board, the Brahenkenttä visit, and the Thursday Tram at
// Piritori. Debug hooks set up fixtures only (clue flags, a crew, where Aatami
// stands); every action under test is a real tap.
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
      // The ledger: four briefings, eight clues, nothing found.
      await page.locator('[data-mode-target="ledger"]').click();
      ok(`${name}: four mission briefings`, await page.locator('.mission-card').count() === 4);
      const paper = page.locator('.mission-card[data-mission="mission-paper-bag"]');
      ok(`${name}: the first is open, with its steps and stakes`, await paper.getAttribute('data-status') === 'open'
        && await paper.locator('.mission-steps li').count() === 3 && /CLEAN/.test(await paper.innerText()) && /\+€23/.test(await paper.innerText()));
      ok(`${name}: a mission not yet told is only a title`, /not told you/.test(await page.locator('.mission-card[data-mission="mission-bear-path"]').innerText()));
      ok(`${name}: the case board lists every clue, none found`, await page.locator('.clue').count() === 8 && await page.locator('.clue.found').count() === 0);
      // Harju visit: after Toko, with a runner, at Brahenkenttä.
      await fixture(page, 's.choices["enc-toko-quiet-voice"] = "buy-info"; s.flags.push("toko-van-pattern"); s.recruited = ["crew-slot-runner"]; s.deployed = ["crew-slot-runner"]; s.selectedAnchor = "harju"; s.mode = "route";');
      await page.locator('[data-mode-target="route"]').click();
      const visit = page.locator('[data-action="open-visit"][data-visit="visit-harju-thursday"]');
      ok(`${name}: at Brahenkenttä the Thursday visit is offered`, await visit.count() === 1);
      await visit.click();
      await page.locator('[data-choice="watch-the-tram"]').click();
      ok(`${name}: watching the tram records the clue`, (await S(page)).flags.includes('memory:saw-the-tram'));
      if (await page.locator('[data-action="leave-visit"]').count()) await page.locator('[data-action="leave-visit"]').click();
      // Second key clue, then Piritori.
      await fixture(page, 's.flags.push("mccormicks-know-skim"); s.selectedAnchor = "piritori"; s.mode = "route";');
      await page.locator('[data-mode-target="ledger"]').click();
      ok(`${name}: the board shows what was found`, await page.locator('.clue.found').count() === 3 && /waiting at PIRITORI/i.test(await page.locator('.case-board').innerText()));
      await page.locator('[data-mode-target="route"]').click();
      const caseBtn = page.locator('[data-action="open-case"]');
      ok(`${name}: at Piritori the case can be opened, unlit`, await caseBtn.count() === 1 && !(await caseBtn.evaluate(el => el.classList.contains('primary')))
        && await page.locator('.next-step .primary').count() === 1);
      await caseBtn.click();
      ok(`${name}: the Thursday Tram offers four endings`, await page.locator('[data-action="case-choose"]').count() === 4);
      ok(`${name}: the first choice is in view`, await page.locator('[data-action="case-choose"]').first().evaluate(el => { const r = el.getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0; }));
      const before = await S(page);
      await page.locator('[data-action="case-choose"][data-choice="sell-kello"]').click();
      const after = await S(page);
      ok(`${name}: selling Kello pays €250 and is recorded once`, after.cash === before.cash + 250 && after.choices['case-thursday-tram'] === 'sell-kello');
      ok(`${name}: the block did not turn`, after.scheduleIndex === before.scheduleIndex);
      await page.locator('[data-action="leave-case"]').click();
      ok(`${name}: the case is not offered again`, await page.locator('[data-action="open-case"]').count() === 0);
      await page.locator('[data-mode-target="ledger"]').click();
      ok(`${name}: the board records how it was settled`, /Settled: Sell Kello/.test(await page.locator('.case-board').innerText()));
      ok(`${name}: no page errors`, errors().length === 0, errors().join(' | '));
      await page.close();
    }
  } catch (error) {
    ok('unhandled story gate error', false, error.stack || error.message);
  } finally {
    await browser.close(); server.close();
    console.log(`\n  ${passed} passed, ${failed} failed`);
    process.exit(failed ? 1 : 0);
  }
});
