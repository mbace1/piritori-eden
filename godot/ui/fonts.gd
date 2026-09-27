class_name PiritoriFonts
extends RefCounted
## The three type roles of ART_BIBLE §5.1, bundled — and the CJK fallback.
##
## LANTERN NOIR (web Act I v4.56, `web/lantern.css`). The port used to ask the
## operating system for "Arial, Segoe UI, …" through a SystemFont, which meant
## the game's type was whatever the machine had, and on the web — which has no
## operating system to ask — Godot's built-in face. The browser build measured
## what that costs (four font voices, no system, 65% of text in a system mono)
## and fixed it by bundling three OFL families. The same three ship here, as
## TTF under `ui/fonts/` with their licences beside them:
##
##   display condensed   Barlow Condensed 600/700   titles, places
##   municipal grotesk   Barlow 400/500/600/700     labels, prices, body, buttons
##   ledger mono         IBM Plex Mono 400/500      dialogue, quotes, battle log ONLY
##
## Prices use tabular numerals (§5.2), so the body face turns `tnum` on.
##
## JAPANESE. None of the three carries CJK, so every face falls back to the
## bundled Noto Sans JP subset — not all 9.6MB of it, only the codepoints this
## project can emit; tools/build-font-subset.py derives that set from the locale
## CSVs and the code's string literals, and tests/test_locale.gd fails if the
## two ever drift apart. OFL, licence alongside the files. Past that the imported
## FontFile's own `allow_system_fallback` still asks the host.

const CJK_REGULAR := "res://ui/fonts/NotoSansJP-Subset-Regular.ttf"
const CJK_BOLD := "res://ui/fonts/NotoSansJP-Subset-Bold.ttf"

const BODY := {
	400: "res://ui/fonts/Barlow-Regular.ttf",
	500: "res://ui/fonts/Barlow-Medium.ttf",
	600: "res://ui/fonts/Barlow-SemiBold.ttf",
	700: "res://ui/fonts/Barlow-Bold.ttf",
}
const DISPLAY := {
	600: "res://ui/fonts/BarlowCondensed-SemiBold.ttf",
	700: "res://ui/fonts/BarlowCondensed-Bold.ttf",
}
const MONO := {
	400: "res://ui/fonts/IBMPlexMono-Regular.ttf",
	500: "res://ui/fonts/IBMPlexMono-Medium.ttf",
}

## The type floor at the 1280x720 design size (web v4.56: 329 texts under 12px
## became 0). Anything drawn smaller than this is a readability bug.
const FLOOR_PX := 12

static var _cache: Dictionary = {}


## Barlow: labels, prices, body, buttons. Tabular numerals.
static func body(weight: int = 400) -> Font:
	return _face("body", BODY, weight, true)


## Barlow Condensed: titles and places.
static func display(weight: int = 700) -> Font:
	return _face("display", DISPLAY, weight, false)


## IBM Plex Mono: the ledger voice — dialogue, quotes, the battle log. Nothing
## else: a label in mono is the old interface.
static func mono(weight: int = 400) -> Font:
	return _face("mono", MONO, weight, false)


## Kept for the drawing code that predates the roles (map, battle, news).
static func ui() -> Font:
	return body(400)


static func ui_bold() -> Font:
	return body(700)


static func _face(role: String, table: Dictionary, weight: int, tabular: bool) -> Font:
	var key := "%s|%d" % [role, weight]
	if _cache.has(key):
		return _cache[key]
	# Nearest weight the family ships, so asking Plex for 700 does not fail.
	var best: int = table.keys()[0]
	for w in table.keys():
		if absi(int(w) - weight) < absi(best - weight):
			best = int(w)
	var v := FontVariation.new()
	var path: String = table[best]
	if ResourceLoader.exists(path):
		v.base_font = load(path) as Font
	else:
		push_warning("PiritoriFonts: %s missing" % path)
		var sys := SystemFont.new()
		sys.font_names = PackedStringArray(["sans-serif"])
		sys.font_weight = best
		v.base_font = sys
	if tabular:
		var ts := TextServerManager.get_primary_interface()
		v.opentype_features = {ts.name_to_tag("tnum"): 1}
	var bundled := cjk(best >= 600)
	if bundled != null:
		v.fallbacks = [bundled]
	_cache[key] = v
	return v


## The bundled subset, or null if it has not been built yet - in which case the
## desktop editor still runs and only the web build loses its Japanese.
static func cjk(bold: bool) -> Font:
	var path := CJK_BOLD if bold else CJK_REGULAR
	if not ResourceLoader.exists(path):
		push_warning("PiritoriFonts: %s missing - run tools/build-font-subset.py" % path)
		return null
	return load(path) as Font


## The shell's theme. Built by the chrome now, because a theme is type AND
## material; kept here so old callers still find it.
static func theme() -> Theme:
	return PiritoriChrome.theme()
