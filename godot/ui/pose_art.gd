class_name PoseArt
extends RefCounted
## Composite pose art for units in scene.
##
## The approved pack ships whole-figure poses per role under
## data/art/animation/<role>/ — idle-smile, talk, guard, hit-light, strike,
## walk-contact, walk-pass. These are drawn WITH hands, in three-quarter view,
## with real weight, and they are what a unit looks like in a location or a
## battle. The modular head/torso/legs parts are a roster paper doll only
## (see ui/crew_figure.gd).
##
## DESIGN_AUTHORITY, "Active visual baseline":
##   "The older claim that the map/interiors must be PAPER while fights become a
##   separate polished INK style is superseded. Battles may be darker and more
##   dramatic, but they retain the same cut-paper and hand-marker construction."
##
## So there is ONE set of pose art, and the battle darkens it at draw time via
## night_modulate() rather than a second art style existing.

## Registered, approved animation sets — canon, synced from art/v3.
const DIR := "res://data/art/animation/"
## Candidate cast, staged by art-src/install-poses.sh and NOT yet registered.
## Preferred when present so the port shows the current work, while canon stays
## untouched and sync-data.mjs --check keeps meaning something.
const CAST_DIR := "res://data/art/cast/"

## Pose names, mapped to what the fight model can actually be in.
const IDLE := "idle-smile"
const TALK := "talk"
const GUARD := "guard"
const HIT := "hit-light"
const STRIKE := "strike"
const WALK_A := "walk-contact"
const WALK_B := "walk-pass"

## Roles with a pose set on disk. Anything else falls back to the runner, which
## is the only complete set in the approved pack.
const FALLBACK_ROLE := "runner"

static var _cache: Dictionary = {}


static func texture(role: String, pose: String) -> Texture2D:
	var key := "%s/%s" % [role, pose]
	if _cache.has(key):
		return _cache[key]
	var tex: Texture2D = null
	for dir in [CAST_DIR, DIR]:
		for ext in [".webp", ".png"]:
			var path: String = String(dir) + role + "/" + pose + "-frame00" + String(ext)
			if ResourceLoader.exists(path):
				tex = load(path)
				break
		if tex != null:
			break
	if tex == null and role != FALLBACK_ROLE:
		tex = texture(FALLBACK_ROLE, pose)
	_cache[key] = tex
	return tex


static func has_role(role: String) -> bool:
	return ResourceLoader.exists(DIR + role + "/" + IDLE + "-frame00.webp") \
		or ResourceLoader.exists(DIR + role + "/" + IDLE + "-frame00.png")


## The pose a fighter should be drawn in, from its live state.
static func pose_for(f: Fighter, acting: bool = false) -> String:
	match f.status:
		Fighter.Status.DOWNED, Fighter.Status.ROUTED:
			return HIT
		Fighter.Status.SHAKEN, Fighter.Status.CRITICAL:
			return GUARD
		_:
			pass
	if acting:
		return STRIKE
	return GUARD if f.guard > 0 else IDLE


## Battles are "darker and more dramatic" — the same art, graded down.
## A head crop for the console portrait, taken from the role's idle pose so a
## portrait never needs its own asset. ART_BIBLE §12.5: "Portrait, name and
## condition form one block."
##
## The region is normalised on the pose plate. Every standing pose in the cast
## is framed the same way, so one rectangle serves them all; `downed` is
## excluded because it is horizontal.
const PORTRAIT_REGION := Rect2(0.30, 0.005, 0.40, 0.26)


static func portrait(role: String) -> Texture2D:
	return texture(role, IDLE)


static func draw_portrait(ci: CanvasItem, role: String, box: Rect2,
		tint: Color = Color.WHITE) -> bool:
	var tex := portrait(role)
	if tex == null:
		return false
	var ts := tex.get_size()
	var region := Rect2(
		PORTRAIT_REGION.position.x * ts.x, PORTRAIT_REGION.position.y * ts.y,
		PORTRAIT_REGION.size.x * ts.x, PORTRAIT_REGION.size.y * ts.y)
	# Fill the box without distorting the crop.
	var s: float = maxf(box.size.x / region.size.x, box.size.y / region.size.y)
	var drawn := region.size * s
	var at := box.position + (box.size - drawn) * 0.5
	ci.draw_texture_rect_region(tex, Rect2(at, drawn), region, tint)
	return true


static func night_modulate() -> Color:
	return Color(0.72, 0.76, 0.86, 1.0)


## A cream torn edge around each standee was tried and removed. draw_texture_rect
## MODULATES, so stamping the texture in cream yields a cream-tinted copy of the
## artwork rather than a solid silhouette — and the art's own magenta rim came
## through it as a pink halo. A real border needs an alpha-only shader.
##
## It is not needed: the approved poses already carry a magenta rim light, which
## IS their cut edge. Left here so the next person does not retry it.
const BORDER_STEPS := 10
const BORDER_COLOR := Color("#e8e2d2")


## Draw one figure standing on the bottom-centre of `box`, scaled to fit.
## `face_left` mirrors horizontally: the two half-boards face each other, and
## cut-paper standees mirror for free.
static func draw_into(ci: CanvasItem, role: String, pose: String, box: Rect2,
		face_left: bool, tint: Color = Color.WHITE, border: float = 0.0) -> bool:
	var tex := texture(role, pose)
	if tex == null:
		return false
	var ts := tex.get_size()
	if ts.x <= 0.0 or ts.y <= 0.0:
		return false
	var s: float = minf(box.size.x / ts.x, box.size.y / ts.y)
	var drawn := ts * s
	var origin := Vector2(box.position.x + (box.size.x - drawn.x) * 0.5,
		box.position.y + box.size.y - drawn.y)
	# Mirroring is a NEGATIVE WIDTH rect. draw_texture_rect's fifth argument is
	# `transpose`, which rotates 90 degrees — passing the flip there laid every
	# opposition figure on its side.
	var rect := Rect2(origin, drawn)
	if face_left:
		rect = Rect2(origin.x + drawn.x, origin.y, -drawn.x, drawn.y)

	if border > 0.0:
		for i in range(BORDER_STEPS):
			var a := TAU * float(i) / float(BORDER_STEPS)
			var o := Vector2(cos(a), sin(a)) * border
			ci.draw_texture_rect(tex,
				Rect2(rect.position + o, rect.size), false, BORDER_COLOR)

	ci.draw_texture_rect(tex, rect, false, tint)
	return true
