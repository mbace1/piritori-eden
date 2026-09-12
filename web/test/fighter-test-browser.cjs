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

async function runViewport(browser, base, label, viewport) {
  const page = await browser.newPage({ viewport });
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

  const expectedGlbs = [
    'f01-heavy-bruiser-v01.glb',
    'f01-heavy-bruiser-clips-v01.glb',
    'f02-wiry-skirmisher-v01.glb',
    'f02-wiry-skirmisher-clips-v01.glb',
  ];
  ok(`${label}: all four GLBs return 200`, expectedGlbs.every(name => glbs.get(name) === 200), JSON.stringify(Object.fromEntries(glbs)));

  const initial = await page.evaluate(() => window.__fighterTest.state());
  ok(`${label}: URL selects independent starting motions`, initial.f01 === 'alert-idle' && initial.f02 === 'casual-walk');

  const f01Before = await page.evaluate(() => window.__fighterTest.sampleBones('f01'));
  await page.locator('[data-pilot="f01"][data-motion="casual-walk"]').click();
  await page.waitForTimeout(350);
  const f01After = await page.evaluate(() => window.__fighterTest.sampleBones('f01'));
  const afterF01 = await page.evaluate(() => window.__fighterTest.state());
  ok(`${label}: F01 walk moves real bones`, changed(f01Before, f01After));
  ok(`${label}: F01 control leaves F02 unchanged`, afterF01.f01 === 'casual-walk' && afterF01.f02 === 'casual-walk');

  const f02Before = await page.evaluate(() => window.__fighterTest.sampleBones('f02'));
  await page.locator('[data-pilot="f02"][data-motion="alert-idle"]').click();
  await page.waitForTimeout(350);
  const f02After = await page.evaluate(() => window.__fighterTest.sampleBones('f02'));
  const afterF02 = await page.evaluate(() => window.__fighterTest.state());
  ok(`${label}: F02 alert moves real bones`, changed(f02Before, f02After));
  ok(`${label}: F02 control leaves F01 unchanged`, afterF02.f01 === 'casual-walk' && afterF02.f02 === 'alert-idle');

  const view = await page.evaluate(() => window.__fighterTest.view());
  ok(`${label}: both fighters are fully visible`, fullyVisible(view.f01) && fullyVisible(view.f02), JSON.stringify(view));
  ok(`${label}: F01 and F02 keep separate screen slots`, separatelyFramed(view.f01, view.f02), JSON.stringify(view));

  const appearance = await page.evaluate(() => ({
    f01: window.__fighterTest.appearance('f01'),
    f02: window.__fighterTest.appearance('f02'),
  }));
  const neutralEmission = Object.values(appearance).flat().every(material => (
    material.emissive === '000000'
    && material.emissiveIntensity === 0
    && material.hasEmissiveMap === false
  ));
  ok(`${label}: Meshy white-skin emissive export is neutralised`, neutralEmission, JSON.stringify(appearance));

  await page.locator('.motion-controls').scrollIntoViewIfNeeded();
  const heights = await page.locator('.motion-controls button').evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().height));
  ok(`${label}: every touch target is at least 48px`, heights.every(height => height >= 48), heights.join(', '));

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

server.listen(0, '127.0.0.1', async () => {
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  try {
    await runViewport(browser, base, 'desktop', { width: 1280, height: 820 });
    await runViewport(browser, base, 'mobile', { width: 390, height: 844 });
    await runViewport(browser, base, 'pixel-10-pro', { width: 411, height: 923 });
  } finally {
    await browser.close();
    server.close();
  }
  console.log(`\nFIGHTER BROWSER: ${passed} passed, ${failed} failed`);
  process.exitCode = failed ? 1 : 0;
});
