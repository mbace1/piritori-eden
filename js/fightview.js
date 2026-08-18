// The isometric fight board.
//
// Draws the two 3×N grids facing each other and nothing else the model does not
// know about. The grid is INVISIBLE in play, per the brief — cells read as
// ground shadow, and the only reason a player can see the shape of a formation
// is that bodies stand in it.
//
// One rule from the brief does real work here: when a weapon is chosen, every
// cell that weapon cannot reach goes dim and every legal target is ringed. That
// is how cover is taught — you watch the back row stay un-ringed while a body
// stands in front of it, and nobody has to read a tooltip.

import { COLS, WEAPONS } from './fight.js?v=3';
import { PAL } from './palette.js?v=1';

const TW = 34, TH = 17;          // iso tile half-width / half-height

export class FightView {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.sel = null;             // { weapon } once a weapon is picked
    this.hot = null;             // unit id under the pointer
    this.resize();
  }

  resize() {
    const r = this.canvas.getBoundingClientRect();
    const dpr = Math.min(2, devicePixelRatio || 1);
    this.canvas.width = Math.max(1, Math.round(r.width * dpr));
    this.canvas.height = Math.max(1, Math.round(r.height * dpr));
    this.dpr = dpr;
  }

  // Board space → screen. `them` is mirrored across the middle so the two
  // sides face each other with their front rows adjacent.
  cell(side, col, row, rows) {
    const dpr = this.dpr;
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;
    // rows run away from the middle on each side
    const r = side === 'you' ? row + 1 : -(row + 1);
    const c = col - (COLS - 1) / 2;
    return {
      x: cx + (c - r) * TW * dpr * 0.5 * 1.6,
      y: cy + (c + r) * TH * dpr * 0.5 * 1.6,
    };
  }

  hit(fight, px, py) {
    const x = px * this.dpr, y = py * this.dpr;
    let best = null, bd = 30 * this.dpr;
    for (const u of [...fight.units, ...fight.props]) {
      if (!u.alive) continue;
      const p = this.cell(u.side, u.col, u.row, fight.rows);
      const d = Math.hypot(p.x - x, (p.y - 16 * this.dpr) - y);
      if (d < bd) { best = u; bd = d; }
    }
    return best;
  }

  draw(fight) {
    const { ctx } = this;
    const W = this.canvas.width, H = this.canvas.height, dpr = this.dpr;
    ctx.fillStyle = PAL.paper;
    ctx.fillRect(0, 0, W, H);

    const legal = this.sel
      ? new Set(fight.targets(fight.actor, this.sel).map(u => u.id))
      : null;

    // 1. the ground. Cells are shadow, never a drawn tile grid. The two sides
    //    are tinted apart so the halves read as two lines facing each other
    //    rather than one crowd.
    for (const side of ['them', 'you']) {
      for (let row = fight.rows - 1; row >= 0; row--) {
        for (let col = 0; col < COLS; col++) {
          const p = this.cell(side, col, row, fight.rows);
          ctx.beginPath();
          ctx.moveTo(p.x, p.y - TH * dpr);
          ctx.lineTo(p.x + TW * dpr, p.y);
          ctx.lineTo(p.x, p.y + TH * dpr);
          ctx.lineTo(p.x - TW * dpr, p.y);
          ctx.closePath();
          // the front rows sit brightest: that is where the reach is
          const k = 1 - row / Math.max(1, fight.rows);
          ctx.fillStyle = side === 'you'
            ? `rgba(90,110,130,${0.05 + k * 0.07})`
            : `rgba(150,80,70,${0.05 + k * 0.07})`;
          ctx.fill();
          ctx.strokeStyle = '#1b222b';
          ctx.lineWidth = 1 * dpr;
          ctx.stroke();
        }
      }
    }

    // the line between the two front rows — the only thing separating them
    ctx.strokeStyle = '#2a3542';
    ctx.lineWidth = 1.5 * dpr;
    ctx.setLineDash([5 * dpr, 5 * dpr]);
    const a = this.cell('you', -0.5, -0.5, fight.rows);
    const bq = this.cell('you', COLS - 0.5, -0.5, fight.rows);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(bq.x, bq.y); ctx.stroke();
    ctx.setLineDash([]);

    // 2. bodies AND cover, painted back to front so the front row overlaps the
    //    back — which is the cover rule, drawn. A prop is in this list rather
    //    than under it because a barrier standing in a lane is exactly as much
    //    "the thing in the way" as a man is.
    const order = [...fight.units, ...fight.props].filter(u => u.alive).sort((a, b) => {
      const pa = this.cell(a.side, a.col, a.row, fight.rows);
      const pb = this.cell(b.side, b.col, b.row, fight.rows);
      return pa.y - pb.y;
    });

    for (const u of order) {
      const p = this.cell(u.side, u.col, u.row, fight.rows);
      const mine = u.side === 'you';
      const isActor = fight.actor && fight.actor.id === u.id;
      const targetable = legal?.has(u.id);
      const dimmed = legal && !targetable && !mine;

      ctx.globalAlpha = dimmed ? 0.32 : 1;

      // the standing shadow
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, 15 * dpr, 7 * dpr, 0, 0, Math.PI * 2);
      ctx.fill();

      // cover: a low slab, drawn short so it never hides the body behind it.
      // Hard cover (concrete, stone) is drawn heavier than soft, because the
      // difference decides whether a bullet gets through.
      if (u.prop) {
        const ph = (u.hard ? 20 : 15) * dpr, pw = 30 * dpr;
        ctx.fillStyle = u.hard ? '#4b5560' : '#3d4650';
        ctx.strokeStyle = targetable ? PAL.warn : PAL.paper;
        ctx.lineWidth = 2 * dpr;
        ctx.beginPath();
        ctx.roundRect(p.x - pw / 2, p.y - ph, pw, ph, 2 * dpr);
        ctx.fill(); ctx.stroke();
        // how much of it is left, on the slab itself
        const k = Math.max(0, u.hp / u.maxHp);
        ctx.fillStyle = k > 0.5 ? '#7d8896' : PAL.warn;
        ctx.fillRect(p.x - pw / 2, p.y - ph, pw * k, 3 * dpr);
        ctx.globalAlpha = 1;
        continue;
      }

      // the body: a flat fill inside a hard line, silhouette doing the work
      const h = 40 * dpr, w = 15 * dpr;
      const col = mine ? PAL.ink : '#b4655a';
      ctx.fillStyle = col;
      ctx.strokeStyle = PAL.paper;
      ctx.lineWidth = 2 * dpr;
      ctx.beginPath();
      ctx.roundRect(p.x - w / 2, p.y - h, w, h - 3 * dpr, 3 * dpr);
      ctx.fill(); ctx.stroke();
      ctx.beginPath();
      ctx.arc(p.x, p.y - h - 5 * dpr, 7 * dpr, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();

      if (u.bracing) {
        ctx.strokeStyle = PAL.draft; ctx.lineWidth = 2 * dpr;
        ctx.beginPath(); ctx.arc(p.x, p.y - h / 2, 17 * dpr, -0.6, 0.6); ctx.stroke();
      }

      // TWO bars, because there are two ways to take somebody out of a fight.
      // Harm on top, nerve under it — a unit whose lower bar is nearly gone is
      // one good fright from walking, and that is readable at a glance.
      const bw = 26 * dpr;
      ctx.fillStyle = '#2a3038';
      ctx.fillRect(p.x - bw / 2, p.y - h - 20 * dpr, bw, 3 * dpr);
      ctx.fillStyle = u.hp / u.maxHp > 0.5 ? PAL.mark : PAL.warn;
      ctx.fillRect(p.x - bw / 2, p.y - h - 20 * dpr, bw * Math.max(0, u.hp / u.maxHp), 3 * dpr);
      ctx.fillStyle = '#2a3038';
      ctx.fillRect(p.x - bw / 2, p.y - h - 15 * dpr, bw, 2 * dpr);
      ctx.fillStyle = PAL.draft;
      ctx.fillRect(p.x - bw / 2, p.y - h - 15 * dpr, bw * Math.max(0, u.nerve / u.maxNerve), 2 * dpr);

      if (isActor) {
        ctx.strokeStyle = PAL.gold; ctx.lineWidth = 2 * dpr;
        ctx.beginPath(); ctx.ellipse(p.x, p.y, 19 * dpr, 9 * dpr, 0, 0, Math.PI * 2); ctx.stroke();
      }
      if (targetable) {
        ctx.strokeStyle = PAL.warn; ctx.lineWidth = 2.5 * dpr;
        ctx.beginPath(); ctx.ellipse(p.x, p.y, 21 * dpr, 10 * dpr, 0, 0, Math.PI * 2); ctx.stroke();
      }

      // A name on every body turned the board into a wall of overlapping text.
      // Only the ones that matter right now are labelled: your own side, the
      // unit acting, and anything currently ringed as a target.
      if (mine || isActor || targetable) {
        ctx.fillStyle = isActor ? PAL.gold : PAL.dim;
        ctx.font = `${10 * dpr}px ${PAL.font}`;
        ctx.textAlign = 'center';
        const label = u.name.length > 12 ? u.name.slice(0, 11) + '…' : u.name;
        ctx.fillText(label, p.x, p.y + 15 * dpr);
      }
      ctx.globalAlpha = 1;
    }

    // 3. which half is whose, said once
    ctx.font = `${9 * dpr}px ${PAL.font}`;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#4a5866';
    ctx.fillText('THEM', 6 * dpr, 14 * dpr);
    ctx.fillStyle = '#5a6d80';
    ctx.fillText('YOU', 6 * dpr, H - 8 * dpr);
  }

  // Which weapon is armed, or null. Setting it re-dims the board.
  arm(weaponId) { this.sel = weaponId && WEAPONS[weaponId] ? weaponId : null; }
}
