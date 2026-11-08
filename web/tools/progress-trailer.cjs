// Where Act I stands, as a trailer (ROADMAP §7): about half a minute recorded
// from the real game, one caption per thing that shipped since the teaser
// (trailer.cjs, v4.87), then what a bot found playing the ten days and what is
// next. A recording instrument, not a gate, and it touches no game code.
//
//   NODE_PATH=$(npm root -g) node web/tools/progress-trailer.cjs <out-dir>
//   TRAILER_QUICK=1 ...      three frames a scene: a check that every scene loads
//   TRAILER_SCENES=2,5 ...   records only those scenes, keeps the others' frames
//   TRAILER_ENCODE_ONLY=1 ... encodes the frames already in <out-dir> again
//
// The fight is the door fight outing-browser.cjs plays: the courtyard ledger,
// its dice pinned to the same clock, the same winning line. Its first moves
// are on camera; the rest plays with time running and no frames, and the cut
// picks up back in Kallio, where the strip says what the win took.
const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path');
const { ROOT, FPS, W, H, DPR, FONT, CLOCK, serve, ff, enc } = require('./trailer-kit.cjs');

const OUT = path.resolve(process.argv[2] || 'progress-trailer-out');
const QUICK = Boolean(process.env.TRAILER_QUICK), sec = s => QUICK ? 3 : Math.round(s * FPS);
const ONLY = process.env.TRAILER_SCENES ? new Set(process.env.TRAILER_SCENES.split(',')) : null, want = k => !ONLY || ONLY.has(k);
const VERSION = fs.readFileSync(path.join(ROOT, 'web/js/v3/app.js'), 'utf8').match(/version: '(v[\d.]+)'/)?.[1] ?? '';

// One caption per scene, drawn by FFmpeg over the clip (no colons or quotes:
// drawtext reads those as syntax).
const CAPTIONS = {
  '2-city': ['A TRIP OR A TRADE TAKES TIME', 'three a block, shown as pips in the header'],
  '3-brief': ['ONE CARD BEFORE A FIGHT', 'the job, the odds, the way out and the police'],
  '4-fight': ['THEIR PLANS ARE ON THE BOARD', 'odds and damage on each fighter, and blows can miss'],
  '5-yard': ['THE PLACES HOLD TOGETHER', 'every edge from eight angles, the yard across a lane'],
  '6-home': ['A WON FIGHT COMES HOME', 'what the win took is in the stash, and the fence buys it'],
};

// A scene recorder on the frozen clock: `shoot` records frames, `pass` lets
// time run with none (a cut), `until` runs time until the page says so.
function recorder(page, dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true });
  fs.mkdirSync(dir, { recursive: true });
  let f = 0;
  const step = (ms = 1000 / FPS) => page.evaluate(m => window.__step(m), ms);
  return {
    freeze: () => page.evaluate(() => window.__freeze()),
    async shoot(count) { for (let i = 0; i < count; i++) { await step(); await page.screenshot({ path: path.join(dir, `${String(f++).padStart(4, '0')}.png`), timeout: 180000 }); } },
    async pass(count) { for (let i = 0; i < count; i++) await step(); },
    // Off camera, `ms` may be coarser than a frame: nobody sees the steps.
    async until(test, max = 600, ms) { for (let i = 0; i < max; i++) { if (await page.evaluate(test)) return true; await step(ms); } return false; },
    async shootUntil(test, max) { for (let i = 0; i < max && !(await page.evaluate(test)); i++) await this.shoot(1); },
    done() { console.log(`  ${path.basename(dir)}: ${f} frames`); },
  };
}

// A title or text card, in the game's own face.
async function card(browser, base, dir, seconds, body) {
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: DPR });
  await page.addInitScript(CLOCK);
  await page.goto(`${base}/card`);
  await page.setContent(`<!doctype html><style>@font-face{font-family:B;src:url('${base}/web/crew-run/fonts/BarlowCondensed-SemiBold.ttf')}
    body{margin:0;width:${W}px;height:${H}px;display:grid;place-content:center;text-align:center;background:radial-gradient(#173040,#0c1922 70%);color:#efe5cf;font-family:B,sans-serif}
    h1{font-size:84px;letter-spacing:.06em;margin:0}h1 span{color:#ff4f8b}h2{font-size:30px;letter-spacing:.14em;margin:0 0 26px;color:#acd7cf;font-weight:400}
    p{font-size:30px;letter-spacing:.06em;margin:10px 0;color:#efe5cf}p b{color:#ff4f8b;font-weight:400}small{display:block;margin-top:38px;font-size:22px;letter-spacing:.12em;color:#8da3a8}
    ol{list-style:none;padding:0;margin:0;text-align:left;display:inline-block}li{font-size:34px;letter-spacing:.05em;margin:12px 0}li b{color:#ff4f8b;font-weight:400;margin-right:18px}
    .in{animation:in .6s ease-out both}@keyframes in{from{opacity:0;transform:translateY(12px)}}</style>${body}`);
  await page.evaluate(() => document.fonts.ready);
  const rec = recorder(page, dir); await rec.freeze(); await rec.shoot(sec(seconds)); rec.done();
  await page.close();
}

const S = page => page.evaluate(() => structuredClone(window.__ptv3.state));
const fixture = (page, body, arg) => page.evaluate(([b, a]) => { const s = structuredClone(window.__ptv3.state); new Function('s', 'a', b)(s, a); window.__ptv3.debug.setState(s); }, [body, arg]);

// outing-browser.cjs's winning line for the courtyard ledger, at its pinned clock.
const PINNED = 1761900000000;
const R = n => `opp-door-15-hit-courtyard-ledger-${n}`;
const WIN = [
  ['select', 'aatami'], ['move', '2,3'], ['attack', R(1)],
  ['select', 'crew-slot-runner'], ['move', '3,4'], ['attack', R(1)],
  ['end'],
  ['select', 'aatami'], ['attack', R(1)],
  ['select', 'crew-slot-runner'], ['attack', R(1)],
  ['select', 'crew-slot-muscle'], ['move', '1,3'], ['attack', R(2)],
  ['end'],
  ['select', 'aatami'], ['move', '2,4'], ['attack', R(2)],
];
const ON_CAMERA = 6; // select, step in, swing (it misses), and the runner's turn

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  if (!process.env.TRAILER_ENCODE_ONLY) {
  const game = await serve(ROOT);
  // The 3D gets the software GPU; a 2D page must not (see trailer.cjs).
  const gpu = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const flat = await chromium.launch({ args: ['--disable-gpu', '--disable-accelerated-2d-canvas'] });
  let saved = null;
  try {
    // 1. Title.
    if (want('1')) await card(flat, game.base, path.join(OUT, '1-title'), 2.6,
      `<h2 class="in">WHERE IT STANDS</h2><h1>PIRITORI <span>→</span> EDEN</h1><small>ACT I · ${VERSION} · KALLIO 2003</small>`);

    // 2. The city: a trip uses a third of the block, and the header says so.
    if (want('2')) {
      const page = await flat.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: DPR });
      await page.addInitScript(CLOCK);
      await page.goto(`${game.base}/web/?skip`);
      await page.waitForFunction(() => Boolean(window.__ptv3?.data));
      await page.locator('#beginButton').click(); await page.waitForSelector('.city-map'); await page.waitForTimeout(1500);
      const rec = recorder(page, path.join(OUT, '2-city')); await rec.freeze();
      // A tap on a panel button scrolls the page to it; the map belongs in view.
      const top = () => page.evaluate(() => { for (const el of [document.scrollingElement, ...document.querySelectorAll('*')]) if (el && el.scrollTop) el.scrollTop = 0; });
      const tap = async locator => { await locator.click(); await top(); };
      await rec.shoot(sec(0.8));
      await page.locator('[data-anchor-group="siltasaari"] .map-anchor-hit').click({ force: true }); await top(); await rec.shoot(sec(0.9));
      await tap(page.locator('[data-action="plan-journey"]')); await rec.shoot(sec(0.9));
      await tap(page.locator('[data-action="commit-journey"]')); await rec.shoot(sec(2.4));
      rec.done(); await page.close();
    }

    // 3-4. A door fight: the brief, then the first moves of the winning line.
    if (want('3') || want('4') || want('6')) {
      const ctx = await gpu.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: DPR });
      ctx.setDefaultNavigationTimeout(180000); ctx.setDefaultTimeout(180000);
      const page = await ctx.newPage();
      await page.addInitScript(CLOCK);
      await page.goto(`${game.base}/web/?skip`);
      await page.waitForFunction(() => Boolean(window.__ptv3?.data && window.__ptv3.story?.case));
      await page.locator('#beginButton').click(); await page.waitForSelector('.city-map');
      await fixture(page, 's.scheduleIndex = 15; s.selectedAnchor = "torkkelinmaki"; s.recruited = a.slice(0, 2); s.deployed = [...s.recruited]; s.pressure.torkkelinmaki = 0; s.doors = { offers: { 15: [{ template: "hit-courtyard-ledger", anchor: "torkkelinmaki" }, { template: "gig-rauno-cart", anchor: "harju" }] }, taken: {} }; s.fightsByDay = {};',
        await page.evaluate(() => window.__ptv3.data.content.crew.map(c => c.id)));
      await page.locator('[data-action="take-door"][data-door="hit-courtyard-ledger"]').click();
      await page.locator('[data-action="next-step"][data-step="enter"]').click();
      await page.evaluate(t => { Date.now = () => t; }, PINNED);
      await page.locator('[data-action="choose"][data-choice="take-it"]').click();
      await page.waitForURL(/crew-run\/\?campaign=1&outing=/);
      const idle = () => page.waitForFunction(() => window.fightModule && !fightModule.metrics().busy, {}, { timeout: 180000 });
      await idle(); await page.waitForTimeout(6000);

      let rec = recorder(page, path.join(OUT, '3-brief')); await rec.freeze();
      await rec.shoot(sec(2.6)); rec.done();
      await page.locator('#crew-deploy').click();
      rec = recorder(page, path.join(OUT, '4-fight'));
      await rec.until(() => window.crewRun?.snapshot?.().phase === 'battle' && !fightModule.metrics().busy);
      await rec.pass(sec(1.5));
      const notBusy = () => !fightModule.metrics().busy;
      const selectCrew = async id => {
        if (await page.locator('#crew-picker').count() && !await page.locator('#roster').isVisible()) await page.locator('#crew-picker').click();
        await page.locator(`[data-unitid="${id}"]`).click();
        if (await page.locator('#crew-picker').count() && await page.locator('#roster').isVisible()) await page.locator('#crew-picker').click();
      };
      const act = async ([type, value]) => {
        if (type === 'select') await selectCrew(value);
        else if (type === 'move') { await page.locator('[data-action="move"]').click(); await page.locator(`[data-cell="${value}"]`).click(); await page.locator('#commit-preview').click(); }
        else if (type === 'attack') { if (await page.locator('[data-action=attack]').getAttribute('aria-pressed') !== 'true') await page.locator('[data-action="attack"]').click(); await page.locator(`[data-target="${value}"]`).click(); await page.locator('#commit-preview').click(); }
        else if (type === 'end') await page.locator('#end').click();
      };
      await rec.shoot(sec(1.2));
      for (const [i, move] of WIN.entries()) {
        await act(move);
        if (i < ON_CAMERA) { await rec.shoot(sec(move[0] === 'select' ? 0.5 : 0.8)); await rec.shootUntil(notBusy, sec(2.5)); await rec.until(notBusy); }
        else await rec.until(notBusy, 300, 200);
      }
      rec.done();
      const won = await rec.until(() => window.crewRun?.snapshot?.().phase === 'aftermath', 300, 200);
      if (!won) throw Error('the winning line did not win');
      await page.locator('#crew-home').click({ timeout: 180000 });
      await page.waitForURL(/\?outing=back/);
      await page.waitForFunction(() => Boolean(window.__ptv3?.state?.lastFight));
      saved = await page.evaluate(() => localStorage.getItem('piritori-to-eden:v3'));
      await ctx.close();
    }

    // 5. The yard, from its opening camera: the lane and the next block.
    if (want('5')) {
      const page = await gpu.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: DPR });
      await page.addInitScript(CLOCK);
      await page.goto(`${game.base}/web/crew-run/?arena=yard`);
      const go = page.locator('#crew-deploy'); await go.waitFor({ timeout: 60000 }); await page.waitForTimeout(1500); await go.click();
      await page.waitForFunction(() => window.crewRun?.snapshot?.().phase === 'battle', null, { timeout: 60000 });
      await page.waitForTimeout(8000);
      await page.addStyleTag({ content: '#arena{position:fixed!important;inset:0!important;z-index:9000!important}#labels,.label-leaders{display:none!important}' });
      await page.waitForTimeout(4000);
      const rec = recorder(page, path.join(OUT, '5-yard')); await rec.freeze(); await rec.shoot(sec(3.2)); rec.done();
      await page.close();
    }

    // 6. Back in Kallio: the strip over the map, from the save the fight wrote.
    if (want('6') && saved) {
      const page = await flat.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: DPR });
      await page.addInitScript(([key, value]) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem(key, value); sessionStorage.setItem('seeded', '1'); } }, ['piritori-to-eden:v3', saved]);
      await page.addInitScript(CLOCK);
      await page.goto(`${game.base}/web/?skip`);
      await page.waitForFunction(() => Boolean(window.__ptv3?.data));
      await page.locator('#resumeButton').click(); await page.waitForSelector('.city-map');
      await page.locator('.fight-strip').scrollIntoViewIfNeeded(); await page.waitForTimeout(1500);
      const rec = recorder(page, path.join(OUT, '6-home')); await rec.freeze(); await rec.shoot(sec(3.2)); rec.done();
      await page.close();
    }

    // 7. What the bot found, and 8. what is next.
    if (want('7')) await card(flat, game.base, path.join(OUT, '7-bot'), 4.2,
      `<h2 class="in">TEN DAYS, PLAYED BY A BOT</h2>
       <p><b>20 of 20</b> blocks play, on six ways of playing</p>
       <p>none is forced into a fight</p>
       <p>a trader meets the <b>€400</b> on day 3</p>
       <p>then the shipment turns on the <b>crew</b>, not the money</p>`);
    if (want('8')) await card(flat, game.base, path.join(OUT, '8-next'), 4.4,
      `<h2 class="in">NEXT</h2><ol>
       <li><b>1</b>size the €400 and choose the finale</li>
       <li><b>2</b>build the shipment night</li>
       <li><b>3</b>make careful fighting pay</li>
       <li><b>4</b>play the ten days on a phone</li></ol>
       <small>ACT I · 50% · PLAY FREE AT THE SUDS-JACK ARCADE</small>`);
  } finally { await gpu.close(); await flat.close(); game.server.close(); }
  }

  // Encode: each scene to a clip with its caption, then dissolves over a bed.
  const scenes = fs.readdirSync(OUT).filter(d => /^\d-/.test(d) && fs.statSync(path.join(OUT, d)).isDirectory()).sort();
  const clips = [];
  for (const s of scenes) {
    const clip = path.join(OUT, `${s}.mp4`), input = ['-framerate', String(FPS), '-i', path.join(OUT, s, '%04d.png')];
    let vf = 'scale=1920:1080:flags=lanczos';
    if (s === '5-yard') vf = `scale=2112:1188:flags=lanczos,zoompan=z='1+0.0008*on':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1920x1080:fps=${FPS}`;
    const cap = CAPTIONS[s];
    if (cap) {
      const fade = `alpha='min(1,max(0,(t-0.3)/0.5))'`;
      vf += `,drawbox=x=0:y=ih-210:w=iw:h=210:color=0x0c1922@0.9:t=fill`
        + `,drawtext=fontfile='${FONT}':text='${cap[0]}':fontsize=60:fontcolor=0xefe5cf:x=96:y=h-170:${fade}`
        + `,drawtext=fontfile='${FONT}':text='${cap[1]}':fontsize=36:fontcolor=0xacd7cf:x=98:y=h-96:${fade}`;
    }
    ff([...input, '-vf', vf, ...enc, clip]);
    clips.push({ clip, seconds: fs.readdirSync(path.join(OUT, s)).length / FPS });
  }
  const X = Math.min(0.4, Math.min(...clips.map(c => c.seconds)) / 3); let chain = '', last = '[0:v]', at = 0;
  clips.forEach((c, i) => { if (!i) { at = c.seconds; return; } at -= X; chain += `${last}[${i}:v]xfade=transition=fade:duration=${X}:offset=${at.toFixed(3)}[v${i}];`; last = `[v${i}]`; at += c.seconds; });
  const total = at;
  const bed = `anoisesrc=color=brown:amplitude=0.6:d=${total},highpass=f=180,lowpass=f=2400,volume=0.3[rain];`
    + `sine=f=55:d=${total},volume=0.5[a];sine=f=82.4:d=${total},volume=0.25[b];[a][b]amix=inputs=2,tremolo=f=0.25:d=0.5[drone];`
    + `[rain][drone]amix=inputs=2,afade=t=in:d=1.2,afade=t=out:st=${Math.max(0, total - 1.6).toFixed(2)}:d=1.6[aout]`;
  const final = path.join(OUT, 'piritori-progress.mp4');
  ff([...clips.flatMap(c => ['-i', c.clip]), '-filter_complex', `${chain.replace(/;$/, '')};${bed}`, '-map', clips.length > 1 ? last : '0:v', '-map', '[aout]', ...enc, '-c:a', 'aac', '-b:a', '160k', '-shortest', final]);
  console.log(`progress trailer: ${final} (${total.toFixed(1)} s, ${clips.length} scenes)`);
})().catch(e => { console.error(e); process.exit(1); });
