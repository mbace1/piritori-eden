class_name PiritoriDoors
extends RefCounted
## Doors (H2 of The Long Game; web Act I v4.65, `web/js/v3/doors.js`, the
## reference; VERSIONS.md v4.65 ### Port).
##
## A door is an offer on the map for a block the spine leaves free
## (`schedule[i].door`). The rules, one per line, the same as the web's:
##   - `content/doors-v1.json` is the only place a door lives: templates, not
##     scenes. A template names who offers it, where, the risk, a briefing
##     and its choices, in the ordinary effect grammar.
##   - A door block offers 2-3 doors, rolled once from the save and kept in
##     `GameState.doors.offers[i]`, so a reload shows the same offers.
##   - The roll is `GameState.deterministic_roll` under the web's own labels
##     (`door:count`, `door:fight`, `door:pick:<i>`, `door:anchor:<i>`) and in
##     the web's order, so a web save and a Godot save offer the same doors.
##   - Answer 23: fights every day, at most two. While fewer than two fights
##     have happened today, a door block offers at least one door that can
##     become a fight. A fight choice carries `fights-today<2` and a crew.
##   - One of each kind before a second of any.
##   - A door is taken once per chapter. Taking one costs the block, as an
##     encounter does: the door becomes the block's encounter at its anchor.
##   - A LATE door opens only at night and closes when the block clock passes
##     22:00 (road minutes).
##   - H5 (v4.67): a family's doors close while it is Wary or worse, and come
##     first while it is Friendly (`PiritoriStanding`). The favoured pick rolls
##     `door:favoured` only when a favoured door exists, so with both families
##     neutral the board rolls exactly as v4.65's did.
##   - Answer 25: a bad deal ESCALATES. A choice with `escalates` rolls once
##     (`escalate:<door>:<choice>`); on a bad roll the door's fight starts if
##     a crew is there to fight it, and if not the door's `fight.lose` is
##     paid. Never past two fights a day.
##
## No clock and no randomness of its own: everything reads and writes
## `GameState.doors`, saved under the web's key and shape. Schedule indexes
## are the dictionary keys, as strings, because that is what they are once a
## save has been through JSON on either side.


static func rules() -> Dictionary:
	return ContentRegistry.door_rules()


static func templates() -> Array:
	return ContentRegistry.door_templates()


static func _slot(index: int = -1) -> Dictionary:
	var i := GameState.block_index if index < 0 else index
	var sched := ContentRegistry.schedule()
	if i < 0 or i >= sched.size():
		return {}
	return sched[i]


## Is this block one the spine leaves free?
static func is_door_block(index: int = -1) -> bool:
	return bool(_slot(index).get("door", false))


static func can_fight(t: Dictionary) -> bool:
	return typeof(t.get("fight", null)) == TYPE_DICTIONARY and not (t["fight"] as Dictionary).is_empty()


static func encounter_id_of(index: int, template_id: String) -> String:
	return "door-%d-%s" % [index, template_id]


static func template_of(id: String) -> Dictionary:
	for t in templates():
		if String(t.get("id", "")) == id:
			return t
	return {}


## The live record, made whole.
static func state() -> Dictionary:
	if GameState.doors.is_empty():
		GameState.doors = {"offers": {}, "taken": {}}
	if not GameState.doors.has("offers"):
		GameState.doors["offers"] = {}
	if not GameState.doors.has("taken"):
		GameState.doors["taken"] = {}
	return GameState.doors


static func taken_at(index: int = -1) -> Dictionary:
	var i := GameState.block_index if index < 0 else index
	var t = state()["taken"].get(str(i), null)
	return t if typeof(t) == TYPE_DICTIONARY else {}


static func _taken_ids() -> Array:
	var out: Array = []
	for k in state()["taken"]:
		out.append(String(state()["taken"][k].get("template", "")))
	return out


static func _eligible(slot: Dictionary) -> Array:
	var taken := _taken_ids()
	var out: Array = []
	for t in templates():
		if taken.has(String(t.get("id", ""))):
			continue
		if not PiritoriStanding.door_allowed(t):
			continue
		if bool(t.get("late", false)) and String(slot.get("block", "")) != "night":
			continue
		if not GameState.meets_all(t.get("requires", [])):
			continue
		out.append(t)
	return out


## The offers for the current door block: rolled the first time and kept.
## [] off a door block. Each offer is {template, anchor}.
static func offer_doors() -> Array:
	var slot := _slot()
	if not bool(slot.get("door", false)):
		return []
	var key := str(GameState.block_index)
	var kept = state()["offers"].get(key, null)
	if typeof(kept) == TYPE_ARRAY:
		return kept
	var r := rules()
	var pool := _eligible(slot)
	var lo := int(r.get("offers_min", 2))
	var hi := int(r.get("offers_max", 3))
	var count := mini(pool.size(), lo + int(floor(_roll("count") * float(hi - lo + 1))))
	var picked: Array = []
	if bool(r.get("fight_door_each_block", false)) \
			and GameState.fights_today() < int(r.get("fights_per_day_max", 2)):
		_pick(picked, pool.filter(func(t): return can_fight(t)), "fight")
	# H5: a Friendly family's work comes first.
	var favoured := pool.filter(func(t): return PiritoriStanding.door_favoured(t))
	if not favoured.is_empty() and picked.size() < count:
		_pick(picked, favoured, "favoured")
	# One of each kind before a second of any: a board of three sales is a
	# menu, not a choice.
	var i := 0
	while picked.size() < count and i < 12:
		var kinds := picked.map(func(t): return String(t.get("kind", "")))
		var fresh := pool.filter(func(t): return not kinds.has(String(t.get("kind", ""))))
		_pick(picked, fresh if not fresh.is_empty() else pool, "pick:%d" % i)
		i += 1
	var offers: Array = []
	for n in picked.size():
		var t: Dictionary = picked[n]
		var anchors: Array = t.get("anchors", [])
		offers.append({"template": String(t.get("id", "")),
			"anchor": String(anchors[int(floor(_roll("anchor:%d" % n) * float(anchors.size())))])})
	state()["offers"][key] = offers
	return offers


static func _roll(label: String) -> float:
	return GameState.deterministic_roll("door:" + label)


static func _pick(picked: Array, from: Array, label: String) -> void:
	var rest := from.filter(func(t): return not picked.has(t))
	if rest.is_empty():
		return
	picked.append(rest[int(floor(_roll(label) * float(rest.size())))])


## Why a door cannot be taken now, or "".
static func door_blocker(offer: Dictionary) -> String:
	var slot := _slot()
	if not bool(slot.get("door", false)):
		return "not-a-door-block"
	if not taken_at().is_empty():
		return "already-taken"
	var t := template_of(String(offer.get("template", "")))
	if t.is_empty():
		return "unknown-door"
	var start := int(ContentRegistry.road_rules().get("block_start_minutes", {}).get(String(slot.get("block", "")), 0))
	if bool(t.get("late", false)) and start + PiritoriRoad.minutes_this_block() > int(rules().get("late_closes_at_minutes", 1320)):
		return "closed"
	return ""


## The door as an encounter the ordinary location screen can play.
static func door_encounter(index: int, template_id: String, anchor: String) -> Dictionary:
	var t := template_of(template_id)
	if t.is_empty():
		return {}
	return {
		"id": encounter_id_of(index, String(t["id"])),
		"door": String(t["id"]),
		"door_index": index,
		"kind": String(t.get("kind", "")),
		"from": String(t.get("from", "")),
		"title": String(t.get("title", "")),
		"anchor_override_id": anchor,
		"site_id": "",
		"participants": ["aatami"],
		"source_status": "fiction",
		"scene_asset_id": String(rules().get("scenes", {}).get(anchor, "")),
		"opening": String(t.get("premise", "")),
		"inspectables": t.get("inspectables", []),
		"choices": t.get("choices", []),
	}


## Put every taken door back in front of the registry (after a load).
static func register_taken() -> void:
	ContentRegistry.forget_door_encounters()
	for k in state()["taken"]:
		var taken: Dictionary = state()["taken"][k]
		var enc := door_encounter(int(k), String(taken.get("template", "")), String(taken.get("anchor", "")))
		if not enc.is_empty():
			ContentRegistry.register_door_encounter(enc)


## Take one of this block's doors: it becomes the block's encounter.
## {ok, reason, encounter, offer}
static func take_door(template_id: String) -> Dictionary:
	var offer: Dictionary = {}
	for o in state()["offers"].get(str(GameState.block_index), []):
		if String(o.get("template", "")) == template_id:
			offer = o
	if offer.is_empty():
		return {"ok": false, "reason": "not-offered"}
	var reason := door_blocker(offer)
	if reason != "":
		return {"ok": false, "reason": reason}
	var enc := door_encounter(GameState.block_index, template_id, String(offer["anchor"]))
	ContentRegistry.register_door_encounter(enc)
	state()["taken"][str(GameState.block_index)] = {"template": template_id,
		"anchor": String(offer["anchor"]), "encounterId": String(enc["id"])}
	GameState.revealed[String(enc["id"])] = true
	GameState.decision_recorded.emit("door", template_id, String(offer["anchor"]))
	GameState.state_changed.emit()
	return {"ok": true, "reason": "", "encounter": enc, "offer": offer}


## A door fight's result, in the ordinary effect grammar: the door's own
## stakes, never a mission's.
static func door_fight_effects(template_id: String, result: String) -> Array:
	var t := template_of(template_id)
	if not can_fight(t):
		return []
	return t["fight"].get("win", []) if result == "win" else t["fight"].get("lose", [])


## Anchors with a door open on this block: pinned on the map.
static func open_door_anchors() -> PackedStringArray:
	var out := PackedStringArray()
	if not is_door_block() or not taken_at().is_empty():
		return out
	for o in offer_doors():
		var a := String(o.get("anchor", ""))
		if not out.has(a):
			out.append(a)
	return out


## Answer 25: did this choice's bad deal escalate? Asked once, right after the
## choice resolved and before the block turns (the roll reads the door's own
## block). {} when it held or cannot escalate, {battle} when a fight starts,
## {effects} when it went bad without enough who can fight: the door's
## losing stakes (web `escalation`).
static func escalation(template_id: String, choice_id: String) -> Dictionary:
	var t := template_of(template_id)
	if not can_fight(t):
		return {}
	var choice: Dictionary = {}
	for c in t.get("choices", []):
		if String(c.get("id", "")) == choice_id:
			choice = c
	var chance := float(choice.get("escalates", 0.0)) if choice.get("escalates", null) != null else 0.0
	if chance <= 0.0:
		return {}
	if GameState.fights_today() >= int(rules().get("fights_per_day_max", 2)):
		return {}
	if GameState.deterministic_roll("escalate:%s:%s" % [template_id, choice_id]) >= chance:
		return {}
	var battle := String(t["fight"].get("battle", ""))
	var need := int(ContentRegistry.battle(battle).get("player_deployed", 2))
	# Answer 24 (v4.66): who can fight, so Aatami counts while he still does.
	if GameState.fighters().size() >= need:
		return {"battle": battle}
	return {"effects": t["fight"].get("lose", [])}
