// Render Toko's counter clips with the Radio Free clay kit.
//
//   node art-src/clay-toko/render.cjs --kit <Suds-Jack checkout> --still idle:0      one PNG to art-src/clay-toko/work/
//   node art-src/clay-toko/render.cjs --kit <Suds-Jack checkout> --clip idle         frames + an MP4 into art/v3/cast-clay/
//   --res 0.5 for drafts; --probe prints where the mask and hands land.
//
// <Suds-Jack checkout> must be at the films branch (claude/radio-free-helsinki-pvtsw5);
// the commit used is written beside every output. The kit is served, never copied.
const { chromium } = require('playwright');
const http = require('node:http'), fs = require('node:fs'), path = require('node:path'), { execFileSync } = require('node:child_process');
const argv = process.argv.slice(2), arg = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : d; }, has = (n) => argv.includes('--' + n);
const REPO = path.resolve(__dirname, '..', '..'), KIT = path.resolve(arg('kit', ''));
const LIB = path.join(KIT, 'radiofree/studio/art-motion/clay/dishes/lib'), VENDOR = path.join(KIT, 'radiofree/studio/vendor');
if (!fs.existsSync(path.join(LIB, 'toko.js'))) { console.error('--kit must point at a Suds-Jack checkout of the films branch'); process.exit(2); }
const kitCommit = execFileSync('git', ['-C', KIT, 'rev-parse', 'HEAD']).toString().trim();
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.json': 'application/json' };
const srv = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split('?')[0]);
  const f = u.startsWith('/kit/lib/') ? path.join(LIB, u.slice(9)) : u.startsWith('/kit/vendor/') ? path.join(VENDOR, u.slice(12)) : u.startsWith('/repo/') ? path.join(REPO, u.slice(6)) : path.join(__dirname, u);
  fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); r.end(b); });
});
srv.listen(0, '127.0.0.1', async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  try {
    const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); p.setDefaultTimeout(0);
    p.on('pageerror', e => console.error('page error:', e.message));
    await p.goto(`http://127.0.0.1:${srv.address().port}/counter.html?res=${arg('res', '1')}`);
    await p.waitForFunction(() => window.__ready, null, { timeout: 0, polling: 500 });
    if (arg('hip')) await p.evaluate(h => window.__counter.tune({ hip: h }), JSON.parse(arg('hip')));
    if (has('probe')) console.log(JSON.stringify(await p.evaluate(() => window.__counter.probe())));
    const save = (file, url) => fs.writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'));
    if (arg('still')) {
      const [name, s] = arg('still').split(':'); const dir = path.join(__dirname, 'work'); fs.mkdirSync(dir, { recursive: true });
      const file = path.join(dir, `${name}-${s}.png`); save(file, await p.evaluate(([n, t]) => window.__counter.frame(n, Math.round(t * 24)), [name, Number(s)])); console.log(path.relative(REPO, file));
    }
    if (arg('clip')) {
      const name = arg('clip'), dur = await p.evaluate(n => window.__counter.CLIPS[n], name), n = Math.round(dur * 24);
      const dir = path.join(__dirname, 'work', name); fs.mkdirSync(dir, { recursive: true });
      for (let i = 0; i < n; i++) { const f = path.join(dir, String(i).padStart(4, '0') + '.png'); if (!fs.existsSync(f) || has('force')) save(f, await p.evaluate(([c, k]) => window.__counter.frame(c, k), [name, i])); if (i % 12 === 0) process.stdout.write(`\r${name} ${i}/${n}`); }
      const out = path.join(REPO, 'art/v3/cast-clay'); fs.mkdirSync(out, { recursive: true });
      const mp4 = path.join(out, `toko-counter-${name}-v01.mp4`);
      execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '24', '-i', path.join(dir, '%04d.png'), '-c:v', 'libx264', '-preset', 'slow', '-crf', '24', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', mp4]);
      fs.writeFileSync(mp4.replace(/\.mp4$/, '.json'), JSON.stringify({ clip: name, seconds: dur, fps: 24, posesPerSecond: 12, size: [1280, 720], kit: 'Suds-Jack radiofree/studio/art-motion/clay/dishes/lib', kitCommit, rendered: new Date().toISOString().slice(0, 10) }, null, 2) + '\n');
      console.log(`\n${path.relative(REPO, mp4)} ${Math.round(fs.statSync(mp4).size / 1024)} KB`);
    }
  } finally { await b.close(); srv.close(); }
});
