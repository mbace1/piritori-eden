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

## The CJK coverage, bundled rather than borrowed.
##
## SystemFont below asks the OPERATING SYSTEM for a face. On the web there is no
## operating system to ask: the browser export fell back to Godot's built-in
## face, which carries no CJK at all, and the entire Japanese locale rendered as
## tofu boxes - as did U+2192 in the title, in every language. Every gate was
## green while it did, because a locale gate asks whether a string is TRANSLATED,
## never whether it can be DRAWN.
##
## So the glyphs ship with the game. Not all 9.6MB of Noto Sans JP, only the 300-odd
## codepoints this project can actually emit; tools/build-font-subset.py derives
## that set from the locale CSVs and rebuilds it, and tests/test_font_coverage.gd
## fails if the two ever drift apart. OFL, licence alongside the files.
const CJK_REGULAR := "res://ui/fonts/NotoSansJP-Subset-Regular.ttf"
const CJK_BOLD := "res://ui/fonts/NotoSansJP-Subset-Bold.ttf"

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

	# A FALLBACK, deliberately, not the primary face: on desktop the named
	# system faces above are the intended look and keep it, and this only
	# supplies what they miss. On the web they resolve to nothing and this
	# carries the Japanese and every symbol on its own.
	var bundled := cjk(bold)
	if bundled != null:
		f.fallbacks = [bundled]
	return f


## The bundled subset, or null if it has not been built yet - in which case the
## desktop editor still runs and only the web build loses its Japanese.
static func cjk(bold: bool) -> Font:
	var path := CJK_BOLD if bold else CJK_REGULAR
	if not ResourceLoader.exists(path):
		push_warning("PiritoriFonts: %s missing - run tools/build-font-subset.py" % path)
		return null
	return load(path) as Font


## A theme carrying that font, applied once at the shell so every Control and
## every draw_string in the tree inherits CJK coverage.
static func theme() -> Theme:
	var t := Theme.new()
	t.default_font = ui()
	t.default_font_size = 15
	return t
