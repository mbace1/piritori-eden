/**
 * Chrome — the same material as `godot/ui/chrome.gd`, ported pixel-for-pixel.
 *
 * Owner, 2026-08-28, on whether `web/` should adopt the Godot side's
 * torn-carton UI material: **"absolutely, no doubt."** And on whether it
 * should be a lighter approximation rather than the same system: **"why not
 * the same?"** So this is not inspired by `chrome.gd` — it runs the same
 * algorithm. `_hash`, `_bite` and `_pixel` below are line-for-line ports of
 * their GDScript namesakes, same constants, same seed, so a panel drawn here
 * and a panel drawn there differ only in the renderer under them.
 *
 * WHY A PORT AND NOT A LOOKALIKE. A hand-tuned CSS approximation drifts the
 * moment either side tunes a constant — the exact trap `ART_BIBLE.md` fell
 * into once already (`QUEUE.md`, `PORTING.md` §10). Copying the algorithm
 * instead of the look means the two builds can only agree or disagree on
 * purpose, at the constants, not by accident in the interpretation.
 *
 * HOW IT REACHES CSS. `chrome.gd` bakes a 64×64 `StyleBoxTexture` with fixed
 * texture margins, tiled rather than stretched. `border-image` is the CSS
 * feature built for exactly that: `border-image-slice` is the untouched
 * corner, `border-image-repeat: repeat` is Godot's `AXIS_STRETCH_MODE_TILE`.
 * One canvas render per (kind, base, accent, torn-top, torn-bottom) tuple,
 * cached as a data URI — cheap enough to generate at boot, the same reason
 * `chrome.gd`'s own docstring gives for doing this procedurally rather than
 * shipping a PNG.
 */

// ── the material — identical constants to chrome.gd ─────────────────────────
export const CARD = '#12181b';
export const CARD_HOT = '#1c2529';
export const CARD_EDGE = '#05080a';
export const RULE = '#8a7355';
export const SCUFF = '#c9b48d';
export const CARTON = '#cfc4ab';
export const CARTON_FIBRE = '#9c8b6b';
export const CARTON_INK = '#16191b';

// Action-accent mapping, read straight off the call sites in `app_shell.gd`:
// PiritoriIcon.Kind.INFO -> ACCENT_LOOK, .RISK -> ACCENT_ACT, .LEAVE ->
// ACCENT_LEAVE. Not invented for this port — the same three colours doing the
// same three jobs, so a violet button means "look closer" in both builds.
export const ACCENT_LOOK = '#a62bff';   // inspect / gather information
export const ACCENT_ACT = '#9a4e34';    // commit to a choice, spend something
export const ACCENT_LEAVE = '#4f7fa0';  // leave, withdraw, back out

const TEX = 64;
const MARGIN = 18;
const TEAR = 7;

// ── colour helpers — Godot's Color, kept in FLOAT 0..1 space throughout ────
//
// The first cut of this rounded to an 8-bit hex string after every operation
// — lighten, darken, lerp each quantised, the way `people/roster.mjs`'s own
// colour-free hash work never has to. `Color.lightened()`/`darkened()`/`lerp()`
// in Godot operate on floats and are quantised to a byte exactly ONCE, when a
// pixel is finally written to the RGBA8 image. Rounding four times instead of
// once produced pixels off by ±1 per channel — caught the same way the hash
// bug was: dumping `PiritoriChrome._paint(...)` at named coordinates and
// diffing against this file's output, byte for byte, not "looks close".
function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
function rgbToHex([r, g, b]) {
  // Image.set_pixel on a FORMAT_RGBA8 image TRUNCATES (uint8_t cast, no
  // +0.5) rather than rounding — a third porting trap, found the same way
  // as the other two: `_pixel(10,10,...)` computed 0.09669 for red (would
  // round to 0x19) but the pixel actually written into the baked texture
  // read back as 0x18. Godot's public Color/lighten/darken math was never
  // wrong; only the LAST step, byte quantisation, uses floor.
  const c = v => Math.max(0, Math.min(255, Math.floor(v * 255))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}
const lighten = ([r, g, b], amt) => [r + (1 - r) * amt, g + (1 - g) * amt, b + (1 - b) * amt];
const darken = ([r, g, b], amt) => [r * (1 - amt), g * (1 - amt), b * (1 - amt)];
const lerp3 = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
function luminance([r, g, b]) {
  // Godot's Color.get_luminance(): linear-light Rec.709, same formula.
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Float-RGB copies of the hex constants above, precomputed once so `pixel()`/
// `paint()` never round-trip through a hex string mid-pipeline — the whole
// point of the float-space rewrite this file went through.
const CARD_EDGE_RGB = hexToRgb(CARD_EDGE);
const SCUFF_RGB = hexToRgb(SCUFF);
const RULE_RGB = hexToRgb(RULE);
const CARTON_FIBRE_RGB = hexToRgb(CARTON_FIBRE);

// ── deterministic value noise — identical to chrome.gd's _hash ─────────────
//
// GDScript's `int` is a true 64-bit signed integer, not JS's 32-bit bitwise
// domain. The first cut of this used `| 0` / `Math.imul` / `>>>` — the exact
// pattern `market/model.mjs` and `people/roster.mjs` use for THEIR 32-bit
// hashes — and every value it produced was wrong, silently: no error, no
// crash, just a different (also plausible-looking) noise field. Caught only
// by dumping both sides at matching coordinates and diffing, which is now
// how this file is checked (see the commit this shipped in). BigInt with an
// explicit 64-bit two's-complement wrap is what actually reproduces it —
// verified byte-for-byte against `PiritoriChrome._hash` at ten x-columns,
// six y-rows and both `_bite` salts before anything downstream used it.
const M64 = 1n << 64n;
const HALF64 = 1n << 63n;
function wrap64(n) {
  n = ((n % M64) + M64) % M64;
  return n >= HALF64 ? n - M64 : n;
}
function hash(x, y, salt) {
  let n = wrap64(BigInt(x) * 374761393n + BigInt(y) * 668265263n + BigInt(salt) * 1274126177n);
  n = wrap64((n ^ (n >> 13n)) * 1274126177n);
  const shifted = n ^ (n >> 16n);
  return Number(((shifted % 65536n) + 65536n) % 65536n) / 65535;
}

// Depth of the bite out of the paper at column x. Periodic in TEX, same as
// the GDScript: `x / 3` there is GDScript's truncating int division.
function bite(x, salt) {
  const a = Math.sin((x * 2 * Math.PI) / TEX * 3 + salt * 2.1);
  const b = Math.sin((x * 2 * Math.PI) / TEX * 7 - salt * 1.3);
  const n = hash(Math.trunc(x / 3), salt, 11);
  return Math.max(0, Math.min(TEAR, Math.trunc(2 + a * 1.9 + b * 1.1 + n * 2)));
}

function isCorner(x, y) {
  return (x < MARGIN || x >= TEX - MARGIN) && (y < MARGIN || y >= TEX - MARGIN);
}

// `base`, `rule` are [r,g,b] float triples throughout — see the note above
// `hexToRgb` on why this file no longer round-trips through hex per step.
function pixel(x, y, base, rule, isPlate) {
  const d = Math.min(Math.min(x, y), Math.min(TEX - 1 - x, TEX - 1 - y));
  let col = base;

  // Grain first, so everything painted after it sits ON the paper.
  const g = (hash(x, y, 7) - 0.5) * (isPlate ? 0.10 : 0.055);
  col = col.map(v => Math.max(0, Math.min(1, v + g)));

  if (d >= 6 && d < 14) {
    col = lighten(col, (1 - (d - 6) / 8) * (isPlate ? 0.05 : 0.07));
  }

  if (isPlate) return col; // a plate has no cut outline — its edge is the tear

  if (d <= 1) return CARD_EDGE_RGB;
  if (d === 4 || d === 5) {
    // THE BROKEN RULE. One pixel in six drops out, on a hash so it is the
    // same every frame and every device — the line between "printed" and
    // "drawn by a computer", verbatim from chrome.gd's own comment.
    if (hash(x, y, 31) > 0.83) return lighten(col, 0.06);
    return darken(rule, d === 4 ? 0.10 : 0.30);
  }
  if (d >= 2 && d <= 3 && isCorner(x, y) && hash(x, y, 53) > 0.55) return darken(SCUFF_RGB, 0.25);
  return col;
}

/**
 * The pure pixel loop — no `document`, no canvas. Split out so a bare-node
 * test can call the SAME code the browser draws with, rather than a second
 * reimplementation that could itself drift from this file the way this file
 * once drifted from `chrome.gd`. Returns a flat RGBA byte array, row-major,
 * same layout `ImageData.data` uses.
 */
export function paintPixels(kind, baseHex, accentHex, tornTop, tornBottom) {
  const data = new Uint8ClampedArray(TEX * TEX * 4);
  const isPlate = kind.startsWith('plate');
  const base = hexToRgb(baseHex);
  const accent = hexToRgb(accentHex);
  const rule = isPlate ? accent : lerp3(RULE_RGB, accent, 0.55);

  for (let y = 0; y < TEX; y++) {
    for (let x = 0; x < TEX; x++) {
      const top = tornTop ? bite(x, 0) : 0;
      const bot = tornBottom ? bite(x, 1) : 0;
      let col = pixel(x, y, base, rule, isPlate);
      let a = 255;
      // Torn edges are cut LAST so the frame cannot survive into the missing
      // paper — a rule that keeps drawing across a bite is the giveaway that
      // this is a rectangle wearing a costume (chrome.gd's own phrase).
      if (y < top || y >= TEX - bot) { a = 0; col = [0, 0, 0]; }
      else if (y < top + 2 || y >= TEX - bot - 2) col = isPlate ? CARTON_FIBRE_RGB : darken(RULE_RGB, 0.45);
      const i = (y * TEX + x) * 4;
      // ONE quantisation, here, matching Color -> RGBA8 in the engine — and
      // FLOORED, not rounded: Image.set_pixel casts straight to uint8_t with
      // no +0.5, so 0.5-1.0 of a level is discarded, not banked. Rounding
      // here read a byte high at eight of eight sampled pixels.
      data[i] = Math.floor(Math.max(0, Math.min(1, col[0])) * 255);
      data[i + 1] = Math.floor(Math.max(0, Math.min(1, col[1])) * 255);
      data[i + 2] = Math.floor(Math.max(0, Math.min(1, col[2])) * 255);
      data[i + 3] = a;
    }
  }
  return { width: TEX, height: TEX, data };
}

function paint(kind, baseHex, accentHex, tornTop, tornBottom) {
  const { width, height, data } = paintPixels(kind, baseHex, accentHex, tornTop, tornBottom);
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(width, height);
  img.data.set(data);
  ctx.putImageData(img, 0, 0);
  return canvas.toDataURL('image/png');
}

const cache = new Map();
function box(kind, base, accent, tornTop, tornBottom) {
  const key = `${kind}|${base}|${accent}|${tornTop ? 1 : 0}${tornBottom ? 1 : 0}`;
  if (!cache.has(key)) cache.set(key, paint(kind, base, accent, tornTop, tornBottom));
  return cache.get(key);
}

// ── public — same five constructors as chrome.gd, same defaults ───────────

/** A framed dark card. `accent` tints the bone rule toward an action colour. */
export function panel(accent = RULE, tornTop = false, tornBottom = false) {
  return box('panel', CARD, accent, tornTop, tornBottom);
}

/** A command tab. Same card, brighter when `hot`. */
export function button(accent = RULE, hot = false) {
  return box(hot ? 'btnH' : 'btn', hot ? CARD_HOT : CARD, accent, false, false);
}

/** A full-width bar that meets the world. Torn on the side the world is on. */
export function bar(tornTop = true) {
  return box('bar', CARD, RULE, tornTop, !tornTop);
}

/** A cream carton label plate — torn top and bottom, ink lettering over it. */
export function plate(accent = CARTON) {
  return box('plate', accent, CARTON_INK, true, true);
}

/** A choice card: cream carton, torn on the BOTTOM only (see chrome.gd for why —
 *  a card torn on both edges reads as a scrap; torn on one reads as taken off a pad). */
export function plateButton(accent = CARTON, hot = false) {
  const face = hot ? rgbToHex(lighten(hexToRgb(CARTON), 0.10)) : CARTON;
  return box(hot ? 'plateBtnH' : 'plateBtn', face, accent, false, true);
}

/** The ink colour that stays legible on `plate(accent)`. */
export function plateInk(accent = CARTON) {
  return luminance(hexToRgb(accent)) > 0.38 ? CARTON_INK : '#efe6d2';
}

/**
 * Apply a generated texture to an element as a CSS custom property, so a
 * stylesheet rule can do `border-image-source: var(--chrome-panel)` without
 * every caller writing inline styles. `TEX`/`MARGIN` are exported so the
 * stylesheet's `border-image-slice`/`-width` can be derived from the same
 * numbers rather than a second, driftable pair of constants.
 */
export const CHROME_TEX = TEX;
export const CHROME_MARGIN = MARGIN;

export function apply(el, dataUrl, varName = '--chrome') {
  el.style.setProperty(varName, `url(${dataUrl})`);
}

/**
 * Generate every texture the shell needs and publish them as CSS custom
 * properties on `document.documentElement`, once, at boot. `v3.css` reads
 * them back with `border-image-source: var(--chrome-panel)` etc. so no
 * caller writes an inline style.
 *
 * The three named accents (LOOK/ACT/LEAVE) are used exactly where
 * `app_shell.gd` uses them — `.inspect-button` IS the LOOK icon button,
 * `.choice-card` IS the location screen's choice row (`plate_button`,
 * commit accent), and `.paper-button.danger` (WITHDRAW) IS "leave, withdraw,
 * back out" verbatim, so it takes ACCENT_LEAVE rather than keeping its own
 * red — chrome.gd has no fourth accent for "danger", and withdrawing IS
 * leaving. `primary` and `cyan` keep their own hex (mustard / cyan) as the
 * `button()` accent instead of collapsing into ACT, since Godot's own battle
 * screen gives each verb its own accent rather than reusing the icon-button
 * three — so the MATERIAL changes without erasing colour meanings the
 * accent set was never built to carry.
 */
export function boot(root = document.documentElement) {
  const css = getComputedStyle(root);
  const v = name => css.getPropertyValue(name).trim() || undefined;
  const mustard = v('--mustard') || '#d5ad43';
  const cyan = v('--cyan') || '#46c7d5';

  apply(root, panel(RULE, true, true), '--chrome-panel');
  apply(root, bar(false), '--chrome-bar-top');   // topbar — torn on the bottom, the world's edge
  apply(root, bar(true), '--chrome-bar-bottom'); // mode-nav — torn on the top

  apply(root, button(RULE, false), '--chrome-btn');
  apply(root, button(RULE, true), '--chrome-btn-hot');
  apply(root, button(mustard, false), '--chrome-btn-primary');
  apply(root, button(mustard, true), '--chrome-btn-primary-hot');
  apply(root, button(cyan, false), '--chrome-btn-cyan');
  apply(root, button(cyan, true), '--chrome-btn-cyan-hot');
  apply(root, button(ACCENT_LEAVE, false), '--chrome-btn-danger');
  apply(root, button(ACCENT_LEAVE, true), '--chrome-btn-danger-hot');
  apply(root, button(ACCENT_LOOK, false), '--chrome-btn-look');
  apply(root, button(ACCENT_LOOK, true), '--chrome-btn-look-hot');

  apply(root, plate(CARTON), '--chrome-plate');
  apply(root, plateButton(ACCENT_ACT, false), '--chrome-plate-btn');
  apply(root, plateButton(ACCENT_ACT, true), '--chrome-plate-btn-hot');
  root.style.setProperty('--chrome-plate-ink', plateInk(ACCENT_ACT));

  root.style.setProperty('--chrome-tex', `${TEX}px`);
  root.style.setProperty('--chrome-margin', `${MARGIN}px`);

  // The accent HEX itself, not just the texture built from it — Godot sets
  // `font_color` to the same accent it hands `PiritoriChrome.button()`, and
  // a CSS rule doing that by re-typing '#a62bff' next to `ACCENT_LOOK` is
  // the exact two-numbers-disagreeing trap this codebase keeps finding.
  root.style.setProperty('--chrome-accent-look', ACCENT_LOOK);
  root.style.setProperty('--chrome-accent-act', ACCENT_ACT);
  root.style.setProperty('--chrome-accent-leave', ACCENT_LEAVE);
}
