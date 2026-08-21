extends Node
## Render the composed crew figures so the stacking can be LOOKED at.
func _ready() -> void:
	await get_tree().process_frame
	get_window().size = Vector2i(1280, 620)
	var out: String = OS.get_environment("PIRITORI_SHOT_DIR")
	if out == "": out = "user://"

	var host := Control.new()
	host.set_anchors_preset(Control.PRESET_FULL_RECT)
	get_tree().root.add_child(host)
	var strip := preload("res://tools/crew_strip.gd").new()
	strip.set_anchors_preset(Control.PRESET_FULL_RECT)
	host.add_child(strip)

	for i in range(8): await get_tree().process_frame
	await RenderingServer.frame_post_draw
	var img := get_viewport().get_texture().get_image()
	img.save_png(out.path_join("piritori-crew-figures.png"))
	print("wrote ", out.path_join("piritori-crew-figures.png"))
	get_tree().quit(0)
