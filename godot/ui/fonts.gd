class_name PiritoriFonts
extends RefCounted
## One shared font with CJK coverage.
##
## Godot's bundled fallback font has no CJK glyphs, so every Japanese string
## renders as tofu boxes. Rather than commit a multi-megabyte Noto binary into
## a repository whose rule is to keep project-owned art only, this asks the
## system for a face and lets Godot fall back per-glyph.
##
## The named faces are the usual Japanese UI faces on Windows, macOS and Linux
## in turn; `allow_system_fallback` then covers anything they miss.

static var _ui: Font = null
static var _ui_bold: Font = null

const FACES := [
	"Arial",                # Latin first: the SVG sets Arial Narrow
	"Segoe UI",
	"Yu Gothic UI",         # Windows JP
	"Meiryo",
	"MS Gothic",
	"Hiragino Sans",        # macOS JP
	"Noto Sans CJK JP",     # Linux JP
	"Noto Sans JP",
	"sans-serif",
]


static func ui() -> Font:
	if _ui == null:
		_ui = _make(false)
	return _ui


static func ui_bold() -> Font:
	if _ui_bold == null:
		_ui_bold = _make(true)
	return _ui_bold


static func _make(bold: bool) -> Font:
	var f := SystemFont.new()
	f.font_names = PackedStringArray(FACES)
	f.allow_system_fallback = true
	f.font_weight = 700 if bold else 400
	f.subpixel_positioning = TextServer.SUBPIXEL_POSITIONING_AUTO
	return f


## A theme carrying that font, applied once at the shell so every Control and
## every draw_string in the tree inherits CJK coverage.
static func theme() -> Theme:
	var t := Theme.new()
	t.default_font = ui()
	t.default_font_size = 15
	return t
