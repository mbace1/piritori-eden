// Actual-browser evidence for the fresh Scene Club candidate, not a runtime
// promotion. Serve this checkout locally, or pass its full RESET_TEST_URL.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const { pathToFileURL } = require('node:url');
const ROOT = path.resolve(__dirname, '../../..');
const ROUTE = '/art-src/restarts/scene-club/';
const EVIDENCE = process.env.RESET_CAPTURE_DIR || path.join(__dirname, 'evidence');
const KEY = 'piritori:restart:scene-club:v1';
const SENTINELS = {
  'piritori-to-eden:v3': '{"sentinel":"owner campaign","flags":["memory:c17-receipt:keep"],"outing":{"status":"settled","id":"keep"}}',
  'piritori-c12-crew-v1': '{"sentinel":"standalone crew and receipt"}',
  'piritori-c19-outing-v1': '{"sentinel":"campaign outing receipt"}',
};
const content = JSON.parse(fs.readFileSync(path.join(ROOT, 'content/era1-slice-v1.json')));
const encounter = content.encounters.find(item => item.id === 'enc-jaska-receipt');
const register = JSON.parse(fs.readFileSync(path.join(ROOT, 'art/v3/manifest.json')));
const retainedIds = ['scene-scene-club-v01', 'cutin-aatami-front-rig-v01', 'cutin-aatami-rig-v01', 'cutin-jaska-rig-v01'];
const retainedImages = new Set(retainedIds.flatMap(id => {
  const asset = register.assets.find(item => item.id === id);
  assert(asset, `retained source ${id} exists`);
  return asset.file ? ['art/v3/' + asset.file] : asset.members.map(member => 'art/v3/' + member.file);
}));
const scriptPaths = new Set(['app.js', 'actors.js', 'campaign.js', 'toko-composition.js'].map(file => 'art-src/restarts/scene-club/' + file).concat(['web/js/v3/content.js', 'web/js/v3/state.js', 'people/roster.mjs', 'people/hiring.mjs', 'market/model.mjs']));
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const sourceHashes = () => Object.fromEntries(['index.html', 'app.js', 'actors.js', 'campaign.js', 'style.css', 'toko-composition.js'].filter(file => fs.existsSync(path.join(__dirname, file))).map(file => [file, sha(fs.readFileSync(path.join(__dirname, file)))]));
const report = { schema: 1, sourceBase: '12d5486efed24d9f66d21716f605d387bfbfe4e6', sourceHashes: sourceHashes(), viewports: [[390, 844], [844, 390], [1280, 800]], cases: [], checks: 0, failures: [], limits: ['Browser emulation; no physical Pixel/iPad acceptance.', 'Retained Jaska and young Aatami sources; candidate motion has static mouths.', 'No Toko composition is tested or approved.', '50% review assesses composition, not native touch-target size.'] };
function check(value, label, result) {
  report.checks += 1;
  if (!value) { const failure = `${result.id}: ${label}`; report.failures.push(failure); result.failures.push(label); }
}
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png', '.md': 'text/plain' };
function makeServer() {
  return http.createServer((req, res) => {
    let file;
    try { file = path.resolve(ROOT, '.' + decodeURIComponent(req.url.split('?')[0])); } catch { res.writeHead(400); res.end(); return; }
    if (!file.startsWith(ROOT + path.sep)) { res.writeHead(403); res.end(); return; }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file)) { res.writeHead(404); res.end('missing'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
}
async function storageGuard(context) {
  await context.addInitScript(({ key, sentinels }) => {
    const get = Storage.prototype.getItem, set = Storage.prototype.setItem;
    for (const [name, value] of Object.entries(sentinels)) if (get.call(localStorage, name) === null) set.call(localStorage, name, value);
    const accesses = [], denied = [];
    const allow = (method, name) => { accesses.push({ method, key: name }); if (name !== key) { denied.push({ method, key: name }); throw Error('Candidate touched another save: ' + name); } };
    Storage.prototype.getItem = function (name) { allow('get', name); return get.call(this, name); };
    Storage.prototype.setItem = function (name, value) { allow('set', name); return set.call(this, name, value); };
    const remove = Storage.prototype.removeItem;
    Storage.prototype.removeItem = function (name) { allow('remove', name); return remove.call(this, name); };
    Storage.prototype.clear = function () { denied.push({ method: 'clear' }); throw Error('Candidate cleared storage'); };
    window.__sceneStorageAudit = { accesses, denied, sentinels: () => Object.fromEntries(Object.keys(sentinels).map(name => [name, get.call(localStorage, name)])) };
  }, { key: KEY, sentinels: SENTINELS });
}
function watch(page, target, result) {
  const base = new URL('../../../', target), prefix = base.pathname;
  const relative = raw => { const url = new URL(raw); return { url, file: url.pathname.startsWith(prefix) ? url.pathname.slice(prefix.length) : null }; };
  const errors = result.browserErrors = [], resources = new Set();
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push('console: ' + message.text()); });
  page.on('requestfailed', request => errors.push(`request: ${request.url()} ${request.failure()?.errorText}`));
  page.on('response', response => { if (response.status() >= 400) errors.push(`HTTP ${response.status()} ${response.url()}`); });
  page.on('request', request => {
    const { url, file } = relative(request.url());
    if (!['http:', 'https:'].includes(url.protocol)) return;
    resources.add(file ?? request.url());
    if (url.origin !== base.origin) errors.push('external resource: ' + request.url());
    if (request.resourceType() === 'image' && !retainedImages.has(file)) errors.push('unretained image: ' + request.url());
    if ((request.resourceType() === 'stylesheet' || /\.css$/.test(url.pathname)) && file !== 'art-src/restarts/scene-club/style.css') errors.push('old/foreign CSS: ' + request.url());
    if (request.resourceType() === 'script' && !scriptPaths.has(file)) errors.push('old/foreign script: ' + request.url());
    if (/art-src\/(reviews|prototypes|cutins)\/|\/hub\/|\/chrome\.|scene-speaker|cutin-stage|paper-skin|lantern\.css|\/v3\.css/.test(url.pathname)) errors.push('old presentation dependency: ' + request.url());
  });
  return () => { result.resources = [...resources].sort(); };
}
async function ready(page, view) {
  await page.waitForFunction(expected => window.__sceneReset?.ready && (!expected || window.__sceneReset.view === expected), view, { timeout: 15000 });
  if (view === 'scene') await page.waitForFunction(() => [...document.querySelectorAll('canvas.actor')].length === 2 && [...document.querySelectorAll('canvas.actor')].every(canvas => canvas.dataset.status === 'ready'));
}
async function saved(page) { return page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY); }
async function auditStorage(page, result) {
  const audit = await page.evaluate(() => ({ denied: window.__sceneStorageAudit.denied, sentinels: window.__sceneStorageAudit.sentinels() }));
  check(audit.denied.length === 0, 'never accesses non-candidate storage', result);
  check(JSON.stringify(audit.sentinels) === JSON.stringify(SENTINELS), 'campaign, crew and outing receipt sentinels unchanged', result);
}
async function capture(page, filename, result) {
  await page.screenshot({ path: path.join(EVIDENCE, filename) }); result.captures.push(filename);
}
async function geometry(page, result, half = false, choices = true) {
  const value = await page.evaluate(() => {
    const rect = element => { const r = element.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; };
    const painted = element => {
      let opacity = 1;
      for (let node = element; node instanceof Element; node = node.parentElement) {
        const css = getComputedStyle(node);
        if (css.display === 'none' || css.visibility !== 'visible' || css.contentVisibility === 'hidden') return false;
        opacity *= Number(css.opacity);
      }
      const box = rect(element);
      return opacity > .1 && box.width > 0 && box.height > 0;
    };
    const speech = document.querySelector('#speech'), box = rect(speech), pseudo = getComputedStyle(speech, '::after'), scale = window.__sceneReset.half ? .5 : 1;
    const tail = { x: box.x + parseFloat(pseudo.left) * scale, y: box.y + box.height - (parseFloat(pseudo.bottom) + parseFloat(pseudo.height)) * scale, width: parseFloat(pseudo.width) * scale, height: parseFloat(pseudo.height) * scale };
    return { width: innerWidth, height: innerHeight, world: rect(document.querySelector('#world')), layer: rect(document.querySelector('#actors')), speech: box, tail, controls: rect(document.querySelector('#controls')), bounds: window.__sceneReset.actors.bounds(), choices: [...document.querySelectorAll('[data-choice]')].map(button => ({ id: button.dataset.choice, label: button.querySelector('strong').textContent, forecast: button.querySelector('span').textContent, disabled: button.disabled, rect: rect(button), textRects: [rect(button.querySelector('strong')), rect(button.querySelector('span'))], font: parseFloat(getComputedStyle(button.querySelector('span')).fontSize) })), overflow: document.documentElement.scrollWidth > innerWidth, rigs: [...document.querySelectorAll('canvas.actor')].map(canvas => ({ who: canvas.dataset.actor, id: canvas.dataset.rig, variant: canvas.dataset.variant, painted: painted(canvas) })) };
  });
  const inside = (a, b, slack = 1) => a.x >= b.x - slack && a.y >= b.y - slack && a.x + a.width <= b.x + b.width + slack && a.y + a.height <= b.y + b.height + slack;
  const intersects = (a, b) => Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x) > .5 && Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) > .5;
  const screen = { x: 0, y: 0, width: value.width, height: value.height };
  check(!value.overflow, 'no horizontal page overflow', result);
  check(inside(value.world, screen), `${half ? '50%' : 'native'} world inside viewport`, result);
  check(inside(value.speech, value.world), 'speech remains in world', result);
  check(!intersects(value.speech, value.controls), 'speech and decisions do not overlap', result);
  for (const [who, actor] of Object.entries(value.bounds)) {
    check(actor.ready, who + ' actual retained source loaded', result);
    check(inside(actor.head, value.world) && inside(actor.head, value.layer), who + ' face not clipped by world or actor layer', result);
    check(!intersects(actor.head, value.speech), who + ' head clear of speech', result);
    check(!intersects(actor.head, value.tail), who + ' head clear of speech tail', result);
    check(!intersects(actor.head, value.controls), who + ' head clear of choices', result);
  }
  check(value.rigs.some(actor => actor.id === 'cutin-jaska-rig-v01') && value.rigs.some(actor => actor.id === `cutin-aatami${result.pose === 'front' ? '-front' : ''}-rig-v01`), 'correct paired Jaska/young Aatami source identities', result);
  check(value.rigs.length === 2 && value.rigs.every(actor => actor.painted), 'both actor canvases painted visibly through all ancestors', result);
  check(!intersects(value.bounds.aatami.head, value.bounds.jaska.head), 'paired faces do not cover each other', result);
  if (choices) {
    check(value.choices.length === 3, 'all three authored choices shown', result);
    for (const authored of encounter.choices) {
      const choice = value.choices.find(item => item.id === authored.id);
      check(choice?.label === authored.label && choice?.forecast === authored.forecast, authored.id + ' exact label and forecast', result);
      if (!choice) continue;
      check(!choice.disabled && inside(choice.rect, value.world), authored.id + ' visible in initial composition', result);
      check(choice.textRects.every(text => inside(text, choice.rect)), authored.id + ' full label and forecast stay inside choice', result);
      if (!half) { check(choice.rect.height >= 44 && choice.rect.width >= 44, authored.id + ' native 44px touch target', result); check(choice.font >= 12, authored.id + ' native forecast text floor', result); }
    }
  }
  return value;
}
// Hash actual decoded canvas RGBA output; dataset labels/pose metadata are not
// accepted as proof that anything moved or that reduced motion was obeyed.
async function frames(page) {
  return page.evaluate(() => Object.fromEntries([...document.querySelectorAll('canvas.actor')].map(canvas => {
    const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    let hash = 2166136261, opaque = 0;
    for (let i = 0; i < pixels.length; i += 1) { hash = Math.imul(hash ^ pixels[i], 16777619); if (i % 4 === 3 && pixels[i] > 24) opaque += 1; }
    return [canvas.dataset.actor, { hash: (hash >>> 0).toString(16), opaque }];
  })));
}
async function motion(page, result) {
  const reduce = result.motion === 'reduce', output = {};
  for (const [clip, second] of [['idle', 1], ['blink', .22], ['talk', .4], ['nod', .5], ['shake', .6]]) {
    await page.evaluate(clip => { const actors = window.__sceneReset.actors; for (const who of ['aatami', 'jaska']) actors.debug.hold(who, clip, 0); }, clip);
    const first = await frames(page);
    await page.evaluate(({ clip, second }) => { const actors = window.__sceneReset.actors; for (const who of ['aatami', 'jaska']) actors.debug.hold(who, clip, second); }, { clip, second });
    const last = await frames(page);
    for (const who of ['aatami', 'jaska']) {
      check(first[who].opaque > 1000 && last[who].opaque > 1000, who + ' rendered nonblank RGBA canvas', result);
      check(reduce ? first[who].hash === last[who].hash : first[who].hash !== last[who].hash, `${who} ${clip} ${reduce ? 'stays still under reduce' : 'changes actual pixels'}`, result);
    }
    output[clip] = { first, last };
    if (!reduce) {
      const held = await geometry(page, result, false, false);
      output[clip].heads = Object.fromEntries(Object.entries(held.bounds).map(([who, actor]) => [who, actor.head]));
    }
  }
  await page.evaluate(() => window.__sceneReset.actors.debug.resume());
  const liveStart = await frames(page); await page.waitForTimeout(650); const liveEnd = await frames(page);
  for (const who of ['aatami', 'jaska']) check(reduce ? liveStart[who].hash === liveEnd[who].hash : liveStart[who].hash !== liveEnd[who].hash, `${who} real-time animation ${reduce ? 'static under reduce' : 'advances under no-preference'}`, result);
  output.realTime = { first: liveStart, last: liveEnd };
  await page.evaluate(() => window.__sceneReset.actors.debug.rest());
  return output;
}

(async () => {
  fs.mkdirSync(EVIDENCE, { recursive: true });
  let server, browser, target;
  try {
    if (process.env.RESET_TEST_URL) target = new URL(process.env.RESET_TEST_URL);
    else { server = makeServer(); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); target = new URL(ROUTE, `http://127.0.0.1:${server.address().port}`); }
    if (target.pathname === '/') target.pathname = ROUTE;
    if (!target.pathname.endsWith('/')) target.pathname += '/';
    report.url = target.href;
    const engine = await import(pathToFileURL(path.join(ROOT, 'web/js/v3/state.js')).href + '?v=14');
    browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_PATH ? { executablePath: process.env.BROWSER_PATH } : {}) });
    report.browser = browser.version();
    for (const [name, width, height] of [['phone', 390, 844], ['landscape', 844, 390], ['desktop', 1280, 800]]) {
      for (const [pose, preference, choiceIndex] of [['side', 'reduce', 0], ['front', 'reduce', 1], ['front', 'no-preference', 2], ['side', 'no-preference', null]]) {
        const result = { id: `${name}-${pose}-${preference}`, viewport: { width, height }, pose, motion: preference, failures: [], captures: [] };
        report.cases.push(result);
        const context = await browser.newContext({ viewport: { width, height }, reducedMotion: preference });
        await storageGuard(context);
        const page = await context.newPage(), finishResources = watch(page, target, result);
        try {
          const url = new URL(target); url.searchParams.set('pose', pose);
          await page.goto(url.href); await ready(page, 'arrival');
          const enter = page.locator('#enter'), entry = await enter.boundingBox();
          check(await enter.innerText() === 'Go inside' && entry && entry.y >= 0 && entry.y + entry.height <= height && entry.height >= 44, 'arrival map provides visible Go inside', result);
          if (pose === 'side' && preference === 'reduce') await capture(page, `${name}-arrival.png`, result);
          await enter.click(); await ready(page, 'scene');
          if (preference === 'no-preference') await page.waitForTimeout(600);
          result.motionPixels = await motion(page, result);
          result.native = await geometry(page, result);
          await capture(page, `${result.id}-choices.png`, result);
          await auditStorage(page, result);
          if (preference === 'reduce') {
            const halfUrl = new URL(url); halfUrl.searchParams.set('scale', '0.5'); halfUrl.searchParams.set('start', 'scene');
            await page.goto(halfUrl.href); await ready(page, 'scene');
            await page.evaluate(() => window.__sceneReset.actors.debug.rest());
            result.half = await geometry(page, result, true);
            await capture(page, `${name}-${pose}-half.png`, result);
            const nativeUrl = new URL(url); nativeUrl.searchParams.set('start', 'scene');
            await auditStorage(page, result); await page.goto(nativeUrl.href); await ready(page, 'scene');
          }
          if (choiceIndex !== null) {
            const choice = encounter.choices[choiceIndex], before = await saved(page), expected = structuredClone(before.state);
            engine.chooseEncounter(expected, encounter, choice, { content });
            await page.locator(`[data-choice="${choice.id}"]`).click();
            await page.waitForFunction(() => window.__sceneReset.candidate.phase === 'result');
            if (preference === 'no-preference') await page.waitForTimeout(230);
            const paid = await saved(page);
            assert.deepEqual(paid.state, expected, 'real browser settlement exactly equals current engine');
            assert.deepEqual(paid.lastReceipt.before, before.state); assert.deepEqual(paid.lastReceipt.after, expected);
            check(paid.state.scheduleIndex === 2 && paid.state.selectedAnchor === 'makelansilta' && paid.state.choices[encounter.id] === choice.id, 'choice persists once without advancing or teleporting', result);
            check(await page.locator('#speech').innerText().then(text => text.includes(choice.label)), 'Aatami actually responds with selected choice', result);
            result.resultGeometry = await geometry(page, result, false, false);
            const button = await page.locator('#return').boundingBox(); check(button && button.height >= 44 && button.y + button.height <= height, 'result Return button visible and touchable', result);
            const duplicate = await page.evaluate(async choiceId => {
              const api = await import('./campaign.js'), before = JSON.stringify(window.__sceneReset.candidate);
              const response = api.chooseCandidate(window.__sceneReset.candidate, choiceId, {});
              return { response, unchanged: JSON.stringify(window.__sceneReset.candidate) === before };
            }, choice.id);
            check(duplicate.response.ok === false && duplicate.unchanged, 'duplicate actual candidate choice changes nothing', result);
            await capture(page, `${name}-${choice.id}-result.png`, result); await auditStorage(page, result);
            await page.reload(); await ready(page, 'scene');
            assert.deepEqual(await saved(page), paid, 'reload resumes exact real decision receipt');
            check(await page.locator('[data-choice]').count() === 0, 'resolved choice cannot be paid again after reload', result);
            engine.advanceSchedule(expected, { content });
            await page.locator('#return').click(); await ready(page, 'map');
            const returned = await saved(page); assert.deepEqual(returned.state, expected);
            check(returned.state.scheduleIndex === 3 && returned.state.selectedAnchor === 'makelansilta' && returned.phase === 'map', 'actual day2 night advance, no teleport to next Harju lead', result);
            check(await page.locator('.map-receipt').isVisible() && await page.locator('.next-place').innerText().then(text => text.includes('Harju')), 'quiet map shows actual consequence and next lead', result);
            const duplicateReturn = await page.evaluate(async () => { const api = await import('./campaign.js'), before = JSON.stringify(window.__sceneReset.candidate); return { response: api.returnToMap(window.__sceneReset.candidate, {}), unchanged: JSON.stringify(window.__sceneReset.candidate) === before }; });
            check(duplicateReturn.response.ok === false && duplicateReturn.unchanged, 'repeat Continue cannot skip next block', result);
            await capture(page, `${name}-${choice.id}-map.png`, result); await auditStorage(page, result);
            await page.reload(); await ready(page, 'map'); assert.deepEqual(await saved(page), returned);
            result.flow = { choice: choice.id, markkaDelta: paid.state.markka - before.state.markka, trustDelta: paid.state.relationships.jaska - before.state.relationships.jaska, beforeSha256: sha(JSON.stringify(before.state)), afterSha256: sha(JSON.stringify(paid.state)), returnedSha256: sha(JSON.stringify(returned.state)), index: returned.state.scheduleIndex, anchor: returned.state.selectedAnchor };
          }
          await auditStorage(page, result);
          check(result.browserErrors.length === 0, 'zero console/page/request/HTTP errors or old presentation resources', result);
        } catch (error) { check(false, error.stack || error.message, result); }
        finally { finishResources(); await context.close(); }
        console.log(`${result.failures.length ? 'FAIL' : 'PASS'} ${result.id}${result.flow ? ' · ' + result.flow.choice + ' / reload / real map return' : ' · motion / composition'} (${result.failures.length} failures)`);
      }
    }
  } catch (error) { report.failures.push(error.stack || error.message); }
  finally {
    if (browser) await browser.close();
    if (server) await new Promise(resolve => server.close(resolve));
    report.finalSourceHashes = sourceHashes();
    if (JSON.stringify(report.finalSourceHashes) !== JSON.stringify(report.sourceHashes)) report.failures.push('Candidate source changed during this run; capture again after integration is stable.');
    report.passed = report.failures.length === 0;
    fs.writeFileSync(path.join(EVIDENCE, 'browser-results.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(`${report.passed ? 'PASS' : 'FAIL'} Scene Club browser: ${report.cases.length} independent contexts, ${report.checks} checks, ${report.failures.length} failures. Evidence: ${EVIDENCE}`);
    if (!report.passed) { console.error(report.failures.slice(0, 14).join('\n')); process.exitCode = 1; }
  }
})();
