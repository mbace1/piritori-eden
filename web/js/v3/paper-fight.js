// Paper fights (Act I v4.72): the fight, in cut paper, over the place's plate.
//
// The same board, the same rules, the same location plates (places-v1.json,
// v4.71); only the drawing changes. Each fighter is a STAND-IN cut from card
// in code — the 2026-10-02 rule holds: neutral, procedural, seeded from the
// unit, no character art — built like Toko's rig (v4.70): flat pieces on
// hidden pivots, posed by paper-motion.js on the cut-paper rhythm.
//
// The look is the house treatment (AD1 "A, restrained"): a clean cut, a pale
// edge where the card's core shows on the lit side, faint grain, and a hard
// shadow where the card stands off the ground. No marker, no outline.
//
// What it reads from the battle: who stands where, who is down, who is
// shaken, and `battle.beats` — the strikes, hops, braces and marks the rules
// recorded, which it acts out one after another. The DOM tokens stay where
// they are and stay the tap targets; this canvas never takes a click.
//
// A fight re-renders the whole screen on every action, so the canvas is
// rebuilt each time; the timeline is module state and carries across.
import * as THREE from 'three';
import { buildStageCamera, worldFor, worldForLaneDepth } from './stage-camera.js?v=5';
import { parseSlotKey } from './grid.js?v=2';
import { schedule, figureAt, stepped, RHYTHM } from './paper-motion.js?v=1';

let current = null;
const timeline = { battle: null, played: 0, plan: [] };

const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

function hash(text) {
  let h = 2166136261 >>> 0;
  for (const ch of String(text)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}
const pick = (list, seed, shift = 0) => list[(seed >>> shift) % list.length];
const hex = n => `#${n.toString(16).padStart(6, '0')}`;
// The stand-in palette (fight-module/stand-in.js), so a paper fighter and a
// 3D one are the same person in two materials.
const TROUSERS = [0x222e35, 0x303337, 0x313a36, 0x3b3435, 0x26323a];
const SKIN = [0xc8aa8a, 0xb88e6d, 0xd0b397, 0x9b7057, 0x795744];
const SOLES = [0x8f958b, 0xd0cec4, 0x626a6d, 0x9a8d7c];
const ACCENTS = [0x263037, 0x4a4339, 0x303936, 0x3d3034];
const COAT = { player: 0x458c81, enemy: 0xb86343, police: 0x2f4a6b };
const RING = { selected: '#46c7d5', intent: '#d65445', police: '#4a7fd6', player: 'rgba(143,197,174,.75)', enemy: 'rgba(227,161,138,.7)' };
const PAPER_CORE = [244, 234, 216];

/** One fighter's look, from the unit alone: the same unit is the same figure. */
export function lookOf(unit) {
  const seed = Number.isInteger(unit.appearanceSeed) ? unit.appearanceSeed >>> 0 : hash(unit.id);
  return {
    seed,
    coat: hex(unit.color ?? COAT[unit.side] ?? COAT.enemy),
    trousers: hex(pick(TROUSERS, seed, 2)),
    skin: hex(pick(SKIN, seed, 7)),
    sole: hex(pick(SOLES, seed, 13)),
    accent: hex(pick(ACCENTS, seed, 18)),
    broad: unit.role === 'muscle',
    longCoat: ((seed >>> 12) % 3) === 0,
    beanie: ((seed >>> 15) % 4) === 0,
    bag: ((seed >>> 17) % 3) === 0,
    scarf: ((seed >>> 19) % 5) === 0,
    weapon: unit.equipment ?? null,
    phase: (seed % 628) / 100,
  };
}

function lighter(color, k) {
  const n = parseInt(color.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v, i) => Math.round(v + (PAPER_CORE[i] - v) * k));
  return `rgb(${c.join(',')})`;
}

let grain = null;
function grainPattern(ctx) {
  if (grain) return ctx.createPattern(grain, 'repeat');
  if (typeof document === 'undefined') return null;
  grain = document.createElement('canvas');
  grain.width = grain.height = 64;
  const g = grain.getContext('2d');
  let s = 1234567;
  for (let i = 0; i < 900; i += 1) {
    s = (Math.imul(s, 1103515245) + 12345) >>> 0;
    const x = s % 64; s = (Math.imul(s, 1103515245) + 12345) >>> 0;
    const y = s % 64;
    g.fillStyle = (s & 1) ? 'rgba(255,248,232,.55)' : 'rgba(20,14,8,.5)';
    g.fillRect(x, y, 1, 1);
  }
  return ctx.createPattern(grain, 'repeat');
}

const RAD = Math.PI / 180;

/**
 * A piece of card: a path in the current transform, filled with the cut
 * edge showing on the lit (upper-left) side and grain over it. In the shadow
 * pass it is only the silhouette.
 */
function piece(ctx, build, color, pass, unit) {
  ctx.beginPath(); build(ctx);
  if (pass === 'shadow') { ctx.fill(); return; }
  // The cut edge: the card's paler core, about a pixel, on the lit side.
  ctx.save();
  ctx.translate(-1.1 * (unit.px ?? 0.01), -1.3 * (unit.px ?? 0.01));
  ctx.fillStyle = lighter(color, 0.42);
  ctx.beginPath(); build(ctx); ctx.fill();
  ctx.restore();
  ctx.fillStyle = color;
  ctx.beginPath(); build(ctx); ctx.fill();
  if (unit.grain && unit.box) {
    // Grain in SCREEN pixels: the clip is fixed when it is set, so the
    // transform can be reset under it and the pattern stays one dot a pixel.
    ctx.save();
    ctx.clip();
    ctx.setTransform(unit.dpr, 0, 0, unit.dpr, 0, 0);
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = unit.grain;
    ctx.fillRect(unit.box.x, unit.box.y, unit.box.w, unit.box.h);
    ctx.restore();
  }
}

const quad = (x0, y0, x1, y1, w0, w1) => c => {
  c.moveTo(x0 - w0 / 2, y0); c.lineTo(x0 + w0 / 2, y0);
  c.lineTo(x1 + w1 / 2, y1); c.lineTo(x1 - w1 / 2, y1); c.closePath();
};

const HIP = -0.46, SHOULDER = -0.78, NECK = -0.8;

/** A limb hanging from a pivot: `angle` degrees forward from straight down. */
function limb(ctx, at, angle, draw) {
  ctx.save(); ctx.translate(at[0], at[1]); ctx.rotate(-angle * RAD); draw(); ctx.restore();
}

function drawWeapon(ctx, look, pass, unit) {
  const w = String(look.weapon ?? '');
  const metal = '#3a4044', wood = '#7a6248', blade = '#aab4b8';
  if (!w || w === 'unarmed') return;
  if (w === 'feature-phone') { piece(ctx, c => c.rect(-0.018, 0.0, 0.036, 0.055), '#2b3033', pass, unit); return; }
  if (w.includes('handgun')) {
    piece(ctx, c => { c.rect(-0.016, 0.0, 0.032, 0.11); c.rect(-0.016, 0.0, 0.05, 0.03); }, metal, pass, unit);
    return;
  }
  if (w === 'folding-knife') { piece(ctx, c => { c.moveTo(-0.012, 0.0); c.lineTo(0.012, 0.0); c.lineTo(0.0, 0.1); c.closePath(); }, blade, pass, unit); return; }
  // Bats, pipes, batons, irons, chains: a rod held nearly along the forearm,
  // a little forward of it — hanging at rest, over the shoulder on the
  // wind-up, driven forward on the release.
  const length = w === 'baseball-bat' ? 0.34 : w === 'baton' ? 0.24 : 0.3;
  ctx.save(); ctx.rotate(-25 * RAD);
  piece(ctx, quad(0, 0, 0, length, 0.022, w === 'baseball-bat' ? 0.042 : 0.024), w === 'baseball-bat' ? wood : metal, pass, unit);
  ctx.restore();
}

function drawArm(ctx, look, shoulder, sh, el, front, pass, unit) {
  limb(ctx, shoulder, sh, () => {
    piece(ctx, quad(0, 0, 0, 0.17, 0.074, 0.064), look.coat, pass, unit);
    limb(ctx, [0, 0.16], el, () => {
      piece(ctx, quad(0, 0, 0, 0.15, 0.064, 0.056), look.coat, pass, unit);
      piece(ctx, c => c.arc(0, 0.165, 0.034, 0, Math.PI * 2), look.skin, pass, unit);
      if (front) { ctx.save(); ctx.translate(0, 0.165); drawWeapon(ctx, look, pass, unit); ctx.restore(); }
    });
  });
}

function drawLeg(ctx, look, x, angle, pass, unit) {
  limb(ctx, [x, HIP], angle, () => {
    piece(ctx, quad(0, 0, 0, 0.44, 0.104, 0.08), look.trousers, pass, unit);
    piece(ctx, c => { c.moveTo(-0.045, 0.425); c.lineTo(0.07, 0.425); c.lineTo(0.082, 0.46); c.lineTo(-0.045, 0.46); c.closePath(); }, look.sole, pass, unit);
  });
}

/**
 * One fighter, feet at the current origin, one unit = the figure's height,
 * facing +x. `pass` is 'shadow' (silhouette only) or 'paper'.
 */
export function drawFigure(ctx, look, p, pass, unit = {}) {
  const width = look.broad ? 1.14 : 0.94;
  // Back limbs first, then the body, then the front limbs over it.
  drawArm(ctx, look, [-0.06, SHOULDER + 0.03], p.bsh, p.bel, false, pass, unit);
  drawLeg(ctx, look, -0.03, p.bleg, pass, unit);
  ctx.save();
  ctx.translate(0, HIP); ctx.rotate(p.torso * RAD); ctx.translate(0, -HIP);
  ctx.save(); ctx.scale(width, 1);
  const hem = look.longCoat ? -0.24 : HIP + 0.03;
  piece(ctx, c => {
    c.moveTo(-0.11, hem); c.lineTo(0.11, hem);
    c.lineTo(0.118, SHOULDER + 0.035); c.quadraticCurveTo(0.118, SHOULDER - 0.012, 0.07, SHOULDER - 0.02);
    c.lineTo(-0.07, SHOULDER - 0.02); c.quadraticCurveTo(-0.12, SHOULDER - 0.012, -0.12, SHOULDER + 0.035); c.closePath();
  }, look.coat, pass, unit);
  if (look.bag) piece(ctx, c => c.rect(-0.13, HIP - 0.07, 0.07, 0.08), look.accent, pass, unit);
  if (look.scarf) piece(ctx, c => c.rect(-0.07, SHOULDER - 0.02, 0.14, 0.035), look.accent, pass, unit);
  ctx.restore();
  // Head on the neck: an oval, a nose toward the way it faces, hair or a beanie.
  ctx.save();
  ctx.translate(0, NECK); ctx.rotate(p.head * RAD);
  piece(ctx, c => { c.ellipse(0.004, -0.085, 0.07, 0.083, 0, 0, Math.PI * 2); c.moveTo(0.06, -0.1); c.lineTo(0.09, -0.07); c.lineTo(0.06, -0.055); }, look.skin, pass, unit);
  if (look.beanie) piece(ctx, c => { c.ellipse(0, -0.13, 0.076, 0.05, 0, Math.PI, 0); c.rect(-0.076, -0.136, 0.152, 0.026); }, look.accent, pass, unit);
  else piece(ctx, c => { c.ellipse(-0.012, -0.125, 0.07, 0.048, -0.2, Math.PI, Math.PI * 2.05); }, '#1d1a18', pass, unit);
  ctx.restore();
  ctx.restore();
  drawLeg(ctx, look, 0.03, p.fleg, pass, unit);
  ctx.save(); ctx.translate(0, HIP); ctx.rotate(p.torso * RAD); ctx.translate(0, -HIP);
  drawArm(ctx, look, [0.065, SHOULDER + 0.03], p.fsh, p.fel, true, pass, unit);
  ctx.restore();
}

/** Place a figure: feet at (x, y) px, height h px, facing ±1, posed `p`. */
function placeFigure(ctx, look, p, x, y, h, facing, pass, unit) {
  ctx.save();
  ctx.translate(x + p.dx * h * facing, y + p.dy * h);
  // Topple: backwards, about the feet, away from the way it faces.
  if (p.down) ctx.rotate(-facing * (Math.PI / 2) * p.down);
  ctx.scale(h * facing, h);
  ctx.rotate(p.lean * RAD);
  ctx.transform(1, 0, -p.shear, 1, 0, 0);
  ctx.scale(2 - p.squash, p.squash);
  drawFigure(ctx, look, p, pass, unit);
  ctx.restore();
}

/** A cover marker: a kraft card lying flat on its cell (STAGE_SPEC 4.5: a
 *  marker that is obviously a marker, never snapped to the plate's props).
 *  Flat on the ground, so it never stands in front of who is standing on it. */
function drawCover(ctx, corners) {
  const inset = corners.map((c, i, all) => {
    const cx = all.reduce((s, p) => s + p.x, 0) / 4, cy = all.reduce((s, p) => s + p.y, 0) / 4;
    return { x: cx + (c.x - cx) * 0.78, y: cy + (c.y - cy) * 0.78 };
  });
  const path = (dx, dy) => { ctx.beginPath(); inset.forEach((p, i) => (i ? ctx.lineTo : ctx.moveTo).call(ctx, p.x + dx, p.y + dy)); ctx.closePath(); };
  ctx.fillStyle = 'rgba(6,10,16,.32)'; path(2, 2); ctx.fill();
  ctx.fillStyle = lighter('#86643a', 0.4); path(-1, -1); ctx.fill();
  ctx.fillStyle = 'rgba(134,100,58,.92)'; path(0, 0); ctx.fill();
}

export function disposePaperFight() {
  if (!current) return;
  cancelAnimationFrame(current.raf);
  current.resize?.disconnect();
  current.canvas.remove();
  current = null;
}

/** Bring the timeline up to the battle: a battle seen for the first time
 *  starts from where it is (a reload never replays old blows). */
function syncTimeline(battle, now, reduced) {
  if (timeline.battle !== battle) {
    timeline.battle = battle;
    timeline.played = battle.beatSeq ?? 0;
    timeline.plan = [];
  }
  const seq = battle.beatSeq ?? 0;
  if (seq > timeline.played) {
    const from = Math.max(now, timeline.plan.at(-1)?.end ?? 0);
    timeline.plan.push(...schedule(battle.beats, timeline.played, from, { reduced }));
    timeline.played = seq;
  }
  timeline.plan = timeline.plan.filter(p => p.end > now - 0.05);
}

/** Is anything still being acted out? (Tests wait on this.) */
export function paperBusy(now = performance.now() / 1000) {
  return timeline.plan.some(p => p.end > now);
}

export function mountPaperFight(container, battle) {
  disposePaperFight();
  if (!container || !battle) return;
  const stage = container.closest('.battle-stage');
  const canvas = document.createElement('canvas');
  canvas.className = 'paper-fight';
  // Styled here rather than in v3.css: the canvas is this module's alone.
  canvas.style.cssText = 'position:absolute;left:0;top:0;display:block;pointer-events:none';
  canvas.setAttribute('aria-hidden', 'true');
  container.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  current = { canvas, raf: 0, resize: null };
  const reduced = reducedMotion();
  const units = [...battle.players, ...battle.enemies, ...(battle.police ?? [])];
  const looks = new Map(units.map(u => [u.id, lookOf(u)]));
  let geometry = null;
  let lastStep = -1;

  function measure() {
    const width = Math.max(1, container.clientWidth || 600);
    const height = Math.max(1, container.clientHeight || 360);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`; canvas.style.height = `${height}px`;
    const camera = buildStageCamera(width / height);
    const project = (x, z) => {
      const ndc = new THREE.Vector3(x, 0, z).project(camera);
      return { x: ((ndc.x + 1) / 2) * width, y: ((1 - ndc.y) / 2) * height };
    };
    const a = worldForLaneDepth(0, 0), b = worldForLaneDepth(1, 0);
    const cellW = Math.hypot(project(b.x, b.z).x - project(a.x, a.z).x, project(b.x, b.z).y - project(a.x, a.z).y);
    geometry = { width, height, dpr, project, cellW, figure: cellW * 1.55 };
    lastStep = -1;
  }

  function at(cell) { const { x, z } = worldFor(cell); return geometry.project(x, z); }

  function draw(now) {
    if (!geometry) measure();
    syncTimeline(battle, now, reduced);
    const t = stepped(now);
    // Poses step at RHYTHM a second; between steps there is nothing to draw.
    if (Math.round(t * RHYTHM) === lastStep) return;
    lastStep = Math.round(t * RHYTHM);
    const { width, height, dpr, cellW, figure: h } = geometry;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    const pattern = grainPattern(ctx);
    const cover = battle.cover instanceof Map ? [...battle.cover.keys()] : Object.keys(battle.cover ?? {});
    const items = [];
    // Cover lies on the ground: drawn before anyone standing, whatever the depth.
    for (const cell of cover) {
      const { lane, depth } = parseSlotKey(cell);
      const corners = [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]].map(([dl, dd]) => { const w = worldForLaneDepth(lane + dl, depth + dd); return geometry.project(w.x, w.z); });
      items.push({ y: -Infinity, draw: () => drawCover(ctx, corners) });
    }
    // Where everyone is drawn this frame, first, so a figure can turn to
    // whoever its beat is about, or else to the nearest standing opponent.
    const frames = units.map(unit => {
      const look = looks.get(unit.id);
      const f = figureAt(unit, t, timeline.plan, { phase: look.phase, reduced });
      let p = at(f.cell);
      if (f.from && f.to) { const a = at(f.from), b = at(f.to); p = { x: a.x + (b.x - a.x) * f.k, y: a.y + (b.y - a.y) * f.k }; }
      return { unit, look, f, p };
    });
    const byId = new Map(frames.map(fr => [fr.unit.id, fr]));
    const opponents = unit => frames.filter(o => o.f.standing && (unit.side === 'enemy' ? o.unit.side === 'player' : o.unit.side === 'enemy'));
    for (const { unit, look, f, p } of frames) {
      const toward = byId.get(f.face)?.p
        ?? opponents(unit).sort((a, b) => Math.hypot(a.p.x - p.x, a.p.y - p.y) - Math.hypot(b.p.x - p.x, b.p.y - p.y))[0]?.p;
      const facing = toward ? (toward.x >= p.x ? 1 : -1) : (unit.side === 'player' ? 1 : -1);
      const token = stage?.querySelector(`.unit-token[data-unit="${CSS.escape(unit.id)}"]`);
      const ring = !f.standing ? null
        : token?.classList.contains('selected') ? RING.selected
          : token?.classList.contains('intent') ? RING.intent
            : unit.side === 'police' ? RING.police : RING[unit.side] ?? RING.enemy;
      items.push({ y: p.y, draw: () => {
        // Ground: a contact shadow, then the side's ring, then the card.
        ctx.fillStyle = 'rgba(5,9,14,.38)';
        ctx.beginPath(); ctx.ellipse(p.x, p.y, h * 0.24, h * 0.07, 0, 0, Math.PI * 2); ctx.fill();
        if (ring) {
          ctx.strokeStyle = ring; ctx.lineWidth = ring === RING.selected || ring === RING.intent ? 2.5 : 1.5;
          ctx.beginPath(); ctx.ellipse(p.x, p.y, h * 0.27, h * 0.085, 0, 0, Math.PI * 2); ctx.stroke();
        }
        const unitCtx = { grain: pattern, dpr, px: 1 / h, box: { x: p.x - h, y: p.y - h * 1.3, w: h * 2, h: h * 1.5 } };
        ctx.fillStyle = 'rgba(6,10,16,.42)';
        placeFigure(ctx, look, f.pose, p.x + h * 0.022, p.y + h * 0.008, h, facing, 'shadow', unitCtx);
        placeFigure(ctx, look, f.pose, p.x, p.y, h, facing, 'paper', unitCtx);
      } });
    }
    items.sort((a, b) => a.y - b.y).forEach(item => item.draw());
    canvas.dataset.figures = String(units.length);
    canvas.dataset.busy = paperBusy(now) ? '1' : '0';
  }

  function tick() {
    if (!current || current.canvas !== canvas) return;
    draw(performance.now() / 1000);
    current.raf = requestAnimationFrame(tick);
  }
  measure();
  if (typeof ResizeObserver === 'function') {
    current.resize = new ResizeObserver(() => { measure(); });
    current.resize.observe(container);
  }
  tick();
}
