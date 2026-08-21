extends Node
## SaveService — persistence at decision boundaries.
##
## GODOT_HANDOFF.md §8: "Save at every non-combat decision boundary and after
## battle resolution. Store schema version, content package id and stable
## authored flags."
##
## The save is the GameState dictionary verbatim, so there is exactly one model
## and no second copy of the campaign to drift.

const SAVE_PATH := "user://piritori-era1-slice.json"

signal saved
signal loaded


func _ready() -> void:
	# Autosave at every decision boundary the model announces.
	GameState.encounter_resolved.connect(_on_boundary)
	GameState.block_advanced.connect(_on_block)


func _on_boundary(_encounter_id: String, _choice_id: String) -> void:
	save_game()


func _on_block(_day: int, _block: String) -> void:
	save_game()


func has_save() -> bool:
	return FileAccess.file_exists(SAVE_PATH)


func save_game() -> bool:
	var f := FileAccess.open(SAVE_PATH, FileAccess.WRITE)
	if f == null:
		push_error("SaveService: cannot write %s (%s)" % [SAVE_PATH, FileAccess.get_open_error()])
		return false
	f.store_string(JSON.stringify(GameState.to_dict(), "\t"))
	f.close()
	saved.emit()
	return true


func load_game() -> bool:
	if not has_save():
		return false
	var text := FileAccess.get_file_as_string(SAVE_PATH)
	var parsed: Variant = JSON.parse_string(text)
	if typeof(parsed) != TYPE_DICTIONARY:
		push_error("SaveService: unparseable save at %s" % SAVE_PATH)
		return false
	if not GameState.from_dict(parsed):
		return false
	loaded.emit()
	return true


func clear_save() -> void:
	if has_save():
		DirAccess.remove_absolute(ProjectSettings.globalize_path(SAVE_PATH))
