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

	# Glyph coverage, and this check has been WRONG once already.
	#
	# It used to measure `get_string_size("依頼").x > 8.0` and call that coverage.
	# A tofu box HAS a width. The measurement is satisfied by the very failure it
	# was written to catch, so it passed on every run while the browser build drew
	# the entire Japanese locale - and U+2192 in the title, in all three languages
	# - as boxes. A gate that cannot fail is itself a finding (AGENTS.md §4).
	#
	# has_char asks the only question that matters: is there a glyph, or a box.
	# And it asks it of EVERY character the player can be shown, in every
	# language, rather than of one hand-picked word.
	_check_glyph_coverage()

	TranslationServer.set_locale("en")
	print("\n%d passed, %d failed" % [_pass, _fail])
	if _fail > 0:
		print("LOCALE FAIL"); get_tree().quit(1)
	else:
		print("LOCALE OK: en/fi/ja resolve, differ, and have glyph coverage.")
		get_tree().quit(0)


## Every character of every translated string, in every language, must have a
## glyph in the font the shell actually installs - not merely a width.
##
## SystemFont asks the operating system for a face, which is why this used to
## pass on a developer's Windows machine and on a CI runner with fonts, while the
## WEB export - which has no operating system to ask - drew boxes. ui/fonts.gd
## now carries a bundled subset as a fallback so the answer stops depending on
## the host, and tools/build-font-subset.py --check keeps that subset in step
## with these same strings.
func _check_glyph_coverage() -> void:
	# Test the BUNDLED subset on its own, not the composite the shell installs.
	#
	# The composite starts with SystemFont, so on any developer machine or CI
	# runner that happens to have a Japanese face installed it passes whatever
	# the bundle contains - which is precisely how the browser build shipped
	# tofu with this gate green. The web export has no system font, so the
	# honest question is: does the bundle ALONE carry every glyph.
	var regular := PiritoriFonts.cjk(false)
	var bold := PiritoriFonts.cjk(true)
	check("the bundled subset is present (run tools/build-font-subset.py)",
		regular != null and bold != null)
	if regular == null or bold == null:
		return

	# Read the CSV, NOT TranslationServer.
	#
	# The obvious version of this asked each translation object for
	# get_message_list(). Godot compiles a .csv into an OptimizedTranslation,
	# which does not retain the message texts - so the list comes back EMPTY, the
	# loop runs zero times, and the gate reports "every glyph of 0 characters is
	# drawable" and passes. That is the second cannot-fail gate found in this one
	# function, so it is worth naming: a check whose subject can be empty must
	# assert that it was not.
	var rows := _locale_rows()
	check("the locale CSV yields rows to check", rows.size() > 20,
		"got %d" % rows.size())

	for lang in Loc.SUPPORTED:
		var col: int = _column_for(lang)
		if col < 0:
			check("%s has a column in the CSV" % lang, false)
			continue
		var missing: Dictionary = {}
		var seen := 0
		for row in rows:
			if col >= row.size():
				continue
			var msg := String(row[col])
			for i in msg.length():
				var cp := msg.unicode_at(i)
				if cp <= 0x20:
					continue
				seen += 1
				if not regular.has_char(cp) or not bold.has_char(cp):
					missing[cp] = String(row[0])
		var report := ""
		for cp in missing:
			report += " U+%04X(%s)" % [cp, missing[cp]]
		check("%s: every glyph of %d characters is drawable" % [lang, seen],
			missing.is_empty() and seen > 100, report)

	# The symbols drawn from code rather than from a translation. The arrow is
	# the one that shipped broken in every language, so it is named here.
	for pair in [["→", "the title"], ["▶", "an unseen encounter"],
			["✓", "a seen bulletin"], ["◉", "a LOOK inspectable"],
			["•", "an effect bullet"], ["◆", "an open site pin"],
			["▲", "a landmark pin"], ["◇", "a teaser pin"],
			["×", "a stat readout"], ["€", "the euro"]]:
		var cp: int = String(pair[0]).unicode_at(0)
		check("U+%04X %s is drawable (%s)" % [cp, pair[0], pair[1]],
			regular.has_char(cp) and bold.has_char(cp))


const LOCALE_CSV := "res://locale/ui.csv"

var _rows_cache: Array = []
var _header: PackedStringArray = PackedStringArray()


## Every data row of the locale CSV, header excluded.
func _locale_rows() -> Array:
	if not _rows_cache.is_empty():
		return _rows_cache
	var f := FileAccess.open(LOCALE_CSV, FileAccess.READ)
	if f == null:
		return []
	_header = f.get_csv_line()
	while not f.eof_reached():
		var row := f.get_csv_line()
		if row.size() > 1 and String(row[0]) != "":
			_rows_cache.append(row)
	f.close()
	return _rows_cache


## Which column carries this language, read from the header rather than assumed.
func _column_for(lang: String) -> int:
	if _header.is_empty():
		_locale_rows()
	for i in _header.size():
		if String(_header[i]).strip_edges() == lang:
			return i
	return -1
