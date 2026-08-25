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


func _ready() -> void:
	clip_contents = true
	_build_text_layer()


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
	col.add_theme_constant_override("separation", 14)
	col.mouse_filter = Control.MOUSE_FILTER_IGNORE
	pad.add_child(col)

	_copy = _make_label(17, PiritoriPalette.PAPER)
	col.add_child(_copy)

	_inspect = _make_label(15, PiritoriPalette.INTEL_MUSTARD)
	_inspect.visible = false
	col.add_child(_inspect)

	var spacer := Control.new()
	spacer.size_flags_vertical = Control.SIZE_EXPAND_FILL
	spacer.mouse_filter = Control.MOUSE_FILTER_IGNORE
	col.add_child(spacer)

	_note_label = _make_label(12, PiritoriPalette.TEXT_DIM)
	col.add_child(_note_label)


func _make_label(size_px: int, col: Color) -> Label:
	var l := Label.new()
	l.add_theme_font_size_override("font_size", size_px)
	l.add_theme_color_override("font_color", col)
	l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	l.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return l


func setup(encounter_id: String) -> void:
	_encounter_id = encounter_id
	if _copy == null:
		_build_text_layer()

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
