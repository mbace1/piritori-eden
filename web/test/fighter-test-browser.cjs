// Real-browser gate for the provisional F01/F02 locomotion page.
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const SHOTS = path.join(ROOT, '.private', 'fighter-test-browser');
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.glb': 'model/gltf-binary',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

const server = http.createServer((req, res) => {
  const requestPath = decodeURIComponent(req.url.split('?')[0]);
  let file = path.resolve(ROOT, `.${requestPath}`);
  if (!file.startsWith(`${ROOT}${path.sep}`) && file !== ROOT) {
    res.writeHead(403); res.end('forbidden'); return;
  }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file)) { res.writeHead(404); res.end('missing'); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

let passed = 0;
let failed = 0;
function ok(name, condition, detail = '') {
  if (condition) { passed += 1; console.log(`  ok   ${name}`); return; }
  failed += 1;
  console.log(`  FAIL ${name}${detail ? ` -> ${detail}` : ''}`);
}

function changed(before, after) {
  return JSON.stringify(before) !== JSON.stringify(after);
}

function fullyVisible(bounds) {
  return bounds
    && bounds.width >= 60
    && bounds.height >= 120
    && bounds.left >= -1
    && bounds.top >= -1
    && bounds.right <= bounds.canvasWidth + 1
    && bounds.bottom <= bounds.canvasHeight + 1;
}

function separatelyFramed(left, right) {
  const overlap = Math.max(0, Math.min(left.right, right.right) - Math.max(left.left, right.left));
  return (left.left + left.right) * 0.5 < (right.left + right.right) * 0.5
    && overlap <= Math.min(left.width, right.width) * 0.08;
}

function boundsChanged(before, after) {
  return ['left', 'right', 'top', 'bottom']
    .some(key => Math.abs(before[key] - after[key]) > 0.25);
}

function stableSlotsAndScale(view) {
  return Math.abs(view.f01.holderX + 0.82) < 0.001
    && Math.abs(view.f02.holderX - 0.82) < 0.001
    && [view.f01, view.f02].every(bounds => (
      bounds.worldWidth > 0.1
      && bounds.worldWidth < 3
      && bounds.worldHeight > 1
      && bounds.worldHeight < 3
    ));
}

async function swipeUpFromCanvas(page) {
  await page.evaluate(() => scrollTo(0, 0));
  await page.waitForTimeout(100);
  const box = await page.locator('#fighterCanvas').boundingBox();
  if (!box) return 0;
  const viewport = page.viewportSize();
  const x = Math.round(box.x + box.width * 0.5);
  const startY = Math.round(Math.min(box.y + box.height * 0.7, viewport.height - 32));
  const endY = Math.max(24, startY - 220);
  const session = await page.context().newCDPSession(page);
  try {
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x, y: startY, radiusX: 2, radiusY: 2, force: 1 }],
    });
    for (let step = 1; step <= 6; step += 1) {
      const y = Math.round(startY + (endY - startY) * step / 6);
      await session.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x, y, radiusX: 2, radiusY: 2, force: 1 }],
      });
      await page.waitForTimeout(18);
    }
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(180);
    return page.evaluate(() => scrollY);
  } finally {
    await session.detach();
  }
}

async function runViewport(browser, base, label, viewport, touch = false) {
  const page = await browser.newPage({ viewport, hasTouch: touch, isMobile: touch });
  const problems = [];
  const glbs = new Map();
  let expectedHub404 = 0;
  page.on('response', response => {
    const pathname = new URL(response.url()).pathname;
    if (pathname.endsWith('.glb')) glbs.set(path.basename(pathname), response.status());
    if (response.status() === 404 && pathname.endsWith('/hub/shell.js')) expectedHub404 += 1;
  });
  page.on('pageerror', error => problems.push(`pageerror: ${error.message}`));
  page.on('console', message => {
    if (message.type() === 'warning' && /PropertyBinding|No target node/i.test(message.text())) {
      problems.push(`binding: ${message.text()}`);
    }
    if (message.type() === 'error') problems.push(`console: ${message.text()}`);
  });

  await page.goto(`${base}/web/fighter-test.html?f01=alert-idle&f02=casual-walk`);
  await page.waitForFunction(() => document.body.dataset.ready === 'true' || document.body.dataset.ready === 'false', null, { timeout: 30000 });
  const ready = await page.getAttribute('body', 'data-ready');
  ok(`${label}: importer reaches ready`, ready === 'true', await page.locator('#loadStatus').textContent());
  if (ready !== 'true') { await page.close(); return; }

  if (touch) {
    const touchAction = await page.locator('#fighterCanvas').evaluate(node => getComputedStyle(node).touchAction);
    ok(`${label}: canvas permits vertical touch scrolling`, touchAction.includes('pan-y'), touchAction);
  }

  const expectedGlbs = [
    'f01-heavy-bruiser-v02.glb',
    'f01-heavy-bruiser-clips-v02.glb',
    'f02-wiry-skirmisher-v02.glb',
    'f02-wiry-skirmisher-clips-v02.glb',
  ];
  ok(`${label}: all four GLBs return 200`, expectedGlbs.every(name => glbs.get(name) === 200), JSON.stringify(Object.fromEntries(glbs)));

  const initial = await page.evaluate(() => window.__fighterTest.state());
  ok(`${label}: URL selects independent starting motions`, initial.f01 === 'alert-idle' && initial.f02 === 'casual-walk');

  const f01Before = await page.evaluate(() => window.__fighterTest.sampleBones('f01'));
  const f01Walk = page.locator('[data-pilot="f01"][data-motion="casual-walk"]');
  if (touch) await f01Walk.tap(); else await f01Walk.click();
  await page.waitForTimeout(350);
  const f01After = await page.evaluate(() => window.__fighterTest.sampleBones('f01'));
  const afterF01 = await page.evaluate(() => window.__fighterTest.state());
  ok(`${label}: F01 walk moves real bones`, changed(f01Before, f01After));
  ok(`${label}: F01 control leaves F02 unchanged`, afterF01.f01 === 'casual-walk' && afterF01.f02 === 'casual-walk');

  const f02Before = await page.evaluate(() => window.__fighterTest.sampleBones('f02'));
  const f02Alert = page.locator('[data-pilot="f02"][data-motion="alert-idle"]');
  if (touch) await f02Alert.tap(); else await f02Alert.click();
  await page.waitForTimeout(350);
  const f02After = await page.evaluate(() => window.__fighterTest.sampleBones('f02'));
  const afterF02 = await page.evaluate(() => window.__fighterTest.state());
  ok(`${label}: F02 alert moves real bones`, changed(f02Before, f02After));
  ok(`${label}: F02 control leaves F01 unchanged`, afterF02.f01 === 'casual-walk' && afterF02.f02 === 'alert-idle');

  const views = [await page.evaluate(() => window.__fighterTest.view())];
  const durationMs = Math.ceil(await page.evaluate(() => window.__fighterTest.activeDuration()) * 1000);
  const sampleEveryMs = Math.max(80, Math.ceil(durationMs / 14));
  for (let elapsed = 0; elapsed < durationMs; elapsed += sampleEveryMs) {
    await page.waitForTimeout(sampleEveryMs);
    views.push(await page.evaluate(() => window.__fighterTest.view()));
  }
  const allVisible = views.every(view => fullyVisible(view.f01) && fullyVisible(view.f02));
  const allSeparated = views.every(view => separatelyFramed(view.f01, view.f02));
  const stableSlots = views.every(stableSlotsAndScale);
  const liveBounds = views.slice(1).some(view => (
    boundsChanged(views[0].f01, view.f01) || boundsChanged(views[0].f02, view.f02)
  ));
  ok(`${label}: skinned bounds change during full playback`, liveBounds, JSON.stringify(views));
  ok(`${label}: both full animations stay visible`, allVisible, JSON.stringify(views));
  ok(`${label}: F01 and F02 keep separate screen slots`, allSeparated, JSON.stringify(views));
  ok(`${label}: holder slots and animated world scale stay stable`, stableSlots, JSON.stringify(views));

  const appearance = await page.evaluate(() => ({
    f01: window.__fighterTest.appearance('f01'),
    f02: window.__fighterTest.appearance('f02'),
  }));
  const neutralEmission = Object.values(appearance).flat().every(material => (
    material.emissive === '000000'
    && material.emissiveIntensity === 0
    && material.hasEmissiveMap === false
  ));
  ok(`${label}: v02 materials stay matte and non-emissive`, neutralEmission, JSON.stringify(appearance));

  await page.locator('.motion-controls').scrollIntoViewIfNeeded();
  const heights = await page.locator('.motion-controls button').evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().height));
  ok(`${label}: every touch target is at least 48px`, heights.every(height => height >= 48), heights.join(', '));

  if (touch && label === 'pixel-10-pro') {
    const scrollY = await swipeUpFromCanvas(page);
    ok(`${label}: a swipe starting on the canvas scrolls the page`, scrollY > 20, String(scrollY));
  }

  fs.mkdirSync(SHOTS, { recursive: true });
  const screenshot = path.join(SHOTS, `fighter-test-${label}.png`);
  await page.screenshot({ path: screenshot, fullPage: true });
  ok(`${label}: screenshot written`, fs.existsSync(screenshot), screenshot);

  const generic404 = /^console: Failed to load resource: the server responded with a status of 404/;
  const unexpected = [];
  for (const problem of problems) {
    if (expectedHub404 > 0 && generic404.test(problem)) { expectedHub404 -= 1; continue; }
    unexpected.push(problem);
  }
  ok(`${label}: no importer or binding errors`, unexpected.length === 0, unexpected.join(' | '));
  await page.close();
}

async function runReducedMotion(browser, base) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`${base}/web/fighter-test.html?f01=alert-idle&f02=casual-walk`);
  await page.waitForFunction(() => document.body.dataset.ready === 'true', null, { timeout: 30000 });
  await page.waitForTimeout(120);

  const initial = await page.evaluate(() => window.__fighterTest.state());
  ok('reduced-motion: preference selects static playback', initial.reducedMotion && !initial.rendering, JSON.stringify(initial));

  await page.locator('[data-pilot="f01"][data-motion="casual-walk"]').tap();
  const before = await page.evaluate(() => window.__fighterTest.sampleBones('f01'));
  await page.waitForTimeout(400);
  const after = await page.evaluate(() => window.__fighterTest.sampleBones('f01'));
  const selected = await page.evaluate(() => window.__fighterTest.state());
  ok('reduced-motion: touch can select a static clip frame', selected.f01 === 'casual-walk');
  ok('reduced-motion: bones remain still', !changed(before, after));

  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.waitForTimeout(400);
  const resumed = await page.evaluate(() => window.__fighterTest.sampleBones('f01'));
  const resumedState = await page.evaluate(() => window.__fighterTest.state());
  ok('reduced-motion: disabling preference resumes playback',
    !resumedState.reducedMotion && changed(after, resumed), JSON.stringify(resumedState));
  await page.close();
}

async function runLifecycle(browser, base) {
  const page = await browser.newPage({ viewport: { width: 800, height: 700 } });
  await page.goto(`${base}/web/fighter-test.html?f01=casual-walk&f02=alert-idle`);
  await page.waitForFunction(() => document.body.dataset.ready === 'true', null, { timeout: 30000 });

  for (let cycle = 1; cycle <= 2; cycle += 1) {
    await page.evaluate(() => dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })));
    const suspended = await page.evaluate(() => window.__fighterTest.state());
    const before = await page.evaluate(() => window.__fighterTest.sampleBones('f01'));
    await page.waitForTimeout(250);
    const after = await page.evaluate(() => window.__fighterTest.sampleBones('f01'));
    ok(`BFCache cycle ${cycle}: persisted pagehide suspends without disposal`,
      suspended.suspended && !suspended.destroyed && !suspended.rendering, JSON.stringify(suspended));
    ok(`BFCache cycle ${cycle}: animation stays still while suspended`, !changed(before, after));

    await page.evaluate(() => dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
    await page.waitForTimeout(350);
    const resumed = await page.evaluate(() => window.__fighterTest.sampleBones('f01'));
    const resumedState = await page.evaluate(() => window.__fighterTest.state());
    ok(`BFCache cycle ${cycle}: persisted pageshow resumes rendering`,
      !resumedState.suspended && !resumedState.destroyed && resumedState.rendering, JSON.stringify(resumedState));
    ok(`BFCache cycle ${cycle}: animation resumes after restore`, changed(after, resumed));
  }
  await page.close();
}

server.listen(0, '127.0.0.1', async () => {
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  try {
    await runViewport(browser, base, 'desktop', { width: 1280, height: 820 });
    await runViewport(browser, base, 'mobile', { width: 390, height: 844 }, true);
    await runViewport(browser, base, 'pixel-10-pro', { width: 411, height: 923 }, true);
    await runViewport(browser, base, 'ipad-m2', { width: 1024, height: 1366 }, true);
    await runReducedMotion(browser, base);
    await runLifecycle(browser, base);
  } finally {
    await browser.close();
    server.close();
  }
  console.log(`\nFIGHTER BROWSER: ${passed} passed, ${failed} failed`);
  process.exitCode = failed ? 1 : 0;
});
