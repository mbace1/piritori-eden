extends Control
## Compatibility capture for the paused port. Deleted modular art is not loaded.
const ROLES := ["runner", "muscle", "watcher", "fixer", "driver", "local"]

func _draw() -> void:
	draw_rect(Rect2(Vector2.ZERO, size), MapStyle.LAND)
	var font := PiritoriFonts.ui()
	for i in range(ROLES.size()):
		var x := 20.0 + i * size.x / ROLES.size()
		draw_string(font, Vector2(x, 40), ROLES[i].to_upper(), HORIZONTAL_ALIGNMENT_LEFT, -1, 15, MapStyle.TITLE_TEXT)
