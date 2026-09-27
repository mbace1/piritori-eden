// The road, in a browser (Act I v4.58).
//
//   NODE_PATH=$(npm root -g) node web/test/road-browser.cjs
//
// road.mjs holds the rules in bare node; this holds the screen: a journey that
// rolls an event opens it (the preview never forecast it), every choice says
// its time, a refused choice is shown and says why, the answer pays, the
// clock reads later, the event survives a reload and blocks nothing but
// itself, and a road fight is a real battle that turns no block and reports
// to no mission. Debug hooks set up fixtures only (story block, the road's
// counter, a crew); every action under test is a real tap.
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
const fixture = (page, fn, arg) => page.evaluate(([f, a]) => { const s = structuredClone(window.__ptv3.state); new Function('s', 'a', f)(s, a); window.__ptv3.debug.setState(s); }, [fn, arg]);
const inView = async (page, sel) => page.locator(sel).first().evaluate(el => { const r = el.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight && r.width > 0; }).catch(() => false);

server.listen(0, '127.0.0.1', async () => {
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    for (const [name, vp, touch] of [['desktop', { width: 1280, height: 800 }, false], ['phone', { width: 390, height: 844 }, true]]) {
      const page = await browser.newPage({ viewport: vp, hasTouch: touch, isMobile: touch });
      const errors = watchErrors(page);
      await page.goto(`${base}/web/`);
      await page.waitForFunction(() => Boolean(window.__ptv3?.data && window.__ptv3.road?.events?.length));
      await page.locator('#beginButton').click(); await page.waitForSelector('.city-map');
      // FIXTURE: story block 2, three journeys since the last event — the
      // next one is the fourth and always fires.
      await fixture(page, 's.scheduleIndex = 2; s.road = { journeys: 3, since: 3, seen: [], pending: null, minutes: 0, minutesBlock: -1, last: null };');
      await page.waitForSelector('.next-step [data-action="next-step"]');
      const lead = (await S(page)).selectedAnchor;
      // Plan through the bar; the preview must not forecast the road.
      await page.locator('.next-step [data-action="next-step"]').click();
      const preview = await page.locator('.journey-preview').innerText().catch(() => '');
      ok(`${name}: the journey preview says nothing about the road (a surprise)`, preview && !/event|road|trouble|police|risk/i.test(preview), preview.slice(0, 200));
      await page.locator('.next-step [data-action="next-step"]').click();
      await page.waitForSelector('.road-card', { timeout: 5000 }).catch(() => {});
      const s1 = await S(page);
      ok(`${name}: the fourth journey opens a road event`, await page.locator('.road-card').count() === 1 && s1.mode === 'road' && s1.road.pending, JSON.stringify(s1.road));
      ok(`${name}: Aatami still arrived`, s1.selectedAnchor !== lead);
      const event = await page.evaluate(id => window.__ptv3.road.events.find(e => e.id === id), s1.road.pending.id);
      ok(`${name}: the first road event is low-end hustle (tier 0)`, event?.tier === 0, event?.id);
      const label = await page.locator('.road-card .section-label').innerText();
      ok(`${name}: it says where it happens`, /ON THE WAY|ARRIVING/.test(label), label);
      const times = await page.locator('.road-card .road-time').allInnerTexts();
      ok(`${name}: every choice says what it costs in time`, times.length === event.choices.length && times.every(t => /MIN|NO TIME/.test(t)), times.join('|'));
      ok(`${name}: the first choice is in view without scrolling`, await inView(page, '.road-card .choice-card'));
      // Reload: the event is still waiting, and the ledger cannot skip it.
      await page.reload(); await page.waitForFunction(() => Boolean(window.__ptv3?.data && window.__ptv3.road?.events?.length));
      await page.locator('#resumeButton').click().catch(() => {});
      await page.waitForSelector('.road-card', { timeout: 5000 }).catch(() => {});
      ok(`${name}: a reload comes back to the same event`, await page.locator(`.road-card[data-road="${event.id}"]`).count() === 1);
      await page.locator('[data-mode-target="ledger"]').click();
      ok(`${name}: the road waits for an answer`, await page.locator('.road-card').count() === 1);
      // Answer with the choice that costs the most time; check the pay and the clock.
      const pick = [...event.choices].sort((a, b) => b.minutes - a.minutes).find(c => !(c.requires ?? []).length);
      const before = await S(page);
      await page.locator(`[data-action="road-choose"][data-choice="${pick.id}"]`).click();
      const s2 = await S(page);
      const cashFx = pick.effects.filter(f => f.startsWith('cash:')).reduce((a, f) => a + Number(f.slice(5)), 0);
      ok(`${name}: the answer pays what it said`, s2.cash === before.cash + cashFx, `${before.cash} → ${s2.cash} (${cashFx})`);
      ok(`${name}: the event is seen once and gone`, !s2.road.pending && s2.road.seen.includes(event.id));
      ok(`${name}: time moved, the block did not (D002)`, s2.scheduleIndex === before.scheduleIndex && s2.road.minutes === pick.minutes);
      const block = await page.locator('#blockLabel').innerText();
      ok(`${name}: the clock reads later`, pick.minutes === 0 || /\d\d:\d\d/.test(block), block);
      ok(`${name}: CONTINUE is the one lit action, in view`, await page.locator('.road-card .paper-button.primary').count() === 1 && await inView(page, '.road-card .paper-button.primary'));
      await page.locator('[data-action="road-continue"]').click(); await page.waitForSelector('.city-map');
      ok(`${name}: CONTINUE returns to the map with the next step lit`, await page.locator('.next-step .primary').count() === 1);

      // A fight: refused without a crew (shown, with a reason); with two, a
      // real battle that reports to no mission and turns no block.
      await fixture(page, 's.scheduleIndex = 8; s.mode = "road"; s.road = { journeys: 20, since: 0, seen: [], pending: { id: "road-underpass", phase: "transit", from: "kurvi", to: s.selectedAnchor }, minutes: 0, minutesBlock: -1, last: null };');
      await page.waitForSelector('.road-card[data-road="road-underpass"]');
      const stand = page.locator('[data-action="road-choose"][data-choice="stand"]');
      ok(`${name}: without a crew the fight is shown and refused`, await stand.isDisabled() && /crew/i.test(await stand.innerText()), await stand.innerText());
      await fixture(page, 'const ids = a.slice(0, 2); s.recruited = ids; s.deployed = ids; for (const id of ids) s.crewStatus[id].status = "available";',
        await page.evaluate(() => window.__ptv3.data.content.crew.map(c => c.id)));
      await page.locator('[data-action="road-choose"][data-choice="stand"]').click();
      await page.waitForTimeout(800);
      const s3 = await S(page);
      ok(`${name}: with a crew, standing becomes a fight`, s3.mode === 'battle' && s3.battle?.id === 'battle-karhupuisto-2v2' && s3.battle?.road === 'road-underpass');
      ok(`${name}: the road fight reports to no mission`, s3.battle?.missionId === null);
      ok(`${name}: no page errors`, errors().length === 0, errors().join(' | '));
      await page.close();
    }
  } catch (error) {
    ok('unhandled road gate error', false, error.stack || error.message);
  } finally {
    await browser.close(); server.close();
    console.log(`\n  ${passed} passed, ${failed} failed`);
    process.exit(failed ? 1 : 0);
  }
});
