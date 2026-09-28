extends Node
## Stills of what the Act I v4.58-v4.62 port put on screen: the arrival, the
## road (waiting, refused, answered, and on arriving), Toko's counter before
## and after a bowl, the board with what he said, the street seller, the week's
## ledger with the case board, the case, a visit and the SOUND switch.
##
## A gate certifies WORKS; this is how LOOKS is checked. Fixtures are set in
## the model (a block, a pending event, a flag) and every screen is then opened
## through the shell's own buttons.
##
##   xvfb-run -a -s "-screen 0 1366x768x24" godot --path . \
##     --rendering-driver opengl3 res://tools/capture_city_story.tscn
##
## PIRITORI_SHOT_DIR picks the folder; PIRITORI_SHOT_SIZES "landscape,portrait"
## picks the shapes; PIRITORI_SHOT_LANG the language.

const SIZES := {
	"landscape": Vector2i(1366, 768),
	"portrait": Vector2i(390, 844),
	## the owner's device shape; 390x844 clips the header in every build
	"phone": Vector2i(1079, 2047),
}

var _shell: Control
var _out := ""
var _tag := ""


func _ready() -> void:
	_out = OS.get_environment("PIRITORI_SHOT_DIR")
	if _out == "":
		_out = "user://"
	var lang := OS.get_environment("PIRITORI_SHOT_LANG")
	Loc.set_language(lang if lang != "" else "en")
	var sizes := OS.get_environment("PIRITORI_SHOT_SIZES")
	if sizes == "":
		sizes = "landscape,portrait"
	for name in sizes.split(","):
		_tag = name + ("-" + lang if lang != "" else "")
		get_window().size = SIZES.get(name, SIZES["landscape"])
		await _frames(4)
		await _arrival()
		await _road()
		await _toko()
		await _street()
		await _ledger_and_case()
		await _visit()
		await _menu()
	get_tree().quit(0)


func _mount(arrival: bool = false) -> void:
	if _shell:
		_shell.queue_free()
		await _frames(2)
	GameState.arrival_due = arrival
	_shell = preload("res://scenes/app_shell.tscn").instantiate()
	add_child(_shell)
	await _frames(10)
	_shell.set_anchors_preset(Control.PRESET_TOP_LEFT)
	_shell.position = Vector2.ZERO
	_shell.size = _shell.get_viewport().get_visible_rect().size
	await _frames(6)


func _arrival() -> void:
	GameState.new_campaign()
	await _mount(true)
	await _wait(1.0)
	await _shot("arrival-1-tram")
	await _wait(3.4)
	await _shot("arrival-2-steps-off")
	await _wait(2.4)
	await _shot("arrival-3-lines")
	_press("SKIP")
	await _wait(0.8)
	await _shot("arrival-4-after")


func _road() -> void:
	GameState.new_campaign()
	GameState.resolve_encounter("enc-first-purchase", "buy")
	GameState.advance_block()
	GameState.road = {"journeys": 4, "since": 0, "seen": [], "minutes": 0, "minutesBlock": -1, "last": null,
		"pending": {"id": "road-underpass", "phase": "transit", "from": "piritori", "to": "harju"}}
	await _mount()
	await _shot("road-1-waiting-refused")
	_press("Pay them off")
	await _frames(8)
	await _shot("road-2-answered")
	_press_lit()
	await _frames(8)
	GameState.road["pending"] = {"id": "road-kiosk-tip", "phase": "arrival", "from": "piritori", "to": "siltasaari"}
	_shell._show_city()
	await _frames(8)
	await _shot("road-3-arriving")


func _toko() -> void:
	GameState.new_campaign()
	GameState.current_anchor_id = "vaasankatu"
	GameState.mark_seen("vaasankatu")
	await _mount()
	_shell._city_map.select("vaasankatu")
	await _frames(6)
	await _shot("toko-1-rail")
	_press("TOKON RAMEN")
	await _wait(1.0)
	await _shot("toko-2-counter")
	_press("BUY A BOWL")
	await _wait(0.6)
	await _shot("toko-3-after-bowl")
	_press_command("MISSIONS")
	await _frames(6)
	_press("THE BOARD")
	await _frames(10)
	await _shot("toko-4-board")


func _street() -> void:
	GameState.new_campaign()
	await _mount()
	_shell._city_map.select("piritori")
	await _frames(6)
	_press("STREET SELLER")
	await _frames(10)
	await _shot("street-seller")


func _ledger_and_case() -> void:
	GameState.new_campaign()
	GameState.resolve_encounter("enc-first-purchase", "ask-control")
	for i in 7:
		GameState.advance_block()
	GameState.apply_effect("flag:toko-van-pattern")
	GameState.apply_effect("flag:mccormicks-know-skim")
	GameState.apply_effect("flag:kello-receipts")
	GameState.apply_effect("flag:road-fur-hat-41")
	GameState.revealed["mission-courtyard-receipts"] = true
	await _mount()
	_press_command("MISSIONS")
	await _frames(12)
	await _shot("ledger-1-briefings-and-board")
	_press_command("CITY")
	await _frames(6)
	_shell._city_map.select("piritori")
	await _frames(6)
	await _shot("case-1-rail")
	_press("CASE")
	await _frames(10)
	await _shot("case-2-open")
	_press("Give it to Toko")
	await _frames(10)
	await _shot("case-3-answered")


func _visit() -> void:
	GameState.new_campaign()
	GameState.current_anchor_id = "harju"
	GameState.resolved_encounters["enc-toko-quiet-voice"] = "eat-and-listen"
	await _mount()
	_shell._city_map.select("harju")
	await _frames(6)
	_press("BRAHENKENTT")
	await _frames(10)
	await _shot("visit-harju")


func _menu() -> void:
	GameState.new_campaign()
	await _mount()
	_shell._menu_button.pressed.emit()
	await _frames(6)
	await _shot("menu-sound")


func _shot(name: String) -> void:
	await RenderingServer.frame_post_draw
	var path := _out.path_join("%s-%s.png" % [_tag, name])
	get_viewport().get_texture().get_image().save_png(path)
	print("wrote ", path)


func _press(fragment: String) -> void:
	for n in _all(_shell):
		if n is Button and n.is_visible_in_tree() and not n.disabled and fragment.to_lower() in _button_text(n).to_lower():
			n.pressed.emit()
			return
	push_error("capture: no button '%s'" % fragment)


func _press_command(key_text: String) -> void:
	for b in _shell._commands:
		if key_text.to_lower() in _button_text(b).to_lower() or String(b.get_meta("key", "")).ends_with(key_text.to_lower()):
			b.pressed.emit()
			return
	push_error("capture: no command '%s'" % key_text)


func _press_lit() -> void:
	for n in _all(_shell):
		if n is Button and n.is_visible_in_tree() and PiritoriChrome.is_lit(n):
			n.pressed.emit()
			return
	push_error("capture: no lit button")


func _button_text(b: Button) -> String:
	var parts: PackedStringArray = [b.text]
	for n in _all(b):
		if n is Label:
			parts.append(n.text)
	return " ".join(parts)


func _wait(sec: float) -> void:
	await get_tree().create_timer(sec).timeout


func _frames(n: int) -> void:
	for i in range(n):
		await get_tree().process_frame


func _all(root: Node) -> Array:
	var out: Array = [root]
	for c in root.get_children():
		out.append_array(_all(c))
	return out
