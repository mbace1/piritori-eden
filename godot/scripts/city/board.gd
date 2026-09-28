class_name PiritoriBoard
extends RefCounted
## THE BOARD — the market model read through what the player actually knows
## (web `web/js/v3/board.js`, v3 "heard").
##
## THE ONE RULE: you do not see prices you have not earned (MARKET.md §5). A
## quote is exact for the block you took it in, a range for four, a rumour for
## twelve, then nothing — and a place you have WORKED never drops below a
## rumour. `GameState.seen[anchor]` is the block you last stood there.
##
## HEARD, NOT SEEN (v4.61): a range Toko told you over a bowl
## (`GameState.heard[anchor]`). A range at best, ageing like anything seen; it
## never makes a place count as visited, and it only shows when it beats what
## you saw yourself.

const GOOD := "piri"


## The model's clock is the SCHEDULE's day and block (web `clockOf`).
static func clock() -> Dictionary:
	var sched := ContentRegistry.schedule()
	if sched.is_empty():
		return {"day": 1, "block": "day"}
	var slot: Dictionary = sched[mini(GameState.block_index, sched.size() - 1)]
	return {"day": int(slot.get("day", 1)), "block": String(slot.get("block", "day"))}


## Rapport narrows the spread rather than moving the mid (MARKET.md §7e).
static func _rapport(anchor_id: String) -> float:
	if anchor_id == "vaasankatu":
		return maxf(0.0, float(GameState.relationships.get("toko", 0))) / 3.0
	if anchor_id == "torkkelinmaki":
		return maxf(0.0, float(GameState.relationships.get("jaska", 0))) / 3.0
	return 0.0


## One row per ACTIVE anchor, in the information you have about it:
## {id, label, here, visited, heard, age (-1 = none), shown, truth}.
## Somewhere you know about first; then the freshest.
static func rows() -> Array:
	var now := GameState.block_index
	var seed := GameState.content_package_id if GameState.content_package_id != "" else "piritori"
	var c := clock()
	var out: Array = []
	var order := 0
	for anchor in ContentRegistry.anchors():
		if String(anchor.get("sliceState", "")) != "active":
			continue
		var id := String(anchor["id"])
		var visited := GameState.seen.has(id)
		var age := maxi(0, now - int(GameState.seen[id])) if visited else -1
		var truth := PiritoriMarket.offer(anchor, GOOD, c, seed,
			int(GameState.footprint.get(id, 0)), _rapport(id))
		var level := PiritoriMarket.decay(PiritoriMarket.INFO_QUOTE, age, true) \
			if visited else PiritoriMarket.INFO_NONE
		var shown := {"level": level} if level == PiritoriMarket.INFO_NONE \
			else PiritoriMarket.present(truth, PiritoriMarket.INFO_QUOTE, age, seed, id, GOOD, true)
		var from_toko := false
		if GameState.heard.has(id):
			var heard_age := maxi(0, now - int(GameState.heard[id]))
			var heard_level := PiritoriMarket.decay(PiritoriMarket.INFO_RANGE, heard_age, visited)
			if PiritoriMarket.LEVELS.find(heard_level) < PiritoriMarket.LEVELS.find(level):
				from_toko = true
				level = heard_level
				shown = PiritoriMarket.present(truth, PiritoriMarket.INFO_RANGE, heard_age,
					seed, id, GOOD, visited)
				age = heard_age
		out.append({
			"id": id,
			"label": String(anchor.get("label", id)),
			"here": GameState.current_anchor_id == id,
			"visited": visited,
			"heard": from_toko,
			"age": age,
			"shown": shown,
			"truth": truth,
			"order": order,
		})
		order += 1
	# Stable, like the web's sort: an unreadable row is a prompt to travel, not
	# the headline. `order` keeps equal rows where the map put them.
	out.sort_custom(func(a, b):
		var an := int(String(a["shown"]["level"]) == PiritoriMarket.INFO_NONE)
		var bn := int(String(b["shown"]["level"]) == PiritoriMarket.INFO_NONE)
		if an != bn:
			return an < bn
		var aa := int(a["age"]) if int(a["age"]) >= 0 else 99
		var ba := int(b["age"]) if int(b["age"]) >= 0 else 99
		if aa != ba:
			return aa < ba
		return int(a["order"]) < int(b["order"]))
	return out


static func row(anchor_id: String) -> Dictionary:
	for r in rows():
		if String(r["id"]) == anchor_id:
			return r
	return {}
