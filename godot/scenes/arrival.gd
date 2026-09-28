extends Control
## The arrival (web Act I v4.59, Kallio noir since v4.60; `playOpening()` in
## web/js/v3/app.js is the reference). Owner, 2026-09-27, answer 8: "sure,
## setting up"; answer 12: "Kallio Noir mystery and need to make some profits".
##
## A NEW campaign opens on the 3 pulling into Piritori in the rain and Aatami
## stepping off, before the first tap on the map. The rules, as the web's:
##   - New Game only. A loaded campaign never sees it (`GameState.arrival_due`
##     is cleared by `from_dict`), and neither does a debug deep link.
##   - Skippable from frame one by ANY input: the SKIP button, a tap, a click,
##     a key. It also ends by itself (about 9.5 s; 6 s held still).
##   - It never touches the campaign. The money, the markka, the debt and the
##     first payment are READ from the save and the content, never typed here.
##   - Under `?still` it is one frame with the same lines.

signal finished

var still := false
var _street: Control
var _lines: Array[Label] = []
var _skip: Button
var _done := false
var _age := 0.0

const RUN_SEC := 9.5
const STILL_SEC := 6.0
const LINE_AT := 0.6
const LINE_GAP := 2.1


func _ready() -> void:
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_STOP
	var bg := ColorRect.new()
	bg.color = Color("#07090c")
	bg.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	bg.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(bg)

	var col := VBoxContainer.new()
	col.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	col.add_theme_constant_override("separation", 0)
	col.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(col)

	# Upright, the whole interface reads bigger; the arrival must too.
	var ts := PiritoriFonts.text_scale(get_viewport_rect().size)
	_street = preload("res://scenes/kallio_street.gd").new()
	_street.ds = ts
	_street.tram = _street.Tram.ARRIVING
	_street.figure = _street.Figure.STEPPING
	_street.still = still
	_street.size_flags_vertical = Control.SIZE_EXPAND_FILL
	col.add_child(_street)
	if still:
		_street.settle()

	var pad := MarginContainer.new()
	pad.mouse_filter = Control.MOUSE_FILTER_IGNORE
	for side in ["left", "right"]:
		pad.add_theme_constant_override("margin_" + side, 28)
	pad.add_theme_constant_override("margin_top", 16)
	pad.add_theme_constant_override("margin_bottom", 22)
	col.add_child(pad)
	var lines_box := VBoxContainer.new()
	lines_box.add_theme_constant_override("separation", 8)
	lines_box.mouse_filter = Control.MOUSE_FILTER_IGNORE
	pad.add_child(lines_box)

	var i := 0
	for text in lines():
		var l := Label.new()
		l.text = text
		l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		l.mouse_filter = Control.MOUSE_FILTER_IGNORE
		if i == 0:
			l.theme_type_variation = PiritoriChrome.TITLE
			l.add_theme_font_size_override("font_size", int(round(24 * ts)))
			l.add_theme_color_override("font_color", PiritoriPalette.LANTERN)
		else:
			l.add_theme_font_size_override("font_size", int(round(18 * ts)))
			l.add_theme_color_override("font_color", Color("#efe7d4"))
		l.modulate.a = 1.0 if still else 0.0
		lines_box.add_child(l)
		_lines.append(l)
		i += 1

	_skip = Button.new()
	_skip.text = tr("arrival.skip")
	_skip.custom_minimum_size = Vector2(96, 48) * ts
	_skip.add_theme_font_size_override("font_size", int(round(16 * ts)))
	_skip.focus_mode = Control.FOCUS_ALL
	_skip.set_anchors_preset(Control.PRESET_TOP_RIGHT)
	_skip.offset_left = -(106.0 * ts + 14.0)
	_skip.offset_top = 14.0
	_skip.offset_right = -14.0
	_skip.offset_bottom = 14.0 + 48.0 * ts
	_skip.pressed.connect(finish)
	add_child(_skip)
	# Focus sits on SKIP, so a key press is taken here and never falls through
	# to whatever the city puts under the veil.
	_skip.call_deferred("grab_focus")

	Sound.wake()
	Sound.arrival()


static func _t(key: String) -> String:
	return String(TranslationServer.translate(key))


## The three lines, built from the save (web v4.61 wording).
static func lines() -> PackedStringArray:
	var out := PackedStringArray()
	out.append(_t("arrival.line_rain"))
	var second := _t("arrival.line_money") % [
		GameState.cash_eur, GameState.markka_mk, GameState.debt_eur]
	var due: Array = ContentRegistry.campaign().get("settlement", {}).get("required_payments", [])
	if not due.is_empty():
		second += " " + _t("arrival.line_due") % [
			int(due[0].get("amount_eur", 0)), int(due[0].get("day", 0))]
	out.append(second)
	out.append(_t("arrival.line_hat"))
	return out


func _process(delta: float) -> void:
	if _done:
		return
	_age += minf(delta, 0.1)
	if not still:
		for i in _lines.size():
			var k := clampf((_age - (LINE_AT + LINE_GAP * i)) / 0.8, 0.0, 1.0)
			_lines[i].modulate.a = k
	if _age >= (STILL_SEC if still else RUN_SEC):
		finish()


## Any input ends it: a tap, a click, a key. Taken, so it reaches nothing below.
func _input(event: InputEvent) -> void:
	if _done:
		return
	var ends := false
	if event is InputEventKey and event.pressed and not event.echo:
		ends = true
	elif event is InputEventMouseButton and not event.pressed:
		ends = true
	elif event is InputEventScreenTouch and not event.pressed:
		ends = true
	if ends:
		get_viewport().set_input_as_handled()
		finish()


func finish() -> void:
	if _done:
		return
	_done = true
	GameState.arrival_due = false
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	if still:
		finished.emit()
		queue_free()
		return
	var fade := create_tween()
	fade.tween_property(self, "modulate:a", 0.0, 0.45)
	fade.tween_callback(func():
		finished.emit()
		queue_free())
