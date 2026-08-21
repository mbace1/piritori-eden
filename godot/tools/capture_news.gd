extends Node
func _ready() -> void:
	await get_tree().process_frame
	get_window().size = Vector2i(1366, 768)
	var out: String = OS.get_environment("PIRITORI_SHOT_DIR")
	if out == "": out = "user://"
	var lang: String = OS.get_environment("PIRITORI_SHOT_LANG")
	if lang != "": Loc.set_language(lang)
	GameState.new_campaign()
	var s = preload("res://scenes/news_event.gd").new()
	s.set_anchors_preset(Control.PRESET_FULL_RECT)
	get_tree().root.add_child(s)
	await get_tree().process_frame
	s.setup("news-markka-afterlife")
	for i in range(14): await get_tree().process_frame
	await RenderingServer.frame_post_draw
	get_viewport().get_texture().get_image().save_png(out.path_join("piritori-news-%s.png" % Loc.code))
	print("wrote ", out.path_join("piritori-news-%s.png" % Loc.code))
	get_tree().quit(0)
