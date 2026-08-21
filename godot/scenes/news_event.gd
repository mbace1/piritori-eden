extends Control
## News and events — the fifth mode.
##
## SCREEN_AND_COMBAT_BASELINE §2: "Arvo Linde broadcasts, historical texture,
## family scenes, faction consequences and explicit source-status labels...
## In Era I, this is visibly a television-led screen: major reports arrive
## through a scheduled broadcast, SMS carries short personal or operational
## messages, and online information requires a separate desktop terminal."
##
## ART_BIBLE §13.1 gives the TV channel its material: "CRT shell, studio frame,
## lower-third cards, dated source tag" with "scanline roll, analogue softness,
## restrained presenter", and "No channel is wrapped in a modern app grid or
## smartphone shell."
##
## §13.3: "Documented fact, character inference, accusation and fictional
## composite each receive a distinct written status, not only a colour." So the
## tiers are spelled out in words; the colour is only a second channel.
##
## The presenter himself is the ART_BIBLE §13.2 3D exception and is not built.
## The screen says so rather than faking him.

signal dismissed(news_id: String)

const SCANLINE_STEP := 3.0

var news_id: String = ""
var _news: Dictionary = {}
var _font: Font
var _t := 0.0
var _screen_rect := Rect2()
var _presenter: Control = null
var _copy_layer: Control = null
var _chrome: Control = null


func _ready() -> void:
	_font = PiritoriFonts.ui()
	clip_contents = true
	_mount_presenter()


## ART_BIBLE §13.2: only the moving presenter inside the TV is 3D. He is mounted
## as a child so he sits INSIDE the tube; the shell, lower third and everything
## around him stay cut-cardstock and are drawn below.
func _mount_presenter() -> void:
	var scene := preload("res://scenes/presenter_3d.gd").new()
	if not scene.available():
		return
	_presenter = scene
	_presenter.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_presenter)

	# A child Control draws OVER its parent's _draw(), so the lower third has to
	# be its own node stacked after the presenter or the 3D render buries it.
	_chrome = Control.new()
	_chrome.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_chrome.draw.connect(_draw_chrome)
	add_child(_chrome)


func setup(id: String) -> void:
	news_id = id
	for n in ContentRegistry.slice.get("news", []):
		if String(n.get("id", "")) == id:
			_news = n
			break
	_build()


func _process(dt: float) -> void:
	_t += dt
	queue_redraw()
	if is_instance_valid(_presenter) and _screen_rect.size.x > 1.0:
		_presenter.position = _screen_rect.position
		_presenter.size = _screen_rect.size
	if is_instance_valid(_chrome):
		_chrome.set_anchors_preset(Control.PRESET_FULL_RECT)
		_chrome.queue_redraw()


# ── the room, and the set inside it ────────────────────────────────────────

func _draw() -> void:
	if _news.is_empty():
		return
	# A dark domestic room; the television is the only lit thing in it.
	draw_rect(Rect2(Vector2.ZERO, size), MapStyle.FRAME)

	var w: float = minf(size.x * 0.52, 620.0)
	var h: float = w * 0.62
	var shell := Rect2((size.x - w) * 0.5, size.y * 0.10, w, h)

	# CRT shell: dark carton with a cream edge (§13.1)
	draw_rect(Rect2(shell.position + Vector2(0, 6), shell.size), Color(0, 0, 0, 0.5))
	draw_rect(shell, Color("#15191c"))
	draw_rect(shell, MapStyle.FRAME_EDGE, false, 3.0)

	var inset := shell.grow(-18.0)
	_screen_rect = inset
	# studio field: low-saturation blue, per §4.3 "low-saturation studio blue"
	draw_rect(inset, Color("#1b2a36"))

	if not is_instance_valid(_presenter):
		_draw_presenter_placeholder(inset)
		_draw_lower_third(self, inset)
	# The 3D presenter carries his own scanlines and posterisation, so the
	# canvas pass only adds them when he is absent.
	if not is_instance_valid(_presenter):
		_draw_scanlines(inset)
	draw_rect(inset, Color("#7fb3c8"), false, 2.0)


## §13.2 makes Arvo a 3D presenter inside the TV — the one 3D exception in the
## game. Until that model is approved, the set says what is missing instead of
## drawing a stand-in and letting it pass for the real thing.
func _draw_presenter_placeholder(screen: Rect2) -> void:
	var desk_y := screen.position.y + screen.size.y * 0.66
	# desk
	draw_rect(Rect2(screen.position.x, desk_y, screen.size.x, screen.end.y - desk_y),
		Color("#16232c"))
	# a restrained seated silhouette
	var cx := screen.get_center().x
	var head_r := screen.size.y * 0.10
	var head_c := Vector2(cx, desk_y - head_r * 2.1)
	draw_circle(head_c, head_r, Color("#2b3d49"))
	var shoulders := PackedVector2Array([
		Vector2(cx - head_r * 2.3, desk_y),
		Vector2(cx - head_r * 1.5, desk_y - head_r * 1.5),
		Vector2(cx + head_r * 1.5, desk_y - head_r * 1.5),
		Vector2(cx + head_r * 2.3, desk_y),
	])
	draw_colored_polygon(shoulders, Color("#2b3d49"))

	var note := tr("news.presenter_placeholder")
	var nw := _font.get_string_size(note, HORIZONTAL_ALIGNMENT_LEFT, -1, 10).x
	draw_string(_font, Vector2(cx - nw * 0.5, screen.position.y + 16), note,
		HORIZONTAL_ALIGNMENT_LEFT, -1, 10, Color("#6f8c9c"))


## The lower third: presenter, channel and a dated source tag (§13.1).
## Drawn on the chrome layer when a 3D presenter is present, so it reads over
## him exactly as a broadcast lower third does.
func _draw_chrome() -> void:
	if _screen_rect.size.x > 1.0:
		_draw_lower_third(_chrome, _screen_rect)


func _draw_lower_third(ci: CanvasItem, screen: Rect2) -> void:
	var band_h: float = maxf(screen.size.y * 0.20, 44.0)
	var band := Rect2(screen.position.x, screen.end.y - band_h, screen.size.x, band_h)
	ci.draw_rect(band, Color(0.04, 0.06, 0.08, 0.86))
	ci.draw_line(band.position, Vector2(band.end.x, band.position.y),
		Color("#c8a24a"), 2.0)

	var name := String(_news.get("presenter", ""))
	ci.draw_string(_font, band.position + Vector2(14, 21), name.to_upper(),
		HORIZONTAL_ALIGNMENT_LEFT, -1, 15, MapStyle.TITLE_TEXT)

	var tag := "%s · %s %d" % [
		String(_news.get("channel", "")).replace("-", " ").to_upper(),
		tr("ui.block.day"), int(_news.get("day", 0))]
	ci.draw_string(_font, band.position + Vector2(14, 38), tag,
		HORIZONTAL_ALIGNMENT_LEFT, -1, 11, Color("#c8a24a"))


## Scanline roll and analogue softness — restrained, over the screen only.
func _draw_scanlines(screen: Rect2) -> void:
	var col := Color(0, 0, 0, 0.16)
	var y := screen.position.y + fmod(_t * 12.0, SCANLINE_STEP)
	while y < screen.end.y:
		draw_line(Vector2(screen.position.x, y), Vector2(screen.end.x, y), col, 1.0)
		y += SCANLINE_STEP
	# one brighter band rolling slowly down the tube
	var roll := screen.position.y + fmod(_t * 26.0, screen.size.y)
	draw_rect(Rect2(screen.position.x, roll, screen.size.x, 12.0),
		Color(1, 1, 1, 0.025))


# ── the copy, below the set ────────────────────────────────────────────────

func _build() -> void:
	# Free only the copy layer. Clearing every child also freed the mounted
	# presenter, and a queue_free'd node is NOT null — it is a dangling
	# reference that errors the moment _process touches it.
	if _copy_layer and is_instance_valid(_copy_layer):
		_copy_layer.queue_free()

	var scroll := ScrollContainer.new()
	_copy_layer = scroll
	scroll.set_anchors_preset(Control.PRESET_FULL_RECT)
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	add_child(scroll)

	var pad := MarginContainer.new()
	pad.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	for s in ["left", "right"]:
		pad.add_theme_constant_override("margin_" + s, 34)
	pad.add_theme_constant_override("margin_bottom", 20)
	scroll.add_child(pad)

	var col := VBoxContainer.new()
	col.add_theme_constant_override("separation", 10)
	col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	pad.add_child(col)

	# leave room for the television drawn behind
	var spacer := Control.new()
	spacer.custom_minimum_size = Vector2(0, maxf(size.y * 0.10 + minf(size.x * 0.52, 620.0) * 0.62 + 22.0, 260.0))
	col.add_child(spacer)

	# What Arvo says on air, in his own authored words.
	var copy := String(_news.get("arvo_copy", ""))
	if copy != "":
		var l := _label("“%s”" % copy, 17, MapStyle.TITLE_TEXT)
		col.add_child(l)

	# §13.3: each status is WRITTEN, not merely coloured.
	_add_status(col, "news.documented", _text("documented"), Color("#7fc98a"))
	_add_status(col, "news.inference", _text("inference"), Color("#c5a044"))
	_add_status(col, "news.accusation", _text("accusation"), Color("#c87539"))
	_add_status(col, "news.fiction", _text("fiction"), Color("#b84d83"))

	var sources: Array = _news.get("sources", [])
	if sources.size() > 0:
		col.add_child(_label(tr("news.sources"), 12, MapStyle.TINY_TEXT))
		for src in sources:
			col.add_child(_label("· " + String(src), 11, MapStyle.TINY_TEXT))

	var btn := Button.new()
	btn.text = tr("news.continue")
	btn.custom_minimum_size = Vector2(0, 48)
	btn.add_theme_font_size_override("font_size", 15)
	btn.pressed.connect(_dismiss)
	col.add_child(btn)


## A tier's copy, or "" when the bulletin does not make that kind of claim.
## `accusation` is genuinely null here — the slice asserts no contested claim in
## this broadcast — and String(null) is a runtime error, not an empty string.
func _text(key: String) -> String:
	var v: Variant = _news.get(key, null)
	return "" if v == null else String(v)


## One source-status block. Empty tiers are omitted rather than shown blank —
## `accusation` is null in this bulletin and asserting one would be inventing it.
func _add_status(col: VBoxContainer, key: String, body: String, accent: Color) -> void:
	if body.strip_edges() == "":
		return
	var head := _label(tr(key), 12, accent)
	col.add_child(head)
	var l := _label(body, 14, PiritoriPalette.TEXT)
	col.add_child(l)


func _dismiss() -> void:
	# The bulletin's own effects land when it has been read, not before.
	GameState.apply_effects(_news.get("effects", []))
	GameState.flags["news-seen:" + news_id] = true
	dismissed.emit(news_id)


func _label(text: String, px: int, col: Color) -> Label:
	var l := Label.new()
	l.text = text
	l.add_theme_font_size_override("font_size", px)
	l.add_theme_color_override("font_color", col)
	l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	return l
