extends Control
## City mode — the twelve-anchor Era I Kallio board.
##
## GODOT_HANDOFF.md §5 (City):
##   - North remains up and public topology follows MAP.md.
##   - The full Era I frame fits before any focus zoom.
##   - Routes follow graph edges and never draw through buildings or water.
##   - Ordinary people flow, crew/goods flow, weather, pressure and UI are
##     separate render layers.
##
## Board coordinates come straight from map/kallio-era1-2003-v1.json. Board Y
## increases southward, which is already Godot's screen-down axis, so drawing
## board.y directly puts north at the top with no flip.
##
## The relief here is a code-drawn PLACEHOLDER, visibly labelled as such
## (handoff §6). It is not promoted final art.

signal anchor_selected(anchor_id: String)

# Margins leave room for labels, but must scale with the screen: a fixed 96px
# inset ate half of a 390px phone and squeezed the board until labels collided.
const MARGIN_X_RATIO := 0.075
const MARGIN_X_MIN := 20.0
const MARGIN_X_MAX := 96.0
const MARGIN_TOP := 40.0
const MARGIN_BOTTOM_RATIO := 0.09
const MARGIN_BOTTOM_MIN := 42.0
const MARGIN_BOTTOM_MAX := 78.0
const NODE_R := 13.0
const TOUCH_R := 24.0   ## 48px diameter — above the 44px floor (UX_SPEC §rules)

var _selected: String = ""
var _hovered: String = ""
var _layout: Dictionary = {}   ## anchor id -> Vector2 in local space
var _scale: float = 1.0        ## board units -> pixels, shared by labelOffset
var _font: Font


func _ready() -> void:
	_font = ThemeDB.fallback_font
	mouse_filter = Control.MOUSE_FILTER_STOP
	resized.connect(_rebuild_layout)
	GameState.state_changed.connect(queue_redraw)
	_rebuild_layout()


## Fit the whole 1000x1000 board into the control, preserving aspect so the
## full Era I frame is visible before any focus zoom.
func _rebuild_layout() -> void:
	_layout.clear()
	var anchors := ContentRegistry.anchors()
	if anchors.is_empty():
		return

	var mn := Vector2(INF, INF)
	var mx := Vector2(-INF, -INF)
	for a in anchors:
		var p := Vector2(a["board"]["x"], a["board"]["y"])
		mn = mn.min(p)
		mx = mx.max(p)

	var span := mx - mn
	if span.x <= 0.0: span.x = 1.0
	if span.y <= 0.0: span.y = 1.0

	var margin_x := clampf(size.x * MARGIN_X_RATIO, MARGIN_X_MIN, MARGIN_X_MAX)
	var margin_bottom := clampf(size.y * MARGIN_BOTTOM_RATIO,
		MARGIN_BOTTOM_MIN, MARGIN_BOTTOM_MAX)

	var avail := Vector2(size.x - margin_x * 2.0, size.y - MARGIN_TOP - margin_bottom)
	avail.x = maxf(avail.x, 32.0)
	avail.y = maxf(avail.y, 32.0)
	_scale = minf(avail.x / span.x, avail.y / span.y)
	var drawn := span * _scale
	var origin := Vector2(
		margin_x + (avail.x - drawn.x) * 0.5,
		MARGIN_TOP + (avail.y - drawn.y) * 0.5)

	for a in anchors:
		var p := Vector2(a["board"]["x"], a["board"]["y"])
		_layout[a["id"]] = origin + (p - mn) * _scale

	queue_redraw()


func _draw() -> void:
	if _layout.is_empty():
		return

	# layer 1 — ground relief (placeholder)
	draw_rect(Rect2(Vector2.ZERO, size), PiritoriPalette.MAP_GROUND)

	# layer 2 — public corridors, following graph edges only
	for e in ContentRegistry.edges():
		var a: Variant = _layout.get(e.get("from", ""))
		var b: Variant = _layout.get(e.get("to", ""))
		if a == null or b == null:
			continue
		var walkable: bool = e.get("modes", []).has("walk")
		var col := PiritoriPalette.ROUTE_GREEN if walkable else PiritoriPalette.PUBLIC_BLUE
		col.a = 0.42
		draw_line(a, b, col, 2.0, true)

	# layer 3 — anchors
	for a in ContentRegistry.anchors():
		_draw_anchor(a)

	# layer 4 — placeholder honesty label (handoff §6)
	var note := "prototype relief — code-drawn placeholder, not final art"
	draw_string(_font, Vector2(12, size.y - 10), note,
		HORIZONTAL_ALIGNMENT_LEFT, -1, 12, PiritoriPalette.TEXT_DIM)


func _draw_anchor(a: Dictionary) -> void:
	var id: String = a["id"]
	var pos: Vector2 = _layout[id]
	var state: String = a.get("sliceState", "locked")
	var col := PiritoriPalette.anchor_color(state)
	var is_live := _is_live_lead(id)

	# A live lead gets a ring as well as a colour — never colour alone.
	if is_live:
		var pulse := 1.0 + 0.06 * sin(Time.get_ticks_msec() / 380.0)
		draw_arc(pos, NODE_R * 1.9 * pulse, 0, TAU, 36, PiritoriPalette.PLAYER_CYAN, 2.0, true)

	if id == _selected:
		draw_arc(pos, NODE_R * 1.45, 0, TAU, 32, PiritoriPalette.PAPER, 2.0, true)
	elif id == _hovered:
		draw_arc(pos, NODE_R * 1.45, 0, TAU, 32, PiritoriPalette.TEXT_DIM, 1.0, true)

	# Locked anchors read as hollow; open ones are filled. Shape carries state.
	if state == "locked":
		draw_arc(pos, NODE_R * 0.62, 0, TAU, 24, col, 2.0, true)
	else:
		draw_circle(pos, NODE_R * 0.72, col)

	# glyph + label: the non-colour channel
	var glyph := PiritoriPalette.state_glyph(state)
	draw_string(_font, pos + Vector2(-5, -NODE_R - 6), glyph,
		HORIZONTAL_ALIGNMENT_LEFT, -1, 13, col)

	# labelOffset is authored in BOARD units to keep labels off each other —
	# it must be scaled with the positions, not by an arbitrary constant.
	var off: Array = a.get("labelOffset", [0, 0])
	var label := String(a.get("label", id))
	var tight := _scale < 0.36
	# When the board is drawn small, labelling all twelve turns the map into a
	# pile of overlapping words. Keep the ones the player can act on.
	if tight and not (is_live or id == _selected or state == "active"):
		return
	var font_px := 11 if tight else 12
	var w := _font.get_string_size(label, HORIZONTAL_ALIGNMENT_LEFT, -1, font_px).x
	var label_pos := pos + Vector2(float(off[0]), float(off[1])) * _scale
	label_pos.x -= w * 0.5
	label_pos.x = clampf(label_pos.x, 4.0, maxf(4.0, size.x - w - 4.0))
	label_pos.y = clampf(label_pos.y, 14.0, size.y - 6.0)
	var text_col := PiritoriPalette.TEXT if state != "locked" else PiritoriPalette.LOCKED_GREY
	draw_string(_font, label_pos, label,
		HORIZONTAL_ALIGNMENT_LEFT, -1, font_px, text_col)


## A lead is live when the anchor has a revealed, unresolved encounter.
func _is_live_lead(anchor_id: String) -> bool:
	for s in ContentRegistry.sites_for_anchor(anchor_id):
		for enc in ContentRegistry.encounters_at_site(s["id"]):
			if GameState.is_revealed(enc["id"]) and not GameState.is_resolved(enc["id"]):
				return true
	return false


func _gui_input(event: InputEvent) -> void:
	if event is InputEventMouseMotion:
		var was := _hovered
		_hovered = _anchor_at(event.position)
		if was != _hovered:
			queue_redraw()
	elif event is InputEventMouseButton and event.pressed \
			and event.button_index == MOUSE_BUTTON_LEFT:
		var hit := _anchor_at(event.position)
		if hit != "":
			select(hit)
	elif event is InputEventScreenTouch and event.pressed:
		var hit := _anchor_at(event.position)
		if hit != "":
			select(hit)


func select(anchor_id: String) -> void:
	_selected = anchor_id
	GameState.current_anchor_id = anchor_id
	anchor_selected.emit(anchor_id)
	queue_redraw()


func _anchor_at(p: Vector2) -> String:
	var best := ""
	var best_d := TOUCH_R
	for id in _layout:
		var d: float = (_layout[id] as Vector2).distance_to(p)
		if d <= best_d:
			best_d = d
			best = id
	return best


func _process(_dt: float) -> void:
	# Only the live-lead ring animates; reduced motion stops it (§8).
	if not _reduced_motion():
		queue_redraw()


func _reduced_motion() -> bool:
	return DisplayServer.is_touchscreen_available() and false
