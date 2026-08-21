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
const CENTRE_GAP := 1.15                   ## tiles from the centre line to a front row

## Where the PLAYABLE FLOOR sits on each backdrop plate, normalised to the
## plate. The board is fitted into this instead of into the whole screen, which
## is what put the far rank on top of a building.
##
## This belongs in art/v3/manifest.json beside `portrait_safe_bounds`, as a
## `play_area` on each scene asset. It lives here until the owner approves that
## addition — a port-side estimate, not canon.
const PLAY_AREA := {
	"scene-courtyard-prototype-v02": Rect2(0.18, 0.50, 0.64, 0.32),
	"scene-karhupuisto-v01": Rect2(0.16, 0.46, 0.66, 0.30),
}
const PLAY_AREA_DEFAULT := Rect2(0.16, 0.52, 0.66, 0.32)

## The play area constrains where FEET may land, not where art may reach. A
## standing figure overlapping the wall behind it is correct isometric
## occlusion; the bug was units standing ON the building. Reserving headroom
## here instead pushed the whole board down into the console.
const FIGURE_HEADROOM := 0.0

var fight: FightManager
var battle_id: String = ""

var _board: Control
var _top_strip: PanelContainer
var _top_label: Label
var _intent_box: HBoxContainer
var _console: PanelContainer
var _crew_col: VBoxContainer
var _action_col: VBoxContainer
var _auto_col: VBoxContainer

var _selected_unit: String = ""
var _hovered_target: String = ""
var _pending: FightManager.Command = null
var _forecast: Dictionary = {}
var _font: Font
var _t := 0.0
## The two sides read cyan and red, as in the owner's target renders.
const SIDE_CYAN := Color("#57c8e8")
const SIDE_RED := Color("#c8443c")

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

	# ── the encounter, above the console ──
	_board = Control.new()
	_board.size_flags_vertical = Control.SIZE_EXPAND_FILL
	_board.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_board.mouse_filter = Control.MOUSE_FILTER_STOP
	_board.draw.connect(_draw_board)
	_board.gui_input.connect(_board_input)
	col.add_child(_board)

	# ── substantial bottom console ──
	_console = PanelContainer.new()
	_console.add_theme_stylebox_override("panel", _panel(MapStyle.DARK_TAB, 2, 0))
	_console.custom_minimum_size = Vector2(0, 188)
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
	col.add_child(_console)


func _process(dt: float) -> void:
	_t += dt
	if _board:
		_board.queue_redraw()


# ── isometric board ───────────────────────────────────────────────────────

## Cell centre for (lane, row) on one side. Player is the left half-board,
## opposition the right; both are mirrors of one location (§13.3).
## The plate is drawn cover-fitted, so the play area has to be mapped through
## exactly the same transform to land on the floor it was measured against.
func _plate_rect() -> Rect2:
	if _stage == null:
		return Rect2(Vector2.ZERO, _board.size)
	var ts := _stage.get_size()
	if ts.x <= 0.0 or ts.y <= 0.0:
		return Rect2(Vector2.ZERO, _board.size)
	var sc: float = maxf(_board.size.x / ts.x, _board.size.y / ts.y)
	var drawn := ts * sc
	return Rect2((_board.size - drawn) * 0.5, drawn)


func _play_rect() -> Rect2:
	var norm: Rect2 = PLAY_AREA.get(_stage_id, PLAY_AREA_DEFAULT)
	var plate := _plate_rect()
	var r := Rect2(
		plate.position + Vector2(norm.position.x * plate.size.x, norm.position.y * plate.size.y),
		Vector2(norm.size.x * plate.size.x, norm.size.y * plate.size.y))
	# Reserve headroom at the FAR edge for the standing figures.
	var head := r.size.y * FIGURE_HEADROOM
	r.position.y += head
	r.size.y -= head
	return r


## Tile size derived from the floor, so the board always fits the location.
## Board extent is (CENTRE_GAP + 2 rows + 1 lane) tiles from the centre, both
## ways, along each isometric axis.
func _tile() -> Vector2:
	var r := _play_rect()
	var reach := (CENTRE_GAP + 2.0) + 1.0
	var tx: float = r.size.x / (2.0 * reach)
	var ty: float = r.size.y / (reach)
	return Vector2(maxf(tx, 18.0), maxf(ty, 16.0))


func _cell_pos(lane: int, row: int, side: int) -> Vector2:
	var r := _play_rect()
	var c := r.get_center()
	var tile := _tile()
	var dir := -1.0 if side == int(Fighter.Side.PLAYER) else 1.0

	var fwd := Vector2(FORWARD.x * tile.x, FORWARD.y * tile.y) * dir
	var lane_v := Vector2(LANE_AXIS.x * tile.x, LANE_AXIS.y * tile.y) * dir

	return c + fwd * (CENTRE_GAP + float(row)) + lane_v * (float(lane) - 1.0)


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

	var reveal := _cells_to_reveal()

	for side in [int(Fighter.Side.PLAYER), int(Fighter.Side.OPPOSITION)]:
		for lane in range(3):
			for row in range(3):
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
	var role := String(f.behaviour_package)

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
	# round_number is 0 until the first resolve; the player is in round 1.
	_top_label.text = "%s %d · %s" % [
		tr("battle.round"), maxi(fight.round_number, 1), _phase_word()]

	for c in _intent_box.get_children():
		c.queue_free()
	for intent in BattleBuilder.opponent_intents(battle_id):
		var l := _label("%s: %s" % [intent["name"], intent["intent"]], 12, MapStyle.METRO)
		_intent_box.add_child(l)

	_build_crew_column()
	_build_action_column()
	_build_auto_column()


func _phase_word() -> String:
	match fight.phase:
		FightManager.Phase.INTENT: return tr("battle.phase.read")
		FightManager.Phase.COMMAND: return tr("battle.phase.command")
		FightManager.Phase.PLAYER_RESOLVE: return tr("battle.phase.player")
		FightManager.Phase.OPP_RESOLVE: return tr("battle.phase.opponent")
		FightManager.Phase.MORALE_CHECK: return tr("battle.phase.fallout")
		FightManager.Phase.AFTERMATH: return tr("battle.phase.done")
		_: return ""


func _build_crew_column() -> void:
	for c in _crew_col.get_children():
		c.queue_free()
	var f := _fighter(_selected_unit)
	if f == null:
		_crew_col.add_child(_label(tr("battle.select_unit"), 13, MapStyle.TINY_TEXT))
		return
	_crew_col.add_child(_label(f.display_name, 17, MapStyle.TITLE_TEXT))
	_crew_col.add_child(_label("%s %d/%d · %s %d/%d" % [
		tr("battle.condition"), f.condition, f.condition_max,
		tr("battle.nerve"), f.nerve, f.nerve_max], 13, MapStyle.SMALL_TEXT))
	_crew_col.add_child(_label("%s %d · %s %d · %s" % [
		tr("battle.guard"), f.guard, tr("battle.tempo"), f.tempo,
		BattleBuilder.cell_name(f.slot.x, f.slot.y)], 12, MapStyle.TINY_TEXT))
	var w: Dictionary = EquipmentRules.weapons().get(f.held_weapon_id, {})
	if not w.is_empty():
		_crew_col.add_child(_label("%s · %s" % [
			String(w.get("name", "")), String(w.get("reach_pattern", "")).replace("-", " ")],
			12, MapStyle.ROUTE))


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

	var grid := HBoxContainer.new()
	grid.add_theme_constant_override("separation", 8)
	_action_col.add_child(grid)

	grid.add_child(_action_btn(tr("battle.attack"), MapStyle.GOODS,
		func(): _begin_attack(f)))
	grid.add_child(_action_btn(tr("battle.brace"), MapStyle.PARK,
		func(): _issue_simple(FightManager.Command.Type.GUARD, f)))
	grid.add_child(_action_btn(tr("battle.reposition"), MapStyle.ROUTE,
		func(): _begin_reposition(f)))

	# The forecast is shown BEFORE commitment (handoff §5, GDD §13.5).
	if _pending != null:
		var fc: Dictionary = _forecast
		var lines: PackedStringArray = []
		if fc.has("harm_min"):
			lines.append("%s %d-%d" % [tr("battle.harm"), int(fc["harm_min"]), int(fc["harm_max"])])
		if fc.has("hit_chance"):
			lines.append("%s %d%%" % [tr("battle.chance"), int(round(float(fc["hit_chance"]) * 100.0))])
		if bool(fc.get("lethal_exposure", false)):
			lines.append(tr("battle.lethal_risk"))
		if fc.has("risk_band"):
			lines.append("%s %s" % [tr("battle.risk"), String(fc["risk_band"])])
		var fl := _label(" · ".join(lines), 13,
			Color("#A94B43") if bool(fc.get("lethal_exposure", false)) else MapStyle.SMALL_TEXT)
		fl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		_action_col.add_child(fl)

		var confirm := _action_btn(tr("battle.confirm"), MapStyle.TITLE_TEXT, _confirm_pending)
		_action_col.add_child(confirm)


func _build_auto_column() -> void:
	for c in _auto_col.get_children():
		c.queue_free()
	_auto_col.add_child(_label(tr("battle.automation"), 12, MapStyle.TINY_TEXT))

	# §13.7: Auto uses the same actions and rules; it is not a statistical
	# auto-resolve, so it simply fills any unset command and resolves the round.
	var auto := _action_btn(tr("battle.auto_round"), MapStyle.ROUTE, func():
		fight.confirm_commands()
		_pending = null
		_select_first_actionable())
	_auto_col.add_child(auto)

	var wd := _action_btn(tr("battle.withdraw"), MapStyle.METRO, _withdraw)
	wd.tooltip_text = String(ContentRegistry.battle(battle_id)
		.get("withdrawal", {}).get("known_cost", ""))
	_auto_col.add_child(wd)
	_auto_col.add_child(_label(wd.tooltip_text, 11, MapStyle.TINY_TEXT))

	if fight.stand_down_available():
		_auto_col.add_child(_action_btn(tr("battle.negotiate"), MapStyle.PARK, _negotiate))


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
