// Toko Slomo behind his counter, in cut card, acting (owner, 2026-10-21: "Approved, put it in the game").
//
// The approved v02 Toko is cut into pieces (art/v3/manifest.json `scene-toko-rig-v01`) and drawn over the empty bar,
// whose counter line they share; every piece turns on a hidden pivot (ART_BIBLE §14.2). Character poses hold on a
// 10 fps rhythm; the room's own life (steam, rain, the street lamp, the tram's headlights) is additive, STAGE_SPEC
// tier 0, so it never needs anything painted behind it. The rest pose is the painting as approved, and it is the
// reduced-motion frame (§14.4).
//
// One stage per page: app.js re-renders by innerHTML, so the stage outlives its canvas. attach() takes the new
// canvas and keeps the clip that was playing; a canvas that has left the document stops the loop.
const TAU = Math.PI * 2, D = Math.PI / 180;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (k) => { k = clamp(k); return k * k * (3 - 2 * k); };
const step = (t, fps) => Math.floor(t * fps + 1e-6) / fps;
const rng = (seed) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
export const RIG_ID = 'scene-toko-rig-v01';

const REST = { 'torso.s': 1, 'torso.sy': 1, 'torso.ty': 0, 'head.rot': 0, 'head.tx': 0, 'head.ty': 0, 'head.s': 1,
  'brow_l.rot': 0, 'brow_l.ty': 0, 'brow_r.rot': 0, 'brow_r.ty': 0, 'fore_r.rot': 0, 'fore_r.tx': 0, 'fore_r.ty': 0,
  'hand_l.rot': 0, 'hand_l.tx': 0, 'hand_l.ty': 0, 'note.tx': 0, 'note.ty': 0, 'note.rot': 0, 'note.a': 1, blink: 0, till: 0 };
// key values are in source pixels (the 1672-wide v02 the clips were timed on); S scales them to the plate
const S = 1536 / 1672;
const loopKeys = (period, n, a, b, phase = 0) => { const k = []; for (let i = 0; i <= n * 2; i++) k.push([phase + (i / (n * 2)) * period, i % 2 ? b : a]); return k; };
const blinkAt = (t0) => [[0, 0], [t0, 0], [t0 + 0.1, 1], [t0 + 0.2, 1], [t0 + 0.3, 0]];
const LEAN = { 'torso.s': 1.03, 'torso.ty': 7, 'head.ty': 12, 'head.rot': -3 * D, 'head.s': 1.02 };
export const CLIPS = {
  // drying the cloth round his fist, breathing into his shoulders, a look about with a brow, finger taps, two blinks
  idle: { dur: 6.0, loop: true, keys: {
    'torso.sy': loopKeys(6.0, 2, 1, 1.012), 'torso.s': loopKeys(6.0, 2, 1, 1.004),
    'fore_r.rot': loopKeys(6.0, 6, 0, 5 * D), 'fore_r.tx': loopKeys(6.0, 6, 0, 5, 0.25), 'fore_r.ty': loopKeys(6.0, 6, 0, -4, 0.12),
    'head.rot': [[0, 0], [0.9, 2.6 * D], [2.1, 2.6 * D], [3.0, -2.2 * D], [4.4, -2.2 * D], [5.3, 0], [6.0, 0]],
    'head.tx': [[0, 0], [0.9, 3], [2.1, 3], [3.0, -3], [4.4, -3], [5.3, 0], [6.0, 0]],
    'head.ty': loopKeys(6.0, 2, 0, 1.5),
    'brow_l.ty': [[0, 0], [1.0, -4], [1.9, -4], [2.3, 0], [6.0, 0]], 'brow_r.ty': [[0, 0], [3.1, 0], [3.4, -4], [4.2, -4], [4.6, 0], [6.0, 0]],
    'hand_l.rot': [[0, 0], [2.2, 0], [2.3, -2.6 * D], [2.4, 0], [2.6, -2.6 * D], [2.7, 0], [6.0, 0]],
    blink: [[0, 0], [1.4, 0], [1.5, 1], [1.6, 1], [1.7, 0], [4.8, 0], [4.9, 1], [5.0, 1], [5.1, 0], [5.2, 1], [5.3, 0]] } },
  // "Toko lowers his voice": over the counter, brows down and in, small nods on the syllables, the cloth lifts on the word
  lean: { dur: 3.6, loop: true, hold: { ...LEAN, 'brow_l.rot': 8 * D, 'brow_r.rot': -8 * D, 'brow_l.ty': 2, 'brow_r.ty': 2, 'fore_r.rot': -1 * D, 'fore_r.ty': 2 }, keys: {
    'torso.sy': loopKeys(3.6, 1, 1, 1.01),
    'head.ty': [[0, 12], [0.3, 14], [0.5, 12], [0.8, 15], [1.0, 12], [1.3, 17], [1.6, 12], [1.9, 14], [2.1, 12], [3.6, 12]],
    'head.rot': [[0, -3 * D], [0.8, -4.2 * D], [1.6, -2 * D], [2.4, -3.6 * D], [3.6, -3 * D]],
    'brow_l.ty': [[0, 2], [1.2, 2], [1.35, -3], [1.8, -3], [2.1, 2], [3.6, 2]], 'brow_r.ty': [[0, 2], [1.2, 2], [1.35, -3], [1.8, -3], [2.1, 2], [3.6, 2]],
    'fore_r.rot': [[0, -1 * D], [1.1, -1 * D], [1.35, -6 * D], [1.9, -6 * D], [2.3, -1 * D], [3.6, -1 * D]],
    blink: blinkAt(2.7) } },
  // BUY INFO (and a bowl): the hand lifts, slides the note across to you, the till rings, brows up, a nod; the note is yours
  buy_info: { dur: 3.2, loop: false, hold: LEAN, keys: {
    'hand_l.rot': [[0, 0], [0.3, -4.5 * D], [0.6, -1 * D], [1.2, 0]],
    'hand_l.tx': [[0, 0], [0.4, 0], [0.9, -24], [1.3, -24], [1.9, 0]], 'hand_l.ty': [[0, 0], [0.4, -6], [0.9, 18], [1.3, 18], [1.9, 0]],
    'note.tx': [[0, 0], [0.4, 0], [0.9, -44], [2.4, -44], [2.9, -56]], 'note.ty': [[0, 0], [0.4, 0], [0.9, 44], [2.4, 44], [2.9, 64]],
    'note.rot': [[0, 0], [0.9, -8 * D], [2.9, -12 * D]], 'note.a': [[0, 1], [2.5, 1], [2.9, 0]],
    'brow_l.ty': [[0, 2], [1.4, 2], [1.6, -6], [2.4, -6], [2.8, 0]], 'brow_r.ty': [[0, 2], [1.4, 2], [1.6, -6], [2.4, -6], [2.8, 0]],
    'brow_l.rot': [[0, 8 * D], [1.4, 8 * D], [1.6, -2 * D], [2.6, -2 * D], [3.2, 0]], 'brow_r.rot': [[0, -8 * D], [1.4, -8 * D], [1.6, 2 * D], [2.6, 2 * D], [3.2, 0]],
    'head.ty': [[0, 12], [1.6, 12], [1.8, 20], [2.0, 12], [2.15, 17], [2.3, 12], [3.2, 4]],
    'torso.sy': [[0, 1], [1.5, 1], [1.8, 1.012], [2.6, 1]],
    till: [[0, 0], [1.1, 0], [1.2, 1], [3.2, 1]] } },
  // a sale from under the counter: a tap of the hand, the till rings, brows up, a nod
  sell: { dur: 2.4, loop: false, keys: {
    'hand_l.rot': [[0, 0], [0.25, -4 * D], [0.45, 0], [0.6, -3 * D], [0.8, 0]],
    'brow_l.ty': [[0, 0], [0.7, 0], [0.9, -5], [1.8, -5], [2.2, 0]], 'brow_r.ty': [[0, 0], [0.7, 0], [0.9, -5], [1.8, -5], [2.2, 0]],
    'head.ty': [[0, 0], [0.9, 0], [1.1, 9], [1.3, 0], [1.45, 6], [1.6, 0]],
    till: [[0, 0], [0.5, 0], [0.6, 1], [2.4, 1]] } },
  // RISK SABOTAGE: a hard look at the window, the cloth down, the brows knit, a slow shake of the head, a sigh
  sabotage: { dur: 3.4, loop: false, keys: {
    'head.rot': [[0, 0], [0.4, 5.5 * D], [1.2, 5.5 * D], [1.5, -4 * D], [1.8, 4 * D], [2.1, -4 * D], [2.4, 1 * D], [3.4, 0]],
    'head.tx': [[0, 0], [0.4, 10], [1.2, 10], [2.4, 1], [3.4, 0]], 'head.ty': [[0, 0], [0.4, -2], [1.2, -2], [2.6, 4], [3.4, 0]],
    'brow_l.rot': [[0, 0], [0.5, 12 * D], [2.8, 12 * D], [3.4, 0]], 'brow_r.rot': [[0, 0], [0.5, -12 * D], [2.8, -12 * D], [3.4, 0]],
    'brow_l.ty': [[0, 0], [0.5, 4], [2.8, 4], [3.4, 0]], 'brow_r.ty': [[0, 0], [0.5, 4], [2.8, 4], [3.4, 0]],
    'fore_r.rot': [[0, 0], [0.5, 7 * D], [2.8, 7 * D], [3.4, 0]], 'fore_r.ty': [[0, 0], [0.5, 10], [2.8, 10], [3.4, 0]],
    'torso.sy': [[0, 1], [0.6, 1.015], [1.4, 1.0], [2.6, 1.012], [3.4, 1]],
    blink: [[0, 0], [2.5, 0], [2.6, 1], [2.7, 1], [2.8, 0]] } },
  // a quiet acknowledgement: one slow nod, a blink
  nod: { dur: 1.8, loop: false, keys: {
    'head.ty': [[0, 0], [0.4, 11], [0.9, 11], [1.3, 0]], 'head.rot': [[0, 0], [0.4, -1.5 * D], [1.3, 0]],
    blink: blinkAt(0.5) } },
  // LEAVE: a bow from the neck and the cloth raised in three waves
  leave: { dur: 2.8, loop: false, keys: {
    'head.ty': [[0, 0], [0.3, 20], [0.75, 20], [1.05, 0]], 'head.s': [[0, 1], [0.3, 0.975], [0.75, 0.975], [1.05, 1]],
    'torso.s': [[0, 1], [0.3, 1.018], [1.05, 1]],
    'fore_r.rot': [[0, 0], [0.9, 0], [1.2, -13 * D], [1.38, -8 * D], [1.56, -13 * D], [1.74, -8 * D], [1.92, -13 * D], [2.1, -8 * D], [2.8, 0]],
    'fore_r.ty': [[0, 0], [0.9, 0], [1.2, -7], [2.1, -7], [2.8, 0]],
    'brow_l.ty': [[0, 0], [1.1, 0], [1.3, -5], [2.2, -5], [2.6, 0]], 'brow_r.ty': [[0, 0], [1.1, 0], [1.3, -5], [2.2, -5], [2.6, 0]],
    blink: blinkAt(0.35) } },
};

function sampleKeys(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) {
    const [t0, v0] = keys[i - 1], [t1, v1] = keys[i]; return v0 + (v1 - v0) * smooth((t - t0) / (t1 - t0 || 1)); }
  return keys[keys.length - 1][1];
}
/** a clip's pose at local time t (looped clips wrap) */
export function pose(name, t) {
  const c = CLIPS[name], lt = c.loop ? ((t % c.dur) + c.dur) % c.dur : clamp(t, 0, c.dur), p = { ...REST, ...(c.hold || {}) };
  for (const [ch, keys] of Object.entries(c.keys)) p[ch] = sampleKeys(keys, lt);
  return p;
}
const mix = (a, b, k) => { const o = {}; for (const ch in REST) o[ch] = a[ch] + (b[ch] - a[ch]) * k; return o; };
const PIXEL = new Set(['torso.ty', 'head.tx', 'head.ty', 'brow_l.ty', 'brow_r.ty', 'fore_r.tx', 'fore_r.ty', 'hand_l.tx', 'hand_l.ty', 'note.tx', 'note.ty']);

/** Load the rig and its plate once. Resolves to a stage, or null when the rig is not registered or fails to load. */
export async function loadTokoStage(data, { reducedMotion = false } = {}) {
  const asset = data.artManifest?.assets?.find(a => a.id === RIG_ID);
  const plateUrl = asset && data.art.get(asset.plate_asset_id)?.url;
  if (!asset || !plateUrl) return null;
  const load = (url) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
  let plate; const part = {};
  try {
    plate = await load(plateUrl);
    await Promise.all(asset.members.map(async m => { part[m.part] = { ...m, img: await load(data.art.get(m.id).url) }; }));
  } catch { return null; }
  const { pivots: PV, lid_rgb, ambient: A } = asset.rig;
  const [W, H] = asset.dimensions;
  let canvas = null, g = null, frame = 0, lastDrawn = -1, flags = { noteGone: false, till: 120 }, leanTimer = 0;
  const clock = () => performance.now() / 1000;
  let cur = { name: 'idle', t0: clock(), from: null, then: 'idle' };

  const put = (k, dx = 0, dy = 0) => { const p = part[k]; g.drawImage(p.img, p.x + dx, p.y + dy); };
  const about = ([px, py], rot = 0, s = 1, sy = 1, tx = 0, ty = 0) => { g.translate(px + tx, py + ty); g.rotate(rot); g.scale(s, s * sy); g.translate(-px, -py); };
  const lid = (k) => { const p = part[k], c = document.createElement('canvas'); c.width = p.w; c.height = p.h; const x = c.getContext('2d');
    x.drawImage(p.img, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = `rgb(${lid_rgb})`; x.fillRect(0, 0, p.w, p.h); return c; };
  const LID = { eye_l: lid('eye_l'), eye_r: lid('eye_r') };
  const R = rng(11), puffs = Array.from({ length: 7 }, (_, i) => ({ off: R() * 5, dx: -10 - R() * 34, s: 0.7 + R() * 0.5, seed: 100 + i }));
  const glass = A.glass, gx = glass.map(p => p[0]), gy = glass.map(p => p[1]);
  const drops = Array.from({ length: 60 }, () => ({ x: R(), y: R(), l: 11 + R() * 15, v: 0.8 + R() * 0.5 }));
  const glow = (x, y, r, rgb, a) => { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(${rgb},${a})`); gr.addColorStop(1, `rgba(${rgb},0)`); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); };

  function ambient(t) {
    g.save(); g.globalCompositeOperation = 'lighter';
    const t8 = step(t, 8);
    glow(A.lantern[0], A.lantern[1], 120, '255,170,90', 0.07 + 0.03 * Math.sin(t8 * 2.3));
    glow(A.street_lamp[0], A.street_lamp[1], 46, '255,232,180', 0.22 + 0.06 * Math.sin(t8 * 7.1) * (Math.sin(t8 * 0.9) > 0.85 ? 1 : 0.3));
    for (const [hx, hy] of A.headlights) glow(hx, hy, 30, '255,236,190', 0.3 + 0.08 * Math.sin(t8 * 5.1 + hx));
    g.restore();
    // rain on the street, clipped to the glass, 12 fps
    const tr = step(t, 12), x0 = Math.min(...gx), x1 = Math.max(...gx), y0 = Math.min(...gy), y1 = Math.max(...gy);
    g.save(); g.beginPath(); glass.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.clip();
    g.strokeStyle = 'rgba(178,198,224,.3)'; g.lineWidth = 1.1;
    for (const d of drops) { const y = y0 + ((d.y * (y1 - y0) + tr * 570 * d.v) % (y1 - y0)), x = x0 + d.x * (x1 - x0) - (y - y0) * 0.12;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x - d.l * 0.2, y + d.l); g.stroke(); }
    g.restore();
    // steam off the pot: cut-paper puffs that rise, swell and thin, 8 fps, never two in step
    for (const p of puffs) { const k = ((t8 + p.off) % 5) / 5, x = A.steam[0] + p.dx * k, y = A.steam[1] - k * 120, r = (9 + k * 31) * p.s, a = 0.32 * Math.sin(k * Math.PI);
      const pr = rng(p.seed); g.fillStyle = `rgba(226,214,192,${a})`; g.beginPath();
      for (let i = 0; i < 9; i++) { const an = i / 9 * TAU, rr = r * (0.75 + pr() * 0.4); g.lineTo(x + Math.cos(an) * rr, y + Math.sin(an) * rr * 0.8); }
      g.closePath(); g.fill(); }
  }
  function chef(p) {
    const body = () => about(PV.torso, 0, p['torso.s'], p['torso.sy'], 0, p['torso.ty']);
    g.save(); body(); put('torso');
    g.save(); about(PV.head, p['head.rot'], p['head.s'], 1, p['head.tx'], p['head.ty']); put('head');
    if (p['brow_l.rot'] || p['brow_l.ty'] || p['brow_r.rot'] || p['brow_r.ty']) {
      put('hood_bare');
      for (const k of ['brow_l', 'brow_r']) { g.save(); about(PV[k], p[k + '.rot'], 1, 1, 0, p[k + '.ty']); put(k); g.restore(); } }
    if (p.blink > 0.02) for (const k of ['eye_l', 'eye_r']) { const e = part[k], hh = Math.ceil(e.h * clamp(p.blink));
      g.drawImage(LID[k], 0, 0, e.w, hh, e.x, e.y, e.w, hh); g.fillStyle = 'rgba(60,34,8,.55)'; g.fillRect(e.x + 2, e.y + hh - 2, e.w - 4, 2); }
    g.restore(); g.restore();
    put('counter');
    g.save(); body(); about(PV.fore_r, p['fore_r.rot'], 1, 1, p['fore_r.tx'], p['fore_r.ty']); put('fore_r'); g.restore();
    if (p['note.a'] > 0.01) { g.save(); g.globalAlpha = p['note.a']; about(PV.note, p['note.rot'], 1, 1, p['note.tx'], p['note.ty']); put('note'); g.restore(); }
    g.save(); body(); about(PV.hand_l, p['hand_l.rot'], 1, 1, p['hand_l.tx'], p['hand_l.ty']); put('hand_l'); g.restore();
    if (p.till > 0.01) { const [x0, y0, x1, y1] = A.till;
      g.fillStyle = '#25221d'; g.fillRect(x0, y0, x1 - x0, y1 - y0); g.fillStyle = '#d9cfb8'; g.font = `600 ${Math.round((y1 - y0) * 0.9)}px "Courier New", monospace`; g.textAlign = 'right';
      g.fillText((flags.till * smooth(p.till)).toFixed(2), x1 - 3, y1 - 2); }
  }
  function current(t) {
    let c = CLIPS[cur.name];
    if (!c.loop && t - cur.t0 >= c.dur) { cur = { name: cur.then, t0: cur.t0 + c.dur, from: pose(cur.name, c.dur), then: cur.then }; c = CLIPS[cur.name]; }
    let p = pose(cur.name, step(t - cur.t0, 10));
    if (cur.from) p = mix(cur.from, p, smooth((t - cur.t0) / 0.3));
    if (flags.noteGone && cur.name !== 'buy_info') p['note.a'] = 0;
    const o = {}; for (const ch in p) o[ch] = PIXEL.has(ch) ? p[ch] * S : p[ch];
    return o;
  }
  function draw(t, still = false) {
    g.drawImage(plate, 0, 0, W, H);
    if (!still) ambient(t);
    chef(still ? { ...REST, 'note.a': flags.noteGone ? 0 : 1 } : current(t));
  }
  function loop() {
    frame = 0;
    if (!canvas?.isConnected) { canvas = g = null; return; }
    const t = clock(), tick = Math.floor(t * 12);
    if (tick !== lastDrawn) { lastDrawn = tick; draw(t); }
    frame = requestAnimationFrame(loop);
  }
  return {
    /** Draw into this canvas from now on. ctx.noteGone hides the note he already handed over; ctx.leanAfter (s)
     *  starts the "lowers his voice" loop that long after a fresh arrival. */
    attach(next, ctx = {}) {
      canvas = next; g = canvas.getContext('2d'); canvas.width = W; canvas.height = H;
      flags.noteGone = Boolean(ctx.noteGone);
      clearTimeout(leanTimer);
      if (ctx.leanAfter != null && cur.name === 'idle') leanTimer = setTimeout(() => { if (canvas?.isConnected && cur.name === 'idle') this.play('lean', { then: 'lean' }); }, ctx.leanAfter * 1000);
      canvas.dataset.status = 'ready';
      if (reducedMotion) { draw(0, true); return; }
      lastDrawn = -1; if (!frame) frame = requestAnimationFrame(loop);
    },
    /** Act: blend from wherever he is into the clip over 0.3 s; a one-shot falls back to `then`. */
    play(name, { then = 'idle', till } = {}) {
      if (!CLIPS[name]) return;
      clearTimeout(leanTimer);
      if (till != null) flags.till = till;
      if (name === 'buy_info') flags.noteGone = true;
      const t = clock(); cur = { name, t0: t, from: current(t), then };
      for (const ch of PIXEL) cur.from[ch] /= S;
      if (reducedMotion && canvas) draw(0, true);
    },
    get clip() { return cur.name; },
  };
}
