extends Control
## Formation battle — GAME_DESIGN_DOCUMENT §13.
##
## §13.3 LOCKED screen composition:
##   "the battle uses a horizontal layout with the complete isometric encounter
##   visible above a substantial bottom command console. A narrow strip at the
##   top owns round state and enemy intent. The bottom console groups the
##   selected crew member and condition on the left, core actions in the centre,
##   and automation and withdrawal on the right. Both formations, cover and
##   target paths remain visible while commands are chosen. The interface must
##   not turn the battle back into a side-on lineup or cover the spatial state."
##
## §13.3 also locks the board: two mirrored half-boards, three depth rows
## (front/middle/back) crossed by three lanes, and "only occupied, selected,
## targeted and reachable cells are normally revealed; the grid is a rule
## beneath the scene rather than a permanent checkerboard."
##
## The FightManager is pure logic (RefCounted, no scene nodes). This scene reads
## it and sends commands; it never keeps a second copy of the fight.

signal battle_finished(result: int)

## A TRUE isometric grid laid on the ground plane, not a left-right split.
## Two axes at the standard 2:1 isometric ratio: one step "into" the board
## (row, front->back) and one step "across" it (lane). Rows recede diagonally,
## which is what makes the cells sit on the cobbles instead of floating.
## The courtyard backdrop is painted from a STEEP isometric camera, nearer 35
## degrees than the textbook 2:1. A 2:1 tile laid on it gave three rows only
## 86px of vertical spread while the figures are 130px tall, so the board
## collapsed into a band. Taller tile, steeper board, matches the plate.
const TILE := Vector2(74.0, 60.0)

## The two sides are separated along an isometric DEPTH axis, not mirrored about
## a vertical line — mirroring on x alone left both teams in the same horizontal
## band. FORWARD points away from the camera, so the player's board sits nearer
## (lower-left) and the opposition's further (upper-right), as in the targets.
const FORWARD := Vector2(1.0, -0.5)        ## toward the opposition, away from camera
const LANE_AXIS := Vector2(1.0, 0.5)       ## across the board, perpendicular in iso
## Superseded 2026-08-21: the halves are joined, and the space between them is
## FightBoard.NEUTRAL_ROWS of real grey cells rather than a gap measured in
## tiles. Kept only so the arena template's arithmetic still reads.
const CENTRE_GAP := 0.0

## Where the PLAYABLE FLOOR sits on each backdrop plate, normalised to the
## plate. The board is fitted into this instead of into the whole screen, which
## is what put the far rank on top of a building.
##
## This belongs in art/v3/manifest.json beside `portrait_safe_bounds`, as a
## `play_area` on each scene asset. It lives here until the owner approves that
## addition — a port-side estimate, not canon.
## Widened 2026-08-21. These were 64% x 32% and 66% x 30%, and COMBAT.md §3.1
## found that the play area — not the cell count — is what makes the board read
## as too small: a bigger grid inside the old rect only shrank the tiles, and
## 5x4 rendered SMALLER on screen than 3x3.
##
## They are still bounded by where the floor actually is in each painting. The
## approved courtyard's ground is a wedge that runs out near 40% of the frame,
## which is why this cannot simply be the whole plate — push it further and the
## far rank stands on the building.
## THE GRID IS CANONICAL. ARENAS ARE BUILT TO FIT IT.
##
## Owner ruling, 2026-08-21, and it corrects the direction this was going: the
## board was being fitted to each painting, with a hand-tuned diamond per stage
## and a round-trip with the owner for every new location. That is backwards for
## a grid-based game. The grid is the fixed thing; a stage is art PRODUCED to
## sit under it.
##
## So there is ONE arena, in plate-normalised coordinates, and every stage
## inherits it. `tools/stage-template.mjs` renders this exact diamond onto a
## 16:9 frame, and that template is what art is drawn against — see
## STAGE_SPEC.md.
##
##   c    centre of the playable floor, normalised to the plate
##   fwd  half-extent along FORWARD  (toward the opposition)
##   lane half-extent along LANE_AXIS (across the board)
##
## Both extents are HORIZONTAL fractions of the plate width, because one tile
## along either axis moves exactly one tile horizontally. That makes the two
## numbers directly comparable and the shape a true 2:1 diamond by construction.
const ARENA := {"c": Vector2(0.500, 0.600), "fwd": 0.175, "lane": 0.145}

## Escape hatch, deliberately empty. A stage may override the arena ONLY when
## its geometry genuinely cannot host the canonical one — and the right answer
## is almost always to fix the art instead, because an override is a stage that
## plays differently from every other stage for reasons the player cannot see.
const ARENA_OVERRIDE := {}

const FIGURE_HEADROOM := 0.0

## Height of the overlaid command console. It was 188 and took a quarter of the
## frame OUT of the layout; overlaid and trimmed it costs the board nothing and
## covers only the near corner of the arena, where the least happens.
const CONSOLE_H := 168.0

## Set to a non-empty Rect2 to override the play area for a comparison render.
## The owner asked (2026-08-21) whether the board is big enough to carry the
## visuals the reference games have; this is how the alternatives are LOOKED at
## rather than argued about. Empty in normal play.
static var play_diamond_override: Dictionary = {}

var fight: FightManager
var battle_id: String = ""

var _board: Control
## Owner ruling 2026-08-22: the game is 3D. Kept as a switch rather than a
## deletion — the 2D renderer is what every existing gate drives, and turning it
## off blind would trade a working board for an unproven one.
static var use_3d := true
var _stage3d: SubViewportContainer
## The face-off panel, while it is up.
var _faceoff: PanelContainer
var _top_strip: PanelContainer
var _top_label: Label
var _intent_box: HBoxContainer
var _console: PanelContainer
var _crew_col: VBoxContainer
var _action_col: VBoxContainer
var _auto_col: VBoxContainer

var _selected_unit: String = ""
var _auto_mode := false
var _hovered_target: String = ""
var _pending: FightManager.Command = null
var _forecast: Dictionary = {}
var _font: Font
var _t := 0.0
## The two sides read cyan and red, as in the owner's target renders.
const SIDE_CYAN := Color("#57c8e8")
const SIDE_RED := Color("#c8443c")
## No man's land: ground that belongs to neither side.
const NEUTRAL_GREY := Color("#8d9199")

var _roles: Dictionary = {}      ## role id -> {color, symbol}
var _stage: Texture2D = null
var _stage_id: String = ""


func _ready() -> void:
	_font = PiritoriFonts.ui()
	_load_role_tabs()
	set_anchors_preset(Control.PRESET_FULL_RECT)
	_build()


## Role tab colours are canon: art-library/characters/system/role-tabs.json.
## "Small engine-tinted subclass marker behind or beneath the unit silhouette;
## never the sole class indicator." So the tab is a colour AND the unit keeps
## its name and status words.
func _load_role_tabs() -> void:
	var path := "res://data/role-tabs.json"
	if not FileAccess.file_exists(path):
		return
	var parsed: Variant = JSON.parse_string(FileAccess.get_file_as_string(path))
	if typeof(parsed) != TYPE_DICTIONARY:
		return
	for r in (parsed as Dictionary).get("roles", []):
		_roles[String(r.get("id", ""))] = r


func _role_color(role: String) -> Color:
	var r: Dictionary = _roles.get(role, {})
	var hex := String(r.get("color", ""))
	return Color(hex) if hex != "" else MapStyle.LOCKED


func begin(id: String, crew_ids: Array, seed_value: int = 0) -> Array:
	battle_id = id
	fight = FightManager.new()
	_load_stage(id)
	var errors: Array = fight.begin_canonical(id, crew_ids, seed_value)
	if errors.is_empty():
		fight.state_changed.connect(_refresh)
		fight.battle_ended.connect(_on_battle_ended)
		_select_first_actionable()
		_refresh()
	return errors


## The battle's own location art. Each battle names a scene_asset_id, and the
## slice ships approved art for both — Karhupuisto and the courtyard.
func _load_stage(id: String) -> void:
	_stage = null
	var asset_id := String(ContentRegistry.battle(id).get("scene_asset_id", ""))
	_stage_id = asset_id
	if asset_id == "":
		return
	for asset in ContentRegistry.art.get("assets", []):
		if String(asset.get("id", "")) != asset_id:
			continue
		var path := "res://data/art/" + String(asset.get("file", ""))
		if ResourceLoader.exists(path):
			_stage = load(path)
		return


# ── layout ────────────────────────────────────────────────────────────────

func _build() -> void:
	var bg := ColorRect.new()
	bg.color = MapStyle.FRAME
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(bg)

	var col := VBoxContainer.new()
	col.set_anchors_preset(Control.PRESET_FULL_RECT)
	col.add_theme_constant_override("separation", 0)
	add_child(col)

	# ── narrow top strip: round state and enemy intent ──
	_top_strip = PanelContainer.new()
	_top_strip.add_theme_stylebox_override("panel", _panel(MapStyle.DARK_TAB, 0, 2))
	var top := VBoxContainer.new()
	top.add_theme_constant_override("separation", 2)
	_top_label = _label("", 15, MapStyle.TITLE_TEXT)
	top.add_child(_top_label)
	_intent_box = HBoxContainer.new()
	_intent_box.add_theme_constant_override("separation", 18)
	top.add_child(_intent_box)
	var tpad := MarginContainer.new()
	for s in ["left", "right"]:
		tpad.add_theme_constant_override("margin_" + s, 16)
	for s in ["top", "bottom"]:
		tpad.add_theme_constant_override("margin_" + s, 7)
	tpad.add_child(top)
	_top_strip.add_child(tpad)
	col.add_child(_top_strip)

	# ── the encounter. It fills the WHOLE frame and the chrome floats over it.
	# The console used to take 188 of 768 units out of the layout — a quarter of
	# the picture — so the arena was squeezed into what was left and the board
	# shrank to suit. A tactics game should spend its screen on the board.
	_board = Control.new()
	_board.size_flags_vertical = Control.SIZE_EXPAND_FILL
	_board.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_board.mouse_filter = Control.MOUSE_FILTER_STOP
	_board.draw.connect(_draw_board)
	_board.gui_input.connect(_board_input)
	col.add_child(_board)

	# The 3D stage sits INSIDE the board control and covers it. Everything the
	# console does — selection, forecast, confirm, withdraw — is untouched:
	# only what the board draws has changed. `use_3d` decides which, so the 2D
	# renderer stays reachable and testable rather than being deleted on the
	# strength of one prototype.
	if use_3d:
		_stage3d = preload("res://scenes/battle_stage_3d.gd").new()
		# Told WHERE it is before it is in the tree, because the stage picks its
		# model in _ready and cannot ask afterwards.
		_stage3d.scene_asset_id = _stage_id
		_stage3d.set_anchors_preset(Control.PRESET_FULL_RECT)
		_stage3d.mouse_filter = Control.MOUSE_FILTER_IGNORE
		_board.add_child(_stage3d)
		_mount_shot_caller()

	# ── the command console, OVERLAID rather than stacked ──
	# Anchored to the bottom of the frame instead of sitting in the column, so it
	# costs the board nothing. Slightly translucent, because the ground it covers
	# is the near corner of the arena and seeing it continue underneath is what
	# keeps the stage reading as one place.
	_console = PanelContainer.new()
	_console.add_theme_stylebox_override("panel", _panel(MapStyle.DARK_TAB, 2, 0))
	_console.custom_minimum_size = Vector2(0, CONSOLE_H)
	_console.modulate = Color(1, 1, 1, 0.94)
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 20)

	_crew_col = VBoxContainer.new()
	_crew_col.custom_minimum_size = Vector2(230, 0)
	_crew_col.add_theme_constant_override("separation", 4)
	row.add_child(_crew_col)

	_action_col = VBoxContainer.new()
	_action_col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_action_col.add_theme_constant_override("separation", 5)
	row.add_child(_action_col)

	_auto_col = VBoxContainer.new()
	_auto_col.custom_minimum_size = Vector2(210, 0)
	_auto_col.add_theme_constant_override("separation", 5)
	row.add_child(_auto_col)

	var cpad := MarginContainer.new()
	for s in ["left", "right", "top", "bottom"]:
		cpad.add_theme_constant_override("margin_" + s, 14)
	cpad.add_child(row)
	_console.add_child(cpad)
	# NOT col.add_child: it is an overlay on the root, pinned to the bottom.
	add_child(_console)
	_console.anchor_left = 0.0
	_console.anchor_right = 1.0
	_console.anchor_top = 1.0
	_console.anchor_bottom = 1.0
	_console.offset_left = 0.0
	_console.offset_right = 0.0
	_console.offset_bottom = 0.0
	_console.offset_top = -CONSOLE_H
	if debug_chrome_off:
		_console.visible = false
		_top_strip.visible = false


func _process(dt: float) -> void:
	_t += dt
	if _board:
		_board.queue_redraw()


# ── isometric board ───────────────────────────────────────────────────────

## Cell centre for (lane, row) on one side. Player is the left half-board,
## opposition the right; both are mirrors of one location (§13.3).
## The plate is drawn cover-fitted, so the play area has to be mapped through
## exactly the same transform to land on the floor it was measured against.
## The board's own rect. It is the whole frame now: the console floats over the
## bottom of it rather than taking a slice out of the layout, so the arena is
## placed against the full picture and the near corner simply sits under the
## chrome — which is where the least happens anyway.
func _plate_rect() -> Rect2:
	return Rect2(Vector2.ZERO, _board.size)



## Centre, and the two half-extents in PIXELS along the board's own axes.
func _play_diamond() -> Dictionary:
	var d: Dictionary = ARENA_OVERRIDE.get(_stage_id, ARENA)
	if not play_diamond_override.is_empty():
		d = play_diamond_override
	# The ART fills the whole frame, but the ARENA is placed inside what the
	# player can actually see. The console overlays the bottom, and centring the
	# board on the full height pushed the near half under it: the two halves are
	# symmetric about the centre, so a centre in the wrong place crops the
	# player's side while the opposition's side keeps its room. That is exactly
	# what it looked like — one grid tight against the bottom edge, the other
	# with space to spare.
	var plate := _plate_rect()
	# The console band is ALWAYS reserved, whether or not the console is drawn.
	#
	# It was skipped when the chrome was hidden, on the reasoning that there is
	# nothing to clear — but stage art is drawn against tools/stage-template.mjs,
	# which places the arena against exactly this reduced height. Using the full
	# frame instead dropped the board below the ground it was painted for: the
	# player's band crowded the near edge while the opposition's kept its room.
	#
	# Hiding the chrome hides the PANEL. It must not move the layout, or a
	# capture stops being a picture of the game.
	var visible := Vector2(plate.size.x, maxf(plate.size.y - CONSOLE_H, 1.0))
	var c: Vector2 = d.get("c", Vector2(0.5, 0.7))
	return {
		"c": plate.position + Vector2(c.x * plate.size.x, c.y * visible.y),
		"fwd": float(d.get("fwd", 0.30)) * plate.size.x,
		"lane": float(d.get("lane", 0.23)) * plate.size.x,
	}


## The four corners of the arena, on the board's own axes — so the outline can
## be laid against the courtyard's paving edges and judged.
func _arena_quad() -> PackedVector2Array:
	var d := _play_diamond()
	var c: Vector2 = d["c"]
	var f := Vector2(FORWARD.x, FORWARD.y) * float(d["fwd"])
	var l := Vector2(LANE_AXIS.x, LANE_AXIS.y) * float(d["lane"])
	return PackedVector2Array([c - f - l, c + f - l, c + f + l, c - f + l])



## Tile size derived from the floor, so the board always fits the location.
## Board extent comes from FightBoard.depth_reach(), both
## ways, along each isometric axis.
## The tile is SQUARE, and that is not a style choice: FORWARD is (1, -0.5) and
## LANE_AXIS is (1, 0.5), so a screen step has slope 0.5 * tile.y / tile.x, which
## is the 2:1 the art is drawn in only when the two are equal. Sizing them
## independently made the projection an accident of whatever rectangle a stage
## declared, and the grid ran at 0.19 against building bases at 0.51.
##
## Fitted to the arena diamond along BOTH of the board's axes, whichever binds.
func _tile() -> Vector2:
	var d := _play_diamond()
	var t: float = minf(
		float(d["fwd"]) / FightBoard.depth_reach(),
		float(d["lane"]) / (FightBoard.lane_centre() + 0.5))
	return Vector2(maxf(t, 14.0), maxf(t, 14.0))



## ONE grid. The two sides no longer live on mirrored boards separated by a gap
## — they occupy bands of a single depth axis with two neutral rows between them.
##
## Nothing is mirrored now, which also fixes a quiet inconsistency: with the old
## mirroring, lane 0 for the player sat physically OPPOSITE lane 0 for the
## opposition, so "the same lane" in the targeting rules was not the same column
## on screen. Now a lane is a column, for both sides, and the picture agrees with
## the rules.
## A fighter's slot already carries a unified depth, so side is only kept in the
## signature for the callers that pass it.
func _cell_pos(lane: int, depth: int, _side: int = 0) -> Vector2:
	return _cell_pos_depth(lane, depth)


func _cell_pos_depth(lane: int, depth: int) -> Vector2:
	var c: Vector2 = _play_diamond()["c"]
	var tile := _tile()
	var fwd := Vector2(FORWARD.x * tile.x, FORWARD.y * tile.y)
	var lane_v := Vector2(LANE_AXIS.x * tile.x, LANE_AXIS.y * tile.y)
	var mid := (float(FightBoard.total_rows()) - 1.0) * 0.5
	return c + fwd * (float(depth) - mid) 		+ lane_v * (float(lane) - FightBoard.lane_centre())





## Set to outline the play rect and the board's full footprint, so the board can
## be ALIGNED to the ground in the painted art rather than guessed at. Off in
## play; the capture tool turns it on.
static var debug_extent := false

## Hide the round strip and the command console, so a capture shows only the
## stage and the board. The console is 188px of a 768px frame and the top strip
## another slice; judging how the play area sits on the ground while a quarter
## of the picture is chrome is judging the wrong picture.
static var debug_chrome_off := false


## The play rect in white, EVERY cell of both half-boards outlined in their side
## colour, and the outer ring in yellow.
##
## In play only occupied, selected, targeted and reachable cells are revealed
## (§13.3), which is right for the game and useless for this job: the actual
## playing surface is invisible, so there is nothing to align to the courtyard.
## Under this flag the whole board is drawn.
func _draw_extent() -> void:
	# The arena, as a diamond on the board's own axes. A white rectangle told you
	# nothing about whether the board sat on the paving; this can be laid
	# directly against the courtyard's edges.
	var arena := _arena_quad()
	var ring := PackedVector2Array(arena)
	ring.append(arena[0])
	_board.draw_polyline(ring, Color(1, 1, 1, 0.55), 2.0, true)

	# One grid, banded: the player's rows, the neutral rows, the opposition's.
	var tl := _tile()
	for depth in range(FightBoard.total_rows()):
		var col := NEUTRAL_GREY
		if depth < FightBoard.rows:
			col = SIDE_CYAN
		elif not FightBoard.is_neutral_depth(depth):
			col = SIDE_RED
		for lane in range(FightBoard.lanes):
			var d := _diamond(_cell_pos_depth(lane, depth), tl.x * 1.86, tl.y * 0.92)
			var f := col
			f.a = 0.10
			_board.draw_colored_polygon(d, f)
			var line := PackedVector2Array(d)
			line.append(d[0])
			var e := col
			e.a = 0.55
			_board.draw_polyline(line, e, 1.5, true)

	var t := _tile()
	var pts: PackedVector2Array = []
	# walk the outer boundary of both half-boards, far side first
	for side in [int(Fighter.Side.OPPOSITION), int(Fighter.Side.PLAYER)]:
		var rows := range(FightBoard.rows - 1, -1, -1) if side == int(Fighter.Side.OPPOSITION) 			else range(FightBoard.rows)
		for row in rows:
			pts.append(_cell_pos(0, row, side))
	for side in [int(Fighter.Side.PLAYER), int(Fighter.Side.OPPOSITION)]:
		var rows := range(FightBoard.rows) if side == int(Fighter.Side.PLAYER) 			else range(FightBoard.rows - 1, -1, -1)
		for row in rows:
			pts.append(_cell_pos(FightBoard.lanes - 1, row, side))
	if pts.size() > 2:
		pts.append(pts[0])
		_board.draw_polyline(pts, Color(1.0, 0.85, 0.2, 0.9), 2.0, true)

	# the four cell centres at the corners, so scale is readable
	for side in [int(Fighter.Side.PLAYER), int(Fighter.Side.OPPOSITION)]:
		for lane in [0, FightBoard.lanes - 1]:
			for row in [0, FightBoard.rows - 1]:
				_board.draw_circle(_cell_pos(lane, row, side), 4.0,
					Color(1.0, 0.85, 0.2, 0.9))


func _diamond(centre: Vector2, w: float, h: float) -> PackedVector2Array:
	return PackedVector2Array([
		centre + Vector2(0, -h * 0.5),
		centre + Vector2(w * 0.5, 0),
		centre + Vector2(0, h * 0.5),
		centre + Vector2(-w * 0.5, 0),
	])


func _draw_board() -> void:
	if fight == null:
		return
	if use_3d and _stage3d != null:
		return   # the 3D stage owns the picture

	# Ground: the battle's own approved location art, graded for night.
	# DESIGN_AUTHORITY: battles are darker, same cut-paper construction.
	if _stage != null:
		var ts := _stage.get_size()
		var sc: float = maxf(_board.size.x / ts.x, _board.size.y / ts.y)
		var drawn := ts * sc
		# The approved courtyard is ALREADY painted for night. Grading it again
		# crushed it to near-black, so this only takes a little warmth out.
		_board.draw_texture_rect(_stage,
			Rect2((_board.size - drawn) * 0.5, drawn), false, Color(0.94, 0.95, 1.0))
		_board.draw_rect(Rect2(Vector2.ZERO, _board.size), Color(0.03, 0.04, 0.07, 0.12))
	else:
		_board.draw_rect(Rect2(Vector2.ZERO, _board.size), MapStyle.LAND)


	if debug_extent:
		_draw_extent()

	var reveal := _cells_to_reveal()

	for side in [int(Fighter.Side.PLAYER), int(Fighter.Side.OPPOSITION)]:
		for lane in range(FightBoard.lanes):
			for row in range(FightBoard.rows):
				var key := Vector3i(lane, row, side)
				if not reveal.has(key):
					continue
				var pos := _cell_pos(lane, row, side)
				var kind: String = reveal[key]
				var mine: bool = side == int(Fighter.Side.PLAYER)
				var col := SIDE_CYAN if mine else SIDE_RED
				var fill_a := 0.16
				match kind:
					"selected":
						col = MapStyle.TAB
						fill_a = 0.22
					"target":
						col = SIDE_RED
						fill_a = 0.26
					"reachable":
						fill_a = 0.07
					_:
						fill_a = 0.16
				# The tile spanned by the two axes: horizontal diagonal 2*TILE.x,
				# vertical diagonal TILE.y. Passing the STEP as the vertical
				# diagonal drew tall narrow rhombi standing on end.
				var t := _tile()
				var d := _diamond(pos, t.x * 1.86, t.y * 0.92)
				var fill := col
				fill.a = fill_a
				_board.draw_colored_polygon(d, fill)
				_board.draw_polyline(d + PackedVector2Array([d[0]]), col, 2.0, true)

	_draw_row_labels()
	_draw_cover()
	_draw_target_path()

	# Painter's order: anything lower on the screen is nearer the camera, so it
	# is drawn last. Without this the back row punched through the front one.
	var ordered := _all_fighters()
	ordered.sort_custom(func(a, b):
		return _cell_pos(a.slot.x, a.slot.y, int(a.side)).y 			< _cell_pos(b.slot.x, b.slot.y, int(b.side)).y)
	for f in ordered:
		_draw_unit(f)


## §13.3: only occupied, selected, targeted and reachable cells are revealed.
func _cells_to_reveal() -> Dictionary:
	var out: Dictionary = {}
	for f in _all_fighters():
		out[Vector3i(f.slot.x, f.slot.y, int(f.side))] = "occupied"
	if _selected_unit != "":
		var sel := _fighter(_selected_unit)
		if sel:
			out[Vector3i(sel.slot.x, sel.slot.y, int(sel.side))] = "selected"
			for slot in _reachable_slots(sel):
				out[Vector3i(slot.x, slot.y, int(sel.side))] = "reachable"
	if _hovered_target != "":
		var t := _fighter(_hovered_target)
		if t:
			out[Vector3i(t.slot.x, t.slot.y, int(t.side))] = "target"
	return out


func _reachable_slots(f: Fighter) -> Array:
	return fight.free_slots_for(f.fighter_id)


## BACK / MIDDLE / FRONT down both edges, in each side's colour — the rows are
## the whole tactical vocabulary (§13.5) and must be nameable at a glance.
func _draw_row_labels() -> void:
	var keys := ["battle.row.front", "battle.row.middle", "battle.row.back"]
	for side in [int(Fighter.Side.PLAYER), int(Fighter.Side.OPPOSITION)]:
		var mine: bool = side == int(Fighter.Side.PLAYER)
		var col := SIDE_CYAN if mine else SIDE_RED
		for row in range(3):
			# Anchor on the row's OUTERMOST lane so the tag clears the figures,
			# then pin it to the screen edge.
			var anchor := _cell_pos(0 if mine else 2, row, side)
			var text := tr(keys[row])
			var w := _font.get_string_size(text, HORIZONTAL_ALIGNMENT_LEFT, -1, 12).x
			var pos := Vector2(14.0 if mine else _board.size.x - w - 14.0, anchor.y + 4.0)
			var box := Rect2(pos - Vector2(8, 13), Vector2(w + 16, 20))
			_board.draw_rect(box, Color(0, 0, 0, 0.62))
			_board.draw_rect(box, col, false, 1.0)
			_board.draw_string(_font, pos, text, HORIZONTAL_ALIGNMENT_LEFT, -1, 12, col)


func _draw_cover() -> void:
	var props: Array = fight.cover_props()
	for p in props:
		var pos := _cell_pos(int(p.get("lane", 0)), int(p.get("row", 0)), int(p.get("side", 0)))
		var r := Rect2(pos + Vector2(-16, 6), Vector2(32, 11))
		_board.draw_rect(r, MapStyle.PARK)
		_board.draw_rect(r, MapStyle.BLOCK_EDGE, false, 2.0)


## The prop's own name, so the player learns the yard rather than a rule.
## "Behind the bicycle rack" is a place; "in soft cover" is a manual.
func _prop_words(cover: Dictionary) -> String:
	var id := String(cover.get("prop_id", ""))
	if id == "":
		return tr("battle.cover_generic")
	return id.replace("-", " ")


## What this attack runs into, before it is committed.
##
## Into the Breach's readability is not that you see the enemy's plan, it is
## that you see the CONSEQUENCE of yours. An attack silently intercepted by a
## bin is the same screen as an attack that missed, and the player learns
## nothing from either.
func _cover_warning_for(target_id: String) -> Control:
	var f := _fighter(_selected_unit)
	if f == null or target_id == "":
		return null
	var verdict := fight.attack_would_be_stopped(target_id, f.held_weapon_id)
	match verdict:
		"hard":
			return _label(tr("battle.cover_blocks"), 12, PiritoriPalette.DANGER_RED)
		"soft":
			return _label(tr("battle.cover_intercepts"), 12, PiritoriPalette.INTEL_MUSTARD)
		"pierced":
			# Worth saying: it is the weapon doing this, and that is exactly the
			# kind of thing that should make a loadout feel like a choice.
			return _label(tr("battle.cover_pierced"), 12, PiritoriPalette.ROUTE_GREEN)
	return null


## WHAT DO WE DO ABOUT THEM (COMBAT.md §9.5.2).
##
## Two options, not three. ENGAGE is in the design and is not built — fighting
## the police means a third side on the board and `Side` has two values — so it
## is left out rather than shown greyed forever. A disabled button that never
## enables is noise pretending to be a roadmap.
##
## The cost of each is stated on the button, because this is the one decision in
## a fight where the player is choosing between people rather than between moves.
func _build_police_choice() -> void:
	_action_col.add_child(_label(tr("police.here"), 15, PiritoriPalette.DANGER_RED))
	var note := _label(tr("police.choose"), 12, PiritoriPalette.TEXT_DIM)
	note.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_action_col.add_child(note)

	var down := 0
	for f in fight.get_fighters(Fighter.Side.PLAYER):
		if f != null and f.status == Fighter.Status.DOWNED:
			down += 1

	var grid := HBoxContainer.new()
	grid.add_theme_constant_override("separation", 8)
	_action_col.add_child(grid)

	grid.add_child(_action_card(tr("police.back_off"), PiritoriIcon.Kind.SWAP,
		PiritoriPalette.TEXT_DIM,
		func():
			fight.choose_police_posture(FightManager.PolicePosture.BACK_OFF)
			_refresh()))

	grid.add_child(_action_card(tr("police.help"), PiritoriIcon.Kind.PEOPLE,
		PiritoriPalette.PLAYER_CYAN,
		func():
			fight.choose_police_posture(FightManager.PolicePosture.HELP_FRIENDS)
			_refresh()))

	_action_col.add_child(_label(tr("police.on_the_ground") % down, 12,
		PiritoriPalette.INTEL_MUSTARD))


## THE OTHER SIDE'S SHOT-CALLER, in the corner of the board.
##
## `UX_SPEC.md` §18: one speaking-character component, three framings. This is
## the INSET one — the smallest and the only one that has to share the screen
## with something else.
##
## `COMBAT.md` §9.9 makes the shot-caller a real position rather than a stat.
## Putting the opposition's in the corner is what stops "they are being
## aggressive" from being a number nobody attributes to a person.
##
## The body is BORROWED. Nobody has modelled a faction shot-caller, so the white
## suit stands in — see presenter_3d.PLACEHOLDER_SPEAKERS. It is nearly right by
## accident, which is exactly why it is declared rather than left to look
## deliberate.
const INSET_SIZE := Vector2(148.0, 148.0)
const INSET_MARGIN := 10.0

func _mount_shot_caller() -> void:
	var speaker = preload("res://scenes/presenter_3d.gd").new()
	speaker.speaker_id = "shot-caller"
	speaker.framing = speaker.Framing.INSET
	if not speaker.available():
		# No model, no inset. Silence beats a hole in the corner of the board.
		speaker.free()
		return
	speaker.custom_minimum_size = INSET_SIZE
	speaker.size = INSET_SIZE
	speaker.mouse_filter = Control.MOUSE_FILTER_IGNORE
	# Top RIGHT: the player's own crew and the command console own the bottom and
	# the left, and the opposition occupies the far half of the board — so the
	# corner nearest them is the one that reads as theirs.
	speaker.set_anchors_preset(Control.PRESET_TOP_RIGHT)
	speaker.offset_left = -(INSET_SIZE.x + INSET_MARGIN)
	speaker.offset_top = INSET_MARGIN
	speaker.offset_right = -INSET_MARGIN
	speaker.offset_bottom = INSET_SIZE.y + INSET_MARGIN
	_board.add_child(speaker)


## Target paths stay visible while a command is being chosen (§13.3).
func _draw_target_path() -> void:
	if _pending == null or _pending.target_id == "":
		return
	var src := _fighter(_pending.source_id)
	var dst := _fighter(_pending.target_id)
	if src == null or dst == null:
		return
	var a := _cell_pos(src.slot.x, src.slot.y, int(src.side))
	var b := _cell_pos(dst.slot.x, dst.slot.y, int(dst.side))
	# Red dashed, arrowhead on the target — the target renders' language.
	var col := SIDE_RED
	var from := a + Vector2(0, -46)
	var to := b + Vector2(0, -46)
	var dir := (to - from).normalized()
	to -= dir * 26.0
	_draw_dashed_line(from, to, col, 2.5, 12.0, 9.0)
	var back := to - dir * 15.0
	var wing := dir.orthogonal() * 8.0
	_board.draw_colored_polygon(PackedVector2Array([to, back + wing, back - wing]), col)


func _draw_dashed_line(a: Vector2, b: Vector2, col: Color, w: float,
		on: float, off: float) -> void:
	var total := a.distance_to(b)
	if total <= 0.01:
		return
	var dir := (b - a) / total
	var t := 0.0
	while t < total:
		var e: float = minf(t + on, total)
		_board.draw_line(a + dir * t, a + dir * e, col, w, true)
		t = e + off


func _draw_unit(f: Fighter) -> void:
	var pos := _cell_pos(f.slot.x, f.slot.y, int(f.side))
	var is_player := f.side == Fighter.Side.PLAYER
	var accent := MapStyle.ROUTE if is_player else MapStyle.GOODS
	var role := String(f.role)

	# Depth follows SCREEN position, not row index: the player's back rank is
	# nearer the camera and must be larger, while the opposition's is further
	# and smaller. Row index alone shrank both.
	var depth: float = clampf(0.80 + 0.34 * (pos.y / maxf(_board.size.y, 1.0)), 0.72, 1.10)
	# Figures are sized off the TILE, so a smaller floor gives smaller people
	# and the ratio between them holds on any plate.
	var tile := _tile()
	var fig_h := tile.y * 2.15 * depth
	var fig_w := tile.x * 1.15 * depth

	var acting := _pending != null and _pending.source_id == f.fighter_id 		and _pending.type == FightManager.Command.Type.ATTACK
	var pose := PoseArt.pose_for(f, acting)

	var tint := PoseArt.night_modulate()
	if f.status == Fighter.Status.DOWNED or f.status == Fighter.Status.ROUTED:
		tint = tint.darkened(0.35)

	# 1. the coloured base tab this unit stands on — role vocabulary, canon
	var tab := _role_color(role)
	tab.a = 0.85
	_board.draw_colored_polygon(_diamond(pos + Vector2(0, 2), tile.x * 1.0 * depth, tile.y * 0.5 * depth), tab)

	# 2. the standee, with its cream torn edge
	var figure_box := Rect2(pos + Vector2(-fig_w * 0.5, -fig_h), Vector2(fig_w, fig_h))
	var drew := PoseArt.draw_into(_board, role, pose, figure_box, not is_player,
		tint, 0.0)
	if not drew:
		var card := Rect2(pos + Vector2(-28, -46), Vector2(56, 46))
		_board.draw_rect(card, MapStyle.NODE_OUTER)
		_board.draw_rect(card, accent, false, 2.0)
		_board.draw_string(_font, card.position + Vector2(6, 20), _initials(f.display_name),
			HORIZONTAL_ALIGNMENT_LEFT, -1, 15, MapStyle.TITLE_TEXT)

	# 3. selection and target rings ride the base tab, never the figure
	if f.fighter_id == _selected_unit:
		var d := _diamond(pos, tile.x * 1.2 * depth, tile.y * 0.58 * depth)
		_board.draw_polyline(d + PackedVector2Array([d[0]]), MapStyle.TAB, 2.0, true)
	elif f.fighter_id == _hovered_target:
		var d2 := _diamond(pos, tile.x * 1.2 * depth, tile.y * 0.58 * depth)
		_board.draw_polyline(d2 + PackedVector2Array([d2[0]]), SIDE_RED, 2.0, true)

	# 4. the standee's white stand marks, doubling as the condition read
	var frac := 0.0 if f.condition_max <= 0 else float(f.condition) / float(f.condition_max)
	var bw := 46.0 * depth
	var bar := Rect2(pos + Vector2(-bw * 0.5, 12.0), Vector2(bw, 4.0))
	_board.draw_rect(bar, Color(0, 0, 0, 0.55))
	_board.draw_rect(Rect2(bar.position, Vector2(bar.size.x * frac, bar.size.y)),
		MapStyle.TAB if is_player else accent)

	var name_y := pos.y + 30.0
	_board.draw_string(_font, Vector2(pos.x - bw * 0.5, name_y), _initials(f.display_name),
		HORIZONTAL_ALIGNMENT_LEFT, -1, 12, MapStyle.TITLE_TEXT)
	if f.guard > 0:
		_board.draw_string(_font, Vector2(pos.x + 8, name_y), "G%d" % f.guard,
			HORIZONTAL_ALIGNMENT_LEFT, -1, 11, MapStyle.PARK)
	var st := _status_word(f)
	if st != "":
		_board.draw_string(_font, Vector2(pos.x - bw * 0.5, name_y + 13), st,
			HORIZONTAL_ALIGNMENT_LEFT, -1, 11, MapStyle.METRO)


func _initials(name: String) -> String:
	var parts := name.split(" ")
	if parts.size() >= 2:
		return "%s%s" % [parts[0].substr(0, 1), parts[1].substr(0, 1)]
	return name.substr(0, 2)


func _status_word(f: Fighter) -> String:
	match f.status:
		Fighter.Status.SHAKEN: return tr("battle.status.shaken")
		Fighter.Status.WOUNDED: return tr("battle.status.wounded")
		Fighter.Status.CRITICAL: return tr("battle.status.critical")
		Fighter.Status.DOWNED: return tr("battle.status.downed")
		Fighter.Status.ROUTED: return tr("battle.status.routed")
		_: return ""


# ── console ───────────────────────────────────────────────────────────────

func _refresh() -> void:
	if fight == null or _top_label == null:
		return
	# The 3D stage renders from the fight's own state, so it is rebuilt on the
	# same beat as the console rather than on a timer of its own.
	if _stage3d != null:
		_stage3d.fight = fight
		# Tell the stage who is mid-command, so the figure swings rather than
		# standing there while the console says ATTACK.
		var acting := ""
		if _pending != null and _pending.type == FightManager.Command.Type.ATTACK:
			acting = _pending.source_id
		_stage3d.refresh(acting)
	# round_number is 0 until the first resolve; the player is in round 1.
	_top_label.text = "%s %d · %s" % [
		tr("battle.round"), maxi(fight.round_number, 1), _phase_word()]

	for c in _intent_box.get_children():
		c.queue_free()
	_build_telegraphs()

	_build_crew_column()
	_build_action_column()
	_build_auto_column()


## TELEGRAPHS — what the opposition is about to do, this round.
##
## PHASING.md Phase A asks for "telegraphs that make Into the Breach readability
## real", and the gate on that phase is whether you would voluntarily fight ten
## of these. You would not, if committing is guesswork.
##
## The panel used to print BattleBuilder.opponent_intents(), which reads the
## AUTHORED intent string out of content — "secure receipts", "pin front". That
## is flavour, it is fixed for the whole battle, and it says nothing about what
## happens if you stand where you are standing. Meanwhile the fight was already
## computing a live IntentRecord every round — likely action, target lane, risk
## band — and throwing it away. This spends it.
##
## Both are shown: the authored line gives the person a motive, the live line
## gives the round a threat.
func _build_telegraphs() -> void:
	var authored: Dictionary = {}
	for a in BattleBuilder.opponent_intents(battle_id):
		authored[String(a["id"])] = String(a["intent"])

	var live: Array = fight.get_opposition_intents()
	if live.is_empty():
		# Before the first intent phase there is genuinely nothing to report.
		# Saying so beats an empty panel that reads as a broken one.
		_intent_box.add_child(_label(tr("battle.no_read_yet"), 12, PiritoriPalette.TEXT_DIM))
		return

	for rec in live:
		var f := _fighter(String(rec.fighter_id))
		if f == null:
			continue
		var name := f.display_name
		_intent_box.add_child(_label(name, 12, MapStyle.METRO))

		var motive := String(authored.get(String(rec.fighter_id), ""))
		if motive != "":
			_intent_box.add_child(_label("   " + motive, 11, PiritoriPalette.TEXT_DIM))

		_intent_box.add_child(_label("   " + _telegraph_line(rec), 12,
			_risk_colour(String(rec.risk_band))))


## One line: what they will do, and where. Lane is 1-based for the player, who
## is not counting from zero.
func _telegraph_line(rec) -> String:
	var verb := tr(_intent_verb(int(rec.likely_type)))
	if int(rec.likely_type) != FightManager.Command.Type.ATTACK:
		return verb
	# target_lane is -1 when intel is too low to read the aim. That is a real
	# state, not a missing value: not knowing IS the information, and printing
	# lane -1 would be a lie dressed as data.
	if int(rec.target_lane) < 0:
		return "%s · %s" % [verb, tr("battle.aim_unknown")]
	return "%s · %s" % [verb, tr("battle.aim_lane") % (int(rec.target_lane) + 1)]


func _intent_verb(t: int) -> String:
	match t:
		FightManager.Command.Type.ATTACK: return "battle.intent_attack"
		FightManager.Command.Type.GUARD: return "battle.intent_guard"
		FightManager.Command.Type.REPOSITION: return "battle.intent_move"
		FightManager.Command.Type.ITEM: return "battle.intent_item"
		FightManager.Command.Type.STAND_DOWN: return "battle.intent_stand_down"
		FightManager.Command.Type.WITHDRAW: return "battle.intent_withdraw"
	return "battle.intent_attack"


## Risk is the whole point of a telegraph, so it is carried by colour as well as
## by the word — a player scanning the panel should feel the lethal one before
## reading it.
func _risk_colour(band: String) -> Color:
	match band:
		"lethal": return PiritoriPalette.DANGER_RED
		"high": return PiritoriPalette.MISSION_ORANGE
		"medium": return PiritoriPalette.INTEL_MUSTARD
	return PiritoriPalette.TEXT_DIM


func _phase_word() -> String:
	match fight.phase:
		FightManager.Phase.INTENT: return tr("battle.phase.read")
		FightManager.Phase.COMMAND: return tr("battle.phase.command")
		FightManager.Phase.PLAYER_RESOLVE: return tr("battle.phase.player")
		FightManager.Phase.OPP_RESOLVE: return tr("battle.phase.opponent")
		FightManager.Phase.MORALE_CHECK: return tr("battle.phase.fallout")
		FightManager.Phase.AFTERMATH: return tr("battle.phase.done")
		_: return ""


## ART_BIBLE §12.5: "Portrait, name and condition form one block", on "broad
## dark carton panels with cream edges and one role-colour tab", and
## "Condition, guard, nerve and lethal exposure use text/numerals plus shapes;
## do not rely on tiny segments alone" — so every track shows a number AND pips.
func _build_crew_column() -> void:
	for c in _crew_col.get_children():
		c.queue_free()
	var f := _fighter(_selected_unit)
	if f == null:
		_crew_col.add_child(_label(tr("battle.select_unit"), 13, MapStyle.TINY_TEXT))
		return

	var panel := PanelContainer.new()
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color("#15191c")
	sb.border_color = MapStyle.FRAME_EDGE       # cream edge
	sb.set_border_width_all(2)
	sb.border_width_left = 5                     # the role-colour tab
	sb.content_margin_left = 10
	sb.content_margin_right = 10
	sb.content_margin_top = 8
	sb.content_margin_bottom = 8
	panel.add_theme_stylebox_override("panel", sb)
	_crew_col.add_child(panel)

	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 10)
	panel.add_child(row)

	# portrait, cut from the unit's own idle pose
	var pic := Control.new()
	pic.custom_minimum_size = Vector2(64, 64)
	var role := String(f.role)
	pic.draw.connect(func():
		var box := Rect2(Vector2.ZERO, pic.size)
		pic.draw_rect(box, Color("#0d1215"))
		if not PoseArt.draw_portrait(pic, role, box):
			pic.draw_string(_font, Vector2(6, 38), _initials(f.display_name),
				HORIZONTAL_ALIGNMENT_LEFT, -1, 22, MapStyle.TITLE_TEXT)
		pic.draw_rect(box, _role_color(role), false, 2.0))
	row.add_child(pic)

	var info := VBoxContainer.new()
	info.add_theme_constant_override("separation", 3)
	info.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_child(info)

	info.add_child(_label(f.display_name, 16, MapStyle.TITLE_TEXT))

	# Cover was fully implemented in the resolver and drawn on the board as an
	# unlabelled green rectangle, so it changed fights without ever telling
	# anyone. Say it where the decision is made.
	var standing := fight.cover_under(f.slot.x, f.slot.y, f.side)
	if standing.get("is_cover", false):
		info.add_child(_label(tr("battle.in_cover") % _prop_words(standing),
			12, PiritoriPalette.ROUTE_GREEN))
	info.add_child(_track_row(tr("battle.condition"), f.condition, f.condition_max,
		Color("#c8443c")))
	info.add_child(_track_row(tr("battle.guard"), f.guard, maxi(f.condition_max, 5),
		SIDE_CYAN))
	info.add_child(_track_row(tr("battle.nerve"), f.nerve, f.nerve_max,
		MapStyle.GOODS))

	var w: Dictionary = EquipmentRules.weapons().get(f.held_weapon_id, {})
	var reach := String(w.get("reach_pattern", "")).replace("-", " ")
	# Unarmed has no reach pattern, and joining an empty field left "· ·".
	var bits: PackedStringArray = [String(w.get("name", ""))]
	if reach != "":
		bits.append(reach)
	bits.append("%s %d" % [tr("battle.tempo"), f.tempo])
	bits.append(BattleBuilder.cell_name(f.slot.x, f.slot.y))
	_crew_col.add_child(_label(" · ".join(bits), 11, MapStyle.TINY_TEXT))

	# Lethal exposure is a WORD, never a colour alone.
	if bool(w.get("lethal", false)):
		_crew_col.add_child(_label(tr("battle.lethal_risk"), 11, Color("#c8443c")))


## One track: name, numerals, and pips. Both channels, per §12.5.
func _track_row(name: String, value: int, maximum: int, col: Color) -> Control:
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 6)
	var l := _label(name, 11, MapStyle.TINY_TEXT)
	l.custom_minimum_size = Vector2(64, 0)
	row.add_child(l)
	var n := _label("%d/%d" % [value, maximum], 12, MapStyle.TITLE_TEXT)
	n.custom_minimum_size = Vector2(38, 0)
	row.add_child(n)

	var pips := Control.new()
	pips.custom_minimum_size = Vector2(84, 12)
	pips.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	pips.draw.connect(func():
		var count: int = clampi(maximum, 1, 10)
		var w := (pips.size.x - float(count - 1) * 2.0) / float(count)
		for i in range(count):
			var r := Rect2(float(i) * (w + 2.0), 1.0, w, pips.size.y - 2.0)
			var filled := i < int(round(float(value) / float(maximum) * float(count)))
			pips.draw_rect(r, col if filled else Color(1, 1, 1, 0.08))
			pips.draw_rect(r, col.darkened(0.4), false, 1.0))
	row.add_child(pips)
	return row


## ART_BIBLE §12.5: "Commands use large labelled icon cards."
func _build_action_column() -> void:
	for c in _action_col.get_children():
		c.queue_free()
	if fight.phase != FightManager.Phase.COMMAND:
		_action_col.add_child(_label(_phase_word(), 15, MapStyle.TINY_TEXT))
		return
	var f := _fighter(_selected_unit)
	if f == null or not f.can_act():
		_action_col.add_child(_label(tr("battle.select_unit"), 13, MapStyle.TINY_TEXT))
		return

	# The police are here and nobody has answered them. That question outranks
	# everything else on the console: COMBAT.md §9.5.2 makes the posture the
	# thing that turns an arrival into a decision, so it takes the whole column
	# rather than sitting under the ordinary actions.
	if fight.police_awaiting_posture():
		_build_police_choice()
		return

	# What the pending attack will actually run into, shown BEFORE the button
	# that commits it — a warning underneath the result is a post-mortem.
	if _pending != null and _pending.target_id != "":
		var warn := _cover_warning_for(_pending.target_id)
		if warn != null:
			_action_col.add_child(warn)

	var grid := HBoxContainer.new()
	grid.add_theme_constant_override("separation", 8)
	_action_col.add_child(grid)

	grid.add_child(_action_card(tr("battle.attack"), PiritoriIcon.Kind.STRIKE,
		Color("#c8443c"), func(): _begin_attack(f)))
	grid.add_child(_action_card(tr("battle.brace"), PiritoriIcon.Kind.SHIELD,
		SIDE_CYAN, func(): _issue_simple(FightManager.Command.Type.GUARD, f)))
	grid.add_child(_action_card(tr("battle.reposition"), PiritoriIcon.Kind.SWAP,
		MapStyle.METRO, func(): _begin_reposition(f)))
	grid.add_child(_action_card(tr("battle.item"), PiritoriIcon.Kind.STOCK,
		MapStyle.PARK, func(): _use_item(f)))

	# An honest empty state. _begin_attack sets a note and clears _pending when
	# nothing is in reach, but this panel only drew when _pending was non-null,
	# so the note was computed and never shown: tapping Attack with no target
	# did visibly nothing at all. §18.3 forbids a dead end the player cannot
	# see, and a button that silently refuses is exactly that.
	if _pending == null and _forecast.has("note"):
		var nl := _label(String(_forecast["note"]), 13, MapStyle.SMALL_TEXT)
		nl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		_action_col.add_child(nl)

	# The forecast, before commitment (handoff §5, GDD §13.5).
	if _pending != null:
		var fc: Dictionary = _forecast
		var lines_out: PackedStringArray = []
		if fc.has("harm_min"):
			lines_out.append("%s %d-%d" % [tr("battle.harm"), int(fc["harm_min"]), int(fc["harm_max"])])
		if fc.has("hit_chance"):
			lines_out.append("%s %d%%" % [tr("battle.chance"), int(round(float(fc["hit_chance"]) * 100.0))])
		if fc.has("risk_band"):
			lines_out.append("%s %s" % [tr("battle.risk"), String(fc["risk_band"])])
		var lethal := bool(fc.get("lethal_exposure", false))
		if lethal:
			lines_out.append(tr("battle.lethal_risk"))
		var fl := _label(" · ".join(lines_out), 13,
			Color("#c8443c") if lethal else MapStyle.SMALL_TEXT)
		fl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		_action_col.add_child(fl)
		_action_col.add_child(_action_card(tr("battle.confirm"),
			PiritoriIcon.Kind.MISSION, MapStyle.TITLE_TEXT, _confirm_pending, true))


## A large labelled icon card: the icon above its word, both in the accent, on
## the dark carton panel with a cream edge.
func _action_card(text: String, kind: int, accent: Color, handler: Callable,
		wide: bool = false) -> Button:
	var b := Button.new()
	b.custom_minimum_size = Vector2(0 if wide else 92, 62)
	b.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	b.tooltip_text = text
	b.focus_mode = Control.FOCUS_ALL

	var sb := StyleBoxFlat.new()
	sb.bg_color = Color("#15191c")
	sb.border_color = MapStyle.FRAME_EDGE
	sb.set_border_width_all(2)
	var hover := sb.duplicate()
	hover.bg_color = MapStyle.STREET_BED
	hover.border_color = accent
	b.add_theme_stylebox_override("normal", sb)
	b.add_theme_stylebox_override("disabled", sb)
	for st in ["hover", "pressed", "focus"]:
		b.add_theme_stylebox_override(st, hover)

	var col := VBoxContainer.new()
	col.set_anchors_preset(Control.PRESET_FULL_RECT)
	col.alignment = BoxContainer.ALIGNMENT_CENTER
	col.add_theme_constant_override("separation", 2)
	col.mouse_filter = Control.MOUSE_FILTER_IGNORE

	var icon := PiritoriIcon.new(kind, accent, 24.0)
	icon.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	col.add_child(icon)
	var l := _label(text, 12, accent)
	l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	l.mouse_filter = Control.MOUSE_FILTER_IGNORE
	col.add_child(l)
	b.add_child(col)

	b.pressed.connect(handler)
	return b


## §13.6 lists "Use item" among the common actions.
func _use_item(f: Fighter) -> void:
	if f.item_ids.is_empty():
		_forecast = {"note": tr("battle.no_item")}
		_refresh()
		return
	var cmd := FightManager.Command.new(FightManager.Command.Type.ITEM, f.fighter_id)
	cmd.item_id = String(f.item_ids[0])
	_pending = cmd
	_forecast = fight.get_command_forecast(cmd)
	_refresh()


## §12.5: "AUTO and WITHDRAW remain visually separate from immediate actions."
## Their own column, in muted chrome rather than action accents.
## The face-off: who is here, on both sides, and what leaving would cost.
##
## A panel over the board rather than in the rail — the rail belongs to the
## shell and a battle does not have one. Confirmed or refused, and refusing
## returns you to the fight with nothing spent: a screen that only goes forward
## is a trap rather than a choice.
func _show_faceoff() -> void:
	if _faceoff != null and is_instance_valid(_faceoff):
		_faceoff.queue_free()
	_faceoff = PanelContainer.new()
	_faceoff.add_theme_stylebox_override("panel", _panel(MapStyle.DARK_TAB, 2, 2))
	_faceoff.set_anchors_preset(Control.PRESET_CENTER)
	_faceoff.anchor_left = 0.30
	_faceoff.anchor_right = 0.70
	_faceoff.anchor_top = 0.12
	_faceoff.anchor_bottom = 0.74
	_faceoff.offset_left = 0.0
	_faceoff.offset_right = 0.0
	_faceoff.offset_top = 0.0
	_faceoff.offset_bottom = 0.0
	add_child(_faceoff)

	var pad := MarginContainer.new()
	for side in ["left", "right", "top", "bottom"]:
		pad.add_theme_constant_override("margin_" + side, 18)
	_faceoff.add_child(pad)

	var col := VBoxContainer.new()
	col.add_theme_constant_override("separation", 6)
	pad.add_child(col)
	col.add_child(_label(tr("battle.faceoff"), 19, MapStyle.TITLE_TEXT))

	for pair in [[tr("battle.faceoff_yours"), Fighter.Side.PLAYER, SIDE_CYAN],
			[tr("battle.faceoff_theirs"), Fighter.Side.OPPOSITION, SIDE_RED]]:
		col.add_child(_label(String(pair[0]), 12, Color(pair[2])))
		for f in fight.get_fighters(pair[1]):
			if f == null:
				continue
			col.add_child(_label("   %s · %s" % [f.display_name, f.role],
				13, MapStyle.SMALL_TEXT))

	var cost := String(ContentRegistry.battle(battle_id)
		.get("withdrawal", {}).get("known_cost", ""))
	if cost != "":
		var cl := _label(cost, 11, MapStyle.TINY_TEXT)
		cl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		col.add_child(cl)

	col.add_child(_chrome_button(tr("battle.faceoff_go"), MapStyle.GOODS,
		_skip_to_result))
	col.add_child(_chrome_button(tr("battle.faceoff_back"), MapStyle.TINY_TEXT,
		_close_faceoff))


func _close_faceoff() -> void:
	if _faceoff != null and is_instance_valid(_faceoff):
		_faceoff.queue_free()
	_faceoff = null
	_refresh()


## Resolve the whole fight without playing it. The stance still applies, so this
## is not free of the player's judgement — a crew told to be aggressive dies
## differently from one told to hold.
func _skip_to_result() -> void:
	_close_faceoff()
	fight.resolve_to_end()
	_pending = null
	_refresh()


func _build_auto_column() -> void:
	for c in _auto_col.get_children():
		c.queue_free()
	_auto_col.add_child(_label(tr("battle.automation"), 11, MapStyle.TINY_TEXT))

	# §13.7: Auto uses the same actions, targets and telegraphed intent — it is
	# NOT a statistical auto-resolve. The toggle states which mode is in force.
	var auto := _chrome_button(
		tr("battle.auto_on") if _auto_mode else tr("battle.auto_off"),
		SIDE_CYAN if _auto_mode else MapStyle.TINY_TEXT,
		func():
			_auto_mode = not _auto_mode
			if _auto_mode:
				fight.confirm_commands()
				_pending = null
				_select_first_actionable()
			_refresh())
	_auto_col.add_child(auto)

	# STANCE — how the auto-battler is instructed (COMBAT.md §6.2). It belongs
	# to auto and appears with it: a stance while playing manually would be a
	# control that does nothing, which is worse than an absent one.
	#
	# §6.3: a stance is never gated on having a named character. Nothing here
	# checks the roster, because gating a convenience feature behind a rare
	# resource punishes exactly the players it exists for.
	if _auto_mode:
		_auto_col.add_child(_label(tr("battle.stance"), 11, MapStyle.TINY_TEXT))
		for st in [FightManager.Stance.AGGRESSIVE,
				FightManager.Stance.DEFENSIVE,
				FightManager.Stance.HOLD_THE_LINE]:
			var on: bool = fight.player_stance == st
			var b := _chrome_button(
				tr(FightManager.stance_name(st)),
				SIDE_CYAN if on else MapStyle.TINY_TEXT,
				func():
					fight.player_stance = st
					_refresh())
			_auto_col.add_child(b)

	# SKIP TO RESULT (COMBAT.md §6.4) — the third tier, for players here for the
	# story. It goes through a FACE-OFF first: the beat is what stops skipping
	# reading as an admin action. You still see who you are up against and what
	# it costs; you just do not play it out.
	# SKIP and WITHDRAW share a row. Stacked, they pushed the console 44px past
	# the bottom of the viewport — the console is a fixed-height overlay now, so
	# anything added to it has to earn its height rather than assume it.
	var exits := HBoxContainer.new()
	exits.add_theme_constant_override("separation", 6)
	_auto_col.add_child(exits)

	var skip := _chrome_button(tr("battle.skip"), MapStyle.GOODS, _show_faceoff)
	skip.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	exits.add_child(skip)

	var wd := _chrome_button(tr("battle.withdraw"), MapStyle.METRO, _withdraw)
	wd.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	wd.tooltip_text = String(ContentRegistry.battle(battle_id)
		.get("withdrawal", {}).get("known_cost", ""))
	exits.add_child(wd)
	var cost := _label(wd.tooltip_text, 10, MapStyle.TINY_TEXT)
	cost.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_auto_col.add_child(cost)

	if fight.stand_down_available():
		_auto_col.add_child(_chrome_button(tr("battle.negotiate"), MapStyle.PARK,
			_negotiate))


## Chrome, not an action: no icon card, flatter, deliberately quieter.
func _chrome_button(text: String, accent: Color, handler: Callable) -> Button:
	var b := Button.new()
	b.text = text
	b.custom_minimum_size = Vector2(0, 44)
	b.add_theme_font_size_override("font_size", 13)
	b.add_theme_color_override("font_color", accent)
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color("#101417")
	sb.border_color = Color("#3a4143")
	sb.set_border_width_all(1)
	b.add_theme_stylebox_override("normal", sb)
	b.pressed.connect(handler)
	return b


# ── commands ──────────────────────────────────────────────────────────────

func _begin_attack(f: Fighter) -> void:
	var targets: Array = fight.attack_targets_for(f.fighter_id)
	if targets.is_empty():
		_pending = null
		_forecast = {"note": tr("battle.no_target")}
		_refresh()
		return
	var cmd := FightManager.Command.new(FightManager.Command.Type.ATTACK, f.fighter_id)
	cmd.target_id = String(targets[0])
	_pending = cmd
	_hovered_target = cmd.target_id
	_forecast = fight.get_command_forecast(cmd)
	_refresh()


func _begin_reposition(f: Fighter) -> void:
	var free := _reachable_slots(f)
	if free.is_empty():
		return
	var cmd := FightManager.Command.new(FightManager.Command.Type.REPOSITION, f.fighter_id)
	cmd.target_slot = free[0]
	_pending = cmd
	_forecast = fight.get_command_forecast(cmd)
	_refresh()


func _issue_simple(type: int, f: Fighter) -> void:
	var cmd := FightManager.Command.new(type, f.fighter_id)
	_pending = cmd
	_forecast = fight.get_command_forecast(cmd)
	_refresh()


func _confirm_pending() -> void:
	if _pending == null:
		return
	fight.submit_player_command(_pending)
	_pending = null
	_hovered_target = ""
	_forecast = {}
	_select_first_actionable()
	_refresh()


func _withdraw() -> void:
	var f := _fighter(_selected_unit)
	if f == null:
		return
	var cmd := FightManager.Command.new(FightManager.Command.Type.WITHDRAW, f.fighter_id)
	fight.submit_player_command(cmd)
	_refresh()


func _negotiate() -> void:
	var f := _fighter(_selected_unit)
	if f == null:
		return
	var cmd := FightManager.Command.new(FightManager.Command.Type.STAND_DOWN, f.fighter_id)
	fight.submit_player_command(cmd)
	_refresh()


func _on_battle_ended(result: int) -> void:
	battle_finished.emit(result)
	_refresh()


# ── input and helpers ─────────────────────────────────────────────────────

func _board_input(event: InputEvent) -> void:
	var pos: Vector2
	if event is InputEventMouseButton and event.pressed \
			and event.button_index == MOUSE_BUTTON_LEFT:
		pos = event.position
	elif event is InputEventScreenTouch and event.pressed:
		pos = event.position
	else:
		return

	var hit := _unit_at(pos)
	if hit == "":
		return
	var f := _fighter(hit)
	if f == null:
		return
	if f.side == Fighter.Side.PLAYER:
		_selected_unit = hit
		_pending = null
		_forecast = {}
	elif _pending != null and _pending.type == FightManager.Command.Type.ATTACK:
		_pending.target_id = hit
		_hovered_target = hit
		_forecast = fight.get_command_forecast(_pending)
	_refresh()


func _unit_at(p: Vector2) -> String:
	for f in _all_fighters():
		var c := _cell_pos(f.slot.x, f.slot.y, int(f.side))
		if Rect2(c + Vector2(-_tile().x * 0.6, -_tile().y * 2.15), Vector2(_tile().x * 1.2, _tile().y * 2.5)).has_point(p):
			return f.fighter_id
	return ""


func _all_fighters() -> Array:
	var out: Array = []
	for side in [Fighter.Side.PLAYER, Fighter.Side.OPPOSITION]:
		for f in fight.get_fighters(side):
			out.append(f)
	return out


func _fighter(id: String) -> Fighter:
	if id == "":
		return null
	for f in _all_fighters():
		if f.fighter_id == id:
			return f
	return null


func _select_first_actionable() -> void:
	if fight == null:
		return
	for f in fight.get_fighters(Fighter.Side.PLAYER):
		if f.can_act():
			_selected_unit = f.fighter_id
			return
	_selected_unit = ""


func _label(text: String, px: int, col: Color) -> Label:
	var l := Label.new()
	l.text = text
	l.add_theme_font_size_override("font_size", px)
	l.add_theme_color_override("font_color", col)
	return l


func _action_btn(text: String, accent: Color, handler: Callable) -> Button:
	var b := Button.new()
	b.text = text
	b.custom_minimum_size = Vector2(112, 48)   ## 44px floor, 48 preferred
	b.add_theme_font_size_override("font_size", 14)
	b.add_theme_color_override("font_color", accent)
	var sb := StyleBoxFlat.new()
	sb.bg_color = MapStyle.STREET_BED
	sb.border_color = MapStyle.DARK_TAB_EDGE
	sb.set_border_width_all(2)
	b.add_theme_stylebox_override("normal", sb)
	b.pressed.connect(handler)
	return b


func _panel(bg: Color, top: int, bottom: int) -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	sb.bg_color = bg
	sb.border_color = MapStyle.FRAME_EDGE
	sb.border_width_top = top
	sb.border_width_bottom = bottom
	return sb
