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

## The title reads "PIRITORI → EDEN" only on City, the de facto home/start
## screen (owner ruling, 2026-08-26: no splash screen exists, and the title
## does not need to compete with place/stats on every other screen). Crew and
## Missions are not their own Mode value — see the enum above — so they keep
## reading as City for this purpose, which matches them being City sub-panels
## rather than independent modes in UX_SPEC.md §3.1.
func _set_mode(m: Mode) -> void:
	mode = m
	if _title:
		_title.visible = (m == Mode.CITY)

var _root: VBoxContainer
var _status: PanelContainer
var _status_line2: Label
var _stats: HBoxContainer
var _head_row: HBoxContainer
var _title: Label
var _menu_button: Button
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
	# ORDER MATTERS. `_reflow()` sizes everything off `get_viewport_rect()`,
	# which is itself downstream of `content_scale_factor` — Godot calls
	# signal listeners in connection order, so with `_reflow` connected
	# first, every resize laid the shell out against the PREVIOUS
	# content_scale_factor, one step behind the one `_apply_ui_scale` was
	# about to set. Invisible on a single resize at boot; visible the moment
	# anything resizes twice in a session (rotating a phone, or this
	# session's own capture harness switching shots) — the city map's own
	# Control ended up 480 design units wide against a viewport that had
	# already become 410, and a legend anchored to ITS right edge drew
	# 70 units past the real one (2026-08-27, "map names are way too big"
	# investigation surfaced this as a second, independent bug).
	get_tree().root.size_changed.connect(_apply_ui_scale)
	get_tree().root.size_changed.connect(_reflow)
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
	# Carton, not a filled rectangle. Torn along the bottom, because that is
	# the edge the world shows through — the header reads as a strip of card
	# laid over the map rather than a bar the map stops at.
	_status.add_theme_stylebox_override("panel",
		PiritoriChrome.margins(PiritoriChrome.bar(false), 18, 9))

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
	_title = _make_label("PIRITORI → EDEN", 27, MapStyle.TITLE_TEXT)
	_title.add_theme_constant_override("outline_size", 0)
	titles.add_child(_title)
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

	# THE HAMBURGER (owner's reference layout).
	#
	# Language and DEV were four permanent buttons in the header of a phone. They
	# are settings, consulted rarely, and they were taking width from the two
	# things that are read constantly: the title and the numbers. Behind a menu
	# they cost one control instead of four.
	_menu_button = Button.new()
	# U+2261, not U+2630. The obvious hamburger glyph exists in neither Noto
	# Sans JP nor Godot's built-in face, so it would have shipped as a tofu
	# box in the header. CI caught it; the local run did not, because the
	# runtime locale test checks a hardcoded symbol list and this character
	# lives in a GDScript string.
	_menu_button.text = "≡"
	_menu_button.tooltip_text = tr("ui.menu")
	_menu_button.focus_mode = Control.FOCUS_ALL
	_menu_button.pressed.connect(func(): _toggle_menu())
	_head_row.add_child(_menu_button)

	_langs = HBoxContainer.new()
	_langs.add_theme_constant_override("separation", 6)
	_langs.alignment = BoxContainer.ALIGNMENT_END
	# Starts closed. The header is for what the player is looking at.
	_langs.visible = false
	_head_row2.add_child(_langs)
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
	# The rail is a sheet stacked on the world, so it is torn where it meets it.
	_rail.add_theme_stylebox_override("panel", PiritoriChrome.panel(PiritoriChrome.RULE, true, true))
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
	_command_bar.add_theme_stylebox_override("panel", PiritoriChrome.bar(true))

	var bar := HBoxContainer.new()
	bar.add_theme_constant_override("separation", 10)
	bar.alignment = BoxContainer.ALIGNMENT_CENTER
	_command_bar.add_child(bar)

	# UX_SPEC.md §3.1 ("The five modes") and §3.3 ("Navigation model"): "these
	# are full interaction modes, not five permanent bottom tabs" — the
	# planning dock is meant to be four targets, and END DAY is explicitly
	# "beside the clock", not a tab (moved to the header, see
	# `_refresh_status()`). CITY / CREW / MESSAGES / MISSIONS is the minimal
	# spec-conformant four; folding Crew and Missions into a real Ledger
	# mode and badging missions on the map itself (§6.6.2) is bigger,
	# separate work — see QUEUE.md.
	for spec in [
		["cmd.city", PiritoriIcon.Kind.ROUTE, MapStyle.ROUTE, _show_city],
		["cmd.crew", PiritoriIcon.Kind.CREW, MapStyle.GOODS, _show_crew],
		["cmd.messages", PiritoriIcon.Kind.PRESSURE, MapStyle.SUB_TEXT, _show_news_list],
		["cmd.missions", PiritoriIcon.Kind.MISSION, MapStyle.METRO, _show_missions],
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

## The header grows too, for the same reason and by the same means.
##
## The owner's reference has the title taking roughly half the width of a phone
## screen. A fixed 27px in a 1280-unit design space is about 9 CSS pixels there,
## which is why it read as a caption rather than a masthead.
const TITLE_FRACTION := 0.030
const STAT_ICON_FRACTION := 0.019
const STAT_TEXT_FRACTION := 0.018
const SUBTITLE_FRACTION := 0.014

func _toggle_menu() -> void:
	if _langs == null:
		return
	_langs.visible = not _langs.visible
	if _head_row2 != null and _langs.visible:
		_head_row2.visible = true
	elif _head_row2 != null:
		# Only hide the row if the stats are not living there too, which they do
		# on a genuinely narrow screen.
		_head_row2.visible = _stats != null and _stats.get_parent() == _head_row2


func _size_header(vp: Vector2) -> void:
	if _title == null:
		return
	var portrait := vp.y > vp.x
	# Portrait has height to spend and little width; landscape is the reverse,
	# so each takes its cue from the axis it actually has.
	var basis := vp.y if portrait else vp.x
	_title.add_theme_font_size_override("font_size",
		int(clampf(basis * TITLE_FRACTION, 22.0, 96.0)))
	if _status_line2 != null:
		_status_line2.add_theme_font_size_override("font_size",
			int(clampf(basis * SUBTITLE_FRACTION, 12.0, 44.0)))
	if _menu_button != null:
		var m := clampf(basis * 0.026, MIN_TARGET, 110.0)
		_menu_button.custom_minimum_size = Vector2(m, m)
		_menu_button.add_theme_font_size_override("font_size", int(m * 0.52))


## Separation between commands and the bar's own padding, needed to work out
## what width is actually available to divide between them.
const COMMAND_BAR_SEPARATION := 8.0
const COMMAND_BAR_PADDING := 32.0

func _size_commands(vp: Vector2) -> void:
	# Portrait is the case that was broken. Landscape has height to spare and a
	# bar taking a twelfth of it would be a cliff, so it keeps a modest share.
	var share := COMMAND_BAR_FRACTION if vp.y > vp.x else COMMAND_BAR_FRACTION * 0.75
	var h := clampf(vp.y * share, MIN_TARGET, 320.0)

	# THE WIDTH MUST COME FROM THE SCREEN, NOT FROM A CONSTANT.
	#
	# This used to pin every command to at least 96 design units. Five of them
	# plus separation is a 665-unit minimum, and a phone at the shipped UI scale
	# has about 410 units to give — so the bar forced the WHOLE SHELL to 665,
	# and every screen above it was silently cut off at the right edge. It
	# looked like a text-wrapping bug in the encounter copy; it was the command
	# bar dragging the column wider than the window.
	#
	# A minimum wider than the screen is not a minimum, it is a promise the
	# layout cannot keep. So the floor is what fits, and MIN_TARGET keeps the
	# touch target honest in the other axis.
	var count := 0
	for b in _commands:
		if b != null:
			count += 1
	var per := 96.0
	if count > 0:
		var gaps := COMMAND_BAR_SEPARATION * float(count - 1) + COMMAND_BAR_PADDING
		per = minf(maxf(h * 1.6, 96.0), maxf((vp.x - gaps) / float(count), 44.0))

	# Below this the words stop fitting beside the icon and would themselves
	# force the bar wide again, so they are dropped and the icon carries it.
	var icons_only := per < 96.0

	for b in _commands:
		if b == null:
			continue
		b.custom_minimum_size = Vector2(per, h)
		var icon = b.get_meta("icon", null)
		if icon != null:
			icon.custom_minimum_size = Vector2(h * COMMAND_ICON_FRACTION,
				h * COMMAND_ICON_FRACTION)
		var label = b.get_meta("label", null)
		if label != null:
			label.visible = not icons_only
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
		_size_header(vp)
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
	_size_header(vp)


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
	# `vp` is in DESIGN units, and the stretch keeps the base width as a floor —
	# so on a phone vp.x stays about 1280 and this test never fired on the device
	# it was written for. The real question is how wide the screen IS, which is
	# the window, not the viewport.
	var win := get_window()
	var real_w := float(win.size.x) if win != null else vp.x
	var narrow := real_w < 620.0

	var want: Node = _head_row2 if narrow else _head_row
	if _stats.get_parent() != want:
		_stats.get_parent().remove_child(_stats)
		want.add_child(_stats)
	# ...or when the menu is open, which is the other thing that lives there.
	_head_row2.visible = narrow or (_langs != null and _langs.visible)
	_stats.alignment = BoxContainer.ALIGNMENT_BEGIN if narrow else BoxContainer.ALIGNMENT_END

	# Labels stay. The owner's reference layout puts an icon AND a word on every
	# command, and dropping the word was a compromise made when the buttons were
	# too small to hold both — which is the thing that has now been fixed.
	# Width is left to _size_commands, which owns the whole bar.
	for b in _commands:
		for row in b.get_children():
			for child in row.get_children():
				if child is Label:
					child.visible = true
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
		var sb := PiritoriChrome.button(
			MapStyle.SUB_TEXT if active else PiritoriChrome.RULE, active)
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
	var dsb := PiritoriChrome.button()
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
	_add_end_day_button()
	_add_stat(PiritoriIcon.Kind.CREW, MapStyle.FLOW, "%d" % _crew_known())
	var packs := 0
	for v in GameState.stock.values():
		packs += int(v)
	_add_stat(PiritoriIcon.Kind.STOCK, MapStyle.GOODS, "%d" % packs)
	_add_stat(PiritoriIcon.Kind.MISSION, MapStyle.METRO, "%d" % _live_leads())
	_add_stat(PiritoriIcon.Kind.CASH, MapStyle.ROUTE, "€ %s" % _thousands(GameState.cash_eur))


## UX_SPEC.md §3.3 ("Navigation model"): "`WAIT / CLOSE BLOCK` is an explicit
## City action beside the clock, not a primary navigation tab." The clock is
## the day/block chip just added above; this is the separate control that
## sits next to it, replacing the old fifth command-bar button.
func _add_end_day_button() -> void:
	var btn := Button.new()
	btn.text = tr("cmd.end_day")
	btn.custom_minimum_size = Vector2(0, MIN_TARGET)
	btn.focus_mode = Control.FOCUS_ALL
	btn.add_theme_font_size_override("font_size", 13)
	var sb := PiritoriChrome.button(MapStyle.SMALL_TEXT)
	var sb_hot := PiritoriChrome.button(MapStyle.SMALL_TEXT, true)
	btn.add_theme_stylebox_override("normal", sb)
	btn.add_theme_stylebox_override("hover", sb_hot)
	btn.add_theme_stylebox_override("pressed", sb_hot)
	btn.pressed.connect(_end_block)
	_stats.add_child(btn)


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


## A stat chip: one icon, one number, and the icon means one thing only.
##
## Sized from the screen like everything else in the chrome. At a fixed 17px
## icon and 16px text these were about 5 CSS pixels on a phone — present, and
## unreadable, which is worse than absent because it occupies the space where a
## readable version would go.
func _add_stat(kind: int, col: Color, text: String) -> void:
	var vp := get_viewport_rect().size
	var basis: float = vp.y if vp.y > vp.x else vp.x
	var icon_px := clampf(basis * STAT_ICON_FRACTION, 17.0, 64.0)
	var text_px := int(clampf(basis * STAT_TEXT_FRACTION, 16.0, 60.0))

	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", int(maxf(icon_px * 0.35, 6.0)))
	row.add_child(PiritoriIcon.new(kind, col, icon_px))
	var l := _make_label(text, text_px, MapStyle.TITLE_TEXT)
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
	_set_mode(Mode.CITY)
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
	_set_mode(Mode.LOCATION)
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

## WHERE THE SPEAKER STANDS, as fractions of the stage rather than pixels.
##
## STAGE_SPEC 6.3 requires the live figure to stand where the painted one stood,
## behind the same counter. Bottom-left corner was fine while the room still had
## a painted Toko in it and the 3D one was a demo; with the empty bar it would
## put him on the customer's side of his own counter.
##
## MEASURED, not chosen. The gold mask in
## toko-slomo-noodles-prototype-v02.webp is a single colour blob at x 641-757,
## y 139-264 of 1536x864 - so his head centres at 0.449 across and 0.196 down,
## and is 0.145 of frame height. These place the presenter box so its rendered
## head lands there.
##
## Per the brief these are "starting points to be judged on a screen, not
## measurements" - the capture is what settles them.
## THE COUNTER CROPS HIM, BECAUSE IT CANNOT OCCLUDE HIM.
##
## In the plate Toko stands BEHIND the counter. A live figure composited over a
## flat painting is always in front of everything in it, so there is no depth to
## put him behind - and a full standing figure reads as a man standing ON the
## customer's side of his own bar.
##
## So the presenter's box ENDS at the counter's top edge, measured in the empty
## room at y=409 of 864, and the viewport crops him there. From the front that
## is indistinguishable from the counter passing in front of him, which is the
## whole trick, and it costs nothing.
const COUNTER_SPEAKER_CENTRE_X := 0.449
const COUNTER_SPEAKER_TOP := 0.0
const COUNTER_SPEAKER_BOTTOM := 0.473
const COUNTER_SPEAKER_WIDTH := 0.46

## Which participant in this encounter has a 3D model, if any. Shared by the
## stage's own big speaker and the rail's small medallion, so "who is in the
## room" is answered once rather than re-derived twice and risking the two
## disagreeing.
const _Presenter3D := preload("res://scenes/presenter_3d.gd")

func _encounter_speaker_id(enc: Dictionary) -> String:
	for p in enc.get("participants", []):
		var pid := String(p)
		# The player is in every scene and is not somebody you look at.
		if pid == "aatami":
			continue
		if _Presenter3D.SPEAKERS.has(pid):
			return pid
	return ""


func _mount_location_speaker(encounter_id: String, stage: Control) -> void:
	var enc := ContentRegistry.encounter(encounter_id)
	if enc.is_empty():
		return

	var speaker = _Presenter3D.new()

	var who := _encounter_speaker_id(enc)
	if who == "":
		speaker.free()
		return

	speaker.speaker_id = who
	speaker.framing = speaker.Framing.COUNTER
	if not speaker.available():
		speaker.free()
		return
	speaker.mouse_filter = Control.MOUSE_FILTER_IGNORE
	# Anchored to the stage in fractions so the figure keeps its place in the
	# room at every screen size, instead of being pinned a fixed number of
	# pixels from a corner.
	speaker.set_anchors_preset(Control.PRESET_FULL_RECT)
	speaker.anchor_left = COUNTER_SPEAKER_CENTRE_X - COUNTER_SPEAKER_WIDTH * 0.5
	speaker.anchor_right = COUNTER_SPEAKER_CENTRE_X + COUNTER_SPEAKER_WIDTH * 0.5
	speaker.anchor_top = COUNTER_SPEAKER_TOP
	# ASK THE STAGE, do not assume. The art is drawn cover-and-cropped, so the
	# counter's line in the file is not its line on screen — and it moves with
	# the window. The stage owns that transform.
	var bottom := COUNTER_SPEAKER_BOTTOM
	if stage.has_method("texture_y_to_local"):
		bottom = stage.texture_y_to_local(COUNTER_SPEAKER_BOTTOM)
	speaker.anchor_bottom = bottom
	speaker.offset_left = 0.0
	speaker.offset_right = 0.0
	speaker.offset_top = 0.0
	speaker.offset_bottom = 0.0
	stage.add_child(speaker)
	# BEHIND THE TEXT LAYER, not in front of it. `location_stage.gd` builds its
	# copy pad in `_ready()`, before this ever runs, so a plain `add_child`
	# stacks the speaker on top of it — invisible while the copy was a bare
	# label floating over dim art, but the dialogue card (concept A,
	# 2026-08-24) is opaque kraft, and Toko's own head stood in front of his
	# own line. Text is always the top layer over a body, the way a caption
	# sits over an actor and not the other way round.
	stage.move_child(speaker, 0)


func _build_location_rail(encounter_id: String, stage: Control) -> void:
	_clear_rail()
	var enc := ContentRegistry.encounter(encounter_id)
	if enc.is_empty():
		return

	if GameState.is_resolved(encounter_id):
		_rail_box.add_child(_make_label(tr("ui.already_resolved"), 15, PiritoriPalette.TEXT_DIM))
	else:
		# LOOK / TALK / USE / LEAVE grammar (handoff §5, Location), dressed as
		# concept A's torn-card action row: an eye for LOOK, a blade for ACT, a
		# door for LEAVE — the same three glyphs the owner approved, applied to
		# however many real inspectables and choices an encounter actually has
		# rather than a fixed three.
		_rail_box.add_child(_make_label(tr("verb.look"), 13, PiritoriPalette.TEXT_DIM))
		for item in enc.get("inspectables", []):
			var txt := String(item)
			var lb := _make_icon_button(txt, PiritoriIcon.Kind.INFO, PiritoriChrome.ACCENT_LOOK)
			lb.pressed.connect(func(): stage.show_inspect(txt))
			_rail_box.add_child(lb)

		_rail_box.add_child(_separator())
		_rail_box.add_child(_make_label(tr("verb.act"), 13, PiritoriPalette.TEXT_DIM))

		for choice in enc.get("choices", []):
			var can := GameState.meets_all(choice.get("requirements", []))
			var b := _make_icon_button(String(choice.get("label", choice["id"])),
				PiritoriIcon.Kind.RISK, PiritoriChrome.ACCENT_ACT, can)
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
	var back := _make_icon_button(tr("ui.leave_to_map"), PiritoriIcon.Kind.LEAVE, PiritoriChrome.ACCENT_LEAVE)
	back.pressed.connect(_show_city)
	_rail_box.add_child(back)


func _commit_choice(encounter_id: String, choice_id: String) -> void:
	if GameState.resolve_encounter(encounter_id, choice_id):
		_show_city()


func _show_market() -> void:
	_set_mode(Mode.MARKET)
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
	_add_chapter_ending()
	_rail_box.add_child(_separator())
	var back := _make_button(tr("ui.back_to_map"), PiritoriPalette.TEXT_DIM)
	back.pressed.connect(_show_city)
	_rail_box.add_child(back)


## THE END OF A CHAPTER (GDD run structure).
##
## The threshold buys entry and the operation spends it, so this only appears
## when both are true — and when it does it is the most important thing on the
## screen, because it ends the run.
##
## It lives in the market rail rather than on a screen of its own: a shipment is
## a purchase, and putting it beside the ledger and the fence says that plainly.
func _add_chapter_ending() -> void:
	var ending := GameState.chapter_ending()
	if ending.is_empty():
		return
	if GameState.chapter_cleared:
		_rail_box.add_child(_separator())
		_rail_box.add_child(_make_label(tr("chapter.cleared"), 15, MapStyle.TITLE_TEXT))
		var b := _make_button(tr("chapter.next"), PiritoriPalette.PLAYER_CYAN)
		b.pressed.connect(func():
			GameState.begin_next_chapter()
			_show_city())
		_rail_box.add_child(b)
		return

	if not GameState.chapter_goal_met():
		# Show the distance. A goal you cannot see the edge of is not a goal, it
		# is a surprise.
		_rail_box.add_child(_separator())
		_rail_box.add_child(_make_label(tr("chapter.progress") % [
			GameState.chapter_progress(), GameState.chapter_threshold],
			12, PiritoriPalette.TEXT_DIM))
		return

	_rail_box.add_child(_separator())
	_rail_box.add_child(_make_label(String(ending.get("label", "")).to_upper(),
		15, MapStyle.TITLE_TEXT))
	var brief := _make_label(String(ending.get("brief", "")), 12, PiritoriPalette.TEXT)
	brief.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_rail_box.add_child(brief)

	var stake := int(ending.get("stake_eur", 0))
	var here := String(ending.get("anchor_id", "")) == GameState.current_anchor_id
	if not here:
		var l := _make_label(tr("chapter.elsewhere"), 12, PiritoriPalette.INTEL_MUSTARD)
		l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		_rail_box.add_child(l)
		return

	var afford := GameState.cash_eur >= stake
	var go := _make_button(tr("chapter.commit") % stake,
		PiritoriPalette.GOODS_MAGENTA if afford else PiritoriPalette.LOCKED_GREY)
	go.disabled = not afford
	go.pressed.connect(func():
		if GameState.attempt_chapter_ending() == "":
			_show_chapter_result())
	_rail_box.add_child(go)


## What the night cost. Named outcomes rather than a number, because the number
## — money — is the one thing that does not survive the chapter anyway.
func _show_chapter_result() -> void:
	_show_city()
	_clear_rail()
	_rail.visible = true
	var out := GameState.last_ending_outcome
	_rail_box.add_child(_make_label(tr("chapter.cleared"), 19, MapStyle.TITLE_TEXT))
	# Written inline rather than through a variable. The locale gate scans the
	# SOURCE for interpolated translation keys, so one assembled into a local is
	# invisible to it and its rows get reported as stale. Three were.
	# (And a comment quoting the pattern literally gets scanned too, which is how
	# this comment came to be worded around it.)
	var l := _make_label(tr("chapter.out_%s" % out), 13, PiritoriPalette.TEXT)
	l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_rail_box.add_child(l)
	_rail_box.add_child(_separator())
	var b := _make_button(tr("chapter.next"), PiritoriPalette.PLAYER_CYAN)
	b.pressed.connect(func():
		GameState.begin_next_chapter()
		_show_city())
	_rail_box.add_child(b)


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

	if GameState.equipment.is_empty():
		_rail_box.add_child(_make_label(tr("ui.fence_nothing"), 12, PiritoriPalette.TEXT_DIM))
		return

	# One row per INSTANCE, not per type. Two pipes in different states are two
	# different things to sell at two different prices, and a list keyed on type
	# would hide exactly the decision §8.4 is trying to create.
	for idx in GameState.equipment.size():
		var eid := String(GameState.equipment[idx].get("id", ""))
		var paid := GameState.resale_at(idx)
		var nm := tr("equipment.%s" % eid)
		if nm == "equipment.%s" % eid:
			nm = eid
		# Condition is on the button, because it is the reason the price differs.
		var cond := GameState.condition_at(idx)
		var shown := nm if cond == GameState.Condition.NEW else "%s (%s)" % [
			nm, tr(GameState.condition_word(cond))]
		var b := _make_button(tr("ui.fence_sell") % [shown, paid],
			PiritoriPalette.GOODS_MAGENTA)
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

	# The bone rule takes the command's own accent, which is what makes a row
	# of five tabs distinguishable at a glance in the dark without relying on
	# colour alone — ART_BIBLE §4.2 keeps the icon and the word beside it.
	var sb := PiritoriChrome.button(accent)
	var hover := PiritoriChrome.button(accent, true)
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
		_add_level_lines(String(c.get("id", "")))

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
		_add_level_lines(cid)

	if not any:
		_rail_box.add_child(_make_label(tr("ui.crew_none"), 14, PiritoriPalette.TEXT_DIM))

	_add_hiring_section()


## WHAT IS WAITING FOR THIS PERSON (UX_SPEC §19).
##
## Spending lives on the crew screen rather than on a levelling screen of its
## own, beside who they are and what they carry: one screen per PERSON rather
## than one per SYSTEM, because somebody thinking about Mira is thinking about
## all of her at once.
##
## Silent when nothing is pending, so the screen does not grow a permanent
## scoreboard for a thing that happens occasionally.
func _add_level_lines(crew_id: String) -> void:
	var points := GameState.unspent_perk_points(crew_id)
	var offer: Array = GameState.skill_offer(crew_id)
	if points <= 0 and offer.is_empty():
		return

	_rail_box.add_child(_make_label("   " + tr("crew.level_n") % GameState.level_of(crew_id),
		12, PiritoriPalette.TEXT_DIM))

	# ── a skill, chosen from what their aptitudes offer ──
	if not offer.is_empty() and points > 0:
		_rail_box.add_child(_make_label("   " + tr("crew.pick_skill"), 12,
			PiritoriPalette.INTEL_MUSTARD))
		for sk in offer:
			var s2: Dictionary = sk
			var b := _make_button("%s — %s" % [s2.get("label", ""), s2.get("note", "")],
				PiritoriPalette.PLAYER_CYAN)
			var sid := String(s2.get("id", ""))
			b.pressed.connect(func():
				if GameState.learn_skill(crew_id, sid):
					# A skill costs the level's point, so a level is one thing or
					# the other rather than both.
					GameState.spend_perk_point_on_skill(crew_id)
				_show_crew())
			_rail_box.add_child(b)

	# ── or a perk ──
	if points > 0:
		_rail_box.add_child(_make_label("   " + tr("crew.pick_perk") % points, 12,
			PiritoriPalette.INTEL_MUSTARD))
		var row := HBoxContainer.new()
		row.add_theme_constant_override("separation", 6)
		for perk in ContentRegistry.slice.get("perks", []):
			var pid := String(perk)
			var pb := _make_button("%s %d" % [tr("perk.%s" % pid),
				GameState.perk_value(crew_id, pid)], PiritoriPalette.GOODS_MAGENTA)
			pb.pressed.connect(func():
				GameState.spend_perk(crew_id, pid)
				_show_crew())
			row.add_child(pb)
		_rail_box.add_child(row)

	# What they already know, so a choice is made against a history.
	var known := GameState.skills_of(crew_id)
	if not known.is_empty():
		var names: PackedStringArray = []
		for k in known:
			names.append(_skill_label(String(k)))
		_rail_box.add_child(_make_label("   " + ", ".join(names), 11,
			PiritoriPalette.TEXT_DIM))


func _skill_label(skill_id: String) -> String:
	for sk in ContentRegistry.slice.get("skills", []):
		if String((sk as Dictionary).get("id", "")) == skill_id:
			return String((sk as Dictionary).get("label", skill_id))
	return skill_id


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
	_set_mode(Mode.BATTLE)
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
		# A won fight counts toward a chapter cleared by fighting (GDD run
		# structure). Counted at settlement, where the result is known.
		if int(result) in [FightManager.BattleResult.VICTORY_ROUT,
				FightManager.BattleResult.VICTORY_BREAK]:
			GameState.record_chapter_win()
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

	# UX_SPEC §19: the summary is the junction. A way into the level-ups when
	# anything is waiting, and a way past them — nothing is forced, and points
	# can be spent three days later.
	_rail_box.add_child(_separator())
	if _anyone_waiting():
		var lv := _make_button(tr("chapter.level_ups") % _waiting_count(),
			PiritoriPalette.PLAYER_CYAN)
		lv.pressed.connect(_show_crew)
		_rail_box.add_child(lv)
	var back := _make_button(tr("ui.back_to_map"), PiritoriPalette.TEXT_DIM)
	back.pressed.connect(_show_city)
	_rail_box.add_child(back)


## Anybody with something to spend. Counted across the whole roster rather than
## only the people who fought: a point earned two battles ago is still waiting.
func _anyone_waiting() -> bool:
	return _waiting_count() > 0


func _waiting_count() -> int:
	var n := 0
	for id in GameState.roster:
		n += GameState.unspent_perk_points(String(id))
	return n


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
	_set_mode(Mode.NEWS)
	_clear_rail()
	_rail.visible = true
	_rail_box.add_child(_make_label(tr("cmd.messages"), 19, MapStyle.TITLE_TEXT))

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
	_set_mode(Mode.NEWS)
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


## A torn dark-card button with a vector icon and a coloured label — concept
## A's action row (owner-approved 2026-08-24), applied to the location
## screen's LOOK / ACT / LEAVE buttons. Kept separate from `_make_button`
## rather than changing it in place: that helper is shared by the city rail
## and the market ledger too, and this task is the location screen only.
func _make_icon_button(text: String, icon_kind: int, accent: Color,
		enabled: bool = true) -> Button:
	var tint := accent if enabled else PiritoriPalette.LOCKED_GREY
	var b := Button.new()
	b.text = ""
	b.custom_minimum_size = Vector2(0, maxf(MIN_TARGET, 44.0))
	b.disabled = not enabled
	b.focus_mode = Control.FOCUS_ALL
	var sb := PiritoriChrome.button(tint)
	var sb_hot := PiritoriChrome.button(tint, true)
	b.add_theme_stylebox_override("normal", sb)
	b.add_theme_stylebox_override("hover", sb_hot)
	b.add_theme_stylebox_override("pressed", sb_hot)
	b.add_theme_stylebox_override("disabled", sb)
	b.add_theme_stylebox_override("focus", sb_hot)

	var pad := MarginContainer.new()
	pad.set_anchors_preset(Control.PRESET_FULL_RECT)
	pad.mouse_filter = Control.MOUSE_FILTER_IGNORE
	pad.add_theme_constant_override("margin_left", 12)
	pad.add_theme_constant_override("margin_right", 12)
	pad.add_theme_constant_override("margin_top", 8)
	pad.add_theme_constant_override("margin_bottom", 8)
	b.add_child(pad)

	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 10)
	row.mouse_filter = Control.MOUSE_FILTER_IGNORE
	pad.add_child(row)

	var icon := PiritoriIcon.new(icon_kind, tint, 22.0)
	row.add_child(icon)

	var lbl := Label.new()
	lbl.text = text
	lbl.add_theme_font_size_override("font_size", 14)
	lbl.add_theme_color_override("font_color", tint)
	lbl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	lbl.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	lbl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_child(lbl)

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
