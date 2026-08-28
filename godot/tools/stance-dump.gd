extends Node
## Dumps FightManager.stance_weight() across every (stance, command type)
## pair as the reference fixture port/vectors/stance.json checks
## web/js/v3/stance.js's stanceWeight() against.
##
## Same reversed-direction pattern as godot/tools/chrome-dump.gd: the Godot
## side is canonical here (COMBAT.md's stance rules are authored in
## fight_manager.gd), and the web/ port has to keep matching it, not the
## other way round. Re-run and re-commit port/vectors/stance.json whenever
## FightManager.stance_weight() changes.
##
##   godot --headless --path . tools/stance_dump.tscn
##   node port/stance-vectors.mjs            # regenerate the fixture instead
##   node port/stance-vectors.mjs --check     # the gate
##
## A Node in a .tscn, not a bare `extends SceneTree` script — the same
## resolution difference chrome-dump.gd/capture_battle.gd already settled on.
## A raw `--script` invocation compiles fight_manager.gd before autoloads are
## necessarily live, and one unrelated method elsewhere in that 2230-line
## file (_perk(), never called here) references the ContentRegistry autoload
## and throws a compile-time error even though it changes nothing about
## stance_weight()'s own output. Booting through a real scene avoids it.

const STANCES := ["AGGRESSIVE", "DEFENSIVE", "HOLD_THE_LINE"]
const TYPES := ["ATTACK", "GUARD", "REPOSITION", "ITEM", "STAND_DOWN", "AUTO", "WITHDRAW", "MARK"]

func _ready() -> void:
	var fm := preload("res://scripts/fight/fight_manager.gd")
	var rows := {}
	for s in STANCES:
		var stance_val: int = fm.Stance[s]
		var row := {}
		for t in TYPES:
			var type_val: int = fm.Command.Type[t]
			row[t] = fm.stance_weight(stance_val, type_val)
		rows[s] = row

	var json := JSON.stringify({
		"model": "stance",
		"source": "godot/scripts/fight/fight_manager.gd FightManager.stance_weight()",
		"note": "Regenerate with godot/tools/stance-dump.gd whenever stance_weight() changes.",
		"rows": rows,
	}, "  ")

	var project_root: String = ProjectSettings.globalize_path("res://")
	if project_root.ends_with("/"):
		project_root = project_root.substr(0, project_root.length() - 1)
	var repo_root: String = project_root.get_base_dir()
	var out_path: String = repo_root.path_join("port/vectors/stance.json")
	var f := FileAccess.open(out_path, FileAccess.WRITE)
	if f == null:
		print("FileAccess.open FAILED: %s" % error_string(FileAccess.get_open_error()))
		get_tree().quit(1)
		return
	f.store_string(json)
	f.close()
	print("wrote %s" % out_path)
	get_tree().quit()
