extends Control
## AppShell — the one window the five modes live in.
##
## UX_SPEC §6.2 landscape: full-height map ~72-78% of width, focus rail 22-28%
## when a node is selected, status strip across the top.
## UX_SPEC §6.3 portrait: compact two-row status, map in the central world
## window, commands in a lower sheet.
##
## The same world and data serve both (handoff §2). Nothing is a scaled-down
## copy of a desktop canvas (§7).

enum Mode { CITY, LOCATION, MARKET }

const RAIL_RATIO := 0.26
const MIN_TARGET := 48.0   ## UX_SPEC: 44 is the floor, 48 preferred

var mode: Mode = Mode.CITY

var _root: VBoxContainer
var _status: PanelContainer
var _status_line1: Label
var _status_line2: Label
var _body: BoxContainer
var _world_host: PanelContainer
var _rail: PanelContainer
var _rail_box: VBoxContainer
var _city_map: Control
var _is_portrait := false


func _ready() -> void:
	set_anchors_preset(Control.PRESET_FULL_RECT)

	if not ContentRegistry.errors.is_empty():
		_show_fatal(ContentRegistry.errors)
		return

	_build()
	get_tree().root.size_changed.connect(_reflow)
	GameState.state_changed.connect(_refresh_status)
	GameState.slice_completed.connect(_on_slice_completed)
	_reflow()
	_refresh_status()
	_show_city()


## ContentRegistry reports missing references as errors rather than silently
## substituting placeholders (handoff §4) — so the shell must not open on a
## half-loaded campaign.
func _show_fatal(errors: PackedStringArray) -> void:
	var box := VBoxContainer.new()
	box.set_anchors_preset(Control.PRESET_FULL_RECT)
	box.add_theme_constant_override("separation", 8)
	var title := Label.new()
	title.text = "Content failed to load"
	title.add_theme_font_size_override("font_size", 22)
	title.add_theme_color_override("font_color", PiritoriPalette.DANGER_RED)
	box.add_child(title)
	for e in errors:
		var l := Label.new()
		l.text = "• " + e
		l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		box.add_child(l)
	add_child(box)


func _build() -> void:
	var bg := ColorRect.new()
	bg.color = PiritoriPalette.INK
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(bg)

	_root = VBoxContainer.new()
	_root.set_anchors_preset(Control.PRESET_FULL_RECT)
	_root.add_theme_constant_override("separation", 0)
	add_child(_root)

	# ── status strip ──
	_status = PanelContainer.new()
	_status.add_theme_stylebox_override("panel", _panel_style(PiritoriPalette.PANEL))
	var sv := VBoxContainer.new()
	sv.add_theme_constant_override("separation", 2)
	_status_line1 = _make_label("", 15)
	_status_line2 = _make_label("", 13, PiritoriPalette.TEXT_DIM)
	sv.add_child(_status_line1)
	sv.add_child(_status_line2)
	var pad := MarginContainer.new()
	for side in ["left", "right"]:
		pad.add_theme_constant_override("margin_" + side, 14)
	for side in ["top", "bottom"]:
		pad.add_theme_constant_override("margin_" + side, 8)
	pad.add_child(sv)
	_status.add_child(pad)
	_root.add_child(_status)

	# ── body: world + rail/sheet ──
	_body = HBoxContainer.new()
	_body.size_flags_vertical = Control.SIZE_EXPAND_FILL
	_body.add_theme_constant_override("separation", 0)
	_root.add_child(_body)

	_world_host = PanelContainer.new()
	_world_host.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_world_host.size_flags_vertical = Control.SIZE_EXPAND_FILL
	_world_host.add_theme_stylebox_override("panel", _panel_style(PiritoriPalette.MAP_GROUND))
	_body.add_child(_world_host)

	_rail = PanelContainer.new()
	_rail.add_theme_stylebox_override("panel", _panel_style(PiritoriPalette.PANEL))
	var scroll := ScrollContainer.new()
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	_rail_box = VBoxContainer.new()
	_rail_box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_rail_box.add_theme_constant_override("separation", 8)
	var rpad := MarginContainer.new()
	for side in ["left", "right", "top", "bottom"]:
		rpad.add_theme_constant_override("margin_" + side, 14)
	# A ScrollContainer gives its child the child's MINIMUM width unless the
	# child is told to expand. Without this the rail collapsed to one character
	# per line as soon as a label was long enough to wrap.
	rpad.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	rpad.add_child(_rail_box)
	scroll.add_child(rpad)
	_rail.add_child(scroll)
	_body.add_child(_rail)

	_city_map = preload("res://scenes/city_map.gd").new()
	_city_map.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_city_map.size_flags_vertical = Control.SIZE_EXPAND_FILL
	_city_map.anchor_selected.connect(_on_anchor_selected)


## Landscape: world beside a rail. Portrait: world above a lower sheet.
func _reflow() -> void:
	var vp := get_viewport_rect().size
	var portrait := vp.y > vp.x
	if portrait == _is_portrait and _body != null and _body.get_child_count() > 0:
		_apply_rail_size(vp, portrait)
		return
	_is_portrait = portrait

	# Rebuild the body container in the correct axis.
	var world: Node = _world_host.get_parent()
	if world:
		_body.remove_child(_world_host)
		_body.remove_child(_rail)
	_body.queue_free()

	_body = VBoxContainer.new() if portrait else HBoxContainer.new()
	_body.size_flags_vertical = Control.SIZE_EXPAND_FILL
	_body.add_theme_constant_override("separation", 0)
	_root.add_child(_body)
	_body.add_child(_world_host)
	_body.add_child(_rail)

	_apply_rail_size(vp, portrait)


func _apply_rail_size(vp: Vector2, portrait: bool) -> void:
	if portrait:
		_rail.custom_minimum_size = Vector2(0, maxf(vp.y * 0.34, 190.0))
		_rail.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		_rail.size_flags_vertical = Control.SIZE_SHRINK_END
	else:
		_rail.custom_minimum_size = Vector2(maxf(vp.x * RAIL_RATIO, 260.0), 0)
		_rail.size_flags_horizontal = Control.SIZE_SHRINK_END
		_rail.size_flags_vertical = Control.SIZE_EXPAND_FILL


# ── status ─────────────────────────────────────────────────────────────────

func _refresh_status() -> void:
	if _status_line1 == null:
		return
	var stock_bits: PackedStringArray = []
	for pid in GameState.stock:
		var p := ContentRegistry.product(pid)
		var name: String = p.get("display_name", pid) if not p.is_empty() else pid
		stock_bits.append("%s ×%d" % [name, int(GameState.stock[pid])])

	_status_line1.text = "Day %d · %s   €%d   %s   capacity %d" % [
		GameState.day,
		GameState.current_block().capitalize(),
		GameState.cash_eur,
		", ".join(stock_bits) if stock_bits.size() > 0 else "no stock",
		GameState.capacity,
	]
	_status_line2.text = "debt €%d · %d mk · intel %d · block %d of %d" % [
		GameState.debt_eur, GameState.markka_mk, GameState.intel,
		mini(GameState.block_index + 1, GameState.total_blocks), GameState.total_blocks,
	]


# ── modes ──────────────────────────────────────────────────────────────────

func _clear_world() -> void:
	for c in _world_host.get_children():
		_world_host.remove_child(c)


func _clear_rail() -> void:
	for c in _rail_box.get_children():
		c.queue_free()


func _show_city() -> void:
	mode = Mode.CITY
	_clear_world()
	_world_host.add_child(_city_map)
	_city_map.call_deferred("_rebuild_layout")
	_build_city_rail(GameState.current_anchor_id)


func _on_anchor_selected(anchor_id: String) -> void:
	_build_city_rail(anchor_id)


func _build_city_rail(anchor_id: String) -> void:
	_clear_rail()
	if anchor_id == "":
		_rail_box.add_child(_make_label("Select a place on the map.", 15, PiritoriPalette.TEXT_DIM))
		return

	var a := ContentRegistry.anchor(anchor_id)
	if a.is_empty():
		return
	var state: String = a.get("sliceState", "locked")

	_rail_box.add_child(_make_label(String(a.get("label", anchor_id)), 19))
	_rail_box.add_child(_make_label("%s  %s" % [
		PiritoriPalette.state_glyph(state), PiritoriPalette.state_label(state)],
		13, PiritoriPalette.anchor_color(state)))

	var roles: Array = a.get("roles", [])
	if roles.size() > 0:
		_rail_box.add_child(_make_label(" · ".join(roles), 13, PiritoriPalette.TEXT_DIM))

	_rail_box.add_child(_separator())

	# Encounters playable in THIS block. The slice schedules one per block, so
	# a site hosting several (piritori_first_buy hosts day 1 and day 5) offers
	# only the one that is due.
	var any := false
	for enc in GameState.available_encounters_at(anchor_id):
		any = true
		var site := ContentRegistry.site(String(enc.get("site_id", "")))
		var entry := ContentRegistry.schedule_of_encounter(String(enc["id"]))
		# JSON numbers arrive as floats — int() or the rail reads "Day 1.0".
		var when := ""
		if not entry.is_empty():
			when = "  ·  Day %d %s" % [
				int(entry.get("day", 0)),
				String(entry.get("block", "")).capitalize(),
			]
		var b := _make_button("▶ " + String(site.get("label", enc["id"])) + when,
			PiritoriPalette.PLAYER_CYAN)
		var eid: String = enc["id"]
		b.pressed.connect(func(): _show_location(eid))
		_rail_box.add_child(b)

	# Market at this anchor, only where earned
	var offers := GameState.visible_offers().filter(
		func(o): return o.get("anchor_id", "") == anchor_id)
	if offers.size() > 0:
		any = true
		var mb := _make_button("Market ledger (%d)" % offers.size(), PiritoriPalette.GOODS_MAGENTA)
		mb.pressed.connect(_show_market)
		_rail_box.add_child(mb)

	if not any:
		_rail_box.add_child(_make_label(
			"Nothing here yet." if state != "locked" else "Closed in this era.",
			14, PiritoriPalette.TEXT_DIM))


func _show_location(encounter_id: String) -> void:
	mode = Mode.LOCATION
	_clear_world()
	var stage := preload("res://scenes/location_stage.gd").new()
	stage.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	stage.size_flags_vertical = Control.SIZE_EXPAND_FILL
	stage.setup(encounter_id)
	_world_host.add_child(stage)
	_build_location_rail(encounter_id, stage)


func _build_location_rail(encounter_id: String, stage: Control) -> void:
	_clear_rail()
	var enc := ContentRegistry.encounter(encounter_id)
	if enc.is_empty():
		return

	if GameState.is_resolved(encounter_id):
		_rail_box.add_child(_make_label("Already resolved.", 15, PiritoriPalette.TEXT_DIM))
	else:
		# LOOK / TALK / USE / LEAVE grammar (handoff §5, Location)
		_rail_box.add_child(_make_label("LOOK", 13, PiritoriPalette.TEXT_DIM))
		for item in enc.get("inspectables", []):
			var lb := _make_button("👁 " + String(item), PiritoriPalette.INTEL_MUSTARD)
			var txt := String(item)
			lb.pressed.connect(func(): stage.show_inspect(txt))
			_rail_box.add_child(lb)

		_rail_box.add_child(_separator())
		_rail_box.add_child(_make_label("ACT", 13, PiritoriPalette.TEXT_DIM))

		for choice in enc.get("choices", []):
			var can := GameState.meets_all(choice.get("requirements", []))
			var b := _make_button(String(choice.get("label", choice["id"])),
				PiritoriPalette.PLAYER_CYAN if can else PiritoriPalette.LOCKED_GREY)
			b.disabled = not can
			# Commitment shows its forecast first (handoff §5, Market and mission)
			var forecast := String(choice.get("forecast", ""))
			if forecast != "":
				b.tooltip_text = forecast
			var cid: String = choice["id"]
			b.pressed.connect(func(): _commit_choice(encounter_id, cid))
			_rail_box.add_child(b)

			var fl := _make_label("   " + forecast, 12, PiritoriPalette.TEXT_DIM)
			fl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
			_rail_box.add_child(fl)
			if not can:
				var req := _make_label("   requires: " + " · ".join(choice.get("requirements", [])),
					12, PiritoriPalette.DANGER_RED)
				_rail_box.add_child(req)

	_rail_box.add_child(_separator())
	var back := _make_button("LEAVE — back to the map", PiritoriPalette.TEXT_DIM)
	back.pressed.connect(_show_city)
	_rail_box.add_child(back)


func _commit_choice(encounter_id: String, choice_id: String) -> void:
	if GameState.resolve_encounter(encounter_id, choice_id):
		_show_city()


func _show_market() -> void:
	mode = Mode.MARKET
	_clear_world()
	var ledger := preload("res://scenes/market_ledger.gd").new()
	ledger.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	ledger.size_flags_vertical = Control.SIZE_EXPAND_FILL
	ledger.executed.connect(func(_id): _refresh_market_rail())
	_world_host.add_child(ledger)
	_refresh_market_rail()


func _refresh_market_rail() -> void:
	_clear_rail()
	_rail_box.add_child(_make_label("Ledger", 19))
	_rail_box.add_child(_make_label(
		"Only contacts you have earned appear here.", 13, PiritoriPalette.TEXT_DIM))
	_rail_box.add_child(_separator())
	var back := _make_button("Back to the map", PiritoriPalette.TEXT_DIM)
	back.pressed.connect(_show_city)
	_rail_box.add_child(back)


func _on_slice_completed() -> void:
	_clear_rail()
	_rail_box.add_child(_make_label("Seven days done.", 19, PiritoriPalette.PLAYER_CYAN))
	_rail_box.add_child(_make_label(
		"€%d cash · €%d debt · intel %d" % [GameState.cash_eur, GameState.debt_eur, GameState.intel],
		14))


# ── small builders ─────────────────────────────────────────────────────────

func _make_label(text: String, size_px: int, col: Color = PiritoriPalette.TEXT) -> Label:
	var l := Label.new()
	l.text = text
	l.add_theme_font_size_override("font_size", size_px)
	l.add_theme_color_override("font_color", col)
	return l


func _make_button(text: String, accent: Color) -> Button:
	var b := Button.new()
	b.text = text
	b.custom_minimum_size = Vector2(0, MIN_TARGET)
	b.add_theme_font_size_override("font_size", 15)
	b.add_theme_color_override("font_color", accent)
	b.add_theme_color_override("font_disabled_color", PiritoriPalette.LOCKED_GREY)
	b.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	b.alignment = HORIZONTAL_ALIGNMENT_LEFT
	return b


func _separator() -> Control:
	var s := HSeparator.new()
	s.custom_minimum_size = Vector2(0, 8)
	return s


func _panel_style(col: Color) -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	sb.bg_color = col
	sb.border_color = PiritoriPalette.PANEL_EDGE
	sb.border_width_bottom = 1
	sb.border_width_top = 1
	return sb
