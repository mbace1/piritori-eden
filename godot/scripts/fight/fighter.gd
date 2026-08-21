## fighter.gd
## Runtime state of a single combatant during a battle.
## Instantiated and owned by FightManager; never references scene nodes.
## Design authority: FIGHT_SYSTEM_OVERVIEW.md §6 (tracks/states) and §8 (NPC packages).
class_name Fighter
extends RefCounted

# ================================================================== #
# Enums
# ================================================================== #

enum Status {
	AVAILABLE,  ## Ready to act
	SHAKEN,     ## Nerve below 25 % — acts last, may break
	ROUTED,     ## Nerve reached zero — leaves formation without physical harm
	DOWNED,     ## Condition reached zero — incapacitated, not automatically dead
	WOUNDED,    ## Carries a persistent injury but remains active
	CRITICAL,   ## One more condition hit away from downed
	MISSING,    ## Lost during aftermath (withdrawal, abandonment)
	DEAD,       ## Requires lethal condition + follow-through; set in Aftermath only
}

enum Side { PLAYER, OPPOSITION }

# ================================================================== #
# Identity
# ================================================================== #
var fighter_id: String = ""       ## Stable unique ID within this battle
var character_id: String = ""     ## Links back to campaign character/NPC data
var display_name: String = ""
var portrait_id: String = ""
var actor_visual_id: String = ""
var side: Fighter.Side = Fighter.Side.PLAYER
var is_player_controlled: bool = true

# ================================================================== #
# Formation position — (lane 0-2, row 0-2); row 0 = front
# ================================================================== #
var slot: Vector2i = Vector2i(1, 0)

# ================================================================== #
# Tracks — all integers; clamped by FightManager, never mutate directly
# ================================================================== #
var condition: int = 6
var condition_max: int = 6
var guard: int = 0        ## Consumed before condition takes harm; decays each round
var nerve: int = 6
var nerve_max: int = 6
var tempo: int = 1        ## Resolution order; higher acts first

# ================================================================== #
# Per-round flags (reset by FightManager at round start)
# ================================================================== #
var acted_this_round: bool = false

# ================================================================== #
# Status
# ================================================================== #
var status: Status = Status.AVAILABLE

# ================================================================== #
# Equipment (stable IDs; resolved through registries, not stored here)
# ================================================================== #
var weapon_ids: Array[String] = []
var item_ids: Array[String] = []
var held_weapon_id: String = ""   ## Currently active weapon

# ================================================================== #
# AI fields (opposition only)
# ================================================================== #
var behaviour_package: String = ""
var nerve_bias: float = 0.5
var loyalty: float = 0.5
var surrender_threshold: float = 0.3
var prohibited_commands: Array[String] = []

# ================================================================== #
# Persistent / aftermath data
# ================================================================== #
var persistent_injuries: Array[String] = []
var relationships: Dictionary = {}

# ================================================================== #
# Factory methods
# ================================================================== #

## Create a player-side fighter from a campaign character snapshot.
## Called by FightManager when initialising the player crew.
static func make_player(
		id: String,
		char_id: String,
		name: String,
		portrait: String,
		visual: String,
		condition_max_val: int,
		nerve_max_val: int,
		tempo_val: int,
		lane: int,
		row: int,
		weapons: Array[String],
		items: Array[String],
		injuries: Array[String] = []
) -> Fighter:
	var f := Fighter.new()
	f.fighter_id       = id
	f.character_id     = char_id
	f.display_name     = name
	f.portrait_id      = portrait
	f.actor_visual_id  = visual
	f.side             = Fighter.Side.PLAYER
	f.is_player_controlled = true
	f.condition        = condition_max_val
	f.condition_max    = condition_max_val
	f.nerve            = nerve_max_val
	f.nerve_max        = nerve_max_val
	f.tempo            = tempo_val
	f.slot             = Vector2i(lane, row)
	f.weapon_ids       = weapons.duplicate()
	f.held_weapon_id   = weapons[0] if weapons.size() > 0 else ""
	f.item_ids         = items.duplicate()
	f.persistent_injuries = injuries.duplicate()
	# Reduce starting condition by injury count (each injury = -1 condition)
	f.condition = clampi(f.condition - injuries.size(), 1, f.condition_max)
	return f

## NOTE: the kit this file came from also had from_enemy_data(EnemyData), a
## Resource-based constructor for hand-authored enemies. It is gone: opposition
## units are built from content/era1-slice-v1.json by BattleBuilder, so a second
## authoring path for the same thing would be a second source of truth.

func is_active() -> bool:
	return status in [Status.AVAILABLE, Status.SHAKEN, Status.WOUNDED, Status.CRITICAL]

## True if this fighter has not yet acted and is able to do so.
func can_act() -> bool:
	return is_active() and not acted_this_round

## Tempo used for resolution ordering.
## Shaken fighters act last within their tempo group.
func effective_tempo() -> int:
	return tempo - (100 if status == Status.SHAKEN else 0)

## Nerve as a 0.0–1.0 fraction.
func nerve_fraction() -> float:
	if nerve_max <= 0:
		return 0.0
	return float(nerve) / float(nerve_max)

## Condition as a 0.0–1.0 fraction.
func condition_fraction() -> float:
	if condition_max <= 0:
		return 0.0
	return float(condition) / float(condition_max)

# ================================================================== #
# Mutation helpers — called exclusively by FightManager
# ================================================================== #

## Increase guard (capped at condition_max to prevent runaway guard stacking).
func apply_guard(amount: int) -> void:
	guard = clampi(guard + amount, 0, condition_max)

## Apply incoming harm. Guard absorbs first; returns overflow that hit condition.
func receive_harm(amount: int) -> int:
	var absorbed := mini(guard, amount)
	guard -= absorbed
	var overflow := amount - absorbed
	condition = clampi(condition - overflow, 0, condition_max)
	return overflow

## Apply nerve damage (does not affect condition).
func receive_nerve_damage(amount: int) -> void:
	nerve = clampi(nerve - amount, 0, nerve_max)

## Tick guard decay at end of round (default: lose 1 guard per round).
func tick_guard(decay: int = 1) -> void:
	guard = clampi(guard - decay, 0, condition_max)

## Restore some nerve (used by authored items or events).
func restore_nerve(amount: int) -> void:
	nerve = clampi(nerve + amount, 0, nerve_max)

# ================================================================== #
# Serialisation
# ================================================================== #

func to_dict() -> Dictionary:
	return {
		"fighter_id":          fighter_id,
		"character_id":        character_id,
		"display_name":        display_name,
		"portrait_id":         portrait_id,
		"actor_visual_id":     actor_visual_id,
		"side":                int(side),
		"is_player_controlled": is_player_controlled,
		"slot_lane":           slot.x,
		"slot_row":            slot.y,
		"condition":           condition,
		"condition_max":       condition_max,
		"guard":               guard,
		"nerve":               nerve,
		"nerve_max":           nerve_max,
		"tempo":               tempo,
		"status":              int(status),
		"acted_this_round":    acted_this_round,
		"weapon_ids":          weapon_ids,
		"item_ids":            item_ids,
		"held_weapon_id":      held_weapon_id,
		"behaviour_package":   behaviour_package,
		"nerve_bias":          nerve_bias,
		"loyalty":             loyalty,
		"surrender_threshold": surrender_threshold,
		"prohibited_commands": prohibited_commands,
		"persistent_injuries": persistent_injuries,
		"relationships":       relationships,
	}

static func from_dict(d: Dictionary) -> Fighter:
	var f := Fighter.new()
	f.fighter_id          = d.get("fighter_id", "")
	f.character_id        = d.get("character_id", "")
	f.display_name        = d.get("display_name", "")
	f.portrait_id         = d.get("portrait_id", "")
	f.actor_visual_id     = d.get("actor_visual_id", "")
	f.side                = d.get("side", int(Fighter.Side.PLAYER)) as Fighter.Side
	f.is_player_controlled = d.get("is_player_controlled", false)
	f.slot                = Vector2i(d.get("slot_lane", 1), d.get("slot_row", 0))
	f.condition           = d.get("condition", 6)
	f.condition_max       = d.get("condition_max", 6)
	f.guard               = d.get("guard", 0)
	f.nerve               = d.get("nerve", 6)
	f.nerve_max           = d.get("nerve_max", 6)
	f.tempo               = d.get("tempo", 1)
	f.status              = d.get("status", int(Status.AVAILABLE)) as Status
	f.acted_this_round    = d.get("acted_this_round", false)
	f.weapon_ids          = Array(d.get("weapon_ids", []), TYPE_STRING, "", null)
	f.item_ids            = Array(d.get("item_ids", []), TYPE_STRING, "", null)
	f.held_weapon_id      = d.get("held_weapon_id", "")
	f.behaviour_package   = d.get("behaviour_package", "")
	f.nerve_bias          = d.get("nerve_bias", 0.5)
	f.loyalty             = d.get("loyalty", 0.5)
	f.surrender_threshold = d.get("surrender_threshold", 0.3)
	f.prohibited_commands = Array(d.get("prohibited_commands", []), TYPE_STRING, "", null)
	f.persistent_injuries = Array(d.get("persistent_injuries", []), TYPE_STRING, "", null)
	f.relationships       = d.get("relationships", {})
	return f
