class_name PiritoriChrome
extends RefCounted
## The UI's material: worn dark card with a broken bone rule, drawn in code.
##
## THE PROBLEM THIS SOLVES. Every panel, bar and button in the game was a
## `StyleBoxFlat` — a flat fill with a two-pixel border. Owner, on seeing the
## style target: *"currently there is no new UI."* That is accurate. A flat
## rectangle has no material; it is the absence of a decision, and no amount of
## palette tuning turns it into one.
##
## THE RULING IT IMPLEMENTS. `art-library/ux-concepts/README.md`: cardstock is
## the interface, not the world. The board stays rendered in 3D; the chrome on
## top of it is card. This file is that card, so the decision lives in one place
## instead of being retyped as forty `StyleBoxFlat`s.
##
## WHY PROCEDURAL AND NOT A PNG. Rule 9 — the build is already ~28MB gzipped on
## a phone connection. These are 64×64 nine-patches generated once at startup
## and cached, so the whole UI material costs a few kilobytes of RAM and nothing
## on the wire. It also means a colour change is a constant, not a re-export.
##
## THE GRAIN IS THE POINT. `ART_BIBLE` asks for risograph print language:
## registration drift, ink that does not fully cover, edges that are cut rather
## than computed. A clean vector rule reads as software. A rule that BREAKS —
## drops out for a pixel here and there on a hash — reads as printing. That one
## detail is most of the difference between these and the flat boxes.

# ── the material ──────────────────────────────────────────────────────────
const CARD := Color("#12181b")          ## dark card face
const CARD_HOT := Color("#1c2529")      ## pressed / hovered
const CARD_EDGE := Color("#05080a")     ## the cut outside line
const RULE := Color("#8a7355")          ## bone rule, the warm inner line
const SCUFF := Color("#c9b48d")         ## corner wear
const CARTON := Color("#cfc4ab")        ## cream carton, for plates
const CARTON_FIBRE := Color("#9c8b6b")  ## the pale inside of a torn edge
const CARTON_INK := Color("#16191b")

# ── concept A interface accents (owner-approved 2026-08-24, "a works") ─────
# The location screen's dialogue card and torn-card action row match
# `art-src/ui/band-A-warm.png` — the sheet the owner picked over the cooler
# chrome-matched alternative. Named here rather than inlined at the call site
# so the choice is a constant, not a colour retyped at every button.
const ACCENT_LOOK := Color("#a62bff")   ## violet — inspect / look closer
const ACCENT_ACT := Color("#9a4e34")    ## rust-orange — commit to a choice
const ACCENT_LEAVE := Color("#4f7fa0")  ## teal — leave

const TEX := 64                          ## nine-patch source size
const MARGIN := 18                       ## corner size held unstretched
const TEAR := 7                          ## deepest bite a torn edge takes

static var _cache: Dictionary = {}


# ── public ────────────────────────────────────────────────────────────────

## A framed dark card. `accent` tints the bone rule toward an action colour.
static func panel(accent: Color = RULE, torn_top: bool = false,
		torn_bottom: bool = false) -> StyleBoxTexture:
	return _box("panel", CARD, accent, torn_top, torn_bottom, 14, 10)


## A command tab. Same card, tighter margins, brighter when `hot`.
static func button(accent: Color = RULE, hot: bool = false) -> StyleBoxTexture:
	return _box("btn" + ("H" if hot else ""), CARD_HOT if hot else CARD,
		accent, false, false, 12, 8)


## A full-width bar that meets the world. Torn on the side the world is on.
static func bar(torn_top: bool = true) -> StyleBoxTexture:
	return _box("bar", CARD, RULE, torn_top, not torn_top, 10, 8)


## A cream carton label plate — torn top and bottom, ink lettering over it.
static func plate(accent: Color = CARTON) -> StyleBoxTexture:
	return _box("plate", accent, CARTON_INK, true, true, 10, 6)


## A choice card: the same cream carton as `plate()`, but pressable.
##
## `art-library/ux-concepts/README.md` settles the direction — "a 3D world,
## and torn-carton UI on top of it... cardstock is the interface, not the
## world" — and the location screen's narration plate already proves it reads
## at phone size. Its own choice rows underneath were still dark cards with a
## hairline accent outline, which next to the carton plate looked like the
## wireframe the plate had been built to replace.
##
## Torn on the BOTTOM only. A card torn on both edges reads as a scrap; torn
## along one edge reads as something taken off a pad, and in a stacked list of
## choices it keeps the rows visually separable without a divider between
## them.
static func plate_button(accent: Color = CARTON, hot: bool = false) -> StyleBoxTexture:
	var face := CARTON.lightened(0.10) if hot else CARTON
	return _box("plateBtn" + ("H" if hot else ""), face, accent, false, true, 12, 9)


## A copy with different padding. The cache hands out SHARED StyleBoxes, so
## anything that needs its own margins must take a duplicate — writing to the
## cached one would silently repad every other control using that kind.
static func margins(sb: StyleBoxTexture, mx: int, my: int) -> StyleBoxTexture:
	var d: StyleBoxTexture = sb.duplicate()
	d.content_margin_left = mx
	d.content_margin_right = mx
	d.content_margin_top = my
	d.content_margin_bottom = my
	return d


## The ink colour that stays legible on `plate(accent)`.
static func plate_ink(accent: Color = CARTON) -> Color:
	return CARTON_INK if accent.get_luminance() > 0.38 else Color("#efe6d2")


# ── the painter ───────────────────────────────────────────────────────────

static func _box(kind: String, base: Color, accent: Color, torn_top: bool,
		torn_bottom: bool, mx: int, my: int) -> StyleBoxTexture:
	var key := "%s|%s|%s|%d%d" % [kind, base.to_html(), accent.to_html(),
		int(torn_top), int(torn_bottom)]
	if not _cache.has(key):
		var sb := StyleBoxTexture.new()
		sb.texture = _paint(kind, base, accent, torn_top, torn_bottom)
		sb.set_texture_margin_all(MARGIN)
		# TILE, not STRETCH. A stretched noise field smears into horizontal
		# streaks the moment a panel is wider than 64px, which looks like a
		# rendering bug rather than paper. Tiling repeats the grain instead,
		# which is what a real printed sheet does anyway.
		sb.axis_stretch_horizontal = StyleBoxTexture.AXIS_STRETCH_MODE_TILE
		sb.axis_stretch_vertical = StyleBoxTexture.AXIS_STRETCH_MODE_TILE
		sb.content_margin_left = mx
		sb.content_margin_right = mx
		sb.content_margin_top = my
		sb.content_margin_bottom = my
		_cache[key] = sb
	return _cache[key]


static func _paint(kind: String, base: Color, accent: Color, torn_top: bool,
		torn_bottom: bool) -> ImageTexture:
	var img := Image.create_empty(TEX, TEX, false, Image.FORMAT_RGBA8)
	var is_plate := kind.begins_with("plate")
	var rule := RULE.lerp(accent, 0.55) if not is_plate else accent

	for y in TEX:
		for x in TEX:
			var top: int = _bite(x, 0) if torn_top else 0
			var bot: int = _bite(x, 1) if torn_bottom else 0
			var col := _pixel(x, y, base, rule, is_plate)
			# Torn edges are cut LAST so the frame cannot survive into the missing
			# paper — a rule that keeps drawing across a bite is the giveaway that
			# this is a rectangle wearing a costume.
			if y < top or y >= TEX - bot:
				col = Color(0, 0, 0, 0)
			elif y < top + 2 or y >= TEX - bot - 2:
				col = CARTON_FIBRE if is_plate else RULE.darkened(0.45)
			img.set_pixel(x, y, col)

	return ImageTexture.create_from_image(img)


static func _pixel(x: int, y: int, base: Color, rule: Color, is_plate: bool) -> Color:
	var d: int = mini(mini(x, y), mini(TEX - 1 - x, TEX - 1 - y))
	var col := base

	# Grain first, so everything painted after it sits ON the paper.
	var g: float = (_hash(x, y, 7) - 0.5) * (0.10 if is_plate else 0.055)
	col = Color(clampf(col.r + g, 0.0, 1.0), clampf(col.g + g, 0.0, 1.0),
		clampf(col.b + g, 0.0, 1.0), 1.0)

	# A soft lift toward the frame gives the card a lit face rather than a
	# uniform fill. Eight pixels is enough to read and cheap to compute.
	if d >= 6 and d < 14:
		col = col.lightened((1.0 - float(d - 6) / 8.0) * (0.05 if is_plate else 0.07))

	if is_plate:
		# A plate has no cut outline — its edge is the tear itself.
		return col

	if d <= 1:
		return CARD_EDGE
	if d == 4 or d == 5:
		# THE BROKEN RULE. One pixel in six drops out, on a hash so it is the
		# same every frame and every device. This is the line between "printed"
		# and "drawn by a computer".
		if _hash(x, y, 31) > 0.83:
			return col.lightened(0.06)
		return rule.darkened(0.10 if d == 4 else 0.30)
	if d >= 2 and d <= 3 and _corner(x, y) and _hash(x, y, 53) > 0.55:
		return SCUFF.darkened(0.25)
	return col


## Depth of the bite out of the paper at column `x`. Periodic in TEX so a
## tiled edge has no seam, and coarse enough to read as torn rather than noisy.
static func _bite(x: int, salt: int) -> int:
	var a: float = sin(float(x) * TAU / float(TEX) * 3.0 + float(salt) * 2.1)
	var b: float = sin(float(x) * TAU / float(TEX) * 7.0 - float(salt) * 1.3)
	var n: float = _hash(x / 3, salt, 11)
	return int(clampf(2.0 + a * 1.9 + b * 1.1 + n * 2.0, 0.0, float(TEAR)))


static func _corner(x: int, y: int) -> bool:
	return (x < MARGIN or x >= TEX - MARGIN) and (y < MARGIN or y >= TEX - MARGIN)


## Deterministic value noise. Same on every device, every run — a texture that
## shimmered between reloads would be worse than no texture.
static func _hash(x: int, y: int, salt: int) -> float:
	var n: int = x * 374761393 + y * 668265263 + salt * 1274126177
	n = (n ^ (n >> 13)) * 1274126177
	return float((n ^ (n >> 16)) & 0xFFFF) / 65535.0
