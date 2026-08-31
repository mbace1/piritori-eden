// Real-browser gate for the v3 slice. Debug hooks are used only to SET UP
// authored states that would otherwise take several in-game days to reach;
// every action under test is taken through the visible interface.
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  // battle.js now imports market/model.mjs (the stances port's rand01, kept
  // to the house RNG rather than a second one) — the first cross-directory
  // ES module import a browser has to load in this gate. Without this entry
  // it served as application/octet-stream, which a browser refuses to
  // execute as a module: a real error, but a silent one from this gate's
  // point of view, since it only surfaces as window.__ptv3.data never
  // appearing and a 30s waitForFunction timeout with no named cause.
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.png': 'image/png',
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
  console.log(`  FAIL ${name}${detail ? ` → ${detail}` : ''}`);
}

server.listen(0, '127.0.0.1', async () => {
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 820 } });
  const errors = [];
  page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });

  // ONE known, accepted, harmless 404: ../hub/shell.js. It reaches the
  // arcade hub's real shared chrome once deployed under it (checked directly
  // against Suds-Jack's own hub/shell.js, 2026-08-28); this repo does not
  // own hub/ and never will, so it 404s here every single run, on purpose.
  // Wrapping the import in .catch() (already done, index.html) stops it
  // throwing INTO the page, but Chromium logs a failed subresource load to
  // the console regardless of whether the script that triggered it caught
  // the rejection — that is the browser's own network layer, not something
  // page-level JS can suppress. Found 2026-08-31 running this gate for real:
  // "boots with no browser errors" had apparently been failing on exactly
  // this, permanently, for a known-good reason, which trains a reader to
  // stop trusting the gate. Fixed by accounting for it precisely rather than
  // by loosening the check generally: track the ACTUAL 404'd URL via the
  // response event (a generic "Failed to load resource: ... 404" console
  // message carries no URL to match on), and forgive exactly one generic
  // 404-shaped console message per confirmed hub/shell.js 404 — never more,
  // so a second, different, real 404 still fails the gate.
  let expectedFailures = 0;
  page.on('response', response => {
    if (response.status() === 404 && new URL(response.url()).pathname.endsWith('/hub/shell.js')) {
      expectedFailures += 1;
    }
  });
  function unexpectedErrors() {
    const generic404 = /^console: Failed to load resource: the server responded with a status of 404/;
    const rest = [];
    let toForgive = expectedFailures;
    for (const e of errors) {
      if (toForgive > 0 && generic404.test(e)) { toForgive -= 1; continue; }
      rest.push(e);
    }
    return rest;
  }

  try {
    // web/, not piritori/ — the browser build was promoted out of piritori/
    // (later legacy/) on 2026-08-25 (legacy/README.md); this was still
    // pointed at the old name, so the gate has been 404ing and timing out
    // on window.__ptv3 rather than actually testing anything since then.
    await page.goto(`${base}/web/`);
    await page.waitForFunction(() => Boolean(window.__ptv3?.data));
    ok('boots with no browser errors', unexpectedErrors().length === 0, unexpectedErrors().join(' | '));
    ok('content warning is the first interaction', await page.locator('#splash').isVisible());
    ok('all five modes exist before play', await page.locator('[data-mode-target]').count() === 5);

    await page.locator('#beginButton').click();
    await page.waitForSelector('.city-map');
    ok('BEGIN lands on the route map', await page.locator('#game').getAttribute('data-mode') === 'route');
    // 12 -> 15, 2026-08-31: the board grew (hermanni_skatepark, v4.18, and
    // others since) and this assertion was never updated for it -- found by
    // actually running this gate, which apparently had not happened recently
    // enough to catch it. Checked against data.map.anchors.map(...) in
    // app.js, which renders one <g data-anchor-group> per anchor with no
    // filter -- ALL anchors, not just active ones, matching "the whole board".
    ok('the whole fifteen-anchor Kallio board is present', await page.locator('[data-anchor-group]').count() === 15);
    ok('Piritori is both selected and the live destination',
      await page.locator('[data-anchor-group="piritori"].current.selected').count() === 1);
    ok('the player chooses to enter Piritori from the map',
      await page.locator('[data-action="open-encounter"]').isVisible());

    await page.locator('[data-action="open-encounter"]').click();
    ok('the first location is the first-bag encounter',
      /THE FIRST BAG/.test(await page.locator('#modeRoot').textContent()));
    await page.locator('[data-action="inspect"]').first().click();
    ok('LOOK produces a live observation', (await page.locator('.observation').textContent()).length > 20);
    await page.locator('[data-choice="buy"]').click();
    ok('the visible purchase spends €45 and adds one abstract pack', await page.evaluate(() => (
      window.__ptv3.state.cash === 115 && window.__ptv3.state.stock.piri === 1
        && window.__ptv3.state.choices['enc-first-purchase'] === 'buy'
    )));
    await page.locator('[data-action="advance"]').click();
    ok('the next map highlight is the profitable Siltasaari lead',
      await page.locator('[data-anchor-group="siltasaari"].current.selected').count() === 1);
    const openingLadder = await page.locator('.progression-card').textContent();
    ok('the opening names the full €45 → €68 spread',
      openingLadder.includes('€45') && openingLadder.includes('€68') && openingLadder.includes('+€23'), openingLadder);

    // 'encounter' and 'battle' are committed context (UX_SPEC §3.2/§3.4,
    // VERSIONS.md v4.4): entering either HIDES .mode-nav entirely, so a loop
    // that clicks straight through mode-nav buttons dies on whichever mode
    // comes right after one of those two — the nav it needs is gone. 'battle'
    // goes mid-list because its empty state (no fight has started yet) offers
    // a real "go-route" button to withdraw through, same as a player would;
    // 'encounter' goes last because there IS a live encounter at this point
    // (the Siltasaari lead) and the only real way out is choosing and
    // advancing it, which this loop has no business doing just to prove a nav
    // button works.
    for (const mode of ['ledger', 'battle', 'news', 'route']) {
      await page.locator(`[data-mode-target="${mode}"]`).click();
      ok(`${mode} is reachable through its real navigation control`,
        await page.locator('#game').getAttribute('data-mode') === mode
          && (await page.locator('#modeRoot').textContent()).trim().length > 30);
      if (mode === 'battle') await page.locator('[data-action="go-route"]').click();
    }
    await page.locator('[data-mode-target="encounter"]').click();
    ok('encounter is reachable through its real navigation control',
      await page.locator('#game').getAttribute('data-mode') === 'encounter'
        && (await page.locator('#modeRoot').textContent()).trim().length > 30);

    // Set up Toko's authored night, then enter it through the visible mode nav.
    await page.evaluate(() => {
      const next = structuredClone(window.__ptv3.state);
      next.scheduleIndex = 5;
      next.mode = 'route';
      next.selectedAnchor = 'vaasankatu';
      delete next.choices['enc-toko-quiet-voice'];
      next.battle = null;
      next.endingId = null;
      window.__ptv3.debug.setState(next);
    });
    await page.locator('[data-mode-target="encounter"]').click();
    // A soft wait, not page.waitForSelector: that throws on timeout, and an
    // uncaught throw here skips the try/catch straight to `finally` — the
    // AUTO-battle, news and portrait-reflow checks below never even run.
    // QUEUE.md: content moved enc-toko-quiet-voice's scene_asset_id to
    // scene-toko-noodles-empty-v01 (the Godot-side live-3D-presenter asset,
    // no baked Toko or UI drawn into it) while .toko stayed hardcoded to the
    // old scene-toko-noodles-prototype-v02 id, so the class this test looks
    // for is never applied on the current content — real content/engine
    // drift, not a flaky test, and not something to paper over here.
    const hasToko = await page.locator('.scene-viewport.toko .scene-image').first()
      .waitFor({ timeout: 5000 }).then(() => true).catch(() => false);
    if (hasToko) {
      const tokoCrop = await page.locator('.scene-viewport.toko').evaluate(viewport => {
        const image = viewport.querySelector('.scene-image');
        const vr = viewport.getBoundingClientRect();
        const ir = image.getBoundingClientRect();
        return {
          overflow: getComputedStyle(viewport).overflow,
          cropped: ir.height > vr.height + 20,
          liveChoices: viewport.closest('.encounter-layout').querySelectorAll('[data-choice]').length,
        };
      });
      ok('Toko art is deliberately cropped above its baked prototype UI',
        tokoCrop.overflow === 'hidden' && tokoCrop.cropped, JSON.stringify(tokoCrop));
      ok('Toko receives live narrative choices', tokoCrop.liveChoices === 4, String(tokoCrop.liveChoices));
    } else {
      ok('Toko art is deliberately cropped above its baked prototype UI', false,
        'scene-viewport.toko not found — see QUEUE.md, scene_asset_id drift');
      ok('Toko receives live narrative choices', false, 'skipped: no .toko viewport');
    }

    // Set up the 2v2, then issue an actual AUTO command through the interface.
    // Crew ids are role slots now, not authored names (content: "crew names
    // are generated from the pools, never authored") — this test still had
    // the two pre-pool names, which crashed setting a status on `undefined`.
    await page.evaluate(() => {
      const next = structuredClone(window.__ptv3.state);
      const ids = ['crew-slot-muscle', 'crew-slot-watcher'];
      next.recruited = ids;
      next.deployed = ids;
      for (const id of ids) next.crewStatus[id].status = 'available';
      window.__ptv3.debug.setState(next);
      window.__ptv3.debug.startBattle('battle-karhupuisto-2v2');
    });
    await page.waitForSelector('.battle-stage');
    ok('2v2 renders four modular combatants', await page.locator('.unit-token').count() === 4);
    // The board is one unified 6-lane x 8-depth grid now (grid.js, ported
    // from godot/scripts/fight/board.gd) — 48 cells total, not two mirrored
    // 3x3 halves.
    ok('the shared formation board renders every lane and depth',
      await page.locator('.formation-cell').count() === 48);
    const beforeRound = await page.evaluate(() => window.__ptv3.state.battle.round);
    await page.locator('[data-action="auto"]').click();
    const afterAuto = await page.evaluate(() => ({
      round: window.__ptv3.state.battle.round,
      log: window.__ptv3.state.battle.log.length,
    }));
    ok('AUTO is a real actionable battle control', afterAuto.round > beforeRound || afterAuto.log > 1,
      JSON.stringify(afterAuto));

    // Set up the scheduled bulletin; the News button still performs the action.
    await page.evaluate(() => {
      const next = structuredClone(window.__ptv3.state);
      next.scheduleIndex = 4;
      next.mode = 'route';
      next.battle = null;
      next.newsSeen = [];
      window.__ptv3.debug.setState(next);
    });
    await page.locator('[data-mode-target="news"]').click();
    ok('the Era I bulletin renders inside a CRT television', await page.locator('.tv-shell').isVisible());
    ok('Arvo Linde is labelled as a fictional presenter',
      /ARVO LINDE/.test(await page.locator('.news-lower-third').textContent()));

    // Portrait reflow: no clipped page, no undersized visible action, map remains usable.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('[data-mode-target="route"]').click();
    ok('portrait keeps all five mode controls', await page.locator('.mode-nav button:visible').count() === 5);
    ok('portrait has no horizontal page overflow', await page.evaluate(() => (
      document.documentElement.scrollWidth <= window.innerWidth + 1
    )), await page.evaluate(() => `${document.documentElement.scrollWidth}/${window.innerWidth}`));
    const undersized = await page.locator('button:visible').evaluateAll(buttons => buttons
      .filter(button => !button.disabled)
      .map(button => ({
        label: button.getAttribute('aria-label') || button.textContent.trim().slice(0, 24),
        width: button.getBoundingClientRect().width,
        height: button.getBoundingClientRect().height,
      }))
      .filter(item => item.width < 44 || item.height < 44));
    ok('every enabled portrait control clears the 44px floor', undersized.length === 0,
      JSON.stringify(undersized.slice(0, 5)));
    ok('still no browser errors after the click-through', unexpectedErrors().length === 0, unexpectedErrors().join(' | '));
  } catch (error) {
    failed += 1;
    console.error(`  FAIL unhandled browser gate error → ${error.stack || error}`);
  } finally {
    await page.close();
    await browser.close();
    server.close();
  }

  console.log(`\n  ${passed} passed, ${failed} failed\n`);
  process.exit(failed ? 1 : 0);
});
