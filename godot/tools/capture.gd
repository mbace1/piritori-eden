extends Node
## Renders the shell at real sizes and writes PNGs.
## CLAUDE.md's standing lesson: "a gate that certifies works cannot see looks",
## so an art change ends in a screenshot, never in a green suite.
## Run WITHOUT --headless: godot --path piritori/godot res://tools/capture.tscn

const SHOTS := [
	["landscape", Vector2i(1366, 768)],
	["portrait", Vector2i(390, 844)],
]

## PIRITORI_SHOT_LANG picks the interface language for the capture.

var _shell: Control

func _ready() -> void:
	var want_lang: String = OS.get_environment("PIRITORI_SHOT_LANG")
	if want_lang != "":
		Loc.set_language(want_lang)
		await get_tree().process_frame

	var out_dir: String = OS.get_environment("PIRITORI_SHOT_DIR")
	if out_dir == "":
		out_dir = "user://"

	for shot in SHOTS:
		var label: String = shot[0]
		var dim: Vector2i = shot[1]
		get_window().size = dim
		get_window().content_scale_size = dim

		if _shell:
			_shell.queue_free()
			await get_tree().process_frame
		_shell = preload("res://scenes/app_shell.tscn").instantiate()
		add_child(_shell)

		# Let layout settle, then step into the opening encounter for the
		# second frame so both modes get looked at.
		for i in range(12):
			await get_tree().process_frame

		_select_piritori()
		for i in range(8):
			await get_tree().process_frame

		await RenderingServer.frame_post_draw
		var img := get_viewport().get_texture().get_image()
		var path := out_dir.path_join("piritori-city-%s-%s.png" % [label, Loc.code])
		img.save_png(path)
		print("wrote ", path, "  ", img.get_width(), "x", img.get_height())

		# now the location stage
		var btn := _find_button("first purchase")
		if btn:
			btn.pressed.emit()
			for i in range(10):
				await get_tree().process_frame
			await RenderingServer.frame_post_draw
			var img2 := get_viewport().get_texture().get_image()
			var p2 := out_dir.path_join("piritori-location-%s-%s.png" % [label, Loc.code])
			img2.save_png(p2)
			print("wrote ", p2)

	get_tree().quit(0)


func _all(root: Node, out: Array = []) -> Array:
	out.append(root)
	for c in root.get_children():
		_all(c, out)
	return out

func _find_button(fragment: String) -> Button:
	for n in _all(_shell):
		if n is Button and fragment.to_lower() in String(n.text).to_lower():
			return n
	return null

func _select_piritori() -> void:
	for n in _all(_shell):
		if n.get_script() != null and String(n.get_script().resource_path).ends_with("city_map.gd"):
			n.select("piritori")
			return
