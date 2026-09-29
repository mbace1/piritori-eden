extends Control
## Market mode — the ledger.
##
## GODOT_HANDOFF.md §5 (Market and mission):
##   - "The ledger reveals only earned contacts, offers and quote confidence."
##   - "Commitment shows time, cash, crew, equipment, pressure and uncertainty
##     first."
##   - "Criminal logistics remain abstract; add no weights, concealment, dosing
##     or evasion instructions."
##
## Products are abstract packs. The slice's product record carries an explicit
## presentation_rule forbidding operational detail; nothing here may show it.

signal executed(offer_id: String)

const ROW_H := 62.0   ## above the 44px floor
var _list: VBoxContainer


func _ready() -> void:
	var scroll := ScrollContainer.new()
	scroll.set_anchors_preset(Control.PRESET_FULL_RECT)
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	add_child(scroll)

	var pad := MarginContainer.new()
	for side in ["left", "right", "top", "bottom"]:
		pad.add_theme_constant_override("margin_" + side, 20)
	pad.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.add_child(pad)

	_list = VBoxContainer.new()
	_list.add_theme_constant_override("separation", 10)
	_list.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	pad.add_child(_list)

	GameState.state_changed.connect(_rebuild)
	_rebuild()


var _scale := 1.0


func _rebuild() -> void:
	_scale = PiritoriFonts.text_scale(get_viewport_rect().size)
	for c in _list.get_children():
		c.queue_free()

	var offers := GameState.visible_offers()
	if offers.is_empty():
		_list.add_child(_label(tr("ui.no_contacts"), 15, PiritoriPalette.TEXT_DIM))

	for o in offers:
		_list.add_child(_offer_row(o))

	_add_board()


# ── THE BOARD (web `renderBoard()`, `board.js`) ────────────────────────────
#
# What you know about every open place's price, in the knowledge you actually
# have: a quote where you stood this block, a range for four, a rumour for
# twelve, then nothing — and what Toko told you over a bowl, marked as HEARD
# rather than seen (v4.61). The authored offers above are leads someone gave
# you; this is what you read to decide whether a lead is worth the trip.
func _add_board() -> void:
	var c := PiritoriBoard.clock()
	var panel := PanelContainer.new()
	panel.name = "Board"
	panel.add_theme_stylebox_override("panel", PiritoriChrome.margins(PiritoriChrome.panel(), 16, 12))
	var col := VBoxContainer.new()
	col.add_theme_constant_override("separation", 6)
	panel.add_child(col)
	col.add_child(_label(tr("board.eyebrow") % [tr("ui.day_n") % int(c["day"]),
		tr("ui.block.night") if String(c["block"]) == "night" else tr("ui.block.day")],
		13, PiritoriPalette.TEXT_FAINT))
	var head := _label(tr("board.title"), 24, PiritoriPalette.TEXT)
	head.theme_type_variation = PiritoriChrome.TITLE
	col.add_child(head)
	col.add_child(_label(tr("board.note"), 13, PiritoriPalette.TEXT_DIM))
	var known := 0
	for r in PiritoriBoard.rows():
		var row: Dictionary = r
		var shown: Dictionary = row["shown"]
		var lv := String(shown["level"])
		if lv != PiritoriMarket.INFO_NONE:
			known += 1
		col.add_child(_board_row(row, shown, lv))
	if known == 0:
		col.add_child(_label(tr("board.go"), 13, PiritoriPalette.TEXT_DIM))
	_list.add_child(panel)


func _board_row(row: Dictionary, shown: Dictionary, lv: String) -> Control:
	var upright := get_viewport_rect().size.y > get_viewport_rect().size.x
	# Four columns in a row on a wide screen; upright, place and price on one
	# line and why and when underneath, so nothing is squeezed to a sliver.
	var line: BoxContainer = VBoxContainer.new() if upright else HBoxContainer.new()
	line.name = "BoardRow_" + String(row["id"])
	line.set_meta("level", lv)
	line.set_meta("heard", bool(row["heard"]))
	line.add_theme_constant_override("separation", 2 if upright else 12)
	var top := HBoxContainer.new() if upright else line
	var bottom := HBoxContainer.new() if upright else line
	if upright:
		top.add_theme_constant_override("separation", 12)
		bottom.add_theme_constant_override("separation", 12)
		line.add_child(top)
		line.add_child(bottom)
	var place := String(row["label"]) + ("  · " + tr("board.here") if bool(row["here"]) else "")
	var dark := lv == PiritoriMarket.INFO_NONE
	var name_l := _label(place, 15, PiritoriPalette.TEXT_DIM if dark else PiritoriPalette.TEXT)
	name_l.custom_minimum_size.x = 170 * _scale
	if upright:
		name_l.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	top.add_child(name_l)
	var price := ""
	match lv:
		PiritoriMarket.INFO_QUOTE:
			price = "€%s / €%s" % [_eur(shown["buy"]), _eur(shown["sell"])]
		PiritoriMarket.INFO_RANGE:
			price = "€%s–%s / €%s–%s" % [_eur(shown["low_buy"]), _eur(shown["high_buy"]),
				_eur(shown["low_sell"]), _eur(shown["high_sell"])]
		PiritoriMarket.INFO_RUMOUR:
			price = tr("board.rumour_%s" % String(shown.get("direction", "ordinary")))
		_:
			price = tr("board.never")
	var price_l := _label(price, 15, PiritoriPalette.TEXT_DIM if dark else PiritoriPalette.TEXT)
	price_l.name = "Price"
	if upright:
		price_l.autowrap_mode = TextServer.AUTOWRAP_OFF
	else:
		price_l.custom_minimum_size.x = 170
		price_l.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	top.add_child(price_l)
	if dark and upright:
		return line
	var why := "—" if dark else tr(String(shown.get("cause_key", "board.why_ordinary")))
	var why_l := _label(why, 13, PiritoriPalette.TEXT_DIM)
	why_l.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	bottom.add_child(why_l)
	var age := int(row["age"])
	var known := "—"
	if bool(row["heard"]):
		known = tr("board.heard_now") if age == 0 else tr("board.heard") % age
	elif bool(row["visited"]):
		known = tr("board.now") if age == 0 else tr("board.ago") % age
	var known_l := _label(known, 13, PiritoriPalette.LANTERN if bool(row["heard"]) else PiritoriPalette.TEXT_DIM)
	known_l.name = "Known"
	known_l.custom_minimum_size.x = 120 * _scale
	bottom.add_child(known_l)
	return line


## Prices are balance values to the cent; the board reads them to the euro.
func _eur(v: Variant) -> String:
	return str(int(round(float(v))))


func _offer_row(o: Dictionary) -> Control:
	var side := String(o.get("side", ""))
	var product := ContentRegistry.product(String(o.get("product_id", "")))
	var anchor := ContentRegistry.anchor(String(o.get("anchor_id", "")))
	var price := int(o.get("quote", {}).get("eur", 0))
	var confidence := String(o.get("confidence", ""))

	var panel := PanelContainer.new()
	var sb := StyleBoxFlat.new()
	sb.bg_color = PiritoriPalette.PANEL
	sb.border_color = PiritoriPalette.offer_color(side)
	sb.border_width_left = 3
	sb.content_margin_left = 14
	sb.content_margin_right = 14
	sb.content_margin_top = 10
	sb.content_margin_bottom = 10
	panel.add_theme_stylebox_override("panel", sb)

	var col := VBoxContainer.new()
	col.add_theme_constant_override("separation", 4)

	# side is spelled out, never colour alone (ART_BIBLE §4.2)
	var verb := tr("ui.sell") if side == "sell" else tr("ui.buy")
	col.add_child(_label("%s  %s  at  %s" % [
		verb,
		product.get("display_name", o.get("product_id", "")),
		anchor.get("label", o.get("anchor_id", "")),
	], 16, PiritoriPalette.offer_color(side)))

	# Commitment first: price, confidence, cause.
	col.add_child(_label(tr("ui.per_unit") % [
		price,
		product.get("unit", "pack"),
		PiritoriPalette.confidence_label(confidence),
		o.get("dominant_cause", ""),
	], 13, PiritoriPalette.TEXT_DIM))

	var can := GameState.can_sell(o) if side == "sell" else GameState.can_buy(o)
	var btn := Button.new()
	btn.custom_minimum_size = Vector2(0, ROW_H * 0.7 * _scale)
	btn.add_theme_font_size_override("font_size", int(round(15 * _scale)))
	btn.disabled = not can
	var verb_word := tr("ui.sell_verb") if side == "sell" else tr("ui.buy_verb")
	btn.text = tr("ui.trade_for") % [verb_word, price]
	if not can:
		btn.text += "  (" + _why_not(o, side) + ")"
	var oid: String = o["id"]
	btn.pressed.connect(func():
		if GameState.execute_offer(oid):
			executed.emit(oid))
	col.add_child(btn)

	panel.add_child(col)
	return panel


func _why_not(o: Dictionary, side: String) -> String:
	var pid := String(o.get("product_id", ""))
	# You trade where you stand; the ledger only records (M1).
	if not GameState.at_offer(o):
		var anchor := ContentRegistry.anchor(String(o.get("anchor_id", "")))
		return tr("ui.at_place") % String(anchor.get("label", o.get("anchor_id", "")))
	if side == "sell":
		return tr("ui.nothing_in_stock")
	var price := int(o.get("quote", {}).get("eur", 0))
	if GameState.cash_eur < price:
		return tr("ui.short_by") % (price - GameState.cash_eur)
	return tr("ui.no_capacity")


func _label(text: String, size_px: int, col: Color = PiritoriPalette.TEXT) -> Label:
	var l := Label.new()
	l.text = text
	l.add_theme_font_size_override("font_size", maxi(int(round(size_px * _scale)), PiritoriFonts.FLOOR_PX))
	l.add_theme_color_override("font_color", PiritoriChrome.readable(col, PiritoriPalette.PANEL))
	l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	return l
