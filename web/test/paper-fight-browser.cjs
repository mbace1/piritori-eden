// Paper fights in a browser (Act I v4.72).
//
//   NODE_PATH=$(npm root -g) node web/test/paper-fight-browser.cjs
//
// paper-fight.mjs holds the motion; this holds the screen: the fight drawn
// in cut paper over the place's plate, every fighter actually painted where
// its token is, the beats acted out and finished, the switch to 3D and back,
// the THINGS TO TEST jump, reduced motion, and a phone.
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

function watchErrors(page) {
  const errors = []; let shellMisses = 0;
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  // ../hub/shell.js only exists under the arcade: one known 404 per load.
  page.on('response', r => { if (r.status() === 404 && new URL(r.url()).pathname.endsWith('/hub/shell.js')) shellMisses += 1; });
  page.on('requestfailed', r => { if (!new URL(r.url()).pathname.endsWith('/hub/shell.js')) errors.push(`requestfailed: ${r.url()}`); });
  return () => {
    let forgive = shellMisses;
    return errors.filter(e => !(forgive > 0 && /Failed to load resource: .*404/.test(e) && forgive--));
  };
}

/** Painted pixels on the paper canvas just above each standing unit's token
 *  anchor (its feet): a figure that is not drawn where its token is fails. */
const paintedAtTokens = page => page.evaluate(() => {
  const canvas = document.querySelector('canvas.paper-fight');
  if (!canvas) return { missing: true };
  const ctx = canvas.getContext('2d');
  const box = canvas.getBoundingClientRect();
  const sx = canvas.width / box.width, sy = canvas.height / box.height;
  const battle = window.__ptv3.state.battle;
  const out = [];
  for (const unit of [...battle.players, ...battle.enemies].filter(u => u.alive)) {
    const token = document.querySelector(`.unit-token[data-unit="${CSS.escape(unit.id)}"]`);
    if (!token) { out.push({ id: unit.id, token: false }); continue; }
    // The token's left/top is where render3d and the paper both root the feet.
    const stage = token.closest('.battle-stage').getBoundingClientRect();
    const left = token.style.left.endsWith('%') ? parseFloat(token.style.left) / 100 * stage.width : parseFloat(token.style.left);
    const top = token.style.top.endsWith('%') ? parseFloat(token.style.top) / 100 * stage.height : parseFloat(token.style.top);
    const x = Math.round((stage.left + left - box.left) * sx), y = Math.round((stage.top + top - box.top) * sy);
    const w = Math.round(30 * sx), h = Math.round(70 * sy);
    const data = ctx.getImageData(Math.max(0, x - w / 2), Math.max(0, y - h), w, h).data;
    let ink = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i] > 200) ink += 1;
    out.push({ id: unit.id, ink });
  }
  return { units: out };
});

const busy = page => page.evaluate(() => document.querySelector('canvas.paper-fight')?.dataset.busy);
async function settles(page, ms) {
  const until = Date.now() + ms;
  let sawBusy = false;
  while (Date.now() < until) {
    const b = await busy(page);
    if (b === '1') sawBusy = true;
    if (sawBusy && b === '0') return { sawBusy, settled: true };
    await page.waitForTimeout(80);
  }
  return { sawBusy, settled: false };
}

server.listen(0, '127.0.0.1', async () => {
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const fight = `${base}/web/?battle=battle-karhupuisto-2v2&at=hakaniemi&by=jade_lantern_network&fight=paper`;
  try {
    for (const [name, vp, touch] of [['desktop', { width: 1280, height: 800 }, false], ['phone', { width: 390, height: 844 }, true]]) {
      const page = await browser.newPage({ viewport: vp, hasTouch: touch, isMobile: touch });
      const errors = watchErrors(page);
      await page.goto(fight);
      await page.waitForSelector('canvas.paper-fight', { timeout: 30000 });
      await page.waitForTimeout(600);
      ok(`${name}: the fight is drawn in paper, not 3D`, await page.locator('canvas.paper-fight').count() === 1 && await page.locator('canvas.stage3d-canvas').count() === 0);
      ok(`${name}: on the place's plate`, await page.locator('.battle-stage[data-place="hakaniemi"] .scene-image').count() === 1);
      const painted = await paintedAtTokens(page);
      ok(`${name}: every standing fighter is painted where its token is`, painted.units?.length >= 4 && painted.units.every(u => u.ink > 40), JSON.stringify(painted));
      ok(`${name}: the tokens are still the tap targets`, await page.locator('.unit-token').count() >= 4
        && await page.evaluate(() => getComputedStyle(document.querySelector('canvas.paper-fight')).pointerEvents) === 'none');
      // A turn: the crew act, the rivals answer, and all of it is acted out.
      await page.locator('[data-battle-action="auto"], button:has-text("AUTO TEAM")').first().click();
      const beats = await page.evaluate(() => window.__ptv3.state.battle.beats.length);
      const run = await settles(page, 20000);
      ok(`${name}: the turn's beats are recorded and acted out to the end`, beats > 0 && run.sawBusy && run.settled, JSON.stringify({ beats, run }));
      ok(`${name}: strikes are among them`, await page.evaluate(() => window.__ptv3.state.battle.beats.some(b => b.kind === 'strike')));
      ok(`${name}: no overflow`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      ok(`${name}: no page errors`, errors().length === 0, errors().join(' | '));
      await page.close();
    }

    // The switch: the same fight in 3D and back, from the pause menu, remembered.
    {
      const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
      const errors = watchErrors(page);
      await page.goto(fight);
      await page.waitForSelector('canvas.paper-fight', { timeout: 30000 });
      await page.locator('#pauseButton').click();
      const toggle = page.locator('[data-pause="fight-look"]');
      ok('the pause menu says how fights are drawn', /FIGHTS · PAPER/.test(await toggle.innerText()));
      await toggle.click();
      await page.waitForSelector('canvas.stage3d-canvas', { timeout: 20000 });
      ok('one tap: the same fight in 3D', await page.locator('canvas.paper-fight').count() === 0 && /FIGHTS · 3D/.test(await toggle.innerText()));
      ok('and it is remembered', await page.evaluate(() => localStorage.getItem('piritori-to-eden:fight-look')) === '3d');
      await toggle.click();
      await page.waitForSelector('canvas.paper-fight', { timeout: 20000 });
      ok('and back to paper', await page.locator('canvas.stage3d-canvas').count() === 0);
      // THINGS TO TEST carries the paper fight with its own jump, and the
      // jump sets the look itself: leave the switch on 3D first.
      await toggle.click();
      await page.waitForSelector('canvas.stage3d-canvas', { timeout: 20000 });
      // A REAL click: the fighters' depth z-index once rose above the pause
      // veil and took it (fixed in v4.72 by isolating .battle-stage).
      const tests = page.locator('[data-pause="tests"]');
      const onTop = await tests.evaluate(el => { const r = el.getBoundingClientRect(); return document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2) === el || el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)); });
      ok('the pause menu is above the fighters', onTop);
      await tests.click({ timeout: 8000 });
      const item = page.locator('[data-pause="jump"][data-test="battle-paper"]');
      ok('THINGS TO TEST lists the paper fight with a jump', await item.count() === 1);
      await item.click({ timeout: 8000 });
      await page.waitForSelector('canvas.paper-fight', { timeout: 20000 });
      const s = await page.evaluate(() => ({ at: window.__ptv3.state.battle?.place?.anchor, mode: window.__ptv3.state.mode }));
      ok('the jump lands in a paper fight behind the market hall', s.mode === 'battle' && s.at === 'hakaniemi', JSON.stringify(s));
      ok('switch: no page errors', errors().length === 0, errors().join(' | '));
      await page.close();
    }

    // Reduced motion: no breath, no anticipation, but the board still says
    // what happened — each beat as its end pose, held briefly.
    {
      const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
      const page = await context.newPage();
      const errors = watchErrors(page);
      await page.goto(fight);
      await page.waitForSelector('canvas.paper-fight', { timeout: 30000 });
      await page.locator('[data-battle-action="auto"], button:has-text("AUTO TEAM")').first().click();
      const beats = await page.evaluate(() => window.__ptv3.state.battle.beats.length);
      const run = await settles(page, 8000);
      ok('reduced motion: the beats still play, briefly, and finish', beats > 0 && run.settled, JSON.stringify({ beats, run }));
      const painted = await paintedAtTokens(page);
      ok('reduced motion: everyone standing is still drawn', painted.units?.every(u => u.ink > 40), JSON.stringify(painted));
      ok('reduced motion: no page errors', errors().length === 0, errors().join(' | '));
      await context.close();
    }
  } catch (error) {
    ok('unhandled paper-fight gate error', false, error.stack ?? error.message);
  }
  await browser.close(); server.close();
  console.log(`\n  ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
});
