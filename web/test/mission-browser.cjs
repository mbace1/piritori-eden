// The two mission battles in Night Shift (Act I v4.79, C19_CAMPAIGN_FIGHTS
// §6.4 step 5), in a browser.
//
//   NODE_PATH=$(npm root -g) node web/test/mission-browser.cjs
//
// c19-outing.mjs holds the record and the stakes; this holds the screen. A
// fixture sets the block and the crew; the story lead, the choice that turns
// into the fight and the board fallback are real taps. Night Shift is a stub:
// this gate is about Act I.
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
      await page.route('**/web/crew-run/**', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Night Shift (stub)</title>' }));
      const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('piritori-to-eden:v3')));
      const open = async () => {
        await page.goto(`${base}/web/?skip`);
        await page.waitForFunction(() => Boolean(window.__ptv3?.data && window.__ptv3.story?.case));
      };
      await open();
      await page.locator('#beginButton').click(); await page.waitForSelector('.city-map');
      const crew = await page.evaluate(() => window.__ptv3.data.content.crew.map(c => c.id));
      for (const [index, anchor, choice, kit, people, mission] of [
        [8, 'karhupuisto', 'hold-path', 'park', /Rinne|Leko/, 'mission-bear-path'],
        [11, 'torkkelinmaki', 'take-positions', 'courtyard', /Kettunen|Peltola|Haddad/, 'mission-courtyard-receipts'],
      ]) {
        // FIXTURE: the story block of the mission, Aatami at its lead, three hired.
        await fixture(page, `s.battle = null; s.outing = null; s.mode = "route"; s.scheduleIndex = ${index}; s.selectedAnchor = "${anchor}"; s.recruited = a.slice(0, 3); s.deployed = [...s.recruited];`, crew);
        await page.locator('[data-action="next-step"][data-step="enter"]').click();
        const button = page.locator(`[data-action="choose"][data-choice="${choice}"]`);
        await button.waitFor();
        ok(`${name}/${mission}: the choice that fights is offered`, await button.isEnabled());
        await button.click();
        await page.waitForURL(/\/web\/crew-run\/\?campaign=1&outing=/);
        const s = await saved();
        ok(`${name}/${mission}: it goes straight to Night Shift, as a mission battle`, s.outing?.status === 'open' && s.outing.kind === 'mission' && s.outing.mission === mission && s.outing.goal === 'fight', JSON.stringify(s.outing && { kind: s.outing.kind, mission: s.outing.mission }));
        ok(`${name}/${mission}: at its own place`, s.outing.kit === kit && s.outing.anchor === anchor && new RegExp(`arena=${kit}`).test(page.url()));
        ok(`${name}/${mission}: against its own people`, s.outing.rivals.length >= 2 && s.outing.rivals.every(r => people.test(r.name)), s.outing.rivals.map(r => r.name).join(', '));
        ok(`${name}/${mission}: and it counts as the day's fight`, Object.values(s.fightsByDay ?? {}).some(n => n >= 1));
        // No 3D on this device: the board plays the same mission battle.
        await page.goto(`${base}/web/?outing=board`);
        await page.waitForFunction(() => Boolean(window.__ptv3?.state?.battle));
        const b = await S(page);
        ok(`${name}/${mission}: on the board it is the same battle, for the same mission`, b.mode === 'battle' && b.battle?.id === s.outing.battle && b.battle?.missionId === mission && !b.outing && !b.battle.door);
        // Back to the city with a board battle in the save: it loads (v4.79;
        // it used to fail on `cover.has`), and the next fixture resets the block.
        await open();
        ok(`${name}/${mission}: the save with a board battle in it loads`, !(await page.locator('text=LOAD FAILURE').count()));
        await page.locator('#resumeButton').click();
      }
      ok(`${name}: no overflow`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      const e = errors();
      ok(`${name}: no errors`, e.length === 0, e.join(' | '));
      await page.close();
    }
  } catch (err) { failed += 1; console.log('  FAIL crashed →', err.stack); }
  await browser.close(); server.close();
  console.log(`mission-browser: ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
});
