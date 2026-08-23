extends Control
class_name PiritoriIcon
## Small vector icons drawn in code, in the map's own material family.
##
## ART_BIBLE §4.2: colour never carries a rule alone. These are the glyph half
## of every coloured control, so a command is identifiable without its tint.

## The interface set, then the PLACE set.
##
## The second group are pictograms for map pins. They are per-SITE, not per-role
## — which is the whole reason they can exist: twenty-five anchor roles onto
## twelve generic icons would have been arbitrary symbolism, but a noodle bar, a
## dock and a bar are specific things that draw themselves.
##
## Vectors rather than art: no credits, any pin size, and they take the tint.
enum Kind {
	ROUTE, CREW, MISSION, END_DAY, CASH, STOCK, PRESSURE, PEOPLE, LOCK, SHIELD,
	SWAP, STRIKE,
	## places
	NOODLES, DOCKS, BAR, MARKET, YARD, CHURCH, TRANSIT, HOME,
}

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
		Kind.SHIELD:
			# Brace: a shield, cracked once so it reads as taking a hit.
			var top := c + Vector2(0, -s * 0.34)
			var pts := PackedVector2Array([
				top,
				c + Vector2(s * 0.30, -s * 0.20),
				c + Vector2(s * 0.24, s * 0.16),
				c + Vector2(0, s * 0.38),
				c + Vector2(-s * 0.24, s * 0.16),
				c + Vector2(-s * 0.30, -s * 0.20),
			])
			draw_polyline(pts + PackedVector2Array([pts[0]]), tint, w, true)
			draw_line(top, c + Vector2(0, s * 0.10), tint, w * 0.7, true)
		Kind.SWAP:
			# Reposition: two arrows trading places.
			var dirs: Array[float] = [1.0, -1.0]
			for dir in dirs:
				var y := c.y + dir * s * 0.16
				var x0 := c.x - dir * s * 0.30
				var x1 := c.x + dir * s * 0.30
				draw_line(Vector2(x0, y), Vector2(x1, y), tint, w, true)
				var head := Vector2(x1, y)
				var back := head - Vector2(dir * s * 0.14, 0)
				draw_line(head, back + Vector2(0, -s * 0.09), tint, w, true)
				draw_line(head, back + Vector2(0, s * 0.09), tint, w, true)
		Kind.STRIKE:
			# Attack: a fist driving forward.
			draw_rect(Rect2(c + Vector2(-s * 0.06, -s * 0.20),
				Vector2(s * 0.30, s * 0.40)), tint, false, w)
			draw_line(c + Vector2(-s * 0.34, 0), c + Vector2(-s * 0.06, 0), tint, w, true)
			for i in range(3):
				var yy := c.y - s * 0.13 + float(i) * s * 0.13
				draw_line(Vector2(c.x + s * 0.06, yy), Vector2(c.x + s * 0.20, yy),
					tint, w * 0.7, true)
		Kind.LOCK:
			draw_rect(Rect2(c - Vector2(s * 0.22, -s * 0.02), Vector2(s * 0.44, s * 0.30)),
				tint, true)
			draw_arc(c + Vector2(0, s * 0.02), s * 0.16, PI, TAU, 16, tint, w, true)
		# ── places ──────────────────────────────────────────────────────────
		Kind.NOODLES:
			# a bowl with steam: Toko's, and any food front
			draw_arc(c + Vector2(0, -s * 0.02), s * 0.30, 0, PI, 24, tint, w, true)
			draw_line(c + Vector2(-s * 0.30, -s * 0.02), c + Vector2(s * 0.30, -s * 0.02),
				tint, w, true)
			for dx: float in [-s * 0.12, 0.0, s * 0.12]:
				draw_line(c + Vector2(dx, -s * 0.16), c + Vector2(dx, -s * 0.34),
					tint, w * 0.7, true)
		Kind.DOCKS:
			# stacked crates above a quay line
			draw_rect(Rect2(c + Vector2(-s * 0.30, -s * 0.04), Vector2(s * 0.26, s * 0.26)),
				tint, false, w)
			draw_rect(Rect2(c + Vector2(0.0, -s * 0.04), Vector2(s * 0.26, s * 0.26)),
				tint, false, w)
			draw_rect(Rect2(c + Vector2(-s * 0.16, -s * 0.30), Vector2(s * 0.26, s * 0.26)),
				tint, false, w)
			draw_line(c + Vector2(-s * 0.36, s * 0.28), c + Vector2(s * 0.36, s * 0.28),
				tint, w, true)
		Kind.BAR:
			# a glass: the McCormick places, and where a retiree is found (§9.8)
			draw_line(c + Vector2(-s * 0.24, -s * 0.28), c + Vector2(s * 0.24, -s * 0.28),
				tint, w, true)
			draw_line(c + Vector2(-s * 0.24, -s * 0.28), c + Vector2(0, s * 0.10), tint, w, true)
			draw_line(c + Vector2(s * 0.24, -s * 0.28), c + Vector2(0, s * 0.10), tint, w, true)
			draw_line(c + Vector2(0, s * 0.10), c + Vector2(0, s * 0.28), tint, w, true)
			draw_line(c + Vector2(-s * 0.16, s * 0.30), c + Vector2(s * 0.16, s * 0.30),
				tint, w, true)
		Kind.MARKET:
			# an awning over a counter
			for k: int in range(4):
				var x0: float = -s * 0.32 + k * s * 0.16
				draw_arc(c + Vector2(x0 + s * 0.08, -s * 0.10), s * 0.08, PI, TAU, 10,
					tint, w, true)
			draw_line(c + Vector2(-s * 0.34, -s * 0.10), c + Vector2(s * 0.34, -s * 0.10),
				tint, w, true)
			draw_line(c + Vector2(-s * 0.26, -s * 0.10), c + Vector2(-s * 0.26, s * 0.30),
				tint, w, true)
			draw_line(c + Vector2(s * 0.26, -s * 0.10), c + Vector2(s * 0.26, s * 0.30),
				tint, w, true)
		Kind.YARD:
			# a courtyard, open at one side — where fights happen
			draw_line(c + Vector2(-s * 0.30, -s * 0.28), c + Vector2(s * 0.30, -s * 0.28),
				tint, w, true)
			draw_line(c + Vector2(-s * 0.30, -s * 0.28), c + Vector2(-s * 0.30, s * 0.28),
				tint, w, true)
			draw_line(c + Vector2(s * 0.30, -s * 0.28), c + Vector2(s * 0.30, s * 0.28),
				tint, w, true)
			draw_line(c + Vector2(-s * 0.30, s * 0.28), c + Vector2(-s * 0.06, s * 0.28),
				tint, w, true)
			draw_line(c + Vector2(s * 0.30, s * 0.28), c + Vector2(s * 0.06, s * 0.28),
				tint, w, true)
		Kind.CHURCH:
			# Kallion kirkko: the orientation landmark
			draw_line(c + Vector2(0, -s * 0.34), c + Vector2(0, s * 0.30), tint, w, true)
			draw_line(c + Vector2(-s * 0.12, -s * 0.20), c + Vector2(s * 0.12, -s * 0.20),
				tint, w, true)
			draw_line(c + Vector2(-s * 0.24, s * 0.30), c + Vector2(0, s * 0.02), tint, w, true)
			draw_line(c + Vector2(s * 0.24, s * 0.30), c + Vector2(0, s * 0.02), tint, w, true)
		Kind.TRANSIT:
			# a tram: the public way, and the slow safe route (MAP.md §12)
			draw_rect(Rect2(c + Vector2(-s * 0.24, -s * 0.30), Vector2(s * 0.48, s * 0.46)),
				tint, false, w)
			draw_line(c + Vector2(-s * 0.24, -s * 0.06), c + Vector2(s * 0.24, -s * 0.06),
				tint, w * 0.7, true)
			draw_circle(c + Vector2(-s * 0.13, s * 0.24), s * 0.06, tint)
			draw_circle(c + Vector2(s * 0.13, s * 0.24), s * 0.06, tint)
			draw_line(c + Vector2(0, -s * 0.30), c + Vector2(0, -s * 0.40), tint, w * 0.7, true)
		Kind.HOME:
			# a door under a roof: Torkkelinmäki, and anywhere somebody lives
			draw_line(c + Vector2(-s * 0.32, -s * 0.02), c + Vector2(0, -s * 0.32), tint, w, true)
			draw_line(c + Vector2(s * 0.32, -s * 0.02), c + Vector2(0, -s * 0.32), tint, w, true)
			draw_rect(Rect2(c + Vector2(-s * 0.22, -s * 0.02), Vector2(s * 0.44, s * 0.32)),
				tint, false, w)
			draw_line(c + Vector2(s * 0.06, s * 0.14), c + Vector2(s * 0.12, s * 0.14),
				tint, w * 0.8, true)
