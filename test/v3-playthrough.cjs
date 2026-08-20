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

  try {
    await page.goto(`${base}/piritori/`);
    await page.waitForFunction(() => Boolean(window.__ptv3?.data));
    ok('boots with no browser errors', errors.length === 0, errors.join(' | '));
    ok('content warning is the first interaction', await page.locator('#splash').isVisible());
    ok('all five modes exist before play', await page.locator('[data-mode-target]').count() === 5);

    await page.locator('#beginButton').click();
    await page.waitForSelector('.city-map');
    ok('BEGIN lands on the route map', await page.locator('#game').getAttribute('data-mode') === 'route');
    ok('the whole twelve-anchor Kallio board is present', await page.locator('[data-anchor-group]').count() === 12);
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

    for (const mode of ['encounter', 'ledger', 'battle', 'news', 'route']) {
      await page.locator(`[data-mode-target="${mode}"]`).click();
      ok(`${mode} is reachable through its real navigation control`,
        await page.locator('#game').getAttribute('data-mode') === mode
          && (await page.locator('#modeRoot').textContent()).trim().length > 30);
    }

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
    await page.waitForSelector('.scene-viewport.toko .scene-image');
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

    // Set up the 2v2, then issue an actual AUTO command through the interface.
    await page.evaluate(() => {
      const next = structuredClone(window.__ptv3.state);
      const ids = ['crew-mira-hamalainen', 'crew-samira-elmi'];
      next.recruited = ids;
      next.deployed = ids;
      for (const id of ids) next.crewStatus[id].status = 'available';
      window.__ptv3.debug.setState(next);
      window.__ptv3.debug.startBattle('battle-karhupuisto-2v2');
    });
    await page.waitForSelector('.battle-stage');
    ok('2v2 renders four modular combatants', await page.locator('.unit-token').count() === 4);
    ok('both sides expose front, middle and back formation cells',
      await page.locator('.formation-cell').count() === 18);
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
    ok('still no browser errors after the click-through', errors.length === 0, errors.join(' | '));
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
