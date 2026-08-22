extends Node
## DebugEntry — reach any part of the game in one URL.
##
## CLAUDE.md rule 6: "Debug affordances are features... Never require a console,
## a keyboard, or a desktop browser to verify something works." PHASING.md makes
## this Phase 0, ahead of any combat work, because every phase after it is judged
## by FEEL on a phone and feel cannot be reviewed through a twelve-block click
## path.
##
##     ?battle=battle-courtyard-3v3     drop straight into that fight
##     ?day=5&block=night               walk the campaign forward, then stop
##     ?news=<id>                       play a bulletin
##     ?mode=market                     open a mode
##     ?cash=9000                       afford something
##     ?rows=4&lanes=4                  try a bigger board (canon is 3x3)
##     ?hud=1                           show the debug HUD
##     ?scale=2.2                       interface size, for judging on a phone
##     ?stage=scene-hermanni-skatepark-v01  fight in a named arena
##     ?lang=ja                         start in a language
##
## On the web these are query parameters. On desktop the same keys are command
## line arguments after `--`:
##
##     godot --path . -- --battle=battle-courtyard-3v3
##
## The campaign is walked forward with the model's own advance_block(), never by
## assigning block_index — so day 5 reached this way has had five days of
## settlement, reveals and interest, and looks like the real thing rather than a
## costume of it.

## Parsed once at startup. Empty on a normal launch.
var params: Dictionary = {}

## True when the run was started with any debug parameter. The HUD reads this so
## an ordinary player never sees it.
var active := false


func _ready() -> void:
	params = _read()
	active = not params.is_empty()
	if active:
		print("DebugEntry: ", params)


## Web reads the query string; desktop reads the command line. Anything else
## (headless test scenes, the editor) gets an empty dictionary and behaves
## exactly as it always has — the gates must not see a different game.
func _read() -> Dictionary:
	var raw := ""
	if OS.has_feature("web"):
		# JavaScriptBridge exists only in a web build; the guard above is what
		# keeps this file loadable in a headless gate.
		var got: Variant = JavaScriptBridge.eval("window.location.search", true)
		if got != null:
			raw = String(got)
	else:
		for a in OS.get_cmdline_user_args():
			raw += "&" + String(a)
	return _parse(raw)


## Deliberately forgiving: a leading ? or &, the -- of a command line flag, bare
## flags with no value, and %-escapes.
##
## The dash-stripping lives HERE rather than in _read(), so both entry paths run
## the identical parser. It was the other way around for one commit and the gate
## caught it: the web path and the desktop path could have drifted apart with
## nothing to notice.
static func _parse(raw: String) -> Dictionary:
	var out: Dictionary = {}
	for part in raw.lstrip("?&").split("&", false):
		var s := String(part).lstrip("-")
		if s.is_empty():
			continue
		var eq := s.find("=")
		if eq < 0:
			out[s.uri_decode()] = "1"      # a bare flag is true
		else:
			out[s.substr(0, eq).uri_decode()] = s.substr(eq + 1).uri_decode()
	return out


func has(key: String) -> bool:
	return params.has(key)


func get_str(key: String, fallback: String = "") -> String:
	return String(params.get(key, fallback))


func get_int(key: String, fallback: int = 0) -> int:
	var v := get_str(key)
	return int(v) if v.is_valid_int() else fallback


func is_on(key: String) -> bool:
	var v := get_str(key)
	return v == "1" or v == "true" or v == "yes"


## Move the campaign to the requested day/block, then apply the cheap overrides.
## Called by AppShell once the model is loaded and before the first screen.
##
## Returns a human-readable list of what it did, so a mistyped id fails loudly
## on screen instead of silently doing nothing.
func apply_to_campaign() -> PackedStringArray:
	var log: PackedStringArray = []
	if not active:
		return log

	if has("day") or has("block"):
		var want_day := clampi(get_int("day", GameState.day), 1, 7)
		var want_block := get_str("block", "day")
		var target := ContentRegistry.block_ordinal(want_day, want_block)
		var guard := 0
		while GameState.block_index < target and not GameState.is_slice_complete():
			GameState.advance_block()
			guard += 1
			if guard > 64:
				log.append("day: gave up walking forward")
				break
		log.append("day %d %s" % [GameState.day, GameState.current_block()])

	if has("cash"):
		GameState.cash_eur = get_int("cash", GameState.cash_eur)
		log.append("cash %d" % GameState.cash_eur)

	if has("intel"):
		GameState.intel = get_int("intel", GameState.intel)
		log.append("intel %d" % GameState.intel)

	# Reveal everything, so a mode that gates on discovery is reachable cold.
	if is_on("reveal"):
		for e in ContentRegistry.slice.get("encounters", []):
			GameState.revealed[String(e.get("id", ""))] = true
		for s in ContentRegistry.map.get("sites", []):
			GameState.revealed[String(s.get("id", ""))] = true
		log.append("revealed all")

	# The board's shape, for the comparison the owner asked for (2026-08-21):
	# is 3x3 per side enough to carry the visuals the reference games have?
	# Canon default stands unless a URL says otherwise.
	if has("rows") or has("lanes"):
		var note := FightBoard.apply_override(
			get_int("rows", FightBoard.rows), get_int("lanes", FightBoard.lanes))
		if note != "":
			log.append(note)

	# A new arena arrives as art long before content decides where it sits.
	# Without this it could only be seen by editing a constant.
	if has("stage"):
		BattleStage3D.stage_override = get_str("stage")
		log.append("stage " + get_str("stage"))

	if has("lang"):
		Loc.set_language(get_str("lang"))
		log.append("lang " + get_str("lang"))

	GameState.state_changed.emit()
	return log
