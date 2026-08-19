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

import { COLS, ROW_NAME, WEAPONS, ITEMS, arenaFor } from './fight.js?v=4';
import { PAL } from './palette.js?v=1';
import { image } from '../../assets/load.js?v=1';

const TW = 34, TH = 17;          // iso tile half-width / half-height

// ── the sprites ─────────────────────────────────────────────────────────
// These are SHIPPED art, not pipeline output: generated once, keyed off the
// magenta and trimmed to their own ink (`cut.mjs key` then `trim`), and
// committed under piritori/art/. That is the difference between assets/out/
// — which is a build directory a fresh checkout may not have — and a sprite
// the game draws. Loaded once and shared by every fight; a miss is silent and
// draw() falls back to the shapes it has always drawn.
const ART = new Map();
// …and a repaint when one lands, or the first frame of a fight keeps whatever
// it fell back to until something else happens to redraw the board — which,
// between two turns of a turn-based game, is nothing at all.
let onSpriteLoad = null;
function sprite(path) {
  if (ART.has(path)) return ART.get(path) || null;
  ART.set(path, null);
  const img = new Image();
  img.onload = () => { ART.set(path, img); onSpriteLoad?.(); };
  img.src = `art/${path}.png?v=1`;
  return null;
}
const propArt = kind => sprite(`props/${kind}`);

// A unit's picture is its SIDE and its STATE, and nothing else. Facing is a
// property of the side rather than of the pose — your men stand up the board
// and theirs stand down it, so there is no arrangement in which the board
// shows a man of yours facing the camera. Generating both facings for both
// sides would have doubled the sheet to draw four images it can never use.
const figArt = u => sprite(`fig/${u.side === 'you' ? 'you' : 'them'}-${u.downed ? 'down' : 'stand'}`);

export class FightView {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.sel = null;             // { weapon } once a weapon is picked
    this.hot = null;             // unit id under the pointer
    this.arena = null;           // the generated backdrop, once it lands
    this.arenaId = null;
    this.last = null;            // the fight it drew, so a late sprite can land
    onSpriteLoad = () => { if (this.last) this.draw(this.last); };
    this.resize();
  }

  // The backdrop for whichever ground this fight is on. Asynchronous and
  // ALLOWED TO FAIL: assets/load.js returns null when nothing has been
  // generated, and draw() then paints the flat paper it always painted. A
  // cabinet must never depend on a PNG — the arena is additive, and the game
  // is playable on a fresh checkout with assets/out/ empty.
  useArena(kind) {
    const id = `piritori/arena-${arenaFor(kind)}`;
    if (id === this.arenaId) return;
    this.arenaId = id;
    this.arena = null;
    image(id).then(img => { if (this.arenaId === id) this.arena = img; });
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
    // The board sits BELOW the middle of the panel, because every arena puts
    // its buildings in the upper half and its open ground in the lower — a
    // formation centred on the canvas stands on the roofs. Kept as one number
    // rather than per-arena: the framing block in the manifest is quoted
    // identically into all four prompts precisely so this can be.
    const cy = this.canvas.height * (this.arena ? 0.60 : 0.5);
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
    this.last = fight;
    const { ctx } = this;
    const W = this.canvas.width, H = this.canvas.height, dpr = this.dpr;
    ctx.fillStyle = PAL.paper;
    ctx.fillRect(0, 0, W, H);

    // 0. the ground this is happening on. Drawn COVER rather than stretched —
    //    the arenas are 16:9 and the panel is not, and squashing a painting to
    //    fit is worse than losing an edge of it. Darkened, because everything
    //    above has to read against it and the fight is the subject.
    if (this.arena) {
      const s = Math.max(W / this.arena.width, H / this.arena.height);
      const w = this.arena.width * s, h = this.arena.height * s;
      ctx.drawImage(this.arena, (W - w) / 2, (H - h) / 2, w, h);
      ctx.fillStyle = 'rgba(9,12,16,0.45)';
      ctx.fillRect(0, 0, W, H);
    }

    const legal = this.sel ? new Set(this.reach(fight).map(u => u.id)) : null;

    // 1. the ground. Cells are shadow, never a drawn tile grid. The two sides
    //    are tinted apart so the halves read as two lines facing each other
    //    rather than one crowd.
    // Per the final targets: an EMPTY cell is barely there, and an OCCUPIED
    // one carries a bright diamond in its side's colour. That is what makes a
    // formation read as a formation rather than as bodies on a picture, and it
    // is the one thing in the mockups that costs nothing to build.
    for (const side of ['them', 'you']) {
      const mine = side === 'you';
      for (let row = fight.rows - 1; row >= 0; row--) {
        for (let col = 0; col < COLS; col++) {
          const p = this.cell(side, col, row, fight.rows);
          const held = fight.at(side, col, row);
          ctx.beginPath();
          ctx.moveTo(p.x, p.y - TH * dpr);
          ctx.lineTo(p.x + TW * dpr, p.y);
          ctx.lineTo(p.x, p.y + TH * dpr);
          ctx.lineTo(p.x - TW * dpr, p.y);
          ctx.closePath();
          if (held) {
            ctx.fillStyle = mine ? 'rgba(87,200,232,0.10)' : 'rgba(200,70,60,0.12)';
            ctx.fill();
            ctx.strokeStyle = mine ? 'rgba(87,200,232,0.85)' : 'rgba(214,84,72,0.85)';
            ctx.lineWidth = 1.6 * dpr;
          } else {
            ctx.strokeStyle = this.arena
              ? (mine ? 'rgba(87,200,232,0.16)' : 'rgba(214,84,72,0.16)')
              : '#1b222b';
            ctx.lineWidth = 1 * dpr;
          }
          ctx.stroke();
        }
      }
    }

    // BACK / MIDDLE / FRONT down both edges, yours cyan and theirs red —
    // straight off the targets, and it is the rank system finally saying its
    // own name on screen instead of only in the button labels.
    ctx.font = `${8 * dpr}px ${PAL.font}`;
    ctx.textBaseline = 'middle';
    for (const side of ['you', 'them']) {
      const mine = side === 'you';
      ctx.fillStyle = mine ? 'rgba(87,200,232,0.75)' : 'rgba(214,84,72,0.75)';
      ctx.textAlign = mine ? 'left' : 'right';
      for (let row = 0; row < fight.rows; row++) {
        const p = this.cell(side, mine ? 0 : COLS - 1, row, fight.rows);
        const x = mine ? 4 * dpr : W - 4 * dpr;
        ctx.fillText(ROW_NAME[row].toUpperCase(), x, p.y);
      }
    }
    ctx.textBaseline = 'alphabetic';

    // the line between the two front rows — the only thing separating them
    ctx.strokeStyle = '#2a3542';
    ctx.lineWidth = 1.5 * dpr;
    ctx.setLineDash([5 * dpr, 5 * dpr]);
    const a = this.cell('you', -0.5, -0.5, fight.rows);
    const bq = this.cell('you', COLS - 0.5, -0.5, fight.rows);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(bq.x, bq.y); ctx.stroke();
    ctx.setLineDash([]);

    // The dashed red line of intent, from the mockups. Drawn UNDER the bodies
    // so it reads as on the ground, and only while a weapon is armed — a board
    // permanently strung with red string is noise, not information.
    if (this.sel && legal?.size && fight.actor) {
      const a = this.cell(fight.actor.side, fight.actor.col, fight.actor.row, fight.rows);
      ctx.strokeStyle = 'rgba(214,84,72,0.8)';
      ctx.lineWidth = 1.4 * dpr;
      ctx.setLineDash([5 * dpr, 4 * dpr]);
      for (const t of this.reach(fight)) {
        const b = this.cell(t.side, t.col, t.row, fight.rows);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y - 6 * dpr);
        ctx.lineTo(b.x, b.y - 6 * dpr);
        ctx.stroke();
        // an arrowhead, so the line has a direction and not just two ends
        const ang = Math.atan2(b.y - a.y, b.x - a.x);
        ctx.beginPath();
        ctx.moveTo(b.x, b.y - 6 * dpr);
        ctx.lineTo(b.x - Math.cos(ang - 0.4) * 8 * dpr, b.y - 6 * dpr - Math.sin(ang - 0.4) * 8 * dpr);
        ctx.moveTo(b.x, b.y - 6 * dpr);
        ctx.lineTo(b.x - Math.cos(ang + 0.4) * 8 * dpr, b.y - 6 * dpr - Math.sin(ang + 0.4) * 8 * dpr);
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }

    // 2. bodies AND cover, painted back to front so the front row overlaps the
    //    back — which is the cover rule, drawn. A prop is in this list rather
    //    than under it because a barrier standing in a lane is exactly as much
    //    "the thing in the way" as a man is.
    // A man who has been put down is still ON THE FLOOR. He used to vanish the
    // instant his health hit zero, which was defensible while a body was a
    // rounded rectangle and is not now: there is a pose for it, and a fight you
    // are winning should look like one. He is drawn first (he is lying under
    // everybody), dimmed, with no bars, no rings and no name — he is scenery
    // from the moment he goes down, and the model still does not list him.
    const down = fight.units.filter(u => !u.alive && u.downed && !u.fled);
    const order = [...fight.units, ...fight.props].filter(u => u.alive).sort((a, b) => {
      const pa = this.cell(a.side, a.col, a.row, fight.rows);
      const pb = this.cell(b.side, b.col, b.row, fight.rows);
      return pa.y - pb.y;
    });
    for (const u of down) {
      const art = figArt(u);
      if (!art) continue;
      const p = this.cell(u.side, u.col, u.row, fight.rows);
      const fh = 22 * dpr, fw = art.width * (fh / art.height);
      ctx.globalAlpha = 0.7;
      ctx.drawImage(art, p.x - fw / 2, p.y - fh + 3 * dpr, fw, fh);
      ctx.globalAlpha = 1;
    }

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
        const art = propArt(u.kind);
        let ph = (u.hard ? 20 : 15) * dpr, pw = 30 * dpr;
        if (art) {
          // The FOOTPRINT is what stands in the lane, so the width is fixed and
          // the height follows the picture — but capped, because "never tall
          // enough to hide a standing person" is a rule of the game and not of
          // the drawing, and the bin came back full height however the prompt
          // asked. A prop that occludes the body behind it un-teaches the one
          // thing this board exists to teach.
          const s = Math.min(44 * dpr / art.width, 30 * dpr / art.height);
          pw = art.width * s; ph = art.height * s;
          ctx.drawImage(art, p.x - pw / 2, p.y - ph + 3 * dpr, pw, ph);
        } else {
          ctx.fillStyle = u.hard ? '#4b5560' : '#3d4650';
          ctx.strokeStyle = targetable ? PAL.warn : PAL.paper;
          ctx.lineWidth = 2 * dpr;
          ctx.beginPath();
          ctx.roundRect(p.x - pw / 2, p.y - ph, pw, ph, 2 * dpr);
          ctx.fill(); ctx.stroke();
        }
        if (targetable) {
          // a bitmap cannot be outlined the way a slab could, so the ring goes
          // on the ground — the same ring a body gets, which is the point: a
          // thing you may hit is marked the same way whatever it is made of
          ctx.strokeStyle = PAL.warn; ctx.lineWidth = 2.5 * dpr;
          ctx.beginPath(); ctx.ellipse(p.x, p.y, 21 * dpr, 10 * dpr, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        // how much of it is left, over the top of it
        const k = Math.max(0, u.hp / u.maxHp);
        if (k < 1) {
          ctx.fillStyle = '#2a3038';
          ctx.fillRect(p.x - 13 * dpr, p.y - ph - 4 * dpr, 26 * dpr, 3 * dpr);
          ctx.fillStyle = k > 0.5 ? '#7d8896' : PAL.warn;
          ctx.fillRect(p.x - 13 * dpr, p.y - ph - 4 * dpr, 26 * dpr * k, 3 * dpr);
        }
        ctx.globalAlpha = 1;
        continue;
      }

      // the body. A standing man is 45 CSS px tall on the board and every
      // distance in this view was drawn to that, so the sprite is scaled to a
      // HEIGHT and the width follows — a figure that fitted a width box would
      // change stature between poses, and stature is how you tell a man on his
      // feet from one who is not.
      const h = 40 * dpr, w = 15 * dpr;
      const art = figArt(u);
      // where the drawn body actually ENDS, so the bars sit above whatever was
      // drawn rather than above a constant. They used to be pinned to the old
      // rectangle's height and landed across the sprite's shoulders.
      let top = p.y - h - 12 * dpr;
      if (art) {
        const fh = (u.downed ? 22 : 52) * dpr;
        const fw = art.width * (fh / art.height);
        ctx.drawImage(art, p.x - fw / 2, p.y - fh + 3 * dpr, fw, fh);
        top = p.y - fh;
      } else {
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
      }

      if (u.bracing) {
        ctx.strokeStyle = PAL.draft; ctx.lineWidth = 2 * dpr;
        ctx.beginPath(); ctx.arc(p.x, p.y - h / 2, 17 * dpr, -0.6, 0.6); ctx.stroke();
      }

      // TWO bars, because there are two ways to take somebody out of a fight.
      // Harm on top, nerve under it — a unit whose lower bar is nearly gone is
      // one good fright from walking, and that is readable at a glance.
      const bw = 26 * dpr, by = top - 8 * dpr;
      ctx.fillStyle = '#2a3038';
      ctx.fillRect(p.x - bw / 2, by, bw, 3 * dpr);
      ctx.fillStyle = u.hp / u.maxHp > 0.5 ? PAL.mark : PAL.warn;
      ctx.fillRect(p.x - bw / 2, by, bw * Math.max(0, u.hp / u.maxHp), 3 * dpr);
      ctx.fillStyle = '#2a3038';
      ctx.fillRect(p.x - bw / 2, by + 5 * dpr, bw, 2 * dpr);
      ctx.fillStyle = PAL.draft;
      ctx.fillRect(p.x - bw / 2, by + 5 * dpr, bw * Math.max(0, u.nerve / u.maxNerve), 2 * dpr);

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
      // Only the actor and anything currently ringed. Naming your whole side
      // overlapped three labels into "J…a" the moment two of them stood in
      // neighbouring cells — and the unit panel under the board now says who is
      // acting, so the board saying it too was two answers to one question.
      if (isActor || targetable) {
        ctx.font = `${10 * dpr}px ${PAL.font}`;
        ctx.textAlign = 'center';
        // over a lit courtyard, dim grey on ochre is unreadable — the name
        // gets its own shadow rather than its own colour, so the palette
        // stays the palette
        if (this.arena) {
          ctx.shadowColor = 'rgba(0,0,0,0.9)';
          ctx.shadowBlur = 4 * dpr;
        }
        ctx.fillStyle = isActor ? PAL.gold : (this.arena ? PAL.mark : PAL.dim);
        const label = u.name.length > 12 ? u.name.slice(0, 11) + '…' : u.name;
        ctx.fillText(label, p.x, p.y + 15 * dpr);
        ctx.shadowBlur = 0;
      }
      ctx.globalAlpha = 1;
    }

    // The old THEM/YOU corner labels are gone: the rank columns down both
    // edges are already coloured by side and say it better, and two labels
    // for one fact is how a board gets cluttered.
  }

  // What the armed thing can reach — a weapon's rows, or an item's throw.
  // One method, so the ringing, the dimming and the intent lines can never
  // disagree about what is a legal target.
  reach(fight) {
    if (!this.sel || !fight.actor) return [];
    return this.sel.startsWith('!')
      ? fight.itemTargets(fight.actor)
      : fight.targets(fight.actor, this.sel);
  }

  // Which weapon or item is armed, or null. Setting it re-dims the board.
  // `!id` is an item; a bare id is a weapon.
  arm(id) {
    this.sel = id && (id.startsWith('!') ? ITEMS[id.slice(1)] : WEAPONS[id]) ? id : null;
  }
}
