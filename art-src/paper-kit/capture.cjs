// Render the AD1 boards to design/art-direction/ as JPEGs.
//   node art-src/paper-kit/capture.cjs
// Uses Playwright the same way web/test/*-browser.cjs do; serves the repo root
// so the page can reach web/fonts and art/v3.
const { chromium } = require('playwright');
const http = require('node:http'), fs = require('node:fs'), path = require('node:path');
const ROOT = path.resolve(__dirname, '..', '..'), OUT = path.join(ROOT, 'design', 'art-direction');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.woff2': 'font/woff2', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg' };
const srv = http.createServer((q, r) => {
  const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
});
srv.listen(0, '127.0.0.1', async () => {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1000, height: 1200 } }), errs = [];
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await p.goto(`http://127.0.0.1:${srv.address().port}/art-src/paper-kit/ad1-boards.html`);
  await p.waitForFunction(() => window.AD1_READY === true, null, { timeout: 60000 });
  const shots = await p.$$eval('canvas', (cs) => cs.map((c) => c.toDataURL('image/jpeg', 0.86)));
  const names = ['ad1-1-paper-families', 'ad1-2-edges', 'ad1-3-marker', 'ad1-4-pick-a-b-c'];
  fs.mkdirSync(OUT, { recursive: true });
  shots.forEach((d, i) => { const f = path.join(OUT, `${names[i]}.jpg`); fs.writeFileSync(f, Buffer.from(d.split(',')[1], 'base64')); console.log(path.relative(ROOT, f), Math.round(fs.statSync(f).size / 1024) + ' KB'); });
  if (errs.length) { console.error('page errors:', errs); process.exitCode = 1; }
  await b.close(); srv.close();
});
