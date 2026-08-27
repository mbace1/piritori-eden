extends Control
## Location mode — the stage an encounter is played on.
##
## GODOT_HANDOFF.md §5 (Location):
##   - LOOK / TALK / USE / LEAVE grammar plus earned contextual actions.
##   - "Text and controls stay live Godot UI; do not bake new copy into scene art."
##
## That second rule is why the opening copy is a real Label rather than a
## draw_string into the stage: canvas text cannot reflow, cannot be selected and
## is invisible to assistive technology. Only the ART is drawn here.
##
## Stage art comes from art/v3/manifest.json where a scene is registered for the
## location. Where none is registered the stage is a visibly labelled
## placeholder (handoff §6) — never a silent substitution.

var _encounter_id: String = ""
var _stage_baked := true
var _stage_texture: Texture2D
var _stage_note: String = ""

var _copy: Label
var _inspect: Label
var _note_label: Label
var _card: PanelContainer


func _ready() -> void:
	clip_contents = true
	# `setup()` can run BEFORE this node ever enters the tree — app_shell.gd
	# calls it that way — so it already built the text layer itself if this
	# fires second. Building it twice left a duplicate, empty-text copy
	# clobbering `_copy`/`_card`, while the first, correctly-populated one
	# stayed on screen unreferenced and unfittable: `_refit_card()` (below)
	# was silently fitting the WRONG card. Caught by printing what it was
	# actually operating on rather than trusting the layout math in
	# isolation, one more time.
	if _copy == null:
		_build_text_layer()


func _notification(what: int) -> void:
	# A phone rotating, or a window resizing mid-conversation, changes the
	# width the card's text wraps at — refit rather than leave the old
	# height clipping (or over-padding) the new line count.
	if what == NOTIFICATION_RESIZED:
		_apply_text_scale()
		call_deferred("_refit_card")


## Live UI text over the art layer.
func _build_text_layer() -> void:
	var pad := MarginContainer.new()
	pad.set_anchors_preset(Control.PRESET_FULL_RECT)
	pad.mouse_filter = Control.MOUSE_FILTER_IGNORE
	for side in ["left", "right"]:
		pad.add_theme_constant_override("margin_" + side, 26)
	pad.add_theme_constant_override("margin_top", 24)
	pad.add_theme_constant_override("margin_bottom", 16)
	add_child(pad)

	var col := VBoxContainer.new()
	col.add_theme_constant_override("separation", 10)
	col.mouse_filter = Control.MOUSE_FILTER_IGNORE
	pad.add_child(col)

	# THE SPEAKER GETS THE TOP OF THE FRAME. `Framing.COUNTER` puts a
	# standing figure's head near the top of the stage — the reference plate
	# itself (`toko-slomo-noodles-prototype-v02.webp`) puts its baked band at
	# the BOTTOM, at the torn seam, for the same reason. The card used to sit
	# at the top instead, and Toko's own head disappeared behind it the
	# moment it became an opaque card rather than loose text (2026-08-26,
	# caught on the first render, not assumed fixed once it compiled).
	var spacer := Control.new()
	spacer.size_flags_vertical = Control.SIZE_EXPAND_FILL
	spacer.mouse_filter = Control.MOUSE_FILTER_IGNORE
	col.add_child(spacer)

	# THE DIALOGUE CARD. Concept A (owner-approved 2026-08-24): the speaker's
	# line sits on a torn kraft card, not floating loose over the art.
	# `PiritoriChrome.plate()` already IS that card — a NAME tag and a
	# transcript are the same paper at different sizes, so this needed no new
	# drawing code, only a bigger one.
	_card = PanelContainer.new()
	_card.add_theme_stylebox_override("panel",
		PiritoriChrome.margins(PiritoriChrome.plate(), 22, 16))
	_card.mouse_filter = Control.MOUSE_FILTER_IGNORE
	col.add_child(_card)

	var card_col := VBoxContainer.new()
	card_col.add_theme_constant_override("separation", 8)
	card_col.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_card.add_child(card_col)

	_copy = _make_label(17, PiritoriChrome.plate_ink())
	card_col.add_child(_copy)

	_inspect = _make_label(15, Color("#8a3d12"))  ## warm rust ink, matches the ring
	_inspect.visible = false
	card_col.add_child(_inspect)

	_note_label = _make_label(12, PiritoriPalette.TEXT_DIM)
	col.add_child(_note_label)


## Scaled against the viewport, the same way the shell scales its body text.
## The narration plate is the thing a player actually reads on this screen, and
## at a fixed 17px it was the smallest type in the frame on a phone.
func _text_scale() -> float:
	var vp := get_viewport_rect().size
	if vp.x <= 0.0:
		return 1.0
	# LANDSCAPE DOES NOT SCALE. This used to fall back to the viewport HEIGHT
	# in landscape, so a perfectly ordinary 1280x720 desktop window scaled its
	# type up by 1.67 — inflating a layout that was already correct, and in the
	# battle console pushing it 8px off the bottom of the viewport. The reason
	# to scale at all is a dense portrait phone; a landscape window is the size
	# the authored numbers were chosen for.
	if vp.x >= vp.y:
		return 1.0
	var basis := vp.x
	return clampf(basis / 430.0, 1.0, 2.2)


## The base size is REMEMBERED, not baked in. These labels are built before the
## stage is mounted, when the viewport still reads zero, so scaling them once at
## construction scaled them by 1.0 and the narration plate stayed the smallest
## type on the screen. `_apply_text_scale()` re-applies whenever the size is
## actually known.
func _make_label(size_px: int, col: Color) -> Label:
	var l := Label.new()
	l.set_meta("base_px", size_px)
	l.add_theme_font_size_override("font_size", size_px)
	l.add_theme_color_override("font_color", col)
	l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	l.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return l


func _apply_text_scale() -> void:
	var s := _text_scale()
	for l in [_copy, _inspect, _note_label]:
		if l == null or not l.has_meta("base_px"):
			continue
		l.add_theme_font_size_override("font_size",
			int(round(float(l.get_meta("base_px")) * s)))


func setup(encounter_id: String) -> void:
	_encounter_id = encounter_id
	if _copy == null:
		_build_text_layer()
	_apply_text_scale()

	var enc := ContentRegistry.encounter(encounter_id)
	var site := ContentRegistry.site(String(enc.get("site_id", "")))
	# The encounter's own choice wins. Falling straight through to the anchor
	# meant an anchor with two scenes handed out whichever sat first in the
	# manifest — karhupuisto has both the park and the clearing, and the bear
	# path asked for the clearing and got the park.
	_load_stage_art(String(site.get("anchorId", "")), String(enc.get("scene_asset_id", "")))

	_copy.text = String(enc.get("opening", ""))
	_note_label.text = _stage_note
	_inspect.visible = false
	queue_redraw()
	# Wrapped-label height inside nested containers does not reliably settle
	# on the pass that runs before this control has its own real width — the
	# card clipped its own third line here (2026-08-26), caught by rendering
	# the actual encounter rather than trusting that a clean compile meant a
	# clean layout. Deferred so it runs after the stage has a real size.
	call_deferred("_refit_card")


## The card's minimum height, measured against the font directly rather than
## trusted to container auto-sizing — see the note in `setup()`.
func _refit_card() -> void:
	if _copy == null or not is_inside_tree():
		return
	var font := _copy.get_theme_font("font")
	var font_size := _copy.get_theme_font_size("font_size")
	if font == null or _copy.size.x <= 0.0:
		return
	var h := font.get_multiline_string_size(_copy.text, HORIZONTAL_ALIGNMENT_LEFT,
		_copy.size.x, font_size).y
	if _inspect.visible and _inspect.text != "":
		h += 8.0 + font.get_multiline_string_size(_inspect.text, HORIZONTAL_ALIGNMENT_LEFT,
			_inspect.size.x, _copy.get_theme_font_size("font_size")).y
	_copy.custom_minimum_size.y = h


## Find a registered scene asset for this anchor. Missing art is reported as a
## labelled placeholder rather than a fallback picture.
func _load_stage_art(anchor_id: String, wanted_id: String = "") -> void:
	_stage_texture = null
	_stage_baked = true
	for asset in ContentRegistry.art.get("assets", []):
		if asset.get("kind", "") != "scene":
			continue
		if wanted_id != "":
			if String(asset.get("id", "")) != wanted_id:
				continue
		elif String(asset.get("location", "")) != anchor_id:
			continue
		var path := "res://data/art/" + String(asset.get("file", ""))
		if ResourceLoader.exists(path):
			_stage_texture = load(path)
			_stage_baked = bool(asset.get("baked_text", false)) or bool(asset.get("baked_ui", false))
			_stage_note = "%s — %s (prototype art)" % [
				asset.get("id", ""), asset.get("production_status", "")]
			return
	# A named scene that does not resolve must not silently fall back to the
	# anchor's — that is how you ship the wrong picture and never notice.
	if wanted_id != "":
		_load_stage_art(anchor_id)
		return
	_stage_note = tr("ui.no_stage_art") % anchor_id


func show_inspect(text: String) -> void:
	_inspect.text = tr("ui.you_look") % text
	_inspect.visible = true
	call_deferred("_refit_card")


## Where a fraction of the SCENE IMAGE lands in this control, as a fraction of
## its height. The art is drawn "cover" — scaled to fill and centre-cropped — so
## a y of 0.473 in the file is NOT 0.473 on screen, and anything positioned
## against something painted in the scene has to ask rather than assume.
func texture_y_to_local(frac: float) -> float:
	if _stage_texture == null or size.y <= 0.0:
		return frac
	var tex := _stage_texture.get_size()
	var s: float = maxf(size.x / tex.x, size.y / tex.y)
	var drawn_h := tex.y * s
	var top := (size.y - drawn_h) * 0.5
	return (top + frac * drawn_h) / size.y


func _draw() -> void:
	if _stage_texture != null:
		# Cover the world window without distorting the composition.
		var tex := _stage_texture.get_size()
		var s: float = maxf(size.x / tex.x, size.y / tex.y)
		var drawn := tex * s
		draw_texture_rect(_stage_texture, Rect2((size - drawn) * 0.5, drawn), false)
		# DIM ONLY WHAT COMPETES WITH LIVE COPY.
		#
		# This was a flat 46% black over every scene, to keep live text legible
		# over art that had text baked into it. An asset that declares no baked
		# copy is not competing with anything, and darkening it by nearly half
		# throws away the light the painting was made for — the empty bar's warm
		# interior against its cold street is most of the picture.
		var dim := 0.46
		if not _stage_baked:
			dim = 0.14
		draw_rect(Rect2(Vector2.ZERO, size), Color(0, 0, 0, dim))
	else:
		draw_rect(Rect2(Vector2.ZERO, size), PiritoriPalette.MAP_RELIEF)
		draw_rect(Rect2(0, size.y * 0.55, size.x, size.y * 0.45), PiritoriPalette.PANEL)
