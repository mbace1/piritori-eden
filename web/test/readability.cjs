// The city reads — on every screen, on a phone and a desktop (Act I v4.56).
//
//   NODE_PATH=$(npm root -g) node web/test/readability.cjs
//
// ART_BIBLE §17's gates, measured rather than eyeballed:
//   - no visible text under 12px (SVG map labels are sized in board units and
//     checked by their own rule below);
//   - monospace only in the ledger voice: dialogue, quotes, observations and
//     the battle log (§5.1) — never for labels, prices or buttons;
//   - WCAG AA contrast (4.5:1, 3:1 for large text) for every enabled text,
//     measured against the PIXELS behind it. Panels are gradients and paper
//     textures, so a computed background-colour is a guess; the page is shot a
//     second time with all text made transparent and each element's colour is
//     compared with what is actually painted behind it.
// Debug hooks set up fixtures only (which scene is on screen), never an action
// under test. The first cut of this measurement read a transparent ancestor as
// "the background" and reported cream paper cards as 1.1:1 — the ruler, not
// the page (Kindling's lesson); hence the pixels.
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.webp': 'image/webp',
  '.png': 'image/png', '.glb': 'model/gltf-binary', '.woff2': 'font/woff2', '.ttf': 'font/ttf' };
const server = http.createServer((req, res) => {
  let file = path.resolve(ROOT, `.${decodeURIComponent(req.url.split('?')[0])}`);
  if (!file.startsWith(`${ROOT}${path.sep}`)) { res.writeHead(403); res.end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file)) { res.writeHead(404); res.end('missing'); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

let passed = 0, failed = 0;
function ok(name, condition, detail = '') {
  if (condition) { passed += 1; console.log(`  ok   ${name}`); return; }
  failed += 1;
  console.log(`  FAIL ${name}${detail ? ` → ${String(detail).slice(0, 500)}` : ''}`);
}

// Text elements on screen, with everything needed to judge them.
const collect = () => {
  const out = []; const seen = new Set();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const el = walker.currentNode.parentElement;
    if (!walker.currentNode.textContent.trim() || !el || seen.has(el) || el.closest('svg, script, style, [hidden]')) continue;
    seen.add(el);
    const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
    if (r.width < 2 || r.height < 2 || r.bottom <= 0 || r.top >= innerHeight || r.right <= 0 || r.left >= innerWidth) continue;
    if (cs.visibility === 'hidden' || +cs.opacity === 0) continue;
    let hidden = false; for (let e = el; e; e = e.parentElement) { const s = getComputedStyle(e); if (+s.opacity < 0.05 || s.display === 'none') hidden = true; }
    if (hidden) continue;
    // Covered text is not read: the splash veil, a fixed header or nav bar.
    const cx = (Math.max(0, r.left) + Math.min(innerWidth, r.right)) / 2, cy = (Math.max(0, r.top) + Math.min(innerHeight, r.bottom)) / 2;
    const hit = document.elementFromPoint(cx, cy);
    if (!hit || !(hit === el || el.contains(hit) || hit.contains(el))) continue;
    const m = cs.color.match(/[\d.]+/g).map(Number);
    const disabled = Boolean(el.closest('button:disabled, [aria-disabled="true"]'));
    const size = parseFloat(cs.fontSize); const bold = +cs.fontWeight >= 700;
    out.push({ text: walker.currentNode.textContent.trim().slice(0, 36), size, bold, fam: cs.fontFamily, rgb: m.slice(0, 3), alpha: m[3] ?? 1,
      box: [Math.max(0, r.left + 2), Math.max(0, r.top + 2), Math.min(innerWidth, r.right - 2), Math.min(innerHeight, r.bottom - 2)],
      glyph: !/[\p{L}\p{N}]/u.test(walker.currentNode.textContent),
      disabled, ledger: Boolean(el.closest('.observation, blockquote, .battle-log, .sms, .ledger-voice')) });
  }
  return out;
};
// Median luminance of what is painted behind each box, from a text-free shot.
const sample = async ({ png, boxes }) => {
  const img = new Image(); img.src = `data:image/png;base64,${png}`; await img.decode();
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const g = c.getContext('2d'); g.drawImage(img, 0, 0);
  const k = img.width / innerWidth;
  const lin = v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; };
  return boxes.map(([x0, y0, x1, y1]) => {
    const w = Math.max(1, Math.round((x1 - x0) * k)), h = Math.max(1, Math.round((y1 - y0) * k));
    const d = g.getImageData(Math.round(x0 * k), Math.round(y0 * k), w, h).data;
    const L = []; for (let i = 0; i < d.length; i += 4 * 7) L.push(.2126 * lin(d[i]) + .7152 * lin(d[i + 1]) + .0722 * lin(d[i + 2]));
    L.sort((a, b) => a - b);
    return { median: L[Math.floor(L.length / 2)] ?? 0, p10: L[Math.floor(L.length * .1)] ?? 0, p90: L[Math.floor(L.length * .9)] ?? 0 };
  });
};

async function judge(page, label) {
  const rows = await page.evaluate(collect);
  await page.addStyleTag({ content: '*{color:transparent!important;text-shadow:none!important;-webkit-text-stroke:0!important;caret-color:transparent!important}', }).then(h => h.evaluate(n => n.setAttribute('data-readability', '')));
  await page.waitForTimeout(80);
  const png = (await page.screenshot()).toString('base64');
  await page.evaluate(() => document.querySelectorAll('style[data-readability]').forEach(n => n.remove()));
  const bg = await page.evaluate(sample, { png, boxes: rows.map(r => r.box) });
  const lin = v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; };
  const small = [], mono = [], low = [];
  rows.forEach((r, i) => {
    if (r.size < 12) small.push(`${r.text} (${r.size}px)`);
    if (/mono|consol|courier/i.test(r.fam.split(',')[0]) && !r.ledger) mono.push(`${r.text} [${r.fam.split(',')[0]}]`);
    if (r.disabled) return;
    const fg = .2126 * lin(r.rgb[0]) + .7152 * lin(r.rgb[1]) + .0722 * lin(r.rgb[2]);
    // The median of what is painted inside the box (inset 2px, so a control's
    // own border is not read as its background).
    const b = bg[i].median;
    const ratio = (Math.max(fg, b) + .05) / (Math.min(fg, b) + .05);
    // A glyph with no letters or digits is an icon: WCAG's 3:1 for graphics.
    const need = (r.glyph || r.size >= 24 || (r.bold && r.size >= 18.66)) ? 3 : 4.5;
    if (ratio < need) low.push(`${r.text} ${ratio.toFixed(2)}:1 (${r.size}px)`);
  });
  ok(`${label}: no text under 12px`, small.length === 0, small.join(' | '));
  ok(`${label}: monospace only in the ledger voice`, mono.length === 0, mono.join(' | '));
  ok(`${label}: every enabled text meets AA against its real background`, low.length === 0, low.join(' | '));
  return rows.length;
}

server.listen(0, '127.0.0.1', async () => {
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    for (const [name, vp, touch] of [['desktop', { width: 1280, height: 800 }, false], ['phone', { width: 390, height: 844 }, true]]) {
      const page = await browser.newPage({ viewport: vp, hasTouch: touch, isMobile: touch });
      const errors = []; page.on('pageerror', e => errors.push(e.message));
      const settle = () => page.waitForTimeout(700);
      const fixture = async fn => { await page.evaluate(fn); await settle(); };
      // READABILITY_QUERY=?look=classic runs the control: the old interface must FAIL.
      await page.goto(`${base}/web/${process.env.READABILITY_QUERY || ''}`);
      await page.waitForFunction(() => Boolean(window.__ptv3?.data));
      await page.evaluate(() => document.fonts.ready);
      await judge(page, `${name} splash`);
      await page.locator('#beginButton').click(); await page.waitForSelector('.city-map'); await settle();
      await judge(page, `${name} map`);
      await page.locator('[data-anchor-group="siltasaari"] .map-anchor-hit').click({ force: true });
      await page.locator('[data-action="plan-journey"]').click();
      await page.locator('.journey-preview').scrollIntoViewIfNeeded(); await settle();
      await judge(page, `${name} journey preview`);
      await page.locator('[data-action="cancel-journey"]').click();
      await page.locator('[data-action="show-lead"]').click();
      await page.locator('[data-action="open-encounter"]').click(); await settle();
      await judge(page, `${name} encounter`);
      await page.locator('.choice-card').first().scrollIntoViewIfNeeded(); await settle();
      await judge(page, `${name} encounter choices`);
      await page.locator('[data-choice="buy"]').click(); await settle();
      await page.locator('[data-action="advance"]').click(); await page.waitForSelector('.city-map');
      await page.locator('[data-mode-target="ledger"]').click(); await settle();
      await judge(page, `${name} ledger`);
      // FIXTURE: a road event, to look at it (v4.58).
      await fixture(() => { const s = structuredClone(window.__ptv3.state); s.mode = 'road'; s.road = { journeys: 4, since: 0, seen: [], pending: { id: 'road-underpass', phase: 'transit', from: 'kurvi', to: s.selectedAnchor }, minutes: 0, minutesBlock: -1, last: null }; window.__ptv3.debug.setState(s); });
      await judge(page, `${name} road event`);
      await fixture(() => { const s = structuredClone(window.__ptv3.state); s.road = null; s.mode = 'route'; window.__ptv3.debug.setState(s); });
      // FIXTURES: the scheduled bulletin and a fight, to look at them.
      await fixture(() => { const s = structuredClone(window.__ptv3.state); s.scheduleIndex = 4; s.mode = 'news'; window.__ptv3.debug.setState(s); });
      await judge(page, `${name} news`);
      await fixture(() => { const s = structuredClone(window.__ptv3.state); const ids = window.__ptv3.data.content.crew.slice(0, 3).map(c => c.id);
        s.recruited = ids; s.deployed = ids; s.mode = 'route'; window.__ptv3.debug.setState(s); window.__ptv3.debug.startBattle('battle-karhupuisto-2v2'); });
      await page.waitForTimeout(1500);
      await page.locator('.battle-console').scrollIntoViewIfNeeded().catch(() => {}); await settle();
      await judge(page, `${name} battle`);
      ok(`${name}: no page errors`, errors.length === 0, errors.join(' | '));
      await page.close();
    }
  } catch (error) {
    ok('unhandled readability gate error', false, error.stack || error.message);
  } finally {
    await browser.close(); server.close();
    console.log(`\n  ${passed} passed, ${failed} failed`);
    process.exit(failed ? 1 : 0);
  }
});
