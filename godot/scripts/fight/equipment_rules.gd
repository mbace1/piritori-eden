class_name EquipmentRules
extends RefCounted
## Canonical equipment -> the FightManager's injected weapon data.
##
## GODOT_HANDOFF.md §3: canon is imported, not rewritten. So the VOCABULARY here
## — which items exist, what each one reaches — comes from
## content/era1-slice-v1.json's `equipment` array and nothing else. The salvaged
## fight core shipped its own hardcoded weapon catalogue; that catalogue is not
## canon and is not used.
##
## What canon does NOT specify is numbers. GAME_DESIGN_DOCUMENT §13.8 marks the
## combat values as "PROPOSED minimal set", so the harm/nerve/guard tuning below
## is the port's, kept in one visible table rather than scattered. It is meant to
## be argued with.
##
## §13.5: "Weapons use a few readable target patterns rather than measured
## distance... Weapon choice therefore changes formation and target access, not
## only damage." So reach_pattern drives WHERE a unit can stand and WHAT it can
## see, not just how hard it hits.
##
## The slice also carries a presentation rule on the firearm: "Abstract category
## and target pattern only; no handling or evasion instruction." Nothing here
## describes handling, and nothing should.

const ROW_FRONT := 0
const ROW_MIDDLE := 1
const ROW_BACK := 2


## Translate a canonical `reach_pattern` into the manager's targeting fields.
##
##   allowed_rows — which rows the ATTACKER may act from
##   lane_spread  — how many lanes either side it can reach
##   piercing     — whether it continues past the first unit in a lane
static func reach(pattern: String) -> Dictionary:
	match pattern:
		"front-same-lane":
			# A blunt weapon at arm's length: you must be at the front, and you
			# reach the nearest body straight ahead.
			return {"allowed_rows": [ROW_FRONT], "lane_spread": 0, "piercing": false}
		"front-same-or-adjacent-lane":
			# A swung weapon covers the lane either side of it.
			return {"allowed_rows": [ROW_FRONT], "lane_spread": 1, "piercing": false}
		"clear-same-lane-through-front":
			# A firearm can be used from any row, but it still stops at the first
			# body and at cover. It is not a lane-clearing weapon; treating it as
			# piercing would make one pistol beat a whole formation.
			return {"allowed_rows": [ROW_FRONT, ROW_MIDDLE, ROW_BACK],
				"lane_spread": 0, "piercing": false}
		_:
			return {"allowed_rows": [ROW_FRONT], "lane_spread": 0, "piercing": false}


## Port tuning by `hold`, which is the slice's own grip vocabulary.
## Deliberately shallow: §13.8 asks the system to "avoid a dense RPG stat sheet".
const HOLD_TUNING := {
	"blunt-one":   {"harm_min": 1, "harm_max": 2, "nerve_min": 1, "nerve_max": 2},
	"bat-two":     {"harm_min": 2, "harm_max": 3, "nerve_min": 1, "nerve_max": 2},
	"firearm-one": {"harm_min": 2, "harm_max": 4, "nerve_min": 2, "nerve_max": 3},
	"utility-one": {"harm_min": 0, "harm_max": 0, "nerve_min": 0, "nerve_max": 1},
}

## Unarmed is not in the slice's equipment list, because it is not equipment.
const UNARMED := {
	"name": "Unarmed",
	"harm_min": 1, "harm_max": 1,
	"nerve_min": 0, "nerve_max": 1,
	"guard_amount": 2,
	"allowed_rows": [ROW_FRONT], "lane_spread": 0, "piercing": false,
	"tags": ["unarmed"], "lethal": false,
}


## Every weapon the slice defines, as manager-shaped data, keyed by canonical id.
static func weapons() -> Dictionary:
	var out: Dictionary = {"unarmed": UNARMED.duplicate(true)}

	for e in ContentRegistry.slice.get("equipment", []):
		var id := String(e.get("id", ""))
		if id == "":
			continue
		var hold := String(e.get("hold", ""))
		var tune: Dictionary = HOLD_TUNING.get(hold, HOLD_TUNING["blunt-one"])
		var r := reach(String(e.get("reach_pattern", "")))
		var is_weapon := String(e.get("kind", "")) == "weapon"

		out[id] = {
			"name": id.capitalize(),
			"kind": e.get("kind", "support"),
			"harm_min": tune["harm_min"] if is_weapon else 0,
			"harm_max": tune["harm_max"] if is_weapon else 0,
			"nerve_min": tune["nerve_min"],
			"nerve_max": tune["nerve_max"],
			"guard_amount": 3 if is_weapon else 2,
			"allowed_rows": r["allowed_rows"],
			"lane_spread": r["lane_spread"],
			"piercing": r["piercing"],
			"tags": [hold],
			# Firearms carry lethal exposure so it can be FORECAST before
			# commitment (handoff §5: "lethal risk must be forecast").
			"lethal": hold == "firearm-one",
			"unlock": e.get("unlock", ""),
			"reach_pattern": e.get("reach_pattern", ""),
		}
	return out


## Items the slice defines as support rather than weapons.
static func items() -> Dictionary:
	var out: Dictionary = {}
	for e in ContentRegistry.slice.get("equipment", []):
		if String(e.get("kind", "")) != "support":
			continue
		out[String(e.get("id", ""))] = {
			"effect_type": "signal",
			"magnitude": 1,
			"target": "ally",
			"single_use": false,
		}
	return out


## Is this equipment id available to the player yet? `unlock` names either
## "start" or the encounter that grants it.
static func is_unlocked(equipment_id: String) -> bool:
	for e in ContentRegistry.slice.get("equipment", []):
		if String(e.get("id", "")) != equipment_id:
			continue
		var unlock := String(e.get("unlock", ""))
		return unlock == "start" or GameState.is_resolved(unlock)
	return false
