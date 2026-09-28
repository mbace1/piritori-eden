extends Control
## The road screen's stage (web v4.58 `renderRoad()`): the street, and what
## happened on it.
##
## The web puts the event on a paper card with no picture. Here the world window
## has room for one, and the road has no painted scene of its own, so it stands
## on the same drawn street as the arrival — the 3 at the stop when it happened
## on the way, only Aatami when it happened on arriving — with the event on the
## narration plate every encounter uses. Copy stays live UI (handoff §5).

var _street: Control
var _card: PanelContainer
var _eyebrow: Label
var _title: Label
var _text: Label


func _ready() -> void:
	clip_contents = true
	if _street == null:
		_build()
	_apply_scale()


func _build() -> void:
	_street = preload("res://scenes/kallio_street.gd").new()
	_street.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_street.settle()
	add_child(_street)

	var pad := MarginContainer.new()
	pad.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	pad.mouse_filter = Control.MOUSE_FILTER_IGNORE
	for side in ["left", "right"]:
		pad.add_theme_constant_override("margin_" + side, 26)
	pad.add_theme_constant_override("margin_top", 24)
	pad.add_theme_constant_override("margin_bottom", 16)
	add_child(pad)
	var col := VBoxContainer.new()
	col.mouse_filter = Control.MOUSE_FILTER_IGNORE
	pad.add_child(col)
	var spacer := Control.new()
	spacer.size_flags_vertical = Control.SIZE_EXPAND_FILL
	spacer.mouse_filter = Control.MOUSE_FILTER_IGNORE
	col.add_child(spacer)

	_card = PanelContainer.new()
	_card.add_theme_stylebox_override("panel", PiritoriChrome.margins(PiritoriChrome.plate(), 22, 16))
	_card.mouse_filter = Control.MOUSE_FILTER_IGNORE
	col.add_child(_card)
	var card_col := VBoxContainer.new()
	card_col.add_theme_constant_override("separation", 6)
	card_col.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_card.add_child(card_col)
	_eyebrow = _label(13, Color("#6b3f1c"))
	card_col.add_child(_eyebrow)
	_title = _label(26, PiritoriChrome.plate_ink())
	_title.theme_type_variation = PiritoriChrome.TITLE
	card_col.add_child(_title)
	_text = _label(18, PiritoriChrome.plate_ink())
	card_col.add_child(_text)
	# The street stands ABOVE the card, so Aatami is on the pavement and not
	# behind the paper; below it is only the dark of the road.
	_card.resized.connect(_fit_street)
	resized.connect(_fit_street)


func _fit_street() -> void:
	if _street == null or _card == null:
		return
	_street.offset_bottom = -(_card.size.y + 22.0)


## Upright, the card's words grow like the rest of the interface does
## (PiritoriFonts.text_scale), and so do the street's signs and rain.
func _apply_scale() -> void:
	var ts := PiritoriFonts.text_scale(get_viewport_rect().size)
	for l in [_eyebrow, _title, _text]:
		if l != null:
			l.add_theme_font_size_override("font_size", int(round(float(l.get_meta("base_px", 16)) * ts)))
	if _street != null:
		_street.ds = ts
		_street.queue_redraw()


func _draw() -> void:
	# Under the card: the wet dark of the road, not the map's ground.
	draw_rect(Rect2(Vector2.ZERO, size), Color("#0b0d10"))


func _label(px: int, col: Color) -> Label:
	var l := Label.new()
	l.set_meta("base_px", px)
	l.add_theme_font_size_override("font_size", px)
	l.add_theme_color_override("font_color", col)
	l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	l.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return l


## `phase` is "transit" or "arrival": on the way, the 3 is at the stop.
func setup(eyebrow: String, title: String, text: String, phase: String,
		place_id: String = "", place_label: String = "") -> void:
	if _street == null:
		_build()
	_street.tram = _street.Tram.STANDING if phase == "transit" else _street.Tram.NONE
	# On arriving it is THAT corner's stop; on the way it is only the street.
	_street.stop_label = place_label.split(" / ")[0].to_upper() if phase == "arrival" else ""
	_street.show_sign = phase == "arrival" and (place_id == "piritori" or place_id == "vaasankatu")
	_street.show_npc = false
	_street.figure = _street.Figure.STANDING
	_street.still = DebugEntry.has("still")
	_eyebrow.text = eyebrow
	_title.text = title
	_text.text = text
	_apply_scale()
	_street.queue_redraw()
