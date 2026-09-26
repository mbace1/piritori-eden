extends Node
## Films the M1/M2 journey in the port, through the shell's own buttons:
## first purchase -> the lead moves -> inspect Siltasaari -> TRAVEL HERE ->
## CANCEL -> TRAVEL HERE -> TRAVEL -> the ledger -> sell.
## Stills at each step go to PIRITORI_SHOT_DIR. For a video, run it under the
## movie writer (fixed fps keeps every wait the same length on any machine):
##   xvfb-run godot --path . --rendering-driver opengl3 --fixed-fps 30 \
##     --write-movie out.avi res://tools/capture_journey.tscn
## Captions are drawn for the viewer only; nothing here touches the rules.

const SIZE := Vector2i(1366, 768)   ## the port is judged in landscape

var _shell: Control
var _map: Node
var _cap: Label
var _out := ""
var _n := 0


func _ready() -> void:
	_out = OS.get_environment("PIRITORI_SHOT_DIR")
	if _out == "":
		_out = "user://"
	get_window().size = SIZE
	GameState.new_campaign()
	_shell = preload("res://scenes/app_shell.tscn").instantiate()
	add_child(_shell)
	await _frames(12)
	# Same pinning as capture.gd: under a harness the shell is not the root.
	_shell.set_anchors_preset(Control.PRESET_TOP_LEFT)
	_shell.position = Vector2.ZERO
	_shell.size = _shell.get_viewport().get_visible_rect().size
	_caption_layer()
	for n in _all(_shell):
		if n.get_script() != null and String(n.get_script().resource_path).ends_with("city_map.gd"):
			_map = n
	await _frames(6)

	await _say("Godot port · landscape. Aatami, the lead and the cursor start at Piritori.", 75, "map-start")
	_map.select("piritori")
	await _frames(10)
	_press("first purchase")
	await _say("The first bag: buy one pack for €45.", 60, "first-bag")
	_press("Buy one pack")
	await _frames(20)
	await _say("€160 → €115. The story's lead moves to Siltasaari; Aatami stays at Piritori.", 90, "lead-moved")
	_map.select("siltasaari")
	await _say("Tapping Siltasaari only INSPECTS it: no market from over here.", 90, "inspecting")
	_press("TRAVEL HERE")
	await _say("TRAVEL HERE: the path is drawn and the cost is stated (none yet — D002 is open).", 105, "journey-plan")
	_press("CANCEL")
	await _say("CANCEL throws the plan away; the campaign is untouched.", 60, "")
	_press("TRAVEL HERE")
	await _frames(20)
	_press("TRAVEL")
	await _say("TRAVEL: Aatami arrives at Siltasaari — same block, same €115.", 90, "arrived")
	_press("Market ledger")
	await _say("Standing there, the ledger's sale is live.", 75, "ledger")
	_press("Sell for")
	await _say("€115 → €183: one €23 profit.", 90, "sold")
	get_tree().quit(0)


func _caption_layer() -> void:
	var layer := CanvasLayer.new()
	layer.layer = 100
	add_child(layer)
	var panel := PanelContainer.new()
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color(0, 0, 0, 0.82)
	sb.border_color = Color("#e8c24a")
	sb.border_width_left = 4
	sb.content_margin_left = 14
	sb.content_margin_right = 14
	sb.content_margin_top = 8
	sb.content_margin_bottom = 8
	panel.add_theme_stylebox_override("panel", sb)
	panel.anchor_left = 0.5
	panel.anchor_right = 0.5
	panel.anchor_top = 1.0
	panel.anchor_bottom = 1.0
	panel.grow_horizontal = Control.GROW_DIRECTION_BOTH
	panel.grow_vertical = Control.GROW_DIRECTION_BEGIN
	panel.offset_bottom = -18
	_cap = Label.new()
	_cap.add_theme_font_size_override("font_size", 20)
	panel.add_child(_cap)
	layer.add_child(panel)


func _say(text: String, frames: int, shot: String) -> void:
	_cap.text = text
	await _frames(frames / 2)
	if shot != "":
		await RenderingServer.frame_post_draw
		_n += 1
		var path := _out.path_join("godot-%02d-%s.png" % [_n, shot])
		get_viewport().get_texture().get_image().save_png(path)
		print("wrote ", path)
	await _frames(frames - frames / 2)


func _press(fragment: String) -> void:
	for n in _all(_shell):
		if n is Button and n.is_visible_in_tree() and fragment.to_lower() in _button_text(n).to_lower():
			n.pressed.emit()
			return
	push_error("capture_journey: no button '%s'" % fragment)
	get_tree().quit(1)


func _button_text(b: Button) -> String:
	var parts: PackedStringArray = [b.text]
	for n in _all(b):
		if n is Label:
			parts.append(n.text)
	return " ".join(parts)


func _frames(n: int) -> void:
	for i in range(n):
		await get_tree().process_frame


func _all(root: Node) -> Array:
	var out: Array = [root]
	for c in root.get_children():
		out.append_array(_all(c))
	return out
