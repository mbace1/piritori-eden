extends Control
## The street at Piritori, at night, in the rain — drawn in code, no image.
##
## The web's arrival (v4.59, reworked as Kallio noir in v4.60) is drawn in CSS:
## `web/lantern.css` `.opening-scene`. This is the same picture in `_draw()`,
## measured off the same percentages, so the two builds show one street:
## a sodium-brown sky with the Tokon Ramen sign's red in it, three dark blocks
## with lit windows, a tram wire, the PIRITORI stop with its green 3, a bin bag,
## the man in the fur hat rimmed in the sign's red, a puddle holding the tram's
## light, the 3 itself, Aatami lit amber on one side and cold on the other, rain,
## a grime film and a vignette.
##
## Two users: the arrival plays the tram in and Aatami off it on a timeline; the
## road screen stands the same street behind what happens on the way. The rule
## from the arcade's covers holds for both — a black figure on a dark scene is
## not there at all, so every figure carries a lit rim.

enum Tram { NONE, ARRIVING, STANDING }
enum Figure { NONE, STEPPING, STANDING }

## Seconds into the timeline. Advanced by `_process` unless `still`.
var t := 0.0
var tram: Tram = Tram.STANDING
var figure: Figure = Figure.STANDING
## One frame, held: the timeline is read at its end and nothing moves.
var still := false
## The stop's plate. The arrival is Piritori; the road stands the same street
## at wherever it happened, and a transit leg has no stop of its own ("").
var stop_label := "PIRITORI"
## The Tokon Ramen sign is Piritori's and Vaasankatu's, not every corner's.
var show_sign := true
## The man in the fur hat waits at Piritori; the road does not bring him along.
var show_npc := true
## How much the fixed-size details (lettering, plates, rain) grow: a phone held
## upright reads the whole interface bigger (PiritoriFonts.text_scale), and a
## sign that stays desktop-sized there is a smudge.
var ds := 1.0

const SKY_TOP := Color("#0b0c0d")
const SKY_MID := Color("#16150f")
const SKY_LOW := Color("#1d1a14")
const BLOCK := Color("#0d1116")
const BLOCK_B := Color("#10151b")
const WINDOW := Color("#f2a44c")
const SIGN_RED := Color("#d63a3a")
const SIGN_TEXT := Color("#ff7a6b")
const SIGN_WARM := Color("#f2c27a")
const TRAM_GREEN := Color("#2c8a4a")
const TRAM_CREAM := Color("#e3dcc6")
const YOU_RIM := Color(0.384, 0.831, 0.875, 0.8)

## The tram's timeline (web `opTram` 3.2 s, doors at 3.3 s, Aatami at 3.8 s).
const TRAM_IN := 3.2
const DOOR_AT := 3.3
const STEP_AT := 3.8
const STEP_FOR := 1.6


func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	clip_contents = true


func _process(delta: float) -> void:
	if still:
		return
	# A long first frame (shaders compiling, a slow device) must not jump the
	# tram to the stop before anyone sees it move.
	t += minf(delta, 0.1)
	queue_redraw()


## The end of the timeline: tram in, doors open, Aatami off.
func settle() -> void:
	t = STEP_AT + STEP_FOR + 1.0
	queue_redraw()


func _ease_tram(k: float) -> float:
	# cubic-bezier(.12,.7,.25,1) — a fast arrival that brakes into the stop.
	return 1.0 - pow(1.0 - clampf(k, 0.0, 1.0), 3.0)


func _draw() -> void:
	var w := size.x
	var h := size.y
	if w <= 1.0 or h <= 1.0:
		return
	var time := t if not still else STEP_AT + STEP_FOR + 1.0
	_draw_sky(w, h)
	_draw_blocks(w, h)
	# the tram wire
	draw_line(Vector2(0, h * 0.30), Vector2(w, h * 0.30), Color(0.63, 0.71, 0.75, 0.35), 1.0)
	_draw_street(w, h)
	if show_sign:
		_draw_sign(w, h, time)
	if stop_label != "":
		_draw_stop(w, h)
	_draw_puddle(w, h)
	if show_npc:
		_draw_bag(w, h)
		_draw_npc(w, h)
	if tram != Tram.NONE:
		_draw_tram(w, h, time)
	if figure != Figure.NONE:
		_draw_figure(w, h, time)
	_draw_rain(w, h, time)
	_draw_film(w, h)


func _draw_sky(w: float, h: float) -> void:
	var bands := 48
	for i in bands:
		var k := float(i) / float(bands - 1)
		var c := SKY_TOP.lerp(SKY_MID, k / 0.7) if k < 0.7 else SKY_MID.lerp(SKY_LOW, (k - 0.7) / 0.3)
		draw_rect(Rect2(0, h * float(i) / bands, w, h / bands + 1.0), c)
	# The sign's red bleeding into the wet air, and the tram's amber low down.
	_glow(Vector2(w * 0.20, h * 0.45), maxf(w, h) * 0.40, Color(0.84, 0.23, 0.23, 0.16))
	_glow(Vector2(w * 0.70, h * 1.10), maxf(w, h) * 0.55, Color(0.95, 0.64, 0.30, 0.22))


## A soft radial light: stacked discs, each adding a little.
func _glow(at: Vector2, r: float, c: Color) -> void:
	var steps := 14
	for i in steps:
		var k := 1.0 - float(i) / float(steps)
		draw_circle(at, r * k, Color(c.r, c.g, c.b, c.a / float(steps) * 1.6))


func _draw_blocks(w: float, h: float) -> void:
	var ground := h * 0.78
	for spec in [[-0.02, 0.34, 0.58, BLOCK], [0.30, 0.22, 0.44, BLOCK_B], [0.65, 0.38, 0.64, BLOCK]]:
		var x: float = w * float(spec[0])
		var bw: float = w * float(spec[1])
		var bh: float = h * float(spec[2])
		var r := Rect2(x, ground - bh, bw, bh)
		draw_rect(r, spec[3])
		draw_rect(r, Color(0.384, 0.831, 0.875, 0.06), false, 1.0)
		# Lit windows: a grid of warm points inside the block's face, some dark.
		var inner := Rect2(r.position + Vector2(bw * 0.10, bh * 0.12), Vector2(bw * 0.80, bh * 0.58))
		var cols := int(inner.size.x / 26.0)
		var rows := int(inner.size.y / 30.0)
		for cx in cols:
			for cy in rows:
				# A fixed pattern, not a random one: the same street every frame.
				if (cx * 7 + cy * 3 + int(spec[0] * 100.0)) % 5 == 0:
					continue
				draw_circle(inner.position + Vector2(13.0 + cx * 26.0, 15.0 + cy * 30.0), 2.2,
					Color(WINDOW.r, WINDOW.g, WINDOW.b, 0.42))


func _draw_street(w: float, h: float) -> void:
	var top := h * 0.78
	var bands := 12
	for i in bands:
		var k := float(i) / float(bands)
		draw_rect(Rect2(0, top + (h - top) * k, w, (h - top) / bands + 1.0),
			Color("#1c1f22").lerp(Color("#0b0d10"), k))
	draw_line(Vector2(0, top), Vector2(w, top), Color(0.95, 0.64, 0.30, 0.25), 1.0)
	var y := top + (h - top) * 0.28
	var x := 0.0
	while x < w:
		draw_rect(Rect2(x, y, 40.0, 3.0), Color(0.78, 0.80, 0.82, 0.35))
		x += 70.0


func _draw_sign(w: float, h: float, time: float) -> void:
	var font := PiritoriFonts.display(700)
	var fs := int(clampf(w * 0.018, 14.0 * ds, 26.0 * ds))
	var tw := maxf(font.get_string_size("TOKON", HORIZONTAL_ALIGNMENT_LEFT, -1, fs).x,
		font.get_string_size("RAMEN", HORIZONTAL_ALIGNMENT_LEFT, -1, fs).x) + fs * 0.9
	# Narrow (a phone held upright) the stop's plate reaches back to the sign,
	# so the sign hangs higher there.
	var r := Rect2(w * 0.04, h * (0.36 if w >= 700.0 else 0.22), tw + 20.0, fs * 2.3 + 12.0)
	# The web's opFlicker, 3.7 s in steps: a tube that nearly fails and does not.
	var phase := fmod(time, 3.7) / 3.7
	var a := 1.0
	if phase >= 0.41 and phase < 0.43:
		a = 0.35
	elif phase >= 0.44 and phase < 0.46:
		a = 0.5
	elif phase >= 0.78 and phase < 0.80:
		a = 0.75
	if still:
		a = 1.0
	_glow(r.get_center(), r.size.x * 0.9, Color(0.84, 0.23, 0.23, 0.30 * a))
	draw_rect(r, Color(0.08, 0.02, 0.02, 0.8))
	draw_rect(r, Color(SIGN_RED, a), false, 2.0)
	var x := r.position.x + 10.0 + fs * 0.1
	draw_string(font, Vector2(x, r.position.y + 6.0 + fs), "TOKON", HORIZONTAL_ALIGNMENT_LEFT, -1, fs,
		Color(SIGN_TEXT, a))
	draw_string(font, Vector2(x, r.position.y + 6.0 + fs * 2.1), "RAMEN", HORIZONTAL_ALIGNMENT_LEFT, -1, fs,
		Color(SIGN_WARM, a))


func _draw_stop(w: float, h: float) -> void:
	var base := h * 0.78
	var pole := Rect2(w * 0.18, base - h * 0.34, 6.0 * ds, h * 0.34)
	draw_rect(pole, Color("#5d646a"))
	var font := PiritoriFonts.display(700)
	var fs := int(13 * ds)
	var pw := maxf(94.0 * ds, font.get_string_size(stop_label, HORIZONTAL_ALIGNMENT_LEFT, -1, fs).x + 22.0 * ds)
	var plate := Rect2(pole.get_center().x - pw * 0.5, pole.position.y - 2.0 * ds, pw, 23.0 * ds)
	draw_rect(plate, Color("#e8e2d0"))
	draw_string(font, Vector2(plate.position.x, plate.position.y + 17.0 * ds), stop_label,
		HORIZONTAL_ALIGNMENT_CENTER, plate.size.x, fs, Color("#10151b"))
	var c := Vector2(pole.get_center().x, pole.position.y + 38.0 * ds)
	draw_circle(c, 12.0 * ds, Color("#1f7a3f"))
	draw_string(font, Vector2(c.x - 12.0 * ds, c.y + 5.0 * ds), "3", HORIZONTAL_ALIGNMENT_CENTER, 24.0 * ds,
		int(14 * ds), Color.WHITE)


func _draw_puddle(w: float, h: float) -> void:
	var c := Vector2(w * 0.56, h * 0.935)
	var rx := w * 0.26
	var ry := h * 0.035
	for i in 10:
		var k := 1.0 - float(i) / 10.0
		var col := Color(0.95, 0.76, 0.48, 0.05) if k < 0.5 else Color(0.84, 0.23, 0.23, 0.025)
		_ellipse(c, rx * k, ry * k, col)


func _ellipse(c: Vector2, rx: float, ry: float, col: Color) -> void:
	var pts := PackedVector2Array()
	for i in 24:
		var a := TAU * float(i) / 24.0
		pts.append(c + Vector2(cos(a) * rx, sin(a) * ry))
	draw_colored_polygon(pts, col)


func _draw_bag(w: float, h: float) -> void:
	var foot := h * 0.88
	var x := w * 0.18 + 12.0 * ds
	_ellipse(Vector2(x + 17.0 * ds, foot - 11.0 * ds), 17.0 * ds, 13.0 * ds, Color("#1c1e21"))
	_ellipse(Vector2(x + 13.0 * ds, foot - 15.0 * ds), 7.0 * ds, 5.0 * ds, Color("#2d3033"))


## The man in the fur hat: under the sign, waiting for a tram he never takes.
func _draw_npc(w: float, h: float) -> void:
	var foot := h * 0.88
	var fh := _person_h(w, h) * 0.95
	var fw := fh * 0.29
	var x := w * 0.18 - fw - 12.0 * ds
	var body := Rect2(x, foot - fh, fw, fh)
	draw_rect(Rect2(body.position.x - 2.0, body.position.y, 2.0, body.size.y), Color(1.0, 0.48, 0.42, 0.85))
	draw_rect(body, Color("#0e0d0c"))
	# the face under the hat
	_ellipse(Vector2(x + fw * 0.5, body.position.y - fh * 0.02), fw * 0.30, fh * 0.07, Color("#5a4636"))
	# the fur hat: stripes of two browns, rimmed red on the sign's side
	var hat := Rect2(x - fw * 0.12, body.position.y - fh * 0.38 + fh * 0.04, fw * 1.24, fh * 0.30)
	var sx := hat.position.x
	var i := 0
	while sx < hat.end.x:
		draw_rect(Rect2(sx, hat.position.y, minf(2.0, hat.end.x - sx), hat.size.y),
			Color("#3a2e25") if i % 2 == 0 else Color("#2a211b"))
		sx += 2.0
		i += 1
	draw_rect(Rect2(hat.position.x - 2.0, hat.position.y, 2.0, hat.size.y), Color(1.0, 0.48, 0.42, 0.7))


## A person stands a bit over half the tram's height, whatever the frame.
func _person_h(w: float, h: float) -> float:
	return _tram_rect(w, h, 99.0).size.y * 0.56


func _tram_rect(w: float, h: float, time: float) -> Rect2:
	var tw := minf(w * 0.58, 520.0 * ds)
	var th := minf(maxf(h * 0.26, 90.0), tw * 0.5)
	var x := w * 0.34
	if tram == Tram.ARRIVING:
		var k := _ease_tram(time / TRAM_IN)
		x += (1.0 - k) * (w * 1.10)
	return Rect2(x, h * 0.83 - th, tw, th)


func _draw_tram(w: float, h: float, time: float) -> void:
	var r := _tram_rect(w, h, time)
	_glow(r.get_center(), r.size.x * 0.75, Color(0.95, 0.64, 0.30, 0.12))
	draw_rect(Rect2(r.position.x, r.position.y + 10.0, r.size.x, r.size.y - 10.0), TRAM_GREEN)
	draw_rect(Rect2(r.position.x + 12.0, r.position.y, r.size.x - 24.0, 12.0), TRAM_GREEN)
	draw_circle(r.position + Vector2(12.0, 12.0), 12.0, TRAM_GREEN)
	draw_circle(Vector2(r.end.x - 12.0, r.position.y + 12.0), 12.0, TRAM_GREEN)
	draw_rect(Rect2(r.position.x, r.position.y + r.size.y * 0.62, r.size.x, r.size.y * 0.08), TRAM_CREAM)
	for fx in [0.06, 0.26, 0.66]:
		var win := Rect2(r.position.x + r.size.x * fx, r.position.y + r.size.y * 0.16,
			r.size.x * 0.16, r.size.y * 0.36)
		draw_rect(win, Color("#f2c27a").lerp(Color("#d98f3a"), 0.4) * Color(1, 1, 1, 0.9))
		draw_rect(Rect2(win.position.x, win.position.y, win.size.x, win.size.y * 0.3), Color(0.95, 0.76, 0.48, 0.35))
	var door := Rect2(r.position.x + r.size.x * 0.46, r.position.y + r.size.y * 0.12,
		r.size.x * 0.13, r.size.y * 0.82)
	var open := tram == Tram.STANDING or time >= DOOR_AT + 0.5
	draw_rect(door, Color("#121416") if open else TRAM_GREEN.darkened(0.1))
	draw_rect(door, Color("#1a5c30"), false, 2.0)
	var font := PiritoriFonts.display(700)
	draw_string(font, Vector2(r.end.x - 30.0 * ds, r.position.y + 28.0 * ds), "3", HORIZONTAL_ALIGNMENT_LEFT, -1,
		int(20 * ds), PiritoriPalette.LANTERN)


## Aatami: in FRONT of the street, feet on the pavement, lit by the tram's
## windows on one side and rimmed cold on the other.
func _draw_figure(w: float, h: float, time: float) -> void:
	var tw := minf(w * 0.58, 520.0 * ds)
	var fh := _person_h(w, h)
	var fw := fh * 0.32
	var x0 := w * 0.34 + tw * 0.5
	var a := 1.0
	var x := x0 - w * 0.09
	if figure == Figure.STEPPING:
		var k := clampf((time - STEP_AT) / STEP_FOR, 0.0, 1.0)
		if time < STEP_AT:
			return
		a = clampf(k / 0.2, 0.0, 1.0)
		x = x0 - w * 0.09 * (1.0 - pow(1.0 - k, 2.0))
	var foot := h * 0.88
	var body := Rect2(x, foot - fh, fw, fh)
	# the pool of light he stands in
	_ellipse(Vector2(body.get_center().x, foot + 2.0), fw * 1.8, 5.0, Color(0.95, 0.64, 0.30, 0.30 * a))
	draw_rect(Rect2(body.position.x - 2.0, body.position.y + 6.0, 2.0, body.size.y - 6.0), Color(PiritoriPalette.LANTERN, a))
	draw_rect(Rect2(body.end.x, body.position.y + 6.0, 2.0, body.size.y - 6.0), Color(YOU_RIM, YOU_RIM.a * a))
	draw_rect(Rect2(body.position.x, body.position.y + 6.0, body.size.x * 0.45, body.size.y - 6.0), Color("#2a2320", a))
	draw_rect(Rect2(body.position.x + body.size.x * 0.45, body.position.y + 6.0, body.size.x * 0.55, body.size.y - 6.0), Color("#14181c", a))
	var head_r := fw * 0.38
	var hc := Vector2(body.get_center().x, body.position.y - head_r * 0.4)
	draw_circle(hc + Vector2(-1.5, 0), head_r + 1.5, Color(PiritoriPalette.LANTERN, a))
	draw_circle(hc + Vector2(1.5, 0), head_r + 1.5, Color(YOU_RIM, YOU_RIM.a * a))
	draw_circle(hc, head_r, Color("#2a2320", a))
	draw_circle(hc + Vector2(-head_r * 0.25, 0), head_r * 0.7, Color("#6b4a36", a))


func _draw_rain(w: float, h: float, time: float) -> void:
	# Streaks at 104°, one every 12 px, moving (-12, 60) every 0.6 s (web opRain).
	var k := 0.0 if still else fmod(time, 0.6) / 0.6
	var dx := -12.0 * k
	var dy := 60.0 * k
	var slope := tan(deg_to_rad(14.0))
	var col := Color(0.67, 0.78, 0.84, 0.13)
	var gap := 12.0 * ds
	var x := -h * slope - 24.0
	while x < w + 24.0:
		var top := Vector2(x + dx * ds, -60.0 * ds + dy * ds)
		var seg := 0.0
		# dashed so the rain reads as falling drops, not a hatch
		while seg < h + 60.0 * ds:
			var a := top + Vector2(-slope * seg, seg)
			var b := a + Vector2(-slope * 18.0 * ds, 18.0 * ds)
			draw_line(a, b, col, maxf(1.0, ds * 0.8))
			seg += 46.0 * ds
		x += gap


## A grime film and a vignette: the frame is enclosed, and dirty.
func _draw_film(w: float, h: float) -> void:
	var y := 0.0
	while y < h:
		draw_rect(Rect2(0, y, w, 1.0), Color(0.16, 0.13, 0.09, 0.10))
		y += 5.0
	var edge := minf(w, h) * 0.22
	for i in 8:
		var k := float(i) / 8.0
		var a := 0.07 * (1.0 - k)
		draw_rect(Rect2(0, 0, w, edge * (1.0 - k)), Color(0, 0, 0, a))
		draw_rect(Rect2(0, h - edge * (1.0 - k), w, edge * (1.0 - k)), Color(0, 0, 0, a))
		draw_rect(Rect2(0, 0, edge * (1.0 - k), h), Color(0, 0, 0, a))
		draw_rect(Rect2(w - edge * (1.0 - k), 0, edge * (1.0 - k), h), Color(0, 0, 0, a))
