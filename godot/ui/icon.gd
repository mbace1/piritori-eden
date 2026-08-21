extends Control
class_name PiritoriIcon
## Small vector icons drawn in code, in the map's own material family.
##
## ART_BIBLE §4.2: colour never carries a rule alone. These are the glyph half
## of every coloured control, so a command is identifiable without its tint.

enum Kind { ROUTE, CREW, MISSION, END_DAY, CASH, STOCK, PRESSURE, PEOPLE, LOCK }

var kind: Kind = Kind.ROUTE
var tint: Color = Color.WHITE


func _init(k: Kind = Kind.ROUTE, c: Color = Color.WHITE, px: float = 22.0) -> void:
	kind = k
	tint = c
	custom_minimum_size = Vector2(px, px)
	mouse_filter = Control.MOUSE_FILTER_IGNORE


func _draw() -> void:
	var s: float = minf(size.x, size.y)
	var c := size * 0.5
	var w: float = maxf(s * 0.09, 1.5)

	match kind:
		Kind.ROUTE:
			# three stops joined by a leg — the shape of a planned run
			var a := c + Vector2(-s * 0.32, s * 0.18)
			var b := c + Vector2(-s * 0.02, -s * 0.22)
			var d := c + Vector2(s * 0.32, s * 0.06)
			draw_line(a, b, tint, w, true)
			draw_line(b, d, tint, w, true)
			for p in [a, b, d]:
				draw_circle(p, s * 0.10, tint)
		Kind.CREW:
			# three paper pips shoulder to shoulder
			for off in [-s * 0.26, 0.0, s * 0.26]:
				var head := c + Vector2(off, -s * 0.16)
				draw_circle(head, s * 0.11, tint)
				draw_arc(c + Vector2(off, s * 0.20), s * 0.17, PI, TAU, 14, tint, w, true)
		Kind.MISSION:
			draw_arc(c, s * 0.34, 0, TAU, 32, tint, w, true)
			draw_arc(c, s * 0.19, 0, TAU, 24, tint, w, true)
			draw_circle(c, s * 0.07, tint)
		Kind.END_DAY:
			# hourglass
			var tl := c + Vector2(-s * 0.22, -s * 0.30)
			var tr := c + Vector2(s * 0.22, -s * 0.30)
			var bl := c + Vector2(-s * 0.22, s * 0.30)
			var br := c + Vector2(s * 0.22, s * 0.30)
			draw_line(tl, tr, tint, w, true)
			draw_line(bl, br, tint, w, true)
			draw_line(tl, br, tint, w, true)
			draw_line(tr, bl, tint, w, true)
		Kind.CASH:
			draw_rect(Rect2(c - Vector2(s * 0.32, s * 0.20), Vector2(s * 0.64, s * 0.40)),
				tint, false, w)
			draw_circle(c, s * 0.09, tint)
		Kind.STOCK:
			# a plain abstract pack — never operational detail
			var r := Rect2(c - Vector2(s * 0.26, s * 0.24), Vector2(s * 0.52, s * 0.48))
			draw_rect(r, tint, false, w)
			draw_line(Vector2(r.position.x, c.y), Vector2(r.end.x, c.y), tint, w, true)
		Kind.PRESSURE:
			for i in range(3):
				var rr := s * (0.14 + i * 0.11)
				draw_arc(c + Vector2(0, s * 0.16), rr, PI, TAU, 18, tint, w, true)
		Kind.PEOPLE:
			draw_circle(c + Vector2(0, -s * 0.16), s * 0.13, tint)
			draw_arc(c + Vector2(0, s * 0.22), s * 0.21, PI, TAU, 16, tint, w, true)
		Kind.LOCK:
			draw_rect(Rect2(c - Vector2(s * 0.22, -s * 0.02), Vector2(s * 0.44, s * 0.30)),
				tint, true)
			draw_arc(c + Vector2(0, s * 0.02), s * 0.16, PI, TAU, 16, tint, w, true)
