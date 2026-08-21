extends Node
## Render the battle screen so it can be LOOKED at.
var _s: Control

func _ready() -> void:
	var out: String = OS.get_environment("PIRITORI_SHOT_DIR")
	if out == "": out = "user://"
	var lang: String = OS.get_environment("PIRITORI_SHOT_LANG")
	if lang != "": Loc.set_language(lang)

	await get_tree().process_frame
	get_window().size = Vector2i(1366, 768)
	GameState.new_campaign()
	# Anchors resolve against a parent that HAS a rect. A Control under a plain
	# Node has none, and assigning .size on a FULL_RECT control is ignored — the
	# scene ballooned to 4012x2816 and put the console off-screen. Parent it to
	# the Window instead, which is what app_shell effectively does.
	_s = preload("res://scenes/formation_battle.gd").new()
	_s.set_anchors_preset(Control.PRESET_FULL_RECT)
	get_tree().root.add_child(_s)
	await get_tree().process_frame

	var crew: Array = []
	for c in ContentRegistry.slice.get("crew", []):
		crew.append(String(c.get("id", "")))
		if crew.size() >= 3: break

	_s.begin("battle-courtyard-3v3", crew, 4242)
	for i in range(14): await get_tree().process_frame

	# open an attack so the forecast and target path are visible
	for n in _all(_s):
		if n is Button and "attack" in String(n.text).to_lower():
			n.pressed.emit(); break
	for i in range(10): await get_tree().process_frame

	await RenderingServer.frame_post_draw
	var img := get_viewport().get_texture().get_image()
	var path := out.path_join("piritori-battle-%s.png" % Loc.code)
	img.save_png(path)
	print("wrote ", path)
	get_tree().quit(0)

func _all(n: Node, o: Array = []) -> Array:
	o.append(n)
	for c in n.get_children(): _all(c, o)
	return o
