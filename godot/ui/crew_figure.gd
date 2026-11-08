class_name CrewFigure
extends RefCounted
## Compatibility API for the paused port. The obsolete modular cast was deleted
## on 2026-11-08; callers retain their neutral fallback instead of loading it.

static func available() -> bool:
	return false

static func draw_list(_role: String, _head_id: String, _equipment_id: String,
		_box: Rect2) -> Array:
	return []
