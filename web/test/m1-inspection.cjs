// M1 — looking is not being there (design/CLAUDE_MAP_MISSION_NEXT_STEPS.md §1).
//
//   NODE_PATH=$(npm root -g) node web/test/m1-inspection.cjs
//
// Can the player look around the map without silently moving Aatami or
// learning a remote price? Every action under test goes through a visible
// control (a click, a tap, a key); `__ptv3.debug.setState` is used ONLY to set
// up a clearly labelled prerequisite fixture (case 7), never to perform the
// action being checked. "Unchanged" is checked on the WHOLE serialized campaign
// and on the persisted save, not on a chosen handful of fields.
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
const snap = page => page.evaluate(() => ({
  state: JSON.stringify(window.__ptv3.state),
  save: JSON.stringify(Object.entries(localStorage).sort()),
}));
const S = page => page.evaluate(() => structuredClone(window.__ptv3.state));
const panel = page => page.locator('.inspect-panel');
const attr = async (page, name) => (await panel(page).count()) ? panel(page).getAttribute(name) : null;
async function boot(page, base, { resume = false } = {}) {
  await page.goto(`${base}/web/`);
  await page.waitForFunction(() => Boolean(window.__ptv3?.data));
  await page.locator(resume ? '#resumeButton' : '#beginButton').click();
  await page.waitForSelector('.city-map');
}
async function tapAnchor(page, id, how = 'click') {
  const hit = page.locator(`[data-anchor-group="${id}"] .map-anchor-hit`);
  if (how === 'key') { await hit.focus(); await page.keyboard.press('Enter'); }
  else if (how === 'tap') await hit.tap({ force: true });
  else await hit.click({ force: true });
}
// Back to the map by whatever control is actually on screen. Encounter and
// battle are committed context and HIDE the mode nav (UX_SPEC §3.2), so from
// the away-from-lead screen its own MAP button is the only way out.
async function toRoute(page) {
  const mode = await page.locator('#game').getAttribute('data-mode');
  if (mode === 'route') return page.waitForSelector('.city-map');
  if (await page.locator('[data-action="go-lead"]').count()) await page.locator('[data-action="go-lead"]').click();
  else if (await page.locator('[data-action="leave-visit"]').count()) await page.locator('[data-action="leave-visit"]').click();
  else await page.locator('[data-mode-target="route"]').click();
  await page.waitForSelector('.city-map');
}

server.listen(0, '127.0.0.1', async () => {
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  try {
    // ── 1. cold start, then Resume ──────────────────────────────────
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 820 } });
    const page = await ctx.newPage();
    const errs = watchErrors(page);
    await boot(page, base);
    ok('1 cold start: Begin lands on the real map', await page.locator('#game').getAttribute('data-mode') === 'route'
      && await page.locator('[data-anchor-group]').count() === 15);
    const start = await S(page);
    const anchors = await page.evaluate(() => [...window.__ptv3.data.anchors.values()].map(a => ({ id: a.id, s: a.sliceState })));
    const kind = s => anchors.filter(a => a.s === s).map(a => a.id);
    const remoteActive = kind('active').find(id => id !== start.selectedAnchor && id !== 'siltasaari');
    const locked = [...kind('locked'), ...kind('teaser')][0];
    const landmark = kind('landmark')[0];
    ok('1 fixture: an active, a locked and a landmark anchor exist', Boolean(remoteActive && locked && landmark), JSON.stringify({ remoteActive, locked, landmark }));
    ok('1 presence, lead and inspection start together at Piritori',
      await attr(page, 'data-present') === 'piritori' && await attr(page, 'data-lead') === 'piritori' && await attr(page, 'data-inspected') === 'piritori');

    // ── 2. inspecting changes nothing ───────────────────────────────
    for (const [label, id] of [['an active area', remoteActive], ['a locked area', locked], ['a landmark', landmark]]) {
      const before = await snap(page);
      await tapAnchor(page, id);
      const after = await snap(page);
      ok(`2 inspecting ${label} (${id}) leaves the whole campaign unchanged`, after.state === before.state, 'state changed');
      ok(`2 inspecting ${label} (${id}) leaves the persisted save unchanged`, after.save === before.save, 'save changed');
      ok(`2 the panel names ${id} as inspected while Aatami stays at Piritori`,
        await attr(page, 'data-inspected') === id && await attr(page, 'data-present') === 'piritori');
    }
    await tapAnchor(page, locked);
    ok('2 a locked area offers no Use area', await page.locator('[data-action="use-area"]').count() === 0);
    await tapAnchor(page, landmark);
    ok('2 a landmark offers no Use area', await page.locator('[data-action="use-area"]').count() === 0);

    // ── 3. Show lead is a look; Use area is the one deliberate move ─
    await tapAnchor(page, remoteActive);
    let before = await snap(page);
    await page.locator('[data-action="show-lead"]').click();
    let after = await snap(page);
    ok('3 Show lead points the inspection at the lead', await attr(page, 'data-inspected') === 'piritori');
    ok('3 Show lead changes neither campaign nor save', after.state === before.state && after.save === before.save);

    await tapAnchor(page, remoteActive);
    before = await S(page);
    await page.locator('[data-action="use-area"]').click();
    after = await S(page);
    ok('3 Use area moves presence', after.selectedAnchor === remoteActive, after.selectedAnchor);
    ok('3 Use area observes the area it moves to', after.seen?.[remoteActive] === after.scheduleIndex);
    ok('3 Use area spends no time and no money', after.scheduleIndex === before.scheduleIndex && after.cash === before.cash
      && JSON.stringify(after.stock) === JSON.stringify(before.stock));
    const strip = s => { const c = structuredClone(s); delete c.selectedAnchor; delete c.seen; return JSON.stringify(c); };
    ok('3 Use area changes nothing but presence and that one observation', strip(after) === strip(before));
    ok('3 Use area was persisted', await page.evaluate(k => JSON.parse(Object.values(localStorage).find(v => v.includes('"selectedAnchor"')) || '{}').selectedAnchor === k, remoteActive));

    // ── 4. away from the lead: no remote encounter ──────────────────
    await tapAnchor(page, 'piritori');
    ok('4 inspecting the lead from elsewhere offers no Enter', await page.locator('[data-action="open-encounter"]').count() === 0);
    before = await snap(page);
    await page.locator('[data-mode-target="encounter"]').click();
    ok('4 the ENCOUNTER tab from elsewhere offers no choices', await page.locator('[data-action="choose"]').count() === 0);
    ok('4 the ENCOUNTER tab from elsewhere offers no LOOK', await page.locator('[data-action="inspect"]').count() === 0);
    after = await snap(page);
    const noMode = s => { const c = JSON.parse(s); delete c.mode; delete c.newsReturnMode; return JSON.stringify(c); };
    ok('4 the ENCOUNTER tab from elsewhere learns nothing and changes nothing but the tab', noMode(after.state) === noMode(before.state));
    await toRoute(page);
    await tapAnchor(page, 'piritori');
    await page.locator('[data-action="use-area"]').click();
    ok('4 returning explicitly puts Aatami back at the lead', (await S(page)).selectedAnchor === 'piritori');
    ok('4 and the lead can be entered again', await page.locator('[data-action="open-encounter"]').isVisible());

    // ── 5. routes: preview and cancel are free; pinning is not travel ─
    before = await snap(page);
    await page.locator('[data-action="plan-route"]').click();
    await tapAnchor(page, 'hakaniemi');
    ok('5 a route preview draws a path', await page.locator('.map-route').count() === 1);
    await page.locator('[data-action="cancel-route"]').click();
    after = await snap(page);
    ok('5 preview then cancel changes nothing', after.state === before.state && after.save === before.save);
    await page.locator('[data-action="plan-route"]').click();
    await tapAnchor(page, 'hakaniemi');
    const beforePin = await S(page);
    await page.locator('[data-action="commit-route"]').click();
    const pinned = await S(page);
    ok('5 pinning the delivery route records it', Array.isArray(pinned.route?.path) && pinned.route.path.at(-1) === 'hakaniemi');
    ok('5 pinning a route is not personal travel', pinned.selectedAnchor === beforePin.selectedAnchor
      && pinned.scheduleIndex === beforePin.scheduleIndex && pinned.cash === beforePin.cash);

    // ── 6. the opening purchase and sale, with reloads ──────────────
    // Tapping a route's destination also inspected it; look back at the lead.
    await page.locator('[data-action="show-lead"]').click();
    await page.locator('[data-action="open-encounter"]').click();
    ok('6 cash starts at €160, stock 0', (await S(page)).cash === 160 && (await S(page)).stock.piri === 0);
    await page.locator('[data-choice="buy"]').click();
    const bought = await S(page);
    ok('6 buying: €160 → €115, stock 0 → 1', bought.cash === 115 && bought.stock.piri === 1);
    await page.reload(); await page.waitForFunction(() => Boolean(window.__ptv3?.data));
    await page.locator('#resumeButton').click();
    const reloaded = await S(page);
    ok('6 reload after buying keeps €115 and one pack', reloaded.cash === 115 && reloaded.stock.piri === 1);
    ok('6 the purchase cannot be taken twice', await page.locator('[data-choice="buy"]').count() === 0
      || (await page.locator('[data-choice="buy"]').click().then(() => true), (await S(page)).cash === 115));
    if (await page.locator('#game').getAttribute('data-mode') !== 'encounter') await page.locator('[data-mode-target="encounter"]').click();
    await page.locator('[data-action="advance"]').click();
    const moved = await S(page);
    ok('6 the story moves the lead to Siltasaari', await attr(page, 'data-lead') === 'siltasaari');
    ok('6 M1 keeps the existing schedule move (M2 separates it)', moved.selectedAnchor === 'siltasaari');
    ok('6 inspection resets with the schedule', await attr(page, 'data-inspected') === 'siltasaari');
    await page.locator('[data-action="open-encounter"]').click();
    await page.locator('[data-choice="complete"]').click();
    const sold = await S(page);
    ok('6 selling: €115 → €183, stock 1 → 0', sold.cash === 183 && sold.stock.piri === 0);
    await page.reload(); await page.waitForFunction(() => Boolean(window.__ptv3?.data));
    await page.locator('#resumeButton').click();
    ok('6 reload after the sale keeps €183 and no pack', (await S(page)).cash === 183 && (await S(page)).stock.piri === 0);
    ok('6 the sale cannot be settled twice', await page.locator('[data-choice="complete"]').count() === 0);

    // ── 7. a return visit through the map ───────────────────────────
    // FIXTURE (setup only): Toko's quiet-voice encounter already answered, so
    // his after-service visit is available at Vaasankatu. Presence is left at
    // Siltasaari: reaching Vaasankatu is the action under test.
    await page.evaluate(() => {
      const next = structuredClone(window.__ptv3.state);
      next.choices['enc-toko-quiet-voice'] = next.choices['enc-toko-quiet-voice'] ?? 'fixture';
      next.mode = 'route';
      window.__ptv3.debug.setState(next);
    });
    await toRoute(page);
    await tapAnchor(page, 'vaasankatu');
    ok('7 inspecting Vaasankatu from elsewhere offers no visit', await page.locator('[data-action="open-visit"]').count() === 0);
    await page.locator('[data-action="use-area"]').click();
    ok('7 being at Vaasankatu offers the visit', await page.locator('[data-action="open-visit"]').count() === 1);
    await page.locator('[data-action="open-visit"]').click();
    ok('7 the visit opens', await page.locator('#game').getAttribute('data-mode') === 'visit');
    await page.locator('[data-action="leave-visit"]').click();
    ok('7 leaving returns to the map with the visit still offered', await page.locator('[data-action="open-visit"]').count() === 1);
    await page.locator('[data-action="open-visit"]').click();
    const choice = page.locator('[data-action="choose"]').first();
    await choice.click();
    const visited = await S(page);
    ok('7 a visit choice is recorded once', Boolean(visited.choices['visit-toko-after-service']));
    if (await page.locator('[data-action="leave-visit"]').count()) await page.locator('[data-action="leave-visit"]').click();
    await toRoute(page);
    ok('7 a finished visit is not offered again', await page.locator('[data-action="open-visit"]').count() === 0);

    // ── 8. keyboard, touch, and Begin/reset/Resume ──────────────────
    before = await snap(page);
    await tapAnchor(page, 'hakaniemi', 'key');
    after = await snap(page);
    ok('8 keyboard Enter on an anchor inspects it', await attr(page, 'data-inspected') === 'hakaniemi');
    ok('8 keyboard inspection changes nothing', after.state === before.state && after.save === before.save);
    await page.reload(); await page.waitForFunction(() => Boolean(window.__ptv3?.data));
    await page.locator('#resumeButton').click(); await toRoute(page);
    ok('8 Resume clears a stale inspection', await attr(page, 'data-inspected') === (await S(page)).selectedAnchor);
    ok('8 no browser errors on the desktop route', errs().length === 0, errs().join(' | '));
    await ctx.close();

    for (const [name, viewport] of [['portrait', { width: 390, height: 844 }], ['landscape', { width: 844, height: 390 }]]) {
      const tctx = await browser.newContext({ viewport, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
      const tp = await tctx.newPage();
      const terr = watchErrors(tp);
      await boot(tp, base);
      const b = await snap(tp);
      await tapAnchor(tp, 'hakaniemi', 'tap');
      const a = await snap(tp);
      ok(`8 ${name} touch: a tap inspects without moving`, await attr(tp, 'data-inspected') === 'hakaniemi' && a.state === b.state);
      for (const sel of ['[data-action="use-area"]', '[data-action="show-lead"]']) {
        const box = await tp.locator(sel).boundingBox();
        ok(`8 ${name} touch: ${sel} is reachable and at least 44px`, Boolean(box) && box.height >= 44 && box.width >= 44, JSON.stringify(box));
      }
      await tp.locator('[data-action="use-area"]').scrollIntoViewIfNeeded();
      await tp.locator('[data-action="use-area"]').tap();
      ok(`8 ${name} touch: Use area moves Aatami`, (await S(tp)).selectedAnchor === 'hakaniemi');
      await tp.screenshot({ path: path.join(process.env.M1_CAPTURE_DIR || '/tmp', `m1-${name}.png`) });
      // Begin again over the save: a new campaign starts at Piritori with no
      // leftover cursor.
      await tp.goto(`${base}/web/`); await tp.waitForFunction(() => Boolean(window.__ptv3?.data));
      await tp.locator('#beginButton').tap(); await tp.waitForSelector('.city-map');
      ok(`8 ${name}: Begin over a save starts clean at Piritori`, (await S(tp)).selectedAnchor === 'piritori'
        && await attr(tp, 'data-inspected') === 'piritori');
      ok(`8 ${name}: no browser errors`, terr().length === 0, terr().join(' | '));
      await tctx.close();
    }
  } catch (error) {
    ok('unhandled M1 gate error', false, error.stack || error.message);
  } finally {
    await browser.close();
    server.close();
    console.log(`\n  ${passed} passed, ${failed} failed`);
    process.exit(failed ? 1 : 0);
  }
});
