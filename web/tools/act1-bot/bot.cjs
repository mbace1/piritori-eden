// Act I bot (ROADMAP G4): plays chapter 1 through the real city interface, one personality per run.
//   NODE_PATH=<playwright> node web/tools/act1-bot/bot.cjs <out.jsonl> <personality> <seed> [<personality> <seed> ...]
//   personalities: story, random, hustler, cautious, trader, farmer. BASE=http://127.0.0.1:<port>/ picks the port.
//   Summarise: node web/tools/act1-bot/analyze.cjs <dir-of-jsonl> content/era1-slice-v1.json
// Fights: the city's hand-over page (crew-run/?campaign=1&outing=...) is answered
// with a stand-in that loads Night Shift's own run.js, plays the fight with the
// measuring tool's careful or careless player, and settles it through run.js's
// settle(), which writes the receipt into the campaign save as the real page does.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const BASE = process.env.BASE || 'http://127.0.0.1:8783/';
const PLAYERS = fs.readFileSync(path.join(__dirname, 'fight-players.js'), 'utf8');
const STUB = `<!doctype html><meta charset="utf-8"><body>bot fight<script type="module">
import * as R from './run.js';
import * as T from '../fight-module/tactics.js';
import { players } from './__bot/fight-players.js';
try {
  const content = await (await fetch('../../content/era1-slice-v1.json')).json();
  localStorage.removeItem(R.OUTING_SAVE_KEY);
  const run = R.loadRun(null, content);
  const config = R.launch(run);
  const fight = R.makeMission(content, config);
  const res = players(R, T).play(fight, localStorage.getItem('bot:fightPolicy') || 'careful');
  const settled = R.settle(run, fight);
  localStorage.setItem(R.OUTING_SAVE_KEY, JSON.stringify(run));
  window.__botFight = { ...res, settled, title: run.last?.title, text: run.last?.text, effects: (run.last?.changes || []).map(c => c.campaignEffect) };
} catch (e) { window.__botFight = { error: String((e && e.stack) || e) }; }
</script>`;

function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// What the page offers, tagged so the pick can be clicked without re-querying.
const OFFERS = () => {
  const vis = e => e.offsetParent !== null || e.getClientRects().length > 0;
  const els = [...document.querySelectorAll('[data-action], #beginButton, #skipButton, button.skip')].filter(e => vis(e) && !e.closest('#pause'));
  return els.map((e, i) => { e.dataset.botIndex = i; return { i, action: e.dataset.action || e.id || 'button', disabled: !!e.disabled, ...Object.fromEntries(Object.entries(e.dataset).filter(([k]) => k !== 'botIndex' && k !== 'action')), text: (e.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 90) }; });
};
const SNAP = () => {
  const s = window.__ptv3?.state; if (!s) return null;
  const slot = window.__ptv3.data.content.schedule[s.scheduleIndex];
  return { idx: s.scheduleIndex, day: slot?.day ?? null, block: slot?.block ?? null, mode: s.mode, cash: s.cash, debt: s.debt, markka: s.markka, stock: s.stock, at: s.selectedAnchor,
    crew: s.recruited?.length ?? 0, endingId: s.endingId, chapter: s.chapter, cleared: s.chapterCleared, earned: s.chapterEarned, outing: s.outing ? { id: s.outing.id, status: s.outing.status, result: s.outing.result } : null,
    pressure: s.pressure, harm: s.cityHarm, choices: Object.keys(s.choices || {}).length, battles: (s.battleHistory || []).length, last: s.lastOutcome ?? null, splash: document.getElementById('splash')?.hidden === false,
    toast: [...document.querySelectorAll('.toast, [role=status]')].map(t => t.innerText.trim()).filter(Boolean).slice(-2) };
};

// Personality: how a choice is picked. `meta` is the choice's own data from content.
function picker(kind, r) {
  const fighty = c => (c.meta?.effects || []).some(x => String(x).startsWith('start-battle')) || /fight|hold the path|take it off|positions/i.test(c.text);
  const money = c => { const m = (c.meta?.effects || []).join(' ').match(/cash[: +]+(-?\d+)/); return m ? Number(m[1]) : (/sell|cash|€|pay/i.test(c.text) ? 1 : 0); };
  return list => {
    if (!list.length) return null;
    if (kind === 'story') return list[0];
    if (kind === 'random') return list[Math.floor(r() * list.length)];
    if (kind === 'hustler' || kind === 'trader' || kind === 'farmer') return [...list].sort((a, b) => money(b) - money(a))[0];
    if (kind === 'cautious') return list.find(c => !fighty(c)) || list[list.length - 1];
    return list[0];
  };
}

// Clicks through the DOM (SVG map anchors have no .click()).
const clickSel = (page, sel) => page.evaluate(q => { const e = document.querySelector(q); if (!e || e.disabled) return false; e.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })); return true; }, sel).catch(() => false);
// Trading through the LEDGER tab (BUY 1 / SELL 1 where Aatami stands) and real journeys.
async function tradeRoutine(page, maxLoops, rec) {
  let loops = 0;
  for (let guard = 0; guard < maxLoops * 14 + 4 && loops < maxLoops; guard += 1) {
    if (page.url().includes('/crew-run/')) return loops;
    const st = await page.evaluate(() => { const s = __ptv3.state, d = __ptv3.data; const offers = d.content.market_offers.filter(o => s.revealedOffers.includes(o.id)).map(o => ({ id: o.id, at: o.anchor_id, side: o.side, price: o.quote.kind === 'exact' ? o.quote.eur : Math.round((o.quote.min_eur + o.quote.max_eur) / 2) })); return { mode: s.mode, at: s.selectedAnchor, cash: s.cash, stock: s.stock.piri || 0, cap: s.capacity, earned: s.chapterEarned, offers }; }).catch(() => null);
    if (!st) return loops;
    if (st.mode === 'road') { if (!await clickSel(page, '[data-action="road-choose"]:not([disabled])')) await clickSel(page, '[data-action="road-continue"]'); await page.waitForTimeout(120); continue; }
    if (!['route', 'ledger'].includes(st.mode)) return loops;
    const here = st.offers.filter(o => o.at === st.at), sell = here.find(o => o.side === 'sell'), buy = here.find(o => o.side === 'buy');
    const sells = st.offers.filter(o => o.side === 'sell').sort((a, b) => b.price - a.price), buySpot = st.offers.find(o => o.side === 'buy');
    if (!sells.length || !buySpot) return loops;
    if (st.stock > 0 && sell) {
      await clickSel(page, '[data-mode-target="ledger"]'); await page.waitForTimeout(100);
      for (let k = 0; k < st.stock; k += 1) { await clickSel(page, `[data-action="trade"][data-offer="${sell.id}"]`); await page.waitForTimeout(60); }
      const after = await page.evaluate(() => ({ cash: __ptv3.state.cash, earned: __ptv3.state.chapterEarned, stock: __ptv3.state.stock.piri })).catch(() => ({}));
      // A refused sale (D002, v4.98: a fourth visit to a seller waits for the block to turn) changes nothing: stop for this block.
      if (after.stock === st.stock) { rec({ ev: 'trade-refused', side: 'sell', at: st.at, toast: await page.evaluate(() => [...document.querySelectorAll('.toast, [role=status]')].map(t => t.innerText.trim()).filter(Boolean).slice(-1)[0] || '').catch(() => '') }); return loops; }
      loops += 1; rec({ ev: 'trade', side: 'sell', at: st.at, n: st.stock - after.stock, price: sell.price, after }); continue;
    }
    if (st.stock < st.cap && buy && st.cash >= buy.price) {
      await clickSel(page, '[data-mode-target="ledger"]'); await page.waitForTimeout(100);
      const n = Math.min(st.cap - st.stock, Math.floor(st.cash / buy.price));
      for (let k = 0; k < n; k += 1) { await clickSel(page, `[data-action="trade"][data-offer="${buy.id}"]`); await page.waitForTimeout(60); }
      const got = await page.evaluate(() => __ptv3.state.stock.piri || 0).catch(() => st.stock);
      if (got === st.stock) { rec({ ev: 'trade-refused', side: 'buy', at: st.at }); return loops; }
      rec({ ev: 'trade', side: 'buy', at: st.at, n: got - st.stock, price: buy.price }); continue;
    }
    const dest = st.stock > 0 ? sells[0].at : (st.cash >= buySpot.price ? buySpot.at : null);
    if (!dest || dest === st.at) return loops;
    await clickSel(page, '[data-mode-target="route"]'); await page.waitForTimeout(100);
    await clickSel(page, `[data-action="select-anchor"][data-anchor="${dest}"]`); await page.waitForTimeout(100);
    if (!await clickSel(page, `[data-action="plan-journey"][data-anchor="${dest}"]`)) { rec({ ev: 'trade-blocked', dest }); return loops; }
    await page.waitForTimeout(100); await clickSel(page, '[data-action="commit-journey"]'); await page.waitForTimeout(150);
  }
  return loops;
}

async function playOne(browser, kind, seed, log) {
  const r = rng(seed), pick = picker(kind, r);
  const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, hasTouch: true, isMobile: true });
  await ctx.route(/\/web\/crew-run\/__bot\/fight-players\.js/, route => route.fulfill({ status: 200, contentType: 'text/javascript', body: PLAYERS }));
  await ctx.route(url => url.pathname === '/web/crew-run/' && url.searchParams.has('outing'), route => route.fulfill({ status: 200, contentType: 'text/html', body: STUB }));
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  const t0 = Date.now(); let steps = 0, stuck = 0, lastSig = '', fights = 0;
  const rec = (o) => log.write(JSON.stringify({ kind, seed, step: steps, t: Date.now() - t0, ...o }) + '\n');
  await page.goto(`${BASE}web/`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => Boolean(window.__ptv3?.data), null, { timeout: 120000 });
  await page.evaluate(([p]) => localStorage.setItem('bot:fightPolicy', p), [kind === 'random' ? (r() < 0.5 ? 'careless' : 'careful') : kind === 'hustler' ? 'careless' : 'careful']);
  page.on('dialog', d => d.accept().catch(() => {}));
  const visited = new Set(); let tradedAt = -1, farmed = false;
  while (steps < 900) {
    steps += 1;
    if (page.url().includes('/crew-run/')) {
      try { await page.waitForFunction(() => window.__botFight, null, { timeout: 60000 }); } catch (e) { rec({ ev: 'fight-timeout', url: page.url() }); break; }
      const f = await page.evaluate(() => window.__botFight); fights += 1;
      rec({ ev: 'fight', fight: f, url: page.url().split('?')[1] });
      await page.goto(`${BASE}web/?outing=back`, { waitUntil: 'domcontentloaded', timeout: 120000 });
      await page.waitForFunction(() => Boolean(window.__ptv3?.data), null, { timeout: 120000 });
      continue;
    }
    const settle = async () => { try { await page.waitForLoadState('load', { timeout: 60000 }); } catch {} await page.waitForTimeout(300); };
    let snap = null;
    try { snap = await page.evaluate(SNAP); } catch { await settle(); continue; }
    if (!snap) { await page.waitForTimeout(500); continue; }
    if (snap.endingId || snap.idx >= 20) {
      const screen = await page.evaluate(() => document.getElementById('modeRoot')?.innerText.slice(0, 3000)).catch(() => '');
      const extra = await page.evaluate(() => { const s = __ptv3.state; return { lastEndingOutcome: s.lastEndingOutcome, chapterGoal: s.chapterGoal, chapterThreshold: s.chapterThreshold, flags: s.flags, obligations: s.obligations, relationships: s.relationships, crewStatus: s.crewStatus, battleHistory: s.battleHistory, missionStatus: s.missionStatus, equipment: s.equipment, intel: s.intel, exitFund: s.exitFund, chapterFightsWon: s.chapterFightsWon, choices: s.choices }; }).catch(() => null);
      rec({ ev: 'chapter-close', snap, screen, extra }); break;
    }
    let offers;
    try { offers = (await page.evaluate(OFFERS)).filter(o => !o.disabled); } catch { await settle(); continue; }
    const has = a => offers.filter(o => o.action === a);
    const sig = JSON.stringify([snap.idx, snap.mode, snap.cash, snap.at, snap.choices, snap.outing, offers.map(o => o.action + (o.choice || '') + (o.step || ''))]);
    stuck = sig === lastSig ? stuck + 1 : 0; lastSig = sig;
    if (stuck > 6) { rec({ ev: 'stuck', snap, offers }); break; }
    let choice = null, why = '';
    const meta = (o) => { const enc = window.__dummy; return o; };
    const choiceMeta = async list => page.evaluate(ids => { const s = __ptv3.state, d = __ptv3.data; const enc = s.mode === 'visit' ? null : (d.encounters?.get?.(d.content.schedule[s.scheduleIndex]?.encounter_id)); return ids.map(id => (enc?.choices || []).find(c => c.id === id) || null); }, list.map(o => o.choice));
    if (snap.mode === 'ledger' || snap.mode === 'news' && !offers.some(o => o.action === 'ack-news')) { await clickSel(page, '[data-mode-target="route"]'); await page.waitForTimeout(150); continue; }
    if (snap.splash) choice = has('beginButton')[0] || offers.find(o => /skip/i.test(o.text)) || null, why = 'title';
    else if (has('road-choose').length) { const l = has('road-choose'); choice = pick(l); why = 'road'; }
    else if (has('road-continue').length) choice = has('road-continue')[0], why = 'road-done';
    else if (has('choose').length) { const l = has('choose'); const m = await choiceMeta(l).catch(() => []); l.forEach((o, i) => { o.meta = m[i]; }); choice = (kind !== 'cautious' && l.find(o => o.choice === 'run-shipment')) || pick(l); why = 'choose'; }
    else if (has('case-choose').length) choice = pick(has('case-choose')), why = 'case';
    else if (snap.mode === 'battle' && has('auto').length) choice = has('auto')[0], why = 'board-fight';
    else if (has('finish-battle').length) choice = has('finish-battle')[0], why = 'board-done';
    else if (has('ack-news').length) choice = has('ack-news')[0], why = 'news';
    else if (['shop', 'ramen', 'case', 'visit'].includes(snap.mode)) {
      if (snap.mode === 'ramen' && has('buy-bowl').length && kind !== 'story' && r() < 0.5) choice = has('buy-bowl')[0], why = 'bowl';
      else choice = has('leave-shop')[0] || has('leave-case')[0] || has('leave-visit')[0] || has('go-route')[0] || offers.find(o => /back|leave|route/i.test(o.text)), why = 'leave';
    } else {
      // On the map: optional business first (by personality), then the story's next step.
      const trades = has('trade');
      const visit = has('open-visit').find(o => !visited.has(o.visit));
      if ((kind === 'trader' || kind === 'farmer') && tradedAt !== snap.idx) {
        tradedAt = snap.idx;
        const cap = kind === 'farmer' && !farmed ? 15 : 2;
        const done = await tradeRoutine(page, cap, rec);
        if (kind === 'farmer' && cap === 15 && done > 0) { farmed = true; rec({ ev: 'farm', block: snap.idx, loops: done }); }
        await clickSel(page, '[data-mode-target="route"]'); await page.waitForTimeout(150);
        continue;
      }
      if (has('attempt-chapter-ending').length && kind !== 'cautious') choice = has('attempt-chapter-ending')[0], why = 'chapter-ending';
      else if (visit && kind !== 'story' && r() < 0.6) { choice = visit; visited.add(visit.visit); why = 'visit'; }
      else if (trades.length && (kind === 'hustler' || (kind === 'random' && r() < 0.35)) && !visited.has(`trade${snap.idx}${snap.at}${snap.cash}`)) { choice = trades[Math.floor(r() * trades.length)]; visited.add(`trade${snap.idx}${snap.at}${snap.cash}`); why = 'trade'; }
      else if (has('hire-from-pool').length && (kind === 'hustler' || kind === 'random') && snap.crew < 4 && r() < 0.5) choice = pick(has('hire-from-pool')), why = 'hire';
      else if (has('open-case').length && kind !== 'story' && !visited.has('case')) { choice = has('open-case')[0]; visited.add('case'); why = 'case-open'; }
      else if (has('take-door').length) choice = pick(has('take-door')), why = 'door';
      else if (has('next-step').length) choice = has('next-step')[0], why = 'next-step';
      else if (has('commit-journey').length) choice = has('commit-journey')[0], why = 'commit';
      else if (has('open-encounter').length) choice = has('open-encounter')[0], why = 'encounter';
      else if (has('advance').length) choice = has('advance')[0], why = 'advance';
      else if (has('go-lead').length) choice = has('go-lead')[0], why = 'go-lead';
      else if (has('outing-board').length) choice = has('outing-board')[0], why = 'outing-board';
    }
    if (!choice) { rec({ ev: 'no-action', snap, offers: offers.map(o => `${o.action}:${o.choice || o.step || o.door || ''} ${o.text}`) }); await page.waitForTimeout(400); if (stuck > 3) break; continue; }
    rec({ ev: 'act', why, act: choice.action, choice: choice.choice || choice.step || choice.door || choice.offer || choice.visit || choice.candidate || null, text: choice.text, snap });
    try {
      await page.evaluate(i => document.querySelector(`[data-bot-index="${i}"]`)?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })), choice.i);
    } catch (e) { /* navigation during click */ }
    await page.waitForTimeout(150);
    if (page.url().includes('/crew-run/')) continue;
    try { await page.waitForLoadState('load', { timeout: 30000 }); } catch {}
  }
  const end = page.url().includes('/crew-run/') ? null : await page.evaluate(SNAP).catch(() => null);
  rec({ ev: 'done', steps, fights, ms: Date.now() - t0, end, errors: errors.slice(0, 5) });
  await ctx.close();
}

(async () => {
  const [out, ...spec] = process.argv.slice(2);
  // The repo's own server (right MIME types for .mjs), for this run only.
  const root = process.env.SITE_ROOT || path.resolve(__dirname, '..', '..', '..'), port = Number(new URL(BASE).port);
  const server = require('child_process').spawn(process.execPath, [path.join(root, 'web/tools/serve.mjs')], { cwd: root, env: { ...process.env, PIRITORI_PORT: String(port) }, stdio: 'ignore' });
  process.on('exit', () => server.kill());
  for (let i = 0; i < 50; i += 1) { try { await fetch(BASE + 'web/'); break; } catch { await new Promise(r => setTimeout(r, 200)); } }
  const log = fs.createWriteStream(out, { flags: 'a' });
  // The default GPU backend: under --use-angle=swiftshader a 3D page takes 13-38 s to tear down (outing-browser.cjs).
  const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_PATH ? { executablePath: process.env.BROWSER_PATH } : process.platform === 'win32' ? { executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' } : {}) });
  for (let i = 0; i < spec.length; i += 2) {
    try { await playOne(browser, spec[i], Number(spec[i + 1]), log); }
    catch (e) { log.write(JSON.stringify({ kind: spec[i], seed: Number(spec[i + 1]), ev: 'crash', error: String(e.stack || e).slice(0, 800) }) + '\n'); }
    console.log('finished', spec[i], spec[i + 1]);
  }
  log.end(); await browser.close(); server.kill();
})();
