extends Node
## Renders the shell at real sizes and writes PNGs.
## CLAUDE.md's standing lesson: "a gate that certifies works cannot see looks",
## so an art change ends in a screenshot, never in a green suite.
## Run WITHOUT --headless: godot --path piritori/godot res://tools/capture.tscn

## An encounter that actually puts a person on screen — Toko at the noodle
## bar. `test_shell` already asserts this one has a speaker with a model.
const SPEAKER_SHOT := "enc-toko-quiet-voice"

## A site whose stage art was only just registered. Shot so the "does the
## placeholder still play here" question is answered by a picture rather than
## by the manifest saying an id exists.
const SITE_SHOT := "enc-bank-counter"

## `phone` is the owner's actual device, added 2026-08-27 after a screenshot
## from it showed the command dock and the battle console both running off the
## right edge — clipped mid-word — on a shape this tool had never photographed.
## 390x844 is aspect 0.462; a Pixel 10 is 1079x2047, which is 0.527 and a good
## deal wider relative to its height. Testing one narrow portrait is not
## testing portrait.
const SHOTS := [
	["landscape", Vector2i(1366, 768)],
	["portrait", Vector2i(390, 844)],
	["phone", Vector2i(1079, 2047)],
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
		# Window size ONLY. The old line here also forced content_scale_size to
		# the window size, which made the shell lay out in 390 design units on
		# the phone shot. The real build stretches canvas_items from a 1280x720
		# base, so a phone gets ~1280 design units - every portrait review shot
		# taken the old way showed a layout NO DEVICE PRODUCES, and at least one
		# scale fix was judged "did nothing" against it. Let the project's own
		# stretch settings do to this window exactly what they do to a phone.
		get_window().size = dim

		if _shell:
			_shell.queue_free()
			await get_tree().process_frame
		_shell = preload("res://scenes/app_shell.tscn").instantiate()
		add_child(_shell)

		# Let layout settle, then step into the opening encounter for the
		# second frame so both modes get looked at.
		for i in range(12):
			await get_tree().process_frame

		# The shell is a child of this plain Node here, where in the game it is
		# the scene root. Only the scene-tree root Control is resized by the
		# engine when content_scale_factor changes, so under this harness the
		# shell can keep a size from a transient mid-resize state - measured
		# once at 665 design units wide in a 410-unit viewport, which clipped a
		# third of every line and looked like a text bug. Pin it to the settled
		# viewport, which is what being the main scene does for free.
		# ...and setting .size alone is not enough: the full-rect anchors win
		# the next layout pass and put the stale size straight back. Drop the
		# anchors first; the harness owns the geometry from here.
		_shell.set_anchors_preset(Control.PRESET_TOP_LEFT)
		_shell.position = Vector2.ZERO
		_shell.size = _shell.get_viewport().get_visible_rect().size
		for i in range(4):
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

		# AND A SCENE WITH SOMEBODY IN IT. The opening encounter is a place
		# with no speaker, so every capture this tool has ever taken showed the
		# empty case — which is exactly the case that does NOT exercise the
		# portrait stage/rail split, the speaker mount, or `presenter_3d`.
		# Reported directly, 2026-08-26: "We need to see the small characters
		# and their faces close up screens when they talk", and there was no
		# way to look at that without playing to day 3 by hand.
		if _shell.has_method("_show_location"):
			_shell._show_location(SPEAKER_SHOT)
			for i in range(14):
				await get_tree().process_frame
			await RenderingServer.frame_post_draw
			var img3 := get_viewport().get_texture().get_image()
			var p3 := out_dir.path_join("piritori-speaker-%s-%s.png" % [label, Loc.code])
			img3.save_png(p3)
			print("wrote ", p3)

			_shell._show_location(SITE_SHOT)
			for i in range(14):
				await get_tree().process_frame
			await RenderingServer.frame_post_draw
			var img4 := get_viewport().get_texture().get_image()
			var p4 := out_dir.path_join("piritori-site-%s-%s.png" % [label, Loc.code])
			img4.save_png(p4)
			print("wrote ", p4)

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
