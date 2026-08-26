extends Node
## The location screen's rail band — medallion, dialogue card, LOOK/ACT/LEAVE
## buttons — against a real encounter, at real sizes.
##
## Concept A (owner-approved 2026-08-24, "a works") is a mock-up, not the
## game; this is the "always check the actual render" step ART_BIBLE §9.7
## demands before anything is called done. Drives the real shell straight to
## `enc-toko-quiet-voice` — the target reference's own encounter — via
## `_show_location`, which does not gate on schedule, so it works regardless
## of what day GameState starts on.
##
## Run it:
##   PIRITORI_SHOT_DIR=/tmp/shots \
##     godot --path godot --rendering-driver opengl3 res://tools/capture_location_band.tscn
##
## Env:
##   PIRITORI_SHOT_ENCOUNTER   encounter id (default "enc-toko-quiet-voice")

const SHOTS := [
	["landscape", Vector2i(1366, 768)],
	["portrait", Vector2i(390, 844)],
]

func _ready() -> void:
	var out_dir: String = OS.get_environment("PIRITORI_SHOT_DIR")
	if out_dir == "":
		out_dir = "user://"
	var enc_id: String = OS.get_environment("PIRITORI_SHOT_ENCOUNTER")
	if enc_id == "":
		enc_id = "enc-toko-quiet-voice"

	for shot in SHOTS:
		var label: String = shot[0]
		var dim: Vector2i = shot[1]
		get_window().size = dim

		var shell := preload("res://scenes/app_shell.tscn").instantiate()
		add_child(shell)
		for i in range(12):
			await get_tree().process_frame

		shell.set_anchors_preset(Control.PRESET_TOP_LEFT)
		shell.position = Vector2.ZERO
		shell.size = shell.get_viewport().get_visible_rect().size
		for i in range(4):
			await get_tree().process_frame

		shell.call("_show_location", enc_id)
		# The INSET medallion presenter needs a few frames to leave the T-pose
		# and settle, same as every other presenter capture in this toolkit.
		for i in range(24):
			await get_tree().process_frame
		await RenderingServer.frame_post_draw

		var img := get_viewport().get_texture().get_image()
		var path := out_dir.path_join("piritori-location-band-%s.png" % label)
		img.save_png(path)
		print("wrote ", path, "  ", img.get_width(), "x", img.get_height())

		shell.queue_free()
		await get_tree().process_frame

	get_tree().quit(0)
