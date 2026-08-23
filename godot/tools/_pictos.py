# -*- coding: utf-8 -*-
import io

P = "ui/icon.gd"
raw = io.open(P, "rb").read().decode("utf-8")
crlf = "\r\n" in raw
s = raw.replace("\r\n", "\n")

old = "enum Kind { ROUTE, CREW, MISSION, END_DAY, CASH, STOCK, PRESSURE, PEOPLE, LOCK, SHIELD, SWAP, STRIKE }"
new = '''## The interface set, then the PLACE set.
##
## The second group are pictograms for map pins. They are per-SITE, not per-role
## — which is the whole reason they can exist: twenty-five anchor roles onto
## twelve generic icons would have been arbitrary symbolism, but a noodle bar, a
## dock and a bar are six specific things that draw themselves.
##
## Vectors rather than art, so they cost nothing, scale to any pin size and
## recolour with the tint.
enum Kind {
	ROUTE, CREW, MISSION, END_DAY, CASH, STOCK, PRESSURE, PEOPLE, LOCK, SHIELD,
	SWAP, STRIKE,
	## places
	NOODLES, DOCKS, BAR, MARKET, YARD, CHURCH, TRANSIT, HOME,
}'''
assert old in s, "Kind enum not found"
s = s.replace(old, new, 1)

# The drawings, appended to the match. Find the end of the match block by
# locating the last existing case and adding before the function ends.
marker = "		Kind.STRIKE:"
i = s.index(marker)
j = s.index("\n\n", i)
block = '''

		# ── places ──────────────────────────────────────────────────────────
		Kind.NOODLES:
			# a bowl with steam: Toko's, and any food front
			draw_arc(c + Vector2(0, -s * 0.02), s * 0.30, 0, PI, 24, tint, w, true)
			draw_line(c + Vector2(-s * 0.30, -s * 0.02), c + Vector2(s * 0.30, -s * 0.02),
				tint, w, true)
			for dx in [-s * 0.12, 0.0, s * 0.12]:
				draw_line(c + Vector2(dx, -s * 0.16), c + Vector2(dx, -s * 0.34), tint, w * 0.7, true)
		Kind.DOCKS:
			# stacked crates on a quay line
			draw_rect(Rect2(c + Vector2(-s * 0.30, -s * 0.04), Vector2(s * 0.26, s * 0.26)),
				tint, false, w)
			draw_rect(Rect2(c + Vector2(0.0, -s * 0.04), Vector2(s * 0.26, s * 0.26)),
				tint, false, w)
			draw_rect(Rect2(c + Vector2(-s * 0.16, -s * 0.30), Vector2(s * 0.26, s * 0.26)),
				tint, false, w)
			draw_line(c + Vector2(-s * 0.36, s * 0.28), c + Vector2(s * 0.36, s * 0.28),
				tint, w, true)
		Kind.BAR:
			# a glass: the McCormick places, and where retired crew are found
			draw_line(c + Vector2(-s * 0.24, -s * 0.28), c + Vector2(s * 0.24, -s * 0.28),
				tint, w, true)
			draw_line(c + Vector2(-s * 0.24, -s * 0.28), c + Vector2(0, s * 0.10), tint, w, true)
			draw_line(c + Vector2(s * 0.24, -s * 0.28), c + Vector2(0, s * 0.10), tint, w, true)
			draw_line(c + Vector2(0, s * 0.10), c + Vector2(0, s * 0.28), tint, w, true)
			draw_line(c + Vector2(-s * 0.16, s * 0.30), c + Vector2(s * 0.16, s * 0.30),
				tint, w, true)
		Kind.MARKET:
			# an awning over a counter
			for k in range(4):
				var x0: float = -s * 0.32 + k * s * 0.16
				draw_arc(c + Vector2(x0 + s * 0.08, -s * 0.10), s * 0.08, PI, TAU, 10, tint, w, true)
			draw_line(c + Vector2(-s * 0.34, -s * 0.10), c + Vector2(s * 0.34, -s * 0.10),
				tint, w, true)
			draw_line(c + Vector2(-s * 0.26, -s * 0.10), c + Vector2(-s * 0.26, s * 0.30),
				tint, w, true)
			draw_line(c + Vector2(s * 0.26, -s * 0.10), c + Vector2(s * 0.26, s * 0.30),
				tint, w, true)
		Kind.YARD:
			# a walled courtyard, open at one side — where fights happen
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
			# a tram: the public way, and the slow safe route
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
'''
s = s[:j] + block + s[j:]

if crlf:
    s = s.replace("\n", "\r\n")
io.open(P, "wb").write(s.encode("utf-8"))
print("eight place pictograms added")
