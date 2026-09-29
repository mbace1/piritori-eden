// Doors in a browser (H2, owner greenlight 2026-09-29; answer 23).
//
//   NODE_PATH=$(npm root -g) node web/test/doors-browser.cjs
//
// doors.mjs holds the rules; this holds the screens. Fixtures only set the
// scene (which block it is, the crew, and, for the fight, which doors are
// on the board); taking a door, the walk, the choice and the fight are taps.
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


const S = page => page.evaluate(() => structuredClone(window.__ptv3.state));
const fixture = (page, body, arg) => page.evaluate(([b, a]) => { const s = structuredClone(window.__ptv3.state); new Function('s', 'a', b)(s, a); window.__ptv3.debug.setState(s); }, [body, arg]);
async function walkToLead(page) {
  for (let i = 0; i < 6; i += 1) {
    const step = await page.locator('[data-action="next-step"]').getAttribute('data-step').catch(() => null);
    if (step === 'enter') return true;
    if (await page.locator('[data-action="road-choose"]').count()) {
      const open = page.locator('[data-action="road-choose"]:not([disabled])');
      await open.last().click(); await page.locator('[data-action="road-continue"]').click(); continue;
    }
    if (step === 'plan' || step === 'commit') { await page.locator('[data-action="next-step"]').click(); continue; }
    return false;
  }
  return false;
}

server.listen(0, '127.0.0.1', async () => {
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    for (const [name, vp, touch] of [['desktop', { width: 1280, height: 800 }, false], ['phone', { width: 390, height: 844 }, true]]) {
      const page = await browser.newPage({ viewport: vp, hasTouch: touch, isMobile: touch });
      const errors = watchErrors(page);
      await page.goto(`${base}/web/?skip`);
      await page.waitForFunction(() => Boolean(window.__ptv3?.data && window.__ptv3.story?.case));
      await page.locator('#beginButton').click(); await page.waitForSelector('.city-map');
      await fixture(page, 's.scheduleIndex = 15; s.selectedAnchor = "piritori"; s.stock.piri = 2; const ids = a.slice(0, 3); s.recruited = ids; s.deployed = [...ids];',
        await page.evaluate(() => window.__ptv3.data.content.crew.map(c => c.id)));
      const board = page.locator('.door-board');
      ok(`${name}: a free block shows its doors`, await board.isVisible());
      const cards = await page.locator('.door-card').count();
      ok(`${name}: two or three doors (${cards})`, cards >= 2 && cards <= 3);
      ok(`${name}: one of them can become a fight`, await page.locator('.door-card .door-fight').count() >= 1);
      const anchors = new Set(await page.locator('.door-card').evaluateAll(els => els.map(e => e.dataset.anchor)));
      ok(`${name}: every door is pinned on the map`, await page.locator('.door-pin').count() === anchors.size);
      ok(`${name}: the next step says to choose a door`, await page.locator('[data-action="next-step"][data-step="doors"]').count() === 1);
      // Take a door that cannot become a fight, walk there, do it.
      // Most doors can go bad now (answer 25); pin one that cannot, so the walk is about walking.
      await fixture(page, 's.doors.offers[15] = [{ template: "gig-rauno-cart", anchor: "harju" }, { template: "hit-bear-debt", anchor: "karhupuisto" }];');
      const quiet = page.locator('[data-action="take-door"][data-door="gig-rauno-cart"]');
      const doorId = await quiet.getAttribute('data-door');
      await quiet.click();
      let s = await S(page);
      ok(`${name}: the door is taken`, s.doors.taken[15]?.template === doorId && !(await board.count()));
      ok(`${name}: and Aatami can walk to it`, await walkToLead(page));
      await page.locator('[data-action="next-step"][data-step="enter"]').click();
      ok(`${name}: the door plays as a briefed scene`, await page.locator('.encounter-copy .mission-steps li').count() === 3);
      await page.locator('[data-action="choose"]:not([disabled])').last().click();
      await page.locator('[data-action="advance"]').click();
      s = await S(page);
      ok(`${name}: it cost the block`, s.scheduleIndex === 16);
      ok(`${name}: the next free block has its own doors`, await page.locator('.door-card').count() >= 2
        && !(await page.locator('.door-card').evaluateAll(els => els.map(e => e.dataset.door))).includes(doorId));
      // A door fight (answer 23): the bear debt, with a crew.
      await fixture(page, 's.scheduleIndex = 15; s.selectedAnchor = "karhupuisto"; s.doors = { offers: { 15: [{ template: "hit-bear-debt", anchor: "karhupuisto" }, { template: "gig-rauno-cart", anchor: "harju" }] }, taken: {} }; s.fightsByDay = {};');
      await page.locator('[data-action="take-door"][data-door="hit-bear-debt"]').click();
      await page.locator('[data-action="next-step"][data-step="enter"]').click();
      const lean = page.locator('[data-action="choose"][data-choice="lean"]');
      ok(`${name}: the fight is offered with a crew`, await lean.isEnabled());
      await lean.click();
      s = await S(page);
      ok(`${name}: it is a door fight, not a mission`, s.battle?.door === 'hit-bear-debt' && s.battle.missionId === null && s.mode === 'battle');
      ok(`${name}: and it counts toward today's two`, s.fightsByDay?.[8] === 1);
      // Answer 25: a bad deal escalates. Selling two at the quay goes bad on this block's roll.
      const quay = (crew) => `s.battle = null; s.mode = "route"; s.scheduleIndex = 15; s.selectedAnchor = "sornainen_harbour"; s.stock.piri = 2; s.recruited = ${crew}; s.deployed = [...s.recruited]; s.doors = { offers: { 15: [{ template: "sale-quay-shift", anchor: "sornainen_harbour" }, { template: "gig-rauno-cart", anchor: "harju" }] }, taken: {} }; s.fightsByDay = {}; s.choices = {};`;
      await fixture(page, quay('a.slice(0, 3)'), await page.evaluate(() => window.__ptv3.data.content.crew.map(c => c.id)));
      await page.locator('[data-action="take-door"][data-door="sale-quay-shift"]').click();
      await page.locator('[data-action="next-step"][data-step="enter"]').click();
      ok(`${name}: a bad deal says it can go bad`, /CAN GO BAD · 40%/.test(await page.locator('[data-choice="sell-two"]').innerText()));
      await page.locator('[data-action="choose"][data-choice="sell-two"]').click();
      s = await S(page);
      ok(`${name}: it goes bad, and it is a fight`, s.battle?.door === 'sale-quay-shift' && s.battle.id === 'battle-kattilahalli-3v3' && s.fightsByDay?.[8] === 1);
      await fixture(page, quay('[]'));
      await page.locator('[data-action="take-door"][data-door="sale-quay-shift"]').click();
      await page.locator('[data-action="next-step"][data-step="enter"]').click();
      await page.locator('[data-action="choose"][data-choice="sell-two"]').click();
      s = await S(page);
      ok(`${name}: alone, it goes bad without a fight and costs the door`, !s.battle && /nobody was standing/.test(await page.locator('.outcome-card').innerText()));
      ok(`${name}: no overflow`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      const e = errors();
      ok(`${name}: no errors`, e.length === 0, e.join(' | '));
      await page.close();
    }
  } catch (err) { failed += 1; console.log('  FAIL crashed →', err.stack); }
  await browser.close(); server.close();
  console.log(`doors-browser: ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
});
