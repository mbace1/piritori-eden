/**
 * map-relief.js — the real map, drawn.
 *
 * `PORTING.md` §1.06 measured the last open parity gap between this build and
 * the Godot one, and it was this: `godot/data/map-geometry.json` carries 4020
 * real OpenStreetMap street polylines, 969 land strips, 169 railway and 48
 * water, and `city_map.gd` draws all of it — while this build drew ONE
 * hard-coded twenty-point SVG blob for the landmass and nothing at all for
 * streets, water or rail. It was the one thing that still told you instantly
 * which of the two builds a screenshot came from.
 *
 * WHY A CANVAS, AND NOT MORE SVG. `app.js`'s `render()` does
 * `root.innerHTML = views[state.mode]()` — the WHOLE route view is rebuilt
 * from a string on every state change. Adding ~5200 SVG elements to that
 * string means re-parsing and re-laying-out all of them on every click, on a
 * phone. Godot pays this cost once into a `_draw()` on a canvas; so does this.
 * The map geometry is STATIC — it never changes with game state — so it is
 * drawn once per size, and the interactive layer (anchors, the route, transit
 * chips) stays SVG on top, where it belongs, because those things really do
 * change and really are clickable.
 *
 * THE PART THAT SILENTLY MISALIGNS, and the reason the projection below is
 * spelled out rather than assumed: the SVG overlay is
 * `viewBox="0 0 1000 1000"` with no `preserveAspectRatio`, so it uses the
 * default `xMidYMid meet` — it fits the board inside its box and LETTERBOXES
 * the remainder. A canvas that simply stretches to its own element size does
 * not do that, and the two layers then disagree by however non-square the
 * panel is: streets would sit beside their own anchors, consistently, in a
 * way that reads as "the data is wrong" rather than "the transform is". So
 * `project()` reimplements `meet` exactly.
 *
 * PALETTE IS NOT PORTED, GEOMETRY IS. §3.3 is explicit that presentation is
 * deliberately different between the builds, so this keeps the browser's own
 * ink (`v3.css`'s map colours) rather than importing Godot's. What it DOES
 * take from Godot is the per-tier width and alpha relationship, because that
 * is information and not style: it is what makes major roads read as roads
 * and minor streets read as the texture they stand out of, and it was tuned
 * against direct reports ("add some bigger streets", then "closer, but do
 * some more passes with bigger roads").
 */

/** PAGE-RELATIVE, NOT MODULE-RELATIVE, and this build has now paid for that
 *  distinction three times. `fetch()` resolves a relative URL against the
 *  DOCUMENT's base URL, not against the module that calls it — `content.js`'s
 *  own header records the same bug costing ~40 silent 404s where every unit
 *  drew a fallback and nothing threw.
 *
 *  So this is written from the PAGE. The file sits beside `index.html` in
 *  `web/data/`, which means the same bare `data/...` is correct in BOTH
 *  layouts this build ships in — `/web/index.html` on this repo's Pages, and
 *  `/piritori/index.html` on the arcade cabinet — and needs no rewrite in
 *  `build-hub-cabinet.mjs`. That is the reason the file lives under `web/`
 *  rather than in the repo-root `map/` directory with the sources it derives
 *  from: it is generated output for one consumer, and putting it beside its
 *  consumer removes a path rewrite instead of adding one. */
const GEOMETRY_URL = 'data/map-geometry-web-v1.json';

/** The board's own coordinate extent, and the SVG overlay's viewBox. If these
 *  ever disagree the two layers slide apart, so it is asserted at draw time
 *  against the file's own `boardExtent` rather than trusted. */
const BOARD = 1000;

/** Ink. This build's own palette (`v3.css`), not Godot's — see the header.
 *  Widths and alphas ARE Godot's, in board units, from `_draw_real_streets()`
 *  and `_draw_rail_and_roads()`. */
const INK = {
  water: '#0c2637',
  land: '#262b31',
  coast: '#7d684f',
  street: '#5c666b',
  rail: '#090c0e',
};

const STREET_TIERS = [
  // Drawn minor-first so majors overlay their own junctions rather than being
  // stippled by them — the same back-to-front order city_map.gd relies on by
  // iterating one flat list that happens to be sorted.
  { tier: 'minor', width: 1.0, alpha: 0.16 },
  { tier: 'mid', width: 3.6, alpha: 0.66 },
  { tier: 'major', width: 6.6, alpha: 0.88 },
];

const RAIL_TIERS = [
  { tier: 'branch', width: 3.2 * 0.7 },
  { tier: 'main', width: 3.2 },
];

let geometryPromise = null;

/** One fetch for the life of the page. 155 KB raw, ~54 KB gzipped. */
export function loadMapGeometry() {
  if (!geometryPromise) {
    geometryPromise = fetch(GEOMETRY_URL)
      .then(r => {
        if (!r.ok) throw new Error(`map geometry ${r.status}`);
        return r.json();
      })
      .catch(err => {
        // A missing relief must not take the route screen down with it: the
        // anchors, the route and the transit layer are all still usable
        // without it. Logged, not thrown onward.
        console.warn('[map-relief] geometry unavailable, relief will not draw:', err.message);
        return null;
      });
  }
  return geometryPromise;
}

/**
 * `xMidYMid meet` by hand — see the header for why this is not a stretch.
 * Returns board-units -> device-pixels as a uniform scale plus a centring
 * offset, so a board point lands on exactly the pixel the SVG puts it on.
 */
function project(cssW, cssH, dpr) {
  const scale = Math.min(cssW / BOARD, cssH / BOARD);
  return {
    scale: scale * dpr,
    dx: ((cssW - BOARD * scale) / 2) * dpr,
    dy: ((cssH - BOARD * scale) / 2) * dpr,
  };
}

function strokePolylines(ctx, lines, p) {
  for (const pts of lines) {
    if (pts.length < 4) continue;
    ctx.beginPath();
    ctx.moveTo(p.dx + pts[0] * p.scale, p.dy + pts[1] * p.scale);
    for (let i = 2; i < pts.length; i += 2) {
      ctx.lineTo(p.dx + pts[i] * p.scale, p.dy + pts[i + 1] * p.scale);
    }
    ctx.stroke();
  }
}

function draw(canvas, geo) {
  const box = canvas.getBoundingClientRect();
  if (!box.width || !box.height) return false;   // not laid out yet
  const dpr = Math.min(window.devicePixelRatio || 1, 2);   // 2 is plenty; 3 is
  // a Pixel's ratio and triples the fill cost for no visible gain at this
  // line density.
  const w = Math.round(box.width * dpr);
  const h = Math.round(box.height * dpr);
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }

  const ctx = canvas.getContext('2d');
  const p = project(box.width, box.height, dpr);
  ctx.clearRect(0, 0, w, h);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // 1. Water is the whole field; land is cut out of it. Same order as
  //    city_map.gd's _draw_backing_and_water() then _draw_land().
  ctx.fillStyle = INK.water;
  ctx.fillRect(0, 0, w, h);

  // 2. Land. It arrives as horizontal scanline strips from the flood fill
  //    rather than a polygon (see buildRealLand() in the generator), so this
  //    is ~969 thin rects — trivial to fill, and they abut exactly, so no
  //    seam shows. Drawn into ONE path so the fill is a single operation.
  ctx.beginPath();
  for (const [x, y, rw, rh] of geo.land) {
    ctx.rect(p.dx + x * p.scale, p.dy + y * p.scale,
      Math.max(rw * p.scale, 1), Math.max(rh * p.scale, 1));
  }
  ctx.fillStyle = INK.land;
  ctx.fill();

  // 3. Real water bodies ON the land — the bays and the harbour that the
  //    flood fill leaves as holes. Filled, not stroked.
  if (geo.water?.length) {
    ctx.beginPath();
    for (const pts of geo.water) {
      if (pts.length < 6) continue;
      ctx.moveTo(p.dx + pts[0] * p.scale, p.dy + pts[1] * p.scale);
      for (let i = 2; i < pts.length; i += 2) {
        ctx.lineTo(p.dx + pts[i] * p.scale, p.dy + pts[i + 1] * p.scale);
      }
      ctx.closePath();
    }
    ctx.fillStyle = INK.water;
    ctx.fill();
  }

  // 4. The street network, minor first so majors sit on top at junctions.
  ctx.strokeStyle = INK.street;
  for (const { tier, width, alpha } of STREET_TIERS) {
    const lines = geo.streets?.[tier];
    if (!lines?.length) continue;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = Math.max(width * p.scale, 0.5);
    strokePolylines(ctx, lines, p);
  }
  ctx.globalAlpha = 1;

  // 5. Railway. No sleeper hatching — city_map.gd's own note explains why:
  //    applied to 143 real parallel track runs it came out as a zebra
  //    crossing. Real parallel alignments already say "railway".
  ctx.strokeStyle = INK.rail;
  for (const { tier, width } of RAIL_TIERS) {
    const lines = geo.railway?.[tier];
    if (!lines?.length) continue;
    ctx.lineWidth = Math.max(width * p.scale, 0.6);
    strokePolylines(ctx, lines, p);
  }

  return true;
}

let observed = null;

/**
 * Mount the relief under an already-attached canvas. Safe to call on every
 * render: it redraws, which is cheap, and re-registers nothing.
 */
export function mountMapRelief(canvas) {
  if (!canvas) return;
  loadMapGeometry().then(geo => {
    if (!geo || !canvas.isConnected) return;
    // The first call can land before layout has given the panel a size, in
    // which case getBoundingClientRect() is 0x0 and drawing silently produces
    // nothing. Retry once on the next frame rather than leaving a blank map.
    if (!draw(canvas, geo)) requestAnimationFrame(() => draw(canvas, geo));

    if (observed !== canvas && typeof ResizeObserver === 'function') {
      observed = canvas;
      new ResizeObserver(() => { if (canvas.isConnected) draw(canvas, geo); })
        .observe(canvas);
    }
  });
}
