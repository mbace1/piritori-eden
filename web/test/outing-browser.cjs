// A door fight, all the way round (Act I v4.75, design/C19_CAMPAIGN_FIGHTS.md
// §6): the choice goes straight to Night Shift (C.19), the brief is one card
// over the place, the fight ends in a win or with the police, and the map
// shows what changed as a strip, paid exactly once.
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
  page.on('requestfailed', r => { const why = r.failure()?.errorText ?? ''; if (!new URL(r.url()).pathname.endsWith('/hub/shell.js') && why !== 'net::ERR_ABORTED') errors.push(`requestfailed: ${r.url()} (${why})`); });
  return () => {
    let forgive = shellMisses;
    return errors.filter(e => !(forgive > 0 && /Failed to load resource: .*404/.test(e) && forgive--));
  };
}

const S = page => page.evaluate(() => structuredClone(window.__ptv3.state));
const fixture = (page, body, arg) => page.evaluate(([b, a]) => { const s = structuredClone(window.__ptv3.state); new Function('s', 'a', b)(s, a); window.__ptv3.debug.setState(s); }, [body, arg]);
const campaign = page => page.evaluate(() => JSON.parse(localStorage.getItem('piritori-to-eden:v3')));
const shot = async (page, name) => { if (OUT) await page.screenshot({ path: path.join(OUT, `${name}.png`) }); };

// A real win, found by playing the courtyard opening in bare node (the "played
// opening" in c19-outing.mjs, recorded) with the outing id the pinned clock
// gives: close in on the tough one, then on the next. They break at two-thirds
// of their weight (RULES.rout, v4.88), and since v4.90 blows can miss, so the
// line is only good for these dice: Aatami's first swing misses and the tough
// one takes a third. The ids are the generated people the door's key always
// gives.
const PINNED = 1761900000000;
const R = n => `opp-door-15-hit-courtyard-ledger-${n}`;
const WIN = [
  ['select', 'aatami'], ['move', '2,3'], ['attack', R(1)],
  ['select', 'crew-slot-runner'], ['move', '3,4'], ['attack', R(1)],
  ['end'],
  ['select', 'aatami'], ['attack', R(1)],
  ['select', 'crew-slot-runner'], ['attack', R(1)],
  ['select', 'crew-slot-muscle'], ['move', '1,3'], ['attack', R(2)],
  ['end'],
  ['select', 'aatami'], ['move', '2,4'], ['attack', R(2)],
];
// Stand and wait in a place that is already hot: pressure 3 reaches 6 after
// turn 3, and the police come in after turn 4. Four rounds of standing still
// cost someone (with the pinned dice, Lan Ho goes down), so the police ask.
// The police scenario is a place at its hottest (Act I pressure 3), which
// since v4.94 starts the fight at 5 of 6: standing there two rounds brings
// them, with the muscle down by then (found in bare node on this very id).
const WAIT = [['select', 'aatami'], ['end'], ['select', 'crew-slot-runner'], ['end']];

server.listen(0, '127.0.0.1', async () => {
  const base = `http://127.0.0.1:${server.address().port}`;
  if (OUT) fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    const scenarios = [
      ['phone', { width: 412, height: 915 }, true, 'win'],
      ['desktop', { width: 1280, height: 800 }, false, 'win'],
      ['phone', { width: 412, height: 915 }, true, 'police'],
    ];
    for (const [view, vp, touch, kind] of scenarios) {
      const name = `${view}/${kind}`;
      const ctx = await browser.newContext({ viewport: vp, hasTouch: touch, isMobile: touch });
      // Leaving Night Shift destroys its WebGL2 context, and under
      // --use-angle=swiftshader that alone takes 13-38 s (measured v4.78:
      // 38 s for the 1280x800 courtyard, 79 ms on Chromium's default backend).
      // A navigation away from it gets the time that teardown needs; so does
      // a tap that starts one, which waits under the action timeout.
      ctx.setDefaultNavigationTimeout(120000);
      const page = await ctx.newPage();
      const errors = watchErrors(page);
      const tap = async (el, options = {}) => { await el.scrollIntoViewIfNeeded(); await el[touch ? 'tap' : 'click'](options); };

      // ── Act I: the courtyard ledger, a fight job, three who can fight.
      await page.goto(`${base}${APP}?skip`);
      await page.waitForFunction(() => Boolean(window.__ptv3?.data && window.__ptv3.story?.case));
      await page.locator('#beginButton').click(); await page.waitForSelector('.city-map');
      await fixture(page, `s.scheduleIndex = 15; s.selectedAnchor = "torkkelinmaki"; s.recruited = a.slice(0, 2); s.deployed = [...s.recruited]; s.pressure.torkkelinmaki = ${kind === 'police' ? 3 : 0}; s.doors = { offers: { 15: [{ template: "hit-courtyard-ledger", anchor: "torkkelinmaki" }, { template: "gig-rauno-cart", anchor: "harju" }] }, taken: {} }; s.fightsByDay = {};`,
        await page.evaluate(() => window.__ptv3.data.content.crew.map(c => c.id)));
      const before = await S(page);
      await tap(page.locator('[data-action="take-door"][data-door="hit-courtyard-ledger"]'));
      await tap(page.locator('[data-action="next-step"][data-step="enter"]'));
      // Since v4.90 a blow can miss, and an outing's dice are seeded from its id,
      // which carries the clock: pin it for the tap that writes the outing, so
      // the routes below meet the same rolls every run (the bare harness found
      // them with this very id).
      await page.evaluate(t => { Date.now = () => t; }, PINNED);
      await tap(page.locator('[data-action="choose"][data-choice="take-it"]'));

      // ── Straight to the fight: no waiting screen, no crew page.
      await page.waitForURL(at('crew-run/\\?campaign=1&outing='));
      const idle = () => page.waitForFunction(() => window.fightModule && !fightModule.metrics().busy, {}, { timeout: 180000 });
      await idle();
      let camp = await campaign(page);
      ok(`${name}: the choice went straight to the fight`, camp.outing?.status === 'open' && camp.outing.goal === 'fight' && camp.fightsByDay?.[8] === 1);
      ok(`${name}: in the courtyard`, (await page.evaluate(() => fightModule.metrics().environment?.location)) === 'courtyard');
      ok(`${name}: the brief says the job`, (await page.locator('#crew-content h2').first().innerText()) === 'Make them back off.');
      const facts = await page.locator('.brief-facts').innerText();
      // v4.96, the UI diet (design/UI_DIET.md step 2): the odds, not six names.
      ok(`${name}: the odds, the way out and when the police come`, /sides\s*3 vs 3/i.test(facts) && !/Aatami|Reijo|Lan Ho|Thuy|Milena|Hodan/.test(facts) && /Withdraw any time/.test(facts) && new RegExp(`starts at ${kind === 'police' ? 5 : 0}`).test(facts), facts);
      ok(`${name}: no crew page`, !(await page.locator('.crew-card').count()) && !(await page.getByRole('button', { name: /Equip/ }).count()));
      ok(`${name}: the scene stays in view behind the brief`, await page.evaluate(() => document.getElementById('crew-screen').getBoundingClientRect().top > innerHeight * 0.3));
      ok(`${name}: no title, date, place or story; the way back to Kallio`, await page.locator('header h1').isHidden() && await page.locator('#crew-night').isHidden()
        && !(await page.locator('#crew-content .eyebrow, #crew-content .lead').count()) && (await page.locator('#crew-message').innerText()).trim() === ''
        && (await page.locator('.arcade-home').getAttribute('href')) === '../?outing=back');
      await shot(page, `${view}-${kind}-brief`);
      await tap(page.locator('#crew-deploy')); await idle();
      ok(`${name}: one tap and it is on`, (await page.evaluate(() => crewRun.snapshot().phase)) === 'battle' && /^Make them back off/.test(await page.locator('#mission-goal').innerText()));
      ok(`${name}: the police are forecast on the pressure line`, new RegExp(`PRESSURE ${kind === 'police' ? 5 : 0}/6 · POLICE AT 6`).test(await page.locator('#mission-pressure').innerText()));
      // v4.96, the UI diet: no fighter name or face, no action costs, no grid
      // code, "standing" said once, and the rivals' plans on the board: each
      // threatened fighter's tag carries the odds and the damage coming at them.
      const costs = await page.locator('#actions .command-cost').allInnerTexts();
      const badges = await page.locator('.threat-badge').allInnerTexts();
      ok(`${name}: the fight says only what changes a decision`, await page.locator('#selected-unit .unit-portrait').isHidden() && await page.locator('#selected-unit h2').isHidden()
        && costs.every(t => t === '' || t === 'USED') && /^EXIT/.test(await page.locator('#exit-marker').innerText()) && !/A1/.test(await page.locator('#exit-marker').innerText())
        && await page.locator('#mission-count').isHidden() && !(await page.locator('.enemy-plan:visible').count()), JSON.stringify({ costs }));
      ok(`${name}: what is coming at a fighter is on their tag`, badges.length > 0 && badges.every(t => /^(\d+%|\d+×) −\d+( · MAY FALL)?$/.test(t)), JSON.stringify(badges));
      await tap(page.locator('#help'));
      ok(`${name}: Withdraw is in the menu`, await page.locator('#outing-options .withdraw-command').isEnabled());
      await page.keyboard.press('Escape');
      await shot(page, `${view}-${kind}-fight`);

      const selectCrew = async id => {
        if (await page.locator('#crew-picker').count() && !await page.locator('#roster').isVisible()) await tap(page.locator('#crew-picker'));
        await tap(page.locator(`[data-unitid="${id}"]`));
        if (await page.locator('#crew-picker').count() && await page.locator('#roster').isVisible()) await tap(page.locator('#crew-picker'));
      };
      const play = async (route) => {
        for (const [index, [type, value]] of route.entries()) {
          if (type === 'select') await selectCrew(value);
          else if (type === 'move') { await tap(page.locator('[data-action="move"]')); await tap(page.locator(`[data-cell="${value}"]`)); await tap(page.locator('#commit-preview')); }
          else if (type === 'attack') { if (await page.locator('[data-action=attack]').getAttribute('aria-pressed') !== 'true') await tap(page.locator('[data-action="attack"]')); await tap(page.locator(`[data-target="${value}"]`)); await tap(page.locator('#commit-preview')); }
          else if (type === 'end') await tap(page.locator('#end'));
          else if (type === 'brace') await tap(page.locator('[data-action="brace"]'));
          await idle();
          if (index === 2) {
            const mid = await page.evaluate(() => fightModule.snapshot());
            await page.reload(); await idle();
            ok(`${name}: a reload mid-fight resumes it exactly`, JSON.stringify(await page.evaluate(() => fightModule.snapshot())) === JSON.stringify(mid));
          }
        }
      };
      if (kind === 'win') {
        await play(WIN);
      } else {
        await play(WAIT);
        ok(`${name}: the police were announced a round early, then came`, /POLICE HERE/.test(await page.locator('#mission-pressure').innerText()) && /^The police are here/.test(await page.locator('#mission-goal').innerText()));
        const backOff = page.locator('[data-police="BACK_OFF"]');
        // Someone is down by now, so the question is a real one (v4.78): two
        // answers, each naming who it costs. Aatami is never taken.
        const asked = await backOff.innerText();
        ok(`${name}: with someone down there are two answers, each saying who is taken`, /^Back off · taken: /.test(asked) && !/taken: nobody/.test(asked) && !/Aatami/.test(asked)
          && /^Help your friends · taken: /.test(await page.locator('[data-police="HELP_FRIENDS"]').innerText()), asked);
        ok(`${name}: and nothing else can be done until it is answered`, await page.locator('#end').isDisabled() || !(await page.locator('[data-mission-action]:enabled').count()));
        await shot(page, `${view}-${kind}-question`);
        await tap(backOff); await idle();
      }
      const run = await page.evaluate(() => crewRun.snapshot());
      const title = kind === 'win' ? 'They ran' : 'The police came';
      ok(`${name}: it ended: ${title.toLowerCase()}`, run.phase === 'aftermath' && run.last.title === title && run.last.end === (kind === 'win' ? 'win' : 'police'), JSON.stringify({ phase: run.phase, title: run.last?.title, end: run.last?.end }));
      ok(`${name}: the result is one card over the scene`, (await page.locator('#crew-content h2').first().innerText()) === `${title}.` && await page.locator('#crew-home').isVisible() && !(await page.locator('.aftermath-grid').count()));
      camp = await campaign(page);
      ok(`${name}: and it is in the campaign, settled`, camp.outing?.status === 'settled' && camp.outing.end === (kind === 'win' ? 'win' : 'police'));
      await shot(page, `${view}-${kind}-result`);

      // ── back to Kallio: the strip, and the stakes once.
      // A tap that leaves Night Shift waits for that teardown too (see above).
      await tap(page.locator('#crew-home'), { timeout: 120000 });
      await page.waitForURL(at('\\?outing=back'));
      await page.waitForFunction(() => Boolean(window.__ptv3?.state));
      let s = await S(page);
      ok(`${name}: straight back to the map`, await page.locator('#splash').isHidden() && !s.outing && s.mode === 'route' && s.scheduleIndex === before.scheduleIndex + 1);
      // v4.104: the fight is in the play log, read where the player reads it.
      // (Not the session count: this test pins Act I's clock a year back for
      // the dice, so its log is not one sitting. playlog.mjs holds that.)
      {
        const logged = await page.evaluate(() => window.__ptv3.playlog.entries());
        const acts = logged.filter(e => e.type === 'act' && /^fight:/.test(e.action)).map(e => e.action);
        const fights = logged.filter(e => e.type === 'fight');
        await tap(page.locator('#pauseButton')); await tap(page.locator('[data-pause="playtest"]'));
        const notes = await page.locator('.playtest-notes').innerText();
        ok(`${name}: the fight is in the playtest notes`, new RegExp(`Fights: 1 \\(1 ${kind === 'win' ? 'won' : 'ended by the police'}\\)`).test(notes), notes);
        ok(`${name}: with the rounds' first taps among the slowest moments`, /on fight(-brief)? · .*→ fight:/.test(notes), notes);
        ok(`${name}: every tap named by its control, once`, fights.length === 1 && fights[0].outing === camp.outing.id && acts.includes('fight:crew-deploy') && acts.includes('fight:end')
          && acts.includes(kind === 'win' ? 'fight:commit-preview' : 'fight:police-back-off') && !acts.some(a => /aatami|lan|reijo/i.test(a)), JSON.stringify({ acts, fights }));
        await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
      }
      const strip = await page.locator('.fight-strip').innerText().catch(() => '');
      ok(`${name}: what changed is a strip on the map`, kind === 'win'
        ? /They ran\. A Torkkelinmäki courtyard is yours\./i.test(strip) && /intel \+1/i.test(strip)
        : /The police came to A Torkkelinmäki courtyard\./i.test(strip) && /Jade Lantern Network -1/i.test(strip), strip);
      ok(`${name}: the job's stakes, paid`, kind === 'win'
        ? s.intel === (before.intel ?? 0) + 1 && s.relationships.jade_lantern_network === before.relationships.jade_lantern_network + 1
        : s.relationships.jade_lantern_network === before.relationships.jade_lantern_network - 1, JSON.stringify({ intel: [before.intel, s.intel], jade: [before.relationships.jade_lantern_network, s.relationships.jade_lantern_network] }));
      // G2 (v4.93): a win takes the fallen's weapons into the stash and says so
      // on the strip. They break at two-thirds of their weight, so the tough
      // one (the tire iron) is always among them; the phone is no weapon, and
      // whoever ran kept theirs. The police ending takes nothing.
      const count = (list, id) => (list ?? []).filter(item => item.id === id).length;
      const took = kind === 'win' ? camp.outing.rivals.filter(r => (camp.outing.down ?? []).includes(r.id) && r.carries !== 'feature-phone').map(r => r.carries) : [];
      ok(`${name}: the fallen's weapons go in the stash`, kind === 'win'
        ? took.includes('tire-iron') && took.every(id => count(s.equipment, id) === count(before.equipment, id) + took.filter(t => t === id).length) && /Took a tire iron.* off them\. The fence on Piritori buys\./.test(strip)
        : s.equipment.length === before.equipment.length && !/Took/.test(strip), JSON.stringify({ took, down: camp.outing.down, strip }));
      await shot(page, `${view}-${kind}-map`);
      const clear = await page.evaluate(() => {
        const last = document.querySelector('.fight-strip')?.lastElementChild;
        if (!last) return { ok: false };
        // scrollIntoView ignores a sticky bar over the scrollport, so scroll
        // on by whatever still sits under it: the question is whether a
        // player CAN read the line, not where the browser happens to stop.
        last.scrollIntoView({ block: 'end' });
        const barTop = () => Math.min(innerHeight, ...[...document.querySelectorAll('.next-step, nav')]
          .filter(el => ['fixed', 'sticky'].includes(getComputedStyle(el).position))
          .map(el => el.getBoundingClientRect()).filter(r => r.height && r.top > innerHeight / 2).map(r => r.top));
        let scroller = last.parentElement;
        while (scroller && !(scroller.scrollHeight > scroller.clientHeight && /auto|scroll/.test(getComputedStyle(scroller).overflowY))) scroller = scroller.parentElement;
        (scroller ?? document.scrollingElement).scrollTop += Math.max(0, last.getBoundingClientRect().bottom - barTop()) + 4;
        const r = last.getBoundingClientRect(), top = barTop();
        return { ok: r.bottom <= top + 1, bottom: Math.round(r.bottom), top: Math.round(top) };
      });
      ok(`${name}: the strip's last line scrolls clear of the bars`, clear.ok, JSON.stringify(clear));
      await page.reload();
      await page.waitForFunction(() => Boolean(window.__ptv3?.state));
      const again = await S(page);
      ok(`${name}: once: a reload pays nothing twice`, again.intel === s.intel && again.scheduleIndex === s.scheduleIndex && again.relationships.jade_lantern_network === s.relationships.jade_lantern_network);
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
