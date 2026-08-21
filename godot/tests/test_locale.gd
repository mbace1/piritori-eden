extends Node
## Locale gate.
##
## The house rule across this repo is per-key English fallback, and the lesson
## recorded in CLAUDE.md is that the fallback is SILENT: three entries shipped
## English-only in two packs and nothing caught it. So this asserts each key
## actually differs per language rather than trusting that a lookup succeeded.

var _pass := 0
var _fail := 0

func check(l: String, c: bool, d: String = "") -> void:
	if c: _pass += 1; print("  ok    %s" % l)
	else: _fail += 1; print("  FAIL  %s %s" % [l, d])

func _ready() -> void:
	print("── locale ──")
	var keys := ["cmd.route", "cmd.crew", "cmd.missions", "cmd.end_day",
		"verb.look", "verb.act", "ui.leave_to_map", "ui.block.day", "ui.block.night",
		"ui.ledger", "ui.back_to_map", "ui.no_missions", "state.open"]

	for lang in Loc.SUPPORTED:
		TranslationServer.set_locale(lang)
		var missing: Array = []
		for k in keys:
			if tr(k) == k:
				missing.append(k)
		check("%s resolves every probed key" % lang, missing.is_empty(), str(missing))

	# Each language must actually say something different.
	TranslationServer.set_locale("en")
	var en: Array = keys.map(func(k): return tr(k))
	for lang in ["fi", "ja"]:
		TranslationServer.set_locale(lang)
		var same: Array = []
		for i in keys.size():
			if tr(keys[i]) == en[i]:
				same.append(keys[i])
		check("%s is not silently falling back to English" % lang, same.is_empty(), str(same))

	# Japanese must have glyph coverage or it renders as tofu.
	var f := PiritoriFonts.ui()
	var jp := "依頼"
	var w := f.get_string_size(jp, HORIZONTAL_ALIGNMENT_LEFT, -1, 16).x
	check("a CJK font is available (%s measures %.1fpx)" % [jp, w], w > 8.0)

	TranslationServer.set_locale("en")
	print("\n%d passed, %d failed" % [_pass, _fail])
	if _fail > 0:
		print("LOCALE FAIL"); get_tree().quit(1)
	else:
		print("LOCALE OK: en/fi/ja resolve, differ, and have glyph coverage.")
		get_tree().quit(0)
