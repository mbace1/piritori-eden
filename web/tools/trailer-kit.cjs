// The trailer kit's shared parts: the frozen, stepped clock, a static server
// and the frame recorder. trailer.cjs (the 19 s teaser) and
// progress-trailer.cjs (where Act I stands) both record through these, so the
// two cuts cannot drift into two clocks.
const http = require('node:http'), fs = require('node:fs'), path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const FPS = 30, W = 1280, H = 720, DPR = 1.5;
const FONT = path.join(ROOT, 'web/crew-run/fonts/BarlowCondensed-SemiBold.ttf');

// Freeze-and-step clock. Until `__freeze()` everything runs on real time, so a
// page loads and settles as it always does; after it, time only moves in
// `__step(ms)`, which fires due timers in order and then one animation frame.
const CLOCK = `(() => {
  const R = { now: performance.now.bind(performance), dnow: Date.now, raf: requestAnimationFrame.bind(window), caf: cancelAnimationFrame.bind(window),
    st: setTimeout.bind(window), ct: clearTimeout.bind(window), si: setInterval.bind(window), ci: clearInterval.bind(window) };
  let frozen = false, t = 0, offset = 0, ids = 1e7; const rafs = new Map(), timers = new Map();
  performance.now = () => frozen ? t : R.now();
  Date.now = () => frozen ? Math.round(offset + t) : R.dnow();
  window.requestAnimationFrame = cb => { if (!frozen) return R.raf(cb); const id = ++ids; rafs.set(id, cb); return id; };
  window.cancelAnimationFrame = id => { if (!rafs.delete(id)) R.caf(id); };
  window.setTimeout = (fn, ms = 0, ...a) => { if (!frozen) return R.st(fn, ms, ...a); const id = ++ids; timers.set(id, { at: t + Math.max(0, +ms || 0), fn, a }); return id; };
  window.clearTimeout = id => { if (!timers.delete(id)) R.ct(id); };
  window.setInterval = (fn, ms = 0, ...a) => { if (!frozen) return R.si(fn, ms, ...a); const every = Math.max(1, +ms || 1), id = ++ids; timers.set(id, { at: t + every, fn, a, every }); return id; };
  window.clearInterval = id => { if (!timers.delete(id)) R.ci(id); };
  window.__freeze = () => { if (frozen) return; t = R.now(); offset = R.dnow() - t; frozen = true; };
  window.__step = ms => {
    const end = t + ms;
    for (;;) {
      let id = null, due = null;
      for (const [k, v] of timers) if (v.at <= end && (!due || v.at < due.at)) { id = k; due = v; }
      if (!due) break;
      t = Math.max(t, due.at);
      if (due.every) due.at += due.every; else timers.delete(id);
      try { if (typeof due.fn === 'function') due.fn(...due.a); } catch (e) { console.error(e); }
    }
    t = end;
    const cbs = [...rafs.values()]; rafs.clear();
    for (const cb of cbs) try { cb(t); } catch (e) { console.error(e); }
  };
})();`;

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.ttf': 'font/ttf', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
function serve(root) {
  return new Promise(done => {
    const server = http.createServer((req, res) => {
      const url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      let file = path.join(root, url);
      if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
      if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
      if (!fs.existsSync(file)) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'access-control-allow-origin': '*' });
      fs.createReadStream(file).pipe(res);
    }).listen(0, '127.0.0.1', () => done({ server, base: `http://127.0.0.1:${server.address().port}` }));
  });
}

async function frames(page, dir, count, cues = {}) {
  fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  await page.evaluate(() => window.__freeze());
  for (let f = 0; f < count; f++) {
    if (cues[f]) await cues[f](page);
    await page.evaluate(ms => window.__step(ms), 1000 / FPS);
    await page.screenshot({ path: path.join(dir, `${String(f).padStart(4, '0')}.png`), timeout: 180000 });
  }
  console.log(`  ${path.basename(dir)}: ${count} frames`);
}

const ff = args => { try { execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...args], { stdio: ['ignore', 'ignore', 'pipe'] }); } catch (e) { throw Error(`ffmpeg failed: ${e.stderr}\n${args.join(' ')}`); } };
const enc = ['-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-r', String(FPS)];

module.exports = { ROOT, FPS, W, H, DPR, FONT, CLOCK, TYPES, serve, frames, ff, enc };
