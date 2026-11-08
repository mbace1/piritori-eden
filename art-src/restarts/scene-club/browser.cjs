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
const sharedSources = ['web/js/v3/scene-club-view.js', 'web/js/v3/scene-club-actors.js', 'web/js/v3/scene-club-view.css'];
const scriptPaths = new Set(['app.js', 'actors.js', 'campaign.js', 'toko-composition.js'].map(file => 'art-src/restarts/scene-club/' + file).concat(['web/js/v3/content.js', 'web/js/v3/state.js', 'people/roster.mjs', 'people/hiring.mjs', 'market/model.mjs'], sharedSources.filter(file => file.endsWith('.js'))));
const stylePaths = new Set(['art-src/restarts/scene-club/style.css', 'web/js/v3/scene-club-view.css']);
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const sourceHashes = () => Object.fromEntries([
  ...['index.html', 'app.js', 'actors.js', 'campaign.js', 'style.css', 'toko-composition.js'].map(file => [file, sha(fs.readFileSync(path.join(__dirname, file)))]),
  ...sharedSources.map(file => [file, sha(fs.readFileSync(path.join(ROOT, file)))]),
]);
const report = { schema: 3, stageContract: 'fixed maximum-fit 9:16; combined UI bands and panel union at most 50%; native 44px targets and 12px text', sourceBase: '804613a3d4eaa1e5180dfb0ef2cb88952d15bd97', sourceHashes: sourceHashes(), viewports: [[390, 844], [844, 390], [1280, 800]], cases: [], edgeCases: [], checks: 0, edgeChecks: 0, failures: [], limits: ['Browser emulation; no physical Pixel/iPad acceptance.', 'Retained Jaska and young Aatami sources; candidate motion has static mouths.', 'This Scene Club suite does not exercise Toko; see the separate ensemble report. No owner approval is implied.', 'Half-size review assesses composition, not native touch-target size.'] };
function check(value, label, result) {
  if (result.edge) report.edgeChecks += 1; else report.checks += 1;
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
function watch(page, target, result, allowedImages = retainedImages) {
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
    if (request.resourceType() === 'image' && !allowedImages.has(file)) errors.push('unretained image: ' + request.url());
    if ((request.resourceType() === 'stylesheet' || /\.css$/.test(url.pathname)) && !stylePaths.has(file)) errors.push('old/foreign CSS: ' + request.url());
    if (request.resourceType() === 'script' && !scriptPaths.has(file)) errors.push('old/foreign script: ' + request.url());
    if (/art-src\/(reviews|prototypes|cutins)\/|\/hub\/|\/chrome\.|scene-speaker|cutin-stage|paper-skin|lantern\.css|\/v3\.css/.test(url.pathname)) errors.push('old presentation dependency: ' + request.url());
  });
  return () => { result.resources = [...resources].sort(); };
}
async function ready(page, view) {
  await page.waitForFunction(expected => window.__sceneReset?.ready && (!expected || window.__sceneReset.view === expected), view, { timeout: 15000 });
  if (view === 'scene') await page.waitForFunction(() => [...document.querySelectorAll('canvas.actor')].length === 2 && [...document.querySelectorAll('canvas.actor')].every(canvas => canvas.dataset.status === 'ready'));
  await settleBudget(page);
}
async function settleBudget(page) {
  // Allow font/layout ResizeObserver callbacks to start, then wait for the
  // application's completed fit. Assertions still measure actual DOM pixels.
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  try { await page.waitForFunction(() => document.querySelector('#world')?.dataset.budgetReady === 'true', undefined, { timeout: 2500 }); }
  catch (error) {
    const diagnostic = await page.evaluate(() => ({ stage: document.querySelector('#world')?.dataset.uiStage, density: document.querySelector('#world')?.dataset.uiDensity, reportedBudget: document.querySelector('#world')?.uiBudget }));
    throw Error('UI did not complete a ≤50% fit: ' + JSON.stringify(diagnostic));
  }
}
async function saved(page) { return page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY); }
async function auditStorage(page, result) {
  const audit = await page.evaluate(() => ({ denied: window.__sceneStorageAudit.denied, sentinels: window.__sceneStorageAudit.sentinels() }));
  check(audit.denied.length === 0, 'never accesses non-candidate storage', result);
  check(JSON.stringify(audit.sentinels) === JSON.stringify(SENTINELS), 'campaign, crew and outing receipt sentinels unchanged', result);
}
async function capture(page, filename, result) {
  await page.screenshot({ path: path.join(EVIDENCE, filename) }); result.captures.push(filename);
  const stageFile = filename.replace(/\.png$/, '-stage.png');
  await page.locator('#world').screenshot({ path: path.join(EVIDENCE, stageFile) }); result.captures.push(stageFile);
}
const inside = (a, b, slack = 1) => !!a && !!b && a.x >= b.x - slack && a.y >= b.y - slack && a.x + a.width <= b.x + b.width + slack && a.y + a.height <= b.y + b.height + slack;
const intersects = (a, b) => !!a && !!b && Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x) > .5 && Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) > .5;
let observedChoiceEffects = new Map();
async function measureFrame(page) {
  await settleBudget(page);
  const value = await page.evaluate(() => {
    const rect = element => { if (!element) return null; const r = element.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; };
    const world = document.querySelector('#world'), box = rect(world), half = !!window.__sceneReset.half;
    const scale = box.width / parseFloat(getComputedStyle(world).width);
    const painted = element => {
      if (!element) return false;
      let opacity = 1;
      for (let node = element; node instanceof Element; node = node.parentElement) {
        const css = getComputedStyle(node);
        if (css.display === 'none' || css.visibility !== 'visible' || css.contentVisibility === 'hidden') return false;
        opacity *= Number(css.opacity);
      }
      const r = rect(element);
      return opacity > .1 && r.width > 0 && r.height > 0;
    };
    const floating = element => {
      for (let node = element; node && node !== world; node = node.parentElement) if (getComputedStyle(node).position === 'absolute') return true;
      return false;
    };
    const text = element => ({ text: element.textContent.trim(), rect: rect(element), font: parseFloat(getComputedStyle(element).fontSize) * scale, painted: painted(element) });
    const allChoices = [...world.querySelectorAll('[data-choice]')].map(button => {
      const fullLabel = button.querySelector('.full-label') || button.querySelector('strong'), compactLabel = button.querySelector('.compact-label');
      const shownLabel = compactLabel && painted(compactLabel) ? compactLabel : fullLabel;
      const forecast = button.querySelector('.forecast') || button.querySelector('span'), compact = button.querySelector('.compact-stake');
      const shown = compact && painted(compact) ? compact : forecast;
      return { id: button.dataset.choice, painted: painted(button), label: fullLabel.textContent, forecast: forecast.textContent, labelPainted: painted(shownLabel), labelFont: parseFloat(getComputedStyle(shownLabel).fontSize) * scale, visibleLabel: text(shownLabel), compactLabel: shownLabel === compactLabel, accessible: button.getAttribute('aria-label') || '', disabled: button.disabled, rect: rect(button), textRects: [rect(shownLabel), rect(shown)], font: parseFloat(getComputedStyle(shown).fontSize) * scale, visibleStake: text(shown), compact: shown === compact };
    });
    const overlayNodes = [...world.querySelectorAll('.scene-header,.map-header,.map-footer,#encounter-overlay')];
    const summary = document.querySelector('#review-tools > summary');
    const reviewPanel = document.querySelector('#review-tools[open] .review-controls');
    const speech = world.querySelector('#speech'), controls = world.querySelector('#controls'), overlay = world.querySelector('#encounter-overlay');
    const visibleRect = element => painted(element) ? rect(element) : null;
    return { width: innerWidth, height: innerHeight, half, scale, world: box, uiStage: world.dataset.uiStage, budgetReady: world.dataset.budgetReady === 'true', wrapper: rect(document.querySelector('.portrait-frame')), layer: rect(world.querySelector('#actors')), background: rect(world.querySelector('.backdrop,.room-composite')), speech: visibleRect(speech), speechText: speech ? { ...text(speech), value: speech.innerText } : null, controls: visibleRect(controls), decisionOverlay: visibleRect(overlay), grouped: !!world.querySelector('#encounter-overlay #speech') && !!world.querySelector('#encounter-overlay #controls'), bounds: window.__sceneReset.actors?.bounds?.() || {}, overlays: overlayNodes.map(element => ({ name: element.id || element.className, rect: rect(element), painted: painted(element), floating: floating(element) })), targets: [...world.querySelectorAll('button')].filter(painted).map(element => ({ id: element.id || element.dataset.choice, rect: rect(element), font: parseFloat(getComputedStyle(element).fontSize) * scale })), review: summary ? { rect: rect(summary), painted: painted(summary), open: !!document.querySelector('#review-tools[open]'), panel: visibleRect(reviewPanel) } : null, choices: allChoices.filter(choice => choice.painted), allChoices, overflow: document.documentElement.scrollWidth > innerWidth || document.documentElement.scrollHeight > innerHeight + 1, rigs: [...world.querySelectorAll('canvas.actor,.room-composite canvas')].map(canvas => ({ who: canvas.dataset.actor, id: canvas.dataset.rig, variant: canvas.dataset.variant, painted: painted(canvas) })) };
  });
  value.uiBudget = measureUiBudget(value);
  return value;
}
function measureUiBudget(value) {
  const world = value.world, right = world.x + world.width, bottom = world.y + world.height;
  const clipped = rectangle => {
    const x = Math.max(world.x, rectangle.x), y = Math.max(world.y, rectangle.y);
    const width = Math.min(right, rectangle.x + rectangle.width) - x;
    const height = Math.min(bottom, rectangle.y + rectangle.height) - y;
    return width > 0 && height > 0 ? { x, y, width, height } : null;
  };
  const panels = value.overlays.filter(item => item.painted).map(item => ({ name: item.name, rect: item.rect, band: /header/.test(item.name) ? 'top' : 'bottom' }));
  // Half-size inspection keeps its developer control outside the scaled game.
  if (value.review?.painted && (!value.half || inside(value.review.rect, world))) panels.push({ name: 'review-summary', rect: value.review.rect });
  if (value.review?.panel) panels.push({ name: 'review-controls', rect: value.review.panel });
  const boxes = panels.map(item => ({ ...item, rect: clipped(item.rect) })).filter(item => item.rect);
  let topHeight = 0, bottomHeight = 0;
  for (const item of boxes) {
    const band = item.band || (item.rect.y + item.rect.height / 2 <= world.y + world.height / 2 ? 'top' : 'bottom');
    if (band === 'top') topHeight = Math.max(topHeight, item.rect.y + item.rect.height - world.y);
    else bottomHeight = Math.max(bottomHeight, bottom - item.rect.y);
  }
  const xs = [...new Set(boxes.flatMap(item => [item.rect.x, item.rect.x + item.rect.width]))].sort((a, b) => a - b);
  let unionArea = 0;
  for (let i = 1; i < xs.length; i++) {
    const left = xs[i - 1], width = xs[i] - left;
    const intervals = boxes.filter(item => item.rect.x < xs[i] && item.rect.x + item.rect.width > left).map(item => [item.rect.y, item.rect.y + item.rect.height]).sort((a, b) => a[0] - b[0]);
    let height = 0, end = -Infinity;
    for (const [a, b] of intervals) { height += Math.max(0, b - Math.max(a, end)); end = Math.max(end, b); }
    unionArea += width * height;
  }
  return { topHeight, bottomHeight, totalHeight: topHeight + bottomHeight, heightRatio: (topHeight + bottomHeight) / world.height, unionArea, areaRatio: unionArea / (world.width * world.height), panels: boxes };
}
function fixedFrameAssertions(value, half = value.half) {
  const checks = [], add = (pass, label) => checks.push({ pass, label });
  const screen = { x: 0, y: 0, width: value.width, height: value.height }, factor = half ? .5 : 1;
  const expectedWidth = Math.min(value.width, value.height * 9 / 16) * factor;
  const expectedHeight = Math.min(value.height, value.width * 16 / 9) * factor;
  add(!value.overflow, 'no page overflow outside letterboxed frame');
  add(inside(value.world, screen), 'fixed stage remains inside viewport');
  add(Math.abs(value.world.width * 16 - value.world.height * 9) <= 8, 'rendered stage strictly 9:16');
  add(Math.abs(value.world.width - expectedWidth) <= 1 && Math.abs(value.world.height - expectedHeight) <= 1, `${half ? 'half review' : 'native'} stage uses maximum 9:16 fit`);
  add(Math.abs(value.world.x + value.world.width / 2 - value.width / 2) <= 1 && Math.abs(value.world.y + value.world.height / 2 - value.height / 2) <= 1, 'portrait frame centered within letterbox');
  if (!half) add(Math.abs(value.scale - 1) <= .01, 'native controls use physical CSS pixels, not scaled-down design');
  add(value.budgetReady, 'UI budget has completed its layout pass');
  // Subpixel rounding is the only allowance; layouts should reserve headroom.
  add(value.uiBudget.totalHeight <= value.world.height * .5 + .5, 'HUD and bottom UI bands including edge insets occupy at most 50% of stage height');
  add(value.uiBudget.unionArea <= value.world.width * value.world.height * .5 + .5, 'union of painted UI panels occupies at most 50% of stage area');
  for (const overlay of value.overlays) {
    if (!overlay.painted) continue;
    add(inside(overlay.rect, value.world), overlay.name + ' visible inside stage');
    add(overlay.floating, overlay.name + ' overlays scene rather than reserving a separate page panel');
  }
  if (value.background) {
    if (!value.review?.open) add(value.grouped && !!value.decisionOverlay, 'speech and choices share floating encounter overlay');
    if (value.speech) add(inside(value.speech, value.decisionOverlay), 'painted dialogue inside floating encounter overlay');
    if (value.controls) add(inside(value.controls, value.decisionOverlay), 'painted decisions inside floating encounter overlay');
    if (value.speech && value.controls) add(!intersects(value.speech, value.controls), 'dialogue and choices do not overlap each other');
    add(inside(value.world, value.background) && inside(value.background, value.world), 'scene background covers complete stage behind controls');
    add(inside(value.world, value.layer) && inside(value.layer, value.world), 'actors retain full-frame stage independent of overlay height');
  }
  for (const target of value.targets) {
    add(inside(target.rect, value.world), target.id + ' visible within stage');
    if (!half) { add(target.rect.height >= 44 && target.rect.width >= 44, target.id + ' actual native 44px target even in landscape'); add(target.font >= 11.95, target.id + ' actual native 12px text'); }
  }
  if (!half) {
    add(value.review?.painted && inside(value.review.rect, value.world), 'review menu aligned inside portrait frame');
    for (const hud of value.overlays.filter(item => item.painted && /header/.test(item.name))) add(!intersects(hud.rect, value.review?.rect), 'top HUD clear of review control');
    for (const [who, actor] of Object.entries(value.bounds)) add(!intersects(actor.head, value.review?.rect), who + ' head clear of review summary');
  }
  return checks;
}
async function geometry(page, result, half = false, choices = true) {
  const value = await measureFrame(page);
  for (const item of fixedFrameAssertions(value, half)) check(item.pass, item.label, result);
  for (const [who, actor] of Object.entries(value.bounds)) {
    check(actor.ready, who + ' actual retained source loaded', result);
    check(inside(actor.head, value.world) && inside(actor.head, value.layer), who + ' face not clipped by frame or actor layer', result);
    check(!intersects(actor.head, value.decisionOverlay), who + ' head clear of complete bottom overlay', result);
    for (const hud of value.overlays.filter(item => item.painted && /header/.test(item.name))) check(!intersects(actor.head, hud.rect), who + ' head clear of top HUD', result);
  }
  check(value.rigs.some(actor => actor.id === 'cutin-jaska-rig-v01') && value.rigs.some(actor => actor.id === `cutin-aatami${result.pose === 'front' ? '-front' : ''}-rig-v01`), 'correct paired Jaska/young Aatami source identities', result);
  check(value.rigs.length === 2 && value.rigs.every(actor => actor.painted), 'both actor canvases painted visibly through all ancestors', result);
  check(!intersects(value.bounds.aatami.head, value.bounds.jaska.head), 'paired faces do not cover each other', result);
  if (choices) {
    check(value.choices.length === 3, 'all three authored choices shown', result);
    for (const authored of encounter.choices) {
      const choice = value.choices.find(item => item.id === authored.id);
      check(choice?.label === authored.label && choice?.forecast === authored.forecast, authored.id + ' exact label and full authored forecast retained', result);
      if (!choice) continue;
      check(choice.labelPainted && (half || choice.labelFont >= 11.95), authored.id + ' label visibly painted at readable size', result);
      if (choice.compactLabel) {
        const labels = {'ask-envelope':'Ask before taking it','take-envelope':'Call it family money','leave-it':'Leave it under the map'};
        check(choice.visibleLabel.text === labels[authored.id], authored.id + ' concise label keeps the authored decision', result);
        check(choice.accessible.includes(authored.label) && choice.accessible.includes(authored.forecast), authored.id + ' complete authored wording stays accessible', result);
      } else check(choice.visibleLabel.text === authored.label, authored.id + ' full authored label painted at normal widths', result);
      check(!choice.disabled && inside(choice.rect, value.world), authored.id + ' visible in initial composition', result);
      check(choice.textRects.every(text => inside(text, choice.rect)), authored.id + ' complete label and visible stakes inside choice', result);
      check(choice.visibleStake.painted && choice.visibleStake.rect.height > 3 && choice.visibleStake.rect.width > 3, authored.id + ' stakes actually painted', result);
      if (!half) check(choice.font >= 11.95, authored.id + ' actual native stakes text at least 12px', result);
      if (choice.compact) {
        const effect = observedChoiceEffects.get(authored.id), signed = n => n > 0 ? '+' + n : String(n);
        const expected = `${effect.markka ? signed(effect.markka) + ' mk' : 'No bank offer'} · trust ${signed(effect.trust)}`;
        check(choice.visibleStake.text === expected, authored.id + ' compact numeric stakes match actual engine effect', result);
        check(choice.accessible.includes(authored.label) && choice.accessible.includes(authored.forecast), authored.id + ' full forecast accessible when compact stakes shown', result);
      }
    }
    if (value.speech) {
      const line = await page.locator('#speech p:last-child').innerText();
      check(line === encounter.opening.match(/[^.!?]+[.!?]+|[^.!?]+$/g).at(-1).trim(), 'painted scene card uses actual final opening sentence, without new story', result);
    }
  }
  return value;
}
async function ensureChoices(page, result) {
  await settleBudget(page);
  const before = await saved(page), initial = await measureFrame(page);
  for (const item of fixedFrameAssertions(initial)) check(item.pass, item.label, result);
  check(initial.speechText?.painted, 'authored dialogue is painted before choosing', result);
  check((await page.locator('#speech p:last-child').innerText()) === encounter.opening.match(/[^.!?]+[.!?]+|[^.!?]+$/g).at(-1).trim(), 'actual opening sentence remains readable before responding', result);
  const respond = page.locator('#respond');
  const stepped = await respond.count() && await respond.isVisible();
  if (stepped) {
    check(initial.uiStage === 'dialogue' && initial.choices.length === 0 && initial.allChoices.length === 3, 'dialogue stage preserves all choices without painting them over the scene', result);
    const button = await respond.boundingBox();
    await respond.click();
    // A second physical tap at the old Respond position must not accidentally
    // select a newly appeared choice while the 300ms arm interval is active.
    await page.mouse.click(button.x + button.width / 2, button.y + button.height / 2);
    const afterTap = await saved(page);
    check(JSON.stringify(afterTap.state) === JSON.stringify(before.state) && afterTap.phase === before.phase && afterTap.lastReceipt === before.lastReceipt, 'Respond and immediate repeated tap change presentation only', result);
  }
  await page.waitForFunction(() => {
    const visible = [...document.querySelectorAll('[data-choice]')].filter(button => button.getClientRects().length && getComputedStyle(button).visibility === 'visible');
    return visible.length === 3 && visible.every(button => !button.disabled);
  });
  await settleBudget(page);
  const after = await saved(page), final = await measureFrame(page);
  check(JSON.stringify(after.state) === JSON.stringify(before.state) && after.phase === before.phase, 'opening the choice view preserves actual campaign state and clock', result);
  check(final.choices.length === 3 && ['both','choices'].includes(final.uiStage), 'all three authored choices visible after Respond', result);
  if (stepped) check(!final.speech && final.uiStage === 'choices', 'choices replace dialogue when simultaneous UI exceeds the half-screen budget', result);
  return { stepped: !!stepped, initial, final };
}
async function inspectReview(page, result) {
  const before = await saved(page);
  await page.locator('#review-tools > summary').click(); await settleBudget(page);
  const value = await measureFrame(page);
  for (const item of fixedFrameAssertions(value)) check(item.pass, item.label, result);
  check(value.review?.open && value.review.panel && inside(value.review.panel, value.world), 'review drawer visible inside its own half-screen budget', result);
  check(JSON.stringify((await saved(page)).state) === JSON.stringify(before.state), 'opening review controls does not change campaign state', result);
  await page.locator('#review-tools > summary').click(); await settleBudget(page);
  return value;
}
async function entrySamples(page, result) {
  const samples = [];
  for (let i = 0; i < 3; i++) {
    const value = await measureFrame(page);
    for (const item of fixedFrameAssertions(value)) check(item.pass, 'entry animation: ' + item.label, result);
    const animation = await page.locator('#encounter-overlay').evaluate(element => ({
      translate: getComputedStyle(element).translate,
      times: element.getAnimations().map(animation => animation.currentTime),
    }));
    samples.push({ uiBudget: value.uiBudget, uiStage: value.uiStage, animation });
    if (i < 2) await page.waitForTimeout(80);
  }
  return samples;
}
// Hash actual decoded canvas RGBA output; dataset labels/pose metadata are not
// accepted as proof that anything moved or that reduced motion was obeyed.
async function frames(page, selector = 'canvas.actor') {
  return page.evaluate(selector => Object.fromEntries([...document.querySelectorAll(selector)].map(canvas => {
    const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    let hash = 2166136261, opaque = 0;
    for (let i = 0; i < pixels.length; i += 1) { hash = Math.imul(hash ^ pixels[i], 16777619); if (i % 4 === 3 && pixels[i] > 24) opaque += 1; }
    return [canvas.dataset.actor || (canvas.closest('.room-composite') ? 'toko' : 'unknown'), { hash: (hash >>> 0).toString(16), opaque }];
  })), selector);
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

async function runBrowser() {
  fs.mkdirSync(EVIDENCE, { recursive: true });
  let server, browser, target;
  try {
    if (process.env.RESET_TEST_URL) target = new URL(process.env.RESET_TEST_URL);
    else { server = makeServer(); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); target = new URL(ROUTE, `http://127.0.0.1:${server.address().port}`); }
    if (target.pathname === '/') target.pathname = ROUTE;
    if (!target.pathname.endsWith('/')) target.pathname += '/';
    report.url = target.href;
    const engine = await import(pathToFileURL(path.join(ROOT, 'web/js/v3/state.js')).href + '?v=16');
    const basis = engine.createState(content); basis.scheduleIndex = 2; basis.mode = 'encounter'; basis.selectedAnchor = 'makelansilta';
    observedChoiceEffects = new Map(encounter.choices.map(choice => { const after = structuredClone(basis); engine.chooseEncounter(after, encounter, choice, { content }); return [choice.id, { markka: after.markka - basis.markka, trust: after.relationships.jaska - basis.relationships.jaska }]; }));
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
          result.arrival = await measureFrame(page);
          for (const item of fixedFrameAssertions(result.arrival)) check(item.pass, item.label, result);
          check((await page.locator('.map-footer').innerText()).includes(encounter.opening.match(/[^.!?]+[.!?]+|[^.!?]+$/g)[0].trim()), 'arrival uses first actual opening sentence', result);
          const enter = page.locator('#enter'), entry = await enter.boundingBox();
          check(await enter.innerText() === 'Go inside' && entry && entry.y >= 0 && entry.y + entry.height <= height && entry.height >= 44, 'arrival map provides visible Go inside', result);
          if (pose === 'side' && preference === 'reduce') await capture(page, `${name}-arrival.png`, result);
          await enter.click(); await ready(page, 'scene');
          if (preference === 'no-preference') result.entrySamples = await entrySamples(page, result);
          if (preference === 'no-preference') await page.waitForTimeout(600);
          result.responseView = await ensureChoices(page, result);
          if (result.responseView.stepped) {
            const dialogueUrl = new URL(url); dialogueUrl.searchParams.set('start', 'scene');
            await page.goto(dialogueUrl.href); await ready(page, 'scene');
            await capture(page, `${result.id}-dialogue.png`, result);
            await ensureChoices(page, result);
          }
          result.motionPixels = await motion(page, result);
          result.native = await geometry(page, result);
          await capture(page, `${result.id}-choices.png`, result);
          await auditStorage(page, result);
          if (preference === 'reduce') {
            const halfUrl = new URL(url); halfUrl.searchParams.set('scale', '0.5'); halfUrl.searchParams.set('start', 'scene');
            await page.goto(halfUrl.href); await ready(page, 'scene');
            await ensureChoices(page, result);
            await page.evaluate(() => window.__sceneReset.actors.debug.rest());
            result.half = await geometry(page, result, true);
            await capture(page, `${name}-${pose}-half.png`, result);
            const nativeUrl = new URL(url); nativeUrl.searchParams.set('start', 'scene');
            await auditStorage(page, result); await page.goto(nativeUrl.href); await ready(page, 'scene');
            await ensureChoices(page, result);
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
            for (const who of ['aatami', 'jaska']) { const a = result.native.bounds[who].canvas, b = result.resultGeometry.bounds[who].canvas; check(['x','y','width','height'].every(key => Math.abs(a[key]-b[key]) <= .5), who + ' canvas position stays fixed after decision', result); }
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
            result.map = await measureFrame(page); for (const item of fixedFrameAssertions(result.map)) check(item.pass, item.label, result);
            check(returned.state.scheduleIndex === 3 && returned.state.selectedAnchor === 'makelansilta' && returned.phase === 'map', 'actual day2 night advance, no teleport to next Harju lead', result);
            check(await page.locator('.map-receipt').isVisible() && await page.locator('.next-place').innerText().then(text => text.includes('Harju')), 'quiet map shows actual consequence and next lead', result);
            const duplicateReturn = await page.evaluate(async () => { const api = await import('./campaign.js'), before = JSON.stringify(window.__sceneReset.candidate); return { response: api.returnToMap(window.__sceneReset.candidate, {}), unchanged: JSON.stringify(window.__sceneReset.candidate) === before }; });
            check(duplicateReturn.response.ok === false && duplicateReturn.unchanged, 'repeat Continue cannot skip next block', result);
            await capture(page, `${name}-${choice.id}-map.png`, result); await auditStorage(page, result);
            await page.reload(); await ready(page, 'map'); assert.deepEqual(await saved(page), returned);
            result.flow = { choice: choice.id, markkaDelta: paid.state.markka - before.state.markka, trustDelta: paid.state.relationships.jaska - before.state.relationships.jaska, beforeSha256: sha(JSON.stringify(before.state)), afterSha256: sha(JSON.stringify(paid.state)), returnedSha256: sha(JSON.stringify(returned.state)), index: returned.state.scheduleIndex, anchor: returned.state.selectedAnchor };
          }
          if (pose === 'side' && preference === 'no-preference') result.reviewDrawer = await inspectReview(page, result);
          await auditStorage(page, result);
          check(result.browserErrors.length === 0, 'zero console/page/request/HTTP errors or old presentation resources', result);
        } catch (error) { check(false, error.stack || error.message, result); }
        finally { finishResources(); await context.close(); }
        console.log(`${result.failures.length ? 'FAIL' : 'PASS'} ${result.id}${result.flow ? ' · ' + result.flow.choice + ' / reload / real map return' : ' · motion / composition'} (${result.failures.length} failures)`);
      }
    }
    // CI and device system fonts can wrap quite differently. Exercise wider
    // real metrics at the fitted landscape and compact-label breakpoint.
    const edgeViews = [[320, 568], [271, 482], [844, 390, 'DejaVu Sans'], [271, 482, 'DejaVu Sans'], [844, 390, 'monospace'], [271, 482, 'monospace']];
    for (const [width, height, font] of edgeViews) for (const pose of ['front', 'side']) {
      const result = { id: `edge-${width}x${height}-${pose}${font ? '-'+font.replaceAll(' ','-') : ''}`, edge: true, viewport: { width, height }, pose, font: font || 'system-ui', motion: 'reduce', failures: [], captures: [] };
      report.edgeCases.push(result);
      const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' }); await storageGuard(context);
      const page = await context.newPage(), finishResources = watch(page, target, result);
      try {
        const url = new URL(target); url.searchParams.set('start', 'scene'); url.searchParams.set('pose', pose);
        await page.goto(url.href); await ready(page, 'scene');
        if (font) await page.addStyleTag({ content: `:root, .scene-club { font-family: '${font}' }` });
        result.responseView = await ensureChoices(page, result);
        await page.evaluate(() => window.__sceneReset.actors.debug.rest());
        result.native = await geometry(page, result);
        await auditStorage(page, result); await capture(page, result.id + '.png', result);
        check(result.browserErrors.length === 0, 'zero edge-view resource/browser errors', result);
      } catch (error) { check(false, error.stack || error.message, result); }
      finally { finishResources(); await context.close(); }
      console.log(`${result.failures.length ? 'FAIL' : 'PASS'} ${result.id} (${result.failures.length} failures)`);
    }
  } catch (error) { report.failures.push(error.stack || error.message); }
  finally {
    if (browser) await browser.close();
    if (server) await new Promise(resolve => server.close(resolve));
    report.finalSourceHashes = sourceHashes();
    if (JSON.stringify(report.finalSourceHashes) !== JSON.stringify(report.sourceHashes)) report.failures.push('Candidate source changed during this run; capture again after integration is stable.');
    report.passed = report.failures.length === 0;
    fs.writeFileSync(path.join(EVIDENCE, 'browser-results.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(`${report.passed ? 'PASS' : 'FAIL'} Scene Club browser: ${report.cases.length} main + ${report.edgeCases.length} edge contexts, ${report.checks} main + ${report.edgeChecks} edge checks, ${report.failures.length} failures. Evidence: ${EVIDENCE}`);
    if (!report.passed) { console.error(report.failures.slice(0, 14).join('\n')); process.exitCode = 1; }
  }
}
module.exports = { measureFrame, fixedFrameAssertions, measureUiBudget, settleBudget, ensureChoices, inside, intersects, frames, storageGuard, watch, sourceHashes, SENTINELS };
if (require.main === module) runBrowser();
