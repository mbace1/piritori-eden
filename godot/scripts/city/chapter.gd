class_name PiritoriChapter
extends RefCounted
## The chapter turn (H7 of The Long Game; web Act I v4.64,
## `web/js/v3/chapter.js`, the reference).
##
## Owner, 2026-09-29 (DESIGN_AUTHORITY answer 22): weapons carry; cash and
## produce need not, and a chapter opens on a standard stake instead. That is
## the GDD persistence table (2026-08-22) read literally: what you built
## persists, what you were granted does not. `chapter_turn.rules` in canon
## says what happens to each thing, one word each:
##   carry  - it crosses the boundary as it is
##   reset  - it goes back to nothing (stock) or to what is re-earned (unlocks)
##   stake  - cash: the chapter opens on `opening_cash_eur`, whatever you had
##
## The rules are data so they can be TESTED both ways without touching this
## file: every function takes the slice to read them from, the registry's by
## default. `turn_plan` reads the save and changes nothing; `turn_chapter`
## applies it and is the only writer.

## One row per thing a rule can name: its key in canon, the locale key of its
## label, and whether it is money. The order is the web's.
const ROWS := [
	{"key": "cash", "label": "chapter.row_cash", "money": true},
	{"key": "stock", "label": "chapter.row_stock", "money": false},
	{"key": "gear", "label": "chapter.row_gear", "money": false},
	{"key": "crew", "label": "chapter.row_crew", "money": false},
	{"key": "relationships", "label": "chapter.row_relationships", "money": false},
	{"key": "upgrades", "label": "chapter.row_upgrades", "money": false},
	{"key": "debt", "label": "chapter.row_debt", "money": true},
	{"key": "obligations", "label": "chapter.row_obligations", "money": false},
	{"key": "markka", "label": "chapter.row_markka", "money": false},
	{"key": "exit_fund", "label": "chapter.row_exit_fund", "money": true},
	{"key": "mission_unlocks", "label": "chapter.row_mission_unlocks", "money": false},
]


static func _slice(content: Dictionary) -> Dictionary:
	return ContentRegistry.slice if content.is_empty() else content


static func rules(content: Dictionary = {}) -> Dictionary:
	return _slice(content).get("chapter_turn", {}).get("rules", {})


## What a row counts in the save now (web `ROWS[].read`).
static func read(key: String) -> int:
	match key:
		"cash": return GameState.cash_eur
		"stock":
			var n := 0
			for v in GameState.stock.values():
				n += int(v)
			return n
		"gear": return GameState.equipment.size()
		"crew": return GameState.roster.size()
		"relationships": return GameState.relationships.size()
		"upgrades": return GameState.upgrades.size()
		"debt": return GameState.debt_eur
		"obligations":
			return GameState.obligations.values().filter(func(v): return bool(v)).size()
		"markka": return GameState.markka_mk
		"exit_fund": return GameState.exit_fund_eur
		"mission_unlocks": return _mission_unlocks().size()
	return 0


## The missions revealed so far — the Godot save keeps every reveal in one
## table, the web keeps these in `revealedMissions`.
static func _mission_unlocks() -> Array:
	return GameState.revealed.keys().filter(func(k): return String(k).begins_with("mission-"))


## One row per thing the rules name: what it is now, and what the next chapter
## opens with. Reads, never writes.
static func turn_plan(content: Dictionary = {}) -> Array:
	var r := rules(content)
	var stake := int(_slice(content).get("chapter_turn", {}).get("opening_cash_eur", 0))
	var out: Array = []
	for row in ROWS:
		var key := String(row["key"])
		if not r.has(key):
			continue
		var rule := String(r[key])
		var now := read(key)
		var next := now if rule == "carry" else (stake if rule == "stake" else 0)
		out.append({"key": key, "label": String(row["label"]), "rule": rule,
			"now": now, "next": next, "money": bool(row["money"])})
	return out


## Where the next chapter is authored, or {} (the slice authors one).
static func next_chapter(content: Dictionary = {}) -> Dictionary:
	for c in _slice(content).get("chapters", []):
		if int((c as Dictionary).get("index", 0)) == GameState.chapter + 1:
			return c
	return {}


## Turn the chapter over. Only after the chapter's ending has run. Applies the
## rules, opens the next chapter's goal, and returns the plan it applied.
## {ok, reason, plan, authored}
static func turn_chapter(content: Dictionary = {}) -> Dictionary:
	if not GameState.chapter_cleared:
		return {"ok": false, "reason": "chapter-not-cleared"}
	var plan := turn_plan(content)
	var def := next_chapter(content)
	var r := rules(content)
	if r.get("cash", "") == "stake":
		GameState.cash_eur = int(_slice(content).get("chapter_turn", {}).get("opening_cash_eur", 0))
	if r.get("cash", "") == "reset":
		GameState.cash_eur = 0
	if r.get("stock", "") == "reset":
		for k in GameState.stock.keys():
			GameState.stock[k] = 0
	if r.get("gear", "") == "reset":
		GameState.equipment.clear()
	if r.get("crew", "") == "reset":
		GameState.roster = PackedStringArray()
	if r.get("relationships", "") == "reset":
		for k in GameState.relationships.keys():
			GameState.relationships[k] = 0
	if r.get("upgrades", "") == "reset":
		GameState.upgrades = PackedStringArray()
	if r.get("debt", "") == "reset":
		GameState.debt_eur = 0
	if r.get("obligations", "") == "reset":
		GameState.obligations = {}
	if r.get("markka", "") == "reset":
		GameState.markka_mk = 0
	if r.get("exit_fund", "") == "reset":
		GameState.exit_fund_eur = 0
	if r.get("mission_unlocks", "") == "reset":
		for k in _mission_unlocks():
			GameState.revealed.erase(k)
	# Help hired for one job does not follow you into the next chapter.
	GameState.temporary_crew = PackedStringArray()

	var from := GameState.chapter
	GameState.chapter += 1
	GameState.chapter_cleared = false
	GameState.chapter_earned = 0
	GameState.chapter_loot_taken = 0
	GameState.chapter_fights_won = 0
	GameState.last_ending_outcome = ""
	var goal: Dictionary = def.get("goal", {})
	match String(goal.get("type", "")):
		"money": GameState.chapter_goal = GameState.ChapterGoal.MONEY
		"loot": GameState.chapter_goal = GameState.ChapterGoal.LOOT
		"fights": GameState.chapter_goal = GameState.ChapterGoal.FIGHTS
	if goal.has("threshold"):
		GameState.chapter_threshold = int(goal["threshold"])
	# The web writes `memory:chapter-turned:N` into its flags; the Godot save
	# keeps `memory:` in `memories`, which `has_flag` reads either way.
	if not GameState.memories.has("chapter-turned:%d" % from):
		GameState.memories.append("chapter-turned:%d" % from)
	GameState.state_changed.emit()
	return {"ok": true, "reason": "", "plan": plan, "authored": not def.is_empty()}
