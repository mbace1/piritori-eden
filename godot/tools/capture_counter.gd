extends Node
## The COUNTER — a speaker in their place, over a painted room.
##
## `STAGE_SPEC.md` §6 says this is the goal reference for every conversation
## staged off the fight board, and the 2026-08-24 ruling says Toko is a 3D
## LAYER. Neither claim had ever been put on a screen: nothing in `godot/`
## referenced the noodle-bar plate, so `Framing.LOCATION` had no picture of
## itself and its own numbers were described as "starting points to be judged
## on a screen".
##
## This is that screen. It is a CAPTURE HARNESS, not the counter scene — it
## exists to answer one question before anybody builds the real one:
##
##     does the 3D speaker stand where the painted one stood?
##
## Run it:
##   PIRITORI_SHOT_DIR=/tmp/shots \
##     godot --path godot --rendering-driver opengl3 res://tools/capture_counter.tscn
##
## Env:
##   PIRITORI_SHOT_WHO    speaker id (default "toko"); any key in
##                        presenter_3d.SPEAKERS
##   PIRITORI_SHOT_PLATE  a scene id from art/v3/manifest.json to stand them in
##                        front of (default the noodle bar)
##   PIRITORI_SHOT_GHOST  if set, draw the plate again at half alpha OVER the
##                        speaker, so the painted Toko and the 3D one can be
##                        compared directly rather than by memory
##   PIRITORI_SHOT_BAND   if set, rule the band line from STAGE_SPEC §6.2
##
## Note the harness deliberately does NOT draw the UI band's contents. The plate
## still has one baked in (`baked_text: true`) and the whole point of §6.3 is
## that the replacement will not, so drawing a second one here would be
## comparing this screen against the wrong future.

const PLATE_DEFAULT := "res://data/art/scenes/toko-slomo-noodles-prototype-v02.webp"

## STAGE_SPEC §6.2, measured off the plate: the band begins at the torn cream
## seam, not at the battle console's 0.755.
const BAND_TOP := 0.647

## The top of the counter's own hard edge, where the foreground pass begins.
const COUNTER_TOP := 0.400

## The speaker's viewport, as fractions of the FRAME — x and w of its width, y
## and h of its height.
##
## This is NOT the painted figure's bounding box, and the difference cost an
## iteration. The box is a camera view with air around the subject, so placing
## it on the painted man's outline renders him small and off to one side. These
## numbers were solved the other way round: capture once, measure where the 3D
## figure actually lands inside the box, then scale and shift the box so that
## figure sits on the painted one.
##
## It is per-plate by nature — a different room puts its speaker somewhere else
## — which is the honest form of the ruling's "the framing must match the
## plate".
const SPEAKER_BOX := Rect2(0.0488, -0.0307, 0.5448, 0.9691)


func _ready() -> void:
	await get_tree().process_frame
	get_window().size = Vector2i(1366, 768)

	var out: String = OS.get_environment("PIRITORI_SHOT_DIR")
	if out == "":
		out = "user://"
	var lang: String = OS.get_environment("PIRITORI_SHOT_LANG")
	if lang != "":
		Loc.set_language(lang)

	var who: String = OS.get_environment("PIRITORI_SHOT_WHO")
	if who == "":
		who = "toko"

	var plate_path: String = OS.get_environment("PIRITORI_SHOT_PLATE")
	if plate_path == "":
		plate_path = PLATE_DEFAULT

	var root := Control.new()
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	get_tree().root.add_child(root)

	# 1. The room.
	var plate := TextureRect.new()
	plate.set_anchors_preset(Control.PRESET_FULL_RECT)
	plate.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	plate.stretch_mode = TextureRect.STRETCH_SCALE
	if ResourceLoader.exists(plate_path):
		plate.texture = load(plate_path)
	else:
		push_warning("capture_counter: no plate at %s — the speaker will stand in the void" % plate_path)
	root.add_child(plate)

	# 2. The speaker, in the box the painted one occupies.
	var speaker = preload("res://scenes/presenter_3d.gd").new()
	speaker.speaker_id = who
	speaker.framing = speaker.Framing.LOCATION
	if not speaker.available():
		push_error("capture_counter: no model for '%s'" % who)
		get_tree().quit(1)
		return
	# The presenter paints its own studio field, which is right for a
	# television and wrong behind a painted wall — the room IS the backdrop
	# here. This is the one place the flat blue has to give way.
	speaker.transparent = OS.get_environment("PIRITORI_SHOT_OPAQUE") == ""
	speaker.set_anchors_preset(Control.PRESET_FULL_RECT)
	speaker.anchor_left = SPEAKER_BOX.position.x
	# SPEAKER_BOX is in FRAME fractions but the speaker's parent is the clipped
	# stage below, which is only BAND_TOP of the frame tall — so the vertical
	# pair is divided back up. Getting this wrong squashes him rather than
	# clipping him, which looks like a bad model instead of a bad anchor.
	speaker.anchor_top = SPEAKER_BOX.position.y / BAND_TOP
	speaker.anchor_right = SPEAKER_BOX.position.x + SPEAKER_BOX.size.x
	speaker.anchor_bottom = (SPEAKER_BOX.position.y + SPEAKER_BOX.size.y) / BAND_TOP
	speaker.offset_left = 0.0
	speaker.offset_top = 0.0
	speaker.offset_right = 0.0
	speaker.offset_bottom = 0.0
	# A speaker is never allowed into the band. Without this he carries on down
	# over the transcript and the choices — a person standing in front of the
	# interface, which is worse than any framing error because it makes the UI
	# unreadable rather than merely wrong.
	var stage := Control.new()
	stage.clip_contents = true
	stage.mouse_filter = Control.MOUSE_FILTER_IGNORE
	stage.set_anchors_preset(Control.PRESET_FULL_RECT)
	stage.anchor_bottom = BAND_TOP
	stage.offset_bottom = 0.0
	root.add_child(stage)
	stage.add_child(speaker)

	# 3. THE FOREGROUND. The counter, the stools and the brick front, drawn from
	#    the same plate but OVER the speaker.
	#
	#    This is the pass nobody had written down. The manifest's six — stage,
	#    Toko, mask, props, steam, window — are all things BEHIND him, and with
	#    only those he is pasted on top of his own bar: the first capture had him
	#    standing in front of the counter like a cut-out, which is the exact
	#    failure the 3D-layer ruling exists to avoid. A room a person stands IN
	#    needs something in front of them.
	#
	#    It is a tier-1 mask in `STAGE_SPEC.md` §6.1 terms — a bounded region
	#    with the counter's own hard edge as its top — so it is an afternoon, not
	#    a regeneration.
	if OS.get_environment("PIRITORI_SHOT_FG") != "" and plate.texture:
		var clip := Control.new()
		clip.clip_contents = true
		clip.mouse_filter = Control.MOUSE_FILTER_IGNORE
		clip.set_anchors_preset(Control.PRESET_FULL_RECT)
		clip.anchor_top = COUNTER_TOP
		clip.anchor_bottom = BAND_TOP
		clip.offset_top = 0.0
		clip.offset_bottom = 0.0
		root.add_child(clip)

		var fg := TextureRect.new()
		fg.texture = plate.texture
		fg.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		fg.stretch_mode = TextureRect.STRETCH_SCALE
		fg.mouse_filter = Control.MOUSE_FILTER_IGNORE
		fg.set_anchors_preset(Control.PRESET_FULL_RECT)
		# Pull the copy back out to the full frame so it lines up with the plate
		# underneath; the clip above is what makes only the counter show.
		var wh: float = float(get_window().size.y)
		fg.offset_top = -COUNTER_TOP * wh
		fg.offset_bottom = (1.0 - BAND_TOP) * wh
		clip.add_child(fg)

	# 4. Optional overlays for judging.
	if OS.get_environment("PIRITORI_SHOT_GHOST") != "" and plate.texture:
		var ghost := TextureRect.new()
		ghost.set_anchors_preset(Control.PRESET_FULL_RECT)
		ghost.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		ghost.stretch_mode = TextureRect.STRETCH_SCALE
		ghost.texture = plate.texture
		ghost.modulate = Color(1, 1, 1, 0.5)
		ghost.mouse_filter = Control.MOUSE_FILTER_IGNORE
		root.add_child(ghost)

	if OS.get_environment("PIRITORI_SHOT_BAND") != "":
		var rule := ColorRect.new()
		rule.color = Color(0.56, 0.69, 0.42)
		rule.set_anchors_preset(Control.PRESET_TOP_WIDE)
		rule.anchor_top = BAND_TOP
		rule.anchor_bottom = BAND_TOP
		rule.offset_top = 0.0
		rule.offset_bottom = 2.0
		rule.mouse_filter = Control.MOUSE_FILTER_IGNORE
		root.add_child(rule)

	# The presenter's idle motion needs a few frames to leave the T-pose and
	# settle, and the SubViewport needs one more to have anything in it.
	for i in range(20):
		await get_tree().process_frame
	await RenderingServer.frame_post_draw

	# Diagnostics, printed rather than assumed. A speaker who does not appear
	# looks exactly like a speaker who appears behind something.
	print("speaker rect: ", speaker.get_rect(), "  transparent: ", speaker.transparent)
	for c in speaker.get_children():
		if c is SubViewport:
			print("subviewport size: ", (c as SubViewport).size, "  children: ", c.get_child_count())

	var tag := who
	if OS.get_environment("PIRITORI_SHOT_GHOST") != "":
		tag += "-ghost"
	var path: String = out.path_join("piritori-counter-%s.png" % tag)
	get_viewport().get_texture().get_image().save_png(path)
	print("wrote ", path)
	get_tree().quit(0)
