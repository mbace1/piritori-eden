// The Mini Metro half: the night map of Kallio as a transit diagram.
// Fat 45°-bend lines, white station discs, one pulse where Aatami stands.
// Draws on a DPR-aware canvas; hit tests come back in station ids.

import { STATIONS, LINES } from './data.js?v=1';
import { PAL } from './palette.js?v=1';

const GRID_W = 160, GRID_H = 100;

export class MetroMap {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.t = 0;
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.resize();
  }

  resize() {
    const r = this.canvas.getBoundingClientRect();
    const dpr = Math.min(2, devicePixelRatio || 1);
    this.canvas.width = Math.round(r.width * dpr);
    this.canvas.height = Math.round(r.height * dpr);
    this.dpr = dpr;
    // fit the design grid, centred, with a margin for labels
    const m = 14 * dpr;
    this.scale = Math.min((this.canvas.width - m * 2) / GRID_W, (this.canvas.height - m * 2) / GRID_H);
    this.ox = (this.canvas.width - GRID_W * this.scale) / 2;
    this.oy = (this.canvas.height - GRID_H * this.scale) / 2;
  }

  gx(x) { return this.ox + x * this.scale; }
  gy(y) { return this.oy + y * this.scale; }

  // css-pixel click point → station id, 24px forgiveness
  hit(cx, cy) {
    const x = cx * this.dpr, y = cy * this.dpr;
    let best = null, bestD = 24 * this.dpr;
    for (const s of STATIONS) {
      const d = Math.hypot(this.gx(s.x) - x, this.gy(s.y) - y);
      if (d < bestD) { best = s.id; bestD = d; }
    }
    return best;
  }

  draw(run, dt = 0.016) {
    this.t += dt;
    const { ctx } = this, sc = this.scale;
    ctx.fillStyle = PAL.VOID;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // the lines, fat and round-capped
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const line of LINES) {
      ctx.strokeStyle = PAL[line.color];
      ctx.globalAlpha = line.id === 'metro' ? 0.95 : 0.55;
      ctx.lineWidth = (line.id === 'metro' ? 3.2 : 2.2) * sc * 0.55;
      ctx.beginPath();
      line.pts.forEach(([x, y], i) => i ? ctx.lineTo(this.gx(x), this.gy(y)) : ctx.moveTo(this.gx(x), this.gy(y)));
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // stations
    for (const s of STATIONS) {
      const x = this.gx(s.x), y = this.gy(s.y), r = 3.4 * sc * 0.55;
      const here = run && run.at === s.id;
      if (here && !this.reduced) {
        const k = (Math.sin(this.t * 3) + 1) / 2;
        ctx.strokeStyle = PAL.METRO; ctx.globalAlpha = 0.5 - k * 0.35;
        ctx.lineWidth = 2 * this.dpr;
        ctx.beginPath(); ctx.arc(x, y, r + (3 + k * 5) * this.dpr, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = here ? PAL.METRO : PAL.VOID;
      ctx.strokeStyle = here ? PAL.METRO : PAL.BONE;
      ctx.lineWidth = 2.2 * this.dpr;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      this.icon(s, x, y, r, here);
      // label
      ctx.fillStyle = here ? PAL.INK : PAL.DIM;
      ctx.font = `${Math.max(10, 5.2 * sc * 0.55) | 0}px ui-monospace, Menlo, Consolas, monospace`;
      ctx.textAlign = 'center';
      const above = s.y > 50;
      ctx.fillText(s.name, x, above ? y - r - 6 * this.dpr : y + r + 13 * this.dpr);
    }
  }

  // tiny glyphs that say what a station IS before you read it
  icon(s, x, y, r, here) {
    const { ctx } = this, d = this.dpr;
    ctx.strokeStyle = here ? PAL.VOID : PAL.DIM;
    ctx.fillStyle = here ? PAL.VOID : PAL.DIM;
    ctx.lineWidth = 1.4 * d;
    switch (s.icon) {
      case 'spire': { // the church tower
        ctx.beginPath();
        ctx.moveTo(x, y - r * 0.7); ctx.lineTo(x - r * 0.45, y + r * 0.55);
        ctx.lineTo(x + r * 0.45, y + r * 0.55); ctx.closePath(); ctx.stroke();
        break;
      }
      case 'bowl': { // ramen
        ctx.beginPath(); ctx.arc(x, y - r * 0.1, r * 0.55, 0, Math.PI); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x - r * 0.55, y - r * 0.15); ctx.lineTo(x + r * 0.55, y - r * 0.15); ctx.stroke();
        break;
      }
      case 'pint': { // the McCormick bar
        ctx.strokeRect(x - r * 0.32, y - r * 0.55, r * 0.64, r * 1.05);
        break;
      }
      case 'metro': { // the M
        ctx.font = `bold ${Math.max(8, r * 1.1) | 0}px ui-monospace, Menlo, monospace`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('M', x, y + d); ctx.textBaseline = 'alphabetic';
        break;
      }
      case 'square': { // the square itself
        ctx.strokeRect(x - r * 0.45, y - r * 0.45, r * 0.9, r * 0.9);
        break;
      }
    }
  }
}
