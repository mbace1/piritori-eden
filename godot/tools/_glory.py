# -*- coding: utf-8 -*-
import io

P = "scripts/fight/fight_manager.gd"
raw = io.open(P, "rb").read().decode("utf-8")
crlf = "\r\n" in raw
s = raw.replace("\r\n", "\n")

# 1. An event the board can decorate.
s = s.replace("		MORALE_WITNESS,       ## Ally downed → nerve loss on witnesses",
              "		MORALE_WITNESS,       ## Ally downed → nerve loss on witnesses\n"
              "		GLORY,                ## A near-death survival or a double kill (§9.11)", 1)

# 2. Detection, at the hit.
anchor = "func _resolve_guard(cmd: Command) -> void:"
block = '''## GLORY (COMBAT.md §9.11) — worth two perk points, and worth seeing.
##
## Two ways to earn it, both moments a player would already be leaning forward:
## putting a second one down in the same round, or being left standing on almost
## nothing.
##
## Detected at the hit rather than counted at settlement, so the board can say so
## while it is still happening. The owner asked for a nicer effect on these, and
## an award nobody notices is not a reward.
const GLORY_NEAR_DEATH_CONDITION := 1

## Downs credited to each fighter this round, for the double.
var _downs_this_round: Dictionary = {}


func _check_glory(attacker: Fighter, target: Fighter) -> void:
	if attacker == null or not attacker.is_player_controlled:
		return
	var cid := attacker.character_id
	if cid == "" or not ContentRegistry.has_crew(cid):
		return

	var earned := ""
	if target != null and target.status == Fighter.Status.DOWNED:
		var n := int(_downs_this_round.get(attacker.fighter_id, 0)) + 1
		_downs_this_round[attacker.fighter_id] = n
		if n >= 2:
			earned = "double"

	# Still up on almost nothing. Checked on the attacker, because the glory is
	# in having swung at all.
	if earned == "" and attacker.is_active() \\
			and attacker.condition <= GLORY_NEAR_DEATH_CONDITION:
		earned = "near-death"

	if earned == "":
		return

	GameState.grant_glory(cid)
	var ev := BattleEvent.new()
	ev.kind = BattleEvent.Kind.GLORY
	ev.source_id = attacker.fighter_id
	ev.detail = earned
	_emit_event(ev)


''' + anchor
assert anchor in s, "resolve_guard not found"
s = s.replace(anchor, block, 1)

old = '''	_update_fighter_status(tgt)

func _resolve_guard'''
new = '''	_update_fighter_status(tgt)
	_check_glory(src, tgt)

func _resolve_guard'''
assert old in s, "status update not found"
s = s.replace(old, new, 1)

# The double is per ROUND, so the tally clears with the round.
old2 = '''	_accrue_heat()

	round_number += 1'''
new2 = '''	_accrue_heat()
	# A double is two in ONE round. Cleared here, or a second kill three rounds
	# later would quietly count.
	_downs_this_round.clear()

	round_number += 1'''
assert old2 in s, "round advance not found"
s = s.replace(old2, new2, 1)

if crlf:
    s = s.replace("\n", "\r\n")
io.open(P, "wb").write(s.encode("utf-8"))
print("glory detected at the hit")
