// Film the cut-in review page: node art-src/cutins/render.cjs jaska [scene-club-v01] → art-src/cutins/renders/<who>-review.mp4
const { chromium } = require('playwright');
const http = require('node:http'), fs = require('node:fs'), path = require('node:path'), { execFileSync } = require('node:child_process');
const [WHO = 'jaska', SCENE = 'scene-club-v01'] = process.argv.slice(2), REPO = path.resolve(__dirname, '..', '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp' };
const srv = http.createServer((q, r) => { const f = path.join(REPO, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); r.end(b); }); });
srv.listen(0, '127.0.0.1', async () => {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('pageerror', e => console.error('page error:', e.message));
  await p.goto(`http://127.0.0.1:${srv.address().port}/art-src/cutins/review.html?who=${WHO}&scene=${SCENE}`);
  await p.waitForFunction(() => window.__ready, null, { timeout: 60000 });
  const total = await p.evaluate(() => window.__review.TOTAL), dir = path.join(__dirname, 'work', WHO); fs.mkdirSync(dir, { recursive: true });
  const n = Math.round(total * 24);
  for (let i = 0; i < n; i++) { const url = await p.evaluate(t => window.__review.frame(t), i / 24); fs.writeFileSync(path.join(dir, String(i).padStart(4, '0') + '.jpg'), Buffer.from(url.split(',')[1], 'base64')); }
  const out = path.join(__dirname, 'renders'); fs.mkdirSync(out, { recursive: true });
  const mp4 = path.join(out, `${WHO}-review.mp4`);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '24', '-i', path.join(dir, '%04d.jpg'), '-vf', 'scale=540:960', '-c:v', 'libx264', '-crf', '24', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', mp4]);
  fs.copyFileSync(path.join(dir, String(Math.round(n * 0.3)).padStart(4, '0') + '.jpg'), path.join(out, `${WHO}-still.jpg`));
  console.log(path.relative(REPO, mp4), Math.round(fs.statSync(mp4).size / 1024) + ' KB', n, 'frames');
  await b.close(); srv.close();
});
