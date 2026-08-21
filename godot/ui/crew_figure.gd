class_name CrewFigure
extends RefCounted
## Composes a crew member from the approved modular parts.
##
## SCOPE, and it is narrow. The approved pack ships only head / torso / legs /
## equipment. MODULAR_CHARACTER_SYSTEM.md defines a FOURTEEN-layer stack that
## also includes arm modules (`shoulder_l/r`, `elbow_l/r`, `wrist_l/r`) and
## `hands_grip` — none of which were exported. So the sleeves are baked into the
## torso and end at an empty cuff: these figures have NO HANDS, and the arms are
## fixed straight out.
##
## That makes this good for exactly one thing: a front-on roster or crew menu
## paper doll, where an orthographic arms-out figure is the correct convention.
## It is NOT the in-scene representation. For that, use the composite pose sets
## under data/art/animation/<role>/ (idle-smile, talk, guard, hit-light,
## walk-contact, walk-pass), which are drawn with hands, in three-quarter view,
## with real weight.
##
## art-library/MODULAR_CHARACTER_SYSTEM.md: heads, torsos and legs are separate
## alpha modules joined at named sockets (`root_ground`, `waist`, `neck`), with
## equipment held at `grip_primary`. ART_BIBLE §6 keeps every useful layer
## separable, so this never bakes a figure — it returns the draw list and the
## caller composites at whatever size it needs.
##
## Placement comes from data/part-layout.json (tools/build-part-layout.py).
## Equipment grip points are AUTHORED — read from the cyan marker in the art.
## Body-part stacking is DERIVED from alpha bounds, because no numeric sockets
## exist in the repo yet. Replace it the moment they do.

const LAYOUT_PATH := "res://data/part-layout.json"

static var _layout: Dictionary = {}


static func layout() -> Dictionary:
	if _layout.is_empty() and FileAccess.file_exists(LAYOUT_PATH):
		var parsed: Variant = JSON.parse_string(
			FileAccess.get_file_as_string(LAYOUT_PATH))
		if typeof(parsed) == TYPE_DICTIONARY:
			_layout = parsed
	return _layout


static func available() -> bool:
	return not layout().is_empty()


## Part ids for a crew role, falling back to a role that exists.
static func parts_for_role(role: String, head_id: String = "") -> Dictionary:
	var l := layout()
	var parts: Dictionary = l.get("parts", {})
	var legs := "legs-%s-v03" % role
	var torso := "torso-%s-v03" % role
	if not parts.has(legs):
		legs = "legs-local-v03"
	if not parts.has(torso):
		torso = "torso-local-v03"
	var head := head_id
	if head == "" or not parts.has(head):
		head = "head-kallio-01-v03"
	return {"legs": legs, "torso": torso, "head": head}


## Build a draw list for one figure inside `box`, standing on its bottom edge.
##
## Returns [{texture, rect}] back-to-front. The caller draws them in order, so
## the layers stay separable for animation and responsive cropping (§6).
static func draw_list(role: String, head_id: String, equipment_id: String,
		box: Rect2) -> Array:
	var l := layout()
	if l.is_empty():
		return []
	var parts: Dictionary = l.get("parts", {})
	var ids := parts_for_role(role, head_id)

	var legs: Dictionary = parts.get(ids["legs"], {})
	var torso: Dictionary = parts.get(ids["torso"], {})
	var head: Dictionary = parts.get(ids["head"], {})
	if legs.is_empty() or torso.is_empty() or head.is_empty():
		return []

	# Anchor to the JOINT, not to a fraction of each part's own height. The
	# torso exports differ wildly — the fixer and local jackets fill their whole
	# 512px canvas while the runner's occupies 302px — so an overlap measured
	# against the torso pushed the legs away from the tall ones and left a gap.
	var waist_drop := float(l.get("waist_drop", 0.26))
	var neck_drop := float(l.get("neck_drop", 0.20))

	var legs_h := float(legs["visible"][1])
	var torso_h := float(torso["visible"][1])
	var head_h := float(head["visible"][1])

	# Total height of the assembled figure, measured through the joints.
	var stack_h := legs_h + torso_h - legs_h * waist_drop + head_h - torso_h * neck_drop
	var stack_w := maxf(maxf(float(legs["visible"][0]), float(torso["visible"][0])),
		float(head["visible"][0]))
	if stack_h <= 0.0 or stack_w <= 0.0:
		return []

	var scale: float = minf(box.size.x / stack_w, box.size.y / stack_h)
	var cx := box.position.x + box.size.x * 0.5
	var ground := box.position.y + box.size.y

	var out: Array = []

	# legs stand on the ground line
	var legs_top := ground - legs_h * scale
	out.append(_entry(legs, cx, legs_top, scale))

	# the torso's HEM sits a little way down into the legs — the waist
	var torso_bottom := legs_top + legs_h * waist_drop * scale
	var torso_top := torso_bottom - torso_h * scale
	out.append(_entry(torso, cx, torso_top, scale))

	# equipment sits between torso and head so a raised arm still reads
	if equipment_id != "":
		var eq: Dictionary = l.get("equipment", {}).get(equipment_id, {})
		if not eq.is_empty() and eq.get("grip_primary") != null:
			out.append(_equipment_entry(eq, torso, cx, torso_top, scale))

	# the head's CHIN sits a little way down into the torso — the neck
	var head_bottom := torso_top + torso_h * neck_drop * scale
	var head_top := head_bottom - head_h * scale
	out.append(_entry(head, cx, head_top, scale))

	return out


static func _entry(part: Dictionary, cx: float, top: float, scale: float) -> Dictionary:
	var bb: Array = part["bbox"]
	var w := float(bb[2] - bb[0]) * scale
	var h := float(bb[3] - bb[1]) * scale
	var tex := _texture(String(part["file"]))
	# Draw the whole texture, offset so its VISIBLE box lands where we want.
	var full_w := float(part["size"][0]) * scale
	var full_h := float(part["size"][1]) * scale
	var origin := Vector2(cx - w * 0.5 - float(bb[0]) * scale,
		top - float(bb[1]) * scale)
	return {"texture": tex, "rect": Rect2(origin, Vector2(full_w, full_h))}


## Hang equipment off the torso's primary hand. Without an authored hand socket
## the grip is placed at the torso's lower outer edge, which is where the hand
## sits in every one of these six torsos.
static func _equipment_entry(eq: Dictionary, torso: Dictionary,
		cx: float, torso_top: float, scale: float) -> Dictionary:
	var tb: Array = torso["bbox"]
	var torso_w := float(tb[2] - tb[0]) * scale
	var torso_h := float(tb[3] - tb[1]) * scale
	var hand := Vector2(cx + torso_w * 0.42, torso_top + torso_h * 0.72)

	var grip: Array = eq["grip_primary"]
	var eq_scale := scale * 0.62      # props are drawn larger than life on their sheet
	var origin := hand - Vector2(float(grip[0]), float(grip[1])) * eq_scale
	var size := Vector2(float(eq["size"][0]), float(eq["size"][1])) * eq_scale
	return {"texture": _texture(String(eq["file"])), "rect": Rect2(origin, size)}


static var _cache: Dictionary = {}

static func _texture(rel_path: String) -> Texture2D:
	if _cache.has(rel_path):
		return _cache[rel_path]
	var path := "res://data/art/" + rel_path
	var tex: Texture2D = load(path) if ResourceLoader.exists(path) else null
	_cache[rel_path] = tex
	return tex
