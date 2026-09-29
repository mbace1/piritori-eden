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
## UX_SPEC §3.2, COMMITTED CONTEXT — and it was not implemented.
##
## "Committed context: Location and Battle. The global shell contracts to a
## small status strip; switching to unrelated modes is disabled until the
## player leaves, resolves or explicitly withdraws." §3.4 narrows it further:
## "In committed context, show time block, cash and the current mission/scene
## only."
##
## The fight screen carried the full four-tab dock and an END DAY button, so a
## player could walk out of a committed fight straight into the market — and
## the board was starved of the space to do it, drawing at under half the
## frame while the chrome kept a bar it should not have had.
##
## Battle only for now. Location is committed too by the same clause and still
## shows its dock; that is a separate pass, filed in QUEUE.md, because the
## location screen's LEAVE affordance lives in its rail rather than the bar.
func _is_committed() -> bool:
	return mode == Mode.BATTLE


func _set_mode(m: Mode) -> void:
	mode = m
	if _title:
		_title.visible = (m == Mode.CITY)
	if _command_bar:
		_command_bar.visible = not _is_committed()
	_refresh_status()

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
var _rail_foot: VBoxContainer    ## the pinned next step, below the scroll
var _city_map: Control
var _is_portrait := false
var _stage_has_speaker := false   ## drives the portrait stage/rail split
var _hud: CanvasLayer
## Which non-encounter screen is up — "road", "ramen", "street", "case",
## "visit", "missions" — so a language switch can rebuild the same one.
var _screen := ""
var _visit_open := ""
## What Toko said at the last bowl: null = no bowl yet, "" = nothing new, or
## the anchor he named (web `tokoTold`, presentation only, never saved).
var _toko_told: Variant = null
var _toko_epoch := -1
var _arrival: Control


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
	# An encounter can ask for a battle mid-scene (start-battle / start-negotiation).
	GameState.battle_requested.connect(func(bid, _negotiation): _on_battle_requested(bid))
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
		# The arrival is owed to a NEW campaign only (web v4.59): a loaded one,
		# or any debug deep link, opens straight on the city.
		if GameState.arrival_due:
			_play_arrival()
		else:
			Sound.wake()
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
	Sound.wake()


## THE ARRIVAL (web v4.59/v4.61, `playOpening()`): the 3 pulls into Piritori
## in the rain and Aatami steps off. It lies over a city that is already built,
## so skipping it — any input, from frame one — reveals the map with its one
## lit step, and it changes nothing in the campaign.
func _play_arrival() -> void:
	if _arrival != null:
		return
	_arrival = preload("res://scenes/arrival.gd").new()
	_arrival.name = "Arrival"
	_arrival.still = _still()
	_arrival.finished.connect(func():
		_arrival = null
		if mode == Mode.CITY and _screen == "":
			_build_city_rail(_city_map.inspected()))
	add_child(_arrival)


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
	match _screen:
		"road":
			_show_road()
			return
		"ramen":
			_show_ramen()
			return
		"street":
			_show_street()
			return
		"case":
			_show_case()
			return
		"visit":
			_show_visit(_visit_open)
			return
		"missions":
			_show_missions()
			return
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
	bg.color = PiritoriPalette.NIGHT
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
	_title = _make_label("PIRITORI → EDEN", 30, PiritoriPalette.TEXT)
	_title.theme_type_variation = PiritoriChrome.TITLE
	_title.add_theme_constant_override("outline_size", 0)
	titles.add_child(_title)
	# An eyebrow, not cyan: cyan means YOU now (Lantern Noir, v4.56).
	_status_line2 = _make_label("", 12, PiritoriPalette.TEXT_FAINT)
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
	# Reported directly, 2026-08-26: "Text options below should be a bit more
	# condensed and hopefully no scrolling too much." The rows themselves
	# cannot shrink — they are 44px touch targets and that floor is a gate —
	# so the space comes out of the gaps between them and the rail's own
	# padding, which is where it was going.
	_rail_box.add_theme_constant_override("separation", 4)
	var rpad := MarginContainer.new()
	rpad.add_theme_constant_override("margin_left", 12)
	rpad.add_theme_constant_override("margin_right", 12)
	rpad.add_theme_constant_override("margin_top", 8)
	rpad.add_theme_constant_override("margin_bottom", 8)
	# A ScrollContainer gives its child the child's MINIMUM width unless the
	# child is told to expand. Without this the rail collapsed to one character
	# per line as soon as a label was long enough to wrap.
	rpad.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	rpad.add_child(_rail_box)
	scroll.add_child(rpad)
	# THE FOOT (web v4.57's next-step bar, "pinned above the command bar"):
	# the rail's one lit action lives below the scroll, so a long rail — a
	# planned journey states its path and its cost — can never push the way
	# forward below the fold. It is still the last thing on the rail.
	var rail_col := VBoxContainer.new()
	rail_col.add_theme_constant_override("separation", 0)
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	rail_col.add_child(scroll)
	_rail_foot = VBoxContainer.new()
	_rail_foot.add_theme_constant_override("separation", 6)
	var fpad := MarginContainer.new()
	for side in ["left", "right"]:
		fpad.add_theme_constant_override("margin_" + side, 12)
	fpad.add_theme_constant_override("margin_top", 0)
	fpad.add_theme_constant_override("margin_bottom", 10)
	fpad.add_child(_rail_foot)
	rail_col.add_child(fpad)
	_rail.add_child(rail_col)
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

	# MEASURE THE WORDS, DO NOT ASSUME THEM.
	#
	# The label size used to be h * COMMAND_LABEL_FRACTION with a floor and no
	# ceiling. On a tall phone the bar is tall, so that produced a very large
	# font, and a button whose CONTENT is wider than its `custom_minimum_size`
	# simply grows — four of them then overflowed the screen and MISSIONS was
	# cut off the right edge entirely. `per` was never the real width.
	#
	# So the type is fitted to the space instead: the largest size at which the
	# longest command still sits beside its icon within `per`, chosen once and
	# shared so the bar stays even. This also stops the same bug happening
	# again in Finnish or Japanese, where the words are not the same length.
	var icon_w := h * COMMAND_ICON_FRACTION
	# Room is what a button really gets: they EXPAND to share the bar, so a
	# landscape window gives each ~300 units while `per` (the minimum) stays
	# 96 — measuring against the minimum dropped every word on a desktop.
	var avail := per
	if count > 0:
		avail = maxf(per, (vp.x - COMMAND_BAR_SEPARATION * float(count - 1) - COMMAND_BAR_PADDING) / float(count))
	var room := avail - icon_w - COMMAND_BAR_SEPARATION - 14.0
	var size_px := int(maxf(h * COMMAND_LABEL_FRACTION, 13.0))
	if not icons_only and room > 0.0:
		var font: Font = null
		for b in _commands:
			if b == null:
				continue
			var l = b.get_meta("label", null)
			if l != null and l is Label:
				font = l.get_theme_font("font")
				break
		if font != null:
			while size_px > PiritoriFonts.FLOOR_PX:
				var widest := 0.0
				for b in _commands:
					if b == null:
						continue
					var l2 = b.get_meta("label", null)
					if l2 == null or not (l2 is Label):
						continue
					widest = maxf(widest, font.get_string_size(
						l2.text, HORIZONTAL_ALIGNMENT_LEFT, -1, size_px).x)
				if widest <= room:
					break
				size_px -= 1
			# Still too wide at the floor: the word cannot share the button.
			if size_px <= PiritoriFonts.FLOOR_PX:
				icons_only = true

	for b in _commands:
		if b == null:
			continue
		b.custom_minimum_size = Vector2(per, h)
		var icon = b.get_meta("icon", null)
		if icon != null:
			icon.custom_minimum_size = Vector2(icon_w, icon_w)
		var label = b.get_meta("label", null)
		if label != null:
			label.visible = not icons_only
			label.add_theme_font_size_override("font_size", size_px)


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
		# Reported directly, 2026-08-26: "We need to see the small characters
		# and their faces close up screens when they talk, so that area needs a
		# bit more room on the vertical format."
		#
		# The operative words are WHEN THEY TALK. A flat cut to the rail bought
		# the stage its room by pushing ACT below the fold on every screen,
		# including the ones with nobody standing in them — trading one half of
		# the same request for the other. So the split follows the scene: when
		# a speaker is actually mounted, the stage takes the room and the list
		# scrolls; when the stage is only a place, the list keeps it.
		var share := 0.25 if _stage_has_speaker else 0.33
		_rail.custom_minimum_size = Vector2(0, maxf(vp.y * share, 168.0))
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
	# PORTRAIT IS ALWAYS NARROW. Reported 2026-08-27 from a Pixel screenshot:
	# the status chips ran off the right edge, half a chip visible. That phone
	# reports 1079 physical pixels, so `real_w < 620` said "wide" and the shell
	# laid out desktop chrome on a screen that is, in the hand, narrow. A raw
	# pixel count has not meant physical width since phones got dense screens.
	# Whether the display is taller than it is wide does mean it, on every
	# device, with no DPI guesswork.
	var narrow := real_w < 620.0 or vp.y > vp.x

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

	# SOUND · ON / OFF (web v4.59): remembered, and OFF closes the whole graph.
	var snd := Button.new()
	snd.name = "SoundSwitch"
	snd.text = tr("ui.sound_on") if Sound.on else tr("ui.sound_off")
	snd.custom_minimum_size = Vector2(MIN_TARGET * 2.4, MIN_TARGET)
	snd.focus_mode = Control.FOCUS_ALL
	snd.add_theme_font_size_override("font_size", 13)
	snd.add_theme_color_override("font_color", MapStyle.TITLE_TEXT if Sound.on else MapStyle.TINY_TEXT)
	var ssb := PiritoriChrome.button(MapStyle.SUB_TEXT if Sound.on else PiritoriChrome.RULE, Sound.on)
	snd.add_theme_stylebox_override("normal", ssb)
	snd.add_theme_stylebox_override("hover", ssb)
	snd.add_theme_stylebox_override("pressed", ssb)
	snd.pressed.connect(func():
		Sound.set_sound(not Sound.on)
		_rebuild_language_buttons())
	_langs.add_child(snd)

	# CLAUDE.md rule 6: reachable without a keyboard or a URL, because the
	# device it matters on has neither.
	var dev := Button.new()
	dev.text = "DEV"
	dev.custom_minimum_size = Vector2(MIN_TARGET, MIN_TARGET)
	dev.tooltip_text = "Developer overlay (F3)"
	dev.focus_mode = Control.FOCUS_ALL
	dev.add_theme_font_size_override("font_size", PiritoriFonts.FLOOR_PX)
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
	# The block's clock reads later once the road has spent minutes in it
	# (web v4.58: DAY 2 · NIGHT · 21:00). Minutes never turn a block (D002).
	var clock := PiritoriRoad.clock_label()
	_add_stat(PiritoriIcon.Kind.END_DAY, MapStyle.TITLE_TEXT,
		"%s · %s" % [tr("ui.day_n") % GameState.day, _block_word()] + (" · " + clock if clock != "" else ""))

	# §3.4: committed context shows the time block, the cash and the scene —
	# and nothing else. END DAY in particular must not be reachable mid-fight:
	# it is a City action (§3.3), and ending the day out from under a battle
	# is not a decision the player should be able to make by mistake.
	if _is_committed():
		_add_cash_stat()
		return

	_add_end_day_button()
	_add_stat(PiritoriIcon.Kind.CREW, MapStyle.FLOW, "%d" % _crew_known())
	var packs := 0
	for v in GameState.stock.values():
		packs += int(v)
	_add_stat(PiritoriIcon.Kind.STOCK, MapStyle.GOODS, "%d" % packs)
	_add_stat(PiritoriIcon.Kind.MISSION, MapStyle.METRO, "%d" % _live_leads())
	_add_cash_stat()


# ── money you can feel (web Act I v4.57, `renderCash()`) ───────────────────
#
# The cash chip counts to its new value and names the change beside it
# (+€68 / −€45). PRESENTATION ONLY: the value at rest is always
# GameState.cash_eur, and a new campaign or a load (a new `campaign_epoch`)
# reports no change, because there is nothing to have changed from. Under a
# still preference (`?still`) the number jumps and the change still shows,
# held rather than faded, so no information lives only in motion.
const CASH_COUNT_SEC := 0.65
const CASH_DELTA_SEC := 3.2

var _cash_shown := 0            ## GameState.cash_eur at the last refresh
var _cash_epoch := -1
var _cash_display := 0.0        ## what the chip reads right now (mid-count)
var _cash_delta := 0            ## the change being named, or 0
var _cash_delta_until := 0      ## msec; the delta is dropped after this
var _cash_label: Label
var _cash_tween: Tween

func _still() -> bool:
	return DebugEntry.has("still")


func _add_cash_stat() -> void:
	var to := GameState.cash_eur
	var now := Time.get_ticks_msec()
	if _cash_epoch != GameState.campaign_epoch:
		_cash_display = float(to)
		_cash_delta = 0
		if _cash_tween:
			_cash_tween.kill()
	elif to != _cash_shown:
		_cash_delta = to - _cash_shown
		# The till (web v4.59): bright for money in, lower for money out.
		Sound.till(1 if _cash_delta > 0 else -1)
		_cash_delta_until = now + int(CASH_DELTA_SEC * 1000.0)
		if _cash_tween:
			_cash_tween.kill()
		if _still():
			_cash_display = float(to)
		else:
			_cash_tween = create_tween()
			_cash_tween.set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
			_cash_tween.tween_method(_set_cash_display, _cash_display, float(to), CASH_COUNT_SEC)
	_cash_shown = to
	_cash_epoch = GameState.campaign_epoch

	_cash_label = _add_stat(PiritoriIcon.Kind.CASH, MapStyle.ROUTE, _cash_text(_cash_display))
	if _cash_delta == 0 or now >= _cash_delta_until:
		_cash_delta = 0
		return
	var up := _cash_delta > 0
	var d := _make_label("%s€%s" % ["+" if up else "−", _thousands(absi(_cash_delta))],
		int(_cash_label.get_theme_font_size("font_size")) - 2,
		PiritoriPalette.CASH_UP if up else PiritoriPalette.CASH_DOWN, false)
	d.name = "CashDelta"
	d.set_meta("cash_delta", _cash_delta)
	_cash_label.get_parent().add_child(d)
	var left := float(_cash_delta_until - now) / 1000.0
	var fade := create_tween().bind_node(d)
	if _still():
		fade.tween_interval(left)
		fade.tween_callback(d.hide)
	else:
		fade.tween_interval(maxf(left - 0.6, 0.0))
		fade.tween_property(d, "modulate:a", 0.0, minf(0.6, left))


func _set_cash_display(v: float) -> void:
	_cash_display = v
	if is_instance_valid(_cash_label):
		_cash_label.text = _cash_text(v)


## Mid-count the number is rounded; at rest it is exactly the state's.
func _cash_text(v: float) -> String:
	var n := GameState.cash_eur if absf(v - float(GameState.cash_eur)) < 0.5 else int(round(v))
	return "€ %s" % _thousands(n)


## UX_SPEC.md §3.3 ("Navigation model"): "`WAIT / CLOSE BLOCK` is an explicit
## City action beside the clock, not a primary navigation tab." The clock is
## the day/block chip just added above; this is the separate control that
## sits next to it, replacing the old fifth command-bar button.
func _add_end_day_button() -> void:
	var btn := Button.new()
	btn.text = tr("cmd.end_day")
	# UX_SPEC §3.3 puts this beside the clock rather than in a tab, so it is
	# chrome and takes its size from the screen like the chips it sits with.
	var s := _text_scale()
	btn.custom_minimum_size = Vector2(0, maxf(MIN_TARGET, MIN_TARGET * s * 0.8))
	btn.focus_mode = Control.FOCUS_ALL
	btn.add_theme_font_size_override("font_size", int(round(13.0 * s)))
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
func _add_stat(kind: int, col: Color, text: String) -> Label:
	var vp := get_viewport_rect().size
	var basis: float = vp.y if vp.y > vp.x else vp.x
	var icon_px := clampf(basis * STAT_ICON_FRACTION, 17.0, 64.0)
	var text_px := int(clampf(basis * STAT_TEXT_FRACTION, 16.0, 60.0))

	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", int(maxf(icon_px * 0.35, 6.0)))
	row.add_child(PiritoriIcon.new(kind, col, icon_px))
	# Already sized from the screen two lines up — must not be scaled again.
	var l := _make_label(text, text_px, MapStyle.TITLE_TEXT, false)
	row.add_child(l)
	_stats.add_child(row)
	return l


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
		# The map is kept and re-mounted; everything else was built for one
		# visit. Left orphaned, a ledger kept rebuilding itself on every
		# `state_changed` from outside the tree, and every stage lived forever.
		if c != _city_map:
			c.queue_free()


func _clear_rail() -> void:
	for c in _rail_box.get_children():
		c.queue_free()
	for c in _rail_foot.get_children():
		c.queue_free()


func _show_city() -> void:
	# A pending road event waits for an answer; nothing else opens past it
	# (web `render()`), and it survives a reload.
	if _road_guard():
		return
	_set_mode(Mode.CITY)
	_screen = ""
	_open_encounter = ""
	_stage_has_speaker = false
	if _rail:
		_rail.visible = true
	# Chapter 1 ends on the chapter turn, not on Pasila (H1/H8, v4.65).
	if GameState.is_slice_complete() and GameState.ending_id == "":
		_show_chapter_close()
		return
	# Era I news is a SCHEDULED broadcast: it arrives, it is not browsed to.
	if _play_scheduled_news_if_due():
		return
	_clear_world()
	_world_host.add_child(_city_map)
	_city_map.call_deferred("_rebuild_layout")
	# Coming back to the city looks where Aatami stands (M1): a cursor left on
	# some other place, or a half-planned journey, does not survive a scene.
	_journey = {}
	_city_map.reset_inspection()
	_build_city_rail(GameState.current_anchor_id)


func _on_anchor_selected(anchor_id: String) -> void:
	# The chapter has closed: the map stays to look at, the rail stays closed.
	if _screen == "chapter-close":
		return
	# Looking somewhere else throws a planned journey away.
	if String(_journey.get("destination", "")) != anchor_id:
		_journey = {}
		_city_map.show_journey(PackedStringArray())
	_build_city_rail(anchor_id)


## A planned journey (GameState.preview_journey) — local to the shell, never
## saved, so Cancel, a scene change or a reload leaves the campaign untouched.
var _journey: Dictionary = {}

func _plan_journey(anchor_id: String) -> void:
	_journey = GameState.preview_journey(anchor_id)
	_city_map.show_journey(PackedStringArray(_journey.get("path", [])) if bool(_journey.get("ok", false)) else PackedStringArray())
	_build_city_rail(anchor_id)


func _cancel_journey() -> void:
	var at := String(_journey.get("destination", GameState.current_anchor_id))
	_journey = {}
	_city_map.show_journey(PackedStringArray())
	_build_city_rail(at)


func _commit_journey() -> void:
	# Taken, then cleared BEFORE the commit: a second press finds no plan and
	# does nothing at all.
	if _journey.is_empty():
		return
	var plan := _journey
	_journey = {}
	_city_map.show_journey(PackedStringArray())
	var result := GameState.commit_journey(plan)
	if not bool(result.get("ok", false)):
		_build_city_rail(String(plan.get("destination", GameState.current_anchor_id)))
		_rail_box.add_child(_make_label(tr("ui.journey_refused"), 14, PiritoriPalette.TEXT_DIM))
		return
	Sound.steps()
	# The road (web v4.58): a surprise — the preview never forecast it.
	if not PiritoriRoad.roll(result).is_empty():
		Sound.sting(0.9)
		_show_road()
		return
	_city_map.select(String(result["destination"]))


func _build_city_rail(anchor_id: String) -> void:
	_clear_rail()
	_build_city_rail_body(anchor_id)
	_add_next_step()


func _build_city_rail_body(anchor_id: String) -> void:
	# A block the spine leaves free offers its doors first, wherever the map
	# is looking (web `renderDoorBoard`, above the inspect panel).
	_add_door_board()
	if anchor_id == "":
		_rail_box.add_child(_make_label(tr("ui.select_place"), 15, PiritoriPalette.TEXT_DIM))
		return

	var a := ContentRegistry.anchor(anchor_id)
	if a.is_empty():
		return
	var state: String = a.get("sliceState", "locked")

	var place := _make_label(String(a.get("label", anchor_id)).to_upper(), 28)
	place.theme_type_variation = PiritoriChrome.TITLE
	_rail_box.add_child(place)
	# The glyph carries the state; the word stays ink. Cyan is spent on YOU now.
	_rail_box.add_child(_make_label("%s  %s" % [
		PiritoriPalette.state_glyph(state), tr(PiritoriPalette.state_key(state))],
		13, PiritoriPalette.TEXT_DIM))

	var roles: Array = a.get("roles", [])
	if roles.size() > 0:
		_rail_box.add_child(_make_label(" · ".join(roles), 13, PiritoriPalette.TEXT_DIM))

	_rail_box.add_child(_separator())

	# Kello's cut landed as the night ended (web v4.63's toast): said once,
	# for the block it arrived in.
	if GameState.cut_paid_block >= 0 and GameState.cut_paid_block == GameState.block_index:
		var paid := int(ContentRegistry.story_case().get("cut", {}).get("nightly_eur", 0))
		var cl := _make_label(tr("story.cut_paid") % paid, 13, PiritoriPalette.INTEL_MUSTARD)
		cl.name = "CutPaid"
		cl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		_rail_box.add_child(cl)

	# The authored slice is owner-written narrative and exists in one language.
	# Say so plainly rather than letting English prose under a Finnish or
	# Japanese interface read as a bug.
	if not Loc.content_is_translated():
		var note := _make_label(tr("ui.content_en_only"), 12, PiritoriPalette.TEXT_DIM)
		note.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		_rail_box.add_child(note)

	# Looking is not being there (M1): who stands where, and where the story is.
	var present := ContentRegistry.anchor(GameState.current_anchor_id)
	var lead_id := GameState.story_lead_id()
	var lead := ContentRegistry.anchor(lead_id) if lead_id != "" else {}
	var here := anchor_id == GameState.current_anchor_id
	_rail_box.add_child(_make_label(tr("ui.you_are_here") if here else tr("ui.inspecting"),
		13, PiritoriPalette.YOU if here else PiritoriPalette.TEXT_DIM))
	var who := _make_label(tr("ui.presence_line") % [
		String(present.get("label", GameState.current_anchor_id)),
		String(lead.get("label", "—")) if lead_id != "" else "—"], 13, PiritoriPalette.TEXT_DIM)
	who.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_rail_box.add_child(who)
	if not here:
		_build_away_rail(anchor_id, state, lead_id)
		return

	# Encounters playable in THIS block. The slice schedules one per block, so
	# a site hosting several (piritori_first_buy hosts day 1 and day 5) offers
	# only the one that is due.
	var any := false
	for enc in GameState.available_encounters_at(anchor_id):
		any = true
		var entry := ContentRegistry.schedule_of_encounter(String(enc["id"]))
		# JSON numbers arrive as floats — int() or the rail reads "Day 1.0".
		var when := ""
		if not entry.is_empty():
			var blk := String(entry.get("block", ""))
			when = "  ·  %s %s" % [
				tr("ui.day_n") % int(entry.get("day", 0)),
				tr("ui.block.night") if blk == "night" else tr("ui.block.day"),
			]
		# Unlit: the same action is the lit next step at the foot of the rail.
		var b := _make_button("▶ " + _encounter_label(enc) + when,
			PiritoriPalette.TEXT)
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

	# The places with a face (web v4.60-v4.62). None of these is ever lit:
	# the next step stays the one lit thing on the rail.
	if _add_here_buttons(anchor_id):
		any = true

	if not any:
		_rail_box.add_child(_make_label(
			tr("ui.nothing_here") if state != "locked" else tr("ui.closed_era"),
			14, PiritoriPalette.TEXT_DIM))


## What an encounter is called on a button: a door by its title, anything
## else by the site it happens at.
func _encounter_label(enc: Dictionary) -> String:
	if enc.has("door"):
		return String(enc.get("title", enc.get("id", "")))
	var sid := String(enc.get("site_id", "")) if enc.get("site_id", null) != null else ""
	if sid == "":
		return String(enc.get("id", ""))
	return String(ContentRegistry.site(sid).get("label", enc.get("id", "")))


# ── doors (H2; web v4.65 `renderDoorBoard`) ────────────────────────────────
#
# A block the spine leaves free offers 2-3 doors. Take one: it becomes the
# block's work where it is, and the others close with the block. Each card
# says what kind of job it is, who offers it, where, the risk, whether it can
# become a fight and whether it closes at 22:00 — then its three steps and
# its stakes. The template words are canon, authored in English like the
# road's; the chrome around them is the locale's.

## The door board, or nothing off a free block (or once a door is taken).
func _add_door_board() -> void:
	if not PiritoriDoors.is_door_block() or not PiritoriDoors.taken_at().is_empty() \
			or GameState.is_slice_complete():
		return
	var offers := PiritoriDoors.offer_doors()
	var board := VBoxContainer.new()
	board.name = "DoorBoard"
	board.add_theme_constant_override("separation", 6)
	_rail_box.add_child(board)
	board.add_child(_make_label(tr("door.free_block") % _day_block(), 12, PiritoriPalette.TEXT_DIM))
	var head := _make_label(tr("door.open_n") % offers.size(), 22)
	head.theme_type_variation = PiritoriChrome.TITLE
	board.add_child(head)
	var note := _make_label(tr("door.note") % [GameState.fights_today(),
		int(PiritoriDoors.rules().get("fights_per_day_max", 2))], 12, PiritoriPalette.TEXT_DIM)
	note.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	board.add_child(note)
	if not Loc.content_is_translated():
		var en := _make_label(tr("ui.content_en_only"), 12, PiritoriPalette.TEXT_DIM)
		en.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		board.add_child(en)
	for offer in offers:
		board.add_child(_door_card(offer))
	if offers.is_empty():
		var none := _make_label(tr("door.none"), 13, PiritoriPalette.TEXT_DIM)
		none.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		board.add_child(none)
		var pass_btn := _make_button(tr("door.pass"), PiritoriPalette.TEXT_DIM)
		pass_btn.pressed.connect(_end_block)
		board.add_child(pass_btn)
	_rail_box.add_child(_separator())


## One door: kind · from · where, the title, the premise, three steps, the
## tags, the stakes, and TAKE.
func _door_card(offer: Dictionary) -> Control:
	var t := PiritoriDoors.template_of(String(offer.get("template", "")))
	var anchor := String(offer.get("anchor", ""))
	var where := String(ContentRegistry.anchor(anchor).get("label", anchor))
	var card := VBoxContainer.new()
	card.name = "Door_" + String(t.get("id", ""))
	card.set_meta("door", String(t.get("id", "")))
	card.set_meta("kind", String(t.get("kind", "")))
	card.set_meta("anchor", anchor)
	card.add_theme_constant_override("separation", 3)
	card.add_child(_separator())
	# Each word written out so the locale gate sees every key.
	var kind := String({"gig": tr("door.kind_gig"), "pickup": tr("door.kind_pickup"),
		"sale": tr("door.kind_sale"), "favour": tr("door.kind_favour"),
		"watch": tr("door.kind_watch"), "hit": tr("door.kind_hit")}.get(String(t.get("kind", "")), String(t.get("kind", ""))))
	var from := String({"network": tr("door.from_network"), "street": tr("door.from_street"),
		"toko": tr("door.from_toko"), "mccormick_family": tr("door.from_mccormick_family"),
		"jade_lantern_network": tr("door.from_jade_lantern_network")}.get(String(t.get("from", "")), String(t.get("from", ""))))
	var eyebrow := _make_label("%s · %s · %s" % [kind, from, where.to_upper()], 12, PiritoriPalette.INTEL_MUSTARD)
	eyebrow.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	card.add_child(eyebrow)
	var title := _make_label(String(t.get("title", "")).to_upper(), 16, MapStyle.TITLE_TEXT)
	title.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	card.add_child(title)
	var prem := _make_label(String(t.get("premise", "")), 12, PiritoriPalette.TEXT)
	prem.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	card.add_child(prem)
	var n := 0
	for step in t.get("steps", []):
		n += 1
		var sl := _make_label("%d. %s" % [n, String(step)], 12, PiritoriPalette.TEXT_DIM)
		sl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		card.add_child(sl)
	var tags := PackedStringArray([String({"low": tr("door.risk_low"), "medium": tr("door.risk_medium"),
		"high": tr("door.risk_high")}.get(String(t.get("risk", "")), String(t.get("risk", ""))))])
	if PiritoriDoors.can_fight(t):
		tags.append(tr("door.fight"))
	if bool(t.get("late", false)):
		tags.append(tr("door.late"))
	var tl := _make_label(" · ".join(tags), 12,
		PiritoriPalette.DANGER_RED if PiritoriDoors.can_fight(t) else PiritoriPalette.TEXT_DIM)
	tl.name = "DoorTags"
	tl.set_meta("can_fight", PiritoriDoors.can_fight(t))
	tl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	card.add_child(tl)
	var stakes := _make_label(String(t.get("stakes", "")), 12, PiritoriPalette.INTEL_MUSTARD)
	stakes.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	card.add_child(stakes)
	var blocked := PiritoriDoors.door_blocker(offer)
	var b := _make_button(tr("door.closed") if blocked == "closed" else tr("door.take") % where.to_upper(),
		PiritoriPalette.YOU if blocked == "" else PiritoriPalette.TEXT_DIM)
	b.disabled = blocked != ""
	b.set_meta("take_door", String(t.get("id", "")))
	var tid := String(t.get("id", ""))
	b.pressed.connect(func(): _take_door(tid))
	card.add_child(b)
	return card


## Take a door: it becomes the block's encounter where it is. Look there, and
## say so; the next step then plans the walk.
func _take_door(template_id: String) -> void:
	var r := PiritoriDoors.take_door(template_id)
	if not bool(r.get("ok", false)):
		_build_city_rail(_city_map.inspected())
		return
	var anchor := String(r["offer"].get("anchor", ""))
	_city_map.select(anchor)
	var said := _make_label(tr("door.taken") % [String(r["encounter"].get("title", "")),
		String(ContentRegistry.anchor(anchor).get("label", anchor))], 13, PiritoriPalette.YOU)
	said.name = "DoorTaken"
	said.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_rail_box.add_child(said)
	_rail_box.move_child(said, 0)


## The rail for a place Aatami is only LOOKING at: no encounter, no market —
## a journey there, or why not.
func _build_away_rail(anchor_id: String, state: String, lead_id: String) -> void:
	if anchor_id == lead_id:
		_rail_box.add_child(_make_label(tr("ui.travel_first"), 14, PiritoriPalette.TEXT_DIM))
	if bool(_journey.get("ok", false)) and String(_journey.get("destination", "")) == anchor_id:
		var names: Array = []
		for id in _journey["path"]:
			names.append(String(ContentRegistry.anchor(String(id)).get("label", id)))
		_rail_box.add_child(_make_label(tr("ui.journey_legs") % (names.size() - 1), 14, PiritoriPalette.YOU))
		var route := _make_label(" → ".join(names), 14)
		route.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		_rail_box.add_child(route)
		var cost := _make_label(tr("ui.journey_cost"), 12, PiritoriPalette.TEXT_DIM)
		cost.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		_rail_box.add_child(cost)
		var go := _make_button(tr("ui.travel"), PiritoriPalette.YOU)
		go.pressed.connect(_commit_journey)
		_rail_box.add_child(go)
		var stop := _make_button(tr("ui.cancel_journey"), PiritoriPalette.TEXT_DIM)
		stop.pressed.connect(_cancel_journey)
		_rail_box.add_child(stop)
		return
	var plan := GameState.preview_journey(anchor_id)
	if bool(plan.get("ok", false)):
		var b := _make_button(tr("ui.travel_here") % String(ContentRegistry.anchor(anchor_id).get("label", anchor_id)),
			PiritoriPalette.YOU)
		b.pressed.connect(func(): _plan_journey(anchor_id))
		_rail_box.add_child(b)
	else:
		_rail_box.add_child(_make_label(
			tr("ui.closed_era") if state == "locked" else tr("ui.look_not_go"),
			14, PiritoriPalette.TEXT_DIM))


# ── the next step (web Act I v4.57, `nextStep()` in web/js/v3/app.js) ──────
#
# Measured on the browser build before v4.57: 3 of 11 opening steps on a desktop
# had no lit action in view. Every time the story moved the lead the copy said
# "go to the newly highlighted anchor" and offered no button. So the city rail
# ENDS with exactly one lit action, derived from state and nothing else:
#
#   a journey is planned            → TRAVEL · <destination>   (commits it)
#   Aatami is at the lead, its      → ENTER · <encounter>      (opens it)
#     encounter still available
#   the lead is somewhere else      → TRAVEL TO <lead>         (PLANS it)
#
# It only routes to the ordinary actions the rail already has — it has no
# rules of its own — and a stale step (the state moved under it) does nothing.
# The rail's own buttons for the same actions stay, unlit.

## The step, or {} when the story offers none (the campaign is over, the
## beat here is spent, the lead cannot be walked to).
func _next_step() -> Dictionary:
	if GameState.ending_id != "" or GameState.is_slice_complete():
		return {}
	var entry := GameState.current_schedule()
	# A free block (H2): until a door is taken the step is to choose one.
	if bool(entry.get("door", false)) and String(entry.get("encounter_id", "")) == "" \
			and not bool(_journey.get("ok", false)):
		return {"step": "doors", "label": tr("ui.next_doors"), "hint": tr("ui.next_hint_doors")}
	if bool(_journey.get("ok", false)):
		var dest := String(_journey.get("destination", ""))
		return {"step": "commit", "label": tr("ui.next_travel") % _anchor_label(dest),
			"hint": tr("ui.next_hint_commit")}
	var lead_id := GameState.story_lead_id()
	if lead_id == "":
		return {}
	if GameState.current_anchor_id == lead_id:
		var eid := String(entry.get("encounter_id", ""))
		if eid == "" or not GameState.is_encounter_available(eid):
			return {}
		var enc := ContentRegistry.encounter(eid)
		return {"step": "enter", "encounter": eid,
			"label": tr("ui.next_enter") % _encounter_label(enc).to_upper(),
			"hint": tr("ui.next_hint_enter") % String(ContentRegistry.anchor(lead_id).get("label", lead_id))}
	if not bool(GameState.preview_journey(lead_id).get("ok", false)):
		return {}
	return {"step": "plan", "lead": lead_id,
		"label": tr("ui.next_travel_to") % _anchor_label(lead_id),
		"hint": tr("ui.next_hint_plan")}


func _add_next_step() -> void:
	var next := _next_step()
	if next.is_empty():
		return
	_rail_foot.add_child(_separator())
	var hint := _make_label(String(next["hint"]), 13, PiritoriPalette.TEXT_DIM)
	hint.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_rail_foot.add_child(hint)
	var step := String(next["step"])
	var b := _make_lit(String(next["label"]))
	b.set_meta("next_step", step)
	b.pressed.connect(func(): _on_next_step(step))
	_rail_foot.add_child(b)


func _on_next_step(step: String) -> void:
	var next := _next_step()
	if next.is_empty() or String(next["step"]) != step:
		_build_city_rail(_city_map.inspected())
		return
	match step:
		"enter":
			_show_location(String(next["encounter"]))
		"plan":
			# Look at the lead, then plan the walk there — the same two things
			# a thumb would do on the map and then on TRAVEL HERE.
			var lead := String(next["lead"])
			_city_map.select(lead)
			_plan_journey(lead)
		"commit":
			_commit_journey()
		"doors":
			# The board is the top of the rail; look where Aatami stands.
			_city_map.select(GameState.current_anchor_id)


## THE lit primary (PiritoriChrome.LIT): lantern amber, dark ink. One per rail.
func _make_lit(text: String) -> Button:
	var b := Button.new()
	b.text = text
	b.theme_type_variation = PiritoriChrome.LIT
	var s := _text_scale()
	b.custom_minimum_size = Vector2(0, maxf(MIN_TARGET + 4.0, (MIN_TARGET + 4.0) * s * 0.8))
	b.add_theme_font_size_override("font_size", int(round(16.0 * s)))
	b.focus_mode = Control.FOCUS_ALL
	b.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	b.alignment = HORIZONTAL_ALIGNMENT_CENTER
	return b


func _show_location(encounter_id: String) -> void:
	_set_mode(Mode.LOCATION)
	_screen = ""
	_open_encounter = encounter_id
	# Standing in the scene is standing in the place (web `openEncounter`).
	if GameState.encounter_anchor(encounter_id) == GameState.current_anchor_id:
		GameState.mark_seen(GameState.current_anchor_id)
	# Cleared per scene, not per session: a face in the LAST location must not
	# keep shrinking the list in the next one, which has nobody in it.
	_stage_has_speaker = false
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
	var who := _encounter_speaker_id(enc)
	if who == "":
		return
	_mount_speaker(who, stage)


## The face behind the counter, for any scene that has one (an encounter, Toko's
## counter, a visit) — one component, one framing.
func _mount_speaker(who: String, stage: Control) -> void:
	var speaker = _Presenter3D.new()

	speaker.speaker_id = who
	speaker.framing = speaker.Framing.COUNTER
	if not speaker.available():
		speaker.free()
		return
	# The portrait split reads this: a scene with a face in it gets more of the
	# screen than a scene that is only a place. Set before the reflow below.
	_stage_has_speaker = true
	if _is_portrait:
		_apply_rail_size(get_viewport_rect().size, true)
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

	# A door is briefed the way v4.62 briefs a mission: its three steps and
	# its stakes, before anything is chosen (web `renderEncounter`).
	if enc.has("door"):
		var t := PiritoriDoors.template_of(String(enc["door"]))
		_rail_box.add_child(_make_label(String(enc.get("title", "")).to_upper(), 15, MapStyle.TITLE_TEXT))
		var n := 0
		for step in t.get("steps", []):
			n += 1
			var sl := _make_label("%d. %s" % [n, String(step)], 12, PiritoriPalette.TEXT)
			sl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
			sl.set_meta("door_step", n)
			_rail_box.add_child(sl)
		var stakes := _make_label(String(t.get("stakes", "")), 12, PiritoriPalette.INTEL_MUSTARD)
		stakes.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		_rail_box.add_child(stakes)
		_rail_box.add_child(_separator())

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
			b.set_meta("choice", cid)
			b.pressed.connect(func(): _commit_choice(encounter_id, cid))
			_rail_box.add_child(b)

			var fl := _make_label("   " + forecast, 12, PiritoriPalette.TEXT_DIM)
			fl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
			_rail_box.add_child(fl)
			# Answer 25: a bad deal says it can go bad, and how likely.
			if choice.get("escalates", null) != null and float(choice["escalates"]) > 0.0:
				var bad := _make_label("   " + tr("door.can_go_bad") % int(round(float(choice["escalates"]) * 100.0)),
					12, PiritoriPalette.DANGER_RED)
				bad.set_meta("escalates", cid)
				_rail_box.add_child(bad)
			if not can:
				# Refused in words, never a formula (web `readableReason`).
				var failed: Array = []
				for r in choice.get("requirements", []):
					var st := GameState.requirement_status(String(r))
					if not bool(st["ok"]):
						failed.append(st)
				var req := _make_label("   " + _refusal_words(failed), 12, PiritoriPalette.DANGER_RED)
				req.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
				_rail_box.add_child(req)

	_rail_box.add_child(_separator())
	var back := _make_icon_button(tr("ui.leave_to_map"), PiritoriIcon.Kind.LEAVE, PiritoriChrome.ACCENT_LEAVE)
	back.pressed.connect(_show_city)
	_rail_box.add_child(back)


func _commit_choice(encounter_id: String, choice_id: String) -> void:
	# A choice that starts a fight has already opened the battle (the
	# `battle_requested` signal fires inside the resolution); the city waits
	# until the fight is over instead of being drawn over it.
	if GameState.resolve_encounter(encounter_id, choice_id) and mode != Mode.BATTLE:
		_show_city()
		# Answer 25: it went bad with nobody standing with Aatami — say so.
		if String(GameState.last_escalation.get("kind", "")) == "alone" and _screen == "":
			var l := _make_label(tr("door.went_bad_alone"), 14, PiritoriPalette.DANGER_RED)
			l.name = "DealWentBad"
			l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
			_rail_box.add_child(l)
			_rail_box.move_child(l, 0)


func _show_market() -> void:
	if _road_guard():
		return
	_screen = ""
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
	_add_shop()
	_add_chapter_ending()
	_rail_box.add_child(_separator())
	var back := _make_button(tr("ui.back_to_map"), PiritoriPalette.TEXT_DIM)
	back.pressed.connect(_show_city)
	_rail_box.add_child(back)


## THE END OF A CHAPTER (GDD run structure; H1, web v4.65 `renderChapter`).
##
## The threshold buys entry and the operation spends it. Since v4.65 the
## shipment is not a button here: it is day 10's night at Sörnäinen, on the
## schedule like any beat, and missing the threshold means the boat sails
## without you. This rail only says how close you are and where it runs.
func _add_chapter_ending() -> void:
	var ending := GameState.chapter_ending()
	if ending.is_empty():
		return
	_rail_box.add_child(_separator())
	if GameState.chapter_cleared:
		_rail_box.add_child(_make_label(tr("chapter.cleared"), 15, MapStyle.TITLE_TEXT))
		# Written inline so the locale gate sees the interpolated key family.
		var ol := _make_label(tr("chapter.out_%s" % GameState.last_ending_outcome), 12, PiritoriPalette.TEXT)
		ol.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		_rail_box.add_child(ol)
		_add_chapter_turn()
		return

	# Show the distance. A goal you cannot see the edge of is not a goal, it
	# is a surprise.
	_rail_box.add_child(_make_label(tr("chapter.progress") % [
		GameState.chapter_progress(), GameState.chapter_threshold],
		12, PiritoriPalette.TEXT_DIM))
	_rail_box.add_child(_make_label(String(ending.get("label", "")).to_upper(),
		15, MapStyle.TITLE_TEXT))
	var brief := _make_label(String(ending.get("brief", "")), 12, PiritoriPalette.TEXT)
	brief.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_rail_box.add_child(brief)
	var days := int(GameState.chapter_def().get("days", GameState.CHAPTER_DAYS))
	var line := tr("chapter.short") % days
	if GameState.chapter_goal_met():
		line = tr("chapter.earned_runs") % [String(ending.get("label", "")), days,
			String(ContentRegistry.anchor(String(ending.get("anchor_id", ""))).get("label", "")),
			int(ending.get("stake_eur", 0))]
	var l := _make_label(line, 12, PiritoriPalette.INTEL_MUSTARD)
	l.name = "ChapterWhere"
	l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_rail_box.add_child(l)


## CHAPTER 1 CLOSES — TO BE CONTINUED (H1/H8; web v4.65 `renderChapterClose`).
##
## The four Pasila endings are the ERA's result. Until chapter 4 exists a
## played-through chapter ends here: how the operation went (or that the boat
## left without you), what crosses into chapter 2, and where the road points.
func _show_chapter_close() -> void:
	_screen = "chapter-close"
	_clear_world()
	_world_host.add_child(_city_map)
	_city_map.call_deferred("_rebuild_layout")
	_journey = {}
	_city_map.reset_inspection()
	_clear_rail()
	_rail.visible = true
	var def := GameState.chapter_def()
	var head := tr("chapter.closes") % GameState.chapter
	if String(def.get("label", "")) != "":
		head += " / " + String(def["label"]).to_upper()
	var hl := _make_label(head, 13, PiritoriPalette.TEXT_DIM)
	hl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_rail_box.add_child(hl)
	var title := _make_label(tr("chapter.to_be_continued"), 22, MapStyle.TITLE_TEXT)
	title.name = "ToBeContinued"
	title.theme_type_variation = PiritoriChrome.TITLE
	_rail_box.add_child(title)
	# No outcome yet means the chapter was never run: the boat left.
	var out := GameState.last_ending_outcome if GameState.last_ending_outcome != "" else "missed"
	var ol := _make_label(tr("chapter.out_%s" % out), 13, PiritoriPalette.TEXT)
	ol.name = "ChapterOutcome"
	ol.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_rail_box.add_child(ol)
	_rail_box.add_child(_separator())
	_add_chapter_turn()
	var f := GameState.forecast_ending()
	if not f.is_empty():
		_rail_box.add_child(_separator())
		var fh := _make_label(tr("chapter.road_points"), 13, PiritoriPalette.TEXT_DIM)
		fh.name = "RoadPoints"
		_rail_box.add_child(fh)
		var fl := _make_label(String(f.get("label", "")), 17, MapStyle.TITLE_TEXT)
		fl.set_meta("forecast", String(f.get("id", "")))
		fl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		_rail_box.add_child(fl)
		var fs := _make_label(String(f.get("summary", "")), 12, PiritoriPalette.TEXT)
		fs.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		_rail_box.add_child(fs)
		if not Loc.content_is_translated():
			var note := _make_label(tr("ui.content_en_only"), 12, PiritoriPalette.TEXT_DIM)
			note.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
			_rail_box.add_child(note)
	_rail_box.add_child(_separator())
	var sum := _make_label(tr("chapter.summary") % [GameState.exit_fund_eur, GameState.debt_eur,
		GameState.roster.size(), int(GameState.relationships.get("jaska", 0))], 13, PiritoriPalette.TEXT)
	sum.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_rail_box.add_child(sum)
	if GameState.crew_deaths > 0:
		_rail_box.add_child(_make_label(tr("ui.crew_lost") % GameState.crew_deaths, 13, PiritoriPalette.DANGER_RED))
	var again := _make_lit(tr("chapter.new_ten"))
	again.set_meta("next_step", "new-campaign")
	again.pressed.connect(func():
		SaveService.clear_save()
		GameState.new_campaign()
		_show_city()
		if GameState.arrival_due:
			_play_arrival())
	_rail_foot.add_child(_separator())
	_rail_foot.add_child(again)


## INTO CHAPTER N (H7; web v4.64 `renderChapterTurn`): what crosses into the
## next chapter, read off the save and the rules in canon (`chapter_turn`).
## Shown, never applied here while the next chapter is unauthored: the rail
## says so, and offers no way on. Once it is authored, the one button turns it
## through `PiritoriChapter.turn_chapter`, the only writer.
func _add_chapter_turn() -> void:
	var plan := PiritoriChapter.turn_plan()
	if plan.is_empty():
		return
	var box := VBoxContainer.new()
	box.name = "ChapterTurn"
	_rail_box.add_child(box)
	box.add_child(_make_label(tr("chapter.into") % (GameState.chapter + 1), 13, PiritoriPalette.TEXT_DIM))
	for row in plan:
		var fmt := func(v: int) -> String: return ("€%d" % v) if bool(row["money"]) else str(v)
		# One word per rule, written out so the locale gate sees every key.
		var word := String({"carry": tr("chapter.rule_carry"), "reset": tr("chapter.rule_reset"),
			"stake": tr("chapter.rule_stake")}.get(String(row["rule"]), String(row["rule"])))
		var l := _make_label("%s   %s → %s   · %s" % [tr(String(row["label"])),
			fmt.call(int(row["now"])), fmt.call(int(row["next"])), word], 12,
			PiritoriPalette.TEXT if String(row["rule"]) == "carry" else PiritoriPalette.TEXT_DIM)
		l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		l.set_meta("turn_row", String(row["key"]))
		box.add_child(l)
	if PiritoriChapter.next_chapter().is_empty():
		var later := _make_label(tr("chapter.later") % (GameState.chapter + 1), 12, PiritoriPalette.INTEL_MUSTARD)
		later.name = "ChapterLater"
		later.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		box.add_child(later)
		return
	var b := _make_button(tr("chapter.next"), PiritoriPalette.PLAYER_CYAN)
	b.pressed.connect(func():
		PiritoriChapter.turn_chapter()
		_show_city())
	box.add_child(b)


## THE FENCE — where loot finally becomes money (COMBAT.md §9.7).
##
## sell_loot() has existed and been tested since §8 and nothing ever called it,
## so loot could be taken and never converted. This is the screen that spends it.
##
## Piritori only. The travel requirement is the mechanic, not friction: selling
## from anywhere would make loot weightless and take the map out of an economy
## meant to run through it.
func _add_fence(refresh: Callable = _refresh_market_rail) -> void:
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
			refresh.call())
		_rail_box.add_child(b)

		# §8's asymmetry, said at the moment it costs something. Selling a
		# taken-only weapon is not a trade, it is a thing you cannot undo — the
		# money can be earned again and the weapon cannot be bought at any price.
		if not GameState.is_purchasable(eid):
			var w := _make_label(tr("ui.fence_unbuyable"), 11, PiritoriPalette.INTEL_MUSTARD)
			w.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
			_rail_box.add_child(w)



## THE SHOP — market gear only, Piritori only (COMBAT.md §8).
##
## Mirrors `_add_fence()`: same place-gate, the other direction. Taken-only
## never appears here — `is_purchasable` is the check at the point of sale,
## not merely the absence of a buy screen.
func _add_shop(refresh: Callable = _refresh_market_rail) -> void:
	_rail_box.add_child(_separator())
	_rail_box.add_child(_make_label(tr("ui.shop"), 15, MapStyle.TITLE_TEXT))

	if not GameState.can_shop_here():
		var l := _make_label(tr("ui.shop_elsewhere"), 12, PiritoriPalette.TEXT_DIM)
		l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		_rail_box.add_child(l)
		return

	var listed := 0
	for e in ContentRegistry.slice.get("equipment", []):
		var eid := String(e.get("id", ""))
		if not GameState.is_purchasable(eid):
			continue
		# Support kit (feature-phone) and weapons both — anything market.
		var price := GameState.buy_of(eid)
		if price <= 0:
			continue
		var nm := tr("equipment.%s" % eid)
		if nm == "equipment.%s" % eid:
			nm = eid
		var affordable := GameState.cash_eur >= price
		var b := _make_button(tr("ui.shop_buy") % [nm, price],
			PiritoriPalette.PLAYER_CYAN if affordable else PiritoriPalette.TEXT_DIM)
		b.disabled = not affordable
		b.pressed.connect(func():
			if GameState.buy_equipment(eid):
				refresh.call())
		_rail_box.add_child(b)
		listed += 1

	if listed == 0:
		_rail_box.add_child(_make_label(tr("ui.shop_nothing"), 12, PiritoriPalette.TEXT_DIM))


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
	# Ink, not the accent: the icon carries the command's colour, and a row of
	# four coloured words was four things competing to be lit (v4.56).
	var l := _make_label(text, 15, PiritoriPalette.TEXT)
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
	if _road_guard():
		return
	_screen = ""
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


## MISSIONS — the week's ledger (web v4.62, G7). The world shows every
## mission as a briefing and the case board beside it (`story_ledger.gd`); the
## rail keeps what it always had — commitment before acceptance (handoff §5):
## the fight a revealed mission can become, entered from the mission that
## signals it (§13.12), never spawned at random.
func _show_missions() -> void:
	if _road_guard():
		return
	_set_mode(Mode.CITY)
	_screen = "missions"
	_open_encounter = ""
	_stage_has_speaker = false
	_rail.visible = true
	_clear_world()
	var ledger := preload("res://scenes/story_ledger.gd").new()
	ledger.name = "StoryLedger"
	ledger.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	ledger.size_flags_vertical = Control.SIZE_EXPAND_FILL
	_world_host.add_child(ledger)
	_clear_rail()
	_rail_box.add_child(_make_label(tr("cmd.missions"), 19, MapStyle.TITLE_TEXT))
	var thread := ContentRegistry.story_thread()
	if not thread.is_empty():
		var prem := _make_label(String(thread.get("premise", "")), 13, PiritoriPalette.TEXT_DIM)
		prem.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		_rail_box.add_child(prem)
	var any := false
	for m in ContentRegistry.slice.get("missions", []):
		if not GameState.is_revealed(String(m.get("id", ""))):
			continue
		var bid := "" if m.get("battle_id", null) == null else String(m["battle_id"])
		if bid == "" or ContentRegistry.battle(bid).is_empty():
			continue
		if not any:
			_rail_box.add_child(_separator())
		any = true
		var words := ContentRegistry.story_mission(String(m.get("id", "")))
		_rail_box.add_child(_make_label(String(words.get("title", m.get("family", ""))).to_upper(),
			15, MapStyle.METRO))
		var fb := _make_button(tr("battle.enter") % _battle_format(bid), PiritoriPalette.DANGER_RED)
		fb.pressed.connect(func(): _show_battle(bid))
		_rail_box.add_child(fb)
	_rail_box.add_child(_separator())
	var board := _make_button(tr("board.button"), PiritoriPalette.INTEL_MUSTARD)
	board.pressed.connect(_show_market)
	_rail_box.add_child(board)
	var back := _make_button(tr("ui.back_to_map"), PiritoriPalette.TEXT_DIM)
	back.pressed.connect(_show_city)
	_rail_box.add_child(back)


# ── the road (web v4.58, `renderRoad()`) ───────────────────────────────────
#
# An event on the way, or on arriving. While it waits for an answer it is the
# only thing that opens: every command routes here (web `render()`), and it
# survives a reload because it lives in the save. Each choice shows its
# minutes; a choice you cannot take is shown and says why. Answered, it shows
# what came of it and the block's clock, with one lit CONTINUE.

## True when a road event is waiting and the road was opened instead.
func _road_guard() -> bool:
	if PiritoriRoad.pending_event().is_empty():
		return false
	_show_road()
	return true


func _show_road() -> void:
	var event := PiritoriRoad.pending_event()
	var r := GameState.road
	var leg: Dictionary = PiritoriRoad.pending() if not event.is_empty() else PiritoriRoad.last()
	if event.is_empty():
		if leg.is_empty():
			_show_city()
			return
		event = ContentRegistry.road_event(String(leg.get("id", "")))
	_set_mode(Mode.LOCATION)
	_screen = "road"
	_open_encounter = ""
	_stage_has_speaker = false
	_rail.visible = true
	var phase := String(leg.get("phase", "transit"))
	var from_l := _place_label(leg.get("from", null))
	var to_l := _place_label(leg.get("to", GameState.current_anchor_id))
	var where := tr("road.arriving") % to_l.to_upper() if phase == "arrival" else (
		tr("road.on_the_way") % [from_l.to_upper(), to_l.to_upper()] if from_l != "" and to_l != ""
		else tr("road.on_the_way_plain"))

	_clear_world()
	var stage := preload("res://scenes/road_stage.gd").new()
	stage.name = "RoadStage"
	stage.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	stage.size_flags_vertical = Control.SIZE_EXPAND_FILL
	_world_host.add_child(stage)
	var to_id := String(leg.get("to", GameState.current_anchor_id)) if leg.get("to", null) != null else GameState.current_anchor_id
	stage.setup(where, String(event.get("title", "")), String(event.get("text", "")), phase,
		to_id, _place_label(to_id))
	stage.set_meta("road_event", String(event.get("id", "")))
	stage.set_meta("phase", phase)

	_clear_rail()
	# The card on the street carries where and what; the rail carries the
	# answer, the way an encounter's rail carries LOOK and ACT.
	if not Loc.content_is_translated():
		var note := _make_label(tr("ui.content_en_only"), 12, PiritoriPalette.TEXT_DIM)
		note.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		_rail_box.add_child(note)
		_rail_box.add_child(_separator())

	if not PiritoriRoad.pending_event().is_empty():
		_rail_box.add_child(_make_label(tr("verb.act"), 13, PiritoriPalette.TEXT_DIM))
		for choice in event.get("choices", []):
			var ch: Dictionary = choice
			var st := PiritoriRoad.choice_status(ch)
			var ok := bool(st["ok"])
			var b := _make_icon_button(String(ch.get("label", ch["id"])), PiritoriIcon.Kind.RISK,
				PiritoriChrome.ACCENT_ACT, ok)
			b.set_meta("road_choice", String(ch["id"]))
			var cid := String(ch["id"])
			b.pressed.connect(func(): _on_road_choice(cid))
			_rail_box.add_child(b)
			var detail := _make_label("   " + String(ch.get("detail", "")), 12, PiritoriPalette.TEXT_DIM)
			detail.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
			_rail_box.add_child(detail)
			var mins := _make_label("   " + _minutes_word(int(ch.get("minutes", 0))), 12, PiritoriPalette.INTEL_MUSTARD)
			mins.set_meta("minutes", int(ch.get("minutes", 0)))
			_rail_box.add_child(mins)
			if not ok:
				var why := _make_label("   " + _refusal_words(st["failed"]), 12, PiritoriPalette.DANGER_RED)
				why.set_meta("refusal", true)
				why.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
				_rail_box.add_child(why)
		return

	# Answered: what came of it, the time it took, and one lit way on.
	var picked: Dictionary = {}
	for choice in event.get("choices", []):
		if String(choice.get("id", "")) == String(leg.get("choice", "")):
			picked = choice
	var took := _make_label(String(picked.get("label", "")), 15, PiritoriPalette.TEXT)
	took.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_rail_box.add_child(took)
	var d := _make_label(String(picked.get("detail", "")), 13, PiritoriPalette.TEXT_DIM)
	d.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_rail_box.add_child(d)
	var clock := PiritoriRoad.clock_label()
	var spent := _minutes_word(int(leg.get("minutes", 0))) + ("  ·  " + tr("road.now") % clock if clock != "" else "")
	var sl := _make_label(spent, 13, PiritoriPalette.INTEL_MUSTARD)
	sl.name = "RoadSpent"
	_rail_box.add_child(sl)
	var go := _make_lit(tr("road.continue"))
	go.set_meta("next_step", "road-continue")
	go.pressed.connect(func():
		PiritoriRoad.clear_last()
		_show_city())
	_rail_foot.add_child(_separator())
	_rail_foot.add_child(go)


func _on_road_choice(choice_id: String) -> void:
	var result := PiritoriRoad.resolve(choice_id)
	if not bool(result.get("ok", false)):
		_show_road()
		return
	var bid := String(result.get("start_battle", ""))
	if bid != "" and not ContentRegistry.battle(bid).is_empty():
		_show_battle(bid, true)
		return
	_show_road()


func _minutes_word(m: int) -> String:
	return tr("road.minutes") % m if m > 0 else tr("road.no_time")


## A refused requirement in words ("needs 2 crew with you"), never a formula.
func _refusal_words(failed: Array) -> String:
	var out := PackedStringArray()
	for f in failed:
		var st: Dictionary = f
		match String(st.get("kind", "")):
			"deployed-crew":
				out.append(tr("road.needs_crew") % int(st.get("want", 0)))
			"fighters":
				out.append(tr("road.needs_fighters") % int(st.get("want", 0)))
			"stock":
				out.append(tr("road.needs_pack"))
			"fights-today":
				out.append(tr("door.fights_full") % int(st.get("have", 0)))
			"chapter-goal-met":
				out.append(tr("chapter.goal_unmet"))
			"cash":
				out.append(tr("ui.short_by") % maxi(int(st.get("want", 0)) - GameState.cash_eur, 0))
			_:
				out.append(tr("ui.requires") % String(st.get("req", "")))
	return " · ".join(out)


func _place_label(id: Variant) -> String:
	if id == null or String(id) == "":
		return ""
	for a in ContentRegistry.anchors():
		if String(a.get("id", "")) == String(id):
			return String(a.get("label", id))
	return String(id)


# ── places with a face (web v4.60-v4.62) ──────────────────────────────────

## The unlit doors where Aatami stands: the street seller at Piritori, Toko's
## counter on Vaasankatu, a visit, the case once it is known. True if any.
func _add_here_buttons(anchor_id: String) -> bool:
	var any := false
	if GameState.can_shop_here():
		var sb := _make_button(tr("street.button"), PiritoriPalette.GOODS_MAGENTA)
		sb.pressed.connect(_show_street)
		_rail_box.add_child(sb)
		any = true
	var the_case := ContentRegistry.story_case()
	if not the_case.is_empty() and anchor_id == String(the_case.get("anchor_id", "")) \
			and PiritoriStory.case_blocker() == "":
		var cb := _make_button(tr("story.case") % String(the_case.get("title", "")).to_upper(),
			CASE_RED)
		cb.pressed.connect(_show_case)
		_rail_box.add_child(cb)
		any = true
	if anchor_id == PiritoriToko.ANCHOR:
		var tb := _make_button(tr("toko.button"), PiritoriPalette.DANGER_RED)
		tb.pressed.connect(_show_ramen)
		_rail_box.add_child(tb)
		any = true
	for v in PiritoriVisits.available():
		var vid := String(v.get("id", ""))
		var vb := _make_button(tr("visit.button") % String(v.get("title", vid)), PiritoriPalette.PUBLIC_BLUE)
		vb.pressed.connect(func(): _show_visit(vid))
		_rail_box.add_child(vb)
		any = true
	return any


## The case's own colour (web `.case-button`, `.clue-key`): red, so the case
## never borrows the lantern, which belongs to the way forward.
const CASE_RED := Color("#e0524a")


## A scene that is not an encounter, on the location stage.
func _mount_scene(asset_id: String, anchor_id: String, body: String, heading: String,
		eyebrow: String, speaker_id: String = "") -> Control:
	_set_mode(Mode.LOCATION)
	_open_encounter = ""
	_stage_has_speaker = false
	_rail.visible = true
	_clear_world()
	var stage := preload("res://scenes/location_stage.gd").new()
	stage.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	stage.size_flags_vertical = Control.SIZE_EXPAND_FILL
	stage.setup_scene(asset_id, anchor_id, body, heading, eyebrow)
	_world_host.add_child(stage)
	if speaker_id != "":
		_mount_speaker(speaker_id, stage)
	return stage


## Toko's own line this block: one a block, a line and never a rule.
func _toko_line() -> String:
	return tr("toko.line_%s" % str(GameState.block_index % TOKO_LINES))

const TOKO_LINES := 10
## A name, the same in every language.
const TOKO_TITLE := "TOKON RAMEN"


## TOKON RAMEN (web v4.60/v4.61 `renderRamen()`): the counter with Toko behind
## it, his line for the block, a bowl and what he heard, and the early weapons
## under the counter. BACK TO THE STREET is the one lit thing.
func _show_ramen() -> void:
	if GameState.current_anchor_id != PiritoriToko.ANCHOR:
		_show_city()
		return
	if _toko_epoch != GameState.campaign_epoch:
		_toko_told = null
		_toko_epoch = GameState.campaign_epoch
	_screen = "ramen"
	var body := "“%s”" % _toko_line()
	var told := _toko_told_line()
	if told != "":
		body += "\n“%s”" % told
	_mount_scene("scene-toko-noodles-empty-v01", PiritoriToko.ANCHOR, body, TOKO_TITLE,
		"VAASANKATU · TOKO SLOMO · " + _day_block(), "toko")
	_clear_rail()
	_rail_box.add_child(_make_label(tr("toko.bowl_head") % PiritoriToko.BOWL_EUR, 15, MapStyle.TITLE_TEXT))
	var note := _make_label(tr("toko.bowl_note"), 12, PiritoriPalette.TEXT_DIM)
	note.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_rail_box.add_child(note)
	var blocked := PiritoriToko.bowl_blocker()
	var btext := tr("toko.buy_bowl") % PiritoriToko.BOWL_EUR
	if blocked == "already-this-block":
		btext = tr("toko.eaten")
	elif blocked == "cash":
		btext = tr("toko.bowl_cash") % PiritoriToko.BOWL_EUR
	var bowl := _make_button(btext, PiritoriPalette.TEXT if blocked == "" else PiritoriPalette.TEXT_DIM)
	bowl.name = "BuyBowl"
	bowl.disabled = blocked != ""
	bowl.pressed.connect(func():
		var got := PiritoriToko.buy_bowl()
		if bool(got.get("ok", false)):
			_toko_told = String(got.get("anchor_id", ""))
		_show_ramen())
	_rail_box.add_child(bowl)

	_rail_box.add_child(_separator())
	_rail_box.add_child(_make_label(tr("toko.weapons_head"), 15, MapStyle.TITLE_TEXT))
	for eid in PiritoriToko.weapons():
		var price := GameState.buy_of(eid)
		var nm := tr("equipment.%s" % eid)
		if nm == "equipment.%s" % eid:
			nm = eid
		var afford := GameState.cash_eur >= price
		var wb := _make_button(tr("ui.shop_buy") % [nm, price],
			PiritoriPalette.PLAYER_CYAN if afford else PiritoriPalette.TEXT_DIM)
		wb.disabled = not afford
		wb.set_meta("toko_weapon", eid)
		var weid := String(eid)
		wb.pressed.connect(func():
			PiritoriToko.buy_weapon(weid)
			_show_ramen())
		_rail_box.add_child(wb)
	var wn := _make_label(tr("toko.weapons_note"), 12, PiritoriPalette.TEXT_DIM)
	wn.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_rail_box.add_child(wn)
	_add_back_to_street()


## What Toko said at the last bowl, read off the board NOW — a range ages.
func _toko_told_line() -> String:
	if _toko_told == null:
		return ""
	if String(_toko_told) == "":
		return tr("toko.nothing_new")
	var row := PiritoriBoard.row(String(_toko_told))
	if row.is_empty() or String(row["shown"]["level"]) != PiritoriMarket.INFO_RANGE:
		return ""
	return tr("toko.told") % [String(row["label"]), int(round(float(row["shown"]["low_sell"]))),
		int(round(float(row["shown"]["high_sell"])))]


## THE STREET SELLER (web v4.61 `renderStreet()`): the Piritori gear shop and
## fence, with a face. The first handgun is his too, through its day-5 scene.
func _show_street() -> void:
	if not GameState.can_shop_here():
		_show_city()
		return
	_screen = "street"
	_mount_scene("scene-piritori-square-v01", "piritori", tr("street.line"), tr("street.title"),
		"PIRITORI · VAASANPUISTIKKO · " + _day_block())
	_clear_rail()
	_add_shop(_show_street)
	_add_fence(_show_street)
	_add_back_to_street()


## THE CASE (web v4.62 G6, `renderCase()`): the Thursday Tram, answered once,
## at Piritori. It never turns the block.
func _show_case() -> void:
	var c := ContentRegistry.story_case()
	var answer := PiritoriStory.case_answer()
	if c.is_empty() or (answer == "" and PiritoriStory.case_blocker() != ""):
		_show_city()
		return
	_screen = "case"
	var thread := ContentRegistry.story_thread()
	var stage := _mount_scene(String(c.get("scene_asset_id", "")), String(c.get("anchor_id", "")),
		String(c.get("opening", "")), String(c.get("title", "")),
		tr("story.case") % String(thread.get("title", "")).to_upper())
	_clear_rail()
	if answer != "":
		var picked: Dictionary = {}
		for ch in c.get("choices", []):
			if String(ch.get("id", "")) == answer:
				picked = ch
		var took := _make_label(String(picked.get("label", "")), 15, PiritoriPalette.TEXT)
		took.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		_rail_box.add_child(took)
		var d := _make_label(String(picked.get("detail", "")), 13, PiritoriPalette.TEXT_DIM)
		d.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		_rail_box.add_child(d)
		var fx := _make_label(PiritoriStory.effect_words(picked.get("effects", [])), 13, PiritoriPalette.INTEL_MUSTARD)
		fx.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		_rail_box.add_child(fx)
		_add_back_to_street()
		return
	_rail_box.add_child(_make_label(tr("verb.look"), 13, PiritoriPalette.TEXT_DIM))
	for item in c.get("inspectables", []):
		var txt := String(item)
		var lb := _make_icon_button(txt, PiritoriIcon.Kind.INFO, PiritoriChrome.ACCENT_LOOK)
		lb.pressed.connect(func(): stage.show_inspect(txt))
		_rail_box.add_child(lb)
	_rail_box.add_child(_separator())
	_rail_box.add_child(_make_label(tr("verb.act"), 13, PiritoriPalette.TEXT_DIM))
	for ch in c.get("choices", []):
		var choice: Dictionary = ch
		var b := _make_icon_button(String(choice.get("label", "")), PiritoriIcon.Kind.RISK, PiritoriChrome.ACCENT_ACT)
		var cid := String(choice.get("id", ""))
		b.set_meta("case_choice", cid)
		b.pressed.connect(func():
			PiritoriStory.resolve_case(cid)
			_show_case())
		_rail_box.add_child(b)
		var det := _make_label("   " + String(choice.get("detail", "")), 12, PiritoriPalette.TEXT_DIM)
		det.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		_rail_box.add_child(det)
		var fx := _make_label("   " + PiritoriStory.effect_words(choice.get("effects", [])), 12,
			PiritoriPalette.INTEL_MUSTARD)
		fx.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		_rail_box.add_child(fx)
	_rail_box.add_child(_separator())
	var later := _make_button(tr("story.not_yet"), PiritoriPalette.TEXT_DIM)
	later.pressed.connect(_show_city)
	_rail_box.add_child(later)


## AN OPTIONAL VISIT (web `visits.js`): answered once, records what the choice
## says, never turns the block.
func _show_visit(visit_id: String) -> void:
	var v := ContentRegistry.visit(visit_id)
	var answered := String(GameState.resolved_encounters.get(visit_id, ""))
	if v.is_empty() or (answered == "" and not PiritoriVisits.is_available(visit_id)):
		_show_city()
		return
	_screen = "visit"
	_visit_open = visit_id
	var speaker := ""
	for p in v.get("participants", []):
		if String(p) != "aatami" and _Presenter3D.SPEAKERS.has(String(p)):
			speaker = String(p)
	var stage := _mount_scene(String(v.get("scene_asset_id", "")), GameState.current_anchor_id,
		String(v.get("opening", "")), String(v.get("title", "")), "", speaker)
	_clear_rail()
	if answered != "":
		for ch in v.get("choices", []):
			if String(ch.get("id", "")) == answered:
				var took := _make_label(String(ch.get("label", "")), 15, PiritoriPalette.TEXT)
				took.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
				_rail_box.add_child(took)
				var f := _make_label(String(ch.get("forecast", "")), 13, PiritoriPalette.TEXT_DIM)
				f.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
				_rail_box.add_child(f)
		_add_back_to_street()
		return
	_rail_box.add_child(_make_label(tr("verb.look"), 13, PiritoriPalette.TEXT_DIM))
	for item in v.get("inspectables", []):
		var txt := String(item)
		var lb := _make_icon_button(txt, PiritoriIcon.Kind.INFO, PiritoriChrome.ACCENT_LOOK)
		lb.pressed.connect(func(): stage.show_inspect(txt))
		_rail_box.add_child(lb)
	_rail_box.add_child(_separator())
	_rail_box.add_child(_make_label(tr("verb.act"), 13, PiritoriPalette.TEXT_DIM))
	for ch in v.get("choices", []):
		var choice: Dictionary = ch
		var can := GameState.meets_all(choice.get("requirements", []))
		var b := _make_icon_button(String(choice.get("label", "")), PiritoriIcon.Kind.RISK,
			PiritoriChrome.ACCENT_ACT, can)
		var cid := String(choice.get("id", ""))
		b.set_meta("visit_choice", cid)
		b.pressed.connect(func():
			PiritoriVisits.resolve(visit_id, cid)
			_show_visit(visit_id))
		_rail_box.add_child(b)
		var fl := _make_label("   " + String(choice.get("forecast", "")), 12, PiritoriPalette.TEXT_DIM)
		fl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		_rail_box.add_child(fl)
		if not can:
			var failed: Array = []
			for req in choice.get("requirements", []):
				var st := GameState.requirement_status(String(req))
				if not bool(st["ok"]):
					failed.append(st)
			var why := _make_label("   " + _refusal_words(failed), 12, PiritoriPalette.DANGER_RED)
			why.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
			_rail_box.add_child(why)
	_rail_box.add_child(_separator())
	var leave := _make_icon_button(tr("ui.leave_to_map"), PiritoriIcon.Kind.LEAVE, PiritoriChrome.ACCENT_LEAVE)
	leave.pressed.connect(_show_city)
	_rail_box.add_child(leave)


## The one lit way out of a place with a face (web: the primary button).
func _add_back_to_street() -> void:
	var back := _make_lit(tr("street.back"))
	back.set_meta("next_step", "back-to-street")
	back.pressed.connect(_show_city)
	_rail_foot.add_child(_separator())
	_rail_foot.add_child(back)


func _day_block() -> String:
	return "%s · %s" % [tr("ui.day_n") % GameState.day, _block_word()]


## END DAY — spend the remaining block. A decision boundary, so it saves.
func _battle_format(battle_id: String) -> String:
	return String(ContentRegistry.battle(battle_id).get("format", ""))


## A road fight (web v4.58) is the ordinary battle with no mission behind it:
## it reports to no mission and turns no block. Injuries, arrests, loot and
## careers apply as in any fight.
var _road_battle := false
## A door fight (web v4.65): the door's template id. No mission behind it
## either (`missionId: null`); win or lose pays the door's own stakes.
var _door_battle := ""
## The door's bad deal turned into this fight (answer 25): the aftermath says so.
var _door_escalated := false


## An encounter asked for a fight. From a door, it is a door fight.
func _on_battle_requested(battle_id: String) -> void:
	var door := ""
	if _open_encounter != "" and ContentRegistry.is_door_encounter(_open_encounter):
		door = String(ContentRegistry.encounter(_open_encounter).get("door", ""))
	_show_battle(battle_id, false, door)
	_door_escalated = door != "" and String(GameState.last_escalation.get("kind", "")) == "battle"


## Enter a formation battle. The campaign model is untouched until it resolves.
func _show_battle(battle_id: String, road_fight: bool = false, door: String = "") -> void:
	_road_battle = road_fight
	_door_battle = door
	_door_escalated = false
	var training := bool(ContentRegistry.battle(battle_id).get("training", false))
	# Answer 24 (web v4.66 `startBattle`): Aatami fights the first fights, then
	# steps back for good. The first real fight he can stay out of is a beat,
	# decided before the lineup so he is not in it.
	var beat := "" if training else GameState.step_back_if_ready()
	# Answer 23: every real fight counts toward the day's two, a road fight
	# and a door fight included; a training bout does not (web `startBattle`).
	if not training:
		GameState.record_fight()
	_screen = ""
	_set_mode(Mode.BATTLE)
	_clear_world()
	_clear_rail()
	# Who takes the board: Aatami first while he still fights, then the crew
	# with him (web `fighters`). Every fight choice is gated on `fighters>=N`,
	# so a real fight arrives with enough of them.
	var crew: Array = [] if training else Array(GameState.fighters())
	# A training bout, and the ungated ways in (the MISSIONS rail re-entering a
	# mission's fight, a `?battle=` deep link), keep the port's authored-roster
	# lineup to fill the side rather than fielding a short formation. No gated
	# choice arrives short, so a real fight's lineup is exactly `fighters()`.
	var need := int(ContentRegistry.battle(battle_id).get("player_deployed", 2))
	var authored: Array = []
	for c in ContentRegistry.slice.get("crew", []):
		var cid := String(c.get("id", ""))
		if GameState.is_revealed(cid) or GameState.is_revealed(String(c.get("recruit_encounter_id", ""))):
			authored.append(cid)
	# The slice's first battles are reachable before anyone is recruited.
	if authored.is_empty():
		for c in ContentRegistry.slice.get("crew", []):
			authored.append(String(c.get("id", "")))
	for cid in authored:
		if crew.size() >= need:
			break
		if not crew.has(cid):
			crew.append(cid)

	var scene := preload("res://scenes/formation_battle.gd").new()
	scene.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scene.size_flags_vertical = Control.SIZE_EXPAND_FILL
	_world_host.add_child(scene)
	var errs: Array = scene.begin(battle_id, crew, GameState.seed_value + GameState.block_index)
	if not errs.is_empty():
		_rail_box.add_child(_make_label(str(errs), 13, PiritoriPalette.DANGER_RED))
		return
	# The step-back opens the fight's log (web: unshifted into `battle.log`).
	if beat != "":
		scene.open_log(beat)
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
		# The mission behind the fight takes its own authored effects (web
		# `resultEffects`). A road fight has no mission behind it, and neither
		# does a door fight: it pays the door's own stakes.
		if door != "":
			var won := _mission_outcome(int(result)) == "win"
			GameState.apply_effects(PiritoriDoors.door_fight_effects(door, "win" if won else "lose"))
		elif not road_fight:
			GameState.settle_mission_battle(battle_id, _mission_outcome(int(result)))
		# The police take the fallen BEFORE careers are aged: somebody carried
		# off a yard does not also come out of it one fight older.
		for id in summary.get("taken", PackedStringArray()):
			GameState.arrest(String(id))
		var left := GameState.age_crew(deployed)
		_show_aftermath(summary, spoils, left))
	_rail.visible = false


## A fight's result in the mission's terms: a win, a partial (a negotiated
## exit, a withdrawal, a mixed result), or a loss.
func _mission_outcome(result: int) -> String:
	match result:
		FightManager.BattleResult.VICTORY_ROUT, FightManager.BattleResult.VICTORY_BREAK:
			return "win"
		FightManager.BattleResult.STAND_DOWN, FightManager.BattleResult.WITHDRAWAL, \
				FightManager.BattleResult.PARTIAL:
			return "partial"
	return "loss"


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
	if _door_escalated:
		var bad := _make_label(tr("door.went_bad_fight"), 13, PiritoriPalette.DANGER_RED)
		bad.name = "DealWentBad"
		bad.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		_rail_box.add_child(bad)
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
	if _road_guard():
		return
	_screen = ""
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
	if GameState.is_slice_complete() or _road_guard():
		return
	GameState.advance_block()
	_show_city()


# ── small builders ─────────────────────────────────────────────────────────

## Every label in the shell goes through here, so this is where body text gets
## its one honest size.
##
## Reported 2026-08-27 from a Pixel: "non-optimized UI edges, sizes." The
## header and the command bar already scaled themselves with the screen; the
## rail did not. Its labels were passed literal 12/13/15 pixel sizes by
## seventy-odd call sites, which is a readable size on a 1280-wide desktop
## window and a thread on a 1079-wide phone — the text ended up a third the
## height of the words in the dock directly beneath it.
##
## The base numbers stay meaningful as a RATIO to each other (12 is a caption,
## 15 is a heading), and this scales the lot against the viewport. Clamped at
## both ends: never shrink below the authored size, never inflate a desktop
## window where the authored size was already right.
func _text_scale() -> float:
	var vp := get_viewport_rect().size
	if vp.x <= 0.0:
		return 1.0
	# Portrait scales on width, which is the axis the reading column is cut
	# from; landscape has width to spare and would over-inflate on it.
	# LANDSCAPE DOES NOT SCALE. This used to fall back to the viewport HEIGHT
	# in landscape, so a perfectly ordinary 1280x720 desktop window scaled its
	# type up by 1.67 — inflating a layout that was already correct, and in the
	# battle console pushing it 8px off the bottom of the viewport. The reason
	# to scale at all is a dense portrait phone; a landscape window is the size
	# the authored numbers were chosen for.
	if vp.x >= vp.y:
		return 1.0
	var basis := vp.x
	return clampf(basis / 430.0, 1.0, 2.2)


## `scale` is opt-OUT, and opting out matters. A caller that has ALREADY worked
## its size out from the viewport must pass `false`, or the two multiply: the
## status chips compute up to 60px from the screen, `_text_scale()` multiplies
## by up to 2.2, and the chips came out at 130px and shoved the whole header
## past the right edge of the window. This repo has paid for that lesson once
## before — `_device_gain()` did the same double-scaling to the map labels and
## was removed for it. Screen-derived sizes are already scaled. Authored ones
## are not.
func _make_label(text: String, size_px: int, col: Color = PiritoriPalette.TEXT,
		scale: bool = true) -> Label:
	var l := Label.new()
	l.text = text
	# The 12px floor (web v4.56: 329 texts under 12px became 0), and AA against
	# the dark panel for whatever accent the caller asked for.
	# A rail heading (authored at 19 and up) is the display voice: condensed,
	# and big enough to lead (web v4.56 `.map-side h2`, 30px).
	if scale and size_px >= 19:
		l.theme_type_variation = PiritoriChrome.TITLE
		size_px = maxi(size_px, 26)
		l.uppercase = true
	var px := maxf(float(size_px) * (_text_scale() if scale else 1.0), PiritoriFonts.FLOOR_PX)
	l.add_theme_font_size_override("font_size", int(round(px)))
	l.add_theme_color_override("font_color", PiritoriChrome.readable(col, PiritoriPalette.PANEL))
	return l


func _make_button(text: String, accent: Color) -> Button:
	var b := Button.new()
	b.text = text
	var s := _text_scale()
	b.custom_minimum_size = Vector2(0, maxf(MIN_TARGET, MIN_TARGET * s * 0.8))
	# Same reasoning as _make_label: 15px is a readable authored size on a
	# desktop window and a thread on a phone. These are the rail's actionable
	# rows — the ones a player is meant to press — and they were rendering
	# smaller than the labels above them.
	b.add_theme_font_size_override("font_size", int(round(15.0 * s)))
	# A quiet dark control from the theme (Lantern Noir); the accent only tints
	# its word, lifted to AA. The ONE lit action on a screen is `_make_lit()`.
	var ink := PiritoriChrome.readable(accent)
	for c in ["font_color", "font_hover_color", "font_pressed_color", "font_focus_color"]:
		b.add_theme_color_override(c, ink)
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
	# CARTON, NOT A DARK CARD. `art-library/ux-concepts/README.md` settles the
	# direction — "cardstock is the interface, not the world" — and the
	# narration plate directly above these rows already proves it reads at
	# phone size. These stayed dark cards with a hairline accent outline, which
	# sitting under that plate looked like the wireframe it replaced.
	#
	# The accent moves OFF the text and onto a spine down the left edge, the
	# way the concept sheet rules its name plates. Ink stays near-black on
	# cream, which is legible in a way violet-on-charcoal never was, and the
	# category is still carried by shape and colour without colour being the
	# only carrier (ART_BIBLE §4.2).
	var tint := accent if enabled else PiritoriPalette.LOCKED_GREY
	var b := Button.new()
	b.text = ""
	# The floor has to grow with the type. Left at a flat 44 the scaled label
	# overflowed its own card and the descenders were sliced off along the
	# bottom edge — a touch target that is tall enough to press but too short
	# to read is not finished.
	b.custom_minimum_size = Vector2(0, maxf(MIN_TARGET, 44.0 * _text_scale()))
	b.disabled = not enabled
	b.focus_mode = Control.FOCUS_ALL
	var sb := PiritoriChrome.plate_button(tint)
	var sb_hot := PiritoriChrome.plate_button(tint, true)
	b.add_theme_stylebox_override("normal", sb)
	b.add_theme_stylebox_override("hover", sb_hot)
	b.add_theme_stylebox_override("pressed", sb_hot)
	b.add_theme_stylebox_override("disabled", sb)
	b.add_theme_stylebox_override("focus", sb_hot)

	var ink := PiritoriChrome.plate_ink()
	if not enabled:
		ink = ink.lerp(PiritoriChrome.CARTON, 0.45)

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

	# the spine: the accent as a printed rule down the card, not as text colour
	var spine := ColorRect.new()
	spine.color = tint
	spine.custom_minimum_size = Vector2(4, 0)
	spine.size_flags_vertical = Control.SIZE_EXPAND_FILL
	spine.mouse_filter = Control.MOUSE_FILTER_IGNORE
	row.add_child(spine)

	var icon := PiritoriIcon.new(icon_kind, tint, 22.0 * _text_scale())
	row.add_child(icon)

	var lbl := Label.new()
	lbl.text = text
	# Scaled like the rest of the body text. Left at a fixed 14 these came out
	# SMALLER than the forecast line printed underneath each one — the thing
	# you press was quieter than the note about it.
	lbl.add_theme_font_size_override("font_size", int(round(14.0 * _text_scale())))
	lbl.add_theme_color_override("font_color", ink)
	lbl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	lbl.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	lbl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_child(lbl)

	# A Button is not a container: a label that wraps to a second line inside
	# it does not make it taller, and the second line was drawn over the card's
	# torn edge (found on the Brahenkenttä visit's long choice). Grow the card
	# to the wrapped text once the label knows its width.
	var floor_h := b.custom_minimum_size.y
	var fit := func():
		if is_instance_valid(b) and is_instance_valid(lbl):
			b.custom_minimum_size.y = maxf(floor_h, lbl.get_minimum_size().y + 20.0)
	lbl.resized.connect(fit)
	lbl.minimum_size_changed.connect(fit)
	return b


func _separator() -> Control:
	var s := HSeparator.new()
	s.custom_minimum_size = Vector2(0, 3)
	return s


func _panel_style(col: Color) -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	sb.bg_color = col
	sb.border_color = PiritoriPalette.PANEL_EDGE
	sb.border_width_bottom = 1
	sb.border_width_top = 1
	return sb
