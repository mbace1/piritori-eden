// Fixed-9:16 Toko composition checks and optional actual-browser recording.
const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const assert = require('node:assert/strict'), { spawnSync } = require('node:child_process');
const { measureFrame, fixedFrameAssertions, settleBudget, ensureChoices, inside, intersects, frames, storageGuard, watch, sourceHashes, SENTINELS } = require('./browser.cjs');
const ROOT = path.resolve(__dirname, '../../..');
const OUT = process.env.RESET_ENSEMBLE_DIR || path.join(__dirname, 'evidence');
const KEY = 'piritori:restart:scene-club:v1';
const mime = { '.html':'text/html', '.js':'text/javascript', '.mjs':'text/javascript', '.json':'application/json', '.css':'text/css', '.webp':'image/webp', '.png':'image/png' };
const server = http.createServer((req, res) => {
  let file = path.resolve(ROOT, '.' + new URL(req.url, 'http://local').pathname);
  if (!file.startsWith(ROOT + path.sep)) { res.writeHead(403).end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  fs.readFile(file, (error, bytes) => { if (error) { res.writeHead(404).end(); return; } res.writeHead(200, { 'content-type': mime[path.extname(file)] || 'application/octet-stream' }).end(bytes); });
});
const content = JSON.parse(fs.readFileSync(path.join(ROOT, 'content/era1-slice-v1.json')));
const source = content.encounters.find(item => item.id === 'enc-toko-quiet-voice');
const lines = source.opening.match(/[^.!?]+[.!?]+|[^.!?]+$/g).map(line => line.trim());
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'art/v3/manifest.json')));
const allowed = new Set(['scene-toko-noodles-empty-v01', 'scene-toko-rig-v01', 'cutin-aatami-front-rig-v01', 'cutin-aatami-rig-v01'].flatMap(id => {
  const asset = manifest.assets.find(item => item.id === id); return asset.file ? ['art/v3/' + asset.file] : asset.members.map(member => 'art/v3/' + member.file);
}));
const report = { schema: 3, base: '804613a3d4eaa1e5180dfb0ef2cb88952d15bd97', stageContract: 'fixed maximum-fit 9:16; combined UI bands and union area at most 50%; native 44px targets and 12px text', physicalDeviceAcceptance: false, staticMouths: true, sourceHashes: sourceHashes(), cases: [], edgeCases: [], videos: [], checks: 0, edgeChecks: 0, failures: [] };
function check(pass, label, result) { if (result.edge) report.edgeChecks += 1; else report.checks += 1; if (!pass) { result.failures.push(label); report.failures.push(result.id + ': ' + label); } }
async function ready(page, view) { await page.waitForFunction(expected => window.__sceneReset?.ready && (!expected || window.__sceneReset.view === expected), view); await settleBudget(page); }
async function auditStorage(page, result) {
  const value = await page.evaluate(() => ({ denied: window.__sceneStorageAudit.denied, sentinels: window.__sceneStorageAudit.sentinels() }));
  check(value.denied.length === 0, 'no non-candidate save access', result);
  check(JSON.stringify(value.sentinels) === JSON.stringify(SENTINELS), 'campaign, crew and outing receipts unchanged', result);
}
async function geometry(page, result, half = false) {
  const value = await measureFrame(page);
  for (const item of fixedFrameAssertions(value, half)) check(item.pass, item.label, result);
  for (const who of ['aatami', 'toko']) {
    const actor = value.bounds[who];
    check(actor?.ready && inside(actor.head, value.world), who + ' source head inside 9:16 stage', result);
    check(!intersects(actor?.head, value.decisionOverlay), who + ' clear of whole bottom encounter overlay', result);
    for (const hud of value.overlays.filter(item => item.painted && /header/.test(item.name))) check(!intersects(actor?.head, hud.rect), who + ' clear of top HUD', result);
  }
  check(!intersects(value.bounds.aatami.head, value.bounds.toko.head), 'paired heads do not cover each other', result);
  check(value.rigs.length === 2 && value.rigs.every(actor => actor.painted), 'foreground Aatami and composed Toko room painted visibly', result);
  check(value.rigs.some(actor => actor.id === `cutin-aatami${result.pose === 'front' ? '-front' : ''}-rig-v01`), 'retained young Aatami pose identity', result);
  check(value.bounds.toko.source.id === 'scene-toko-rig-v01' && value.bounds.toko.source.crop.join(',') === '0,0,1536,864' && value.bounds.toko.camera.fit === 'cover', 'retained Toko uses one full room/counter camera', result);
  check(JSON.stringify(value.bounds.toko.camera.focus) === JSON.stringify([.36, .5]), 'Toko room, body and counter retain constant source camera focus', result);
  return value;
}
async function motion(page, result) {
  const output = {}, reduced = result.reducedMotion === 'reduce', selector = 'canvas.actor,.room-composite canvas';
  for (const [clip, seconds] of [['idle', 1], ['blink', .22], ['talk', .4], ['nod', .5], ['shake', .6]]) {
    await page.evaluate(clip => { for (const who of ['aatami', 'toko']) window.__sceneReset.actors.debug.hold(who, clip, 0); }, clip);
    const first = await frames(page, selector);
    await page.evaluate(({ clip, seconds }) => { for (const who of ['aatami', 'toko']) window.__sceneReset.actors.debug.hold(who, clip, seconds); }, { clip, seconds });
    const last = await frames(page, selector);
    for (const who of ['aatami', 'toko']) {
      check(first[who]?.opaque > 1000 && last[who]?.opaque > 1000, who + ' nonblank actual canvas RGBA', result);
      check(reduced ? first[who].hash === last[who].hash : first[who].hash !== last[who].hash, who + ' ' + clip + (reduced ? ' stays still under reduce' : ' changes actual pixels'), result);
    }
    const held = await geometry(page, result);
    output[clip] = { first, last, heads: Object.fromEntries(Object.entries(held.bounds).map(([who, actor]) => [who, actor.head])) };
  }
  await page.evaluate(() => window.__sceneReset.actors.debug.resume());
  const first = await frames(page, selector); await page.waitForTimeout(650); const last = await frames(page, selector);
  for (const who of ['aatami', 'toko']) check(reduced ? first[who].hash === last[who].hash : first[who].hash !== last[who].hash, who + (reduced ? ' remains still in real time' : ' advances real animation frames'), result);
  output.realTime = { first, last };
  await page.evaluate(() => window.__sceneReset.actors.debug.rest());
  return output;
}
async function capture(page, name, result) {
  await page.screenshot({ path: path.join(OUT, name + '-viewport.png') });
  await page.locator('#world').screenshot({ path: path.join(OUT, name + '-stage.png') });
  result.captures.push(name + '-viewport.png', name + '-stage.png');
}
(async () => {
  fs.mkdirSync(OUT, { recursive: true }); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}/art-src/restarts/scene-club/`;
  const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_PATH ? { executablePath: process.env.BROWSER_PATH } : {}) });
  try {
    for (const [name, width, height] of [['phone', 390, 844], ['landscape', 844, 390], ['desktop', 1280, 800]]) for (const pose of ['front', 'side']) for (const reducedMotion of ['reduce', 'no-preference']) {
      const result = { id: `${name}-${pose}-${reducedMotion}`, name, viewport: { width, height }, pose, reducedMotion, captures: [], failures: [] };
      report.cases.push(result);
      const context = await browser.newContext({ viewport: { width, height }, reducedMotion }); await storageGuard(context);
      const page = await context.newPage(), finishResources = watch(page, new URL(base), result, allowed);
      try {
        await page.goto(base + `?pair=toko&pose=${pose}&start=scene`); await ready(page, 'study');
        if (reducedMotion === 'no-preference') await page.waitForTimeout(350);
        const before = await page.evaluate(key => localStorage.getItem(key), KEY);
        result.motionPixels = await motion(page, result);
        result.native = await geometry(page, result);
        check(await page.locator('#speech p:last-child').innerText() === lines[0], 'first authored source line', result);
        await page.locator('#next-line').click();
        check(await page.locator('#speech p:last-child').innerText() === lines[1], 'second authored source line without invented story', result);
        result.secondLine = await geometry(page, result);
        check(JSON.stringify(result.native.bounds.toko.camera) === JSON.stringify(result.secondLine.bounds.toko.camera), 'dialogue change does not move Toko room/counter camera', result);
        await page.locator('#next-line').click();
        if (reducedMotion === 'reduce') await capture(page, `toko-${pose}-${name}`, result);
        await auditStorage(page, result);
        await page.goto(base + `?pair=toko&pose=${pose}&start=scene&scale=0.5`); await ready(page, 'study');
        if (reducedMotion === 'no-preference') await page.waitForTimeout(350);
        await page.evaluate(() => window.__sceneReset.actors.debug.rest());
        result.half = await geometry(page, result, true);
        if (reducedMotion === 'reduce') await capture(page, `toko-${pose}-${name}-half`, result);
        check(await page.evaluate(key => localStorage.getItem(key), KEY) === before, 'study and half view apply no campaign choice effects', result);
        await auditStorage(page, result);
        check(result.browserErrors.length === 0, 'zero page/console/request/HTTP errors or retired resources', result);
      } catch (error) { check(false, error.stack || error.message, result); }
      finally { finishResources(); await context.close(); }
      console.log(`${result.failures.length ? 'FAIL' : 'PASS'} Toko ${result.id} (${result.failures.length} failures)`);
    }
    for (const [width, height, font] of [[271, 482], [844, 390, 'DejaVu Sans'], [271, 482, 'DejaVu Sans'], [844, 390, 'monospace'], [271, 482, 'monospace']]) for (const pose of ['front', 'side']) {
      const result = { id: `edge-${width}x${height}-${pose}${font ? '-'+font.replaceAll(' ','-') : ''}`, edge: true, viewport: { width, height }, pose, font: font || 'system-ui', reducedMotion: 'reduce', captures: [], failures: [] };
      report.edgeCases.push(result);
      const context = await browser.newContext({ viewport: result.viewport, reducedMotion: 'reduce' }); await storageGuard(context);
      const page = await context.newPage(), finishResources = watch(page, new URL(base), result, allowed);
      try {
        await page.goto(base + `?pair=toko&pose=${pose}&start=scene`); await ready(page, 'study');
        if (font) await page.addStyleTag({ content: `:root { font-family: '${font}' }` });
        await page.evaluate(() => window.__sceneReset.actors.debug.rest()); result.native = await geometry(page, result);
        await page.locator('#next-line').click(); result.secondLine = await geometry(page, result);
        await auditStorage(page, result); await capture(page, 'toko-' + result.id, result);
        check(result.browserErrors.length === 0, 'zero edge-view resource/browser errors', result);
      } catch (error) { check(false, error.stack || error.message, result); }
      finally { finishResources(); await context.close(); }
      console.log(`${result.failures.length ? 'FAIL' : 'PASS'} Toko ${result.id} (${result.failures.length} failures)`);
    }
    if (!report.failures.length && process.argv.includes('--record')) for (const [name, width, height] of [['phone', 390, 844], ['landscape', 844, 390]]) {
      const context = await browser.newContext({ viewport: { width, height }, recordVideo: { dir: OUT, size: { width, height } } }); await storageGuard(context);
      const page = await context.newPage();
      await page.goto(base); await ready(page, 'arrival'); await page.waitForTimeout(900);
      const stage = await page.locator('#world').boundingBox();
      await page.locator('#enter').click(); await ready(page, 'scene'); await page.waitForTimeout(3300);
      const respond = page.locator('#respond');
      if (await respond.count() && await respond.isVisible()) { await respond.click(); await page.waitForFunction(() => [...document.querySelectorAll('[data-choice]')].every(button => !button.disabled)); await settleBudget(page); await page.waitForTimeout(1300); }
      await page.locator('[data-choice="ask-envelope"]').click(); await page.waitForTimeout(2200);
      await page.locator('#return').click(); await ready(page, 'map'); await page.waitForTimeout(1300);
      await page.goto(base + '?pair=toko&pose=front&start=scene'); await ready(page, 'study'); await page.waitForTimeout(2300);
      await page.locator('#next-line').click(); await page.waitForTimeout(1900);
      const video = page.video(); await context.close();
      const webm = path.join(OUT, `visual-restart-${name}.webm`); await video.saveAs(webm); const raw = await video.path(); if (raw !== webm) fs.unlinkSync(raw);
      // Native WebM proves the letterboxed viewport; portrait MP4 fits the actual
      // browser stage without stretching it or reconstructing any artwork.
      const cropWidth = Math.ceil(stage.width / 2) * 2, cropHeight = Math.ceil(stage.height / 2) * 2;
      const filter = `crop=${cropWidth}:${cropHeight}:${Math.floor(stage.x)}:${Math.floor(stage.y)}:exact=1,scale=720:1280:force_original_aspect_ratio=decrease:force_divisible_by=2,pad=720:1280:(ow-iw)/2:(oh-ih)/2`;
      const mp4 = webm.replace(/\.webm$/, '.mp4');
      const encoded = spawnSync('ffmpeg', ['-y', '-i', webm, '-vf', filter, '-an', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '24', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', mp4], { encoding: 'utf8' });
      assert.equal(encoded.status, 0, encoded.stderr);
      report.videos.push({ viewport: { width, height }, stage, mp4Size: { width: 720, height: 1280 }, webm: path.basename(webm), mp4: path.basename(mp4), source: 'Actual browser recording; WebM retains viewport letterbox, MP4 fits 9:16 stage; static source mouths' });
    }
  } finally {
    await browser.close(); await new Promise(resolve => server.close(resolve));
    report.finalSourceHashes = sourceHashes();
    if (JSON.stringify(report.sourceHashes) !== JSON.stringify(report.finalSourceHashes)) report.failures.push('Candidate source changed during ensemble run; capture stable inputs again.');
    report.passed = report.failures.length === 0;
    fs.writeFileSync(path.join(OUT, 'ensemble-results.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(`${report.passed ? 'PASS' : 'FAIL'} Toko fixed-9:16 ensemble: ${report.cases.length} main + ${report.edgeCases.length} edge contexts, ${report.checks} main + ${report.edgeChecks} edge checks, ${report.failures.length} failures`);
    if (!report.passed) { console.error(report.failures.slice(0, 16).join('\n')); process.exitCode = 1; }
  }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
