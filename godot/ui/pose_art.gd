class_name PoseArt
extends RefCounted
## Compatibility API for the paused port. Old role sprite sets were deleted
## on 2026-11-08. Never load old synced copies; callers use their neutral fallback.

## Pose names, mapped to what the fight model can actually be in.
const IDLE := "idle-smile"
const TALK := "talk"
const GUARD := "guard"
const HIT := "hit-light"
const STRIKE := "strike"
const WALK_A := "walk-contact"
const WALK_B := "walk-pass"

static func texture(_role: String, _pose: String) -> Texture2D:
	return null

static func has_role(_role: String) -> bool:
	return false


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
	# MIRRORING IS A TRANSFORM, NOT A NEGATIVE WIDTH.
	#
	# This used to flip by passing a Rect2 with a negative width. It does mirror
	# the image, but it does NOT mirror it in place — the figure lands a full
	# width to the side, so every opposition unit stood off its own cell by about
	# a tile. It was invisible for a long time because both sides were drawn the
	# same way and nothing marked where the feet were supposed to be.
	#
	# (The fifth argument of draw_texture_rect is `transpose`, which rotates 90
	# degrees. An earlier attempt to flip there laid the whole crew on its side.)
	#
	# Scaling the canvas by -1 about the rect's right edge mirrors it exactly
	# where it stands.
	var rect := Rect2(origin, drawn)
	if face_left:
		ci.draw_set_transform(Vector2(origin.x + drawn.x, origin.y), 0.0, Vector2(-1.0, 1.0))
		rect = Rect2(Vector2.ZERO, drawn)

	if border > 0.0:
		for i in range(BORDER_STEPS):
			var a := TAU * float(i) / float(BORDER_STEPS)
			var o := Vector2(cos(a), sin(a)) * border
			ci.draw_texture_rect(tex,
				Rect2(rect.position + o, rect.size), false, BORDER_COLOR)

	ci.draw_texture_rect(tex, rect, false, tint)
	if face_left:
		ci.draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)
	return true
