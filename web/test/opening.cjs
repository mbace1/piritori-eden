// The arrival and the city's sound (Act I v4.59).
//
//   NODE_PATH=$(npm root -g) node web/test/opening.cjs
//
// Owner, 2026-09-27: "sure, setting up" (an arrival on Begin) and "yes" to a
// tram bell, the till and rain. Held here: the arrival plays on a NEW run and
// not on Resume or with ?skip; it is skippable from frame one by a tap, the
// SKIP button or a key, and goes on its own; it never changes the save; under
// reduced motion it is one still frame; after it the next step is lit. Sound
// wakes on Begin, goes through one master gain, and the pause menu's SOUND
// switch really stops it and is remembered.
// Owner visual restart, 2026-11-08: retired CSS tram/figure art stays absent.
// The same captions use a neutral sheet over the map, within half the screen.
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const TIMING_DIR = process.env.OPENING_TIMING_DIR || '/tmp/piritori-opening-timing';
const testedHead = (() => { try { return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(); } catch { return null; } })();
const timingSources = Object.fromEntries(['web/test/opening.cjs', 'web/js/v3/app.js', 'web/js/v3/sound.js', 'web/js/v3/map-relief.js']
  .map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, file))).digest('hex')]));
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
  page.on('requestfailed', r => { const why = r.failure()?.errorText ?? ''; if (!new URL(r.url()).pathname.endsWith('/hub/shell.js') && why !== 'net::ERR_ABORTED') errors.push(`requestfailed: ${r.url()} (${why})`); });
  return () => {
    let forgive = shellMisses;
    return errors.filter(e => !(forgive > 0 && /Failed to load resource: .*404/.test(e) && forgive--));
  };
}


const ready = page => page.waitForFunction(() => Boolean(window.__ptv3?.data));
const save = page => page.evaluate(() => JSON.stringify(window.__ptv3.state));

// Observation only: preserve native delays, IDs, callback receiver/arguments,
// input events and the existing assertions. No diagnostic animation is added.
function installOpeningTiming({ label }) {
  const events = [], timers = new Map(), modals = new WeakMap(), longTasks = [], raf = [];
  let sequence = 0, rafCount = 0, maxRafLag = 0, maxRafDuration = 0;
  const modalId = node => { if (!modals.has(node)) modals.set(node, ++sequence); return modals.get(node); };
  const identity = node => node instanceof Element ? { tag: node.tagName, id: node.id, className: typeof node.className === 'string' ? node.className : node.className?.baseVal } : null;
  const current = () => [...document.querySelectorAll('#opening')].map(node => ({ generation: modalId(node), ...identity(node) }));
  const record = (type, detail = {}) => { const row = { type, at: performance.now(), visibility: document.visibilityState, focused: document.hasFocus(), ...detail }; events.push(row); return row; };
  record('document-initial', { label, origin: performance.timeOrigin, url: location.href, viewport: { width: innerWidth, height: innerHeight } });
  const timeout = window.setTimeout, clear = window.clearTimeout, requestFrame = window.requestAnimationFrame;
  window.setTimeout = function (callback, delay, ...args) {
    if ((delay !== 9500 && delay !== 6000) || typeof callback !== 'function') return Reflect.apply(timeout, this, [callback, delay, ...args]);
    const created = performance.now(), row = record('timer-created', { delay: Number(delay), due: created + Number(delay), modals: current(), stack: new Error().stack });
    let id;
    id = Reflect.apply(timeout, this, [function (...actualArgs) {
      record('timer-fired', { id, due: row.due, lag: performance.now() - row.due, modals: current() });
      const started = performance.now();
      try { return Reflect.apply(callback, this, actualArgs); }
      finally { record('timer-returned', { id, duration: performance.now() - started, modals: current() }); }
    }, delay, ...args]);
    row.id = id; timers.set(id, row); return id;
  };
  window.clearTimeout = function (id) { if (timers.has(id)) record('timer-cleared', { id }); return Reflect.apply(clear, this, [id]); };
  const append = Element.prototype.append, remove = Element.prototype.remove;
  Element.prototype.append = function (...nodes) {
    const result = Reflect.apply(append, this, nodes);
    for (const node of nodes) if (node?.id === 'opening') record('modal-appended', { generation: modalId(node), modals: current() });
    return result;
  };
  Element.prototype.remove = function () {
    const opening = this.id === 'opening', generation = opening ? modalId(this) : null;
    if (opening) record('modal-remove-before', { generation });
    const result = Reflect.apply(remove, this, []);
    if (opening) record('modal-remove-after', { generation, modals: current() });
    return result;
  };
  const mutations = new MutationObserver(records => {
    for (const row of records) for (const [kind, nodes] of [['added', row.addedNodes], ['removed', row.removedNodes]]) {
      for (const node of nodes) if (node instanceof Element) for (const modal of [node, ...node.querySelectorAll('#opening')].filter(element => element.id === 'opening')) {
        record(`modal-observed-${kind}`, { generation: modalId(modal), connected: modal.isConnected });
      }
    }
  });
  mutations.observe(document, { childList: true, subtree: true });
  for (const type of ['click', 'pointerup', 'keydown', 'keyup']) document.addEventListener(type, event => {
    if (event.isTrusted) record('trusted-input', { event: type, key: event.key, detail: event.detail, target: identity(event.target), activeElement: identity(document.activeElement), modals: current() });
  }, true);
  document.addEventListener('visibilitychange', () => record('visibility-change'));
  window.requestAnimationFrame = function (callback) {
    if (typeof callback !== 'function') return Reflect.apply(requestFrame, this, [callback]);
    const requested = performance.now();
    return Reflect.apply(requestFrame, this, [function (timestamp) {
      const fired = performance.now();
      try { return Reflect.apply(callback, this, [timestamp]); }
      finally {
        const row = { requested, fired, lag: fired - requested, duration: performance.now() - fired, name: callback.name || 'anonymous' };
        rafCount++; maxRafLag = Math.max(maxRafLag, row.lag); maxRafDuration = Math.max(maxRafDuration, row.duration);
        if (raf.length < 100 || row.lag > 100) raf.push(row);
      }
    }]);
  };
  let longTaskObserver, longTaskError = null;
  try {
    longTaskObserver = new PerformanceObserver(list => { for (const entry of list.getEntries()) longTasks.push({ at: entry.startTime, duration: entry.duration, name: entry.name }); });
    longTaskObserver.observe({ type: 'longtask', buffered: true });
  } catch (error) { longTaskError = error.message; }
  window.__openingTiming = { snapshot: () => ({ label, origin: performance.timeOrigin, observedAt: performance.now(), url: location.href, viewport: { width: innerWidth, height: innerHeight }, visibility: document.visibilityState, focused: document.hasFocus(), readyState: document.readyState, modals: current(), activeElement: identity(document.activeElement), events: [...events], longTasks: [...longTasks], longTaskSupported: PerformanceObserver.supportedEntryTypes.includes('longtask'), longTaskError, raf: { count: rafCount, maxRequestToCallbackMs: maxRafLag, maxCallbackDurationMs: maxRafDuration, samples: [...raf] }, navigation: performance.getEntriesByType('navigation').map(entry => entry.toJSON()) }), observers: [mutations, longTaskObserver] };
}
const rendererMetrics = session => session.send('Performance.getMetrics').then(result => ({ receivedWall: Date.now(), values: Object.fromEntries(result.metrics.map(metric => [metric.name, metric.value])) })).catch(error => ({ error: error.message }));
async function boundedObservation(promise) {
  let timer;
  try { return await Promise.race([promise, new Promise(resolve => { timer = setTimeout(() => resolve({ diagnosticError: 'Observation did not return within5000ms' }), 5000); })]); }
  finally { clearTimeout(timer); }
}
async function captureTiming(page, id, metadata, session, beforeMetrics) {
  // Runs after the existing assertion and before the following navigation.
  // A late diagnostic snapshot never changes that assertion's recorded result.
  const row = { schema: 1, caseId: id, capturedWall: Date.now(), testedHead, triggerRevision: process.env.GITHUB_SHA || null, sourceHashes: timingSources, metadata };
  try { row.browser = await boundedObservation(page.evaluate(() => window.__openingTiming.snapshot())); }
  catch (error) { row.browser = { diagnosticError: error.message }; }
  row.snapshotReturnedWall = Date.now();
  if (beforeMetrics) row.rendererBefore = await boundedObservation(beforeMetrics);
  if (session) row.rendererAfter = await boundedObservation(rendererMetrics(session));
  fs.mkdirSync(TIMING_DIR, { recursive: true });
  fs.writeFileSync(path.join(TIMING_DIR, `${id}.json`), JSON.stringify(row, null, 2) + '\n');
  const created = row.browser.events?.filter(event => event.type === 'timer-created') || [], fired = row.browser.events?.filter(event => event.type === 'timer-fired') || [];
  const removed = row.browser.events?.filter(event => event.type === 'modal-remove-after') || [], viewport = row.browser.viewport || metadata.viewport;
  console.log(`  TIMING ${id}: viewport=${viewport?.width}x${viewport?.height} assertion=${metadata.assertionPassed ?? 'n/a'} wait=${metadata.waitWallMs ?? 'n/a'}ms nodesAtAssertion=${metadata.modalCountAtAssertion ?? 'n/a'} nodesNow=${row.browser.modals?.length ?? 'unknown'} timers=${created.length}/${fired.length} removals=${removed.length} maxLag=${fired.length ? Math.max(...fired.map(event => event.lag)).toFixed(1) : 'n/a'}ms artifact=${path.join(TIMING_DIR, `${id}.json`)}`);
}

async function judgeArrivalSheet(page, name) {
  await page.evaluate(() => document.fonts.ready);
  const ui = await page.evaluate(() => {
    const sheet = document.querySelector('.opening-sheet');
    const skip = document.querySelector('.opening-skip');
    const rect = el => { const r = el.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; };
    const panel = rect(sheet), target = rect(skip);
    const captions = [...sheet.querySelectorAll('.opening-lines p')].map(p => {
      const range = document.createRange(); range.selectNodeContents(p);
      return { font: parseFloat(getComputedStyle(p).fontSize), fragments: [...range.getClientRects()].map(r => ({ left: r.left, top: r.top, right: r.right, bottom: r.bottom })) };
    });
    return {
      panel, target, captions, width: innerWidth, height: innerHeight,
      retired: document.querySelectorAll('#opening [class^="op-"], #opening [class*=" op-"]').length,
      map: Boolean(document.querySelector('.city-map')) && getComputedStyle(document.querySelector('.city-map')).visibility === 'visible',
      chromeHidden: [...document.querySelectorAll('.game-shell .topbar, .game-shell .mode-nav, .game-shell .map-side, .game-shell .next-step')].every(el => getComputedStyle(el).visibility === 'hidden'),
      scrolls: sheet.scrollHeight > sheet.clientHeight + 1 || sheet.scrollWidth > sheet.clientWidth + 1,
      skipFont: parseFloat(getComputedStyle(skip).fontSize),
      skipHit: skip.contains(document.elementFromPoint(target.left + target.width / 2, target.top + target.height / 2)),
    };
  });
  const inside = r => r.left >= ui.panel.left && r.right <= ui.panel.right && r.top >= ui.panel.top && r.bottom <= ui.panel.bottom;
  ok(`${name}: the retained map has no retired arrival illustration`, ui.map && ui.retired === 0);
  ok(`${name}: only the arrival sheet uses UI space, within half the screen including its inset`,
    ui.chromeHidden &&
    ui.panel.left >= 0 && ui.panel.right <= ui.width && ui.panel.top >= 0 && ui.panel.bottom <= ui.height
      && ui.panel.width * ui.panel.height <= ui.width * ui.height / 2
      && ui.height - ui.panel.top <= ui.height / 2, JSON.stringify(ui.panel));
  ok(`${name}: all three captions are visible without clipping or scrolling at 12px or more`,
    ui.captions.length === 3 && !ui.scrolls && ui.captions.every(p => p.font >= 12 && p.fragments.length > 0 && p.fragments.every(inside)), JSON.stringify(ui.captions));
  ok(`${name}: Skip is visible, hittable and at least 44px with readable text`,
    ui.target.width >= 44 && ui.target.height >= 44 && ui.skipFont >= 12 && inside(ui.target) && ui.skipHit, JSON.stringify(ui.target));
  if (process.env.OPENING_CAPTURE_DIR) {
    fs.mkdirSync(process.env.OPENING_CAPTURE_DIR, { recursive: true });
    await page.screenshot({ path: path.join(process.env.OPENING_CAPTURE_DIR, `arrival-${name.replace(/\W+/g, '-')}.png`) });
  }
}

server.listen(0, '127.0.0.1', async () => {
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
  let timingPage = null, timingRenderer = null, timingLabel = 'startup', activeTiming = {};
  try {
    for (const [name, vp, touch] of [['desktop', { width: 1280, height: 800 }, false], ['phone', { width: 390, height: 844 }, true]]) {
      const ctx = await browser.newContext({ viewport: vp, hasTouch: touch, isMobile: touch });
      await ctx.addInitScript(installOpeningTiming, { label: name });
      // Preserve the established navigation allowance. The map is Canvas2D;
      // the diagnostic data below does not assume a WebGL teardown cause.
      ctx.setDefaultNavigationTimeout(120000);
      const page = await ctx.newPage();
      const renderer = await ctx.newCDPSession(page); await renderer.send('Performance.enable');
      timingPage = page; timingRenderer = renderer; timingLabel = name; activeTiming = { phase: 'initial-flow', viewport: vp };
      const errors = watchErrors(page);
      await page.goto(`${base}/web/`); await ready(page);
      activeTiming.beginRequestedWall = Date.now();
      await page.locator('#beginButton').click();
      activeTiming.beginClickReturnedWall = Date.now();
      ok(`${name}: Begin opens the arrival`, await page.locator('#opening').isVisible());
      const text = await page.locator('#opening .opening-lines').innerText();
      ok(`${name}: it names the place, the year and what Aatami carries`, /Kallio, 2003/.test(text) && /Piritori/.test(text) && /€160/.test(text), text);
      const s0 = await save(page);
      const sound = await page.evaluate(() => window.__ptv3.sound);
      ok(`${name}: sound woke on Begin, through one master gain`, sound.on && sound.running && sound.gain > 0, JSON.stringify(sound));
      await page.waitForTimeout(1200);
      await judgeArrivalSheet(page, name);
      // Skip by the button on desktop, by a tap anywhere on a phone.
      if (touch) await page.locator('.opening-scene').tap(); else await page.locator('.opening-skip').click();
      await page.waitForSelector('#opening', { state: 'detached', timeout: 3000 }).catch(() => {});
      ok(`${name}: skipping ends it at once`, await page.locator('#opening').count() === 0);
      ok(`${name}: the arrival never changed the save`, await save(page) === s0);
      ok(`${name}: after it, one lit next step`, await page.locator('.next-step .primary').count() === 1);
      ok(`${name}: skipping restores campaign controls`, await page.locator('.topbar').isVisible() && await page.locator('.mode-nav').isVisible() && await page.locator('.next-step').isVisible());
      ok(`${name}: the arrival is noir: rain, the debt due, the ramen sign up Vaasankatu, the man in the fur hat`,
        /rained for a week/.test(text) && /due on day 4/.test(text) && /Tokon Ramen/.test(text) && /fur hat/.test(text), text);
      // The Piritori street seller keeps the gear (GDD §10.2); unlit.
      const shopBtn = page.locator('[data-action="open-shop"]');
      ok(`${name}: the street seller is at Piritori on day one, unlit`, await shopBtn.count() === 1 && /STREET SELLER/.test(await shopBtn.innerText())
        && !(await shopBtn.evaluate(el => el.classList.contains('primary'))));
      ok(`${name}: Tokon Ramen is not at Piritori`, await page.locator('[data-action="open-ramen"]').count() === 0);
      await shopBtn.click();
      ok(`${name}: the street seller sells gear`, await page.locator('.street-layout [data-action="buy-equipment"]').count() > 0);
      await page.locator('[data-action="leave-shop"]').click();
      // Tokon Ramen, Vaasankatu (answer 16): travel there, open on day one.
      await page.locator('[data-anchor-group="vaasankatu"] .map-anchor-hit').click({ force: true });
      await page.locator('[data-action="plan-journey"]').click();
      await page.locator('[data-action="commit-journey"]').click();
      const ramenBtn = page.locator('[data-action="open-ramen"]');
      ok(`${name}: at Vaasankatu, Tokon Ramen is open on day one, unlit`, await ramenBtn.count() === 1 && !(await ramenBtn.evaluate(el => el.classList.contains('primary'))));
      await ramenBtn.click();
      ok(`${name}: inside, Toko Slomo speaks; the counter sells a bowl and early weapons, no gun`, await page.locator('.ramen-layout .toko-line').count() >= 1
        && await page.locator('[data-action="buy-bowl"]').count() === 1 && await page.locator('[data-action="buy-toko-weapon"]').count() >= 3
        && await page.locator('[data-action="buy-toko-weapon"][data-equipment="first-handgun"]').count() === 0);
      const cash0 = await page.evaluate(() => window.__ptv3.state.cash);
      await page.locator('[data-action="buy-bowl"]').click();
      const after = await page.evaluate(() => ({ cash: window.__ptv3.state.cash, heard: window.__ptv3.state.heard }));
      ok(`${name}: a bowl costs €6 and he names a place`, after.cash === cash0 - 6 && Object.keys(after.heard ?? {}).length === 1, JSON.stringify(after));
      ok(`${name}: what he heard is said aloud, with a range`, /paying €/.test(await page.locator('.toko-told').innerText().catch(() => '')));
      ok(`${name}: one bowl a block`, await page.locator('[data-action="buy-bowl"]').isDisabled());
      await page.locator('[data-action="leave-shop"]').click();
      await page.locator('[data-mode-target="ledger"]').click();
      ok(`${name}: the board marks it as heard from Toko`, /Toko, 0 blocks ago/.test(await page.locator('.board-table').innerText()));
      await page.locator('[data-mode-target="route"]').click();
      ok(`${name}: back on the map`, await page.locator('.city-map').count() === 1);
      // A key skips too, and it goes on its own.
      await page.goto(`${base}/web/`); await ready(page);
      const keyTiming = { phase: 'space-skip', viewport: vp, beginRequestedWall: Date.now(), deadlineMs: 3000 }, keyMetricsBefore = rendererMetrics(renderer);
      activeTiming = keyTiming;
      await page.locator('#beginButton').click();
      keyTiming.beginClickReturnedWall = Date.now();
      await page.keyboard.press('Space');
      keyTiming.spaceReturnedWall = Date.now();
      keyTiming.waitStartedWall = Date.now();
      await page.waitForSelector('#opening', { state: 'detached', timeout: 3000 }).catch(error => { keyTiming.waitError = error.message; });
      keyTiming.waitEndedWall = Date.now(); keyTiming.waitWallMs = keyTiming.waitEndedWall - keyTiming.waitStartedWall;
      const beforeKeyAssertion = failed;
      keyTiming.modalCountAtAssertion = await page.locator('#opening').count();
      ok(`${name}: a key skips it`, keyTiming.modalCountAtAssertion === 0);
      keyTiming.assertionPassed = failed === beforeKeyAssertion; keyTiming.assertionReturnedWall = Date.now();
      await captureTiming(page, `${name}-space-skip`, keyTiming, renderer, keyMetricsBefore);
      await page.goto(`${base}/web/`); await ready(page);
      const autoTiming = { phase: 'auto', viewport: vp, beginRequestedWall: Date.now(), deadlineMs: 12000 }, autoMetricsBefore = rendererMetrics(renderer);
      activeTiming = autoTiming;
      await page.locator('#beginButton').click();
      autoTiming.beginClickReturnedWall = Date.now();
      autoTiming.waitStartedWall = Date.now();
      await page.waitForSelector('#opening', { state: 'detached', timeout: 12000 }).catch(error => { autoTiming.waitError = error.message; });
      autoTiming.waitEndedWall = Date.now(); autoTiming.waitWallMs = autoTiming.waitEndedWall - autoTiming.waitStartedWall;
      const beforeAutoAssertion = failed;
      autoTiming.modalCountAtAssertion = await page.locator('#opening').count();
      ok(`${name}: left alone, it ends by itself`, autoTiming.modalCountAtAssertion === 0);
      autoTiming.assertionPassed = failed === beforeAutoAssertion; autoTiming.assertionReturnedWall = Date.now();
      await captureTiming(page, `${name}-auto`, autoTiming, renderer, autoMetricsBefore);
      // Resume and ?skip never replay it.
      activeTiming = { phase: 'after-auto-flow', viewport: vp };
      await page.goto(`${base}/web/`); await ready(page);
      await page.locator('#resumeButton').click();
      ok(`${name}: Resume goes straight to the city`, await page.locator('#opening').count() === 0);
      await page.goto(`${base}/web/?skip`); await ready(page);
      await page.locator('#beginButton').click();
      ok(`${name}: ?skip goes straight to the city`, await page.locator('#opening').count() === 0);
      // The pause menu's SOUND switch.
      await page.locator('#pauseButton').click();
      const sw = page.locator('[data-pause="sound"]');
      ok(`${name}: the pause menu has a SOUND switch, ON`, /ON/.test(await sw.innerText()));
      await sw.click();
      const off = await page.evaluate(() => window.__ptv3.sound);
      ok(`${name}: SOUND OFF stops every voice`, !off.on && !off.running, JSON.stringify(off));
      ok(`${name}: and says so`, /OFF/.test(await page.locator('[data-pause="sound"]').innerText()));
      await page.goto(`${base}/web/?skip`); await ready(page);
      await page.locator('#resumeButton').click();
      const kept = await page.evaluate(() => window.__ptv3.sound);
      ok(`${name}: the switch is remembered`, !kept.on && !kept.running, JSON.stringify(kept));
      ok(`${name}: no page errors`, errors().length === 0, errors().join(' | '));
      await ctx.close();
    }
    // The shorter landscape screen must retain the full captions and Skip too.
    const landscape = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
    await landscape.addInitScript(installOpeningTiming, { label: 'landscape phone' });
    landscape.setDefaultNavigationTimeout(120000);
    const landscapePage = await landscape.newPage();
    timingPage = landscapePage; timingRenderer = null; timingLabel = 'landscape'; activeTiming = { phase: 'native-skip', viewport: { width: 844, height: 390 } };
    await landscapePage.goto(`${base}/web/`); await ready(landscapePage);
    await landscapePage.locator('#beginButton').click();
    const landscapeSave = await save(landscapePage);
    await judgeArrivalSheet(landscapePage, 'landscape phone');
    await landscapePage.locator('.opening-scene').tap();
    await landscapePage.waitForSelector('#opening', { state: 'detached', timeout: 3000 });
    ok('landscape phone: a native map tap skips without changing the save', await save(landscapePage) === landscapeSave);
    ok('landscape phone: skipping restores campaign controls', await landscapePage.locator('.topbar').isVisible() && await landscapePage.locator('.mode-nav').isVisible() && await landscapePage.locator('.next-step').isVisible());
    await captureTiming(landscapePage, 'landscape-native-skip', { observation: 'after unchanged native tap/save/restoration assertions' });
    await landscape.close();
    // Reduced motion: one still frame, the same lines, no movement.
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    await ctx.addInitScript(installOpeningTiming, { label: 'reduced motion' });
    ctx.setDefaultNavigationTimeout(120000);
    const page = await ctx.newPage();
    timingPage = page; timingRenderer = null; timingLabel = 'reduced-motion'; activeTiming = { phase: 'still', viewport: { width: 390, height: 844 } };
    await page.goto(`${base}/web/`); await ready(page);
    await page.locator('#beginButton').click();
    const still = await page.evaluate(() => [...document.querySelectorAll('#opening *')].every(el => getComputedStyle(el).animationName === 'none'));
    ok('reduced motion: the arrival is a still frame', still && await page.locator('.opening.still').count() === 1);
    ok('reduced motion: the lines are all there at once', await page.locator('.opening-lines p').evaluateAll(ps => ps.every(p => getComputedStyle(p).opacity === '1')));
    await captureTiming(page, 'reduced-motion-still', { observation: 'after unchanged still-frame assertions, before the6000ms deadline' });
    await ctx.close();
  } catch (error) {
    ok('unhandled opening gate error', false, error.stack || error.message);
    if (timingPage && !timingPage.isClosed()) await captureTiming(timingPage, `${timingLabel}-unhandled`, { ...activeTiming, error: error.stack || error.message }, timingRenderer);
  } finally {
    await browser.close(); server.close();
    console.log(`\n  ${passed} passed, ${failed} failed`);
    process.exit(failed ? 1 : 0);
  }
});
