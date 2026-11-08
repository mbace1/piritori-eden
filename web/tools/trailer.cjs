// The trailer kit (ROADMAP §7): a short MP4 recorded from the real game, never
// a mock-up. A recording instrument, not a gate, and it touches no game code.
//
//   NODE_PATH=$(npm root -g) node web/tools/trailer.cjs <out-dir> [--toko <Suds-Jack root>]
//
// The 3D renders at a few frames a second under a software renderer, so the
// page's clock is frozen once a scene is ready and stepped one frame at a
// time: every timer, animation frame and `performance.now()` the game reads
// advances by exactly 1/30 s between screenshots. The video is therefore
// smooth at 30 fps however slow the machine is, and the same every run.
// CSS transitions run on the real clock and are not stepped; nothing here
// leans on one.
//
// Scenes: the rain courtyard (neon, and what earlier fights left), Jaska's
// cut-in, a Night Shift turn played by the fight's own auto, a title card, and
// the Toko sting (only with --toko). FFmpeg joins them with short dissolves
// over a rain-and-drone bed it synthesises; there is no recorded audio.
const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path');
const { ROOT, FPS, W, H, DPR, FONT, CLOCK, serve, frames, ff, enc } = require('./trailer-kit.cjs');

const argv = process.argv.slice(2);
const OUT = path.resolve(argv[0] || 'trailer-out');
const TOKO = argv.includes('--toko') ? path.resolve(argv[argv.indexOf('--toko') + 1]) : null;
// TRAILER_QUICK=1 records eight frames a scene: a check that every scene loads.
const QUICK = Boolean(process.env.TRAILER_QUICK), n = count => QUICK ? 8 : count;
// TRAILER_SCENES=2,4 records only those scenes and keeps the others' frames.
const ONLY = process.env.TRAILER_SCENES ? new Set(process.env.TRAILER_SCENES.split(',')) : null, want = k => !ONLY || ONLY.has(k);

// Night Shift in a place, the crew deployed and the scene settled.
async function nightShift(browser, base, query) {
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: DPR });
  await page.addInitScript(CLOCK);
  await page.goto(`${base}/web/crew-run/?${query}`);
  const go = page.locator('#crew-deploy'); await go.waitFor({ timeout: 60000 }); await page.waitForTimeout(1500); await go.click();
  await page.waitForFunction(() => window.crewRun?.snapshot?.().phase === 'battle', null, { timeout: 60000 });
  await page.waitForTimeout(8000);
  return page;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  // TRAILER_ENCODE_ONLY=1 encodes the frames already in <out-dir> again.
  if (!process.env.TRAILER_ENCODE_ONLY) {
  const game = await serve(ROOT), toko = TOKO ? await serve(TOKO) : null;
  // The 3D needs WebGL, so it gets the software GPU. A 2D page must not: Chrome
  // draws a 2D canvas on the GPU, and on a software GPU the cut-in's 1080 x
  // 1920 canvas took over 30 s a frame. Drawn on the CPU it takes 0.13 s.
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const flat = await chromium.launch({ args: ['--disable-gpu', '--disable-accelerated-2d-canvas'] });
  try {
    let page;
    // 1. The rain courtyard, nothing but the place: the arena fills the frame.
    if (want('1')) {
    page = await nightShift(browser, game.base, 'arena=courtyard&aftermath=all');
    await page.addStyleTag({ content: '#arena{position:fixed!important;inset:0!important;z-index:9000!important}#labels,.label-leaders{display:none!important}' });
    await page.waitForTimeout(4000);
    await frames(page, path.join(OUT, '1-place'), n(4 * FPS));
    await page.close();
    }

    // 2. Jaska's cut-in (the ?cutin preview over the city).
    if (want('2')) {
    page = await flat.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: DPR });
    await page.addInitScript(CLOCK);
    await page.goto(`${game.base}/web/?skip&cutin=jaska`);
    await page.waitForSelector('.cutin', { timeout: 60000 }); await page.waitForTimeout(3000);
    await frames(page, path.join(OUT, '2-cutin'), n(4 * FPS));
    await page.close();
    }

    // 3. A Night Shift turn through the real controls, as a player plays it:
    //    step toward the nearest rival, strike if one is in reach, end the
    //    round, and the rivals' turn plays out. (The fight's own auto only
    //    acts once someone is in reach, so it cannot open this fight.)
    if (want('3')) {
    page = await nightShift(browser, game.base, 'arena=courtyard&aftermath=all');
    const click = async (p, selector) => { const el = p.locator(selector).first(); if (!await el.count() || !await el.isEnabled()) return false; await el.click({ timeout: 20000 }); await p.waitForTimeout(250); return true; };
    await frames(page, path.join(OUT, '3-fight'), n(7 * FPS), {
      [QUICK ? 1 : 10]: async p => {
        await click(p, '[data-action="move"]');
        const cell = await p.evaluate(() => {
          const mid = el => { const r = el.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; };
          const foes = [...document.querySelectorAll('.actor-label.enemy')].map(el => { const [x, y] = mid(el); return [x, y + 60]; });
          let best = null, far = Infinity;
          for (const el of document.querySelectorAll('[data-cell]')) { const [x, y] = mid(el); for (const [fx, fy] of foes) { const d = Math.hypot(x - fx, y - fy); if (d < far) { far = d; best = el.dataset.cell; } } }
          return best;
        });
        if (cell && await click(p, `[data-cell="${cell}"]`)) await click(p, '#commit-preview');
      },
      [QUICK ? 3 : 70]: async p => { if (await click(p, '[data-action="attack"]') && await click(p, '[data-target]')) await click(p, '#commit-preview'); else await click(p, '[data-action="brace"]'); },
      [QUICK ? 5 : 115]: p => click(p, '#end'),
    });
    await page.close();
    }

    // 4. The title card, in the game's own face.
    if (want('4')) {
    page = await flat.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: DPR });
    await page.addInitScript(CLOCK);
    await page.goto(`${game.base}/title-card`); // any page on the origin, for the font URL
    await page.setContent(`<!doctype html><style>@font-face{font-family:B;src:url('${game.base}/web/crew-run/fonts/BarlowCondensed-SemiBold.ttf')}
      body{margin:0;width:${W}px;height:${H}px;display:grid;place-content:center;text-align:center;background:radial-gradient(#173040,#0c1922 70%);color:#efe5cf;font-family:B,sans-serif}
      h1{font-size:96px;letter-spacing:.06em;margin:0}h1 span{color:#ff4f8b}p{font-size:30px;letter-spacing:.12em;margin:14px 0 0;color:#acd7cf}small{display:block;margin-top:46px;font-size:22px;letter-spacing:.1em;color:#8da3a8}</style>
      <h1>PIRITORI <span>→</span> EDEN</h1><p>CRIME TACTICS · KALLIO 2003</p><small>ACT I · PLAY FREE AT THE SUDS-JACK ARCADE</small>`);
    await page.evaluate(() => document.fonts.ready);
    await frames(page, path.join(OUT, '4-title'), n(Math.round(2.5 * FPS)));
    await page.close();
    }

    // 5. The Toko sting, from the site's own module.
    if (toko && want('5')) {
      page = await flat.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: DPR });
      await page.addInitScript(CLOCK);
      await page.goto(`${toko.base}/toko/index.html`); await page.waitForTimeout(3000);
      await page.evaluate(() => import('/toko/js/sting.js').then(m => { window.__sting = m; }));
      await frames(page, path.join(OUT, '5-sting'), n(3 * FPS), { 0: p => p.evaluate(() => window.__sting.playSting({ style: 'draw' })) });
      await page.close();
    }
  } finally { await browser.close(); await flat.close(); game.server.close(); toko?.server.close(); }
  }

  // Encode: each scene to a clip, then dissolves between them over the bed.
  const scenes = fs.readdirSync(OUT).filter(d => /^\d-/.test(d) && fs.statSync(path.join(OUT, d)).isDirectory()).sort();
  const clips = [];
  for (const s of scenes) {
    const clip = path.join(OUT, `${s}.mp4`), input = ['-framerate', String(FPS), '-i', path.join(OUT, s, '%04d.png')];
    let vf = 'scale=1920:1080:flags=lanczos';
    // The opening pushes in slowly and names the place.
    if (s === '1-place') vf = `scale=2112:1188:flags=lanczos,zoompan=z='1+0.0008*on':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1920x1080:fps=${FPS},`
      + `drawtext=fontfile='${FONT}':text='KALLIO · 2003':fontsize=64:fontcolor=0xefe5cf:x=96:y=h-170:alpha='min(1,max(0,(t-0.6)/0.8))'`;
    ff([...input, '-vf', vf, ...enc, clip]);
    clips.push({ clip, seconds: fs.readdirSync(path.join(OUT, s)).length / FPS });
  }
  const X = Math.min(0.4, Math.min(...clips.map(c => c.seconds)) / 3); let chain = '', last = '[0:v]', at = 0;
  clips.forEach((c, i) => { if (!i) { at = c.seconds; return; } at -= X; chain += `${last}[${i}:v]xfade=transition=fade:duration=${X}:offset=${at.toFixed(3)}[v${i}];`; last = `[v${i}]`; at += c.seconds; });
  const total = at;
  const bed = `anoisesrc=color=brown:amplitude=0.6:d=${total},highpass=f=180,lowpass=f=2400,volume=0.35[rain];`
    + `sine=f=55:d=${total},volume=0.5[a];sine=f=82.4:d=${total},volume=0.25[b];[a][b]amix=inputs=2,tremolo=f=0.25:d=0.5[drone];`
    + `[rain][drone]amix=inputs=2,afade=t=in:d=${Math.min(1.2, total / 3).toFixed(2)},afade=t=out:st=${Math.max(0, total - Math.min(1.6, total / 3)).toFixed(2)}:d=${Math.min(1.6, total / 3).toFixed(2)}[aout]`;
  const final = path.join(OUT, 'piritori-trailer.mp4');
  ff([...clips.flatMap(c => ['-i', c.clip]), '-filter_complex', `${chain.replace(/;$/, '')};${bed}`, '-map', clips.length > 1 ? last : '0:v', '-map', '[aout]', ...enc, '-c:a', 'aac', '-b:a', '160k', '-shortest', final]);
  console.log(`trailer: ${final} (${total.toFixed(1)} s, ${clips.length} scenes)`);
})().catch(e => { console.error(e); process.exit(1); });
