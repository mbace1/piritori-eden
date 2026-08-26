extends Control
## City mode — the twelve-anchor Era I Kallio board.
##
## Built to MAP.md §6 "Visual layer contract", back to front:
##   1 deep paper backing · 2 water and coastline · 3 district relief
##   4 railway and major road cuts · 5 minor street/block collage
##   6 public transit corridors · 7 ordinary people flow
##   8 crew and goods flow · 9 pressure/weather · 10 anchors and missions
##   11 selection and route preview · 12 labels and UX chrome
##
## Geometry is the canonical structural SVG, flattened to board-space polylines
## by tools/build-map-geometry.mjs. Treatment is its authored <style> block, in
## ui/map_style.gd. Nothing here invents shapes or colours.
##
## Board Y increases southward, which is already Godot's screen-down axis, so
## north is up with no flip (responsive.northUpLocked).

signal anchor_selected(anchor_id: String)

const GEOMETRY_PATH := "res://data/map-geometry.json"

const MARGIN_RATIO := 0.045
const MARGIN_MIN := 10.0
const TOUCH_MIN := 44.0     ## MAP.md §6: rectangular hit target, >= 44px

var _geo: Dictionary = {}
var _layout: Dictionary = {}      ## anchor id -> Vector2 (screen)
var _hits: Dictionary = {}        ## anchor id -> Rect2 (screen)
var _scale: float = 1.0
var _origin := Vector2.ZERO
var _mn := Vector2.ZERO
var _mx := Vector2.ONE      ## board-space frame, used by _draw_edge_mask()

var _selected: String = ""
var _hovered: String = ""
var _font: Font
var _t := 0.0


func _ready() -> void:
	_font = PiritoriFonts.ui()
	mouse_filter = Control.MOUSE_FILTER_STOP
	clip_contents = true
	_load_geometry()
	resized.connect(_rebuild_layout)
	GameState.state_changed.connect(queue_redraw)
	_rebuild_layout()


func _load_geometry() -> void:
	if not FileAccess.file_exists(GEOMETRY_PATH):
		push_error("city_map: missing %s — run: node tools/build-map-geometry.mjs" % GEOMETRY_PATH)
		return
	var parsed: Variant = JSON.parse_string(FileAccess.get_file_as_string(GEOMETRY_PATH))
	if typeof(parsed) == TYPE_DICTIONARY:
		_geo = parsed


func _layer(layer_name: String) -> Array:
	return _geo.get("layers", {}).get(layer_name, [])


## Fit the board's own declared extent (§7: "fit the full boundary inside the
## world area").
##
## NOT the land's extent. Real land is derived from the real OSM coastline
## now, which covers a deliberately wider box than the playable board — fit
## to that and Kallio shrinks to a patch in the middle with the screen spent
## on off-board water. `boardExtent` comes from the coordinate system in
## `map/kallio-era1-2003-v1.json`, the same block that defines what a board
## unit means, so the frame and the geometry agree by construction. Land
## simply continues past the frame and is clipped, the way a real city map
## continues past its own edge.
func _rebuild_layout() -> void:
	_layout.clear()
	_hits.clear()
	var anchors := ContentRegistry.anchors()
	if anchors.is_empty():
		return

	var mn := Vector2(INF, INF)
	var mx := Vector2(-INF, -INF)

	var extent: Dictionary = _geo.get("boardExtent", {})
	if extent.has("w") and extent.has("h"):
		mn = Vector2(extent.get("x", 0.0), extent.get("y", 0.0))
		mx = mn + Vector2(extent["w"], extent["h"])
	else:
		for a in anchors:
			var p := Vector2(a["board"]["x"], a["board"]["y"])
			mn = mn.min(p)
			mx = mx.max(p)

	var span := mx - mn
	span.x = maxf(span.x, 1.0)
	span.y = maxf(span.y, 1.0)
	_mn = mn
	_mx = mn + span

	var m := maxf(minf(size.x, size.y) * MARGIN_RATIO, MARGIN_MIN)
	var avail := Vector2(maxf(size.x - m * 2.0, 32.0), maxf(size.y - m * 2.0, 32.0))
	_scale = minf(avail.x / span.x, avail.y / span.y)
	var drawn := span * _scale
	_origin = Vector2(m, m) + (avail - drawn) * 0.5

	for a in anchors:
		var pos := _to_screen(Vector2(a["board"]["x"], a["board"]["y"]))
		_layout[a["id"]] = pos
		var r := maxf(TOUCH_MIN, 32.0 * _scale)
		_hits[a["id"]] = Rect2(pos - Vector2(r, r) * 0.5, Vector2(r, r))

	queue_redraw()


func _to_screen(board: Vector2) -> Vector2:
	return _origin + (board - _mn) * _scale


func _pts(item: Dictionary) -> PackedVector2Array:
	var raw: Array = item.get("points", [])
	var out := PackedVector2Array()
	out.resize(raw.size() / 2)
	for i in range(0, raw.size(), 2):
		out[i / 2] = _to_screen(Vector2(raw[i], raw[i + 1]))
	return out


func _w(board_width: float) -> float:
	return maxf(board_width * _scale, 1.0)


func _process(dt: float) -> void:
	_t += dt
	queue_redraw()


# ── the layer stack ───────────────────────────────────────────────────────

func _draw() -> void:
	if _layout.is_empty():
		return
	_draw_backing_and_water()   # 1 + 2
	_draw_land()                # 3
	# _draw_blocks() suppressed — see the function's own comment.
	_draw_real_streets()        # 5, real OSM texture under the locked roads
	_draw_rail_and_roads()      # 4
	_draw_public_transit()      # 6
	_draw_ordinary_flow()       # 7
	_draw_crew_and_goods()      # 8
	_draw_edge_mask()           # 9, the frame the city continues past
	_draw_anchors()             # 10 + 11
	_draw_labels()              # 12
	_draw_legend()              # 13
	_draw_placeholder_note()


## 1-2. Deep paper backing, then real coastline where it exists.
##
## Reported directly, 2026-08-27: "it looks like it's just water now around
## Kallio, make it more realistic." The flat rect was the whole backing —
## no bay, no coast, one undifferentiated colour behind the board's own
## landmass. `map/kallio-water-v1.json` is real OSM coastline for this exact
## box (`TRANSIT_LAYERS.md` §11.2), already proven on the offline plates and
## now projected into board space by `build-map-geometry.mjs` the same way
## the transit lines were. It draws BEFORE `_draw_land()`, so the board's own
## (locked, hand-drawn) landmass still wins wherever the two overlap — this
## only ever enriches what was empty sea.
func _draw_backing_and_water() -> void:
	draw_rect(Rect2(Vector2.ZERO, size), MapStyle.WATER)

	for item in _layer("water-real"):
		var kind := String(item.get("kind", ""))
		var pts := _pts(item)
		if pts.size() < 2:
			continue
		if kind == "water-area" and pts.size() >= 3:
			draw_colored_polygon(pts, MapStyle.WATER_SHADOW)
		elif kind == "coastline":
			draw_polyline(pts, MapStyle.COASTLINE, _w(1.6), true)

	var step := maxf(34.0 * _scale, 12.0)
	var col := MapStyle.WATER_WAVE
	col.a = 0.55
	var y := fmod(_t * 3.0, step)
	while y < size.y:
		draw_line(Vector2(0, y), Vector2(size.x, y), col, maxf(_scale * 2.0, 1.0), true)
		y += step


## 3. District relief — real land, from real streets and real anchors
## (`build-map-geometry.mjs`'s `buildRealLand()`; that function's own
## comment records why not the old hand-drawn shape, and why not a traced
## coastline either — both tried and both wrong). Reported directly,
## 2026-08-28: "the map is not aligned at all with real maps, start from
## scratch with the PR layers and then add details."
##
## Flat rectangles, not one smooth polygon with a torn-fibre seam — real
## land is now merged cells rather than one hand-authored outline, and the
## real coastline is drawn separately and accurately in
## `_draw_backing_and_water()`, which does the "where the edge actually is"
## job better than a procedural tear on a shape that has no single
## contiguous boundary to trace any more.
func _draw_land() -> void:
	var bb := Rect2()
	var any := false
	for item in _layer("land-real"):
		if String(item.get("kind", "")) != "rect":
			continue
		var pos: Array = item.get("pos", [0, 0])
		var siz: Array = item.get("size", [0, 0])
		var origin := _to_screen(Vector2(float(pos[0]), float(pos[1])))
		var r := Rect2(origin, Vector2(float(siz[0]), float(siz[1])) * _scale)
		draw_rect(r, MapStyle.LAND)
		bb = r if not any else bb.merge(r)
		any = true
	if any:
		_draw_grain(bb)


## Paper grain over the land: sparse fibres, seeded so it never crawls.
## Drawn once across the whole land bounding box rather than per rectangle —
## a fibre landing on a real water cell here and there is the same kind of
## harmless softness real paper grain has; drawing it separately per one of
## a thousand small rects would not read as different and would cost far
## more.
func _draw_grain(bb: Rect2) -> void:
	var step := maxf(31.0 * _scale, 9.0)
	var col := MapStyle.PAPER_GRAIN
	col.a = 0.5
	var rng := RandomNumberGenerator.new()
	rng.seed = 20030101
	var y := bb.position.y
	while y < bb.end.y:
		var x := bb.position.x + rng.randf() * step * 2.0
		while x < bb.end.x:
			var seg_len := step * (0.4 + rng.randf() * 0.9)
			draw_line(Vector2(x, y), Vector2(x + seg_len, y), col, maxf(_scale, 1.0), false)
			x += seg_len + step * (1.2 + rng.randf() * 2.2)
		y += step


## 5. Minor street/block collage — SUPPRESSED, 2026-08-27.
##
## Reported directly against the transit-line work: "not close enough yet.
## The squares should be gone first and take it from there." This was a
## procedural grid of small rectangles — cell, drop shadow, fill, edge —
## tiled across the whole land polygon, and it read as noisy filing-cabinet
## texture competing with the pins, roads and the transit lines now drawn
## over it, nothing like the flat paper the reference asks for.
##
## Left undrawn rather than deleted: the seeded subdivision and the
## nineteen authored district masses (`_layer("minor-blocks")`) are still
## real geometry that MAP.md §6 layer 5 names, and a future, quieter
## treatment (a soft tone shift per district mass, no grid lines) may want
## them. Calling this from `_draw()` is what actually draws squares; that
## call is removed, not this function's ability to be rewritten.
func _draw_blocks() -> void:
	pass


## 5. Real streets — actual OSM geometry, cross-referenced to real Kallio
## rather than invented. Reported directly, 2026-08-28: "larger streets can
## be visible on cross referenced to actual maps." `map/tools/streets-import.mjs`
## classifies every real way by `highway=`; this draws it as texture BEHIND
## the board's own locked major roads (`_draw_rail_and_roads()`, drawn right
## after this) and the transit lines, so the hand-placed canonical geometry
## stays the loudest thing on the board. Weight and opacity fall off from
## major to minor rather than a hard cutoff, which is what makes "larger
## streets visible" true without pretending the smaller ones are not real.
func _draw_real_streets() -> void:
	for item in _layer("streets-real"):
		var pts := _pts(item)
		if pts.size() < 2:
			continue
		var tier := String(item.get("tier", "minor"))
		var col := MapStyle.STREET
		var w := 1.0
		# Reported directly, 2026-08-28: "add some bigger streets," then
		# 2026-08-26: "closer, but do some more passes with bigger roads" —
		# the first pass (4.8/2.6) still read as texture rather than roads
		# next to the transit lines and the structural avenues. Pushed again;
		# minor stays put, it is the fine grain the majors are meant to stand
		# out of, not another thing to grow.
		match tier:
			"major":
				col.a = 0.88
				w = 6.6
			"mid":
				col.a = 0.66
				w = 3.6
			_:
				col.a = 0.16
				w = 1.0
		draw_polyline(pts, col, _w(w), true)


## 4. Railway and major road cuts. Roads are a casing plus an inner strip, which
## is what gives the hand-cut grey ribbon its edge.
func _draw_rail_and_roads() -> void:
	var by_class: Dictionary = {}
	for item in _layer("rail-and-roads"):
		var c := String(item.get("class", ""))
		if not by_class.has(c):
			by_class[c] = []
		by_class[c].append(item)

	# THE HAND-DRAWN ROADS ARE GONE. Reported directly, 2026-08-26: "the grey
	# lines that are there from the squares that you re-colored."
	#
	# Correct — the 5 `road`, 5 `roadInner` and 6 `street` runs in this layer
	# are the last of the original hand-drawn structural SVG, the same
	# invented geometry the blocks came from. Recolouring them made them
	# quieter without making them true: they are broad blunt ribbons that do
	# not correspond to any real street, laid over `streets-real`, which is
	# actual OSM geometry for the same ground. Two road networks, one real,
	# one not, disagreeing with each other in the same picture.
	#
	# `_draw_real_streets()` already draws the real ones. These are simply
	# not drawn any more.
	for item in by_class.get("rail", []):
		var pts := _pts(item)
		if pts.size() >= 2:
			draw_polyline(pts, MapStyle.RAIL, _w(MapStyle.RAIL_W), true)
	for item in by_class.get("railTie", []):
		var pts := _pts(item)
		if pts.size() >= 2:
			_draw_dashed(pts, MapStyle.RAIL_TIE, _w(MapStyle.RAIL_TIE_W),
				MapStyle.RAIL_TIE_DASH * _scale)


## 6. Public transit — real HSL geometry, one hue per Kallio line
## (`TRANSIT_LAYERS.md` §9, §10.5: seven services actually serve Kallio, real
## GTFS shapes, shared corridors fanned apart). Reported directly, 2026-08-27:
## "the map should look much closer to [HSL's own layered network map]... you
## should have gotten the basics in a PR earlier" — the basics existed as
## extracted data and offline plates (`map/kallio-rail-v1.json`,
## `map/tools/master-plate.mjs`) but the board itself still drew three
## hand-sketched polylines whose own number chips were never even wired up.
## `godot/tools/build-map-geometry.mjs` now derives this layer from the same
## real data and fanning algorithm the plates use; this just draws it.
##
## §9.3's Era I "printed" treatment: flat matte colour, a hard black keyline,
## paper number chips, no glow — the bloom is reserved for Era II's live
## layer, which this board is not.
func _draw_public_transit() -> void:
	for item in _layer("public-transit"):
		if String(item.get("kind", "")) != "transit-line":
			continue
		var pts := _pts(item)
		if pts.size() < 2:
			continue
		var col := Color(String(item.get("colour", "#999999")))
		var heavy: bool = String(item.get("mode", "")) == "metro"
		var w := _w(9.0 if heavy else 5.2)
		draw_polyline(pts, MapStyle.TRANSIT_KEYLINE, w + _w(2.6), true)
		draw_polyline(pts, col, w, true)

	# Chips drawn in their own pass, over every line, so a badge is never
	# hidden under a later line's keyline.
	for item in _layer("public-transit"):
		if String(item.get("kind", "")) == "transit-line":
			_draw_transit_chips(item)


func _draw_transit_chips(item: Dictionary) -> void:
	var col := Color(String(item.get("colour", "#999999")))
	var label := String(item.get("service", ""))
	if label == "":
		return
	var raw: Array = item.get("chips", [])
	if raw.is_empty():
		return
	# A CAPSULE, NOT A BOX. Reported directly, 2026-08-26: "The square frames
	# still are there" — with the land finally rebuilt from the real coastline
	# these bordered rectangles were the last hard-cornered thing left on the
	# board, and 107 of them read as a rash of squares over the geography.
	# The count is cut at the source (`chipsFor()` in build-map-geometry.mjs);
	# this is the other half — a rounded badge, the shape a transit map
	# actually uses, with no keyline to draw a square with.
	var font_px := int(clampf(14.0 * _scale, 10.0, 14.0))
	var ink := Color("#16191b") if col.get_luminance() > 0.45 else Color("#f0e9d8")
	var padx := maxf(6.0 * _scale, 4.0)
	for c in raw:
		var pair: Array = c
		var centre := _to_screen(Vector2(float(pair[0]), float(pair[1])))
		var tw := _font.get_string_size(label, HORIZONTAL_ALIGNMENT_LEFT, -1, font_px).x
		var r := float(font_px) * 0.5 + maxf(3.0 * _scale, 2.0)
		var half := maxf(tw * 0.5 + padx - r, 0.0)
		var a := centre - Vector2(half, 0.0)
		var b := centre + Vector2(half, 0.0)
		# a soft drop so the badge lifts off the line it sits on
		draw_circle(a + Vector2(0, r * 0.12), r * 1.06, Color(0, 0, 0, 0.38))
		draw_circle(b + Vector2(0, r * 0.12), r * 1.06, Color(0, 0, 0, 0.38))
		if half > 0.0:
			draw_rect(Rect2(a.x, centre.y - r * 1.06 + r * 0.12, half * 2.0, r * 2.12),
				Color(0, 0, 0, 0.38))
		draw_circle(a, r, col)
		draw_circle(b, r, col)
		if half > 0.0:
			draw_rect(Rect2(a.x, centre.y - r, half * 2.0, r * 2.0), col)
		draw_string(_font, Vector2(centre.x - tw * 0.5, centre.y + float(font_px) * 0.35),
			label, HORIZONTAL_ALIGNMENT_LEFT, -1, font_px, ink)


## 7. Ordinary people flow — "small neutral residents as paper pips". They drift
## gently; reduced motion freezes them where they stand.
func _draw_ordinary_flow() -> void:
	var drift := 0.0 if _reduced_motion() else sin(_t * 0.35) * 5.0 * _scale
	var r := maxf(3.0 * _scale, 1.5)
	var stroke := maxf(2.0 * _scale, 1.0)
	var i := 0
	for item in _layer("ordinary-flow"):
		if item.get("kind", "") != "circle":
			continue
		i += 1
		var raw: Array = item.get("pos", [0, 0])
		var p := _to_screen(Vector2(raw[0], raw[1]))
		p.y += drift * (1.0 if i % 2 == 0 else -1.0)
		draw_circle(p, r, MapStyle.FLOW)
		var h := maxf(7.0 * _scale, 3.0)
		draw_line(p + Vector2(0, r), p + Vector2(0, r + h), MapStyle.FLOW, stroke, true)
		draw_line(p + Vector2(0, r + h), p + Vector2(-h * 0.5, r + h * 1.7), MapStyle.FLOW, stroke, true)
		draw_line(p + Vector2(0, r + h), p + Vector2(h * 0.5, r + h * 1.7), MapStyle.FLOW, stroke, true)


## 8. Crew and goods flow. These are DYNAMIC and never bake into the relief:
## cyan for the player's own route, magenta dashed for product movement.
func _draw_crew_and_goods() -> void:
	var here := GameState.current_anchor_id
	if here == "" or not _layout.has(here):
		return

	for anchor_id in GameState.market_history:
		if String(anchor_id) == here or not _layout.has(anchor_id):
			continue
		var path := _corridor(here, String(anchor_id))
		if path.size() >= 2:
			_draw_dashed(path, MapStyle.GOODS, _w(MapStyle.GOODS_W),
				MapStyle.GOODS_DASH * _scale, _t * 22.0)
			_draw_arrow_head(path, MapStyle.GOODS)

	for a in ContentRegistry.anchors():
		var aid: String = a["id"]
		if aid == here or not _is_live_lead(aid):
			continue
		var path := _corridor(here, aid)
		if path.size() >= 2:
			draw_polyline(path, MapStyle.ROUTE, _w(MapStyle.ROUTE_W), true)
			_draw_arrow_head(path, MapStyle.ROUTE)


## Routes follow graph edges and never cut through buildings or water (§5).
## Breadth-first over the public corridor graph.
func _corridor(from_id: String, to_id: String) -> PackedVector2Array:
	var out := PackedVector2Array()
	if from_id == to_id:
		return out
	var prev: Dictionary = {}
	var queue: Array = [from_id]
	var seen: Dictionary = {from_id: true}

	while not queue.is_empty():
		var cur: String = queue.pop_front()
		if cur == to_id:
			break
		for e in ContentRegistry.edges():
			var a := String(e.get("from", ""))
			var b := String(e.get("to", ""))
			var nxt := ""
			if a == cur:
				nxt = b
			elif b == cur:
				nxt = a
			if nxt == "" or seen.has(nxt):
				continue
			seen[nxt] = true
			prev[nxt] = cur
			queue.append(nxt)

	if not prev.has(to_id):
		return out
	var chain: Array = [to_id]
	while chain[0] != from_id:
		if not prev.has(chain[0]):
			return PackedVector2Array()
		chain.push_front(prev[chain[0]])
	for id in chain:
		if _layout.has(id):
			out.append(_layout[id])
	return out


func _draw_arrow_head(path: PackedVector2Array, col: Color) -> void:
	if path.size() < 2:
		return
	var tip: Vector2 = path[path.size() - 1]
	var dir: Vector2 = (tip - path[path.size() - 2]).normalized()
	var back := tip - dir * maxf(16.0 * _scale, 8.0)
	var side := dir.orthogonal() * maxf(9.0 * _scale, 5.0)
	draw_colored_polygon(PackedVector2Array([tip, back + side, back - side]), col)


func _draw_dashed(pts: PackedVector2Array, col: Color, width: float,
		dash: Vector2, phase: float = 0.0) -> void:
	var on := maxf(dash.x, 1.0)
	var off := maxf(dash.y, 1.0)
	var period := on + off
	var travelled := fmod(phase, period)
	for i in range(pts.size() - 1):
		var a: Vector2 = pts[i]
		var b: Vector2 = pts[i + 1]
		var seg := a.distance_to(b)
		if seg <= 0.01:
			continue
		var dir := (b - a) / seg
		var t := 0.0
		var guard := 0
		while t < seg and guard < 400:
			guard += 1
			var into := fmod(travelled, period)
			var remain: float = (on - into) if into < on else (period - into)
			var is_on := into < on
			var end: float = minf(t + remain, seg)
			if is_on:
				draw_line(a + dir * t, a + dir * end, col, width, true)
			travelled += end - t
			t = end


# ── 10-11. anchors, missions and selection ────────────────────────────────

func _draw_anchors() -> void:
	for a in ContentRegistry.anchors():
		_draw_anchor(a)


func _draw_anchor(a: Dictionary) -> void:
	var id: String = a["id"]
	var pos: Vector2 = _layout[id]
	var state: String = a.get("sliceState", "locked")
	var live := _is_live_lead(id)
	# BIGGER THAN IT WAS, TWICE NOW. A 17px pin could hold a dot and nothing
	# else; 28 made the pictogram readable but direct feedback 2026-08-26
	# ("larger landmarks") still read them as small next to the thicker
	# roads from the same pass. 34 is the anchor radius now; the touch
	# target in _rebuild_layout() grew to match so the drawn size and the
	# hit-tested size do not drift apart again.
	var r := maxf(34.0 * _scale, 18.0)

	draw_circle(pos + Vector2(0, maxf(3.0 * _scale, 1.0)), r * 1.05, Color(0, 0, 0, 0.45))
	draw_circle(pos, r, MapStyle.NODE_OUTER)

	if state == "teaser":
		_draw_dashed_ring(pos, r, MapStyle.TEASER_RIM, _w(5.0), MapStyle.TEASER_DASH * _scale)
	else:
		draw_arc(pos, r, 0, TAU, 40, MapStyle.anchor_rim(state), _w(MapStyle.NODE_RIM_W), true)

	# State badge. Locked keeps a padlock glyph so colour is never alone.
	var fill := MapStyle.anchor_fill(state)
	if state == "locked":
		draw_circle(pos, r * 0.5, fill)
		var bar := r * 0.26
		draw_line(pos + Vector2(-bar, bar * 0.2), pos + Vector2(bar, bar * 0.2),
			MapStyle.LOCKED_RIM, maxf(3.0 * _scale, 1.5), true)
		draw_arc(pos + Vector2(0, -bar * 0.4), bar * 0.75, PI, TAU, 14,
			MapStyle.LOCKED_RIM, maxf(2.5 * _scale, 1.2), true)
	elif state == "teaser":
		draw_circle(pos, r * 0.28, MapStyle.TEASER_RIM)
	else:
		# THE MEDALLION. This was a plain filled dot, which told a player only
		# that something was here. The pictogram says WHAT is here, from across
		# the board, before anything is clicked or read.
		draw_circle(pos, r * 0.70, MapStyle.NODE_INNER)
		PiritoriIcon.paint(self, pos, r * 1.12, fill, MapStyle.anchor_glyph(id))

	if live:
		var pulse: float = 1.0 if _reduced_motion() else 1.0 + 0.07 * sin(_t * 2.6)
		draw_arc(pos, r * 1.55 * pulse, 0, TAU, 44, MapStyle.ROUTE, _w(3.5), true)
	if id == _selected:
		draw_arc(pos, r * 1.32, 0, TAU, 40, MapStyle.TAB, _w(4.0), true)
	elif id == _hovered:
		draw_arc(pos, r * 1.32, 0, TAU, 40, MapStyle.SMALL_TEXT, _w(2.0), true)


## 9. The frame.
##
## Real geography does not stop at the board. The coastline, the streets and
## the transit lines all come from public OSM data covering a wider box than
## the playable 1000x1000 board, and drawing them raw left tram lines and
## roads apparently floating on open sea past the shoreline — which looked
## exactly like the invented geometry this map spent several rounds getting
## rid of, even though it was the honest data.
##
## So the board gets an actual edge: everything outside it is painted back
## down to the deep water tone. The city visibly continues past the frame and
## is cut by it, which is what a real city map does. Drawn after all
## geography and before the pins, which sit well inside it.
func _draw_edge_mask() -> void:
	var tl := _to_screen(_mn)
	var br := _to_screen(_mx)
	# Solid. A translucent mask left ghost lines legible outside the frame,
	# which is the confusing half of both worlds.
	var col := MapStyle.WATER
	if tl.y > 0.0:
		draw_rect(Rect2(0, 0, size.x, tl.y), col)
	if br.y < size.y:
		draw_rect(Rect2(0, br.y, size.x, size.y - br.y), col)
	if tl.x > 0.0:
		draw_rect(Rect2(0, tl.y, tl.x, br.y - tl.y), col)
	if br.x < size.x:
		draw_rect(Rect2(br.x, tl.y, size.x - br.x, br.y - tl.y), col)
	# NO drawn border. A hairline rectangle here was itself one more square
	# frame on a map whose whole problem was square frames. The mask alone
	# gives a clean edge for free: land stops against the water tone, and
	# water blends into it invisibly, which is the softer and honester cut.


## 13. THE LEGEND.
##
## The map has four pin states and until now nothing said what any of them
## meant: a dashed orange ring, a padlock, a filled dot and a pulsing halo were
## four different facts a player could only learn by clicking everything.
##
## Owner's reference layout asks for one, and it costs nothing to be honest —
## colour is never the only carrier here (`locked` keeps its padlock), so the
## legend explains shapes as much as hues.
##
## Drawn last, over everything, because it is chrome rather than geography.
const LEGEND_FRACTION := 0.030      ## row height, of the shorter screen edge

func _draw_legend() -> void:
	# `size` can end up wider than what is actually on screen after a runtime
	# resize — a real mismatch between this Control's own layout size and the
	# true visible viewport that surfaced 2026-08-27 while chasing the
	# oversized-label report: everything else in this file fits itself TO
	# `size` (the relief map, the pins), so a slightly-too-generous size just
	# reads as "very slightly more zoomed out than ideal" — but the legend is
	# hard-anchored to the far corner, which is the one thing that turned the
	# gap into a visibly clipped panel. Clamped against the true visible rect,
	# in this control's own local space, rather than trusted to match it.
	var visible := get_viewport_rect().size - global_position
	var vp := Vector2(minf(size.x, visible.x), minf(size.y, visible.y))
	if vp.x <= 0.0 or vp.y <= 0.0:
		return
	# Sized from the shorter edge so it stays a corner panel in both
	# orientations instead of a banner in one of them.
	var basis: float = minf(vp.x, vp.y)
	var row := clampf(basis * LEGEND_FRACTION, 16.0, 52.0)
	var pad := row * 0.55
	var dot := row * 0.34
	var font_px := int(clampf(row * 0.62, 11.0, 30.0))

	var rows := [
		["active", tr("map.legend_open")],
		["teaser", tr("map.legend_teaser")],
		["locked", tr("map.legend_locked")],
		["lead", tr("map.legend_lead")],
	]

	# Widest label decides the panel, so no translation gets clipped.
	var text_w := 0.0
	for r in rows:
		text_w = maxf(text_w, _font.get_string_size(String(r[1]),
			HORIZONTAL_ALIGNMENT_LEFT, -1, font_px).x)
	var w := pad * 2.0 + dot * 2.0 + pad * 0.8 + text_w
	var h := pad * 2.0 + row * rows.size()
	var origin := Vector2(vp.x - w - pad, vp.y - h - pad)

	var panel := Rect2(origin, Vector2(w, h))
	draw_rect(panel, Color(0.04, 0.06, 0.07, 0.82))
	draw_rect(panel, MapStyle.FRAME_EDGE, false, maxf(2.0 * _scale, 1.0))

	var y := origin.y + pad + row * 0.5
	for r in rows:
		var kind := String(r[0])
		var c := origin.x + pad + dot
		match kind:
			"teaser":
				_draw_dashed_ring(Vector2(c, y), dot, MapStyle.TEASER_RIM,
					maxf(2.0 * _scale, 1.5), MapStyle.TEASER_DASH * _scale)
			"locked":
				draw_circle(Vector2(c, y), dot * 0.62, MapStyle.anchor_fill("locked"))
				draw_arc(Vector2(c, y), dot, 0, TAU, 24, MapStyle.LOCKED_RIM,
					maxf(2.0 * _scale, 1.2), true)
			"lead":
				draw_circle(Vector2(c, y), dot * 0.55, MapStyle.anchor_fill("active"))
				draw_arc(Vector2(c, y), dot * 1.25, 0, TAU, 28, MapStyle.ROUTE,
					maxf(2.5 * _scale, 1.4), true)
			_:
				draw_circle(Vector2(c, y), dot * 0.62, MapStyle.anchor_fill("active"))
				draw_arc(Vector2(c, y), dot, 0, TAU, 24, MapStyle.anchor_rim("active"),
					maxf(2.0 * _scale, 1.2), true)
		draw_string(_font, Vector2(c + dot + pad * 0.8, y + font_px * 0.36),
			String(r[1]), HORIZONTAL_ALIGNMENT_LEFT, -1, font_px, MapStyle.TITLE_TEXT)
		y += row


func _draw_dashed_ring(c: Vector2, r: float, col: Color, width: float, dash: Vector2) -> void:
	var seg: float = maxf(dash.x + dash.y, 4.0)
	var count: int = maxi(int(TAU * r / seg), 6)
	for i in range(count):
		var a0 := (float(i) / count) * TAU
		var a1 := a0 + (dash.x / seg) * (TAU / count)
		draw_arc(c, r, a0, a1, 6, col, width, true)


# ── 12. labels on rough paper tabs ────────────────────────────────────────

## Reported directly (2026-08-27): "map names are way too big... should
## mainly appear when clicked... smaller text can be there as long as
## visibility remains." Twelve-plus anchor names drawn every frame, at any
## zoom, was the clutter half of that report — the oversized-font half was
## `_device_gain()` double-scaling (see the removed function above); this is
## the other half. A label now shows only for the SELECTED anchor (the
## click) or a LIVE lead (the minimum needed so an actionable place is still
## findable without clicking everything) — not for all eleven merely-`active`
## anchors regardless of zoom. The rail `anchor_selected` opens is the "small
## quick view menu" for whichever one is clicked; this tab is just the name.
func _draw_labels() -> void:
	for a in ContentRegistry.anchors():
		var id: String = a["id"]
		var state: String = a.get("sliceState", "locked")
		var live := _is_live_lead(id)
		if not (live or id == _selected):
			continue

		var text := String(a.get("label", id)).to_upper()
		var font_px := int(clampf(19.0 * _scale, 10.0, 18.0))
		var off: Array = a.get("labelOffset", [0, 0])
		var centre: Vector2 = _layout[id] + Vector2(float(off[0]), float(off[1])) * _scale

		var tw := _font.get_string_size(text, HORIZONTAL_ALIGNMENT_LEFT, -1, font_px).x
		var pad := Vector2(maxf(7.0 * _scale, 4.0), maxf(5.0 * _scale, 3.0))
		var box := Rect2(centre - Vector2(tw, float(font_px)) * 0.5 - pad,
			Vector2(tw, float(font_px)) + pad * 2.0)
		box.position.x = clampf(box.position.x, 2.0, maxf(2.0, size.x - box.size.x - 2.0))
		box.position.y = clampf(box.position.y, 2.0, maxf(2.0, size.y - box.size.y - 22.0))

		# A live lead gets the tan tab; everything else a dark tab, so the lead
		# is findable without reading colour alone.
		var use_tan := live or id == _selected
		var bg := MapStyle.TAB if use_tan else MapStyle.DARK_TAB
		var edge := MapStyle.TAB_EDGE if use_tan else MapStyle.DARK_TAB_EDGE
		var fg := MapStyle.TAB_TEXT if use_tan else MapStyle.DARK_TAB_TEXT
		if state == "locked" and not use_tan:
			fg = MapStyle.TINY_TEXT

		# THE STALK. A tab that floats near a pin has to be guessed at; a tab
		# that HANGS off one is unambiguous, which matters most where two pins
		# are close (Hakaniemi and Siltasaari share a corner of the board).
		var pin: Vector2 = _layout[id]
		var stalk: Vector2 = box.get_center()
		stalk.y = box.position.y if stalk.y > pin.y else box.end.y
		stalk.x = clampf(pin.x, box.position.x + 6.0, box.end.x - 6.0)
		draw_line(pin, stalk, MapStyle.NODE_RIM, maxf(2.5 * _scale, 1.2), true)
		draw_circle(stalk, maxf(3.0 * _scale, 1.6), MapStyle.NODE_RIM)

		_label_tab(box, bg, edge)
		draw_string(_font, box.position + pad + Vector2(0, float(font_px) * 0.82), text,
			HORIZONTAL_ALIGNMENT_LEFT, -1, font_px, fg)


## A label tab as a piece of torn card rather than a rectangle.
##
## MAP.md §6 asks for "sparse marker names on separate rough paper tabs", and
## A label tab: a plain, properly square-cornered card.
##
## Reported directly, 2026-08-26: "the Piritori text box is wavy, not like a
## proper rectangle." It was — deliberately, as a torn-cardstock effect whose
## edge was jittered from a hash of the anchor id. On a phone-sized label that
## reads as a rendering fault rather than as paper, and it fought the one
## thing a name tab has to do, which is be legible instantly.
##
## Straight edges, one soft drop shadow for lift, one edge line so the card
## reads as thick rather than as a hole cut in the map.
func _label_tab(box: Rect2, bg: Color, edge: Color) -> void:
	var lift := maxf(2.0 * _scale, 1.0)
	draw_rect(Rect2(box.position + Vector2(0, lift), box.size), Color(0, 0, 0, 0.4))
	draw_rect(box, bg)
	draw_rect(box, edge, false, maxf(1.5 * _scale, 1.0))


func _draw_placeholder_note() -> void:
	draw_string(_font, Vector2(10, size.y - 8), tr("ui.prototype_relief"),
		HORIZONTAL_ALIGNMENT_LEFT, -1, 11, MapStyle.TINY_TEXT)


# ── interaction ───────────────────────────────────────────────────────────

func _is_live_lead(anchor_id: String) -> bool:
	return GameState.available_encounters_at(anchor_id).size() > 0


func _gui_input(event: InputEvent) -> void:
	if event is InputEventMouseMotion:
		var was := _hovered
		_hovered = _anchor_at(event.position)
		if was != _hovered:
			queue_redraw()
	elif event is InputEventMouseButton and event.pressed \
			and event.button_index == MOUSE_BUTTON_LEFT:
		var hit := _anchor_at(event.position)
		if hit != "":
			select(hit)
	elif event is InputEventScreenTouch and event.pressed:
		var hit := _anchor_at(event.position)
		if hit != "":
			select(hit)


func select(anchor_id: String) -> void:
	_selected = anchor_id
	GameState.current_anchor_id = anchor_id
	anchor_selected.emit(anchor_id)
	queue_redraw()


## Rectangular hit targets, at least 44px, even though the paper pin is round.
func _anchor_at(p: Vector2) -> String:
	var best := ""
	var best_d := INF
	for id in _hits:
		var rect: Rect2 = _hits[id]
		if rect.has_point(p):
			var d: float = rect.get_center().distance_to(p)
			if d < best_d:
				best_d = d
				best = id
	return best


func _reduced_motion() -> bool:
	return false
