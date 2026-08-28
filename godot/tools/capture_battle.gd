extends Node
## Render the battle screen so it can be LOOKED at.
var _s: Control

func _ready() -> void:
	var out: String = OS.get_environment("PIRITORI_SHOT_DIR")
	if out == "": out = "user://"
	var lang: String = OS.get_environment("PIRITORI_SHOT_LANG")
	if lang != "": Loc.set_language(lang)
	# Which battle to render — content names a scene_asset_id, and different
	# battles can point at different (or no) 3D stages. Unset means the
	# original default. Added chasing VERSIONS.md v4.6: comparing two
	# DIFFERENT battle ids is what caught every 3D battle rendering the same
	# fallback stage.
	var battle_id: String = OS.get_environment("PIRITORI_SHOT_BATTLE")
	if battle_id == "": battle_id = "battle-courtyard-3v3"

	# Before anything is instantiated: _ready() builds the console, so a flag set
	# after add_child() arrives too late and the chrome stays up.
	var fb := preload("res://scenes/formation_battle.gd")
	fb.debug_extent = OS.get_environment("PIRITORI_SHOT_EXTENT") != ""
	fb.debug_chrome_off = OS.get_environment("PIRITORI_SHOT_NOCHROME") != ""

	await get_tree().process_frame
	get_window().size = Vector2i(1366, 768)

	# The board's shape, so several can be rendered and compared side by side.
	# PIRITORI_SHOT_BOARD is "lanes x rows", e.g. "4x4". Unset means canon.
	var board: String = OS.get_environment("PIRITORI_SHOT_BOARD")
	var tag := "canon"
	if battle_id != "battle-courtyard-3v3": tag += "-" + battle_id
	if board != "":
		var bits := board.split("x")
		if bits.size() == 2:
			FightBoard.apply_override(int(bits[1]), int(bits[0]))
			tag = board
	print("board: %d lanes x %d rows" % [FightBoard.lanes, FightBoard.rows])

	# PIRITORI_SHOT_PLAY is "cx,cy,fwd,lane" — the arena diamond's centre and its
	# half-extents along the board's two axes, all normalised to the plate.
	var play: String = OS.get_environment("PIRITORI_SHOT_PLAY")
	if play != "":
		var n := play.split(",")
		if n.size() == 4:
			fb.play_diamond_override = {
				"c": Vector2(float(n[0]), float(n[1])),
				"fwd": float(n[2]), "lane": float(n[3])}
			tag += "-play"
			print("arena: ", fb.play_diamond_override)

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

	_s.begin(battle_id, crew, 4242)

	# A candidate background, dropped in behind the board so the composition can
	# be judged before anything is registered as art.
	var bg: String = OS.get_environment("PIRITORI_SHOT_BG")
	if bg != "":
		var img := Image.load_from_file(bg)
		if img != null:
			_s._stage = ImageTexture.create_from_image(img)
			_s.queue_redraw()
			print("bg: ", bg)
		else:
			print("bg FAILED to load: ", bg)
	for i in range(14): await get_tree().process_frame

	# open an attack so the forecast and target path are visible
	for n in _all(_s):
		if n is Button and "attack" in String(n.text).to_lower():
			n.pressed.emit(); break
	for i in range(10): await get_tree().process_frame

	await RenderingServer.frame_post_draw
	var img := get_viewport().get_texture().get_image()
	var path := out.path_join("piritori-board-%s.png" % tag)
	img.save_png(path)
	print("wrote ", path)
	get_tree().quit(0)

func _all(n: Node, o: Array = []) -> Array:
	o.append(n)
	for c in n.get_children(): _all(c, o)
	return o
