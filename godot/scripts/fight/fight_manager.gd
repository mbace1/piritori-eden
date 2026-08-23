## fight_manager.gd
## Core fight state machine. Owns BattleState and implements CombatService.
## Pure logic: no scene nodes, no direct art references, no campaign writes.
## Design authority: FIGHT_SYSTEM_OVERVIEW.md §4 (round model), §5 (commands),
##   §6 (tracks), §7 (weapons), §8 (NPC AI), §10 (Godot architecture), §12 (gate).
class_name FightManager
extends RefCounted

# ================================================================== #
# Inner types
# ================================================================== #

## A command queued for one fighter during the COMMAND phase.
class Command:
	enum Type {
		ATTACK,
		GUARD,
		REPOSITION,
		ITEM,
		STAND_DOWN,
		AUTO,
		WITHDRAW,
	}
	var type: Type
	var source_id: String    ## fighter_id of the acting unit
	var target_id: String    ## fighter_id of target (ATTACK, STAND_DOWN)
	var target_slot: Vector2i ## destination slot (REPOSITION)
	var item_id: String       ## item to use (ITEM)

	func _init(t: Type, src: String) -> void:
		type = t
		source_id = src

	func to_dict() -> Dictionary:
		return {
			"type":        int(type),
			"source_id":   source_id,
			"target_id":   target_id,
			"target_slot": [target_slot.x, target_slot.y],
			"item_id":     item_id,
		}

## A resolved outcome emitted after each command executes.
## The BattleStage renderer queues these for animation; BattleHUD reads them
## to update status displays. FightManager never waits on animation.
class BattleEvent:
	enum Kind {
		ATTACK_HIT,
		ATTACK_BLOCKED,       ## Stopped by hard cover
		ATTACK_INTERCEPTED,   ## Soft-cover interception, no harm
		GUARD_SET,
		REPOSITIONED,
		ITEM_USED,
		NERVE_ZERO,           ## Fighter nerve reached zero
		CONDITION_ZERO,       ## Fighter condition reached zero
		UNIT_ROUTED,
		UNIT_DOWNED,
		UNIT_CRITICAL,
		MORALE_WITNESS,       ## Ally downed → nerve loss on witnesses
		STAND_DOWN_OFFERED,
		STAND_DOWN_ACCEPTED,
		STAND_DOWN_REFUSED,
		WITHDRAWAL_EXECUTED,
		AUTO_COMMAND_FILLED,
	}
	var kind: Kind
	var source_id: String  = ""
	var target_id: String  = ""
	var harm_absorbed: int = 0   ## Guard that absorbed harm
	var harm_dealt: int    = 0   ## Condition harm that landed
	var nerve_dealt: int   = 0
	var lethal_condition: bool = false  ## True only when weapon has lethal tag AND condition == 0
	var detail: String     = ""

	func to_dict() -> Dictionary:
		return {
			"kind":             int(kind),
			"source_id":        source_id,
			"target_id":        target_id,
			"harm_absorbed":    harm_absorbed,
			"harm_dealt":       harm_dealt,
			"nerve_dealt":      nerve_dealt,
			"lethal_condition": lethal_condition,
			"detail":           detail,
		}

## Telegraphed opposition intent shown to the player at round start.
class IntentRecord:
	var fighter_id: String     = ""
	var likely_type: Command.Type = Command.Type.ATTACK
	var target_lane: int       = -1   ## -1 = unknown (intel too low)
	var risk_band: String      = "medium"  ## "low" | "medium" | "high" | "lethal"
	var lethal_exposure: bool  = false

	func to_dict() -> Dictionary:
		return {
			"fighter_id":     fighter_id,
			"likely_type":    int(likely_type),
			"target_lane":    target_lane,
			"risk_band":      risk_band,
			"lethal_exposure": lethal_exposure,
		}

# ================================================================== #
# Enums
# ================================================================== #

enum Phase {
	SETUP,           ## Validating and loading battle definition
	INTENT,          ## Opposition intents telegraphed
	COMMAND,         ## Player queues commands for each available unit
	PLAYER_RESOLVE,  ## Player commands resolve in tempo order
	OPP_RESOLVE,     ## Opposition commands resolve
	MORALE_CHECK,    ## Guard decay, nerve rout, witness morale, end checks
	AFTERMATH,       ## Battle decided — emit result and wait for GameState
}

enum BattleResult {
	PENDING,
	VICTORY_ROUT,   ## All opposition broke without being physically destroyed
	VICTORY_BREAK,  ## All opposition downed
	STAND_DOWN,     ## Bloodless negotiated exit accepted
	WITHDRAWAL,     ## Player chose to leave at known cost
	PARTIAL,        ## Mixed outcome (authored)
	DEFEAT,         ## Player side broke or downed
}

# ================================================================== #
# Signals — BattleStage and BattleHUD subscribe to these
# ================================================================== #
signal phase_changed(new_phase: Phase)
signal round_started(round_number: int)
## Somebody heard. Carries the depth they came in at.
signal police_arrived_signal(entry_depth: int)
signal event_resolved(event: BattleEvent)
signal intent_updated(intents: Array)          ## Array[IntentRecord]
signal fighter_status_changed(
		fighter_id: String,
		old_status: Fighter.Status,
		new_status: Fighter.Status)
signal battle_ended(result: BattleResult)
## Simplified outcome signal for scene-level listeners (map, campaign).
## Emitted alongside battle_ended; winner_side is "player" or "enemy".
signal fight_ended(winner_side: String)
## Generic "something changed" signal; UI can subscribe once instead of many.
signal state_changed

# ================================================================== #
# Battle state — serialisable; no scene references
# ================================================================== #
var battle_id: String = ""
var stage_id: String  = ""
var round_number: int = 0
var phase: Phase = Phase.SETUP
var result: BattleResult = BattleResult.PENDING

## Formation grid.  Key: Vector3i(lane, row, side_int).  Value: fighter_id or "".
var _grid: Dictionary = {}

## Cover props.  Key: Vector3i(lane, row, side_int).
## Value: dict with keys "cover_class" ("hard"|"soft") and "prop_id".
var _cover: Dictionary = {}

## All fighters by fighter_id.
var _fighters: Dictionary = {}  # String → Fighter

## Commands the player has queued this round.
var _player_commands: Array = []  # Array[Command]

## Telegraphed opposition intentions for the current round.
var _opposition_intents: Array = []  # Array[IntentRecord]

## Stand-down and withdrawal authored terms.
var _stand_down_available: bool = true
var _withdrawal_cost: Dictionary = {}

## Deterministic RNG — same seed → same battle; saves replay of the whole log.
var _rng: RandomNumberGenerator = RandomNumberGenerator.new()
var _rng_seed: int = 0

## Append-only event log for deterministic replay.
var _event_log: Array = []  # Array[Dictionary]

# ================================================================== #
# Initialisation
# ================================================================== #

## Load a battle from a parsed BattleDefinition dictionary.
## Returns an Array of error strings; empty = success.
## All ID resolution failures are errors; no silent fallbacks (gate §11).
func initialise(battle_def: Dictionary, seed: int = 0) -> Array:
	var errors: Array[String] = []

	battle_id = battle_def.get("battle_id", "")
	stage_id  = battle_def.get("stage_id", "")

	if battle_id.is_empty():
		errors.append("battle_def missing battle_id")
	if stage_id.is_empty():
		errors.append("battle_def missing stage_id")

	_rng_seed = seed
	_rng.seed = seed
	_stand_down_available = battle_def.get("stand_down_available", true)
	_withdrawal_cost = battle_def.get("withdrawal_cost", {})

	# Load player crew
	for unit_dict in battle_def.get("player_units", []):
		var f := Fighter.from_dict(unit_dict)
		f.side = Fighter.Side.PLAYER
		f.is_player_controlled = true
		var errs := _register_fighter(f)
		errors.append_array(errs)

	# Load opposition
	for unit_dict in battle_def.get("opposition_units", []):
		var f := Fighter.from_dict(unit_dict)
		f.side = Fighter.Side.OPPOSITION
		f.is_player_controlled = false
		var errs := _register_fighter(f)
		errors.append_array(errs)

	# Load cover props
	for prop in battle_def.get("cover_props", []):
		var lane: int = prop.get("lane", 0)
		var row: int  = prop.get("row", 0)
		var s: int    = prop.get("side", 0)
		_cover[Vector3i(lane, row, s)] = {
			"prop_id":     prop.get("prop_id", ""),
			"cover_class": prop.get("cover_class", "soft"),
		}

	if errors.is_empty():
		_transition_phase(Phase.INTENT)

	return errors

func _register_fighter(f: Fighter) -> Array:
	var errors: Array[String] = []
	if f.fighter_id.is_empty():
		errors.append("Fighter has empty fighter_id")
		return errors
	if _fighters.has(f.fighter_id):
		errors.append("Duplicate fighter_id '%s'" % f.fighter_id)
		return errors
	# Check slot collision
	var key := _grid_key(f.slot.x, f.slot.y, f.side)
	if _grid.has(key) and _grid[key] != "":
		errors.append("Slot collision at lane=%d row=%d side=%d for '%s'" % [
			f.slot.x, f.slot.y, int(f.side), f.fighter_id])
		return errors
	_fighters[f.fighter_id] = f
	_grid[key] = f.fighter_id
	return errors

# ================================================================== #
# Phase state machine
# ================================================================== #

func _transition_phase(new_phase: Phase) -> void:
	phase = new_phase
	phase_changed.emit(new_phase)
	state_changed.emit()

	match new_phase:
		Phase.INTENT:
			_do_intent_phase()
		Phase.COMMAND:
			_player_commands.clear()
		Phase.PLAYER_RESOLVE:
			_do_player_resolve()
		Phase.OPP_RESOLVE:
			_do_opp_resolve()
		Phase.MORALE_CHECK:
			_do_morale_check()

# ================================================================== #
# INTENT phase — telegraph opposition plans
# ================================================================== #

func _do_intent_phase() -> void:
	_opposition_intents.clear()
	for id in _fighters:
		var f: Fighter = _fighters[id]
		if f.side != Fighter.Side.OPPOSITION or not f.is_active():
			continue
		var intent := IntentRecord.new()
		intent.fighter_id = id
		# Preview=true: deterministic, no RNG used for the intent reveal
		var cmd: Command = _ai_select_command(f, true)
		intent.likely_type = cmd.type if cmd != null else Command.Type.ATTACK
		intent.target_lane = _ai_preferred_target_lane(f)
		intent.risk_band   = _weapon_risk_band(_get_weapon_data(f.held_weapon_id))
		intent.lethal_exposure = _weapon_is_lethal(_get_weapon_data(f.held_weapon_id))
		_opposition_intents.append(intent)

	intent_updated.emit(_opposition_intents)
	_transition_phase(Phase.COMMAND)

# ================================================================== #
# COMMAND phase — player queues commands, then confirms
# ================================================================== #

## Queue one command for a player unit. Replaces any prior command for
## the same source. Returns true if the command is legal.
## Called by BattleHUD; never call during resolution phases.
func queue_player_command(cmd: Command) -> bool:
	if phase != Phase.COMMAND:
		return false
	if not _is_legal_command(cmd):
		return false
	# Replace previous command for this fighter if any
	for i in range(_player_commands.size() - 1, -1, -1):
		if (_player_commands[i] as Command).source_id == cmd.source_id:
			_player_commands.remove_at(i)
	_player_commands.append(cmd)
	return true

## Player confirms commands; unissued fighters receive AUTO fill.
## Advances to PLAYER_RESOLVE.
func confirm_commands() -> void:
	if phase != Phase.COMMAND:
		return
	_fill_auto_commands()
	_transition_phase(Phase.PLAYER_RESOLVE)

## SKIP TO RESULT — the third tier of engagement (COMBAT.md §6.4).
##
## Runs the fight to its end with nobody watching. This is deliberately the one
## place `GDD` §13.7's "auto is NOT a separate statistical auto-resolve" is
## broken, and it is broken for an audience that rule did not consider: players
## who are here for the story and for whom a four-minute tactical fight is a
## toll on the way to the next scene.
##
## It is NOT a different fight. It runs the SAME rounds, the same commands, the
## same rules — it simply does not stop to show them. A separate, faster,
## friendlier resolution would be a second combat system that could disagree
## What happened, in the shape the aftermath screen needs.
##
## The fight reports this rather than the UI reconstructing it. A screen that
## recounts a battle by inspecting the model is a second, quieter implementation
## of the rules, and the two drift.
##
## COMBAT.md §1 promises triage rather than a damage race, and until now the
## player was never told the outcome at all: win, negotiated exit, withdrawal
## and defeat all returned to the map identically, which read as a bug rather
## than as a result.
func aftermath() -> Dictionary:
	var ours: Array[Dictionary] = []
	var theirs: Array[Dictionary] = []
	for id in _fighters:
		var f: Fighter = _fighters[id]
		var row := {
			"id": f.fighter_id,
			"name": f.display_name,
			"status": f.status,
			"condition": f.condition,
			"condition_max": f.condition_max,
		}
		if f.is_player_controlled:
			ours.append(row)
		else:
			theirs.append(row)
	return {
		"result": result,
		"rounds": round_number,
		"ours": ours,
		"theirs": theirs,
		# Named separately because these are the two the player is answerable
		# for. Everything else is detail.
		"our_downed": _count(ours, Fighter.Status.DOWNED),
		"our_standing": _standing(ours),
		"their_downed": _count(theirs, Fighter.Status.DOWNED),
		"their_routed": _count(theirs, Fighter.Status.ROUTED),
		"heat": heat,
		"police_arrived": police_arrived,
		"taken": taken_by_police(),
	}


static func _count(rows: Array[Dictionary], status: int) -> int:
	var n := 0
	for r in rows:
		if int(r["status"]) == status:
			n += 1
	return n


## Still on their feet: not downed, not routed, not lost in the aftermath.
static func _standing(rows: Array[Dictionary]) -> int:
	var n := 0
	for r in rows:
		var st := int(r["status"])
		if st != Fighter.Status.DOWNED and st != Fighter.Status.ROUTED \
				and st != Fighter.Status.MISSING and st != Fighter.Status.DEAD:
			n += 1
	return n


# ── heat, and who it brings (COMBAT.md §9.5) ───────────────────────────────

## How loud this has got.
##
## §9.5: heat rises with firearms, long fights and bodies on the ground until
## somebody turns up. That is what makes the quick, merciful win worth something
## mechanically rather than only morally — and it is the counterweight to §8.2,
## where mercy costs you loot.
var heat: float = 0.0

## Whether the police are on the board, and which end they came in at.
## §9.5.1: they arrive behind a back rank, never in the middle — on a six-by-
## eight corridor that is the one entrance that threatens a formation instead of
## appearing inside it.
var police_arrived: bool = false
var police_entry_depth: int = -1

## Per ROUND, for simply still being here. A fight that drags is a fight
## somebody hears.
const HEAT_PER_ROUND := 1.0
## Per body on the ground, either side. This is the loud one.
const HEAT_PER_DOWNED := 2.5
## Once, the first time a lethal weapon is used at all.
const HEAT_FIREARM := 4.0
## Chosen so a clean two-round rout stays quiet and a long fight with bodies
## does not. PLAYTEST GATE, not canon (DESIGN_LOCKS §13).
const HEAT_THRESHOLD := 12.0

var _firearm_heard: bool = false


func _accrue_heat() -> void:
	if police_arrived:
		return
	heat += HEAT_PER_ROUND
	for id in _fighters:
		var f: Fighter = _fighters[id]
		if f.status == Fighter.Status.DOWNED:
			heat += HEAT_PER_DOWNED
		if not _firearm_heard and f.held_weapon_id != "" \
				and _weapon_is_lethal(_get_weapon_data(f.held_weapon_id)) \
				and f.acted_this_round:
			_firearm_heard = true
			heat += HEAT_FIREARM
	if heat >= HEAT_THRESHOLD:
		_police_arrive()


## They come in behind whichever side has been making the noise — measured by
## who is holding the most ground at the far end. Whoever they arrive behind is
## suddenly the side with a problem at their back.
func _police_arrive() -> void:
	police_arrived = true
	police_entry_depth = FightBoard.total_rows() - 1
	var ours := 0
	var theirs := 0
	for id in _fighters:
		var f: Fighter = _fighters[id]
		if f.status == Fighter.Status.DOWNED:
			continue
		if f.is_player_controlled: ours += 1
		else: theirs += 1
	# Behind the side still standing in numbers: the ones who look like they are
	# winning are the ones who look like they started it.
	if ours >= theirs:
		police_entry_depth = 0
	police_arrived_signal.emit(police_entry_depth)


## Who the police take.
##
## §9.5.3: their default posture is subdue, and its bite is on the fallen —
## anyone DOWNED on the board when they arrive is taken. That lands directly on
## the career system: a downed crew member is not merely hurt, they are gone, and
## no money replaces the fights they had learned.
##
## Returns player-side ids only. What happens to the opposition's fallen is the
## opposition's problem.
func taken_by_police() -> PackedStringArray:
	var out: PackedStringArray = []
	if not police_arrived:
		return out
	for id in _fighters:
		var f: Fighter = _fighters[id]
		if f.is_player_controlled and f.status == Fighter.Status.DOWNED:
			out.append(f.fighter_id)
	return out


## What is lying on the ground when the fight ends, for one side.
##
## COMBAT.md §8: gear is carried by a PERSON, so it comes off the fallen, not off
## the field. Somebody who broke and ran took their weapon with them. That makes
## a merciful win (VICTORY_ROUT) yield less capability than a brutal one, which
## is a deliberate tension against §1's "triage, not a damage race" — the clean
## win should cost you something rather than being free.
##
## Returns weapon ids, not fighters: two people carrying pipes drop two pipes.
func dropped_kit(player_side: bool) -> PackedStringArray:
	var out: PackedStringArray = []
	for id in _fighters:
		var f: Fighter = _fighters[id]
		if f.is_player_controlled != player_side:
			continue
		if f.status != Fighter.Status.DOWNED:
			continue
		for w in f.weapon_ids:
			if String(w) != "":
				out.append(String(w))
	return out


## with the first, and the first is the one the game is about.
##
## The stance still applies, so skipping is not free of the player's judgement:
## a crew told to be aggressive dies differently from one told to hold.
##
## `guard` bounds the loop rather than trusting the fight to end. A resolve that
## cannot terminate would hang the game with no way back, which is worse than a
## fight that stops early and says so.
func resolve_to_end(max_rounds: int = 40) -> BattleResult:
	var guard := 0
	while result == BattleResult.PENDING and guard < max_rounds:
		guard += 1
		if phase == Phase.COMMAND:
			confirm_commands()
		else:
			_transition_phase(Phase.COMMAND)
	if result == BattleResult.PENDING:
		# A STALEMATE IS A REAL OUTCOME, not a failure to compute one.
		#
		# Found by the gate: a crew held on DEFENSIVE never resolves. Bracing
		# outscores attacking almost every round, so nobody does enough harm to
		# finish it and the opposition cannot get through the guard either. Two
		# crews braced against each other in a yard until someone walks away is
		# exactly what that looks like from outside, so it ends as a stand-down
		# rather than as PENDING.
		#
		# Returning PENDING would have been worse than wrong: the caller would
		# show a fight that is neither running nor over.
		result = BattleResult.STAND_DOWN
		battle_ended.emit(result)
	return result


func _fill_auto_commands() -> void:
	var already: Dictionary = {}
	for c in _player_commands:
		already[(c as Command).source_id] = true

	for id in _fighters:
		var f: Fighter = _fighters[id]
		if f.side == Fighter.Side.PLAYER and f.can_act() and not already.has(id):
			var cmd: Command = _ai_select_command(f, false)
			if cmd != null:
				cmd.source_id = id
				_player_commands.append(cmd)
				var ev := BattleEvent.new()
				ev.kind = BattleEvent.Kind.AUTO_COMMAND_FILLED
				ev.source_id = id
				_emit_event(ev)

# ================================================================== #
# Forecast / preview — called by BattleHUD before the player confirms
# ================================================================== #

## Returns a Dictionary the HUD displays before the player confirms a command.
## Gate §3 requires every command to preview targets, cover and harm range.
func get_command_forecast(cmd: Command) -> Dictionary:
	var fc := {
		"legal":          false,
		"targets":        [],
		"cover_intercept": false,
		"cover_hard":     false,
		"harm_min":       0,
		"harm_max":       0,
		"nerve_min":      0,
		"nerve_max":      0,
		"lethal_exposure": false,
		"guard_gain":     0,
		"dest_slot":      [-1, -1],
		"notes":          [],
	}
	fc.legal = _is_legal_command(cmd)
	if not fc.legal:
		fc.notes.append("Command is not legal in the current state")
		return fc

	var src: Fighter = _fighters.get(cmd.source_id)
	if src == null:
		fc.notes.append("Source fighter not found")
		return fc

	match cmd.type:
		Command.Type.ATTACK:
			var tgt: Fighter = _fighters.get(cmd.target_id)
			if tgt == null:
				fc.legal = false
				fc.notes.append("Target fighter not found")
				return fc
			var weapon := _get_weapon_data(src.held_weapon_id)
			var cover := _cover_at(tgt.slot.x, tgt.slot.y, tgt.side)
			fc.targets        = [cmd.target_id]
			fc.cover_intercept = cover.is_cover
			fc.cover_hard      = cover.hard_block
			if cover.hard_block:
				fc.notes.append("Hard cover blocks this attack entirely")
			elif cover.soft_block and not weapon.get("piercing", false):
				fc.notes.append("Soft cover may intercept (non-piercing)")
				fc.cover_intercept = true
			else:
				fc.harm_min = weapon.get("harm_min", 1)
				fc.harm_max = weapon.get("harm_max", 2)
				fc.nerve_min = weapon.get("nerve_min", 0)
				fc.nerve_max = weapon.get("nerve_max", 1)
				fc.lethal_exposure = _weapon_is_lethal(weapon)
				if tgt.guard > 0:
					fc.notes.append("Target has %d guard (absorbs harm first)" % tgt.guard)

		Command.Type.GUARD:
			var weapon := _get_weapon_data(src.held_weapon_id)
			fc.guard_gain = weapon.get("guard_amount", 2)
			fc.notes.append("Gain %d guard; decays 1 per round" % fc.guard_gain)

		Command.Type.REPOSITION:
			fc.dest_slot = [cmd.target_slot.x, cmd.target_slot.y]
			fc.notes.append("Move to lane %d row %d (consumes action)" % [
				cmd.target_slot.x, cmd.target_slot.y])

		Command.Type.ITEM:
			fc.notes.append("Use item: %s" % cmd.item_id)

		Command.Type.STAND_DOWN:
			fc.notes.append("Offer bloodless exit. Accepted when opposition nerve is low.")

		Command.Type.WITHDRAW:
			if _withdrawal_cost.is_empty():
				fc.notes.append("Withdraw (no authored cost specified)")
			else:
				fc.notes.append("Withdraw at cost: %s" % str(_withdrawal_cost))
			fc.notes.append("Downed fighters may be abandoned")

	return fc

# ================================================================== #
# PLAYER_RESOLVE phase
# ================================================================== #

func _do_player_resolve() -> void:
	_player_commands.sort_custom(_cmd_tempo_sort)
	for cmd_raw in _player_commands:
		var cmd: Command = cmd_raw
		var f: Fighter = _fighters.get(cmd.source_id)
		if f == null or not f.can_act():
			continue
		_resolve_command(cmd)
		f.acted_this_round = true
		if _check_battle_over():
			return
	_transition_phase(Phase.OPP_RESOLVE)

# ================================================================== #
# OPP_RESOLVE phase
# ================================================================== #

func _do_opp_resolve() -> void:
	var opp_cmds: Array = []
	for id in _fighters:
		var f: Fighter = _fighters[id]
		if f.side == Fighter.Side.OPPOSITION and f.can_act():
			var cmd: Command = _ai_select_command(f, false)
			if cmd != null:
				cmd.source_id = id
				opp_cmds.append(cmd)

	opp_cmds.sort_custom(_cmd_tempo_sort)
	for cmd_raw in opp_cmds:
		var cmd: Command = cmd_raw
		var f: Fighter = _fighters.get(cmd.source_id)
		if f == null or not f.can_act():
			continue
		_resolve_command(cmd)
		f.acted_this_round = true
		if _check_battle_over():
			return

	_transition_phase(Phase.MORALE_CHECK)

# ================================================================== #
# Unified command resolver (player and AI use the same rules)
# ================================================================== #

func _resolve_command(cmd: Command) -> void:
	match cmd.type:
		Command.Type.ATTACK:     _resolve_attack(cmd)
		Command.Type.GUARD:      _resolve_guard(cmd)
		Command.Type.REPOSITION: _resolve_reposition(cmd)
		Command.Type.ITEM:       _resolve_item(cmd)
		Command.Type.STAND_DOWN: _resolve_stand_down(cmd)
		Command.Type.WITHDRAW:   _resolve_withdraw(cmd)

func _resolve_attack(cmd: Command) -> void:
	var src: Fighter = _fighters.get(cmd.source_id)
	var tgt: Fighter = _fighters.get(cmd.target_id)
	if src == null or tgt == null or not tgt.is_active():
		return

	var weapon := _get_weapon_data(src.held_weapon_id)
	var cover  := _cover_at(tgt.slot.x, tgt.slot.y, tgt.side)

	var ev := BattleEvent.new()
	ev.source_id = cmd.source_id
	ev.target_id = cmd.target_id

	if cover.hard_block:
		ev.kind   = BattleEvent.Kind.ATTACK_BLOCKED
		ev.detail = "hard cover"
		_emit_event(ev)
		return

	if cover.soft_block and not weapon.get("piercing", false):
		ev.kind   = BattleEvent.Kind.ATTACK_INTERCEPTED
		ev.detail = "soft cover"
		_emit_event(ev)
		return

	var harm      := _roll_range(weapon.get("harm_min", 1), weapon.get("harm_max", 2))
	var nerve_dmg := _roll_range(weapon.get("nerve_min", 0), weapon.get("nerve_max", 1))

	var guard_before := tgt.guard
	var overflow      := tgt.receive_harm(harm)
	tgt.receive_nerve_damage(nerve_dmg)

	ev.kind           = BattleEvent.Kind.ATTACK_HIT
	ev.harm_absorbed  = guard_before - tgt.guard
	ev.harm_dealt     = overflow
	ev.nerve_dealt    = nerve_dmg
	ev.lethal_condition = _weapon_is_lethal(weapon) and tgt.condition == 0
	_emit_event(ev)

	_update_fighter_status(tgt)

func _resolve_guard(cmd: Command) -> void:
	var src: Fighter = _fighters.get(cmd.source_id)
	if src == null:
		return
	var weapon := _get_weapon_data(src.held_weapon_id)
	var amount: int = weapon.get("guard_amount", 2)
	src.apply_guard(amount)

	var ev := BattleEvent.new()
	ev.kind      = BattleEvent.Kind.GUARD_SET
	ev.source_id = cmd.source_id
	ev.harm_absorbed = amount  # re-use field to carry guard amount
	_emit_event(ev)

func _resolve_reposition(cmd: Command) -> void:
	var src: Fighter = _fighters.get(cmd.source_id)
	if src == null or not _is_slot_free(cmd.target_slot, src.side):
		return
	_grid.erase(_grid_key(src.slot.x, src.slot.y, src.side))
	src.slot = cmd.target_slot
	_grid[_grid_key(src.slot.x, src.slot.y, src.side)] = src.fighter_id

	var ev := BattleEvent.new()
	ev.kind      = BattleEvent.Kind.REPOSITIONED
	ev.source_id = cmd.source_id
	ev.detail    = "%d,%d" % [cmd.target_slot.x, cmd.target_slot.y]
	_emit_event(ev)

func _resolve_item(cmd: Command) -> void:
	var src: Fighter = _fighters.get(cmd.source_id)
	if src == null:
		return
	var item     := _get_item_data(cmd.item_id)
	var tgt_id   := cmd.target_id if not cmd.target_id.is_empty() else cmd.source_id
	var tgt: Fighter = _fighters.get(tgt_id, src)
	match item.get("effect_type", ""):
		"restore_condition":
			tgt.condition = clampi(tgt.condition + item.get("magnitude", 0), 0, tgt.condition_max)
			_update_fighter_status(tgt)
		"restore_nerve":
			tgt.restore_nerve(item.get("magnitude", 0))
			_update_fighter_status(tgt)
		"boost_tempo":
			tgt.tempo = clampi(tgt.tempo + item.get("magnitude", 0), 1, 10)
		"clear_status":
			_force_status(tgt, Fighter.Status.AVAILABLE)
		"apply_status":
			pass  ## Authored at scenario level; no generic fallback
	var ev := BattleEvent.new()
	ev.kind      = BattleEvent.Kind.ITEM_USED
	ev.source_id = cmd.source_id
	ev.target_id = tgt_id
	ev.detail    = cmd.item_id
	_emit_event(ev)

func _resolve_stand_down(cmd: Command) -> void:
	if not _stand_down_available:
		var ev := BattleEvent.new()
		ev.kind      = BattleEvent.Kind.STAND_DOWN_REFUSED
		ev.source_id = cmd.source_id
		ev.detail    = "not available in this encounter"
		_emit_event(ev)
		return

	# Acceptance: mean opposition nerve below 50 % (authored terms may modify)
	var opp_nerve := _mean_nerve_fraction(Fighter.Side.OPPOSITION)
	if opp_nerve < 0.5:
		var ev := BattleEvent.new()
		ev.kind      = BattleEvent.Kind.STAND_DOWN_ACCEPTED
		ev.source_id = cmd.source_id
		_emit_event(ev)
		result = BattleResult.STAND_DOWN
		_end_battle()
	else:
		var ev := BattleEvent.new()
		ev.kind      = BattleEvent.Kind.STAND_DOWN_REFUSED
		ev.source_id = cmd.source_id
		ev.detail    = "opposition holds"
		_emit_event(ev)

func _resolve_withdraw(cmd: Command) -> void:
	var ev := BattleEvent.new()
	ev.kind      = BattleEvent.Kind.WITHDRAWAL_EXECUTED
	ev.source_id = cmd.source_id
	_emit_event(ev)
	result = BattleResult.WITHDRAWAL
	_end_battle()

# ================================================================== #
# MORALE_CHECK phase
# ================================================================== #

func _do_morale_check() -> void:
	# 1. Guard decay for all active fighters
	for id in _fighters:
		var f: Fighter = _fighters[id]
		if f.is_active():
			f.tick_guard()

	# 2. Downed witnesses reduce nerve of lane-mates (design §4 step 5)
	_apply_witness_morale()

	# 3. Re-check nerve → rout for anyone who just fell below zero
	for id in _fighters:
		var f: Fighter = _fighters[id]
		if f.is_active() and f.nerve <= 0:
			_force_status(f, Fighter.Status.ROUTED)

	# 4. Check end conditions
	if _check_battle_over():
		return

	# 5. Reset acted flags; advance round
	for id in _fighters:
		(_fighters[id] as Fighter).acted_this_round = false

	_accrue_heat()

	round_number += 1
	round_started.emit(round_number)
	_transition_phase(Phase.INTENT)

func _apply_witness_morale() -> void:
	## A downed unit in lane X causes -1 nerve to active allies in the same lane.
	for id in _fighters:
		var downed: Fighter = _fighters[id]
		if downed.status != Fighter.Status.DOWNED:
			continue
		for ally_id in _fighters:
			var ally: Fighter = _fighters[ally_id]
			if ally.side == downed.side and ally.is_active() and ally.slot.x == downed.slot.x:
				ally.receive_nerve_damage(1)
				var ev := BattleEvent.new()
				ev.kind      = BattleEvent.Kind.MORALE_WITNESS
				ev.source_id = id
				ev.target_id = ally_id
				ev.nerve_dealt = 1
				_emit_event(ev)

# ================================================================== #
# Battle-over conditions (gate §1/§2)
# ================================================================== #

func _check_battle_over() -> bool:
	if result != BattleResult.PENDING:
		return true

	var player_active := _count_active(Fighter.Side.PLAYER)
	var opp_active    := _count_active(Fighter.Side.OPPOSITION)

	if opp_active == 0:
		result = BattleResult.VICTORY_BREAK
		_end_battle()
		return true

	if player_active == 0:
		result = BattleResult.DEFEAT
		_end_battle()
		return true

	# Rout: all remaining opposition have zero nerve (§2 victory_rout)
	var all_opp_nerved_out := true
	for id in _fighters:
		var f: Fighter = _fighters[id]
		if f.side == Fighter.Side.OPPOSITION and f.is_active() and f.nerve > 0:
			all_opp_nerved_out = false
			break
	if all_opp_nerved_out and opp_active > 0:
		result = BattleResult.VICTORY_ROUT
		_end_battle()
		return true

	var all_player_nerved_out := true
	for id in _fighters:
		var f: Fighter = _fighters[id]
		if f.side == Fighter.Side.PLAYER and f.is_active() and f.nerve > 0:
			all_player_nerved_out = false
			break
	if all_player_nerved_out and player_active > 0:
		result = BattleResult.DEFEAT
		_end_battle()
		return true

	return false

func _end_battle() -> void:
	_transition_phase(Phase.AFTERMATH)
	battle_ended.emit(result)
	var winner_side: String = (
		"player" if result in [
			BattleResult.VICTORY_ROUT, BattleResult.VICTORY_BREAK,
			BattleResult.STAND_DOWN, BattleResult.WITHDRAWAL,
		] else "enemy"
	)
	fight_ended.emit(winner_side)

# ================================================================== #
# Fighter status transitions
# ================================================================== #

## Called after harm or nerve change; derives the correct status.
## Gate §7: downed never becomes dead here.
func _update_fighter_status(f: Fighter) -> void:
	if not f.is_active():
		return

	if f.nerve <= 0:
		_force_status(f, Fighter.Status.ROUTED)
		return

	if f.condition <= 0:
		if f.status == Fighter.Status.CRITICAL:
			_force_status(f, Fighter.Status.DOWNED)
		else:
			_force_status(f, Fighter.Status.CRITICAL)
		return

	var target_status: Fighter.Status
	if f.nerve_fraction() < 0.25:
		target_status = Fighter.Status.SHAKEN
	elif persistent_injuries_count(f) > 0:
		target_status = Fighter.Status.WOUNDED
	else:
		target_status = Fighter.Status.AVAILABLE

	if target_status != f.status:
		_force_status(f, target_status)

func _force_status(f: Fighter, new_status: Fighter.Status) -> void:
	var old_status := f.status
	f.status = new_status
	fighter_status_changed.emit(f.fighter_id, old_status, new_status)
	# Remove routed/downed fighters from the grid
	if new_status in [Fighter.Status.ROUTED, Fighter.Status.DOWNED]:
		_grid.erase(_grid_key(f.slot.x, f.slot.y, f.side))
		var ev := BattleEvent.new()
		ev.source_id = f.fighter_id
		ev.kind = (
			BattleEvent.Kind.UNIT_ROUTED if new_status == Fighter.Status.ROUTED
			else BattleEvent.Kind.UNIT_DOWNED
		)
		_emit_event(ev)
	elif new_status == Fighter.Status.CRITICAL:
		var ev := BattleEvent.new()
		ev.kind      = BattleEvent.Kind.UNIT_CRITICAL
		ev.source_id = f.fighter_id
		_emit_event(ev)

static func persistent_injuries_count(f: Fighter) -> int:
	return f.persistent_injuries.size()

# ================================================================== #
# AI — shared legal-action resolver (gate §8: only public legal APIs)
# ================================================================== #

## Select the best command for a fighter.
## preview=true → deterministic (no RNG); used for intent telegraphing.
## STANCES — how you instruct the auto-battler (COMBAT.md §6.2).
##
## They are not a layer over manual play. They exist only when auto is running,
## they are TEAM-WIDE, and they may be changed mid-fight.
##
## §6.1 is the constraint that keeps auto honest: it plays competently but NOT
## optimally, because it will not make the triage call — deciding which of your
## people matters tonight is a judgement about your campaign, not about the
## board. A stance therefore changes what the crew PREFER, never what they can
## see. Nothing below reads a fighter's value to the player.
enum Stance { AGGRESSIVE, DEFENSIVE, HOLD_THE_LINE }

## Team-wide, player side. The opposition has its own behaviour packages and is
## not commanded.
var player_stance: Stance = Stance.HOLD_THE_LINE


## What a stance does to a command's appeal. Multiplicative on the existing
## score, so a behaviour package still shows through — a fixer told to be
## aggressive is an aggressive fixer, not a different person.
static func stance_weight(stance: Stance, type: int) -> float:
	match stance:
		Stance.AGGRESSIVE:
			# Take the best attack and accept exposure.
			match type:
				Command.Type.ATTACK:     return 1.75
				Command.Type.GUARD:      return 0.45
				Command.Type.REPOSITION: return 0.70
				Command.Type.WITHDRAW:   return 0.25
				_: return 1.0
		Stance.DEFENSIVE:
			# Hold, brace, and attack when it is free.
			match type:
				Command.Type.ATTACK:     return 0.65
				Command.Type.GUARD:      return 1.85
				Command.Type.REPOSITION: return 1.15
				Command.Type.WITHDRAW:   return 1.30
				_: return 1.0
		Stance.HOLD_THE_LINE:
			# Keep formation and screen the back rows. Repositioning is what
			# breaks a line, so it is what this stance suppresses.
			match type:
				Command.Type.ATTACK:     return 1.0
				Command.Type.GUARD:      return 1.35
				Command.Type.REPOSITION: return 0.35
				Command.Type.WITHDRAW:   return 0.60
				_: return 1.0
	return 1.0


static func stance_name(stance: Stance) -> String:
	match stance:
		Stance.AGGRESSIVE:   return "battle.stance_aggressive"
		Stance.DEFENSIVE:    return "battle.stance_defensive"
		_:                   return "battle.stance_hold"


func _ai_select_command(f: Fighter, preview: bool) -> Command:
	var legal := _get_legal_commands(f)
	if legal.is_empty():
		return null

	# Score every legal command
	var scored: Array = []
	for cmd_raw in legal:
		var cmd: Command = cmd_raw
		scored.append({"cmd": cmd, "score": _score_command(f, cmd)})
	scored.sort_custom(func(a, b): return a.score > b.score)

	if preview:
		return scored[0].cmd  # deterministic top pick for intent reveal

	# Weighted random selection across top-3 to add personality variation
	var top: Array = scored.slice(0, mini(3, scored.size()))
	var total: float = 0.0
	for entry in top:
		total += entry.score
	if total <= 0.0:
		return top[0].cmd

	var pick: float = _rng.randf() * total
	var acc: float = 0.0
	for entry in top:
		acc += entry.score
		if pick <= acc:
			return entry.cmd
	return top[0].cmd

func _score_command(f: Fighter, cmd: Command) -> float:
	var score: float = _score_base(f, cmd)
	# The stance is the player's instruction and applies only to the player's
	# crew. The opposition follows its own authored behaviour.
	if f.side == Fighter.Side.PLAYER:
		score *= stance_weight(player_stance, cmd.type)
	return score


func _score_base(f: Fighter, cmd: Command) -> float:
	var score: float = 0.0
	match cmd.type:
		Command.Type.ATTACK:
			var tgt: Fighter = _fighters.get(cmd.target_id)
			if tgt == null:
				return 0.0
			# Prefer wounded/shaken targets
			score = 1.0 + (1.0 - tgt.nerve_fraction()) * 1.5 + (1.0 - tgt.condition_fraction()) * 0.8
			match f.behaviour_package:
				"collector": score *= 1.4
				"veteran":   score *= 1.2
				"watcher":   score *= 0.4
				"fixer":     score *= 0.1
				"runner":    score *= 0.7

		Command.Type.GUARD:
			score = 0.6 + (1.0 - f.nerve_fraction()) * 1.2
			match f.behaviour_package:
				"local_pusher": score *= 1.3
				"collector":    score *= 1.1
				"runner":       score *= 0.4

		Command.Type.REPOSITION:
			score = 0.4
			match f.behaviour_package:
				"runner":  score = 1.8
				"watcher": score = 1.2

		Command.Type.STAND_DOWN:
			# Only when nerve is below personal threshold
			score = maxf(0.0, (f.surrender_threshold - f.nerve_fraction()) * 3.0)
			match f.behaviour_package:
				"fixer": score *= 2.0

		Command.Type.WITHDRAW:
			score = maxf(0.0, (0.2 - f.nerve_fraction()) * 2.0)

		Command.Type.ITEM:
			score = 0.5   ## Authored items get flat score; extend per item type

		_:
			score = 0.0

	return maxf(score, 0.0)

## Returns all commands that are legal for this fighter right now.
## Gate §8: AI selects only from this list.
func _get_legal_commands(f: Fighter) -> Array:
	var legal: Array = []
	if not f.can_act():
		return legal

	var weapon := _get_weapon_data(f.held_weapon_id)

	# ATTACK
	if not f.prohibited_commands.has("attack"):
		for tgt_id in _get_attack_targets(f, weapon):
			var cmd := Command.new(Command.Type.ATTACK, f.fighter_id)
			cmd.target_id = tgt_id
			legal.append(cmd)

	# GUARD
	if not f.prohibited_commands.has("guard"):
		legal.append(Command.new(Command.Type.GUARD, f.fighter_id))

	# REPOSITION — orthogonal adjacents only (gate §5)
	if not f.prohibited_commands.has("reposition"):
		for delta in [Vector2i(1,0), Vector2i(-1,0), Vector2i(0,1), Vector2i(0,-1)]:
			var dest: Vector2i = f.slot + delta
			if FightBoard.has_slot(dest.x, dest.y):
				if _is_slot_free(dest, f.side):
					var cmd := Command.new(Command.Type.REPOSITION, f.fighter_id)
					cmd.target_slot = dest
					legal.append(cmd)

	# ITEM
	if not f.prohibited_commands.has("item"):
		for iid in f.item_ids:
			var cmd := Command.new(Command.Type.ITEM, f.fighter_id)
			cmd.item_id = iid
			legal.append(cmd)

	# STAND DOWN — always visible (gate §6); AI only offers when below threshold
	if _stand_down_available and not f.prohibited_commands.has("stand_down"):
		if not f.is_player_controlled or phase == Phase.COMMAND:
			var cmd := Command.new(Command.Type.STAND_DOWN, f.fighter_id)
			legal.append(cmd)

	# WITHDRAW
	if not f.prohibited_commands.has("withdraw"):
		legal.append(Command.new(Command.Type.WITHDRAW, f.fighter_id))

	return legal

# ================================================================== #
# Attack target resolution (cover-aware, reach-aware)
# ================================================================== #

## Returns fighter_ids that are valid targets for an attack from f using weapon.
## Non-piercing: frontmost unit or cover per lane.
## Piercing: all units until hard cover.
func _get_attack_targets(f: Fighter, weapon: Dictionary) -> Array:
	var targets: Array = []
	var opp_side: Fighter.Side = (
		Fighter.Side.OPPOSITION if f.side == Fighter.Side.PLAYER
		else Fighter.Side.PLAYER
	)
	var lane_spread: int = weapon.get("lane_spread", 0)
	var piercing: bool   = weapon.get("piercing", false)
	# Default to every row the board HAS. This was `[0, 1, 2]` — a sixth copy of
	# the three-row assumption, hiding as a default argument. On a four-row board
	# it silently gave anyone in the rear rank no attacks at all, which reads in
	# play as a unit that simply does nothing.
	var default_rows: Array = []
	for r in range(FightBoard.rows):
		default_rows.append(r)
	var allowed_rows: Array = weapon.get("allowed_rows", default_rows)

	# allowed_rows names rows within the ATTACKER'S OWN FORMATION — front,
	# middle, back — while a slot carries a unified depth across the whole
	# board. Comparing them directly was comparing two different coordinate
	# spaces: depth 0 is the player's BACK row and is not the opposition's
	# ground at all, so a front-only weapon refused to fire from the front rank
	# and most of a crew simply could not attack.
	#
	# A unit that has advanced out of its own band is at the front by
	# definition, so it counts as ROW_FRONT. (Owner ruling: crews may cross the
	# whole board, so this is a normal position, not an edge case.)
	var own_row := FightBoard.row_of(f.slot.y, f.side == Fighter.Side.PLAYER)
	if own_row < 0:
		own_row = EquipmentRules.ROW_FRONT
	if not allowed_rows.has(own_row):
		return targets  # weapon cannot fire from this row

	var lane_min: int = maxi(0, f.slot.x - lane_spread)
	var lane_max: int = mini(FightBoard.lanes - 1, f.slot.x + lane_spread)

	# Walk outward from the attacker along the shared depth axis, toward the
	# opposition's end. Sides no longer own private rows, so "who is in front of
	# whom" is a question about depth rather than about which grid a cell is in.
	var toward := 1 if f.side == Fighter.Side.PLAYER else -1
	for lane in range(lane_min, lane_max + 1):
		var d: int = f.slot.y + toward
		while d >= 0 and d < FightBoard.total_rows():
			var cover := _cover_at(lane, d, opp_side)
			if cover.hard_block:
				break  # hard cover stops everything including piercing
			if cover.soft_block and not piercing:
				break  # soft cover stops non-piercing attacks
			var fid: String = _grid.get(_grid_key(lane, d), "")
			if fid != "" and _fighters.has(fid):
				var other: Fighter = _fighters[fid]
				if other.side == opp_side and other.is_active():
					targets.append(fid)
				if not piercing:
					break  # non-piercing stops at the first body in the lane
			d += toward

	return targets

# ================================================================== #
# Cover helpers
# ================================================================== #

func _cover_at(lane: int, row: int, side: Fighter.Side) -> Dictionary:
	var key := Vector3i(lane, row, int(side))
	if _cover.has(key):
		var prop: Dictionary = _cover[key]
		var is_hard: bool = prop.get("cover_class", "soft") == "hard"
		return {
			"is_cover":  true,
			"hard_block": is_hard,
			"soft_block": not is_hard,
		}
	return {"is_cover": false, "hard_block": false, "soft_block": false}

# ================================================================== #
# Formation grid helpers
# ================================================================== #

## ONE grid. The key used to carry the side, which made two grids that happened
## to be drawn next to each other — two fighters could stand in "the same" cell
## because it was two different cells. Owner ruling 2026-08-21 made the board
## shared, so a cell is a cell and only one body fits in it.
func _grid_key(lane: int, depth: int, _side: Fighter.Side = Fighter.Side.PLAYER) -> Vector3i:
	return Vector3i(lane, depth, 0)

func _is_slot_free(slot: Vector2i, side: Fighter.Side) -> bool:
	var fid: String = _grid.get(_grid_key(slot.x, slot.y), "")
	return fid == ""

# ================================================================== #
# AI support helpers
# ================================================================== #

func _ai_preferred_target_lane(f: Fighter) -> int:
	var opp_side: Fighter.Side = (
		Fighter.Side.PLAYER if f.side == Fighter.Side.OPPOSITION
		else Fighter.Side.OPPOSITION
	)
	# Sized from the board, not written out. This was `[0, 0, 0]` and `for i in
	# [1, 2]` — a fifth copy of the number three, invisible to a grep for "3",
	# which indexed out of bounds the moment the board grew a fourth lane.
	var counts: Array[int] = []
	counts.resize(FightBoard.lanes)
	counts.fill(0)
	for id in _fighters:
		var other: Fighter = _fighters[id]
		if other.side == opp_side and other.is_active():
			if other.slot.x >= 0 and other.slot.x < counts.size():
				counts[other.slot.x] += 1
	var best := 0
	for i in range(1, counts.size()):
		if counts[i] > counts[best]:
			best = i
	return best

func _weapon_risk_band(weapon: Dictionary) -> String:
	if _weapon_is_lethal(weapon): return "lethal"
	if weapon.get("harm_max", 2) >= 4: return "high"
	if weapon.get("harm_max", 2) >= 2: return "medium"
	return "low"

func _weapon_is_lethal(weapon: Dictionary) -> bool:
	return (weapon.get("tags", []) as Array).has("lethal")

# ================================================================== #
# Utility queries
# ================================================================== #

func _count_active(side: Fighter.Side) -> int:
	var n := 0
	for id in _fighters:
		if (_fighters[id] as Fighter).side == side and (_fighters[id] as Fighter).is_active():
			n += 1
	return n

func _mean_nerve_fraction(side: Fighter.Side) -> float:
	var total: float = 0.0
	var n := 0
	for id in _fighters:
		var f: Fighter = _fighters[id]
		if f.side == side and f.is_active():
			total += f.nerve_fraction()
			n += 1
	if n == 0:
		return 0.0
	return total / float(n)

## Returns all fighters for one side (used by HUD / stage).
func get_fighters(side: Fighter.Side) -> Array:
	var out: Array = []
	for id in _fighters:
		var f: Fighter = _fighters[id]
		if f.side == side:
			out.append(f)
	return out

func get_fighter(id: String) -> Fighter:
	return _fighters.get(id)

func get_opposition_intents() -> Array:
	return _opposition_intents

func get_current_phase() -> Phase:
	return phase

func get_result() -> BattleResult:
	return result

# ================================================================== #
# Weapon registry — inject via register_weapon() or setup().
## The fallback returns safe unarmed defaults so mechanics work without data.
# ================================================================== #
var _weapon_registry: Dictionary = {}  ## weapon_id → data dict

func register_weapon(weapon_id: String, data: Dictionary) -> void:
	_weapon_registry[weapon_id] = data

func _get_weapon_data(weapon_id: String) -> Dictionary:
	if _weapon_registry.has(weapon_id):
		return _weapon_registry[weapon_id]
	# Default: unarmed / bare-hands fallback (non-lethal, short reach)
	return {
		"harm_min": 1, "harm_max": 2,
		"nerve_min": 0, "nerve_max": 1,
		"guard_amount": 2,
		"reach": 1, "lane_spread": 0,
		"piercing": false,
		"allowed_rows": [0, 1, 2],
		"tags": [],
		"breach": false,
	}

# ================================================================== #
# Item registry — mirrors weapon registry pattern
# ================================================================== #
var _item_registry: Dictionary = {}  ## item_id → data dict

func register_item(item_id: String, data: Dictionary) -> void:
	_item_registry[item_id] = data

func _get_item_data(item_id: String) -> Dictionary:
	if _item_registry.has(item_id):
		return _item_registry[item_id]
	return {"effect_type": "", "magnitude": 0, "target": "self", "single_use": true}

# ================================================================== #
# Convenience API — setup, legal queries, single-call submit
# ================================================================== #

## Load the canonical battle `battle_id`, deploying `crew_ids`.
##
## The kit this core came from shipped its own hardcoded weapon catalogue and a
## 1v1 `setup()` helper. Both are gone: equipment vocabulary is canon
## (content/era1-slice-v1.json), adapted by EquipmentRules and BattleBuilder.
##
## Returns the same error Array as initialise(); empty means success.
func begin_canonical(battle_id: String, crew_ids: Array, seed_val: int = 0) -> Array:
	for wid in EquipmentRules.weapons():
		register_weapon(wid, EquipmentRules.weapons()[wid])
	for iid in EquipmentRules.items():
		register_item(iid, EquipmentRules.items()[iid])

	var def := BattleBuilder.build(battle_id, crew_ids, seed_val)
	if def.is_empty():
		return ["unknown battle id '%s'" % battle_id]
	return initialise(def, seed_val)


# ================================================================== #
# Public read API — the battle scene renders from these and never reaches
# into the private grid. Added for the Godot port; the kit exposed none.
# ================================================================== #

## Fighter ids this unit could legally attack right now, with its held weapon.
func attack_targets_for(fighter_id: String) -> Array:
	if not _fighters.has(fighter_id):
		return []
	var f: Fighter = _fighters[fighter_id]
	return _get_attack_targets(f, _get_weapon_data(f.held_weapon_id))


## Free cells on this unit's own half-board (§13.3: reposition to a valid free cell).
func free_slots_for(fighter_id: String) -> Array:
	if not _fighters.has(fighter_id):
		return []
	var f: Fighter = _fighters[fighter_id]
	var out: Array = []
	for lane in range(FightBoard.lanes):
		for row in range(3):
			var slot := Vector2i(lane, row)
			if slot != f.slot and _is_slot_free(slot, f.side):
				out.append(slot)
	return out


## What cover, if any, a slot carries.
##
## `_cover_at` already existed and was private, consulted only while resolving
## an attack. So the mechanic worked perfectly and the player could not see it:
## a fully implemented tactical system, invisible to the decision that it
## governs. PHASING.md Phase A calls that scenery.
##
## Same shape as _cover_at so the screen and the resolver cannot disagree.
func cover_under(lane: int, row: int, side: int) -> Dictionary:
	return _cover_at(lane, row, side)


## Does an attack on this fighter have to get through something first?
##
## The question the player is actually asking when they pick a target, phrased
## once here rather than reconstructed in the UI.
func attack_would_be_stopped(target_id: String, weapon_id: String) -> String:
	var t := get_fighter(target_id)
	if t == null:
		return ""
	var c := _cover_at(t.slot.x, t.slot.y, t.side)
	if not c.get("is_cover", false):
		return ""
	if c.get("hard_block", false):
		return "hard"
	var weapon: Dictionary = _get_weapon_data(weapon_id)
	if c.get("soft_block", false) and not weapon.get("piercing", false):
		return "soft"
	return "pierced"


## Cover props as plain data, for drawing.
func cover_props() -> Array:
	var out: Array = []
	for key in _cover:
		var k: Vector3i = key
		var prop: Dictionary = _cover[key]
		out.append({
			"lane": k.x, "row": k.y, "side": k.z,
			"prop_id": prop.get("prop_id", ""),
			"cover_class": prop.get("cover_class", "soft"),
		})
	return out


## Whether a negotiated, bloodless exit is on the table for this battle.
func stand_down_available() -> bool:
	return _stand_down_available


## Returns all legal commands for player-controlled fighters in COMMAND phase.
## Attack variants are expanded per-target; caller deduplicates as needed.
func get_legal_commands() -> Array:
	if phase != Phase.COMMAND:
		return []
	var out: Array = []
	for id in _fighters:
		var f: Fighter = _fighters[id]
		if f.side == Fighter.Side.PLAYER and f.is_player_controlled and f.can_act():
			out.append_array(_get_legal_commands(f))
	return out

## Queue one player command and auto-confirm once every active player
## fighter has a command.  Returns false if the command is illegal.
func submit_player_command(cmd: Command) -> bool:
	if not queue_player_command(cmd):
		return false
	for id in _fighters:
		var f: Fighter = _fighters[id]
		if not (f.side == Fighter.Side.PLAYER and f.is_player_controlled and f.can_act()):
			continue
		var has_cmd := false
		for pc in _player_commands:
			if (pc as Command).source_id == id:
				has_cmd = true
				break
		if not has_cmd:
			return true  ## Still waiting for remaining fighters
	confirm_commands()
	return true

# ================================================================== #
# Deterministic helpers
# ================================================================== #

func _roll_range(lo: int, hi: int) -> int:
	if lo >= hi:
		return lo
	return lo + _rng.randi_range(0, hi - lo)

## Comparator for sort_custom: higher effective_tempo first; fighter_id as tie-break.
func _cmd_tempo_sort(a: Command, b: Command) -> bool:
	var fa: Fighter = _fighters.get(a.source_id)
	var fb: Fighter = _fighters.get(b.source_id)
	if fa == null or fb == null:
		return false
	var ta: int = fa.effective_tempo()
	var tb: int = fb.effective_tempo()
	if ta != tb:
		return ta > tb
	return a.source_id < b.source_id   # stable lexicographic tie-break

# ================================================================== #
# Command legality (shared gate; AI and HUD use the same check)
# ================================================================== #

func _is_legal_command(cmd: Command) -> bool:
	var f: Fighter = _fighters.get(cmd.source_id)
	if f == null or not f.can_act():
		return false

	var type_name: String = Command.Type.keys()[int(cmd.type)].to_lower()
	if f.prohibited_commands.has(type_name):
		return false

	match cmd.type:
		Command.Type.ATTACK:
			var tgt: Fighter = _fighters.get(cmd.target_id)
			if tgt == null or not tgt.is_active() or tgt.side == f.side:
				return false
			var weapon := _get_weapon_data(f.held_weapon_id)
			return _get_attack_targets(f, weapon).has(cmd.target_id)

		Command.Type.GUARD:
			return true

		Command.Type.REPOSITION:
			var dest := cmd.target_slot
			if dest.x < 0 or dest.x > 2 or dest.y < 0 or dest.y > 2:
				return false
			var delta := dest - f.slot
			if abs(delta.x) + abs(delta.y) != 1:
				return false   # must be orthogonally adjacent
			return _is_slot_free(dest, f.side)

		Command.Type.ITEM:
			return f.item_ids.has(cmd.item_id)

		Command.Type.STAND_DOWN:
			return _stand_down_available

		Command.Type.AUTO:
			return true   ## AUTO is always legal (triggers _fill_auto_commands)

		Command.Type.WITHDRAW:
			return true

	return false

# ================================================================== #
# Event emission helper
# ================================================================== #

func _emit_event(ev: BattleEvent) -> void:
	_event_log.append(ev.to_dict())
	event_resolved.emit(ev)
	state_changed.emit()

# ================================================================== #
# Serialisation — full battle state for save/replay (gate §1)
# ================================================================== #

func to_dict() -> Dictionary:
	var fighters_out: Dictionary = {}
	for id in _fighters:
		fighters_out[id] = (_fighters[id] as Fighter).to_dict()

	var cover_out: Array = []
	for key in _cover:
		var entry: Dictionary = (_cover[key] as Dictionary).duplicate()
		entry["_key"] = [key.x, key.y, key.z]
		cover_out.append(entry)

	var grid_out: Dictionary = {}
	for key in _grid:
		var k: Vector3i = key
		grid_out["%d,%d,%d" % [k.x, k.y, k.z]] = _grid[key]

	return {
		"battle_id":            battle_id,
		"stage_id":             stage_id,
		"round_number":         round_number,
		"phase":                int(phase),
		"result":               int(result),
		"rng_seed":             _rng_seed,
		"rng_state":            _rng.state,
		"stand_down_available": _stand_down_available,
		"withdrawal_cost":      _withdrawal_cost,
		"fighters":             fighters_out,
		"grid":                 grid_out,
		"cover":                cover_out,
		"event_log":            _event_log,
	}

static func from_dict(d: Dictionary) -> FightManager:
	var fm := FightManager.new()
	fm.battle_id             = d.get("battle_id", "")
	fm.stage_id              = d.get("stage_id", "")
	fm.round_number          = d.get("round_number", 0)
	fm.phase                 = d.get("phase", int(Phase.SETUP)) as Phase
	fm.result                = d.get("result", int(BattleResult.PENDING)) as BattleResult
	fm._rng_seed             = d.get("rng_seed", 0)
	fm._rng.seed             = fm._rng_seed
	fm._rng.state            = d.get("rng_state", 0)
	fm._stand_down_available = d.get("stand_down_available", true)
	fm._withdrawal_cost      = d.get("withdrawal_cost", {})
	fm._event_log            = d.get("event_log", [])

	for id in d.get("fighters", {}):
		fm._fighters[id] = Fighter.from_dict(d.get("fighters", {})[id])

	for key_str in d.get("grid", {}):
		var parts: PackedStringArray = (key_str as String).split(",")
		var key := Vector3i(int(parts[0]), int(parts[1]), int(parts[2]))
		fm._grid[key] = d.get("grid", {})[key_str]

	for entry in d.get("cover", []):
		var k: Array = entry.get("_key", [0, 0, 0])
		var key := Vector3i(k[0], k[1], k[2])
		var prop: Dictionary = (entry as Dictionary).duplicate()
		prop.erase("_key")
		fm._cover[key] = prop

	return fm
