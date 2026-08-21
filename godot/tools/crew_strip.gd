extends Control
const ROLES := ["runner", "muscle", "watcher", "fixer", "driver", "local"]
const HEADS := ["head-kallio-01-v03", "head-kallio-03-v03", "head-kallio-05-v03",
	"head-kallio-07-v03", "head-kallio-09-v03", "head-kallio-11-v03"]
const GEAR := ["", "pipe-v03", "baton-v03", "baseball-bat-v03", "feature-phone-v03", "handgun-v03"]

func _draw() -> void:
	draw_rect(Rect2(Vector2.ZERO, size), MapStyle.LAND)
	var f := PiritoriFonts.ui()
	if not CrewFigure.available():
		draw_string(f, Vector2(20, 40), "no part-layout.json", HORIZONTAL_ALIGNMENT_LEFT, -1, 20, MapStyle.TITLE_TEXT)
		return
	var n := ROLES.size()
	var cw := size.x / n
	for i in range(n):
		var box := Rect2(Vector2(i * cw + 18, 54), Vector2(cw - 36, size.y - 130))
		draw_rect(box, Color(1, 1, 1, 0.03))
		for e in CrewFigure.draw_list(ROLES[i], HEADS[i], GEAR[i], box):
			if e["texture"] != null:
				draw_texture_rect(e["texture"], e["rect"], false)
		draw_string(f, Vector2(i * cw + 22, 34), ROLES[i].to_upper(),
			HORIZONTAL_ALIGNMENT_LEFT, -1, 15, MapStyle.TITLE_TEXT)
		draw_string(f, Vector2(i * cw + 22, size.y - 44), GEAR[i] if GEAR[i] != "" else "(unarmed)",
			HORIZONTAL_ALIGNMENT_LEFT, -1, 12, MapStyle.SMALL_TEXT)
		draw_line(Vector2(i * cw + 18, box.end.y), Vector2(i * cw + cw - 18, box.end.y),
			MapStyle.FRAME_EDGE, 1.0)
