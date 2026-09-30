// Aatami on the board in a browser (H6.1, owner answer 24).
//
//   NODE_PATH=$(npm root -g) node web/test/aatami-browser.cjs
//
// aatami.mjs holds the rule; this holds the screen. Fixtures set the scene
// (the block, who is hired, which door is on the board); the fight starts
// from a real tap, and what the board shows is read off the page.
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
      const crew = await page.evaluate(() => window.__ptv3.data.content.crew.map(c => c.id));
      const scene = n => `s.battle = null; s.mode = "route"; s.scheduleIndex = 15; s.selectedAnchor = "karhupuisto"; s.recruited = a.slice(0, ${n}); s.deployed = [...s.recruited]; s.doors = { offers: { 15: [{ template: "hit-bear-debt", anchor: "karhupuisto" }] }, taken: {} }; s.fightsByDay = {}; s.choices = {}; s.flags = s.flags.filter(f => f !== "memory:aatami-stepped-back"); s.chapter = ${n === 3 ? 3 : 1};`;
      // One hire: Aatami makes the second fighter.
      await fixture(page, scene(1), crew);
      await page.locator('[data-action="take-door"][data-door="hit-bear-debt"]').click();
      await page.locator('[data-action="next-step"][data-step="enter"]').click();
      const lean = page.locator('[data-action="choose"][data-choice="lean"]');
      ok(`${name}: with one hire the fight is open (Aatami fights)`, await lean.isEnabled());
      await lean.click();
      let s = await S(page);
      ok(`${name}: Aatami is on the board, in front`, s.mode === 'battle' && s.battle.players[0]?.id === 'aatami' && s.battle.players[0].name === 'Aatami');
      ok(`${name}: and not stepped back`, !s.flags.includes('memory:aatami-stepped-back'));
      // Nobody hired: the bear debt's fight is closed, and says why.
      await fixture(page, scene(0), crew);
      await page.locator('[data-action="take-door"][data-door="hit-bear-debt"]').click();
      await page.locator('[data-action="next-step"][data-step="enter"]').click();
      ok(`${name}: alone he cannot take a two-a-side fight, and the card says so`, await lean.isDisabled() && /needs 2 who can fight/.test(await lean.innerText()));
      // Chapter 3 (GDD §16, The Supplier): the first fight he stays out of is a beat.
      await fixture(page, scene(3), crew);
      await page.locator('[data-action="take-door"][data-door="hit-bear-debt"]').click();
      await page.locator('[data-action="next-step"][data-step="enter"]').click();
      await lean.click();
      s = await S(page);
      ok(`${name}: in chapter 3 he steps back`, s.mode === 'battle' && !s.battle.players.some(p => p.id === 'aatami') && s.flags.includes('memory:aatami-stepped-back'));
      ok(`${name}: and the fight opens on that beat`, /edge of the board/.test(s.battle.log.join(' ')));
      ok(`${name}: no overflow`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      const e = errors();
      ok(`${name}: no errors`, e.length === 0, e.join(' | '));
      await page.close();
    }
  } catch (err) { failed += 1; console.log('  FAIL crashed →', err.stack); }
  await browser.close(); server.close();
  console.log(`aatami-browser: ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
});
