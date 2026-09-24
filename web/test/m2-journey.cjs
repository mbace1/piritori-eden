// M2 — Paper Bag travel (design/CLAUDE_MAP_MISSION_NEXT_STEPS.md §2).
//
//   NODE_PATH=$(npm root -g) node web/test/m2-journey.cjs
//
// Aatami moves only by a JOURNEY the player plans and then commits. Every
// action under test is a visible control (click, double tap, touch tap,
// reload); no debug hook is used at all. The opening money is checked to the
// euro: 160 → 115 → 183, one €23 profit, and no second clock charge.
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
// M2: moving is a JOURNEY — plan it, then TRAVEL. USE AREA is gone.
async function travel(page, id) {
  await tapAnchor(page, id);
  await page.locator('[data-action="plan-journey"]').click();
  await page.locator('[data-action="commit-journey"]').click();
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


const J = page => page.locator('.journey-preview');
async function reloadResume(page) {
  await page.reload(); await page.waitForFunction(() => Boolean(window.__ptv3?.data));
  await page.locator('#resumeButton').click();
}
async function choose(page, id) {
  if (await page.locator('#game').getAttribute('data-mode') !== 'encounter') await page.locator('[data-action="open-encounter"]').click();
  await page.locator(`[data-choice="${id}"]`).click();
}
async function advance(page) {
  await page.locator('[data-action="advance"]').click();
  await page.waitForSelector('.city-map');
}

server.listen(0, '127.0.0.1', async () => {
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  const shots = process.env.M2_CAPTURE_DIR || process.env.M1_CAPTURE_DIR || '/tmp';
  try {
    // ── A. the Paper Bag: purchase → preview → cancel → preview → commit → sale → reload
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 820 } });
    const page = await ctx.newPage();
    const errs = watchErrors(page);
    await boot(page, base);
    await choose(page, 'buy');
    ok('A buying: €160 → €115, stock 0 → 1', (await S(page)).cash === 115 && (await S(page)).stock.piri === 1);
    await advance(page);
    let s = await S(page);
    ok('A after the purchase the LEAD is Siltasaari', await attr(page, 'data-lead') === 'siltasaari');
    ok('A and Aatami is still at Piritori', s.selectedAnchor === 'piritori' && await attr(page, 'data-present') === 'piritori');
    ok('A the panel names both', /AATAMI · PIRITORI/i.test(await page.locator('.presence-line').innerText())
      && /STORY LEAD · SILTASAARI/i.test(await page.locator('.presence-line').innerText()));
    ok('A the sale is not offered from Piritori', await page.locator('[data-action="open-encounter"]').count() === 0);
    ok('A Siltasaari prices are not yet known', s.seen?.siltasaari == null);
    const blockBefore = s.scheduleIndex;

    await tapAnchor(page, 'siltasaari');
    ok('A inspecting Siltasaari offers TRAVEL HERE', await page.locator('[data-action="plan-journey"]').isVisible());
    let before = await snap(page);
    await page.locator('[data-action="plan-journey"]').click();
    ok('A the preview names a connected path from Piritori to Siltasaari',
      await J(page).getAttribute('data-journey') === 'piritori>siltasaari' && await page.locator('.map-journey').count() === 1);
    ok('A the preview says what it costs: no extra time or money, not balanced',
      /no extra time or money/i.test(await J(page).innerText()) && /not balanced/i.test(await J(page).innerText()));
    ok('A the preview is drawn apart from the delivery route', await page.locator('.map-route').count() === 0);
    let after = await snap(page);
    ok('A previewing changes neither campaign nor save', after.state === before.state && after.save === before.save);
    await page.screenshot({ path: path.join(shots, 'm2-preview-desktop.png') });
    await page.locator('[data-action="cancel-journey"]').click();
    after = await snap(page);
    ok('A cancel removes the preview', await J(page).count() === 0 && await page.locator('.map-journey').count() === 0);
    ok('A preview then cancel changes neither campaign nor save', after.state === before.state && after.save === before.save);

    // A preview is local: a reload before commit throws it away.
    await page.locator('[data-action="plan-journey"]').click();
    await reloadResume(page);
    ok('A a reload before commit drops the preview and moves nobody',
      await J(page).count() === 0 && (await S(page)).selectedAnchor === 'piritori');
    // A preview goes stale when the inspection moves.
    await tapAnchor(page, 'siltasaari');
    await page.locator('[data-action="plan-journey"]').click();
    await tapAnchor(page, 'hakaniemi');
    ok('A looking elsewhere discards the plan', await J(page).count() === 0);
    await tapAnchor(page, 'siltasaari');
    ok('A and does not bring it back', await J(page).count() === 0);

    // Commit — with a double tap on TRAVEL.
    await page.locator('[data-action="plan-journey"]').click();
    await page.locator('[data-action="commit-journey"]').scrollIntoViewIfNeeded();
    const box = await page.locator('[data-action="commit-journey"]').boundingBox();
    const pre = await S(page);
    await page.mouse.dblclick(box.x + box.width / 2, box.y + box.height / 2);
    s = await S(page);
    ok('A TRAVEL arrives at Siltasaari', s.selectedAnchor === 'siltasaari' && await attr(page, 'data-present') === 'siltasaari');
    ok('A a double tap arrives once: one log line', s.logs.filter(l => l.startsWith('Aatami walks')).length === 1
      && s.logs[0].startsWith('Aatami walks'), s.logs.slice(0, 3).join(' | '));
    ok('A no clock charge: the same block', s.scheduleIndex === blockBefore && s.scheduleIndex === pre.scheduleIndex);
    ok('A no fare: cash and stock unchanged (€115, 1)', s.cash === 115 && s.stock.piri === 1);
    ok('A arrival observes Siltasaari', s.seen?.siltasaari != null);
    ok('A the delivery route is untouched', JSON.stringify(s.route) === JSON.stringify(pre.route));
    ok('A still the same encounter, now enterable', await page.locator('[data-action="open-encounter"]').isVisible());
    await reloadResume(page); await toRoute(page);
    ok('A reload after arrival keeps Aatami at Siltasaari, €115, one pack',
      (await S(page)).selectedAnchor === 'siltasaari' && (await S(page)).cash === 115 && (await S(page)).stock.piri === 1);
    ok('A reload after arrival offers no TRAVEL here', await page.locator('[data-action="plan-journey"]').count() === 0);

    await choose(page, 'complete');
    s = await S(page);
    ok('A selling: €115 → €183, stock 1 → 0 — one €23 profit, not two', s.cash === 183 && s.stock.piri === 0);
    await reloadResume(page);
    ok('A reload after the sale keeps €183 and no pack', (await S(page)).cash === 183 && (await S(page)).stock.piri === 0);
    ok('A the sale cannot be settled twice', await page.locator('[data-choice="complete"]').count() === 0);
    await advance(page);
    s = await S(page);
    ok('A onward: the next lead is Mäkelänsilta, Aatami stays at Siltasaari',
      await attr(page, 'data-lead') === 'makelansilta' && s.selectedAnchor === 'siltasaari');
    await tapAnchor(page, 'makelansilta');
    await page.locator('[data-action="plan-journey"]').click();
    await page.locator('[data-action="commit-journey"]').click();
    ok('A onward: travel to the next lead enables it', await page.locator('[data-action="open-encounter"]').isVisible());

    // Sealed and landmark: look, never go.
    const anchors = await page.evaluate(() => [...window.__ptv3.data.anchors.values()].map(a => ({ id: a.id, s: a.sliceState })));
    for (const a of anchors.filter(x => x.s !== 'active' && x.s !== 'training')) {
      await tapAnchor(page, a.id);
      if ((await page.locator('[data-action="plan-journey"]').count()) !== 0) { ok(`A ${a.id} (${a.s}) offers no TRAVEL`, false); }
    }
    ok('A no sealed, teaser or landmark area offers TRAVEL', true);
    ok('A no browser errors', errs().length === 0, errs().join(' | '));
    await ctx.close();

    // ── B. the authored decline: walk away, buy later from the ledger, sell.
    const b = await browser.newContext({ viewport: { width: 1280, height: 820 } });
    const bp = await b.newPage();
    const berr = watchErrors(bp);
    await boot(bp, base);
    await choose(bp, 'walk');
    ok('B walking away keeps €160, no pack', (await S(bp)).cash === 160 && (await S(bp)).stock.piri === 0);
    await advance(bp);
    ok('B the lead still moves on, and Aatami stays', await attr(bp, 'data-lead') === 'siltasaari' && (await S(bp)).selectedAnchor === 'piritori');
    await bp.locator('[data-mode-target="ledger"]').click();
    ok('B the deferred purchase is offered where Aatami stands', await bp.locator('[data-offer="offer-piritori-buy"]').count() === 1);
    await bp.locator('[data-offer="offer-piritori-buy"]').click();
    ok('B buying late: €160 → €115, stock 0 → 1', (await S(bp)).cash === 115 && (await S(bp)).stock.piri === 1);
    await bp.locator('[data-mode-target="route"]').click();
    await tapAnchor(bp, 'siltasaari');
    await bp.locator('[data-action="plan-journey"]').click();
    await bp.locator('[data-action="commit-journey"]').click();
    await choose(bp, 'complete');
    ok('B the late sale: €115 → €183, stock 1 → 0', (await S(bp)).cash === 183 && (await S(bp)).stock.piri === 0);
    ok('B no browser errors', berr().length === 0, berr().join(' | '));
    await b.close();

    // ── C. decline everything: walk, travel, abort — the story still goes on.
    const c = await browser.newContext({ viewport: { width: 1280, height: 820 } });
    const cp = await c.newPage();
    const cerr = watchErrors(cp);
    await boot(cp, base);
    await choose(cp, 'walk'); await advance(cp);
    await tapAnchor(cp, 'siltasaari');
    await cp.locator('[data-action="plan-journey"]').click();
    await cp.locator('[data-action="commit-journey"]').click();
    await choose(cp, 'abort');
    ok('C aborting the sale spends nothing', (await S(cp)).cash === 160 && (await S(cp)).stock.piri === 0);
    await advance(cp);
    ok('C onward: the next lead is reachable by TRAVEL', await (async () => {
      const lead = await attr(cp, 'data-lead');
      await tapAnchor(cp, lead);
      await cp.locator('[data-action="plan-journey"]').click();
      await cp.locator('[data-action="commit-journey"]').click();
      return (await S(cp)).selectedAnchor === lead && await cp.locator('[data-action="open-encounter"]').isVisible();
    })());
    ok('C no browser errors', cerr().length === 0, cerr().join(' | '));
    await c.close();

    // ── D. a delivery route does not pay for, or perform, personal travel.
    const d = await browser.newContext({ viewport: { width: 1280, height: 820 } });
    const dp = await d.newPage();
    await boot(dp, base);
    await dp.locator('[data-action="plan-route"]').click();
    await tapAnchor(dp, 'hakaniemi');
    await dp.locator('[data-action="commit-route"]').click();
    const pinned = await S(dp);
    await tapAnchor(dp, 'hakaniemi');
    await dp.locator('[data-action="plan-journey"]').click();
    await dp.locator('[data-action="commit-journey"]').click();
    const walked = await S(dp);
    ok('D a journey leaves the pinned delivery route exactly as it was', JSON.stringify(walked.route) === JSON.stringify(pinned.route));
    ok('D and costs what a journey costs (nothing), route or no route', walked.cash === pinned.cash && walked.scheduleIndex === pinned.scheduleIndex);
    await d.close();

    // ── E. touch, portrait and landscape: the preview is usable by thumb.
    for (const [name, viewport] of [['portrait', { width: 390, height: 844 }], ['landscape', { width: 844, height: 390 }]]) {
      const tctx = await browser.newContext({ viewport, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
      const tp = await tctx.newPage();
      const terr = watchErrors(tp);
      await boot(tp, base);
      await tapAnchor(tp, 'siltasaari', 'tap');
      await tp.locator('[data-action="plan-journey"]').scrollIntoViewIfNeeded();
      await tp.locator('[data-action="plan-journey"]').tap();
      await tp.locator('.journey-preview').scrollIntoViewIfNeeded();
      await tp.screenshot({ path: path.join(shots, `m2-preview-${name}.png`) });
      await tp.locator('[data-action="cancel-journey"]').tap();
      ok(`E ${name}: cancel by tap moves nobody`, (await S(tp)).selectedAnchor === 'piritori' && await tp.locator('.journey-preview').count() === 0);
      ok(`E ${name}: no browser errors`, terr().length === 0, terr().join(' | '));
      await tctx.close();
    }
  } catch (error) {
    ok('unhandled M2 gate error', false, error.stack || error.message);
  } finally {
    await browser.close();
    server.close();
    console.log(`\n  ${passed} passed, ${failed} failed`);
    process.exit(failed ? 1 : 0);
  }
});
