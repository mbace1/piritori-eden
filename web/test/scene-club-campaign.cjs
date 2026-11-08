// The approved Scene Club view, reached through the real campaign.
// NODE_PATH=$(npm root -g) node web/test/scene-club-campaign.cjs
// Fixtures enrich an earned save; choices, travel, reload and continuation use
// native controls. The normal engine is the full-state settlement oracle.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '../..');
const OUT = process.env.SCENE_CLUB_CAPTURE_DIR || '/tmp/piritori-scene-club-campaign';
const SAVE = 'piritori-to-eden:v3';
const ENCOUNTER = 'enc-jaska-receipt';
const HOST = '#sceneClubEncounter';
const STAGE = `${HOST} .scene-club.world.scene-view`;
const AUX = {
  'piritori:restart:scene-club:v1': '{"sentinel":"standalone review is separate"}',
  'piritori-c12-crew-v1': '{"sentinel":"standalone roster and equipment"}',
  'piritori-c19-outing-v1': '{"sentinel":"existing Night Shift receipt"}',
};
const EFFECTS = {
  'ask-envelope': { markka: 300, trust: 1, flag: 'markka-explained' },
  'take-envelope': { markka: 300, trust: -1, flag: 'jaska-money-taken' },
  'leave-it': { markka: 0, trust: 2, flag: 'markka-left-with-jaska' },
};
const content = JSON.parse(fs.readFileSync(path.join(ROOT, 'content/era1-slice-v1.json')));
const authored = content.encounters.find(encounter => encounter.id === ENCOUNTER);
const report = { startedAt: new Date().toISOString(), checks: 0, cases: [], failures: [], limits: ['Browser emulation, not physical Pixel/iPad acceptance.', 'Scene Club has no authored combat choice; existing C.19 suites own actual battles.', 'The returned Kallio map remains the existing campaign map.'] };
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary' };
const server = http.createServer((req, res) => {
  let file;
  try { file = path.resolve(ROOT, '.' + decodeURIComponent(req.url.split('?')[0])); }
  catch { res.writeHead(400).end(); return; }
  if (!file.startsWith(ROOT + path.sep)) { res.writeHead(403).end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file)) { res.writeHead(404).end('missing'); return; }
  res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
const check = (condition, label, detail) => { report.checks++; assert(condition, `${label}${detail === undefined ? '' : ': ' + JSON.stringify(detail)}`); };
const equal = (actual, expected, label) => { report.checks++; assert.deepEqual(actual, expected, label); };
const state = page => page.evaluate(() => JSON.parse(JSON.stringify(window.__ptv3.state)));
const saved = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), SAVE);
const snapshot = page => page.evaluate(key => ({ state: JSON.stringify(window.__ptv3.state), save: localStorage.getItem(key) }), SAVE);
const within = (a, b, slack = .5) => a.left >= b.left - slack && a.right <= b.right + slack && a.top >= b.top - slack && a.bottom <= b.bottom + slack;
const signed = n => n > 0 ? `+${n}` : String(n);

async function storageAudit(context, checkpoint) {
  await context.addInitScript(({ saveKey, initial, auxiliary }) => {
    const get = Storage.prototype.getItem, set = Storage.prototype.setItem, remove = Storage.prototype.removeItem, clear = Storage.prototype.clear;
    if (initial && get.call(localStorage, saveKey) === null) set.call(localStorage, saveKey, JSON.stringify(initial));
    for (const [key, value] of Object.entries(auxiliary)) if (get.call(localStorage, key) === null) set.call(localStorage, key, value);
    const auditKey = 'scene-club-campaign-test:audit';
    const record = (method, key) => {
      if (method !== 'clear' && !(key in auxiliary)) return;
      const rows = JSON.parse(get.call(sessionStorage, auditKey) || '[]');
      rows.push({ method, key }); set.call(sessionStorage, auditKey, JSON.stringify(rows));
    };
    Storage.prototype.getItem = function (key) { if (this === localStorage) record('get', key); return get.call(this, key); };
    Storage.prototype.setItem = function (key, value) { if (this === localStorage) record('set', key); return set.call(this, key, value); };
    Storage.prototype.removeItem = function (key) { if (this === localStorage) record('remove', key); return remove.call(this, key); };
    Storage.prototype.clear = function () { if (this === localStorage) record('clear', null); return clear.call(this); };
    window.__sceneClubStorageAudit = () => ({ accesses: JSON.parse(get.call(sessionStorage, auditKey) || '[]'), values: Object.fromEntries(Object.keys(auxiliary).map(key => [key, get.call(localStorage, key)])) });
  }, { saveKey: SAVE, initial: checkpoint, auxiliary: AUX });
}
async function auditStorage(page) {
  const audit = await page.evaluate(() => window.__sceneClubStorageAudit());
  equal(audit.accesses, [], 'campaign view never opens the candidate, standalone crew or C.19 receipt stores');
  equal(audit.values, AUX, 'all separate stores remain byte-identical');
}
function watch(page) {
  const errors = [], requests = []; let shellMisses = 0;
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('request', request => requests.push(new URL(request.url()).pathname));
  page.on('response', response => { if (response.status() === 404 && new URL(response.url()).pathname.endsWith('/hub/shell.js')) shellMisses++; });
  page.on('requestfailed', request => { if (!request.url().endsWith('/hub/shell.js') && request.failure()?.errorText !== 'net::ERR_ABORTED') errors.push(`${request.url()}: ${request.failure()?.errorText}`); });
  return () => {
    let forgive = shellMisses;
    equal(errors.filter(error => !(forgive > 0 && /Failed to load resource: .*404/.test(error) && forgive--)), [], 'no unexpected browser errors');
    check(!requests.some(url => /\/art-src\//.test(url)), 'production has no source-review/workbench dependency');
    check(!requests.some(url => /\/art\/v3\/(characters|cast|ui)\/|\/lantern\.css|\/chrome\.js|\/scene-speaker\.js/.test(url)), 'no deleted cast/UI dependency');
    check(!requests.some(url => /\/crew-run\//.test(url)), 'authored noncombat choices do not invent a C.19 outing');
  };
}
async function boot(page, base, resume = false) {
  await page.goto(`${base}/web/?skip`);
  await page.waitForFunction(() => Boolean(window.__ptv3?.data));
  await page.locator(resume ? '#resumeButton' : '#beginButton').click();
}
async function reload(page) {
  const before = await snapshot(page);
  await page.reload();
  await page.waitForFunction(() => Boolean(window.__ptv3?.data));
  await page.locator('#resumeButton').click();
  equal(await snapshot(page), before, 'Resume preserves the complete campaign and exact serialized save');
}
async function doublePress(page, locator, touch) {
  const button = await locator.boundingBox();
  check(button?.width >= 44 && button?.height >= 44, 'native double press starts on a real 44px target', button);
  if (touch) {
    await page.touchscreen.tap(button.x + button.width / 2, button.y + button.height / 2);
    await page.touchscreen.tap(button.x + button.width / 2, button.y + button.height / 2);
  } else await page.mouse.dblclick(button.x + button.width / 2, button.y + button.height / 2, { delay: 40 });
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
function uiUnion(panels, stage) {
  const xs = [...new Set(panels.flatMap(panel => [panel.left, panel.right]))].sort((a, b) => a - b);
  let area = 0;
  for (let i = 1; i < xs.length; i++) {
    const intervals = panels.filter(panel => panel.left < xs[i] && panel.right > xs[i - 1]).map(panel => [panel.top, panel.bottom]).sort((a, b) => a[0] - b[0]);
    let covered = 0, end = -Infinity;
    for (const [a, b] of intervals) { covered += Math.max(0, b - Math.max(a, end)); end = Math.max(end, b); }
    area += (xs[i] - xs[i - 1]) * covered;
  }
  const top = Math.max(0, ...panels.filter(panel => panel.band === 'top').map(panel => panel.bottom - stage.top));
  const bottom = Math.max(0, ...panels.filter(panel => panel.band === 'bottom').map(panel => stage.bottom - panel.top));
  return { area, areaRatio: area / (stage.width * stage.height), top, bottom, heightRatio: (top + bottom) / stage.height };
}
async function geometry(page, id, capture = true) {
  await ready(page);
  const value = await page.evaluate(() => {
    const host = document.querySelector('#sceneClubEncounter'), root = host.shadowRoot, stage = root.querySelector('.scene-club.world.scene-view');
    const rect = element => { const r = element.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; };
    const inside = (a, b) => a.left >= b.left - .5 && a.right <= b.right + .5 && a.top >= b.top - .5 && a.bottom <= b.bottom + .5;
    const clipBox = element => {
      const clip = rect(stage);
      for (let node = element.parentElement; node instanceof Element && node !== host; node = node.parentElement || node.getRootNode()?.host) {
        const css = getComputedStyle(node), r = rect(node);
        if (/(hidden|clip|auto|scroll)/.test(css.overflowX)) { clip.left = Math.max(clip.left, r.left); clip.right = Math.min(clip.right, r.right); }
        if (/(hidden|clip|auto|scroll)/.test(css.overflowY)) { clip.top = Math.max(clip.top, r.top); clip.bottom = Math.min(clip.bottom, r.bottom); }
      }
      return clip;
    };
    const painted = element => {
      if (!element) return false;
      let opacity = 1;
      for (let node = element; node instanceof Element; node = node.parentElement || node.getRootNode()?.host) {
        const css = getComputedStyle(node);
        if (css.display === 'none' || css.visibility !== 'visible' || css.contentVisibility === 'hidden') return false;
        opacity *= Number(css.opacity);
      }
      const r = rect(element), clip = clipBox(element);
      return opacity > .1 && Math.min(r.right, clip.right) > Math.max(r.left, clip.left) && Math.min(r.bottom, clip.bottom) > Math.max(r.top, clip.top);
    };
    const box = rect(stage), scale = box.width / stage.clientWidth;
    const menu = root.querySelector('.scene-menu');
    const panels = [...root.querySelectorAll('.scene-header,.encounter-overlay,.scene-menu > summary,.scene-menu[open] > :not(summary)')].filter(painted).map(element => ({ ...rect(element), name: element.id || element.className || element.tagName, band: element.closest('.scene-menu') ? menu.open ? 'bottom' : 'top' : element.matches('.scene-header') ? 'top' : 'bottom' }));
    const text = [], walker = document.createTreeWalker(stage, NodeFilter.SHOW_TEXT);
    for (let node; (node = walker.nextNode());) {
      if (!node.textContent.trim() || !painted(node.parentElement)) continue;
      const range = document.createRange(); range.selectNodeContents(node);
      const clip = clipBox(node.parentElement), scrollingMenu = Boolean(node.parentElement.closest('.scene-menu-controls'));
      const fragments = [...range.getClientRects()].map(r => ({ left: r.left, top: r.top, right: r.right, bottom: r.bottom }));
      text.push({ value: node.textContent.trim(), font: parseFloat(getComputedStyle(node.parentElement).fontSize) * scale, fragments: scrollingMenu ? fragments.filter(r => inside(r, clip)) : fragments, unclipped: scrollingMenu || fragments.every(r => inside(r, clip)) });
    }
    const buttons = [...root.querySelectorAll('button,summary')].filter(painted).map(button => ({ ...rect(button), id: button.id || button.dataset.choice || button.tagName, disabled: Boolean(button.disabled), font: parseFloat(getComputedStyle(button).fontSize) * scale, fullyVisible: inside(rect(button), clipBox(button)), scrollingMenu: Boolean(button.closest('.scene-menu-controls')) }));
    const choices = [...root.querySelectorAll('[data-choice]')].map(button => ({ id: button.dataset.choice, painted: painted(button), disabled: button.disabled, label: button.getAttribute('aria-label') || button.textContent, rect: rect(button), text: button.innerText }));
    const actors = [...root.querySelectorAll('canvas.actor')].map(canvas => {
      const thumbnail = document.createElement('canvas'); thumbnail.width = thumbnail.height = 48;
      const context = thumbnail.getContext('2d'); context.drawImage(canvas, 0, 0, 48, 48);
      const pixels = context.getImageData(0, 0, 48, 48).data;
      let opaque = 0; for (let i = 3; i < pixels.length; i += 4) if (pixels[i] > 10) opaque++;
      return { id: canvas.dataset.rig, who: canvas.dataset.actor, status: canvas.dataset.status, painted: painted(canvas), width: canvas.width, height: canvas.height, rect: rect(canvas), opaque };
    });
    const chrome = [...document.querySelectorAll('#game .topbar,#game .mode-nav,#game #modeRoot > :not(#sceneClubEncounter)')].filter(painted).map(element => element.id || element.className);
    return { viewport: { width: innerWidth, height: innerHeight }, stage: box, frame: rect(root.querySelector('.scene-club-frame')), scale, panels, buttons, text, actors, choices, chrome, density: stage.dataset.uiDensity, uiStage: stage.dataset.uiStage, menu: menu.open, pageOverflow: document.documentElement.scrollWidth > innerWidth + 1 || document.documentElement.scrollHeight > innerHeight + 1, oldTalk: document.querySelectorAll('.cutin').length, review: root.querySelectorAll('#review-tools,[data-study],#restart,#scale,#pair').length };
  });
  value.budget = uiUnion(value.panels, value.stage);
  const screen = { left: 0, top: 0, right: value.viewport.width, bottom: value.viewport.height };
  const expectedWidth = Math.min(value.viewport.width, value.viewport.height * 9 / 16), expectedHeight = expectedWidth * 16 / 9;
  check(within(value.stage, screen) && !value.pageOverflow, `${id}: maximum-fit stage stays on screen without page overflow`, value.stage);
  check(Math.abs(value.stage.width - expectedWidth) < 1 && Math.abs(value.stage.height - expectedHeight) < 1, `${id}: actual fixed 9:16 maximum fit`, value.stage);
  check(Math.abs(value.stage.left + value.stage.width / 2 - value.viewport.width / 2) < 1 && Math.abs(value.stage.top + value.stage.height / 2 - value.viewport.height / 2) < 1, `${id}: frame is centered in the letterbox`);
  check(Math.abs(value.scale - 1) < .01, `${id}: native CSS pixels, no scaled-down controls`);
  check(value.budget.areaRatio <= .5 + 1e-5 && value.budget.heightRatio <= .5 + .5 / value.stage.height, `${id}: combined UI union and inset-inclusive bands use at most 50%`, value.budget);
  check(value.panels.length > 0 && value.panels.every(panel => within(panel, value.stage)), `${id}: every painted UI panel is inside the stage`, value.panels);
  equal(value.chrome, [], `${id}: compatibility HUD/navigation/panels do not add hidden UI coverage`);
  equal(value.oldTalk, 0, `${id}: no duplicate legacy cut-in`);
  equal(value.review, 0, `${id}: no candidate review/restart/study controls in the campaign`);
  for (const button of value.buttons) check((button.scrollingMenu || button.fullyVisible && within(button, value.stage)) && button.width >= 44 && button.height >= 44 && button.font >= 11.95, `${id}: ${button.id} retains native44/readable12 size and stays visible outside the scrollable menu`, button);
  for (const text of value.text) check(text.font >= 11.95 && text.unclipped && text.fragments.every(fragment => within(fragment, value.stage)), `${id}: actual text is readable and unclipped outside the scrollable menu`, text);
  equal(value.actors.map(actor => actor.id).sort(), ['cutin-aatami-rig-v01', 'cutin-jaska-rig-v01'], `${id}: the approved side Aatami/Jaska pair`);
  for (const actor of value.actors) check(actor.painted && actor.status === 'ready' && actor.opaque > 10 && Math.abs(actor.rect.width / actor.rect.height - actor.width / actor.height) < .01, `${id}: ${actor.who} source is actually painted at its original proportions`, actor);
  if (capture) {
    // A native desktop double press may select result words. Clear that
    // transient browser selection for the capture; campaign state is untouched.
    await page.evaluate(() => window.getSelection()?.removeAllRanges());
    await page.screenshot({ path: path.join(OUT, `${id}.png`) });
    await page.locator(STAGE).screenshot({ path: path.join(OUT, `${id}-stage.png`) });
  }
  report.cases.push({ id, ...value });
  return value;
}
async function enterDialogue(page, id, touch) {
  await ready(page);
  const enter = page.locator(`${HOST} #scene-enter`);
  if (await enter.isVisible()) {
    const before = await snapshot(page);
    const arrival = await geometry(page, `${id}-arrival`);
    check(arrival.text.some(text => text.value === authored.opening.match(/[^.!?]+[.!?]+|[^.!?]+$/g)[0].trim()), `${id}: first authored arrival sentence is retained`);
    await doublePress(page, enter, touch);
    equal(await snapshot(page), before, `${id}: a native double arrival changes presentation only`);
    equal((await state(page)).choices[ENCOUNTER], undefined, `${id}: repeated arrival Continue cannot select an authored choice`);
    await page.waitForFunction(() => {
      const choices = [...(document.querySelector('#sceneClubEncounter')?.shadowRoot.querySelectorAll('[data-choice]') || [])];
      return choices.length === 3 && choices.every(button => !button.disabled);
    });
  }
}
async function choices(page, id, touch) {
  await enterDialogue(page, id, touch);
  const before = await snapshot(page);
  const dialogue = await geometry(page, `${id}-dialogue`);
  const respond = page.locator(`${HOST} #respond`);
  if (await respond.isVisible()) {
    check(dialogue.uiStage === 'dialogue' && dialogue.choices.length === 3 && dialogue.choices.every(choice => !choice.painted), `${id}: dialogue-first keeps all authored choices`);
    await doublePress(page, respond, touch);
    equal(await snapshot(page), before, `${id}: Respond and a repeated native tap cannot choose accidentally`);
  }
  await page.waitForFunction(() => {
    const root = document.querySelector('#sceneClubEncounter')?.shadowRoot;
    const choices = [...(root?.querySelectorAll('[data-choice]') || [])];
    return choices.length === 3 && choices.every(button => !button.disabled && button.getClientRects().length && getComputedStyle(button).visibility === 'visible');
  });
  const view = await geometry(page, `${id}-choices`);
  const visible = view.choices.filter(choice => choice.painted);
  equal(visible.map(choice => choice.id).sort(), Object.keys(EFFECTS).sort(), `${id}: every authored decision is simultaneously visible`);
  for (const choice of authored.choices) {
    const button = visible.find(item => item.id === choice.id), effect = EFFECTS[choice.id];
    check(button.label.includes(choice.label) && button.label.includes(choice.forecast), `${id}: complete authored choice and forecast remain accessible`);
    const compact = `${effect.markka ? signed(effect.markka) + ' mk' : 'No bank offer'} · trust ${signed(effect.trust)}`;
    check(button.text.includes(choice.forecast) || button.text.includes(compact), `${id}: each visible choice states its full forecast or exact compact stakes`, button.text);
  }
  equal(await snapshot(page), before, `${id}: opening all choices does not spend time or alter the save`);
}
async function clean(page, id) {
  await page.waitForSelector('.city-map');
  equal(await page.locator(HOST).count(), 0, `${id}: scene host and all shadow actors are destroyed on exit`);
  equal(await page.locator('.cutin').count(), 0, `${id}: no legacy talk remains on the map`);
}
async function oracle(page, choiceId) {
  return page.evaluate(async choiceId => {
    const engine = await import('./js/v3/state.js?v=16');
    const data = window.__ptv3.data, before = JSON.parse(JSON.stringify(window.__ptv3.state));
    const encounter = data.encounters.get('enc-jaska-receipt'), choice = encounter.choices.find(choice => choice.id === choiceId);
    const after = structuredClone(before), result = engine.chooseEncounter(after, encounter, choice, data);
    if (!result.ok) throw Error(result.reason);
    const returned = structuredClone(after); returned.lastFight = null; engine.advanceSchedule(returned, data);
    return { before, after, returned, actionsBefore: engine.actionsLeft(before), actionsAfter: engine.actionsLeft(returned) };
  }, choiceId);
}
async function earnedCheckpoint(browser, base) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  await storageAudit(context);
  const page = await context.newPage(), errors = watch(page);
  try {
    await boot(page, base);
    const step = () => page.locator('[data-action="next-step"]').tap();
    await step(); await page.locator('[data-choice="buy"]').tap(); await page.locator('[data-action="advance"]').tap();
    await step(); await step(); await step();
    await page.locator('[data-choice="complete"]').tap(); await page.locator('[data-action="advance"]').tap();
    const away = await state(page);
    check(away.scheduleIndex === 2 && away.selectedAnchor === 'siltasaari' && away.cash === 183 && away.debt === 355 && away.markka === 300, 'real opening trade/night reaches Day2 without teleporting or resetting the economy', away);
    equal(await page.locator(HOST).count(), 0, 'Scene Club does not mount remotely');
    const before = await snapshot(page);
    await page.locator('[data-anchor-group="makelansilta"] .map-anchor-hit').tap({ force: true });
    equal(await snapshot(page), before, 'inspecting Scene Club changes neither complete state nor saved bytes');
    await page.locator('[data-action="plan-journey"]').tap();
    equal(await snapshot(page), before, 'planning Scene Club travel changes neither complete state nor saved bytes');
    await page.locator('[data-action="commit-journey"]').tap();
    const arrived = await state(page);
    check(arrived.scheduleIndex === 2 && arrived.selectedAnchor === 'makelansilta' && arrived.cash === away.cash && arrived.time.block === 2 && arrived.time.spent === 3, 'explicit travel arrives once and spends the real30% block cost');
    await page.locator('[data-action="open-encounter"]').tap();
    await ready(page);
    const travelToast = await page.locator('#toast').evaluate(toast => ({ hidden: toast.hidden, text: toast.textContent }));
    equal(travelToast.hidden, true, 'entering Scene Club dismisses the parent campaign travel toast');
    equal(travelToast.text, '', 'entering Scene Club clears stale travel copy from the parent toast');
    await choices(page, 'earned-phone', true);
    const earned = await state(page);
    await page.locator(`${HOST} .scene-menu > summary`).tap();
    await geometry(page, 'earned-phone-menu');
    await page.locator(`${HOST} #scene-back`).tap();
    await clean(page, 'unresolved-back');
    equal(await state(page), { ...earned, mode: 'route' }, 'leaving without answering preserves the earned campaign and does not turn the block');
    await reload(page); await clean(page, 'unresolved-map-reload');
    await page.locator('[data-action="next-step"][data-step="enter"]').tap();
    await ready(page); await reload(page); await ready(page);
    equal(await state(page), earned, 're-enter/reload cannot add a trip, choice or invented checkpoint');
    const checkpoint = await page.evaluate(async () => {
      const engine = await import('./js/v3/state.js?v=16'), s = structuredClone(window.__ptv3.state), data = window.__ptv3.data;
      const [wounded, active, missing] = data.content.crew.map(crew => crew.id);
      s.recruited = [wounded, active]; s.deployed = [active];
      s.crewStatus[wounded] = { ...s.crewStatus[wounded], condition: Math.max(1, s.crewStatus[wounded].maxCondition - 2), status: 'wounded' };
      s.crewStatus[missing] = { ...s.crewStatus[missing], condition: 0, status: 'missing' };
      const weapon = [...data.equipment.values()].find(item => item.kind === 'weapon');
      s.equipment.push({ id: weapon.id, cond: 2 }); s.pressure.makelansilta = 2; s.pressure.harju = 1;
      s.flags.push('memory:outing-settled:scene-club-integration-receipt');
      s.battleHistory.push({ id: 'scene-club-integration-receipt', source: 'c19-night-shift', kit: 'yard', end: 'police', hurt: 1, result: 'withdraw', round: 3 });
      s.lastFight = { id: 'scene-club-integration-receipt', place: 'Earlier yard fight', won: false, lines: ['A crew member came home wounded.'], stakes: ['The police ended the job.'] };
      s.outing = null; engine.chargeTrip(s); engine.chargeTrip(s);
      return s;
    });
    await auditStorage(page); errors();
    return checkpoint;
  } finally { await context.close(); }
}
async function campaignCase(browser, base, checkpoint, viewport, choiceId) {
  const id = `${viewport.name}-${choiceId}`;
  const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, hasTouch: viewport.touch, isMobile: viewport.touch });
  await storageAudit(context, checkpoint);
  const page = await context.newPage(), errors = watch(page);
  try {
    await boot(page, base, true); await ready(page);
    equal(await state(page), checkpoint, `${id}: normal Resume retains the complete nondefault campaign`);
    await reload(page); await ready(page);
    await choices(page, id, viewport.touch);
    const expected = await oracle(page, choiceId), effect = EFFECTS[choiceId];
    equal(expected.actionsBefore, 0, `${id}: fixture has already spent all three block actions`);
    await doublePress(page, page.locator(`${HOST} [data-choice="${choiceId}"]`), viewport.touch);
    await page.waitForFunction(({ encounter, choiceId }) => window.__ptv3.state.choices[encounter] === choiceId, { encounter: ENCOUNTER, choiceId });
    await ready(page);
    equal(await state(page), expected.after, `${id}: native double choice equals one full engine settlement`);
    equal(await saved(page), expected.after, `${id}: normal save holds the exact once-only result`);
    const resolved = await state(page);
    check(resolved.markka - expected.before.markka === effect.markka && resolved.relationships.jaska - expected.before.relationships.jaska === effect.trust && resolved.flags.includes(effect.flag), `${id}: independently verified authored money/trust/flag`);
    equal(resolved.time, expected.before.time, `${id}: answering does not reset or charge the trip clock`);
    await geometry(page, `${id}-result`);
    await reload(page); await ready(page);
    equal(await state(page), expected.after, `${id}: result reload preserves crew, injuries, pressure, gear and processed receipts`);
    equal(await page.locator(`${HOST} [data-choice]:visible`).count(), 0, `${id}: resolved reload offers no second reward`);
    await page.waitForFunction(() => !document.querySelector('#sceneClubEncounter')?.shadowRoot.querySelector('#return')?.disabled);
    await doublePress(page, page.locator(`${HOST} #return`), viewport.touch);
    await clean(page, id);
    equal(await state(page), expected.returned, `${id}: native double Continue advances exactly once through the real engine`);
    equal(await saved(page), expected.returned, `${id}: the complete returned campaign is persisted`);
    check(expected.returned.scheduleIndex === 3 && expected.returned.selectedAnchor === 'makelansilta' && expected.actionsAfter === 3, `${id}: Harju becomes the next lead while Aatami stays put and the new block allowance is real`);
    await reload(page); await clean(page, `${id}-map-reload`);
    equal(await state(page), expected.returned, `${id}: returned-map reload does not repay, reset crew or advance again`);
    const beforeTravel = await snapshot(page);
    await page.locator('[data-anchor-group="harju"] .map-anchor-hit').click({ force: true });
    equal(await snapshot(page), beforeTravel, `${id}: normal map inspection still changes no save or campaign field`);
    await page.locator('[data-action="plan-journey"]').click();
    equal(await snapshot(page), beforeTravel, `${id}: ordinary journey planning still changes no save or campaign field`);
    await page.locator('[data-action="commit-journey"]').click();
    const travelled = await state(page);
    check(travelled.selectedAnchor === 'harju' && travelled.scheduleIndex === 3 && travelled.time.block === 3 && travelled.time.spent === 3 && travelled.cash === expected.returned.cash, `${id}: ordinary Harju travel still charges exactly one trip, with no fare or extra block`);
    equal(await page.locator(HOST).count(), 0, `${id}: later campaign travel cannot resurrect the disposed scene`);
    await auditStorage(page); errors();
    console.log(`PASS ${id}: full engine state, reload, native duplicate guards, real return/travel and bounded scene UI`);
  } finally { await context.close(); }
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const files = ['web/test/scene-club-campaign.cjs', 'web/index.html', 'web/v3.css', 'art/v3/manifest.json', ...fs.readdirSync(path.join(ROOT, 'web/js/v3')).filter(file => /\.(js|css)$/.test(file)).map(file => `web/js/v3/${file}`)];
  const sourceHashes = () => Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, file))).digest('hex')]));
  report.sourceHashes = sourceHashes();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    const checkpoint = await earnedCheckpoint(browser, base);
    for (const viewport of [{ name: 'phone', width: 390, height: 844, touch: true }, { name: 'desktop', width: 1280, height: 800, touch: false }, { name: 'landscape', width: 844, height: 390, touch: true }]) {
      for (const choiceId of Object.keys(EFFECTS)) await campaignCase(browser, base, checkpoint, viewport, choiceId);
    }
    report.sourceHashesAfter = sourceHashes();
    equal(report.sourceHashesAfter, report.sourceHashes, 'all runtime and test source inputs stayed unchanged throughout the run');
    report.sourceUnchanged = true;
    report.passed = true;
    console.log(`PASS Scene Club campaign: ${report.checks} checks; real earned checkpoint, all3 choices at3 native viewports, exact saves/reloads and ≤50% UI.`);
  } catch (error) {
    report.passed = false; report.failures.push(error.stack || String(error));
    console.error(error.stack || error); process.exitCode = 1;
  } finally {
    report.sourceHashesAfter ??= sourceHashes();
    report.sourceUnchanged ??= JSON.stringify(report.sourceHashesAfter) === JSON.stringify(report.sourceHashes);
    report.finishedAt = new Date().toISOString();
    fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2) + '\n');
    await browser.close(); await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; server.close(); });
