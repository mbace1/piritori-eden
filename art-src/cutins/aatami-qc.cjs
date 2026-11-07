// Read-only Aatami cut-in capture. Requires Playwright (same dependency as render.cjs).
// node art-src/cutins/aatami-qc.cjs [output-dir]
// Simulated viewports for human review; NOT device/gameplay approval.
'use strict';
const { chromium } = require('playwright');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const os = require('node:os');
const ROOT = path.resolve(__dirname, '../..');
const OUT = path.resolve(process.argv[2] || path.join(os.tmpdir(), 'piritori-aatami-qc'));
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp' };
const VIEWS = ['aatami', 'aatami-side'];
const SIZES = { phone: { width: 390, height: 844 }, desktop: { width: 1440, height: 900 } };
const FRAMES = [['idle', 0.1], ['blink', 1.7], ['talk', 5.7], ['nod', 8.65], ['shake', 10.1]];
const server = http.createServer((req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1');
    const file = path.resolve(ROOT, '.' + decodeURIComponent(url.pathname));
    if (!file.startsWith(ROOT + path.sep)) { res.writeHead(403); return res.end(); }
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
      res.end(data);
    });
  } catch { res.writeHead(400); res.end(); }
});
async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  await new Promise((ok, no) => { server.once('error', no); server.listen(0, '127.0.0.1', ok); });
  let browser;
  const shots = [];
  try {
    browser = await chromium.launch();
    for (const who of VIEWS) for (const [name, size] of Object.entries(SIZES)) {
      const page = await browser.newPage({ viewport: size, deviceScaleFactor: 1 });
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      page.on('response', r => {
        if (r.status() >= 400 && !r.url().endsWith('/favicon.ico')) errors.push('HTTP ' + r.status() + ': ' + r.url());
      });
      try {
        for (const still of [false, true]) {
          await page.emulateMedia({ reducedMotion: still ? 'reduce' : 'no-preference' });
          await page.goto('http://127.0.0.1:' + server.address().port +
            '/art-src/cutins/review.html?who=' + encodeURIComponent(who) +
            '&scene=scene-club-v01' + (still ? '&still=1' : ''));
          await page.waitForFunction(() => window.__ready === true && !!window.__review, null, { timeout: 60000 });
          if (errors.length) throw Error(errors.join('\n'));
          const scale = Math.min(size.width / 1080, size.height / 1920);
          await page.evaluate(d => {
            document.documentElement.style.height = '100%';
            document.body.style.cssText = 'display:flex;align-items:center;justify-content:center;width:100vw;height:100vh;margin:0;overflow:hidden;background:#141414';
            const stage = document.getElementById('s'), canvas = document.getElementById('c');
            stage.style.width = d.w + 'px'; stage.style.height = d.h + 'px';
            canvas.style.width = '100%'; canvas.style.height = '100%';
          }, { w: Math.floor(1080 * scale), h: Math.floor(1920 * scale) });
          for (const [moment, seconds] of (still ? [['reduced-motion-rest', 5.7]] : FRAMES)) {
            await page.evaluate(t => { window.__review.frame(t); }, seconds);
            const file = who + '-' + name + '-' + moment + '.png';
            await page.screenshot({ path: path.join(OUT, file), animations: 'disabled' });
            shots.push({ who, viewport: name, viewportSize: size, moment, seconds, file });
          }
        }
      } finally { await page.close(); }
    }
    // Review-only actual animation from the existing Aatami paper rigs and the
    // game's own cutin-stage.js clips. Deterministic 10 fps captures; no new
    // character art, no runtime/manifest changes and no implied approval.
    const motion = [];
    for (const who of VIEWS) {
      const size = SIZES.phone;
      const page = await browser.newPage({ viewport: size, deviceScaleFactor: 1 });
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      page.on('response', r => {
        if (r.status() >= 400 && !r.url().endsWith('/favicon.ico'))
          errors.push('HTTP ' + r.status() + ': ' + r.url());
      });
      try {
        await page.goto('http://127.0.0.1:' + server.address().port +
          '/art-src/cutins/review.html?who=' + encodeURIComponent(who) +
          '&scene=scene-club-v01');
        await page.waitForFunction(() => window.__ready === true && !!window.__review, null, { timeout: 60000 });
        if (errors.length) throw Error(errors.join('\n'));
        const scale = Math.min(size.width / 1080, size.height / 1920);
        await page.evaluate(d => {
          document.documentElement.style.height = '100%';
          document.body.style.cssText = 'display:flex;align-items:center;justify-content:center;width:100vw;height:100vh;margin:0;overflow:hidden;background:#141414';
          const stage = document.getElementById('s'), canvas = document.getElementById('c');
          stage.style.width = d.w + 'px'; stage.style.height = d.h + 'px';
          canvas.style.width = '100%'; canvas.style.height = '100%';
        }, { w: Math.floor(1080 * scale), h: Math.floor(1920 * scale) });
        const total = await page.evaluate(() => window.__review.TOTAL);
        const fps = 10, count = Math.round(total * fps);
        const framesDir = path.join(OUT, 'motion-frames', who);
        fs.mkdirSync(framesDir, { recursive: true });
        for (let i = 0; i < count; i++) {
          await page.evaluate(t => window.__review.frame(t), i / fps);
          await page.screenshot({
            path: path.join(framesDir, 'frame-' + String(i).padStart(4, '0') + '.png'),
            animations: 'disabled',
          });
        }
        if (errors.length) throw Error(errors.join('\n'));
        motion.push({ who, fps, frameCount: count, seconds: total,
          size, framesDir: 'motion-frames/' + who,
          gif: who + '-dialogue-motion.gif',
          source: 'existing cutin-stage.js rig and idle/talk/nod/shake clips; review only' });
      } finally { await page.close(); }
    }
    fs.writeFileSync(path.join(OUT, 'motion-manifest.json'),
      JSON.stringify({ scope: 'candidate-only; simulated browser, no device or runtime approval',
        motion }, null, 2) + '\n');
    const cards = shots.map(s =>
      '<figure><img loading="lazy" src="' + s.file + '"><figcaption>' +
      s.who + ' · ' + s.viewport + ' · ' + s.moment + ' (' + s.seconds + 's)</figcaption></figure>').join('\n');
    const html = '<!doctype html><meta charset="utf-8"><title>Aatami cut-in review QC</title>' +
      '<style>body{font:15px system-ui;background:#222;color:#eee;margin:24px}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:24px}figure{margin:0}img{width:100%;max-height:750px;object-fit:contain}figcaption{line-height:1.6}</style>' +
      '<h1>Aatami: review candidates only</h1><p><a href="aatami-dialogue-motion.gif">Front dialogue GIF</a> · <a href="aatami-side-dialogue-motion.gif">Side dialogue GIF</a></p><p>Simulated viewport snapshots, letterboxed from the existing 1080x1920 composition. Inspect seams, blink, edge halos, bubble clearance, text size and rest pose. This is NOT a physical phone/iPad test, real game landscape layout, animation-smoothness pass, or asset approval.</p><main>' + cards + '</main>';
    fs.writeFileSync(path.join(OUT, 'index.html'), html);
    fs.writeFileSync(path.join(OUT, 'capture-manifest.json'), JSON.stringify({ scope: 'review-only; no approval', shots }, null, 2) + '\n');
    console.log('Wrote ' + shots.length + ' still frames and ' + motion.map(m => m.frameCount).join('+') + ' animation frames to ' + OUT);
  } finally {
    if (browser) await browser.close();
    await new Promise(ok => server.close(ok));
  }
}
main().catch(e => { console.error(e.stack || e); process.exitCode = 1; });
