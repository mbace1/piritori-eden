class_name BattleBuilder
extends RefCounted
## Canonical battle record -> the salvaged FightManager's `battle_def`.
##
## This is the seam. content/era1-slice-v1.json describes a battle in the
## design's own vocabulary — cells like "front-2", intents, cover effects,
## a casualty table. The fight core wants lanes, rows and injected weapon data.
## Adapting HERE keeps canon unrewritten (handoff §3); the starter kit's mistake
## was re-schemaing canon to suit its code.
##
## GAME_DESIGN_DOCUMENT §13.3: three depth rows (front/middle/back) crossed by
## three lanes, mirrored per side, "the grid is a rule beneath the scene rather
## than a permanent checkerboard".

const ROWS := ["front", "middle", "back"]

## Opponent records in the slice carry role, intent and equipment but no combat
## values, so the port supplies them by role. Canon leaves these open
## (§13.8 "PROPOSED minimal set"); they live here, in one table, on purpose.
const ROLE_PROFILE := {
	"muscle": {"condition": 8, "nerve": 6, "tempo": 4, "nerve_bias": 0.7, "surrender": 0.25},
	"runner": {"condition": 5, "nerve": 5, "tempo": 8, "nerve_bias": 0.4, "surrender": 0.45},
	"watcher": {"condition": 5, "nerve": 5, "tempo": 6, "nerve_bias": 0.4, "surrender": 0.5},
	"fixer": {"condition": 6, "nerve": 7, "tempo": 5, "nerve_bias": 0.6, "surrender": 0.4},
	"local": {"condition": 6, "nerve": 5, "tempo": 5, "nerve_bias": 0.5, "surrender": 0.45},
}
const DEFAULT_PROFILE := {"condition": 6, "nerve": 6, "tempo": 5, "nerve_bias": 0.5, "surrender": 0.4}


## Parse a canonical cell id such as "front-2" into (lane, row), 0-based.
## Lanes are written 1..3 in the data and stored 0..2 here.
static func parse_cell(cell: String) -> Vector2i:
	var parts := cell.split("-")
	if parts.size() != 2:
		push_error("BattleBuilder: malformed cell '%s'" % cell)
		return Vector2i(1, 0)
	var row := ROWS.find(parts[0])
	if row < 0:
		push_error("BattleBuilder: unknown row in cell '%s'" % cell)
		row = 0
	var lane := int(parts[1]) - 1
	return Vector2i(clampi(lane, 0, 2), row)


static func cell_name(lane: int, row: int) -> String:
	return "%s-%d" % [ROWS[clampi(row, 0, 2)], clampi(lane, 0, 2) + 1]


## Build the definition the FightManager consumes.
##
## `crew_ids` are canonical crew ids to deploy; the battle's `player_deployed`
## caps how many take the field.
static func build(battle_id: String, crew_ids: Array, seed_value: int = 0) -> Dictionary:
	var battle := ContentRegistry.battle(battle_id)
	if battle.is_empty():
		return {}

	var deployed := int(battle.get("player_deployed", 2))
	var player_units: Array = []
	var used_cells: Dictionary = {}

	# Deploy the crew back-to-front: a runner should not be the wall.
	var order := crew_ids.slice(0, deployed)
	for i in order.size():
		var crew := ContentRegistry.crew_member(String(order[i]))
		if crew.is_empty():
			continue
		var slot := _default_player_slot(i, order.size())
		used_cells[slot] = true
		player_units.append(_crew_to_unit(crew, slot))

	var opposition_units: Array = []
	for opp in battle.get("opponents", []):
		opposition_units.append(_opponent_to_unit(opp))

	return {
		"battle_id": battle_id,
		"stage_id": String(battle.get("scene_asset_id", "")),
		"stand_down_available": bool(battle.get("negotiation", {}).get("available", false)) \
			and _negotiation_unlocked(battle),
		"withdrawal_cost": {
			"from_round": int(battle.get("withdrawal", {}).get("available_from_round", 1)),
			"known_cost": String(battle.get("withdrawal", {}).get("known_cost", "")),
		},
		"player_units": player_units,
		"opposition_units": opposition_units,
		"cover_props": _cover_props(battle),
		"objective": String(battle.get("objective", "")),
		"death_eligible": String(battle.get("casualty_table", {}).get("death", "")) != "not-eligible-in-this-battle",
		"seed": seed_value,
	}


## §13.10: "Killing every opponent should rarely be the optimal requirement."
## The negotiation gate is authored as requires_any; honour it exactly.
static func _negotiation_unlocked(battle: Dictionary) -> bool:
	var reqs: Array = battle.get("negotiation", {}).get("requires_any", [])
	if reqs.is_empty():
		return true
	for req in reqs:
		var r := String(req)
		if r.begins_with("flag:"):
			if GameState.flags.get(r.substr(5), false):
				return true
		elif r.begins_with("crew-role:"):
			var want := r.substr(10)
			for c in ContentRegistry.slice.get("crew", []):
				if String(c.get("role", "")) == want \
						and GameState.is_revealed(String(c.get("recruit_encounter_id", ""))):
					return true
	return false


## Player deployment: front rank first, then middle, centre lane outward.
static func _default_player_slot(index: int, total: int) -> Vector2i:
	if total <= 2:
		return [Vector2i(1, 0), Vector2i(1, 1)][index % 2]
	return [Vector2i(1, 0), Vector2i(0, 1), Vector2i(2, 1)][index % 3]


static func _crew_to_unit(crew: Dictionary, slot: Vector2i) -> Dictionary:
	var weapon := _best_unlocked_weapon(crew)
	return {
		"fighter_id": String(crew.get("id", "")),
		"character_id": String(crew.get("id", "")),
		"display_name": String(crew.get("name", "")),
		"portrait_id": String(crew.get("portrait_asset_id", "")),
		"actor_visual_id": String(crew.get("torso_asset_id", "")),
		"slot_lane": slot.x,
		"slot_row": slot.y,
		"condition": int(crew.get("condition", 6)),
		"condition_max": int(crew.get("condition", 6)),
		"nerve": int(crew.get("nerve", 6)),
		"nerve_max": int(crew.get("nerve", 6)),
		"tempo": int(crew.get("tempo", 5)),
		"weapon_ids": [weapon],
		"held_weapon_id": weapon,
		"item_ids": crew.get("initial_equipment", []).filter(
			func(e): return String(e) == "feature-phone"),
		"behaviour_package": String(crew.get("role", "")),
		"role": String(crew.get("role", "")),
		"persistent_injuries": [],
	}


## Only equipment the run has actually unlocked may be carried into a fight.
static func _best_unlocked_weapon(crew: Dictionary) -> String:
	var best := "unarmed"
	var best_harm := -1
	var all := EquipmentRules.weapons()
	for eid in crew.get("initial_equipment", []):
		var id := String(eid)
		if not all.has(id) or String(all[id].get("kind", "")) != "weapon":
			continue
		if not EquipmentRules.is_unlocked(id):
			continue
		var harm := int(all[id].get("harm_max", 0))
		if harm > best_harm:
			best_harm = harm
			best = id
	return best


static func _opponent_to_unit(opp: Dictionary) -> Dictionary:
	var role := String(opp.get("role", ""))
	var prof: Dictionary = ROLE_PROFILE.get(role, DEFAULT_PROFILE)
	var slot := parse_cell(String(opp.get("cell", "front-2")))
	var weapon := String(opp.get("equipment", ""))
	var all := EquipmentRules.weapons()
	if not all.has(weapon) or String(all[weapon].get("kind", "")) != "weapon":
		weapon = "unarmed"

	return {
		"fighter_id": String(opp.get("id", "")),
		"character_id": String(opp.get("id", "")),
		"display_name": String(opp.get("name", "")),
		"slot_lane": slot.x,
		"slot_row": slot.y,
		"condition": prof["condition"],
		"condition_max": prof["condition"],
		"nerve": prof["nerve"],
		"nerve_max": prof["nerve"],
		"tempo": prof["tempo"],
		"weapon_ids": [weapon],
		"held_weapon_id": weapon,
		"behaviour_package": String(opp.get("intent", "")),
		"role": String(opp.get("role", "")),
		"nerve_bias": prof["nerve_bias"],
		"surrender_threshold": prof["surrender"],
	}


## Cover is built into the LOCATION (§13.3), and the two half-boards are mirrors
## of one place, so a bench in the middle lane exists for both sides. Recorded
## as an interpretation: the slice names cells without naming a side.
static func _cover_props(battle: Dictionary) -> Array:
	var out: Array = []
	for prop in battle.get("cover", []):
		var effect := String(prop.get("effect", ""))
		# "hard" would stop even a firearm; nothing in the slice asks for that
		# yet, so every authored effect is soft cover until one does.
		var cover_class := "soft"
		for cell in prop.get("cells", []):
			var lr := parse_cell(String(cell))
			for side in [0, 1]:
				out.append({
					"prop_id": String(prop.get("id", "")),
					"lane": lr.x,
					"row": lr.y,
					"side": side,
					"cover_class": cover_class,
					"effect": effect,
				})
	return out


## Intent lines for the top strip (§13.4 step 1: opponent intent is telegraphed).
static func opponent_intents(battle_id: String) -> Array:
	var battle := ContentRegistry.battle(battle_id)
	var out: Array = []
	for opp in battle.get("opponents", []):
		out.append({
			"id": String(opp.get("id", "")),
			"name": String(opp.get("name", "")),
			"intent": String(opp.get("intent", "")).replace("-", " "),
			"cell": String(opp.get("cell", "")),
		})
	return out
