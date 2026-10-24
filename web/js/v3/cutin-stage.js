// Waist-up cut-ins (owner, 2026-10-23): NPCs "zoomed from waist up layered over with a text bubble and talk options",
// the level behind them; Arvo "always on the news tab", where "variety of looks and animations adds depth". They "don't
// need to be 3D": each speaker is an approved painting cut into paper pieces (art-src/cutins/cut.py, registered as
// `cutin-<who>-rig-v01` in art/v3/manifest.json) and acted the way Toko is (toko-stage.js): every piece on a hidden
// pivot, poses held on a 10 fps rhythm, the rest pose as the reduced-motion frame (ART_BIBLE §14.4).
//
// This module draws the picture: the backdrop, the figure, the bubble or the TV. The words and the buttons are HTML,
// laid over the canvas by the caller at the boxes exported here, so they wrap, scale and stay readable.
// art-src/cutins/review.html imports the same clips and drawing to film reviews: one implementation, two uses.
export const W = 1080, H = 1920;
const D = Math.PI / 180;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (k) => { k = clamp(k); return k * k * (3 - 2 * k); };
const step = (t, fps) => Math.floor(t * fps + 1e-6) / fps;
const key = (ks, t) => { if (t <= ks[0][0]) return ks[0][1]; for (let i = 1; i < ks.length; i++) if (t <= ks[i][0]) { const [a, va] = ks[i - 1], [b, vb] = ks[i]; return va + (vb - va) * smooth((t - a) / (b - a || 1)); } return ks[ks.length - 1][1]; };
// a jaw that speaks: one beat per syllable, 'a' open, 'e' half, '.' shut
const say = (s, t, rate = 7, open = 6) => { const ch = s[Math.floor(t * rate) % s.length]; return ch === 'a' ? open : ch === 'e' ? open * 0.55 : 0; };
const breath = (t, dur) => 1 + 0.008 * Math.sin(t / dur * 2 * Math.PI * 2);
export const REST = { sy: 1, rot: 0, ty: 0, blink: 0, jaw: 0, hy: 0 };
const P = (o) => ({ ...REST, ...o });

// Each speaker: rig id, layout, and clips (t is the clip's local time in seconds; values are in the painting's pixels).
export const CUTINS = {
  jaska: {
    rig: 'cutin-jaska-rig-v01', name: 'JASKA', layout: 'location',
    // the bubble sits above him; its tail has one side square to the bubble and aims at his mouth (owner, 2026-10-24)
    bubble: { x: 350, y: 360, w: 690, h: 380, tail: [[670, 736], [565, 855], [565, 737]] },
    clips: {
      idle: { dur: 5, loop: true, f: (t) => P({ sy: breath(t, 5), rot: 1.6 * D * Math.sin(t / 5 * 2 * Math.PI), blink: key([[0, 0], [1.6, 0], [1.7, 1], [1.8, 0], [4.2, 0], [4.3, 1], [4.4, 0]], t) }) },
      talk: { dur: 3.2, f: (t) => P({ sy: 1.004, rot: key([[0, 0], [0.8, -2 * D], [1.6, 1.5 * D], [2.4, -1 * D], [3.2, 0]], t), ty: key([[0, 0], [0.25, 5], [0.45, 0], [0.8, 7], [1.0, 0], [1.4, 4], [1.6, 0], [2.1, 6], [2.3, 0], [3.2, 0]], t), blink: key([[0, 0], [2.6, 0], [2.7, 1], [2.8, 0]], t) }) },
      nod: { dur: 1.6, f: (t) => P({ rot: -1 * D * smooth(t / 0.4) * (1 - smooth((t - 1.2) / 0.4)), ty: key([[0, 0], [0.35, 14], [0.8, 14], [1.2, 0]], t), blink: key([[0, 0], [0.4, 0], [0.5, 1], [0.6, 0]], t) }) },
      shake: { dur: 1.8, f: (t) => P({ rot: key([[0, 0], [0.3, -4 * D], [0.6, 4 * D], [0.9, -4 * D], [1.2, 3 * D], [1.6, 0]], t), ty: key([[0, 0], [0.3, 2], [1.6, 2], [1.8, 0]], t) }) },
    },
  },
  arvo: {
    rig: 'cutin-arvo-rig-v01', name: 'ARVO LINDE', layout: 'news',
    // ART_BIBLE §13.2, the Arvo section: "breathing, blink, paper glance, small hand gesture" — and a jaw, so he reads aloud
    copy: { x: 40, y: 1130, w: 1000, h: 640 },
    clips: {
      idle: { dur: 3, loop: true, f: (t) => P({ sy: breath(t, 3), rot: 0.8 * D * Math.sin(t / 3 * 2 * Math.PI), blink: key([[0, 0], [1.9, 0], [2.0, 1], [2.1, 0]], t) }) },
      read: { dur: 6, f: (t) => P({ sy: 1.004, rot: key([[0, 0], [1.2, -1.2 * D], [2.6, 0.8 * D], [4.2, -0.6 * D], [6, 0]], t), ty: key([[0, 0], [1.5, 2], [1.7, 0], [3.4, 3], [3.6, 0], [6, 0]], t),
        jaw: t < 5.6 ? say('a.e.a..e.a.e..a.ea..e.a.a..e.a.e.a...', t) : 0, blink: key([[0, 0], [2.9, 0], [3.0, 1], [3.1, 0]], t) }) },
      glance: { dur: 2.6, f: (t) => P({ rot: key([[0, 0], [0.4, 1.5 * D], [1.6, 1.5 * D], [2.0, 0]], t), ty: key([[0, 0], [0.4, 12], [1.6, 12], [2.0, 0]], t), blink: key([[0, 0], [0.3, 0], [0.4, 0.7], [1.6, 0.7], [1.7, 0]], t) }) },
      gesture: { dur: 4, f: (t) => P({ sy: 1.004, rot: key([[0, 0], [1, -1 * D], [2.4, 1 * D], [4, 0]], t), hy: key([[0, 0], [0.5, -12], [1.0, -4], [1.5, -14], [2.2, -2], [2.8, 0]], t),
        jaw: t < 3.6 ? say('.a.e.a..a.e.e.a..e.a.', t) : 0, blink: key([[0, 0], [3.2, 0], [3.3, 1], [3.4, 0]], t) }) },
      nod: { dur: 1.8, f: (t) => P({ ty: key([[0, 0], [0.35, 9], [0.7, 9], [1.1, 0]], t), blink: key([[0, 0], [0.4, 0], [0.5, 1], [0.6, 0]], t) }) },
    },
  },
};

/** A clip's pose at local time t, held on the 10 fps rhythm; looped clips wrap, one-shots stop at their end. */
export function pose(who, name, t) {
  const c = CUTINS[who].clips[name], lt = c.loop ? ((t % c.dur) + c.dur) % c.dur : clamp(t, 0, c.dur);
  return c.f(step(lt, 10));
}
const mix = (a, b, k) => { const o = {}; for (const ch in REST) o[ch] = a[ch] + (b[ch] - a[ch]) * k; return o; };

/** The manifest entry's pieces by part: { torso: {x,y,w,h,pivot,img}, ... } plus lids [{x,y,w,h,img}]. */
export function rigParts(asset, images) {
  const parts = {}, lids = [];
  for (const m of asset.members) {
    const p = { ...m, pivot: asset.rig.pivots[m.part], img: images[m.part] };
    if (asset.rig.lids?.[m.part]) lids.push(p); else parts[m.part] = p;
  }
  return { parts, lids, size: asset.dimensions };
}

/** The figure, in the painting's own pixels: torso breathes, hands lift, head turns on its neck, jaw and lids ride the head. */
export function drawFigure(g, rig, p, FX, FY, S, between) {
  const { torso, hands, head, jaw } = rig.parts;
  g.save(); g.translate(FX, FY); g.scale(S, S);
  g.save(); g.translate(torso.pivot[0], torso.pivot[1]); g.scale(1, p.sy); g.translate(-torso.pivot[0], -torso.pivot[1]); g.drawImage(torso.img, torso.x, torso.y); g.restore();
  if (between) between();
  if (hands) g.drawImage(hands.img, hands.x, hands.y + p.hy);
  g.save(); const [hx, hy] = head.pivot; g.translate(hx, hy + p.ty - (p.sy - 1) * 300); g.rotate(p.rot); g.translate(-hx, -hy);
  g.drawImage(head.img, head.x, head.y);
  if (jaw) g.drawImage(jaw.img, jaw.x, jaw.y + p.jaw);
  const k = clamp(p.blink); if (k > 0.02) for (const l of rig.lids) g.drawImage(l.img, 0, 0, l.w, l.h * k, l.x, l.y, l.w, l.h * k);
  g.restore(); g.restore();
}

// ---- location: the level behind, dimmed; the speaker waist-up bottom-left; the bubble's card (its words are HTML)
function drawLocation(g, who, rig, p, plate) {
  g.clearRect(0, 0, W, H);
  if (plate) { const sh = H * 0.62, sw = sh * plate.width / plate.height; g.drawImage(plate, (W - sw) / 2 - 120, 0, sw, sh); g.fillStyle = '#121719'; g.fillRect(0, sh, W, H - sh); }
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, 'rgba(10,12,14,.35)'); gr.addColorStop(0.55, 'rgba(10,12,14,.55)'); gr.addColorStop(1, 'rgba(10,12,14,.9)'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  const FH = H * 0.62; drawFigure(g, rig, p, -40, H - FH, FH / rig.size[1]);
  const { x, y, w, h, tail: [a, tip, b] } = CUTINS[who].bubble;
  g.save(); g.shadowColor = 'rgba(0,0,0,.5)'; g.shadowBlur = 18; g.shadowOffsetX = 8; g.shadowOffsetY = 12;
  g.fillStyle = '#C7AA79'; g.beginPath(); g.moveTo(x, y); g.lineTo(x + w, y + 6); g.lineTo(x + w - 4, y + h); g.lineTo(a[0], a[1]); g.lineTo(tip[0], tip[1]); g.lineTo(b[0], b[1]); g.lineTo(x + 4, y + h - 2); g.closePath(); g.fill(); g.restore();
}

// ---- news: ART_BIBLE §13.1, the channel table — CRT shell, studio frame, lower-third card, scanlines; the copy on kraft below
function drawNews(g, who, rig, p, t) {
  g.fillStyle = '#17191A'; g.fillRect(0, 0, W, H);
  const sx = 70, sy = 200, sw = 940, sh = 760;
  g.fillStyle = '#2C2F2E'; g.beginPath(); g.roundRect(sx - 46, sy - 46, sw + 92, sh + 150, 34); g.fill();
  g.fillStyle = '#1E201F'; g.beginPath(); g.roundRect(sx - 12, sy - 12, sw + 24, sh + 24, 40); g.fill();
  g.save(); g.beginPath(); g.roundRect(sx, sy, sw, sh, 36); g.clip();
  const bg = g.createRadialGradient(sx + sw * 0.5, sy + sh * 0.4, 60, sx + sw * 0.5, sy + sh * 0.5, sw * 0.75);
  bg.addColorStop(0, '#5E7381'); bg.addColorStop(1, '#2C3A44'); g.fillStyle = bg; g.fillRect(sx, sy, sw, sh);
  g.fillStyle = 'rgba(199,170,121,.18)'; g.fillRect(sx + sw - 260, sy + 70, 190, 120);
  const S = 0.78, FY = sy + sh - 754, FX = sx + (sw - rig.size[0] * S) / 2;
  drawFigure(g, rig, p, FX, FY, S, () => { g.fillStyle = '#6E655B'; g.fillRect(-FX / S, 778, sw / S + 400, 200); g.fillStyle = '#EDE6D6'; g.save(); g.translate(130, 800); g.rotate(-0.05); g.fillRect(0, 0, 170, 40); g.restore(); });
  g.fillStyle = 'rgba(16,18,18,.88)'; g.fillRect(sx, sy + sh - 104, sw * 0.78, 70);
  g.fillStyle = '#C5A044'; g.fillRect(sx, sy + sh - 104, 14, 70);
  g.fillStyle = '#E2D8C2'; g.font = '700 36px "Arial Narrow", Arial, sans-serif'; g.fillText(`${CUTINS[who].name} · HELSINKI`, sx + 34, sy + sh - 57);
  g.fillStyle = 'rgba(0,0,0,.10)'; for (let y = sy + ((t * 40) % 4); y < sy + sh; y += 4) g.fillRect(sx, y, sw, 2);
  const vg = g.createRadialGradient(sx + sw / 2, sy + sh / 2, sh * 0.45, sx + sw / 2, sy + sh / 2, sw * 0.72); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.45)'); g.fillStyle = vg; g.fillRect(sx, sy, sw, sh);
  g.restore();
  const { x, y, w, h } = CUTINS[who].copy;
  g.fillStyle = '#C7AA79'; g.beginPath(); g.moveTo(x, y); g.lineTo(x + w, y + 6); g.lineTo(x + w - 4, y + h); g.lineTo(x + 4, y + h - 4); g.closePath(); g.fill();
}

/** One frame of the whole cut-in picture. */
export function drawCutin(g, who, rig, p, { t = 0, plate = null } = {}) {
  if (CUTINS[who].layout === 'news') drawNews(g, who, rig, p, t); else drawLocation(g, who, rig, p, plate);
}

/** Load a speaker's rig (and the plate behind, if any). Resolves to a stage, or null when it is not registered or fails. */
export async function loadCutin(data, who, { reducedMotion = false, plateId = null } = {}) {
  const cast = CUTINS[who], asset = cast && data.artManifest?.assets?.find(a => a.id === cast.rig);
  if (!asset) return null;
  const load = (url) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
  const images = {}; let plate = null;
  try {
    await Promise.all(asset.members.map(async m => { images[m.part] = await load(data.art.get(m.id).url); }));
    const plateUrl = plateId && data.art.get(plateId)?.url; if (plateUrl) plate = await load(plateUrl);
  } catch { return null; }
  const rig = rigParts(asset, images), clock = () => performance.now() / 1000;
  let canvas = null, g = null, frame = 0, lastDrawn = -1, cur = { name: 'idle', t0: clock(), from: null, then: 'idle' };
  function current(t) {
    let c = cast.clips[cur.name];
    if (!c.loop && t - cur.t0 >= c.dur) { cur = { name: cur.then, t0: cur.t0 + c.dur, from: pose(who, cur.name, c.dur), then: cur.then }; c = cast.clips[cur.name]; }
    const p = pose(who, cur.name, t - cur.t0);
    return cur.from ? mix(cur.from, p, smooth((t - cur.t0) / 0.3)) : p;
  }
  const draw = (t, still) => drawCutin(g, who, rig, still ? REST : current(t), { t: still ? 0 : t, plate });
  function loop() {
    frame = 0;
    if (!canvas?.isConnected) { canvas = g = null; return; }
    const t = clock(), tick = Math.floor(t * 12);
    if (tick !== lastDrawn) { lastDrawn = tick; draw(t); }
    frame = requestAnimationFrame(loop);
  }
  return {
    who, cast,
    attach(next) {
      canvas = next; g = canvas.getContext('2d'); canvas.width = W; canvas.height = H; canvas.dataset.status = 'ready';
      if (reducedMotion) { draw(0, true); return; }
      lastDrawn = -1; if (!frame) frame = requestAnimationFrame(loop);
    },
    /** Act: blend from wherever the speaker is into the clip over 0.3 s; a one-shot falls back to `then`. */
    play(name, { then = 'idle' } = {}) {
      if (!cast.clips[name]) return;
      const t = clock(); cur = { name, t0: t, from: current(t), then };
    },
    get clip() { return cur.name; },
  };
}
