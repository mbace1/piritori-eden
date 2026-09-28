extends Control
## MISSIONS as the week's ledger (web Act I v4.62, G7: `renderMissions()` and
## `renderCaseBoard()` in web/js/v3/app.js are the reference).
##
## Two things the one-line mission memory could not carry:
##   WHAT THE WEEK ASKS — every authored mission as a briefing: its premise,
##     its real steps (verb, place, the other way), its stakes in words (clean /
##     partly / lost, read from the mission's OWN effects, never restated), and
##     whether it can become a fight. A mission is briefed once its opening
##     scene is next, revealed or played; until then it is a title.
##   THE CASE BOARD — all eight clues of the Thursday Load: found ones on
##     paper, missing ones as a "?" with a hint, the key ones marked, and where
##     the case is waiting. A clue is its flag in the save (`PiritoriStory`),
##     so the board cannot claim anything the player did not do.
##
## Story words (titles, premises, clue texts) are authored content and read in
## English, like every other scene's prose; the ledger's own words are UI and
## are translated.

var _box: BoxContainer
var _wide := true


func _ready() -> void:
	var scroll := ScrollContainer.new()
	scroll.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	add_child(scroll)
	var pad := MarginContainer.new()
	for side in ["left", "right", "top", "bottom"]:
		pad.add_theme_constant_override("margin_" + side, 20)
	pad.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.add_child(pad)
	_box = VBoxContainer.new()
	_box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	pad.add_child(_box)
	GameState.state_changed.connect(_rebuild)
	resized.connect(func():
		var wide := _wants_wide()
		var s := PiritoriFonts.text_scale(get_viewport_rect().size)
		if wide != _wide or not is_equal_approx(s, _scale):
			_wide = wide
			_rebuild())
	_wide = _wants_wide()
	_rebuild()


var _scale := 1.0


## Two columns when there is room for two; a phone held upright reads one.
func _wants_wide() -> bool:
	var vp := get_viewport_rect().size
	return vp.x >= vp.y and (size.x >= 900.0 or size.x == 0.0)


func _rebuild() -> void:
	if _box == null:
		return
	_scale = PiritoriFonts.text_scale(get_viewport_rect().size)
	var parent := _box.get_parent()
	var old := _box
	_box = HBoxContainer.new() if _wide else VBoxContainer.new()
	_box.add_theme_constant_override("separation", 22)
	_box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	parent.remove_child(old)
	old.queue_free()
	parent.add_child(_box)

	var main := VBoxContainer.new()
	main.add_theme_constant_override("separation", 12)
	main.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	main.size_flags_stretch_ratio = 1.7
	_box.add_child(main)
	_add_briefings(main)

	var side := VBoxContainer.new()
	side.add_theme_constant_override("separation", 8)
	side.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	side.size_flags_stretch_ratio = 1.0
	_box.add_child(side)
	_add_case_board(side)


func _add_briefings(to: VBoxContainer) -> void:
	var thread := ContentRegistry.story_thread()
	to.add_child(_label(tr("story.missions_eyebrow") % String(thread.get("title", "")).to_upper(),
		13, PiritoriPalette.TEXT_FAINT))
	var head := _label(tr("story.week_asks"), 30, PiritoriPalette.TEXT)
	head.theme_type_variation = PiritoriChrome.TITLE
	to.add_child(head)
	for m in ContentRegistry.slice.get("missions", []):
		var mid := String(m.get("id", ""))
		var b := PiritoriStory.briefing(mid)
		if b.is_empty():
			continue
		to.add_child(_mission_card(b, PiritoriStory.mission_status(mid)))


func _mission_card(b: Dictionary, st: String) -> Control:
	var card := PanelContainer.new()
	card.name = "Mission_" + String(b["id"])
	card.set_meta("mission", b["id"])
	card.set_meta("status", st)
	card.add_theme_stylebox_override("panel", PiritoriChrome.margins(PiritoriChrome.panel(), 16, 12))
	var col := VBoxContainer.new()
	col.add_theme_constant_override("separation", 6)
	card.add_child(col)

	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 10)
	var title := _label(String(b["title"]).to_upper(), 22, PiritoriPalette.TEXT)
	title.theme_type_variation = PiritoriChrome.TITLE
	title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_child(title)
	var open := st != "not-yet"
	# The state is a word in a ruled box (web `.mission-state`): the colour
	# repeats the word, it never carries it alone.
	var tag_box := PanelContainer.new()
	var tsb := StyleBoxFlat.new()
	tsb.bg_color = Color(0, 0, 0, 0)
	tsb.border_color = PiritoriChrome.readable(_status_color(st), PiritoriPalette.PANEL)
	tsb.set_border_width_all(1)
	tsb.set_corner_radius_all(2)
	tsb.content_margin_left = 7
	tsb.content_margin_right = 7
	tsb.content_margin_top = 3
	tsb.content_margin_bottom = 3
	tag_box.add_theme_stylebox_override("panel", tsb)
	tag_box.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	var tag := _label(tr("story.status_%s" % st.replace("-", "_")), 12, _status_color(st))
	tag.autowrap_mode = TextServer.AUTOWRAP_OFF
	tag.name = "Status"
	tag_box.add_child(tag)
	row.add_child(tag_box)
	col.add_child(row)

	var dl: Dictionary = b.get("deadline", {})
	var meta := tr("story.family_%s" % String(b["family"]).replace("-", "_")) + "  ·  " + tr("story.by_day") % [
		int(dl.get("day", 0)),
		tr("ui.block.night") if String(dl.get("block", "")) == "night" else tr("ui.block.day")]
	if String(b["battle_id"]) != "":
		meta += "  ·  " + (tr("story.fight_avoidable") if bool(b["avoidable"]) else tr("story.fight_forced"))
	col.add_child(_label(meta, 13, PiritoriPalette.TEXT_DIM))

	if not open:
		col.add_child(_label(tr("story.untold"), 14, PiritoriPalette.TEXT_FAINT))
		return card

	col.add_child(_label(String(b["premise"]), 15, PiritoriPalette.TEXT))
	var n := 1
	for step in b.get("steps", []):
		var s: Dictionary = step
		var place := ContentRegistry.anchor(String(s.get("anchor", "")))
		var line := "%d. %s  %s" % [n, String(s.get("verb", "")),
			String(place.get("label", s.get("anchor", "")))]
		col.add_child(_label(line, 14, PiritoriPalette.TEXT))
		var alts: Array = s.get("alternatives", [])
		if not alts.is_empty():
			col.add_child(_label("     " + tr("story.or_alt") % String(alts[0]), 13, PiritoriPalette.TEXT_DIM))
		n += 1
	for stake in [["story.stake_clean", "success", PiritoriPalette.CASH_UP],
			["story.stake_partly", "partial", PiritoriPalette.INTEL_MUSTARD],
			["story.stake_lost", "failure", PiritoriPalette.CASH_DOWN]]:
		var l := _label("%s  %s" % [tr(stake[0]), PiritoriStory.effect_words(b.get(stake[1], []))], 13, stake[2])
		col.add_child(l)
	if String(b["plants"]) != "":
		var plant := _label(String(b["plants"]), 14, PiritoriPalette.LANTERN)
		plant.theme_type_variation = PiritoriChrome.LEDGER
		col.add_child(plant)
	return card


func _status_color(st: String) -> Color:
	match st:
		"complete": return PiritoriPalette.CASH_UP
		"partial": return PiritoriPalette.INTEL_MUSTARD
		"failed": return PiritoriPalette.CASH_DOWN
		"open": return PiritoriPalette.LANTERN
	return PiritoriPalette.TEXT_FAINT


func _add_case_board(to: VBoxContainer) -> void:
	var the_case := ContentRegistry.story_case()
	if the_case.is_empty():
		return
	var board := PiritoriStory.case_board()
	var thread := ContentRegistry.story_thread()
	var panel := PanelContainer.new()
	panel.name = "CaseBoard"
	panel.add_theme_stylebox_override("panel", PiritoriChrome.margins(PiritoriChrome.panel(), 16, 12))
	to.add_child(panel)
	var col := VBoxContainer.new()
	col.add_theme_constant_override("separation", 8)
	panel.add_child(col)
	col.add_child(_label(tr("story.board_eyebrow") % [PiritoriStory.found_count(), board.size()],
		13, PiritoriPalette.TEXT_FAINT))
	var head := _label(String(thread.get("title", "")).to_upper(), 24, PiritoriPalette.TEXT)
	head.theme_type_variation = PiritoriChrome.TITLE
	col.add_child(head)
	col.add_child(_label(String(thread.get("premise", "")), 13, PiritoriPalette.TEXT_DIM))
	# Found: on paper (web `.clue.found`). Missing: a ruled blank with a hint.
	for c in board:
		col.add_child(_clue_card(c))
	var answer := PiritoriStory.case_answer()
	var foot := ""
	if answer != "":
		var label := answer
		for ch in the_case.get("choices", []):
			if String(ch.get("id", "")) == answer:
				label = String(ch.get("label", answer))
		foot = tr("story.settled") % label
	elif PiritoriStory.case_known():
		foot = tr("story.enough") % [String(the_case.get("title", "")),
			String(ContentRegistry.anchor(String(the_case.get("anchor_id", ""))).get("label", ""))]
	else:
		foot = tr("story.keys_short") % [PiritoriStory.key_clues_found(), PiritoriStory.key_clues_needed()]
	var fl := _label(foot, 14, PiritoriPalette.TEXT)
	fl.name = "CaseFoot"
	col.add_child(fl)


func _clue_card(c: Dictionary) -> Control:
	var found := bool(c["is_found"])
	var key := bool(c.get("key", false))
	var card := PanelContainer.new()
	card.name = "Clue_" + String(c["id"])
	card.set_meta("found", found)
	card.set_meta("key", key)
	if found:
		card.add_theme_stylebox_override("panel", PiritoriChrome.margins(PiritoriChrome.plate(), 12, 8))
	else:
		var sb := StyleBoxFlat.new()
		sb.bg_color = Color(0, 0, 0, 0)
		sb.border_color = PiritoriPalette.LINE_STRONG
		sb.set_border_width_all(1)
		sb.set_corner_radius_all(4)
		sb.content_margin_left = 11
		sb.content_margin_right = 11
		sb.content_margin_top = 7
		sb.content_margin_bottom = 7
		card.add_theme_stylebox_override("panel", sb)
	var col := VBoxContainer.new()
	col.add_theme_constant_override("separation", 2)
	card.add_child(col)
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 8)
	col.add_child(row)
	var ink := PiritoriChrome.plate_ink()
	var t := _label(String(c["title"]) if found else "?", 16 if found else 15,
		ink if found else PiritoriPalette.TEXT_DIM, not found)
	t.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_child(t)
	if key:
		var tag := PanelContainer.new()
		var tsb := StyleBoxFlat.new()
		# Darker than the web's #e0524a: 12px light text needs 4.5:1 (5.4 here).
		tsb.bg_color = Color("#b8362e")
		tsb.set_corner_radius_all(2)
		tsb.content_margin_left = 5
		tsb.content_margin_right = 5
		tsb.content_margin_top = 2
		tsb.content_margin_bottom = 2
		tag.add_theme_stylebox_override("panel", tsb)
		tag.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		var kl := _label(tr("story.key"), 12, Color("#fff4ec"), false)
		kl.autowrap_mode = TextServer.AUTOWRAP_OFF
		tag.add_child(kl)
		row.add_child(tag)
	col.add_child(_label(String(c["found"]) if found else String(c["hint"]), 13,
		Color("#3d372b") if found else PiritoriPalette.TEXT_DIM, not found))
	return card


func _label(text: String, px: int, col: Color, readable: bool = true) -> Label:
	var l := Label.new()
	l.text = text
	l.add_theme_font_size_override("font_size", maxi(int(round(px * _scale)), PiritoriFonts.FLOOR_PX))
	l.add_theme_color_override("font_color",
		PiritoriChrome.readable(col, PiritoriPalette.PANEL) if readable else col)
	l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	return l
