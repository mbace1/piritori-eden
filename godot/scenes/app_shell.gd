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

enum Mode { CITY, LOCATION, MARKET, BATTLE, NEWS }

const RAIL_RATIO := 0.26
const MIN_TARGET := 48.0   ## UX_SPEC: 44 is the floor, 48 preferred

var mode: Mode = Mode.CITY

var _root: VBoxContainer
var _status: PanelContainer
var _status_line2: Label
var _stats: HBoxContainer
var _head_row: HBoxContainer
var _head_row2: HBoxContainer
var _command_bar: PanelContainer
var _commands: Array[Button] = []
var _langs: HBoxContainer
var _open_encounter: String = ""
var _body: BoxContainer
var _world_host: PanelContainer
var _rail: PanelContainer
var _rail_box: VBoxContainer
var _city_map: Control
var _is_portrait := false
var _hud: CanvasLayer


func _ready() -> void:
	set_anchors_preset(Control.PRESET_FULL_RECT)

	if not ContentRegistry.errors.is_empty():
		_show_fatal(ContentRegistry.errors)
		return

	# One theme with CJK coverage for the whole tree, or Japanese is tofu.
	theme = PiritoriFonts.theme()

	_build()
	get_tree().root.size_changed.connect(_reflow)
	get_tree().root.size_changed.connect(_apply_ui_scale)
	_apply_ui_scale()
	Loc.language_changed.connect(_on_language_changed)
	GameState.state_changed.connect(_refresh_status)
	GameState.slice_completed.connect(_on_slice_completed)
	# An encounter can ask for a battle mid-scene (start-battle / start-negotiation).
	GameState.battle_requested.connect(func(bid, _negotiation): _show_battle(bid))
	# The HUD is chrome for the developer, not for the game — a CanvasLayer so it
	# survives every mode switch and floats over the battle (CLAUDE.md rule 9).
	_hud = preload("res://ui/debug_hud.gd").new()
	_hud.shell = self
	add_child(_hud)

	_reflow()
	_refresh_status()
	_open_first_screen()


## Normally the City. With a debug parameter (CLAUDE.md rule 6), wherever the
## URL asked for — so a change can be reviewed on a phone in seconds instead of
## a dozen blocks of clicking.
func _open_first_screen() -> void:
	if not DebugEntry.active:
		_show_city()
		return

	var log := DebugEntry.apply_to_campaign()

	if DebugEntry.has("battle"):
		var bid := DebugEntry.get_str("battle")
		if ContentRegistry.battle(bid).is_empty():
			_show_debug_fault("no such battle: " + bid)
			return
		_show_battle(bid)
	elif DebugEntry.has("news"):
		var nid := DebugEntry.get_str("news")
		if ContentRegistry.news(nid).is_empty():
			_show_debug_fault("no such bulletin: " + nid)
			return
		_play_news(nid)
	elif DebugEntry.has("encounter"):
		var eid := DebugEntry.get_str("encounter")
		if ContentRegistry.encounter(eid).is_empty():
			_show_debug_fault("no such encounter: " + eid)
			return
		GameState.revealed[eid] = true
		_show_location(eid)
	else:
		match DebugEntry.get_str("mode", "city"):
			"market": _show_market()
			"crew": _show_crew()
			"missions": _show_missions()
			"news": _show_news_list()
			_: _show_city()

	if not log.is_empty():
		print("DebugEntry applied: ", ", ".join(log))


## A mistyped id must fail where the tester can see it — on the screen, on the
## phone — not in a console nobody has open.
func _show_debug_fault(message: String) -> void:
	_show_city()
	_clear_rail()
	_rail.visible = true
	_rail_box.add_child(_make_label("DEBUG", 19, PiritoriPalette.DANGER_RED))
	var l := _make_label(message, 14, PiritoriPalette.DANGER_RED)
	l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_rail_box.add_child(l)


## ContentRegistry reports missing references as errors rather than silently
## substituting placeholders (handoff §4) — so the shell must not open on a
## half-loaded campaign.
## UX_SPEC §13: language changes at a decision boundary without restarting the
## run, so the campaign model is untouched and only presentation is rebuilt.
func _on_language_changed(_code: String) -> void:
	_refresh_status()
	_rebuild_language_buttons()
	for b in _commands:
		b.tooltip_text = tr(b.get_meta("key", ""))
		for row in b.get_children():
			for child in row.get_children():
				if child is Label:
					child.text = tr(b.get_meta("key", ""))
	if mode == Mode.LOCATION and _open_encounter != "":
		_show_location(_open_encounter)
	elif mode == Mode.MARKET:
		_show_market()
	else:
		_show_city()


func _show_fatal(errors: PackedStringArray) -> void:
	var box := VBoxContainer.new()
	box.set_anchors_preset(Control.PRESET_FULL_RECT)
	box.add_theme_constant_override("separation", 8)
	var title := Label.new()
	title.text = tr("ui.content_failed")
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

	# ── titled header (MAP.md §6 layer 12: labels and UX chrome) ──
	_status = PanelContainer.new()
	var head_sb := StyleBoxFlat.new()
	head_sb.bg_color = MapStyle.FRAME
	head_sb.border_color = MapStyle.FRAME_EDGE
	head_sb.border_width_bottom = 3
	head_sb.content_margin_left = 18
	head_sb.content_margin_right = 18
	head_sb.content_margin_top = 9
	head_sb.content_margin_bottom = 9
	_status.add_theme_stylebox_override("panel", head_sb)

	var head := VBoxContainer.new()
	head.add_theme_constant_override("separation", 4)
	_head_row = HBoxContainer.new()
	_head_row.add_theme_constant_override("separation", 18)
	head.add_child(_head_row)
	_head_row2 = HBoxContainer.new()
	_head_row2.add_theme_constant_override("separation", 14)
	head.add_child(_head_row2)

	var titles := VBoxContainer.new()
	titles.add_theme_constant_override("separation", 0)
	var title := _make_label("PIRITORI → EDEN", 27, MapStyle.TITLE_TEXT)
	title.add_theme_constant_override("outline_size", 0)
	titles.add_child(title)
	_status_line2 = _make_label("", 12, MapStyle.SUB_TEXT)
	titles.add_child(_status_line2)
	_head_row.add_child(titles)

	var spacer := Control.new()
	spacer.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_head_row.add_child(spacer)

	_stats = HBoxContainer.new()
	_stats.add_theme_constant_override("separation", 16)
	_stats.alignment = BoxContainer.ALIGNMENT_END
	_head_row.add_child(_stats)

	_langs = HBoxContainer.new()
	_langs.add_theme_constant_override("separation", 4)
	_head_row.add_child(_langs)
	_rebuild_language_buttons()

	_status.add_child(head)
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

	# ── command bar (UX chrome, layer 12) ──
	_command_bar = PanelContainer.new()
	var bar_sb := StyleBoxFlat.new()
	bar_sb.bg_color = MapStyle.FRAME
	bar_sb.border_color = MapStyle.FRAME_EDGE
	bar_sb.border_width_top = 3
	bar_sb.content_margin_left = 10
	bar_sb.content_margin_right = 10
	bar_sb.content_margin_top = 8
	bar_sb.content_margin_bottom = 8
	_command_bar.add_theme_stylebox_override("panel", bar_sb)

	var bar := HBoxContainer.new()
	bar.add_theme_constant_override("separation", 10)
	bar.alignment = BoxContainer.ALIGNMENT_CENTER
	_command_bar.add_child(bar)

	for spec in [
		["cmd.route", PiritoriIcon.Kind.ROUTE, MapStyle.ROUTE, _show_city],
		["cmd.crew", PiritoriIcon.Kind.CREW, MapStyle.GOODS, _show_crew],
		["cmd.missions", PiritoriIcon.Kind.MISSION, MapStyle.METRO, _show_missions],
		["cmd.news", PiritoriIcon.Kind.PRESSURE, MapStyle.SUB_TEXT, _show_news_list],
		["cmd.end_day", PiritoriIcon.Kind.END_DAY, MapStyle.SMALL_TEXT, _end_block],
	]:
		var btn := _command(tr(spec[0]), spec[1], spec[2], spec[3])
		btn.set_meta("key", spec[0])
		_commands.append(btn)
		bar.add_child(btn)
	_root.add_child(_command_bar)

	_city_map = preload("res://scenes/city_map.gd").new()
	_city_map.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_city_map.size_flags_vertical = Control.SIZE_EXPAND_FILL
	_city_map.anchor_selected.connect(_on_anchor_selected)


## THE COMMAND BAR IS A FRACTION OF THE SCREEN, not a pixel count.
##
## `MIN_TARGET` is 48 design units, which on a phone rendered at 0.32 is a 15px
## button — the size that was reported as "not all touch controls work". Fixing
## it by scaling the whole interface turned out to be fragile; this is the
## robust version, because `get_viewport_rect()` is already in DESIGN units and
## therefore already compensates for whatever the stretch is doing. It is correct
## whether or not `content_scale_factor` applies.
##
## The fraction comes from the owner's target: a command bar occupying roughly a
## twelfth of the screen, with an icon and a word in it rather than a word alone.
const COMMAND_BAR_FRACTION := 0.085
const COMMAND_ICON_FRACTION := 0.42
const COMMAND_LABEL_FRACTION := 0.26

func _size_commands(vp: Vector2) -> void:
	# Portrait is the case that was broken. Landscape has height to spare and a
	# bar taking a twelfth of it would be a cliff, so it keeps a modest share.
	var share := COMMAND_BAR_FRACTION if vp.y > vp.x else COMMAND_BAR_FRACTION * 0.75
	var h := clampf(vp.y * share, MIN_TARGET, 320.0)
	for b in _commands:
		if b == null:
			continue
		b.custom_minimum_size = Vector2(maxf(h * 1.6, 96.0), h)
		var icon = b.get_meta("icon", null)
		if icon != null:
			icon.custom_minimum_size = Vector2(h * COMMAND_ICON_FRACTION,
				h * COMMAND_ICON_FRACTION)
		var label = b.get_meta("label", null)
		if label != null:
			label.add_theme_font_size_override("font_size",
				int(maxf(h * COMMAND_LABEL_FRACTION, 13.0)))


## Landscape: world beside a rail. Portrait: world above a lower sheet.
func _reflow() -> void:
	var vp := get_viewport_rect().size
	var portrait := vp.y > vp.x
	if portrait == _is_portrait and _body != null and _body.get_child_count() > 0:
		_apply_rail_size(vp, portrait)
		_apply_chrome(vp)
		_size_commands(vp)
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
	# The command bar is chrome and always sits at the foot of the shell. The
	# rebuild above re-adds _body at the end, which put the bar above the map.
	if _command_bar:
		_root.move_child(_command_bar, _root.get_child_count() - 1)

	_apply_rail_size(vp, portrait)
	_apply_chrome(vp)
	_size_commands(vp)


func _apply_rail_size(vp: Vector2, portrait: bool) -> void:
	if portrait:
		_rail.custom_minimum_size = Vector2(0, maxf(vp.y * 0.34, 190.0))
		_rail.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		_rail.size_flags_vertical = Control.SIZE_SHRINK_END
	else:
		_rail.custom_minimum_size = Vector2(maxf(vp.x * RAIL_RATIO, 260.0), 0)
		_rail.size_flags_horizontal = Control.SIZE_SHRINK_END
		_rail.size_flags_vertical = Control.SIZE_EXPAND_FILL


## UX_SPEC §6.3: portrait keeps a COMPACT TWO-ROW status strip. Narrow screens
## move the chips onto their own row and drop the command words to icons, which
## keeps every target at 48px instead of letting four labels overflow.
func _apply_chrome(vp: Vector2) -> void:
	if _stats == null or _head_row2 == null:
		return
	var narrow := vp.x < 620.0

	var want: Node = _head_row2 if narrow else _head_row
	if _stats.get_parent() != want:
		_stats.get_parent().remove_child(_stats)
		want.add_child(_stats)
	_head_row2.visible = narrow
	_stats.alignment = BoxContainer.ALIGNMENT_BEGIN if narrow else BoxContainer.ALIGNMENT_END

	for b in _commands:
		b.custom_minimum_size.x = 56.0 if narrow else 96.0
		for row in b.get_children():
			for child in row.get_children():
				if child is Label:
					child.visible = not narrow
	_refresh_status()


# ── status ─────────────────────────────────────────────────────────────────

## Languages by CODE, with the full name as the accessible name — the same
## treatment the arcade status line uses.
func _rebuild_language_buttons() -> void:
	if _langs == null:
		return
	for c in _langs.get_children():
		c.queue_free()
	for lang in Loc.SUPPORTED:
		var b := Button.new()
		b.text = String(lang).to_upper()
		b.custom_minimum_size = Vector2(MIN_TARGET, MIN_TARGET)
		b.tooltip_text = Loc.language_name(lang)
		b.focus_mode = Control.FOCUS_ALL
		b.add_theme_font_size_override("font_size", 13)
		var active: bool = lang == Loc.code
		b.add_theme_color_override("font_color",
			MapStyle.TITLE_TEXT if active else MapStyle.TINY_TEXT)
		var sb := StyleBoxFlat.new()
		sb.bg_color = MapStyle.STREET_BED if active else MapStyle.DARK_TAB
		sb.border_color = MapStyle.DARK_TAB_EDGE
		sb.set_border_width_all(2 if active else 1)
		b.add_theme_stylebox_override("normal", sb)
		b.add_theme_stylebox_override("hover", sb)
		b.add_theme_stylebox_override("pressed", sb)
		var code_of := String(lang)
		b.pressed.connect(func(): Loc.set_language(code_of))
		_langs.add_child(b)

	# CLAUDE.md rule 6: reachable without a keyboard or a URL, because the
	# device it matters on has neither.
	var dev := Button.new()
	dev.text = "DEV"
	dev.custom_minimum_size = Vector2(MIN_TARGET, MIN_TARGET)
	dev.tooltip_text = "Developer overlay (F3)"
	dev.focus_mode = Control.FOCUS_ALL
	dev.add_theme_font_size_override("font_size", 11)
	dev.add_theme_color_override("font_color", MapStyle.TINY_TEXT)
	var dsb := StyleBoxFlat.new()
	dsb.bg_color = MapStyle.DARK_TAB
	dsb.border_color = MapStyle.DARK_TAB_EDGE
	dsb.set_border_width_all(1)
	dev.add_theme_stylebox_override("normal", dsb)
	dev.add_theme_stylebox_override("hover", dsb)
	dev.add_theme_stylebox_override("pressed", dsb)
	dev.pressed.connect(func():
		if _hud:
			_hud.toggle())
	_langs.add_child(dev)


func _refresh_status() -> void:
	if _status_line2 == null:
		return
	_status_line2.text = tr("ui.era_line")

	for c in _stats.get_children():
		c.queue_free()

	# Each chip is icon + number, and every icon means one thing only.
	_add_stat(PiritoriIcon.Kind.END_DAY, MapStyle.TITLE_TEXT,
		"%s · %s" % [tr("ui.day_n") % GameState.day, _block_word()])
	_add_stat(PiritoriIcon.Kind.CREW, MapStyle.FLOW, "%d" % _crew_known())
	var packs := 0
	for v in GameState.stock.values():
		packs += int(v)
	_add_stat(PiritoriIcon.Kind.STOCK, MapStyle.GOODS, "%d" % packs)
	_add_stat(PiritoriIcon.Kind.MISSION, MapStyle.METRO, "%d" % _live_leads())
	_add_stat(PiritoriIcon.Kind.CASH, MapStyle.ROUTE, "€ %s" % _thousands(GameState.cash_eur))


func _block_word() -> String:
	return tr("ui.block.night") if GameState.current_block() == "night" else tr("ui.block.day")


func _crew_known() -> int:
	var n := 0
	for c in ContentRegistry.slice.get("crew", []):
		if GameState.is_revealed(String(c.get("id", ""))) 				or GameState.is_revealed(String(c.get("recruit_encounter_id", ""))):
			n += 1
	return n


func _block_of_total() -> int:
	return mini(GameState.block_index + 1, GameState.total_blocks)


func _live_leads() -> int:
	var n := 0
	for a in ContentRegistry.anchors():
		n += GameState.available_encounters_at(String(a["id"])).size()
	return n


func _anchor_label(anchor_id: String) -> String:
	if anchor_id == "":
		return ""
	var a := ContentRegistry.anchor(anchor_id)
	return String(a.get("label", anchor_id)).to_upper()


## 6420 -> "6 420", the period-correct grouping.
func _thousands(n: int) -> String:
	var s := str(absi(n))
	var out := ""
	var c := 0
	for i in range(s.length() - 1, -1, -1):
		out = s[i] + out
		c += 1
		if c % 3 == 0 and i > 0:
			out = " " + out
	return ("-" if n < 0 else "") + out


func _add_stat(kind: int, col: Color, text: String) -> void:
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 6)
	row.add_child(PiritoriIcon.new(kind, col, 17.0))
	var l := _make_label(text, 16, MapStyle.TITLE_TEXT)
	row.add_child(l)
	_stats.add_child(row)


# ── modes ──────────────────────────────────────────────────────────────────

## HOW BIG THE INTERFACE IS, which on a phone is not a detail.
##
## Reported from play: "menu is small" and "not all touch controls work". Those
## are almost certainly ONE bug. The project renders at a base viewport of
## 1280x720 with stretch aspect "expand", so the content scale is
## min(win.x/1280, win.y/720). On a phone about 412 CSS pixels wide that is
## 0.32 — a 19px label draws at 6px, and a 48px button becomes a 15px touch
## target, which is below the size a thumb can reliably hit.
##
## So the fix for "too small to read" is the same as the fix for "will not
## respond": make it bigger. content_scale_factor multiplies on top of the
## stretch, which is exactly the right lever — it leaves the 1280x720 design
## space that every drawing routine is tuned against completely alone.
##
## The number below is a starting point chosen by arithmetic, NOT by looking at
## a phone, which is why ?scale= exists. Dial it on the device and tell me.
## The size the 1280x720 design space should RENDER at, on a device too small to
## show it at 1:1. Expressed as the thing actually wanted rather than as a magic
## reference width, because the first version of this was tuned by a formula
## nobody could check against a guideline.
##
## 0.95 is derived, not chosen: the interface's buttons are 48px in design space,
## Apple and Google both want a touch target of at least 44, and 48 x 0.95 is 46.
## The first attempt landed at 0.70 and produced 34px buttons — still under the
## guideline, which is why "not all touch controls work" survived it.
##
## The cost is real and worth stating: a bigger interface fits less. At 0.95 a
## 412px phone has about 434 x 963 design units to lay out in, against 586 x 1301
## before. The rail scrolls, so the failure mode is more scrolling rather than
## clipped content — but if something important ends up below the fold, this
## number is the reason.
const UI_TARGET_SCALE := 0.95
const UI_SCALE_MAX := 4.0

func _apply_ui_scale() -> void:
	var win := get_window()
	if win == null:
		return
	if DebugEntry.has("scale"):
		win.content_scale_factor = maxf(float(DebugEntry.get_str("scale")), 0.25)
		return
	var w := float(win.size.x)
	var h := float(win.size.y)
	if w <= 0.0 or h <= 0.0:
		return
	# What the stretch already gives us: the project renders at a 1280x720 base
	# with aspect "expand", so content scale is min(w/1280, h/720).
	var natural := minf(w / 1280.0, h / 720.0)
	if natural <= 0.0:
		return
	# Scale UP to the target, never down — a desktop already showing the design
	# at 1:1 or better is left exactly alone.
	win.content_scale_factor = clampf(UI_TARGET_SCALE / natural, 1.0, UI_SCALE_MAX)



func _clear_world() -> void:
	for c in _world_host.get_children():
		_world_host.remove_child(c)


func _clear_rail() -> void:
	for c in _rail_box.get_children():
		c.queue_free()


func _show_city() -> void:
	mode = Mode.CITY
	_open_encounter = ""
	if _rail:
		_rail.visible = true
	# Era I news is a SCHEDULED broadcast: it arrives, it is not browsed to.
	if _play_scheduled_news_if_due():
		return
	_clear_world()
	_world_host.add_child(_city_map)
	_city_map.call_deferred("_rebuild_layout")
	_build_city_rail(GameState.current_anchor_id)


func _on_anchor_selected(anchor_id: String) -> void:
	_build_city_rail(anchor_id)


func _build_city_rail(anchor_id: String) -> void:
	_clear_rail()
	if anchor_id == "":
		_rail_box.add_child(_make_label(tr("ui.select_place"), 15, PiritoriPalette.TEXT_DIM))
		return

	var a := ContentRegistry.anchor(anchor_id)
	if a.is_empty():
		return
	var state: String = a.get("sliceState", "locked")

	_rail_box.add_child(_make_label(String(a.get("label", anchor_id)), 19))
	_rail_box.add_child(_make_label("%s  %s" % [
		PiritoriPalette.state_glyph(state), tr(PiritoriPalette.state_key(state))],
		13, PiritoriPalette.anchor_color(state)))

	var roles: Array = a.get("roles", [])
	if roles.size() > 0:
		_rail_box.add_child(_make_label(" · ".join(roles), 13, PiritoriPalette.TEXT_DIM))

	_rail_box.add_child(_separator())

	# The authored slice is owner-written narrative and exists in one language.
	# Say so plainly rather than letting English prose under a Finnish or
	# Japanese interface read as a bug.
	if not Loc.content_is_translated():
		var note := _make_label(tr("ui.content_en_only"), 11, PiritoriPalette.TEXT_DIM)
		note.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		_rail_box.add_child(note)

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
			var blk := String(entry.get("block", ""))
			when = "  ·  %s %s" % [
				tr("ui.day_n") % int(entry.get("day", 0)),
				tr("ui.block.night") if blk == "night" else tr("ui.block.day"),
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
		var mb := _make_button(tr("ui.market_ledger_n") % offers.size(), PiritoriPalette.GOODS_MAGENTA)
		mb.pressed.connect(_show_market)
		_rail_box.add_child(mb)

	if not any:
		_rail_box.add_child(_make_label(
			tr("ui.nothing_here") if state != "locked" else tr("ui.closed_era"),
			14, PiritoriPalette.TEXT_DIM))


func _show_location(encounter_id: String) -> void:
	mode = Mode.LOCATION
	_open_encounter = encounter_id
	_clear_world()
	var stage := preload("res://scenes/location_stage.gd").new()
	stage.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	stage.size_flags_vertical = Control.SIZE_EXPAND_FILL
	stage.setup(encounter_id)
	_world_host.add_child(stage)
	_mount_location_speaker(encounter_id, stage)
	_build_location_rail(encounter_id, stage)


## THE PERSON YOU CAME TO SEE.
##
## `UX_SPEC.md` §18, the LOCATION framing: talking to Toko should show Toko, in
## the noodle bar, rather than printing his lines over a map. This is the third
## and last of the three framings to get a screen.
##
## Driven off the encounter's own `participants`, not a per-encounter setting.
## Content already names who is in the room — `enc-toko-quiet-voice` lists
## "toko" — so the scene does not need telling twice, and any future encounter
## with a modelled participant gets this for free.
##
## Deliberately silent when nobody in the room has a model. Most participants —
## a bank clerk, a lunch crowd, a dog owner — never will, and an empty frame
## would be worse than the text that already works.
const LOCATION_SPEAKER_SIZE := Vector2(240.0, 300.0)
const LOCATION_SPEAKER_MARGIN := 12.0

func _mount_location_speaker(encounter_id: String, stage: Control) -> void:
	var enc := ContentRegistry.encounter(encounter_id)
	if enc.is_empty():
		return

	var speaker = preload("res://scenes/presenter_3d.gd").new()

	var who := ""
	for p in enc.get("participants", []):
		var pid := String(p)
		# The player is in every scene and is not somebody you look at.
		if pid == "aatami":
			continue
		if speaker.SPEAKERS.has(pid):
			who = pid
			break
	if who == "":
		speaker.free()
		return

	speaker.speaker_id = who
	speaker.framing = speaker.Framing.LOCATION
	if not speaker.available():
		speaker.free()
		return
	speaker.custom_minimum_size = LOCATION_SPEAKER_SIZE
	speaker.size = LOCATION_SPEAKER_SIZE
	speaker.mouse_filter = Control.MOUSE_FILTER_IGNORE
	# Bottom left, standing on the floor of the scene rather than floating in the
	# middle of it — the location art behind is the room, and a person belongs at
	# its near edge.
	speaker.set_anchors_preset(Control.PRESET_BOTTOM_LEFT)
	speaker.offset_left = LOCATION_SPEAKER_MARGIN
	speaker.offset_top = -(LOCATION_SPEAKER_SIZE.y + LOCATION_SPEAKER_MARGIN)
	speaker.offset_right = LOCATION_SPEAKER_SIZE.x + LOCATION_SPEAKER_MARGIN
	speaker.offset_bottom = -LOCATION_SPEAKER_MARGIN
	stage.add_child(speaker)


func _build_location_rail(encounter_id: String, stage: Control) -> void:
	_clear_rail()
	var enc := ContentRegistry.encounter(encounter_id)
	if enc.is_empty():
		return

	if GameState.is_resolved(encounter_id):
		_rail_box.add_child(_make_label(tr("ui.already_resolved"), 15, PiritoriPalette.TEXT_DIM))
	else:
		# LOOK / TALK / USE / LEAVE grammar (handoff §5, Location)
		_rail_box.add_child(_make_label(tr("verb.look"), 13, PiritoriPalette.TEXT_DIM))
		for item in enc.get("inspectables", []):
			var lb := _make_button("◉ " + String(item), PiritoriPalette.INTEL_MUSTARD)
			var txt := String(item)
			lb.pressed.connect(func(): stage.show_inspect(txt))
			_rail_box.add_child(lb)

		_rail_box.add_child(_separator())
		_rail_box.add_child(_make_label(tr("verb.act"), 13, PiritoriPalette.TEXT_DIM))

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
				var req := _make_label("   " + tr("ui.requires") % " · ".join(choice.get("requirements", [])),
					12, PiritoriPalette.DANGER_RED)
				_rail_box.add_child(req)

	_rail_box.add_child(_separator())
	var back := _make_button(tr("ui.leave_to_map"), PiritoriPalette.TEXT_DIM)
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
	_rail_box.add_child(_make_label(tr("ui.ledger"), 19))
	_rail_box.add_child(_make_label(tr("ui.ledger_earned"), 13, PiritoriPalette.TEXT_DIM))
	_add_fence()
	_rail_box.add_child(_separator())
	var back := _make_button(tr("ui.back_to_map"), PiritoriPalette.TEXT_DIM)
	back.pressed.connect(_show_city)
	_rail_box.add_child(back)


## THE FENCE — where loot finally becomes money (COMBAT.md §9.7).
##
## sell_loot() has existed and been tested since §8 and nothing ever called it,
## so loot could be taken and never converted. This is the screen that spends it.
##
## Piritori only. The travel requirement is the mechanic, not friction: selling
## from anywhere would make loot weightless and take the map out of an economy
## meant to run through it.
func _add_fence() -> void:
	_rail_box.add_child(_separator())
	_rail_box.add_child(_make_label(tr("ui.fence"), 15, MapStyle.TITLE_TEXT))

	if not GameState.can_fence_here():
		# Say WHERE, not just no. A refusal that does not name the place it wants
		# is a wall; naming Piritori turns it into a destination.
		var l := _make_label(tr("ui.fence_elsewhere"), 12, PiritoriPalette.TEXT_DIM)
		l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		_rail_box.add_child(l)
		return

	if GameState.equipment_owned.is_empty():
		_rail_box.add_child(_make_label(tr("ui.fence_nothing"), 12, PiritoriPalette.TEXT_DIM))
		return

	for id in GameState.equipment_owned:
		var eid := String(id)
		var paid := GameState.resale_of(eid)
		var nm := tr("equipment.%s" % eid)
		if nm == "equipment.%s" % eid:
			nm = eid
		var b := _make_button(tr("ui.fence_sell") % [nm, paid], PiritoriPalette.GOODS_MAGENTA)
		b.pressed.connect(func():
			GameState.sell_loot(eid)
			_refresh_market_rail())
		_rail_box.add_child(b)

		# §8's asymmetry, said at the moment it costs something. Selling a
		# taken-only weapon is not a trade, it is a thing you cannot undo — the
		# money can be earned again and the weapon cannot be bought at any price.
		if not GameState.is_purchasable(eid):
			var w := _make_label(tr("ui.fence_unbuyable"), 11, PiritoriPalette.INTEL_MUSTARD)
			w.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
			_rail_box.add_child(w)


## COMBAT.md §8. Two movements, and the order matters: what YOUR side dropped is
## gone before anything is picked up, so a win that cost you a body is not
## quietly refunded by the body's own weapon.
func _settle_loot(f, result: int) -> PackedStringArray:
	if f == null:
		return PackedStringArray()
	GameState.lose_kit_of(f.dropped_kit(true))
	var won := result in [
		FightManager.BattleResult.VICTORY_ROUT,
		FightManager.BattleResult.VICTORY_BREAK,
	]
	if not won:
		return PackedStringArray()
	return GameState.take_loot(f.dropped_kit(false))


func _add_spoils_lines(spoils: PackedStringArray) -> void:
	for id in spoils:
		var eid := String(id)
		var nm := tr("equipment.%s" % eid)
		if nm == "equipment.%s" % eid:
			nm = eid
		_rail_box.add_child(_make_label(nm, 15, PiritoriPalette.PUBLIC_BLUE))
		if not GameState.is_purchasable(eid):
			var l := _make_label(tr("loot.unbuyable"), 12, PiritoriPalette.INTEL_MUSTARD)
			l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
			_rail_box.add_child(l)


func _on_slice_completed() -> void:
	_clear_rail()
	_rail_box.add_child(_make_label(tr("ui.seven_days_done"), 19, PiritoriPalette.PLAYER_CYAN))

	# The authored ending, in its own words — never a generated summary.
	if GameState.ending_id == "":
		GameState.resolve_ending()
	var e := GameState.ending()
	if not e.is_empty():
		_rail_box.add_child(_make_label(String(e.get("label", "")), 17, MapStyle.TITLE_TEXT))
		var sum := _make_label(String(e.get("summary", "")), 13, PiritoriPalette.TEXT)
		sum.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		_rail_box.add_child(sum)
	_rail_box.add_child(_separator())
	_rail_box.add_child(_make_label(tr("ui.run_summary") % [
		GameState.cash_eur, GameState.debt_eur, GameState.intel], 14))
	if GameState.crew_deaths > 0:
		_rail_box.add_child(_make_label(
			tr("ui.crew_lost") % GameState.crew_deaths, 13, PiritoriPalette.DANGER_RED))


## A command tab: dark paper with a tan edge, icon plus word, 48px minimum.
func _command(text: String, kind: int, accent: Color, handler: Callable) -> Control:
	var b := Button.new()
	b.custom_minimum_size = Vector2(96, MIN_TARGET)
	b.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	b.focus_mode = Control.FOCUS_ALL
	b.tooltip_text = text

	var sb := StyleBoxFlat.new()
	sb.bg_color = MapStyle.DARK_TAB
	sb.border_color = MapStyle.DARK_TAB_EDGE
	sb.set_border_width_all(2)
	sb.content_margin_left = 12
	sb.content_margin_right = 12
	var hover := sb.duplicate()
	hover.bg_color = MapStyle.STREET_BED
	b.add_theme_stylebox_override("normal", sb)
	b.add_theme_stylebox_override("hover", hover)
	b.add_theme_stylebox_override("pressed", hover)
	b.add_theme_stylebox_override("focus", hover)

	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 9)
	row.alignment = BoxContainer.ALIGNMENT_CENTER
	row.mouse_filter = Control.MOUSE_FILTER_IGNORE
	row.set_anchors_preset(Control.PRESET_FULL_RECT)
	var icon := PiritoriIcon.new(kind, accent, 22.0)
	row.add_child(icon)
	var l := _make_label(text, 15, accent)
	l.mouse_filter = Control.MOUSE_FILTER_IGNORE
	row.add_child(l)
	b.add_child(row)

	# Held so _size_commands can grow them with the screen. A button whose icon
	# and text stay small while the box gets taller is a bigger hitbox, not a
	# bigger control.
	b.set_meta("icon", icon)
	b.set_meta("label", l)

	b.pressed.connect(handler)
	return b


## CREW — the authored recruits, everyone hired off the street, and who is
## available to hire today.
func _show_crew() -> void:
	_clear_rail()
	_rail_box.add_child(_make_label(tr("cmd.crew"), 19, MapStyle.TITLE_TEXT))
	var any := false
	for c in ContentRegistry.slice.get("crew", []):
		var known := GameState.is_revealed(String(c.get("id", ""))) 			or GameState.is_revealed(String(c.get("recruit_encounter_id", "")))
		if not known:
			continue
		any = true
		_rail_box.add_child(_make_label("%s — %s" % [
			c.get("name", "?"), c.get("role", "")], 15, PiritoriPalette.PLAYER_CYAN))
		_rail_box.add_child(_make_label("   " + tr("ui.crew_stats") % [
			c.get("condition", "?"), c.get("nerve", "?"), c.get("tempo", "?"),
			c.get("wage_eur", "?")], 12, PiritoriPalette.TEXT_DIM))
		_add_career_line(String(c.get("id", "")))

	# Everyone hired off the street. They are in the roster and nowhere in the
	# slice, so the loop above cannot see them.
	for id in GameState.roster:
		var cid := String(id)
		if not GameState.generated_crew.has(cid):
			continue
		any = true
		var g: Dictionary = GameState.generated_crew[cid]
		_rail_box.add_child(_make_label("%s — %s" % [
			g.get("name", "?"), g.get("role", "")], 15, PiritoriPalette.PLAYER_CYAN))
		_rail_box.add_child(_make_label("   " + tr("ui.crew_stats") % [
			g.get("condition", "?"), g.get("nerve", "?"), g.get("tempo", "?"),
			g.get("wage_eur", "?")], 12, PiritoriPalette.TEXT_DIM))
		_add_career_line(cid)

	if not any:
		_rail_box.add_child(_make_label(tr("ui.crew_none"), 14, PiritoriPalette.TEXT_DIM))

	_add_hiring_section()


## The career counter, and only when §7's warning threshold says to show it —
## hidden entirely, the spend-or-save decision becomes a guess; shown always, it
## turns every hire into a countdown.
func _add_career_line(crew_id: String) -> void:
	if not GameState.career_is_visible(crew_id):
		return
	var left := GameState.career_left(crew_id)
	_rail_box.add_child(_make_label("   " + tr("crew.career_left") % left,
		12, PiritoriPalette.INTEL_MUSTARD))


## Careers empty the roster and nothing used to fill it, so a long campaign ran
## out of people with no explanation. The city always has somebody.
func _add_hiring_section() -> void:
	var pool := GameState.hiring_pool()
	if pool.is_empty():
		return
	_rail_box.add_child(_separator())
	_rail_box.add_child(_make_label(tr("ui.hiring"), 15, MapStyle.TITLE_TEXT))
	_rail_box.add_child(_make_label(tr("ui.hiring_note"), 12, PiritoriPalette.TEXT_DIM))
	for candidate in pool:
		var c: Dictionary = candidate
		_rail_box.add_child(_make_label("%s — %s" % [
			c.get("name", "?"), c.get("role", "")], 14, PiritoriPalette.TEXT))
		_rail_box.add_child(_make_label("   " + tr("ui.crew_stats") % [
			c.get("condition", "?"), c.get("nerve", "?"), c.get("tempo", "?"),
			c.get("wage_eur", "?")], 12, PiritoriPalette.TEXT_DIM))
		var fee := int(c.get("wage_eur", 0))
		var afford := GameState.cash_eur >= fee
		var b := _make_button(tr("ui.hire") % fee,
			PiritoriPalette.PLAYER_CYAN if afford else PiritoriPalette.LOCKED_GREY)
		b.disabled = not afford
		b.pressed.connect(func():
			if GameState.hire(c):
				_show_crew())
		_rail_box.add_child(b)


## MISSIONS — commitment shown before acceptance (handoff §5).
func _show_missions() -> void:
	_clear_rail()
	_rail_box.add_child(_make_label(tr("cmd.missions"), 19, MapStyle.TITLE_TEXT))
	var any := false
	for m in ContentRegistry.slice.get("missions", []):
		if not GameState.is_revealed(String(m.get("id", ""))):
			continue
		any = true
		var dest := ContentRegistry.anchor(String(m.get("destination_anchor_id", "")))
		_rail_box.add_child(_make_label(String(m.get("family", m.get("id", ""))).to_upper(),
			15, MapStyle.METRO))
		var dl: Dictionary = m.get("deadline", {})
		_rail_box.add_child(_make_label("   " + tr("ui.mission_to") % [
			dest.get("label", m.get("destination_anchor_id", "?")),
			int(dl.get("day", 0)), dl.get("block", "")], 13, PiritoriPalette.TEXT))
		# §13.12: a battle is one mission in four to six, and it is entered from
		# the mission that signals it — never spawned at random.
		var bid := String(m.get("battle_id", ""))
		if bid != "" and not ContentRegistry.battle(bid).is_empty():
			var fb := _make_button(tr("battle.enter") % _battle_format(bid),
				PiritoriPalette.DANGER_RED)
			fb.pressed.connect(func(): _show_battle(bid))
			_rail_box.add_child(fb)

		var req: Dictionary = m.get("requirements", {})
		_rail_box.add_child(_make_label("   " + tr("ui.mission_needs") % [
			req.get("capacity", "?"), " · ".join(req.get("roles_any", []))],
			12, PiritoriPalette.TEXT_DIM))
	if not any:
		_rail_box.add_child(_make_label(tr("ui.no_missions"), 14, PiritoriPalette.TEXT_DIM))


## END DAY — spend the remaining block. A decision boundary, so it saves.
func _battle_format(battle_id: String) -> String:
	return String(ContentRegistry.battle(battle_id).get("format", ""))


## Enter a formation battle. The campaign model is untouched until it resolves.
func _show_battle(battle_id: String) -> void:
	mode = Mode.BATTLE
	_clear_world()
	_clear_rail()
	var crew: Array = []
	for c in ContentRegistry.slice.get("crew", []):
		var cid := String(c.get("id", ""))
		if GameState.is_revealed(cid) or GameState.is_revealed(String(c.get("recruit_encounter_id", ""))):
			crew.append(cid)
	# The slice's first battles are reachable before anyone is recruited, so
	# fall back to the authored roster rather than fielding an empty formation.
	if crew.is_empty():
		for c in ContentRegistry.slice.get("crew", []):
			crew.append(String(c.get("id", "")))

	var scene := preload("res://scenes/formation_battle.gd").new()
	scene.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scene.size_flags_vertical = Control.SIZE_EXPAND_FILL
	_world_host.add_child(scene)
	var errs: Array = scene.begin(battle_id, crew, GameState.seed_value + GameState.block_index)
	if not errs.is_empty():
		_rail_box.add_child(_make_label(str(errs), 13, PiritoriPalette.DANGER_RED))
		return
	# A fight is where a career is spent (COMBAT.md §7.2). Everyone who was
	# deployed comes out one fight older, and whoever reached the ceiling leaves
	# — alive. Done HERE, once, when the battle settles: doing it inside the
	# fight would age a crew every time a round resolved.
	var deployed := PackedStringArray(crew)
	scene.battle_finished.connect(func(result):
		# Ask the fight what happened BEFORE settling, while the fighters still
		# carry their end state.
		var summary: Dictionary = scene.fight.aftermath()
		var spoils := _settle_loot(scene.fight, int(result))
		# The police take the fallen BEFORE careers are aged: somebody carried
		# off a yard does not also come out of it one fight older.
		for id in summary.get("taken", PackedStringArray()):
			GameState.arrest(String(id))
		var left := GameState.age_crew(deployed)
		_show_aftermath(summary, spoils, left))
	_rail.visible = false


## What the fight cost, said once and in one place.
##
## Until now the result was computed and never mentioned: a rout, a negotiated
## exit, a withdrawal and an outright defeat all returned to the map in exactly
## the same way, so losing read as a bug rather than as an outcome. Three
## partial paths — retirements, spoils, or silence — have become this one.
##
## Order follows what the player is answerable for: what happened, what it cost
## YOU, what you took, and who is running out of career.
func _show_aftermath(summary: Dictionary, spoils: PackedStringArray,
		left: PackedStringArray) -> void:
	_show_city()
	_clear_rail()
	_rail.visible = true

	var result := int(summary.get("result", 0))
	_rail_box.add_child(_make_label(tr(_outcome_title(result)), 19, MapStyle.TITLE_TEXT))
	var line := _make_label(tr(_outcome_line(result)), 13, PiritoriPalette.TEXT)
	line.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_rail_box.add_child(line)

	# COMBAT.md §1: the promise is triage, not a damage race, so what leads is
	# who is still standing — never damage dealt.
	_rail_box.add_child(_separator())
	var ours: Array = summary.get("ours", [])
	_rail_box.add_child(_make_label(tr("aftermath.your_crew") % [
		int(summary.get("our_standing", 0)), ours.size()],
		14, PiritoriPalette.PLAYER_CYAN))
	for row in ours:
		var r: Dictionary = row
		var state := _status_key(int(r.get("status", 0)))
		if state == "":
			continue
		_rail_box.add_child(_make_label("   %s — %s" % [
			r.get("name", "?"), tr(state)], 12, PiritoriPalette.TEXT_DIM))

	# COMBAT.md §9.5.3. Said before the loot, because it is the more important
	# thing that happened and burying it under a shopping list would be a lie
	# about what the night cost.
	var taken: PackedStringArray = summary.get("taken", PackedStringArray())
	if bool(summary.get("police_arrived", false)):
		_rail_box.add_child(_separator())
		_rail_box.add_child(_make_label(tr("police.arrived"), 15, PiritoriPalette.DANGER_RED))
		var pl := _make_label(tr("police.note"), 12, PiritoriPalette.TEXT_DIM)
		pl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		_rail_box.add_child(pl)
		# Said before the losses: somebody went back, and that is the part of the
		# night worth leading with.
		for id in summary.get("saved", PackedStringArray()):
			var sc := ContentRegistry.crew_member(String(id))
			_rail_box.add_child(_make_label("%s — %s" % [
				String(sc.get("name", sc.get("display_name", id))),
				tr("police.saved")], 14, PiritoriPalette.ROUTE_GREEN))
		if not (summary.get("saved", PackedStringArray()) as PackedStringArray).is_empty():
			var sl := _make_label(tr("police.saved_note"), 12, PiritoriPalette.TEXT_DIM)
			sl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
			_rail_box.add_child(sl)

		for id in taken:
			var c := ContentRegistry.crew_member(String(id))
			_rail_box.add_child(_make_label(
				String(c.get("name", c.get("display_name", id))),
				15, PiritoriPalette.DANGER_RED))
			var tl := _make_label(tr("police.taken_note"), 12, PiritoriPalette.TEXT_DIM)
			tl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
			_rail_box.add_child(tl)

	if not spoils.is_empty():
		_rail_box.add_child(_separator())
		_rail_box.add_child(_make_label(tr("loot.taken"), 15, MapStyle.TITLE_TEXT))
		_add_spoils_lines(spoils)

	# §7.2: two exits, and the one that is not death is what makes benching a
	# veteran a decision rather than hoarding. It deserves to be said.
	if not left.is_empty():
		_rail_box.add_child(_separator())
		_rail_box.add_child(_make_label(tr("crew.retired"), 15, MapStyle.TITLE_TEXT))
		for id in left:
			var c := ContentRegistry.crew_member(String(id))
			_rail_box.add_child(_make_label(
				String(c.get("name", c.get("display_name", id))),
				15, PiritoriPalette.PUBLIC_BLUE))
			var l := _make_label(tr("crew.retired_note"), 12, PiritoriPalette.TEXT_DIM)
			l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
			_rail_box.add_child(l)

	_rail_box.add_child(_separator())
	var back := _make_button(tr("ui.back_to_map"), PiritoriPalette.TEXT_DIM)
	back.pressed.connect(_show_city)
	_rail_box.add_child(back)


## The outcome in the game's own register. Six results, six headlines: a
## negotiated exit is not a win with different wording, and a withdrawal is not
## a defeat.
func _outcome_title(result: int) -> String:
	match result:
		FightManager.BattleResult.VICTORY_ROUT: return "aftermath.rout_title"
		FightManager.BattleResult.VICTORY_BREAK: return "aftermath.break_title"
		FightManager.BattleResult.STAND_DOWN: return "aftermath.stand_down_title"
		FightManager.BattleResult.WITHDRAWAL: return "aftermath.withdrawal_title"
		FightManager.BattleResult.PARTIAL: return "aftermath.partial_title"
		FightManager.BattleResult.DEFEAT: return "aftermath.defeat_title"
	return "aftermath.partial_title"


func _outcome_line(result: int) -> String:
	match result:
		FightManager.BattleResult.VICTORY_ROUT: return "aftermath.rout_line"
		FightManager.BattleResult.VICTORY_BREAK: return "aftermath.break_line"
		FightManager.BattleResult.STAND_DOWN: return "aftermath.stand_down_line"
		FightManager.BattleResult.WITHDRAWAL: return "aftermath.withdrawal_line"
		FightManager.BattleResult.PARTIAL: return "aftermath.partial_line"
		FightManager.BattleResult.DEFEAT: return "aftermath.defeat_line"
	return "aftermath.partial_line"


## Only the states worth a line. Somebody who walked out unhurt does not need
## naming, and listing everyone would bury the two who did not.
func _status_key(status: int) -> String:
	match status:
		Fighter.Status.DOWNED: return "aftermath.status_downed"
		Fighter.Status.CRITICAL: return "aftermath.status_critical"
		Fighter.Status.WOUNDED: return "aftermath.status_wounded"
		Fighter.Status.SHAKEN: return "aftermath.status_shaken"
		Fighter.Status.ROUTED: return "aftermath.status_routed"
		Fighter.Status.MISSING: return "aftermath.status_missing"
		Fighter.Status.DEAD: return "aftermath.status_dead"
	return ""


## NEWS — the fifth mode. Era I is television-led: a bulletin arrives on its
## scheduled day and can be re-watched from here afterwards.
func _show_news_list() -> void:
	mode = Mode.NEWS
	_clear_rail()
	_rail.visible = true
	_rail_box.add_child(_make_label(tr("cmd.news"), 19, MapStyle.TITLE_TEXT))

	var any := false
	for n in ContentRegistry.slice.get("news", []):
		var nid := String(n.get("id", ""))
		# A bulletin exists once its day has arrived.
		if int(n.get("day", 99)) > GameState.day:
			continue
		any = true
		var seen := bool(GameState.flags.get("news-seen:" + nid, false))
		var b := _make_button(("✓ " if seen else "▶ ") + String(n.get("presenter", nid)),
			PiritoriPalette.PUBLIC_BLUE)
		b.pressed.connect(func(): _play_news(nid))
		_rail_box.add_child(b)
		_rail_box.add_child(_make_label("   " + tr("ui.day_n") % int(n.get("day", 0)),
			12, PiritoriPalette.TEXT_DIM))
	if not any:
		_rail_box.add_child(_make_label(tr("news.none"), 14, PiritoriPalette.TEXT_DIM))

	_rail_box.add_child(_separator())
	var back := _make_button(tr("ui.back_to_map"), PiritoriPalette.TEXT_DIM)
	back.pressed.connect(_show_city)
	_rail_box.add_child(back)


## Play a bulletin full-screen. The television owns the world window; the rail
## is hidden so nothing competes with it.
func _play_news(nid: String) -> void:
	mode = Mode.NEWS
	_clear_world()
	var scene := preload("res://scenes/news_event.gd").new()
	scene.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scene.size_flags_vertical = Control.SIZE_EXPAND_FILL
	_world_host.add_child(scene)
	scene.setup(nid)
	scene.dismissed.connect(func(_id): _show_city())
	_rail.visible = false


## A bulletin scheduled before this block plays before the block does.
func _play_scheduled_news_if_due() -> bool:
	var nid := ContentRegistry.news_before(GameState.day, GameState.current_block())
	if nid == "" or bool(GameState.flags.get("news-seen:" + nid, false)):
		return false
	_play_news(nid)
	return true


func _end_block() -> void:
	if GameState.is_slice_complete():
		return
	GameState.advance_block()
	_show_city()


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
