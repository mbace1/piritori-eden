class_name PiritoriStory
extends RefCounted
## The Thursday Load (web Act I v4.62, `web/js/v3/story.js`, the reference).
##
## `content/act1-story-v1.json` holds the woven narrative: a briefing for each
## authored mission, the clues of the case, and the case that settles it. This
## reads the save and never keeps state of its own:
##   - a CLUE is found when its flag is in the save. Every clue is set by an
##     ordinary choice somewhere (an encounter, a visit, a road event), so the
##     board can never claim something the player did not do.
##   - the CASE opens at its anchor once enough KEY clues are found, and is
##     answered once, like an encounter (recorded in `resolved_encounters`,
##     the web's `state.choices`).
##   - answering it runs the ordinary effect grammar and never turns the block.
##   - KELLO'S CUT (v4.63): "take a cut" pays `case.cut.nightly_eur` at every
##     night's end after, counted in `GameState.cut` (the web's `state.cut`).
##     From payment `from_payment` each one risks the McCormicks finding out.


static func clue_found(clue: Dictionary) -> bool:
	return GameState.has_flag(String(clue.get("flag", "")))


## Every clue with `found` set, in the story's order.
static func case_board() -> Array:
	var out: Array = []
	for c in ContentRegistry.story_clues():
		var row: Dictionary = (c as Dictionary).duplicate()
		row["is_found"] = clue_found(c)
		out.append(row)
	return out


static func found_count() -> int:
	return case_board().filter(func(c): return bool(c["is_found"])).size()


static func key_clues_found() -> int:
	return case_board().filter(func(c): return bool(c.get("key", false)) and bool(c["is_found"])).size()


static func key_clues_needed() -> int:
	var c := ContentRegistry.story_case()
	return int(c.get("unlock", {}).get("key_clues", 999))


static func case_id() -> String:
	return String(ContentRegistry.story_case().get("id", ""))


static func case_answer() -> String:
	return String(GameState.resolved_encounters.get(case_id(), ""))


## Why the case cannot be opened right now, or "".
static func case_blocker() -> String:
	var c := ContentRegistry.story_case()
	if c.is_empty():
		return "no-case"
	if GameState.ending_id != "":
		return "campaign-over"
	if case_answer() != "":
		return "resolved"
	if key_clues_found() < key_clues_needed():
		return "not-enough"
	if GameState.current_anchor_id != String(c.get("anchor_id", "")):
		return "not-here"
	return ""


## Enough clues to act, wherever Aatami stands.
static func case_known() -> bool:
	var c := ContentRegistry.story_case()
	return not c.is_empty() and GameState.ending_id == "" \
		and key_clues_found() >= key_clues_needed()


## Answer the case once. {ok, reason, choice}
static func resolve_case(choice_id: String) -> Dictionary:
	var reason := case_blocker()
	if reason != "":
		return {"ok": false, "reason": reason}
	var choice: Dictionary = {}
	for ch in ContentRegistry.story_case().get("choices", []):
		if String(ch.get("id", "")) == choice_id:
			choice = ch
	if choice.is_empty():
		return {"ok": false, "reason": "unknown-choice"}
	GameState.resolved_encounters[case_id()] = choice_id
	GameState.apply_effects(choice.get("effects", []))
	GameState.decision_recorded.emit("case", case_id(), choice_id)
	GameState.state_changed.emit()
	return {"ok": true, "reason": "", "choice": choice}


## Kello's cut, settled once at the end of a night block (web `settleCut`).
## Pays while `thursday-cut` is set and `cut-ended` is not; n risky payments
## in, the chance a family finds out is `chance_per_payment * n`, capped at 1,
## rolled on `kello-cut:<payments>` with the web's FNV roll. Raising the
## found-out event is the caller's (`GameState._settle_cut`). {paid, found_out}
static func settle_cut() -> Dictionary:
	var cut: Dictionary = ContentRegistry.story_case().get("cut", {})
	if cut.is_empty() or not GameState.has_flag("thursday-cut") or GameState.has_flag("cut-ended"):
		return {"paid": 0, "found_out": false}
	var payments := int(GameState.cut.get("payments", 0)) + 1
	GameState.cut["payments"] = payments
	var paid := int(cut.get("nightly_eur", 0))
	GameState.cash_eur += paid
	var disc: Dictionary = cut.get("discovery", {})
	var n := payments - int(disc.get("from_payment", 1)) + 1
	var found := n >= 1 and GameState.deterministic_roll("kello-cut:%d" % payments) \
		< minf(1.0, float(disc.get("chance_per_payment", 0.0)) * n)
	return {"paid": paid, "found_out": found}


## A mission's briefing: the woven words plus the authored steps and stakes.
static func briefing(mission_id: String) -> Dictionary:
	var m := ContentRegistry.mission(mission_id)
	if m.is_empty():
		return {}
	var words := ContentRegistry.story_mission(mission_id)
	var bid = m.get("battle_id", null)
	return {
		"id": mission_id,
		"title": String(words.get("title", mission_id)),
		"premise": String(words.get("premise", "")),
		"plants": String(words.get("plants", "")),
		"family": String(m.get("family", "")),
		"deadline": m.get("deadline", {}),
		"steps": m.get("steps", []),
		"success": m.get("success_effects", []),
		"partial": m.get("partial_effects", []),
		"failure": m.get("failure_effects", []),
		"battle_id": "" if bid == null else String(bid),
		"avoidable": m.get("battle_avoidance", null) != null,
	}


## complete | partial | failed | open | not-yet. A mission is briefed once its
## opening scene is next, was revealed, or has been played; until then it is a
## title (web `renderMissions`).
static func mission_status(mission_id: String) -> String:
	if GameState.mission_state.has(mission_id):
		return String(GameState.mission_state[mission_id])
	var m := ContentRegistry.mission(mission_id)
	var signal_id := String(m.get("signal_encounter_id", ""))
	var next_id := ""
	if not GameState.is_slice_complete():
		next_id = String(ContentRegistry.scheduled_for(GameState.day, GameState.current_block()).get("encounter_id", ""))
	var told := GameState.is_revealed(mission_id) or (signal_id != "" and signal_id == next_id) \
		or GameState.is_resolved(signal_id)
	return "open" if told else "not-yet"


## Effects in words, for briefings and the case (web `effectWords`) — never a
## rule of its own, and nothing it cannot name is invented.
static func effect_words(effects: Array) -> String:
	var out := PackedStringArray()
	for fx in effects:
		var f := String(fx)
		var p := f.split(":")
		var head := p[0]
		match head:
			"cash":
				var v := int(p[1])
				out.append(("+€%d" if v >= 0 else "−€%d") % absi(v))
			"exit-fund":
				out.append(_t("story.fx_exit") % absi(int(p[1])))
			"intel":
				out.append(_t("story.fx_intel") % p[1])
			"stock":
				out.append(_t("story.fx_packs") % p[2])
			"relationship":
				out.append(_t("story.fx_rel") % [_cap(p[1]), p[2]])
			"obligation":
				out.append(_t("story.fx_owes") % _cap(p[1]))
			"pressure":
				out.append(_t("story.fx_heat") % [_place(p[1]), p[2]])
			"reveal":
				if p.size() > 1 and p[1].begins_with("offer-"):
					out.append(_t("story.fx_price"))
			"crew-outcome":
				out.append(_t(
					"story.fx_critical" if f.contains("critical") else "story.fx_wound"))
			"service":
				out.append(_t("story.fx_closed"))
			"debt-holder-memory":
				out.append(_t("story.fx_debt_memory"))
			"flag":
				if f.contains("pattern"):
					out.append(_t(
						"story.fx_half_pattern" if f.contains("incomplete") else "story.fx_pattern"))
			_:
				if f.ends_with(":advantage"):
					out.append(_t("story.fx_advantage"))
	return " · ".join(out) if not out.is_empty() else "—"


static func _t(key: String) -> String:
	return String(TranslationServer.translate(key))


## An anchor's label, or the id in words — without asking the registry to
## error about an id that is not an anchor.
static func _place(id: String) -> String:
	for a in ContentRegistry.anchors():
		if String(a.get("id", "")) == id:
			return String(a.get("label", id))
	return _words(id)


## A faction's own name where the slice gives one ("McCormick family"),
## else the id in words.
static func _cap(id: String) -> String:
	for f in ContentRegistry.slice.get("factions", []):
		if String(f.get("id", "")) == id or String(f.get("id", "")) == id.replace("-", "_"):
			return String(f.get("display_name", id))
	return _words(id)


static func _words(id: String) -> String:
	var s := id.replace("-", " ").replace("_", " ")
	return s.substr(0, 1).to_upper() + s.substr(1)
