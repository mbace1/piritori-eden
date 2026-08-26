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
	## the location screen's action row (concept A, owner-approved 2026-08-24):
	## an eye to look closer, a blade for a choice with a cost, a door to leave.
	INFO, RISK, LEAVE,
	## places
	NOODLES, DOCKS, BAR, MARKET, YARD, CHURCH, TRANSIT, HOME,
	PARK, WORKS, BANK, PITCH,
}

var kind: Kind = Kind.ROUTE
var tint: Color = Color.WHITE


func _init(k: Kind = Kind.ROUTE, c: Color = Color.WHITE, px: float = 22.0) -> void:
	kind = k
	tint = c
	custom_minimum_size = Vector2(px, px)
	mouse_filter = Control.MOUSE_FILTER_IGNORE


func _draw() -> void:
	paint(self, size * 0.5, minf(size.x, size.y), tint, kind)


## Draw a pictogram straight onto someone else's canvas.
##
## Added so the map can wear these. A PiritoriIcon is a Control, and a Control
## child draws OVER its parent's `_draw()` — mounting one per pin would put every
## pictogram on top of the labels and routes that are meant to sit above them,
## and would cost thirteen nodes for thirteen shapes. The drawing was never
## really about being a node; it is a shape at a centre and a size.
static func paint(ci: CanvasItem, c: Vector2, s: float, tint: Color, kind: int) -> void:
	var w: float = maxf(s * 0.09, 1.5)


	match kind:
		Kind.ROUTE:
			# three stops joined by a leg — the shape of a planned run
			var a := c + Vector2(-s * 0.32, s * 0.18)
			var b := c + Vector2(-s * 0.02, -s * 0.22)
			var d := c + Vector2(s * 0.32, s * 0.06)
			ci.draw_line(a, b, tint, w, true)
			ci.draw_line(b, d, tint, w, true)
			for p in [a, b, d]:
				ci.draw_circle(p, s * 0.10, tint)
		Kind.CREW:
			# three paper pips shoulder to shoulder
			for off in [-s * 0.26, 0.0, s * 0.26]:
				var head := c + Vector2(off, -s * 0.16)
				ci.draw_circle(head, s * 0.11, tint)
				ci.draw_arc(c + Vector2(off, s * 0.20), s * 0.17, PI, TAU, 14, tint, w, true)
		Kind.MISSION:
			ci.draw_arc(c, s * 0.34, 0, TAU, 32, tint, w, true)
			ci.draw_arc(c, s * 0.19, 0, TAU, 24, tint, w, true)
			ci.draw_circle(c, s * 0.07, tint)
		Kind.END_DAY:
			# hourglass
			var tl := c + Vector2(-s * 0.22, -s * 0.30)
			var tr := c + Vector2(s * 0.22, -s * 0.30)
			var bl := c + Vector2(-s * 0.22, s * 0.30)
			var br := c + Vector2(s * 0.22, s * 0.30)
			ci.draw_line(tl, tr, tint, w, true)
			ci.draw_line(bl, br, tint, w, true)
			ci.draw_line(tl, br, tint, w, true)
			ci.draw_line(tr, bl, tint, w, true)
		Kind.CASH:
			ci.draw_rect(Rect2(c - Vector2(s * 0.32, s * 0.20), Vector2(s * 0.64, s * 0.40)),
				tint, false, w)
			ci.draw_circle(c, s * 0.09, tint)
		Kind.STOCK:
			# a plain abstract pack — never operational detail
			var r := Rect2(c - Vector2(s * 0.26, s * 0.24), Vector2(s * 0.52, s * 0.48))
			ci.draw_rect(r, tint, false, w)
			ci.draw_line(Vector2(r.position.x, c.y), Vector2(r.end.x, c.y), tint, w, true)
		Kind.PRESSURE:
			for i in range(3):
				var rr := s * (0.14 + i * 0.11)
				ci.draw_arc(c + Vector2(0, s * 0.16), rr, PI, TAU, 18, tint, w, true)
		Kind.PEOPLE:
			ci.draw_circle(c + Vector2(0, -s * 0.16), s * 0.13, tint)
			ci.draw_arc(c + Vector2(0, s * 0.22), s * 0.21, PI, TAU, 16, tint, w, true)
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
			ci.draw_polyline(pts + PackedVector2Array([pts[0]]), tint, w, true)
			ci.draw_line(top, c + Vector2(0, s * 0.10), tint, w * 0.7, true)
		Kind.SWAP:
			# Reposition: two arrows trading places.
			var dirs: Array[float] = [1.0, -1.0]
			for dir in dirs:
				var y := c.y + dir * s * 0.16
				var x0 := c.x - dir * s * 0.30
				var x1 := c.x + dir * s * 0.30
				ci.draw_line(Vector2(x0, y), Vector2(x1, y), tint, w, true)
				var head := Vector2(x1, y)
				var back := head - Vector2(dir * s * 0.14, 0)
				ci.draw_line(head, back + Vector2(0, -s * 0.09), tint, w, true)
				ci.draw_line(head, back + Vector2(0, s * 0.09), tint, w, true)
		Kind.STRIKE:
			# Attack: a fist driving forward.
			ci.draw_rect(Rect2(c + Vector2(-s * 0.06, -s * 0.20),
				Vector2(s * 0.30, s * 0.40)), tint, false, w)
			ci.draw_line(c + Vector2(-s * 0.34, 0), c + Vector2(-s * 0.06, 0), tint, w, true)
			for i in range(3):
				var yy := c.y - s * 0.13 + float(i) * s * 0.13
				ci.draw_line(Vector2(c.x + s * 0.06, yy), Vector2(c.x + s * 0.20, yy),
					tint, w * 0.7, true)
		Kind.LOCK:
			ci.draw_rect(Rect2(c - Vector2(s * 0.22, -s * 0.02), Vector2(s * 0.44, s * 0.30)),
				tint, true)
			ci.draw_arc(c + Vector2(0, s * 0.02), s * 0.16, PI, TAU, 16, tint, w, true)
		Kind.INFO:
			# an open eye: look closer
			var left := c + Vector2(-s * 0.32, 0.0)
			var right := c + Vector2(s * 0.32, 0.0)
			var top_lid := PackedVector2Array()
			var bot_lid := PackedVector2Array()
			for i in range(9):
				var t: float = float(i) / 8.0
				var x: float = lerp(left.x, right.x, t)
				var bulge: float = sin(t * PI) * s * 0.20
				top_lid.append(Vector2(x, c.y - bulge))
				bot_lid.append(Vector2(x, c.y + bulge))
			ci.draw_polyline(top_lid, tint, w, true)
			ci.draw_polyline(bot_lid, tint, w, true)
			ci.draw_circle(c, s * 0.09, tint)
		Kind.RISK:
			# a blade, angled across the corner — the choice that costs something
			var tip := c + Vector2(s * 0.32, -s * 0.30)
			var heel := c + Vector2(-s * 0.06, s * 0.10)
			var grip := c + Vector2(-s * 0.30, s * 0.30)
			ci.draw_line(tip, heel, tint, w * 1.4, true)
			ci.draw_line(heel, grip, tint, w, true)
			var guard: Vector2 = (heel - tip).normalized().orthogonal() * s * 0.10
			ci.draw_line(heel - guard, heel + guard, tint, w, true)
		Kind.LEAVE:
			# an open door frame with an arrow passing through it — the way out
			ci.draw_line(c + Vector2(-s * 0.16, -s * 0.32), c + Vector2(-s * 0.16, s * 0.32),
				tint, w, true)
			ci.draw_line(c + Vector2(-s * 0.16, -s * 0.32), c + Vector2(s * 0.10, -s * 0.32),
				tint, w, true)
			ci.draw_line(c + Vector2(-s * 0.16, s * 0.32), c + Vector2(s * 0.10, s * 0.32),
				tint, w, true)
			var ay: float = c.y
			ci.draw_line(Vector2(c.x - s * 0.06, ay), Vector2(c.x + s * 0.34, ay), tint, w, true)
			ci.draw_line(Vector2(c.x + s * 0.34, ay), Vector2(c.x + s * 0.18, ay - s * 0.14),
				tint, w, true)
			ci.draw_line(Vector2(c.x + s * 0.34, ay), Vector2(c.x + s * 0.18, ay + s * 0.14),
				tint, w, true)
		# ── places ──────────────────────────────────────────────────────────
		Kind.NOODLES:
			# a bowl with steam: Toko's, and any food front
			ci.draw_arc(c + Vector2(0, -s * 0.02), s * 0.30, 0, PI, 24, tint, w, true)
			ci.draw_line(c + Vector2(-s * 0.30, -s * 0.02), c + Vector2(s * 0.30, -s * 0.02),
				tint, w, true)
			for dx: float in [-s * 0.12, 0.0, s * 0.12]:
				ci.draw_line(c + Vector2(dx, -s * 0.16), c + Vector2(dx, -s * 0.34),
					tint, w * 0.7, true)
		Kind.DOCKS:
			# stacked crates above a quay line
			ci.draw_rect(Rect2(c + Vector2(-s * 0.30, -s * 0.04), Vector2(s * 0.26, s * 0.26)),
				tint, false, w)
			ci.draw_rect(Rect2(c + Vector2(0.0, -s * 0.04), Vector2(s * 0.26, s * 0.26)),
				tint, false, w)
			ci.draw_rect(Rect2(c + Vector2(-s * 0.16, -s * 0.30), Vector2(s * 0.26, s * 0.26)),
				tint, false, w)
			ci.draw_line(c + Vector2(-s * 0.36, s * 0.28), c + Vector2(s * 0.36, s * 0.28),
				tint, w, true)
		Kind.BAR:
			# a glass: the McCormick places, and where a retiree is found (§9.8)
			ci.draw_line(c + Vector2(-s * 0.24, -s * 0.28), c + Vector2(s * 0.24, -s * 0.28),
				tint, w, true)
			ci.draw_line(c + Vector2(-s * 0.24, -s * 0.28), c + Vector2(0, s * 0.10), tint, w, true)
			ci.draw_line(c + Vector2(s * 0.24, -s * 0.28), c + Vector2(0, s * 0.10), tint, w, true)
			ci.draw_line(c + Vector2(0, s * 0.10), c + Vector2(0, s * 0.28), tint, w, true)
			ci.draw_line(c + Vector2(-s * 0.16, s * 0.30), c + Vector2(s * 0.16, s * 0.30),
				tint, w, true)
		Kind.MARKET:
			# an awning over a counter
			for k: int in range(4):
				var x0: float = -s * 0.32 + k * s * 0.16
				ci.draw_arc(c + Vector2(x0 + s * 0.08, -s * 0.10), s * 0.08, PI, TAU, 10,
					tint, w, true)
			ci.draw_line(c + Vector2(-s * 0.34, -s * 0.10), c + Vector2(s * 0.34, -s * 0.10),
				tint, w, true)
			ci.draw_line(c + Vector2(-s * 0.26, -s * 0.10), c + Vector2(-s * 0.26, s * 0.30),
				tint, w, true)
			ci.draw_line(c + Vector2(s * 0.26, -s * 0.10), c + Vector2(s * 0.26, s * 0.30),
				tint, w, true)
		Kind.YARD:
			# a courtyard, open at one side — where fights happen
			ci.draw_line(c + Vector2(-s * 0.30, -s * 0.28), c + Vector2(s * 0.30, -s * 0.28),
				tint, w, true)
			ci.draw_line(c + Vector2(-s * 0.30, -s * 0.28), c + Vector2(-s * 0.30, s * 0.28),
				tint, w, true)
			ci.draw_line(c + Vector2(s * 0.30, -s * 0.28), c + Vector2(s * 0.30, s * 0.28),
				tint, w, true)
			ci.draw_line(c + Vector2(-s * 0.30, s * 0.28), c + Vector2(-s * 0.06, s * 0.28),
				tint, w, true)
			ci.draw_line(c + Vector2(s * 0.30, s * 0.28), c + Vector2(s * 0.06, s * 0.28),
				tint, w, true)
		Kind.CHURCH:
			# Kallion kirkko: the orientation landmark
			ci.draw_line(c + Vector2(0, -s * 0.34), c + Vector2(0, s * 0.30), tint, w, true)
			ci.draw_line(c + Vector2(-s * 0.12, -s * 0.20), c + Vector2(s * 0.12, -s * 0.20),
				tint, w, true)
			ci.draw_line(c + Vector2(-s * 0.24, s * 0.30), c + Vector2(0, s * 0.02), tint, w, true)
			ci.draw_line(c + Vector2(s * 0.24, s * 0.30), c + Vector2(0, s * 0.02), tint, w, true)
		Kind.TRANSIT:
			# a tram: the public way, and the slow safe route (MAP.md §12)
			ci.draw_rect(Rect2(c + Vector2(-s * 0.24, -s * 0.30), Vector2(s * 0.48, s * 0.46)),
				tint, false, w)
			ci.draw_line(c + Vector2(-s * 0.24, -s * 0.06), c + Vector2(s * 0.24, -s * 0.06),
				tint, w * 0.7, true)
			ci.draw_circle(c + Vector2(-s * 0.13, s * 0.24), s * 0.06, tint)
			ci.draw_circle(c + Vector2(s * 0.13, s * 0.24), s * 0.06, tint)
			ci.draw_line(c + Vector2(0, -s * 0.30), c + Vector2(0, -s * 0.40), tint, w * 0.7, true)
		Kind.HOME:
			# a door under a roof: Torkkelinmäki, and anywhere somebody lives
			ci.draw_line(c + Vector2(-s * 0.32, -s * 0.02), c + Vector2(0, -s * 0.32), tint, w, true)
			ci.draw_line(c + Vector2(s * 0.32, -s * 0.02), c + Vector2(0, -s * 0.32), tint, w, true)
			ci.draw_rect(Rect2(c + Vector2(-s * 0.22, -s * 0.02), Vector2(s * 0.44, s * 0.32)),
				tint, false, w)
			ci.draw_line(c + Vector2(s * 0.06, s * 0.14), c + Vector2(s * 0.12, s * 0.14),
				tint, w * 0.8, true)
		Kind.PARK:
			# a tree over a bench — Karhupuisto, where people sit and talk
			ci.draw_line(c + Vector2(0, -s * 0.04), c + Vector2(0, s * 0.14), tint, w, true)
			ci.draw_arc(c + Vector2(0, -s * 0.10), s * 0.26, PI * 0.9, TAU * 1.05, 22,
				tint, w, true)
			ci.draw_line(c + Vector2(-s * 0.30, s * 0.22), c + Vector2(s * 0.30, s * 0.22),
				tint, w, true)
			ci.draw_line(c + Vector2(-s * 0.22, s * 0.22), c + Vector2(-s * 0.22, s * 0.34),
				tint, w * 0.7, true)
			ci.draw_line(c + Vector2(s * 0.22, s * 0.22), c + Vector2(s * 0.22, s * 0.34),
				tint, w * 0.7, true)
		Kind.WORKS:
			# two chimneys on a shed — Vallila, the workshops that were here first
			ci.draw_rect(Rect2(c + Vector2(-s * 0.34, s * 0.00), Vector2(s * 0.68, s * 0.30)),
				tint, false, w)
			ci.draw_line(c + Vector2(-s * 0.16, s * 0.00), c + Vector2(-s * 0.16, -s * 0.30),
				tint, w, true)
			ci.draw_line(c + Vector2(s * 0.10, s * 0.00), c + Vector2(s * 0.10, -s * 0.18),
				tint, w, true)
		Kind.BANK:
			# a counter under a pediment: money handled by somebody in uniform
			ci.draw_line(c + Vector2(-s * 0.36, -s * 0.14), c + Vector2(0, -s * 0.32),
				tint, w, true)
			ci.draw_line(c + Vector2(s * 0.36, -s * 0.14), c + Vector2(0, -s * 0.32),
				tint, w, true)
			ci.draw_line(c + Vector2(-s * 0.34, -s * 0.10), c + Vector2(s * 0.34, -s * 0.10),
				tint, w, true)
			for k: int in range(3):
				var bx: float = -s * 0.22 + k * s * 0.22
				ci.draw_line(c + Vector2(bx, -s * 0.06), c + Vector2(bx, s * 0.22),
					tint, w * 0.8, true)
			ci.draw_line(c + Vector2(-s * 0.34, s * 0.28), c + Vector2(s * 0.34, s * 0.28),
				tint, w, true)
		Kind.PITCH:
			# a goal on a gravel field — Harju, where the young men are
			ci.draw_rect(Rect2(c + Vector2(-s * 0.34, -s * 0.26), Vector2(s * 0.68, s * 0.52)),
				tint, false, w)
			ci.draw_line(c + Vector2(0, -s * 0.26), c + Vector2(0, s * 0.26), tint, w * 0.7, true)
			ci.draw_arc(c, s * 0.12, 0, TAU, 18, tint, w * 0.7, true)
