// Flat hub packaging regression for the real campaign Scene Club view.
// NODE_PATH=$(npm root -g) node web/test/scene-club-cabinet.cjs
// The seed is a labelled checkpoint fixture, not an earned playthrough. The
// separate campaign suite owns Begin -> Scene Club through all earlier beats.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');

const ROOT = path.resolve(__dirname, '../..');
const OUT = process.env.SCENE_CLUB_CABINET_DIR || fs.mkdtempSync(path.join(os.tmpdir(), 'piritori-scene-club-cabinet-'));
const CABINET = path.join(OUT, 'site/cabinet');
const SAVE = 'piritori-to-eden:v3';
const SCENE = 'enc-jaska-receipt';
const HOST = '#sceneClubEncounter';
const STAGE = `${HOST} .scene-club.world.scene-view`;
const AUX = {
  'piritori:restart:scene-club:v1': '{"sentinel":"private candidate remains separate"}',
  'piritori-c12-crew-v1': '{"sentinel":"standalone crew remains separate"}',
  'piritori-c19-outing-v1': '{"sentinel":"existing tactical receipt remains separate"}',
};
const EFFECTS = {
  'ask-envelope': { markka: 300, trust: 1, flag: 'markka-explained' },
  'take-envelope': { markka: 300, trust: -1, flag: 'jaska-money-taken' },
  'leave-it': { markka: 0, trust: 2, flag: 'markka-left-with-jaska' },
};
const report = { startedAt: new Date().toISOString(), checks: 0, cases: [], failures: [], limits: [
  'Synthetic normal-save checkpoint; the campaign suite owns the earned opening journey.',
  'Parent arcade shell is an explicitly inert local fixture, not a live hub/offline-shell acceptance test.',
  'No new art, C.19 battle simulation, deployment or physical-device acceptance.',
] };
const check = (condition, label, detail) => { report.checks++; assert(condition, `${label}${detail === undefined ? '' : ': ' + JSON.stringify(detail)}`); };
const equal = (actual, expected, label) => { report.checks++; assert.deepEqual(actual, expected, label); };
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
function filesBelow(folder) {
  return fs.readdirSync(folder, { withFileTypes: true }).flatMap(item => {
    const file = path.join(folder, item.name);
    if (item.isDirectory()) return filesBelow(file);
    assert(item.isFile(), 'No symbolic links or special files: ' + file);
    return [file];
  });
}
const hashes = (root, files) => Object.fromEntries(files.slice().sort().map(file => [path.relative(root, file).split(path.sep).join('/'), sha(fs.readFileSync(file))]));
const snapshot = page => page.evaluate(key => ({ state: JSON.parse(JSON.stringify(window.__ptv3.state)), save: localStorage.getItem(key) }), SAVE);
const within = (a, b) => a.left >= b.left - .5 && a.right <= b.right + .5 && a.top >= b.top - .5 && a.bottom <= b.bottom + .5;

async function seed(context, checkpoint) {
  await context.addInitScript(({ key, checkpoint, auxiliary }) => {
    const get = Storage.prototype.getItem, set = Storage.prototype.setItem;
    const remove = Storage.prototype.removeItem, clear = Storage.prototype.clear;
    if (get.call(localStorage, key) === null) set.call(localStorage, key, JSON.stringify(checkpoint));
    for (const [name, value] of Object.entries(auxiliary)) if (get.call(localStorage, name) === null) set.call(localStorage, name, value);
    const audit = 'scene-club-cabinet-test:audit';
    const record = (method, name) => {
      if (method !== 'clear' && !(name in auxiliary)) return;
      const rows = JSON.parse(get.call(sessionStorage, audit) || '[]');
      rows.push({ method, key: name }); set.call(sessionStorage, audit, JSON.stringify(rows));
    };
    Storage.prototype.getItem = function (name) { if (this === localStorage) record('get', name); return get.call(this, name); };
    Storage.prototype.setItem = function (name, value) { if (this === localStorage) record('set', name); return set.call(this, name, value); };
    Storage.prototype.removeItem = function (name) { if (this === localStorage) record('remove', name); return remove.call(this, name); };
    Storage.prototype.clear = function () { if (this === localStorage) record('clear', null); return clear.call(this); };
    window.__cabinetStorageAudit = () => ({ accesses: JSON.parse(get.call(sessionStorage, audit) || '[]'), values: Object.fromEntries(Object.keys(auxiliary).map(name => [name, get.call(localStorage, name)])) });
  }, { key: SAVE, checkpoint, auxiliary: AUX });
}
function watch(page, origin, builtHashes) {
  const errors = [], requests = new Set();
  page.on('pageerror', error => errors.push(error.stack || error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push('console: ' + message.text()); });
  page.on('requestfailed', request => errors.push(`request: ${request.url()} ${request.failure()?.errorText}`));
  page.on('response', response => { if (response.status() >= 400) errors.push(`HTTP${response.status()}: ${response.url()}`); });
  page.on('request', request => {
    const url = new URL(request.url());
    if (!['http:', 'https:'].includes(url.protocol)) return;
    requests.add(url.pathname);
    if (url.origin !== origin) errors.push('Foreign origin: ' + request.url());
    if (url.pathname === '/hub/shell.js') return; // Explicit parent-shell fixture.
    const file = url.pathname.startsWith('/cabinet/') ? decodeURIComponent(url.pathname.slice('/cabinet/'.length)) || 'index.html' : null;
    if (!file || !(file in builtHashes)) errors.push('Outside built file closure: ' + request.url());
    if (/art-src|\/dev\/|restarts|reviews|prototypes|lantern\.css|chrome\.js|scene-speaker|\/art\/v3\/(characters|cast|ui)\//.test(url.pathname)) errors.push('Private or retired visual request: ' + request.url());
    if (/\/crew-run\//.test(url.pathname)) errors.push('Scene Club invented a combat route: ' + request.url());
  });
  return () => ({ errors, requests: [...requests].sort() });
}
async function boot(page, base) {
  await page.goto(base + '?skip');
  await page.waitForFunction(() => Boolean(window.__ptv3?.data));
  await page.locator('#resumeButton').click();
}
async function ready(page) {
  await page.waitForFunction(() => {
    const stage = document.querySelector('#sceneClubEncounter')?.shadowRoot?.querySelector('.scene-club.world.scene-view');
    return stage?.dataset.ready === 'true' && stage.dataset.budgetReady === 'true';
  }, undefined, { timeout: 30000 });
  await page.evaluate(async () => {
    await document.fonts.ready;
    const stage = document.querySelector('#sceneClubEncounter').shadowRoot.querySelector('.scene-club');
    await Promise.all(stage.getAnimations({ subtree: true }).filter(animation => animation.effect?.getTiming().iterations !== Infinity).map(animation => animation.finished.catch(() => {})));
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
}
function budget(panels, stage) {
  const xs = [...new Set(panels.flatMap(p => [p.left, p.right]))].sort((a, b) => a - b);
  let area = 0;
  for (let i = 1; i < xs.length; i++) {
    const ranges = panels.filter(p => p.left < xs[i] && p.right > xs[i - 1]).map(p => [p.top, p.bottom]).sort((a, b) => a[0] - b[0]);
    let height = 0, end = -Infinity;
    for (const [a, b] of ranges) { height += Math.max(0, b - Math.max(a, end)); end = Math.max(end, b); }
    area += (xs[i] - xs[i - 1]) * height;
  }
  const top = Math.max(0, ...panels.filter(p => p.band === 'top').map(p => p.bottom - stage.top));
  const bottom = Math.max(0, ...panels.filter(p => p.band === 'bottom').map(p => stage.bottom - p.top));
  return { areaRatio: area / (stage.width * stage.height), heightRatio: (top + bottom) / stage.height };
}
async function geometry(page, id) {
  await ready(page);
  const value = await page.evaluate(() => {
    const host = document.querySelector('#sceneClubEncounter'), root = host.shadowRoot, stage = root.querySelector('.scene-club');
    const rect = element => { const r = element.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; };
    const painted = element => {
      let opacity = 1;
      for (let node = element; node instanceof Element; node = node.parentElement || node.getRootNode()?.host) {
        const css = getComputedStyle(node);
        if (css.display === 'none' || css.visibility !== 'visible' || css.contentVisibility === 'hidden') return false;
        // Closed details can keep descendant layout boxes even though their
        // contents are not painted. Only their own first summary is visible.
        if (node.matches('details:not([open])') && !node.querySelector(':scope > summary')?.contains(element)) return false;
        opacity *= Number(css.opacity);
      }
      const r = rect(element); return opacity > .1 && r.width > 0 && r.height > 0;
    };
    const box = rect(stage), scale = box.width / stage.clientWidth;
    const panels = [...root.querySelectorAll('.scene-header,#encounter-overlay,.scene-menu > summary')].filter(painted).map(el => ({ ...rect(el), band: el.matches('#encounter-overlay') ? 'bottom' : 'top' }));
    const buttons = [...stage.querySelectorAll('button,summary')].filter(painted).map(el => ({ ...rect(el), id: el.id || el.dataset.choice || el.tagName, font: parseFloat(getComputedStyle(el).fontSize) * scale }));
    const texts = [], walker = document.createTreeWalker(stage, NodeFilter.SHOW_TEXT);
    for (let node; (node = walker.nextNode());) {
      if (!node.textContent.trim() || !painted(node.parentElement)) continue;
      const range = document.createRange(); range.selectNodeContents(node);
      texts.push({ text: node.textContent.trim(), font: parseFloat(getComputedStyle(node.parentElement).fontSize) * scale, fragments: [...range.getClientRects()].map(r => ({ left: r.left, top: r.top, right: r.right, bottom: r.bottom })) });
    }
    const actors = [...stage.querySelectorAll('canvas.actor')].map(canvas => {
      const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
      let opaque = 0; for (let i = 3; i < data.length; i += 4) if (data[i] > 10) opaque++;
      return { id: canvas.dataset.rig, status: canvas.dataset.status, painted: painted(canvas), opaque, width: canvas.width, height: canvas.height, rect: rect(canvas) };
    });
    return { stage: box, viewport: { width: innerWidth, height: innerHeight }, scale, panels, buttons, texts, actors, choices: [...stage.querySelectorAll('[data-choice]')].filter(painted).map(el => ({ id: el.dataset.choice, aria: el.getAttribute('aria-label'), text: el.innerText, disabled: el.disabled })), stylesheet: [...root.querySelectorAll('link[rel="stylesheet"]')].map(el => ({ href: el.href, loaded: Boolean(el.sheet) })), privateControls: root.querySelectorAll('#review-tools,#restart,#pair,#scale,[data-study]').length };
  });
  const expectedWidth = Math.min(value.viewport.width, value.viewport.height * 9 / 16);
  check(Math.abs(value.stage.width - expectedWidth) < 1 && Math.abs(value.stage.height - expectedWidth * 16 / 9) < 1, id + ': actual maximum-fit9:16 stage', value.stage);
  check(Math.abs(value.stage.left + value.stage.width / 2 - value.viewport.width / 2) < 1 && Math.abs(value.stage.top + value.stage.height / 2 - value.viewport.height / 2) < 1, id + ': centered portrait frame');
  check(Math.abs(value.scale - 1) < .01, id + ': native CSS pixels');
  value.budget = budget(value.panels, value.stage);
  check(value.budget.areaRatio <= .50001 && value.budget.heightRatio <= .5 + .5 / value.stage.height, id + ': independent UI union and inset bands at most50%', value.budget);
  check(value.panels.length >= 2 && value.panels.every(panel => within(panel, value.stage)), id + ': overlays inside stage');
  for (const button of value.buttons) check(button.width >= 44 && button.height >= 44 && button.font >= 11.95 && within(button, value.stage), id + ': native44/readable12 control ' + button.id, button);
  for (const text of value.texts) check(text.font >= 11.95 && text.fragments.length > 0 && text.fragments.every(fragment => within(fragment, value.stage)), id + ': actual text remains readable and inside stage', text);
  equal(value.actors.map(actor => actor.id).sort(), ['cutin-aatami-rig-v01', 'cutin-jaska-rig-v01'], id + ': selected source identities');
  for (const actor of value.actors) check(actor.painted && actor.status === 'ready' && actor.opaque > 1000 && Math.abs(actor.rect.width / actor.rect.height - actor.width / actor.height) < .01, id + ': actual nonblank source actor at original proportions');
  check(value.stylesheet.length === 1 && value.stylesheet[0].loaded && new URL(value.stylesheet[0].href).pathname === '/cabinet/js/v3/scene-club-view.css', id + ': built scoped CSS loaded at rewritten nested URL');
  equal(value.privateControls, 0, id + ': no review/study/restart controls');
  await page.screenshot({ path: path.join(OUT, id + '.png') });
  await page.locator(STAGE).screenshot({ path: path.join(OUT, id + '-stage.png') });
  return value;
}
async function doublePress(page, locator, touch) {
  const r = await locator.boundingBox(); check(r?.width >= 44 && r.height >= 44, 'double press uses native44 target');
  if (touch) { await page.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2); await page.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2); }
  else await page.mouse.dblclick(r.x + r.width / 2, r.y + r.height / 2, { delay: 40 });
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const builder = path.join(ROOT, 'web/tools/build-hub-cabinet.mjs');
  const dataBlock = fs.readFileSync(builder, 'utf8').match(/const DATA = \[([\s\S]*?)\n\];/);
  check(dataBlock, 'builder declares cross-root runtime inputs');
  const dataFiles = [...dataBlock[1].matchAll(/\['([^']+)', '[^']+'\]/g)].map(match => path.join(ROOT, match[1]));
  check(dataFiles.length > 0, 'all declared cross-root inputs included in source guard');
  const inputs = [...filesBelow(path.join(ROOT, 'web')).filter(file => !/^web\/(test|tools)\//.test(path.relative(ROOT, file).split(path.sep).join('/')) && file !== path.join(ROOT, 'web/package.json')), ...filesBelow(path.join(ROOT, 'art/v3')), ...dataFiles, builder, __filename];
  report.sourceHashes = hashes(ROOT, inputs);
  const result = spawnSync(process.execPath, [builder, CABINET], { cwd: ROOT, encoding: 'utf8' });
  fs.writeFileSync(path.join(OUT, 'build.log'), (result.stdout || '') + (result.stderr || ''));
  equal(result.status, 0, 'canonical hub cabinet builder succeeds');
  const builtFiles = filesBelow(CABINET);
  report.builtHashes = hashes(CABINET, builtFiles);
  check(!Object.keys(report.builtHashes).some(file => /^(art-src|test|tools)\//.test(file)), 'flat cabinet contains no source reviews or test/toolchain directories');
  for (const file of ['index.html', 'js/v3/app.js', 'js/v3/scene-club-view.js', 'js/v3/scene-club-actors.js', 'js/v3/scene-club-view.css', 'content/era1-slice-v1.json', 'art/v3/manifest.json']) check(file in report.builtHashes, 'built runtime dependency: ' + file);
  const manifest = JSON.parse(fs.readFileSync(path.join(CABINET, 'art/v3/manifest.json')));
  for (const id of ['cutin-jaska-rig-v01', 'cutin-aatami-rig-v01', 'cutin-aatami-front-rig-v01', 'scene-scene-club-v01']) {
    const asset = manifest.assets.find(a => a.id === id); check(asset, 'retained built source ' + id);
    for (const member of asset.file ? [asset] : asset.members) equal(report.builtHashes['art/v3/' + member.file], member.sha256, 'built source pixels match registered hash: ' + member.file);
  }
  const content = JSON.parse(fs.readFileSync(path.join(CABINET, 'content/era1-slice-v1.json')));
  const engine = await import(pathToFileURL(path.join(CABINET, 'js/v3/state.js')).href + '?v=16');
  const checkpoint = engine.createState(content);
  Object.assign(checkpoint, { scheduleIndex: 2, selectedAnchor: 'makelansilta', mode: 'route', cash: 222.75, markka: 517, debt: 487, seen: { makelansilta: 2 } });
  checkpoint.revealedEncounters.push(SCENE); checkpoint.relationships.jaska = 3; checkpoint.pressure.makelansilta = 2;
  const [hurt, active, missing] = content.crew.map(person => person.id);
  checkpoint.recruited = [hurt, active]; checkpoint.deployed = [active];
  checkpoint.crewStatus[hurt].condition -= 2; checkpoint.crewStatus[hurt].status = 'wounded';
  checkpoint.crewStatus[missing].condition = 0; checkpoint.crewStatus[missing].status = 'missing';
  checkpoint.flags.push('memory:c17-receipt:cabinet-fixture');
  checkpoint.lastFight = { id: 'cabinet-fixture', place: 'Fixture yard', won: false, lines: ['Fixture: a crew member returned wounded.'], stakes: ['Fixture: an earlier outing ended.'] };
  for (let i = 0; i < 3; i++) engine.chargeTrip(checkpoint);
  report.fixture = { description: 'Synthetic Day2 Scene Club checkpoint; no earlier authored choices invented.', state: checkpoint };
  const mime = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary' };
  const server = http.createServer((req, res) => {
    const pathname = new URL(req.url, 'http://local').pathname;
    if (pathname === '/hub/shell.js') { res.writeHead(200, { 'Content-Type': 'text/javascript' }).end('// Explicit inert parent arcade shell fixture.\n'); return; }
    if (!pathname.startsWith('/cabinet/')) { res.writeHead(404).end('outside cabinet'); return; }
    let file = path.resolve(CABINET, '.' + decodeURIComponent(pathname.slice('/cabinet'.length)));
    if (file !== CABINET && !file.startsWith(CABINET + path.sep)) { res.writeHead(403).end(); return; }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file)) { res.writeHead(404).end('missing built dependency'); return; }
    res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' }); fs.createReadStream(file).pipe(res);
  });
  let browser;
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const origin = `http://127.0.0.1:${server.address().port}`, base = origin + '/cabinet/';
    report.url = base;
    browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
    for (const viewport of [{ name: 'phone', width: 390, height: 844, touch: true, choice: 'ask-envelope' }, { name: 'desktop', width: 1280, height: 800, touch: false, choice: 'take-envelope' }, { name: 'landscape', width: 844, height: 390, touch: true, choice: 'leave-it' }]) {
      const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, hasTouch: viewport.touch, isMobile: viewport.touch });
      await seed(context, checkpoint);
      const page = await context.newPage(), resources = watch(page, origin, report.builtHashes);
      const item = { id: viewport.name, choice: viewport.choice, geometry: [] }; report.cases.push(item);
      try {
        await boot(page, base);
        equal((await snapshot(page)).state, checkpoint, 'flat Resume preserves synthetic rich normal checkpoint');
        await page.locator('[data-action="next-step"][data-step="enter"]').click();
        await ready(page); item.geometry.push(await geometry(page, viewport.name + '-arrival'));
        const entered = await snapshot(page);
        equal(entered.state, { ...checkpoint, mode: 'encounter' }, 'native entry preserves every other fixture field');
        const enter = page.locator(`${HOST} #scene-enter`); if (await enter.isVisible()) await enter.click();
        await ready(page);
        const respond = page.locator(`${HOST} #respond`); if (await respond.isVisible()) await doublePress(page, respond, viewport.touch);
        await page.waitForFunction(() => [...document.querySelector('#sceneClubEncounter').shadowRoot.querySelectorAll('[data-choice]')].every(button => !button.disabled && button.getClientRects().length));
        equal(await snapshot(page), entered, 'arrival/Respond changes no actual state or saved bytes');
        const choices = await geometry(page, viewport.name + '-choices'); item.geometry.push(choices);
        equal(choices.choices.map(c => c.id).sort(), Object.keys(EFFECTS).sort(), 'all3 built choices visible');
        for (const authored of content.encounters.find(e => e.id === SCENE).choices) check(choices.choices.find(c => c.id === authored.id).aria === authored.label + '. ' + authored.forecast, 'full authored forecast accessible: ' + authored.id);
        const expected = await page.evaluate(async choiceId => {
          const engine = await import('./js/v3/state.js?v=16'), data = window.__ptv3.data;
          const after = structuredClone(window.__ptv3.state), encounter = data.encounters.get('enc-jaska-receipt');
          const result = engine.chooseEncounter(after, encounter, encounter.choices.find(c => c.id === choiceId), data);
          if (!result.ok) throw Error(result.reason);
          const returned = structuredClone(after); returned.lastFight = null; engine.advanceSchedule(returned, data);
          return { after, returned };
        }, viewport.choice);
        await doublePress(page, page.locator(`${HOST} [data-choice="${viewport.choice}"]`), viewport.touch);
        await page.waitForFunction(choice => window.__ptv3.state.choices['enc-jaska-receipt'] === choice, viewport.choice);
        equal((await snapshot(page)).state, expected.after, 'built native duplicate choice equals one complete engine settlement');
        equal(JSON.parse((await snapshot(page)).save), expected.after, 'built normal save holds exact full result');
        const effect = EFFECTS[viewport.choice];
        check(expected.after.markka - entered.state.markka === effect.markka && expected.after.relationships.jaska - entered.state.relationships.jaska === effect.trust && expected.after.flags.includes(effect.flag), 'independent authored markka/trust/flag effects');
        item.geometry.push(await geometry(page, viewport.name + '-result'));
        const paid = await snapshot(page); await page.reload(); await page.waitForFunction(() => Boolean(window.__ptv3?.data)); await page.locator('#resumeButton').click(); await ready(page);
        equal(await snapshot(page), paid, 'built result reload preserves complete state and exact save bytes');
        equal(await page.locator(`${HOST} [data-choice]`).count(), 0, 'recorded result cannot offer another payment');
        await page.locator(`${HOST} #return`).waitFor({ state: 'visible' });
        await page.waitForFunction(() => !document.querySelector('#sceneClubEncounter').shadowRoot.querySelector('#return').disabled);
        await doublePress(page, page.locator(`${HOST} #return`), viewport.touch);
        await page.waitForSelector('.city-map'); equal(await page.locator(HOST).count(), 0, 'built Continue destroys scene actors and host');
        equal((await snapshot(page)).state, expected.returned, 'built duplicate Continue advances exactly once through real engine');
        equal(JSON.parse((await snapshot(page)).save), expected.returned, 'built returned map is fully persisted');
        check(expected.returned.scheduleIndex === 3 && expected.returned.selectedAnchor === 'makelansilta', 'next Harju lead does not teleport Aatami');
        const returned = await snapshot(page); await page.reload(); await page.waitForFunction(() => Boolean(window.__ptv3?.data)); await page.locator('#resumeButton').click();
        equal(await snapshot(page), returned, 'built map reload neither pays nor advances again');
        await page.screenshot({ path: path.join(OUT, viewport.name + '-map.png') });
        const audit = await page.evaluate(() => window.__cabinetStorageAudit()); equal(audit.accesses, [], 'no private candidate/crew/receipt access'); equal(audit.values, AUX, 'private saves remain byte-identical');
        item.resources = resources(); equal(item.resources.errors, [], 'zero browser/asset/import errors and no outside file closure');
        for (const dependency of ['js/v3/scene-club-view.js', 'js/v3/scene-club-actors.js', 'js/v3/scene-club-view.css', 'art/v3/manifest.json']) check(item.resources.requests.includes('/cabinet/' + dependency), 'actually loaded built dependency: ' + dependency);
        console.log(`PASS ${viewport.name}: built nested cabinet ${viewport.choice}, full save/reload/once-only map return and native9:16 UI`);
      } catch (error) {
        item.error = error.stack || String(error);
        item.dom = await page.locator('body').innerText().catch(() => 'unavailable');
        await page.screenshot({ path: path.join(OUT, viewport.name + '-failure.png') }).catch(() => {});
        throw error;
      } finally { item.resources = resources(); await context.close(); }
    }
    equal(hashes(CABINET, filesBelow(CABINET)), report.builtHashes, 'complete built file closure remains byte-identical');
    equal(hashes(ROOT, inputs), report.sourceHashes, 'runtime, canonical input, builder and test hashes remain unchanged');
    report.sourceUnchanged = report.builtUnchanged = report.passed = true;
  } finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { report.passed = false; report.failures.push(error.stack || String(error)); process.exitCode = 1; console.error(error.stack || error); }).finally(() => {
  report.finishedAt = new Date().toISOString();
  fs.mkdirSync(OUT, { recursive: true }); fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(`${report.passed ? 'PASS' : 'FAIL'} built Scene Club cabinet: ${report.checks} checks, ${report.cases.length} viewport/choice flows. Evidence: ${OUT}`);
});
