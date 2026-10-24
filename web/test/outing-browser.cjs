// A door fight, all the way round (Act I v4.74, design/C19_CAMPAIGN_FIGHTS.md
// step 1): Act I raises it, Night Shift (C.19) plays it in its 3D place, and
// the result comes back to the map exactly once.
//
//   NODE_PATH=$(npm root -g) node web/test/outing-browser.cjs
//
// OUTING_ROOT + OUTING_APP point it at a built cabinet instead of the repo
// (the arcade serves Act I from /piritori/ with Night Shift beside it):
//   OUTING_ROOT=<site tree> OUTING_APP=/piritori/ node web/test/outing-browser.cjs
//
// Fixtures only set the scene (the block, the crew, which doors are on the
// board). Taking the door, the walk, the choice, the fight and the way home
// are taps.
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = process.env.OUTING_ROOT ? path.resolve(process.env.OUTING_ROOT) : path.resolve(__dirname, '..', '..');
const APP = process.env.OUTING_APP || '/web/';
const at = tail => new RegExp(`${APP.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}${tail}`);
const OUT = process.env.OUTING_OUTPUT || '';
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary',
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

// ../hub/shell.js and Night Shift's hub link only exist once deployed under
// the arcade: forgiven precisely, as doors-browser.cjs does.
function watchErrors(page) {
  const errors = []; let shellMisses = 0;
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  page.on('response', r => { if (r.status() === 404 && new URL(r.url()).pathname.endsWith('/hub/shell.js')) shellMisses += 1; });
  page.on('requestfailed', r => { if (!new URL(r.url()).pathname.endsWith('/hub/shell.js')) errors.push(`requestfailed: ${r.url()}`); });
  return () => {
    let forgive = shellMisses;
    return errors.filter(e => !(forgive > 0 && /Failed to load resource: .*404/.test(e) && forgive--));
  };
}

const S = page => page.evaluate(() => structuredClone(window.__ptv3.state));
const fixture = (page, body, arg) => page.evaluate(([b, a]) => { const s = structuredClone(window.__ptv3.state); new Function('s', 'a', b)(s, a); window.__ptv3.debug.setState(s); }, [body, arg]);
const campaign = page => page.evaluate(() => JSON.parse(localStorage.getItem('piritori-to-eden:v3')));
const shot = async (page, name) => { if (OUT) await page.screenshot({ path: path.join(OUT, `${name}.png`) }); };

// Read the plans, step round them, walk out: not one attack (c19-outing.mjs
// plays the same opening in bare node).
const ROUTE = [
  ['select', 'aatami'], ['move', '3,3'], ['select', 'crew-slot-runner'], ['move', '2,4'], ['select', 'crew-slot-muscle'], ['move', '3,4'], ['end'],
  ['select', 'aatami'], ['move', '3,0'], ['extract'], ['select', 'crew-slot-muscle'], ['move', '3,0'], ['extract'], ['end'],
  ['select', 'crew-slot-runner'], ['move', '3,1'], ['end'],
  ['move', '3,0'], ['extract'],
];

server.listen(0, '127.0.0.1', async () => {
  const base = `http://127.0.0.1:${server.address().port}`;
  if (OUT) fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    for (const [name, vp, touch] of [['phone', { width: 412, height: 915 }, true], ['desktop', { width: 1280, height: 800 }, false]]) {
      const ctx = await browser.newContext({ viewport: vp, hasTouch: touch, isMobile: touch });
      const page = await ctx.newPage();
      const errors = watchErrors(page);
      const tap = async el => { await el.scrollIntoViewIfNeeded(); await el[touch ? 'tap' : 'click'](); };

      // ── Act I: the courtyard ledger, three who can fight (Aatami still does).
      await page.goto(`${base}${APP}?skip`);
      await page.waitForFunction(() => Boolean(window.__ptv3?.data && window.__ptv3.story?.case));
      await page.locator('#beginButton').click(); await page.waitForSelector('.city-map');
      await fixture(page, 's.scheduleIndex = 15; s.selectedAnchor = "torkkelinmaki"; s.recruited = a.slice(0, 2); s.deployed = [...s.recruited]; s.doors = { offers: { 15: [{ template: "hit-courtyard-ledger", anchor: "torkkelinmaki" }, { template: "gig-rauno-cart", anchor: "harju" }] }, taken: {} }; s.fightsByDay = {};',
        await page.evaluate(() => window.__ptv3.data.content.crew.map(c => c.id)));
      const before = await S(page);
      await tap(page.locator('[data-action="take-door"][data-door="hit-courtyard-ledger"]'));
      await tap(page.locator('[data-action="next-step"][data-step="enter"]'));
      await tap(page.locator('[data-action="choose"][data-choice="take-it"]'));
      let s = await S(page);
      ok(`${name}: taking it is a fight, and the city waits for it`, s.outing?.status === 'open' && s.mode === 'outing' && await page.locator('.outing-panel').isVisible());
      ok(`${name}: Aatami and two of the crew, against three of the locals`, s.outing.fighters.join() === 'aatami,crew-slot-runner,crew-slot-muscle' && s.outing.rivals.length === 3 && s.outing.side === 'the locals');
      ok(`${name}: the job is to get out`, /Get everyone out\./.test(await page.locator('.outing-panel').innerText()));
      await shot(page, `${name}-act1-waiting`);
      const outingId = s.outing.id;

      // ── Night Shift: the courtyard, those people, get away.
      await tap(page.locator('.outing-panel a.paper-button.primary'));
      await page.waitForURL(at('crew-run/\\?campaign=1&outing='));
      const idle = () => page.waitForFunction(() => window.fightModule && !fightModule.metrics().busy, {}, { timeout: 180000 });
      await idle();
      ok(`${name}: Night Shift opens the courtyard`, (await page.evaluate(() => fightModule.metrics().environment?.location)) === 'courtyard');
      ok(`${name}: it prepares this fight, not a night of its own`, /Get everyone out\./.test(await page.locator('#crew-content h2').first().innerText())
        && /TORKKELINMÄKI/.test(await page.locator('#crew-content .eyebrow').first().innerText()));
      ok(`${name}: on Act I's clock, with the way back to Kallio`, (await page.locator('#crew-night').innerText()) === 'KALLIO 2003 / DAY 8 · NIGHT'
        && (await page.locator('.arcade-home').innerText()).includes('Kallio') && (await page.locator('.arcade-home').getAttribute('href')) === '../?outing=back');
      ok(`${name}: who fights was Act I's answer`, await page.locator('.crew-card').count() === 3 && await page.locator('.crew-card [data-crew][disabled]').count() === 3);
      ok(`${name}: no scenery choice, no recovery night`, !(await page.locator('.location-choice').count()) && !(await page.getByRole('button', { name: 'Take a recovery night' }).count()));
      await shot(page, `${name}-c19-prep`);
      await tap(page.locator('#crew-deploy')); await idle();
      ok(`${name}: the fight is on`, (await page.evaluate(() => crewRun.snapshot().phase)) === 'battle' && /^Get everyone out/.test(await page.locator('#mission-goal').innerText()));
      ok(`${name}: walking away is not offered`, !(await page.locator('#outing-options .withdraw-command').count()));
      await shot(page, `${name}-c19-fight`);
      const selectCrew = async id => {
        if (await page.locator('#crew-picker').count() && !await page.locator('#roster').isVisible()) await tap(page.locator('#crew-picker'));
        await tap(page.locator(`[data-unitid="${id}"]`));
        if (await page.locator('#crew-picker').count() && await page.locator('#roster').isVisible()) await tap(page.locator('#crew-picker'));
      };
      for (const [index, [type, value]] of ROUTE.entries()) {
        if (type === 'select') await selectCrew(value);
        else if (type === 'move') { await tap(page.locator('[data-action="move"]')); await tap(page.locator(`[data-cell="${value}"]`)); await tap(page.locator('#commit-preview')); }
        else if (type === 'end') await tap(page.locator('#end'));
        else await tap(page.locator(`[data-mission-action="${type}"]`).first());
        await idle();
        if (index === 6) {
          // A reload mid-fight is the same fight.
          const mid = await page.evaluate(() => fightModule.snapshot());
          await page.reload(); await idle();
          ok(`${name}: a reload mid-fight resumes it exactly`, JSON.stringify(await page.evaluate(() => fightModule.snapshot())) === JSON.stringify(mid));
        }
      }
      const run = await page.evaluate(() => crewRun.snapshot());
      ok(`${name}: everyone got away, nobody beaten`, run.phase === 'aftermath' && run.last.success && run.last.result === 'win' && run.last.title === 'Everyone got away');
      ok(`${name}: the way home is Act I`, await page.locator('#crew-home').isVisible() && !(await page.locator('#crew-next').count()));
      let camp = await campaign(page);
      ok(`${name}: the result is in the campaign, settled`, camp.outing?.id === outingId && camp.outing.status === 'settled' && camp.outing.result === 'win');
      await shot(page, `${name}-c19-aftermath`);
      await page.reload(); await idle();
      ok(`${name}: reloaded, the aftermath stays the aftermath`, JSON.stringify(await page.evaluate(() => crewRun.snapshot())) === JSON.stringify(run));

      // ── back to Kallio: the door's stakes, once.
      await tap(page.locator('#crew-home'));
      await page.waitForURL(at('\\?outing=back'));
      await page.waitForFunction(() => Boolean(window.__ptv3?.state));
      s = await S(page);
      ok(`${name}: straight back to the map, no title in the way`, await page.locator('#splash').isHidden() && !s.outing && s.mode === 'route');
      ok(`${name}: the block passed`, s.scheduleIndex === before.scheduleIndex + 1);
      // The cash moves with the night's wages and Kello's cut too, so the
      // stakes are read where nothing else touches them, plus the one flag.
      ok(`${name}: the job paid: intel and the Jade Lantern's goodwill`, s.intel === (before.intel ?? 0) + 1
        && s.relationships.jade_lantern_network === before.relationships.jade_lantern_network + 1 && s.flags.includes(`memory:outing-settled:${outingId}`),
        JSON.stringify({ intel: [before.intel, s.intel], jade: [before.relationships.jade_lantern_network, s.relationships.jade_lantern_network] }));
      ok(`${name}: and Kallio says how it went`, (s.lastOutcome ?? []).includes('Everyone got out of A Torkkelinmäki courtyard.'));
      ok(`${name}: it is in the fight history, at the door`, s.battleHistory.at(-1)?.id === 'battle-courtyard-3v3' && s.battleHistory.at(-1).at === 'torkkelinmaki');
      await shot(page, `${name}-act1-back`);
      await page.reload();
      await page.waitForFunction(() => Boolean(window.__ptv3?.state));
      const again = await S(page);
      ok(`${name}: once: a reload pays nothing twice`, again.cash === s.cash && again.scheduleIndex === s.scheduleIndex && again.intel === s.intel);
      ok(`${name}: no overflow`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      const e = errors();
      ok(`${name}: no errors`, e.length === 0, e.join(' | '));
      await ctx.close();
    }
  } catch (err) { failed += 1; console.log('  FAIL crashed →', err.stack); }
  await browser.close(); server.close();
  console.log(`outing-browser: ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
});
