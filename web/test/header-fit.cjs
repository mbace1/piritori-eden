// The city header fits — from a 320px phone to a desktop, with the arcade's
// shell mounted over it.
//
//   NODE_PATH=$(npm root -g) node web/test/header-fit.cjs
//
// Three faults found by filming v4.54, none of which any gate could see: the
// shell's floating HUB button sat on "2003 · AATAMI · ERA I" at every width;
// INTEL read "INTE" at 390px and every value was cut at 360px ("16" for 160);
// the wordmark ran under the day card at 320px. Measured, not eyeballed.
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

// The arcade's shell is only on the deployed site (../hub/shell.js 404s here),
// so a stand-in with the shell's OWN rule is injected after the page's sheet —
// exactly how the real one arrives — and must still end up hidden.
const SHELL_RULE = `.arcade-home{position:fixed;top:10px;left:10px;z-index:2147483000;display:inline-flex;min-height:44px;padding:10px 13px}`;

server.listen(0, '127.0.0.1', async () => {
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  try {
    for (const w of [320, 360, 390, 430, 760, 1280]) {
      const touch = w < 760;
      const page = await browser.newPage({ viewport: { width: w, height: touch ? 780 : 800 }, hasTouch: touch, isMobile: touch });
      const errs = watchErrors(page);
      await page.goto(`${base}/web/`);
      await page.waitForFunction(() => Boolean(window.__ptv3?.data));
      await page.locator('#beginButton').click();
      await page.waitForSelector('.city-map');
      const r = await page.evaluate(rule => {
        const s = document.createElement('style'); s.textContent = rule; document.head.appendChild(s);
        const a = document.createElement('a'); a.className = 'arcade-home'; a.textContent = '⌂ Hub'; document.body.appendChild(a);
        const box = el => el.getBoundingClientRect();
        const hit = (p, q) => !(p.right <= q.left || q.right <= p.left || p.bottom <= q.top || q.bottom <= p.top);
        const shellShown = getComputedStyle(a).display !== 'none';
        const covered = shellShown ? [...document.querySelectorAll('.topbar *')]
          .filter(e => !e.children.length && e.textContent.trim() && hit(box(e), box(a))).map(e => e.textContent.trim()) : [];
        const clipped = [...document.querySelectorAll('.resource-strip dt, .resource-strip dd')]
          .filter(e => e.scrollWidth > e.clientWidth + 0.5 || box(e).right > box(e.parentElement).right + 0.5).map(e => e.textContent);
        const range = document.createRange(); range.selectNodeContents(document.querySelector('.brand-lockup h1'));
        const ink = Math.max(...[...range.getClientRects()].map(q => q.right));
        const card = box(document.querySelector('.time-card'));
        const wordmarkClear = ink <= card.left + 0.5 || card.top >= Math.max(...[...range.getClientRects()].map(q => q.bottom));
        const home = document.querySelector('.top-actions a[href*="Suds-Jack"]');
        const hb = home && box(home);
        return { shellShown, covered, clipped, wordmarkClear, homeOk: Boolean(hb && hb.width >= 44 && hb.height >= 44),
          overflowX: document.documentElement.scrollWidth > innerWidth };
      }, SHELL_RULE);
      ok(`${w}px: the shell's floating HUB button is hidden on this page`, !r.shellShown);
      ok(`${w}px: nothing in the header sits under it`, r.covered.length === 0, r.covered.join(' | '));
      ok(`${w}px: the page's own ⌂ hub link is there at 44px+`, r.homeOk);
      ok(`${w}px: every resource label and value fits its card`, r.clipped.length === 0, r.clipped.join(' | '));
      ok(`${w}px: the wordmark clears the day card`, r.wordmarkClear);
      ok(`${w}px: no horizontal scroll`, !r.overflowX);
      ok(`${w}px: no browser errors`, errs().length === 0, errs().join(' | '));
      await page.close();
    }
  } catch (error) {
    ok('unhandled header gate error', false, error.stack || error.message);
  } finally {
    await browser.close();
    server.close();
    console.log(`\n  ${passed} passed, ${failed} failed`);
    process.exit(failed ? 1 : 0);
  }
});
