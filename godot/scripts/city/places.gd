class_name PiritoriPlaces
extends RefCounted
## Fight places (web Act I v4.71, `web/js/v3/places.js`, the reference;
## VERSIONS.md v4.71 ### Port): a fight happens where it starts.
##
## The rules, one per line, the same as the web's:
##   - `content/places-v1.json` is the only place a fight place lives: one per
##     active anchor — the plate it is fought on (or none: a bare stage that
##     names the plate it wants), the cover markers, the way out, and the 3D
##     kit Night Shift would stage there (CAMPAIGN.md P4).
##   - A door fight is fought at the door's anchor. A road fight is fought
##     where the event happens: arriving, the place arrived at; in transit,
##     the place just left — the first of the two that has a place.
##   - The door or the event names WHO (`by`). The people are generated, from
##     the fight's own key, and no first name is on the board twice: not two
##     rivals, and not a rival and one of your own.
##   - The SHAPE stays the battle the door names: format, roles, weapons,
##     negotiation, casualties. Only the place and the people move.
##   - Mission battles are authored where they are and are never restaged.
##
## The names come from this build's own generator (`CrewGenerator`), as every
## generated name in the port does, so they are not the web's names; the
## place, the side and the shape are the same.


static func rules() -> Dictionary:
	return ContentRegistry.place_rules()


static func place_at(anchor: String) -> Dictionary:
	return ContentRegistry.place(anchor)


## Where a road fight happens, from the resolved event (`GameState.road.last`).
static func road_fight_anchor(last) -> String:
	if typeof(last) != TYPE_DICTIONARY:
		return ""
	var order: Array = []
	var ends := ["from", "to"] if String(last.get("phase", "")) == "transit" else ["to", "from"]
	for k in ends:
		var v = last.get(k, null)
		if v != null and String(v) != "":
			order.append(String(v))
	for a in order:
		if not place_at(a).is_empty():
			return a
	return String(order[0]) if not order.is_empty() else ""


## A door encounter's fight: at the door, by the side its template names.
static func door_fight_stage(encounter: Dictionary, template: Dictionary) -> Dictionary:
	if not encounter.has("door"):
		return {}
	var fight = template.get("fight", {})
	var by := String(fight.get("by", "")) if typeof(fight) == TYPE_DICTIONARY else ""
	return {"anchor": String(encounter.get("anchor_override_id", "")), "by": by,
		"key": String(encounter.get("id", ""))}


## A road event's fight: where it happened. The key carries the block, so a
## repeatable event (a family's retaliation) is new people every time.
static func road_fight_stage(last, event: Dictionary, schedule_index: int) -> Dictionary:
	if event.is_empty():
		return {}
	return {"anchor": road_fight_anchor(last), "by": String(event.get("by", "")),
		"key": "%s-%d" % [String(event.get("id", "")), schedule_index]}


static func _first_name(n: String) -> String:
	return n.split(" ")[0] if n != "" else ""


## Generated people for one fight: deterministic from the key, no first name twice.
static func _rivals(count: int, by: String, key: String, avoid: Array) -> Array:
	var taken := {}
	for n in avoid:
		taken[_first_name(String(n))] = true
	var side := by if by != "" else "street"
	var names: Array = []
	for i in range(1, count + 1):
		var name := CrewGenerator.name_for_id("%s:%s:%d" % [side, key, i])
		var roll := 1
		while taken.has(_first_name(name)) and roll < 12:
			name = CrewGenerator.name_for_id("%s:%s:%d:%d" % [side, key, i, roll])
			roll += 1
		taken[_first_name(name)] = true
		names.append(name)
	return names


## The battle `definition`, moved to `stage.anchor` and fought by `stage.by`'s
## people. Returns the definition unchanged when there is no place for the
## anchor, so a fight is never lost for want of a stage. `avoid` is the names
## already on the board (your crew).
static func stage_fight(definition: Dictionary, stage: Dictionary, avoid: Array = []) -> Dictionary:
	var anchor := String(stage.get("anchor", ""))
	var place := place_at(anchor)
	if definition.is_empty() or place.is_empty():
		return definition
	var r := rules()
	var by := String(stage.get("by", ""))
	var key := String(stage.get("key", ""))
	var side := String(r.get("sides", {}).get(by, "them"))
	var plate = place.get("plate", null)
	var staged := definition.duplicate(true)
	staged["location_anchor_id"] = anchor
	staged["scene_asset_id"] = "" if plate == null else String(plate)
	staged["place"] = {
		"anchor": anchor,
		"name": String(place.get("name", "")),
		"way_out": String(place.get("way_out", "")),
		"kit": String(place.get("kit", "")),
		"by": by,
		"side": side,
		"bare": plate == null,
		"stand_in": bool(place.get("stand_in", false)),
	}
	staged["cover"] = (place.get("cover", []) as Array).duplicate(true)
	var shape: Array = definition.get("opponents", [])
	var names := _rivals(shape.size(), by, key, avoid)
	var opponents: Array = []
	for i in shape.size():
		var o: Dictionary = (shape[i] as Dictionary).duplicate(true)
		o["id"] = "opp-%s-%d" % [key, i + 1]
		o["name"] = names[i]
		o["intent"] = String(r.get("intents", {}).get(String(o.get("role", "")), o.get("intent", "")))
		o["side"] = by
		opponents.append(o)
	staged["opponents"] = opponents
	staged["objective"] = "%s. Make %s back off, or leave %s." % [
		String(place.get("name", "")), side, String(place.get("way_out", ""))]
	var withdrawal: Dictionary = (definition.get("withdrawal", {}) as Dictionary).duplicate(true)
	withdrawal["known_cost"] = String(r.get("withdrawal_cost", withdrawal.get("known_cost", "")))
	staged["withdrawal"] = withdrawal
	return staged
