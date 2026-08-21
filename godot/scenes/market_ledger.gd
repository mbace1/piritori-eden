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


func _rebuild() -> void:
	for c in _list.get_children():
		c.queue_free()

	var offers := GameState.visible_offers()
	if offers.is_empty():
		_list.add_child(_label("No contacts yet. Offers appear as you earn them.",
			15, PiritoriPalette.TEXT_DIM))
		return

	for o in offers:
		_list.add_child(_offer_row(o))


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
	var verb := "SELL" if side == "sell" else "BUY"
	col.add_child(_label("%s  %s  at  %s" % [
		verb,
		product.get("display_name", o.get("product_id", "")),
		anchor.get("label", o.get("anchor_id", "")),
	], 16, PiritoriPalette.offer_color(side)))

	# Commitment first: price, confidence, cause.
	col.add_child(_label("€%d per %s · %s · %s" % [
		price,
		product.get("unit", "pack"),
		PiritoriPalette.confidence_label(confidence),
		o.get("dominant_cause", ""),
	], 13, PiritoriPalette.TEXT_DIM))

	var can := GameState.can_sell(o) if side == "sell" else GameState.can_buy(o)
	var btn := Button.new()
	btn.custom_minimum_size = Vector2(0, ROW_H * 0.7)
	btn.add_theme_font_size_override("font_size", 15)
	btn.disabled = not can
	btn.text = "%s for €%d — costs one block" % [verb.capitalize(), price]
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
	if side == "sell":
		return "nothing in stock"
	var price := int(o.get("quote", {}).get("eur", 0))
	if GameState.cash_eur < price:
		return "short €%d" % (price - GameState.cash_eur)
	return "no capacity"


func _label(text: String, size_px: int, col: Color = PiritoriPalette.TEXT) -> Label:
	var l := Label.new()
	l.text = text
	l.add_theme_font_size_override("font_size", size_px)
	l.add_theme_color_override("font_color", col)
	l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	return l
