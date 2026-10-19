// Tokon Ramen's room, alive — AD2 (design/ART_DIRECTION_NON_BATTLE.md).
//
// STAGE_SPEC.md §6.1 tier 0 and tier 1, from art-src/prototypes/counter-motion.html,
// moved into the game: steam off the pot, rain in the window, the lantern and the
// tram's headlamps breathing, a slow warm wash. Everything is ADDED over the
// painted plate; nothing is lifted out of it, so nothing behind it is needed.
//
// Regions are in SOURCE pixels of the 1536x864 empty-bar plate
// (scene-toko-noodles-empty-v01), re-read off a grid on 2026-10-17 because the
// prototype's were measured on the v02 plate: the steam leaves the lid at y≈300
// (not 234), the lantern is larger, and the tram's lamps sit at y≈343 (268 was
// the tram's windows). The speaker stage draws the plate with object-fit: fill,
// so source pixels map linearly onto the stage.
//
// Performance (CLAUDE.md rule 9), measured 2026-10-18: the first version drew
// at device resolution with a gradient object per wisp per frame and a
// full-canvas soft-light blend every frame. Now: at most 1x pixels (all of this
// is soft; CSS scales it), one pre-drawn glow sprite per colour, the
// near-static wash redrawn every 2 s into its own layer, and ~30 fps.
//
// Deterministic: the same t draws the same picture. Reduced motion draws one
// still frame and stops. A hidden tab does not draw.
const SRC = { w: 1536, h: 864 };
const R = {
  window: { x: 1300, y: 20, w: 236, h: 420 },
  pot: { x: 178, y: 300, w: 136 },
  lantern: { x: 10, y: 22, w: 122, h: 246 },
  lamps: [{ x: 1444, y: 343, r: 11 }, { x: 1497, y: 343, r: 11 }],
  street: { x: 1362, y: 131, r: 9 },
};
const rnd = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

// one soft round sprite per colour, made once
const SPRITES = {};
function sprite(rgb) {
  if (SPRITES[rgb]) return SPRITES[rgb];
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, `rgba(${rgb},1)`); gr.addColorStop(1, `rgba(${rgb},0)`);
  x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
  return (SPRITES[rgb] = c);
}

let stop = () => {};
export function disposeCounterMotion() { stop(); stop = () => {}; }

export function mountCounterMotion(stage) {
  disposeCounterMotion();
  if (!stage) return;
  const cv = document.createElement('canvas');
  cv.className = 'counter-motion'; cv.setAttribute('aria-hidden', 'true');
  const plate = stage.querySelector('.scene-image');
  plate ? plate.after(cv) : stage.prepend(cv);
  const g = cv.getContext('2d');
  const wash = document.createElement('canvas'), wg = wash.getContext('2d');
  let S = 1, frame = 0, dead = false, washAt = -99;
  const size = () => { const r = cv.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 1); cv.width = wash.width = Math.max(1, Math.round(r.width * d)); cv.height = wash.height = Math.max(1, Math.round(r.height * d)); S = cv.width / SRC.w; washAt = -99; };
  const observer = new ResizeObserver(() => { size(); if (reduced) draw(still); }); observer.observe(cv); size();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches, still = 4.2;

  const blob = (x, y, r, rgb, a) => { g.globalAlpha = a; g.drawImage(sprite(rgb), (x - r) * S, (y - r) * S, 2 * r * S, 2 * r * S); };
  function steam(t) {
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 20; i++) {
      const s = i * 7.31, life = 3.4 + rnd(s) * 2.2, k = (t / life + rnd(s + 1)) % 1;
      const x = R.pot.x + R.pot.w * (0.35 + 0.3 * (rnd(s + 3) - 0.5)) + Math.sin(t * 0.6 + s) * 16 * k + (rnd(s + 2) - 0.5) * 18;
      const y = R.pot.y - 150 * k, rad = (9 + rnd(s + 4) * 8) * (0.5 + k * 1.5);
      blob(x, y, rad, '226,222,209', 0.15 * Math.min(k / 0.18, 1) * (1 - k) ** 1.2);
    }
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  }
  function rain(t) {
    const w = R.window; g.save(); g.beginPath(); g.rect(w.x * S, w.y * S, w.w * S, w.h * S); g.clip();
    g.fillStyle = 'rgba(120,150,180,0.04)'; g.fillRect(w.x * S, w.y * S, w.w * S, w.h * S); g.lineCap = 'round';
    for (let i = 0; i < 80; i++) {
      const s = i * 3.77, sp = 260 + rnd(s) * 340, len = 12 + rnd(s + 1) * 26, lean = 6 + rnd(s + 2) * 5, near = rnd(s + 5);
      const x0 = w.x + rnd(s + 3) * (w.w + 60) - 40, y0 = w.y + ((rnd(s + 4) * w.h + t * sp) % (w.h + len)) - len;
      g.strokeStyle = `rgba(198,216,232,${(0.05 + near * 0.15).toFixed(3)})`; g.lineWidth = Math.max(0.6, (0.7 + near * 1.1) * S);
      g.beginPath(); g.moveTo(x0 * S, y0 * S); g.lineTo((x0 - lean) * S, (y0 + len) * S); g.stroke();
    }
    g.restore();
  }
  function glow(t) {
    g.globalCompositeOperation = 'lighter';
    const l = R.lantern, breathe = 0.5 + 0.5 * Math.sin(t * 0.62) * Math.sin(t * 0.23 + 1);
    blob(l.x + l.w / 2, l.y + l.h * 0.52, l.w * 1.4, '226,124,58', 0.05 + breathe * 0.07);
    for (const p of R.lamps) { const f = 0.82 + 0.18 * Math.sin(t * 7.1 + p.x) + 0.06 * (rnd(Math.floor(t * 14) + p.x) - 0.5); blob(p.x, p.y, p.r * 5, '255,238,196', 0.15 * f); blob(p.x, p.y, p.r * 1.6, '255,250,232', 0.2 * f); }
    const st = R.street; blob(st.x, st.y, st.r * 6, '255,236,190', 0.08 + 0.03 * Math.sin(t * 1.3));
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  }
  // the room's warmth drifting very slowly across the counter: near-static, so it
  // is redrawn into its own layer every 2 s and only copied each frame
  function warm(t) {
    const x = SRC.w * (0.35 + 0.15 * Math.sin(t * 0.05)), gr = wg.createRadialGradient(x * S, 380 * S, 0, x * S, 380 * S, 760 * S);
    gr.addColorStop(0, 'rgba(255,190,120,0.06)'); gr.addColorStop(1, 'rgba(255,190,120,0)');
    wg.clearRect(0, 0, wash.width, wash.height); wg.fillStyle = gr; wg.fillRect(0, 0, wash.width, wash.height);
  }
  function draw(t) {
    if (t - washAt > 2) { warm(t); washAt = t; }
    g.clearRect(0, 0, cv.width, cv.height);
    g.globalCompositeOperation = 'soft-light'; g.drawImage(wash, 0, 0); g.globalCompositeOperation = 'source-over';
    steam(t); rain(t); glow(t);
  }

  // A device that cannot afford it gets the still frame: if the room's own drawing
  // averages over 6 ms across 45 draws, it stops moving (rule 9 — a weak phone keeps
  // its frames for the game, not for steam).
  const t0 = performance.now(); let last = 0, spent = 0, draws = 0;
  const loop = now => {
    if (dead) return;
    if (!document.hidden && now - last >= 32) {
      last = now; const a = performance.now(); draw((now - t0) / 1000); spent += performance.now() - a;
      if (++draws === 45) { if (spent / draws > 6) { stage.dataset.motion = 'still'; draw(still); return; } draws = 0; spent = 0; }
    }
    frame = requestAnimationFrame(loop);
  };
  if (reduced) draw(still); else frame = requestAnimationFrame(loop);
  stop = () => { dead = true; cancelAnimationFrame(frame); observer.disconnect(); cv.remove(); };
}
