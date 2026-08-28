extends Node

## Dumps FightManager.stance_weight() across every real (Stance, Command.Type)
## pair to a committed JSON fixture.
##
## WHY THIS EXISTS: `COMBAT.md` §6.2 states stance policy in words only —
## "aggressive: take the best attack, accept exposure" — with no numbers. The
## exact multipliers (1.75, 0.45, 0.25, ...) exist in exactly one place,
## `scripts/fight/fight_manager.gd`'s `stance_weight()`, and nowhere else.
## Per DESIGN_AUTHORITY.md's 2026-08-28 ruling the JS build now leads new
## work, and no `battle`/`fight` pure model exists yet in the house pattern
## `market/model.mjs`, `missions/model.mjs` and `people/roster.mjs` already
## use — this is Godot's own real system handing over the one thing it alone
## has: the tuned ground truth, so a future battle model can be built to
## match it exactly rather than re-guessed.
##
## WHAT THIS IS NOT. This table alone does not reproduce stance behaviour.
## `stance_weight()` is a MULTIPLIER on a command-scoring AI
## (`_ai_select_command` / `_score_command` in the same file) that does not
## exist anywhere in the JS build yet — `legacy/js/v3/battle.js`'s
## `autoCommand()` is a 25-line greedy rule (attack if possible, else advance,
## else brace), not a scorer. Porting the table without the scorer it
## multiplies into will not reproduce the behaviour; it will produce numbers
## with nothing to weight. Said here because a JSON file with clean numbers in
## it invites exactly that mistake.
##
## `class_name FightManager` compiles clean on its own, but its file body
## references the ContentRegistry autoload elsewhere, so it cannot load under
## `--script` (no scene tree, no autoloads). Run as a scene instead, the same
## reason every other headless `tools/*.gd` in this project is a Node, not a
## SceneTree script.
##
## Run:
##   godot --headless --path . tools/dump-stance-fixture.tscn
##
## Regenerate whenever stance_weight() changes — this is a snapshot, not a
## live link, and a stale one is worse than none because it looks current.

func _ready() -> void:
	var stances := {
		"aggressive": FightManager.Stance.AGGRESSIVE,
		"defensive": FightManager.Stance.DEFENSIVE,
		"hold_the_line": FightManager.Stance.HOLD_THE_LINE,
	}
	# Every real Command.Type, by name, not by the raw int stance_weight()
	# switches on — an int with no label is exactly the kind of value that
	# silently drifts across a port.
	var types := {
		"attack": FightManager.Command.Type.ATTACK,
		"guard": FightManager.Command.Type.GUARD,
		"reposition": FightManager.Command.Type.REPOSITION,
		"item": FightManager.Command.Type.ITEM,
		"stand_down": FightManager.Command.Type.STAND_DOWN,
		"auto": FightManager.Command.Type.AUTO,
		"withdraw": FightManager.Command.Type.WITHDRAW,
		"mark": FightManager.Command.Type.MARK,
	}
	# stance_weight()'s own match statement only branches on ATTACK, GUARD,
	# REPOSITION and WITHDRAW per stance; everything else falls through to a
	# flat 1.0. Recorded explicitly rather than left to be inferred from the
	# numbers, because "this type isn't weighted yet" and "this type is
	# weighted at exactly 1.0" are different facts that look identical in a
	# table of floats.
	var weighted_types := ["attack", "guard", "reposition", "withdraw"]

	var out := {
		"generated_by": "godot/tools/dump-stance-fixture.gd",
		"generated_from": "scripts/fight/fight_manager.gd stance_weight()",
		"note": "Ground truth only. Multiplying these into a real command " +
			"score is unbuilt in the JS house pattern (market/model.mjs, " +
			"missions/model.mjs, people/roster.mjs) as of 2026-08-28 -- see " +
			"this generator's own header before using this file.",
		"weighted_command_types": weighted_types,
		"stances": {},
	}
	for stance_name in stances:
		var stance_dict := {}
		for type_name in types:
			stance_dict[type_name] = FightManager.stance_weight(
				stances[stance_name], types[type_name])
		out["stances"][stance_name] = stance_dict

	var path := "res://../fixtures/stance-weights.json"
	var f := FileAccess.open(path, FileAccess.WRITE)
	f.store_string(JSON.stringify(out, "  "))
	f.close()
	print("wrote ", ProjectSettings.globalize_path(path))
	for stance_name in stances:
		print("  ", stance_name, ": ", out["stances"][stance_name])
	get_tree().quit()
