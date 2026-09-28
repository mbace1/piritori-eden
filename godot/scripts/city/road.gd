class_name PiritoriRoad
extends RefCounted
## The road — what happens on the way, and on arriving (web Act I v4.58,
## `web/js/v3/road.js`, the reference; VERSIONS.md v4.58 ### Port).
##
## Owner, 2026-09-27 (DESIGN_AUTHORITY answers 2, 4, 6, 9, 10): travel should
## feel natural; things happen in transit and on arriving; about every third or
## fourth journey; a surprise; each costs a bit of time; the first ones are
## low-end hustle and bigger contacts come later.
##
## The rules, one per line, the same as the web's:
##   - `content/road-events-v1.json` is the only place an event lives.
##   - Nothing fires before `first_story_block`. After that the third journey
##     since the last event fires on a coin flip and the fourth always does.
##   - The roll is `GameState.deterministic_roll` — FNV-1a over
##     contentId|block|label, bit for bit the web's — so a reload replays the
##     same road and it cannot be farmed.
##   - Seen once per campaign; the highest open tier first once it opens
##     (tier 1: anyone recruited, or story block 6).
##   - TIME: a choice costs minutes on the CURRENT block's clock. D002 is still
##     open, so minutes never turn a block; they read as zero in the next one.
##   - A choice with `requires` is shown and refused, never hidden.
##   - A fight is the ordinary battle with no mission behind it and no block
##     advance (the shell marks it a road fight).
##
## No clock, no DOM, no randomness of its own: everything reads and writes
## `GameState.road`, which is saved under the web's own key and shape.

const DEFAULT := {
	"journeys": 0, "since": 0, "seen": [], "pending": null,
	"minutes": 0, "minutesBlock": -1, "last": null,
}


## A saved road, made whole: JSON hands numbers back as floats, and a save
## from before v4.58 has no road at all.
static func normalised(v: Variant) -> Dictionary:
	var r: Dictionary = DEFAULT.duplicate(true)
	if typeof(v) != TYPE_DICTIONARY:
		return r
	var d: Dictionary = v
	for k in ["journeys", "since", "minutes", "minutesBlock"]:
		if d.has(k):
			r[k] = int(d[k])
	var seen: Array = []
	for id in d.get("seen", []):
		seen.append(String(id))
	r["seen"] = seen
	r["pending"] = _leg(d.get("pending", null))
	var last = _leg(d.get("last", null))
	if last != null:
		for k in ["choice"]:
			last[k] = String(d["last"].get(k, ""))
		last["minutes"] = int(d["last"].get("minutes", 0))
		var sb = d["last"].get("startBattle", null)
		last["startBattle"] = null if sb == null else String(sb)
	r["last"] = last
	return r


static func _leg(v: Variant) -> Variant:
	if typeof(v) != TYPE_DICTIONARY:
		return null
	var d: Dictionary = v
	var out := {"id": String(d.get("id", "")), "phase": String(d.get("phase", "transit"))}
	for k in ["from", "to"]:
		var x = d.get(k, null)
		out[k] = null if x == null else String(x)
	return out


## The live record, created on first use (web `road(state)`).
static func state() -> Dictionary:
	if GameState.road.is_empty():
		GameState.road = DEFAULT.duplicate(true)
	return GameState.road


static func rules() -> Dictionary:
	return ContentRegistry.road_rules()


## 1 once tier 1 is open: anyone recruited, or the story far enough on.
static func tier_open() -> int:
	var when := String(rules().get("tier_1_when", ""))
	var rx := RegEx.new()
	rx.compile("recruited>=(\\d+)")
	var m := rx.search(when)
	if m != null and GameState.roster.size() >= int(m.get_string(1)):
		return 1
	rx.compile("schedule_index>=(\\d+)")
	m = rx.search(when)
	if m != null and GameState.block_index >= int(m.get_string(1)):
		return 1
	return 0


## Minutes spent in the CURRENT block (0 once the block has turned).
static func minutes_this_block() -> int:
	var r := GameState.road
	if r.is_empty():
		return 0
	return int(r.get("minutes", 0)) if int(r.get("minutesBlock", -1)) == GameState.block_index else 0


## The block's clock, "HH:MM", or "" while no time has been spent in it.
static func clock_label() -> String:
	var spent := minutes_this_block()
	if spent <= 0 or GameState.is_slice_complete():
		return ""
	var starts: Dictionary = rules().get("block_start_minutes", {})
	var t := (int(starts.get(GameState.current_block(), 0)) + spent) % (24 * 60)
	return "%02d:%02d" % [t / 60, t % 60]


static func pending() -> Dictionary:
	var p = GameState.road.get("pending", null)
	if p == null:
		return {}
	return p


## The event waiting for an answer, or {}.
static func pending_event() -> Dictionary:
	var id := String(pending().get("id", ""))
	if id == "":
		return {}
	return ContentRegistry.road_event(id)


static func last() -> Dictionary:
	var l = GameState.road.get("last", null)
	return {} if l == null else l


## Candidates in AUTHORED order: unseen, open tier, requirements met.
static func _candidates(phase: String) -> Array:
	var r := state()
	var tier := tier_open()
	var out: Array = []
	for e in ContentRegistry.road_events():
		# An event with a `trigger` belongs to the story; the road never rolls it (web v4.63).
		if e.has("trigger"):
			continue
		if (r["seen"] as Array).has(String(e["id"])) or int(e.get("tier", 0)) > tier:
			continue
		var ph := String(e.get("phase", "any"))
		if ph != phase and ph != "any":
			continue
		if not GameState.meets_all(e.get("requires", [])):
			continue
		out.append(e)
	return out


## Called once after a journey really happened (`commit_journey` ok). Returns
## the event that fired, or {}. Mutates `GameState.road` only.
static func roll(journey: Dictionary) -> Dictionary:
	var r := state()
	if r.get("pending", null) != null:
		return {}   # one at a time; nothing stacks
	var ru := rules()
	r["journeys"] = int(r["journeys"]) + 1
	if GameState.block_index < int(ru.get("first_story_block", 999)):
		return {}
	r["since"] = int(r["since"]) + 1
	if int(r["since"]) < int(ru.get("earliest_journey_gap", 3)):
		return {}
	var n := int(r["journeys"])
	var fires: bool = int(r["since"]) >= int(ru.get("guaranteed_by_gap", 4)) \
		or GameState.deterministic_roll("road:%d:fire" % n) < float(ru.get("chance_at_earliest", 0.5))
	if not fires:
		return {}
	var first := "transit" if GameState.deterministic_roll("road:%d:phase" % n) < 0.5 else "arrival"
	var second := "arrival" if first == "transit" else "transit"
	var pool := _candidates(first)
	var phase := first
	if pool.is_empty():
		pool = _candidates(second)
		phase = second
	if pool.is_empty():
		return {}   # the road has told everything it knows
	# Higher tiers first once they open: the story moves up, not sideways.
	var top := -1
	for e in pool:
		top = maxi(top, int(e.get("tier", 0)))
	var tier_pool := pool.filter(func(e): return int(e.get("tier", 0)) == top)
	var pick: Dictionary = tier_pool[int(floor(GameState.deterministic_roll("road:%d:pick" % n) * tier_pool.size()))]
	r["since"] = 0
	var path: Array = Array(journey.get("path", []))
	r["pending"] = {
		"id": String(pick["id"]),
		"phase": phase if String(pick.get("phase", "any")) == "any" else String(pick["phase"]),
		"from": String(path[0]) if not path.is_empty() else null,
		"to": String(journey.get("destination", GameState.current_anchor_id)),
	}
	GameState.state_changed.emit()
	return pick


## Whether a choice can be taken, and every requirement that stops it.
static func choice_status(choice: Dictionary) -> Dictionary:
	var failed: Array = []
	for req in choice.get("requires", []):
		var st := GameState.requirement_status(String(req))
		if not bool(st.get("ok", false)):
			failed.append(st)
	return {"ok": failed.is_empty(), "failed": failed}


## Answer the pending event with one of its choices. Applies the ordinary
## effect grammar, adds the minutes to this block's clock only, and never turns
## the block. {ok, reason, event, choice, start_battle}
static func resolve(choice_id: String) -> Dictionary:
	var r := state()
	var event := pending_event()
	if event.is_empty():
		return {"ok": false, "reason": "no-event"}
	var choice: Dictionary = {}
	for c in event.get("choices", []):
		if String(c.get("id", "")) == choice_id:
			choice = c
	if choice.is_empty():
		return {"ok": false, "reason": "unknown-choice"}
	if not bool(choice_status(choice)["ok"]):
		return {"ok": false, "reason": "refused"}
	var leg: Dictionary = r["pending"]
	# The pending event is closed BEFORE the effects run: a road fight's
	# `start-battle` opens the battle at once, and the battle must find the
	# road answered, not still waiting behind it.
	r["pending"] = null
	var battle_id: Variant = null
	var effects: Array = []
	for fx in choice.get("effects", []):
		var f := String(fx)
		if f.begins_with("start-battle:"):
			battle_id = f.substr(13)
		else:
			effects.append(f)
	var minutes := int(choice.get("minutes", 0))
	if int(r["minutesBlock"]) != GameState.block_index:
		r["minutes"] = 0
		r["minutesBlock"] = GameState.block_index
	r["minutes"] = int(r["minutes"]) + minutes
	(r["seen"] as Array).append(String(event["id"]))
	r["last"] = {"id": String(event["id"]), "choice": choice_id, "minutes": minutes,
		"startBattle": battle_id, "phase": leg.get("phase", "transit"),
		"from": leg.get("from", null), "to": leg.get("to", null)}
	GameState.apply_effects(effects)
	GameState.decision_recorded.emit("road", String(event["id"]), choice_id)
	GameState.state_changed.emit()
	return {"ok": true, "event": event, "choice": choice,
		"start_battle": "" if battle_id == null else String(battle_id)}


## The answered event, kept until the player reads the outcome and walks on.
static func clear_last() -> void:
	if not GameState.road.is_empty():
		GameState.road["last"] = null
