// The city's screen and the outing's save, as a player meets them (v4.100,
// design/STATE_MACHINES.md M1 and M2).
//
//   NODE_PATH=$(npm root -g) node web/test/screens-browser.cjs
//
// Fixtures only set the scene (a visit already chosen in, a finished fight, a
// save locked by v4.99). Leaving and travelling are taps on the nav bar and
// the map, as a player makes them.
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary',
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
// ../hub/shell.js exists only under the arcade: one known 404, forgiven precisely.
function watchErrors(page) {
  const errors = []; let shellMisses = 0;
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  page.on('response', r => { if (r.status() === 404 && new URL(r.url()).pathname.endsWith('/hub/shell.js')) shellMisses += 1; });
  page.on('requestfailed', r => { const why = r.failure()?.errorText ?? ''; if (!new URL(r.url()).pathname.endsWith('/hub/shell.js') && why !== 'net::ERR_ABORTED') errors.push(`requestfailed: ${r.url()} (${why})`); });
  return () => { let forgive = shellMisses; return errors.filter(e => !(forgive > 0 && /Failed to load resource: .*404/.test(e) && forgive--)); };
}
const KEY = 'piritori-to-eden:v3';
const S = page => page.evaluate(() => structuredClone(window.__ptv3.state));
const fixture = (page, body) => page.evaluate(b => { const s = structuredClone(window.__ptv3.state); new Function('s', b)(s); window.__ptv3.debug.setState(s); }, body);
const nav = (page, mode) => page.locator(`#modeNav [data-mode-target="${mode}"]`).click();
async function travel(page, id) {
  await page.locator(`[data-anchor-group="${id}"] .map-anchor-hit`).click({ force: true });
  await page.locator('[data-action="plan-journey"]').click();
  await page.locator('[data-action="commit-journey"]').click();
}
async function boot(page, base, button = '#beginButton') {
  await page.goto(`${base}/web/?skip`);
  await page.waitForFunction(() => Boolean(window.__ptv3?.data));
  await page.locator(button).click();
  await page.waitForSelector('.city-map');
}

server.listen(0, '127.0.0.1', async () => {
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = watchErrors(page);
    await boot(page, base);

    // ── M2: a visit chosen in, then left by the nav bar (the v4.99 travel lock).
    await fixture(page, `s.selectedAnchor = 'makelansilta'; s.choices['enc-jaska-receipt'] = 'leave-it';
      s.choices['visit-jaska-room-to-work'] = 'jaska-listen'; s.activeVisit = 'visit-jaska-room-to-work'; s.mode = 'visit';`);
    ok('the scene: a visit already chosen in', (await S(page)).mode === 'visit');
    await nav(page, 'route');
    let s = await S(page);
    ok('the nav bar out of a visit closes it', s.mode === 'route' && s.activeVisit === null, JSON.stringify({ mode: s.mode, visit: s.activeVisit }));
    await travel(page, 'siltasaari');
    s = await S(page);
    ok('and Aatami can travel', s.selectedAnchor === 'siltasaari', s.selectedAnchor);

    // ── M2: a save already locked by v4.99 comes back usable.
    await page.evaluate(key => { const save = JSON.parse(localStorage.getItem(key)); save.activeVisit = 'visit-jaska-room-to-work'; save.mode = 'route'; localStorage.setItem(key, JSON.stringify(save)); }, KEY);
    await boot(page, base, '#resumeButton');
    await travel(page, 'hakaniemi');
    s = await S(page);
    ok('a locked save is repaired as it loads', s.selectedAnchor === 'hakaniemi' && s.activeVisit === null, JSON.stringify({ at: s.selectedAnchor, visit: s.activeVisit }));

    // ── M2: a finished fight's result stays until it is finished.
    await fixture(page, `s.recruited = ['crew-slot-runner', 'crew-slot-muscle', 'crew-slot-watcher']; s.deployed = [...s.recruited];`);
    await page.evaluate(() => window.__ptv3.debug.startBattle('battle-hermanni-training'));
    await page.evaluate(() => { const b = window.__ptv3.state.battle; b.status = 'resolved'; b.result = 'withdraw'; window.__ptv3.debug.render(); });
    // The nav bar is hidden over a fight (v3.css, UX_SPEC §3.2), so a player
    // cannot leave this way today. The rule now lives in the state too, so a
    // stylesheet change cannot reopen it: a click that reaches it anyway.
    ok('the nav bar is hidden over a fight', await page.locator('#modeNav').isHidden());
    await page.evaluate(() => document.querySelector('#modeNav [data-mode-target="encounter"]').click());
    s = await S(page);
    ok('and a click that reaches it does not leave a finished fight', s.mode === 'battle' && s.battle?.status === 'resolved', s.mode);
    ok('it says why', /Finish the fight first/.test(await page.locator('#toast').innerText()));
    const block = s.scheduleIndex;
    await page.locator('[data-action="finish-battle"]').first().click();
    s = await S(page);
    ok('finishing it closes it (a training fight costs no block)', s.battle === null && s.scheduleIndex === block && s.mode !== 'battle', JSON.stringify({ battle: s.battle?.status, from: block, to: s.scheduleIndex, mode: s.mode }));

    // ── M1: Back or Forward restoring the page from memory reads the save again.
    const written = await page.evaluate(key => { const save = JSON.parse(localStorage.getItem(key)); save.cash += 77; localStorage.setItem(key, JSON.stringify(save)); return save.cash; }, KEY);
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
    s = await S(page);
    ok('a page restored from memory takes what another page wrote', s.cash === written, `${s.cash} vs ${written}`);
    await nav(page, 'ledger');
    ok('and never writes its old copy over it', JSON.parse(await page.evaluate(key => localStorage.getItem(key), KEY)).cash === written);

    const errs = errors();
    ok('no errors', errs.length === 0, errs.join(' | '));
  } catch (error) {
    failed += 1; console.log(`  FAIL ${error.stack}`);
  } finally {
    await browser.close(); server.close();
    console.log(`  ${passed} passed, ${failed} failed`);
    process.exit(failed ? 1 : 0);
  }
});
