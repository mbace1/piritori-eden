// The play log, as the player meets it (v4.103): play a little, open the
// pause menu's PLAYTEST NOTES, read what this device saw, then SEND, COPY and
// CLEAR. The arcade's feedback module is stubbed at its own URL, so SEND is
// checked end to end without posting anywhere.
//
//   NODE_PATH=$(npm root -g) node web/test/playtest-browser.cjs
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
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
function watchErrors(page) {
  const errors = []; let shellMisses = 0;
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  page.on('response', r => { if (r.status() === 404 && new URL(r.url()).pathname.endsWith('/hub/shell.js')) shellMisses += 1; });
  page.on('requestfailed', r => { const why = r.failure()?.errorText ?? ''; if (!new URL(r.url()).pathname.endsWith('/hub/shell.js') && why !== 'net::ERR_ABORTED') errors.push(`requestfailed: ${r.url()} (${why})`); });
  return () => { let forgive = shellMisses; return errors.filter(e => !(forgive > 0 && /Failed to load resource: .*404/.test(e) && forgive--)); };
}
const notes = page => page.locator('.playtest-notes').innerText();
const said = page => page.locator('.playtest-said').innerText();
async function openNotes(page) {
  await page.locator('#pauseButton').click();
  await page.locator('[data-pause="playtest"]').click();
  await page.waitForSelector('.playtest-notes');
}

server.listen(0, '127.0.0.1', async () => {
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: { width: 412, height: 915 } });
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: base });
    const page = await context.newPage();
    const errors = watchErrors(page);
    // The arcade's feedback module, at the URL the game asks for it.
    await page.route('**/hub/feedback.js', route => route.fulfill({ contentType: 'text/javascript',
      body: 'export async function send(entry) { window.__note = entry; return "sent"; }' }));

    await page.goto(`${base}/web/?skip`);
    await page.waitForFunction(() => Boolean(window.__ptv3?.data));
    // A fresh log: cleared through the recorder, since leaving a page writes
    // what it holds (a hidden tab is an event too).
    await page.evaluate(() => window.__ptv3.playlog.clear());
    await page.reload();
    await page.waitForFunction(() => Boolean(window.__ptv3?.data));
    await page.locator('#beginButton').click();
    await page.waitForSelector('.city-map');

    // A little play: a pause, a journey, the ledger.
    await page.waitForTimeout(1200);
    await page.locator('[data-anchor-group="siltasaari"] .map-anchor-hit').click({ force: true });
    await page.locator('[data-action="plan-journey"]').click();
    await page.locator('[data-action="commit-journey"]').click();
    await page.locator('#modeNav [data-mode-target="ledger"]').click();

    await openNotes(page);
    let text = await notes(page);
    ok('the pause menu has the notes', /playtest notes/.test(text) && /Played: 1 session,/.test(text), text);
    ok('they name the slowest moments, with what came next', /Slowest moments/.test(text) && /→ (select-anchor|plan-journey|commit-journey)/.test(text), text);
    ok('what was on screen and never used', /Offered, never used: .*market trade|Offered, never used: .*Toko|Offered, never used: .*showing the lead/.test(text), text);
    ok('and where play stopped', /Stopped: DAY 1 · DAY/.test(text), text);

    await page.locator('[data-pause="pt-send"]').click();
    await page.waitForFunction(() => /Sent to the arcade/.test(document.querySelector('.playtest-said')?.textContent ?? ''));
    const note = await page.evaluate(() => window.__note);
    ok('SEND goes through the arcade\'s feedback, as a playtest', note?.game === 'piritori' && note.kind === 'playtest' && /Slowest moments/.test(note.text), JSON.stringify(note)?.slice(0, 200));
    ok('and says so', /Sent to the arcade/.test(await said(page)));

    await page.locator('[data-pause="pt-copy"]').click();
    await page.waitForFunction(() => /Copied|Selected/.test(document.querySelector('.playtest-said')?.textContent ?? ''));
    const clip = await page.evaluate(() => navigator.clipboard.readText().catch(() => ''));
    ok('COPY puts the notes on the clipboard', /playtest notes/.test(clip) || /Selected/.test(await said(page)), clip.slice(0, 80));

    // The notes survive a reload: they are the device's, not the page's.
    await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
    await page.reload();
    await page.waitForFunction(() => Boolean(window.__ptv3?.data));
    await page.locator('#resumeButton').click();
    await page.waitForFunction(() => document.getElementById('splash').hidden);
    await openNotes(page);
    text = await notes(page);
    ok('a reload keeps them, as a second session', /Played: 2 sessions/.test(text), text.split('\n')[1]);

    await page.locator('[data-pause="pt-clear"]').click();
    ok('CLEAR empties them', /Nothing played on this device yet/.test(await notes(page)) && /Cleared/.test(await said(page)));

    const errs = errors();
    ok('no errors', errs.length === 0, errs.join(' | '));
  } catch (error) {
    failed += 1; console.log(`  FAIL ${error.stack}`);
  } finally {
    await browser.close(); server.close();
    console.log(`  ${passed} passed, ${failed} failed`);
    process.exit(failed ? 1 : 0);
  }
});
