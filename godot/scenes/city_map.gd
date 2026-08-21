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

var _selected: String = ""
var _hovered: String = ""
var _font: Font
var _t := 0.0


func _ready() -> void:
	_font = ThemeDB.fallback_font
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


## Fit the whole production boundary (§7: "fit the full boundary inside the
## world area"). The landmass is wider than the anchor spread, so the fit is
## computed from the geometry, not from the twelve pins.
func _rebuild_layout() -> void:
	_layout.clear()
	_hits.clear()
	var anchors := ContentRegistry.anchors()
	if anchors.is_empty():
		return

	var mn := Vector2(INF, INF)
	var mx := Vector2(-INF, -INF)

	for item in _layer("land-relief"):
		var pts: Array = item.get("points", [])
		for i in range(0, pts.size(), 2):
			var p := Vector2(pts[i], pts[i + 1])
			mn = mn.min(p)
			mx = mx.max(p)
	if mn.x == INF:
		for a in anchors:
			var p := Vector2(a["board"]["x"], a["board"]["y"])
			mn = mn.min(p)
			mx = mx.max(p)

	var span := mx - mn
	span.x = maxf(span.x, 1.0)
	span.y = maxf(span.y, 1.0)
	_mn = mn

	var m := maxf(minf(size.x, size.y) * MARGIN_RATIO, MARGIN_MIN)
	var avail := Vector2(maxf(size.x - m * 2.0, 32.0), maxf(size.y - m * 2.0, 32.0))
	_scale = minf(avail.x / span.x, avail.y / span.y)
	var drawn := span * _scale
	_origin = Vector2(m, m) + (avail - drawn) * 0.5

	for a in anchors:
		var pos := _to_screen(Vector2(a["board"]["x"], a["board"]["y"]))
		_layout[a["id"]] = pos
		var r := maxf(TOUCH_MIN, 26.0 * _scale)
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
	_draw_blocks()              # 5 (under the road cuts, as the collage reads)
	_draw_rail_and_roads()      # 4
	_draw_public_transit()      # 6
	_draw_ordinary_flow()       # 7
	_draw_crew_and_goods()      # 8
	_draw_anchors()             # 10 + 11
	_draw_labels()              # 12
	_draw_placeholder_note()


## 1-2. Deep paper backing, then water with its wave grain.
func _draw_backing_and_water() -> void:
	draw_rect(Rect2(Vector2.ZERO, size), MapStyle.WATER)
	var step := maxf(34.0 * _scale, 12.0)
	var col := MapStyle.WATER_WAVE
	col.a = 0.55
	var y := fmod(_t * 3.0, step)
	while y < size.y:
		draw_line(Vector2(0, y), Vector2(size.x, y), col, maxf(_scale * 2.0, 1.0), true)
		y += step


## 3. District relief: the land card with torn tan fibre at the seam.
func _draw_land() -> void:
	for item in _layer("land-relief"):
		var pts := _pts(item)
		if pts.size() < 3:
			continue
		if String(item.get("class", "")) == "land":
			draw_colored_polygon(pts, MapStyle.LAND)
			_draw_grain(pts)
			draw_polyline(pts, MapStyle.LAND_FIBRE, _w(MapStyle.LAND_FIBRE_W), true)
		else:
			var c := MapStyle.WATER_SHADOW
			c.a = float(item.get("opacity", 0.8))
			draw_colored_polygon(pts, c)


## Paper grain inside the land card: sparse fibres, seeded so it never crawls.
func _draw_grain(pts: PackedVector2Array) -> void:
	var bb := _bounds(pts)
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


func _land_polygon() -> PackedVector2Array:
	for item in _layer("land-relief"):
		if String(item.get("class", "")) == "land":
			return _pts(item)
	return PackedVector2Array()


func _water_shadows() -> Array:
	var out: Array = []
	for item in _layer("land-relief"):
		if String(item.get("class", "")) != "land":
			out.append(_pts(item))
	return out


func _bounds(pts: PackedVector2Array) -> Rect2:
	var mn := Vector2(INF, INF)
	var mx := Vector2(-INF, -INF)
	for p in pts:
		mn = mn.min(p)
		mx = mx.max(p)
	return Rect2(mn, mx - mn)


## 5. Minor street/block collage.
##
## The structural SVG carries nineteen LARGE district masses because it is a
## geometry blueprint, not final art. MAP.md §2 allows the visible relief to
## elaborate "labels, minor blocks and decorative streets" within a 12% local
## displacement, while "public anchors, coastline, rail edge and major corridor
## order may not be mirrored or rearranged" — so the masses are subdivided into
## a cut-card collage here and nothing structural moves.
##
## The subdivision is seeded, so the city is the same city every run.
const CELL_BOARD := 30.0      ## nominal block size in board units
const STREET_BOARD := 7.5     ## gap between blocks = a decorative street
const JITTER := 0.12          ## MAP.md §2 displacement allowance

func _draw_blocks() -> void:
	var land := _land_polygon()
	if land.size() < 3:
		return
	var shadows := _water_shadows()

	# The bed the blocks are cut out of. Everything left uncovered reads as a
	# decorative street, which is why it is lighter than the block faces.
	draw_colored_polygon(land, MapStyle.STREET_BED)

	var cell := maxf(CELL_BOARD * _scale, 7.0)
	var gap := maxf(STREET_BOARD * _scale, 1.5)
	var lift := maxf(1.5 * _scale, 1.0)
	var edge_w := maxf(_w(MapStyle.BLOCK_W) * 0.6, 1.0)

	# The nineteen authored masses do not tile the land; they mark where the
	# denser fabric sits. Use them to pick the tone, not to bound the grid.
	var masses: Array = []
	for item in _layer("minor-blocks"):
		var mp := _pts(item)
		if mp.size() >= 3:
			masses.append([mp, String(item.get("class", ""))])

	var bb := _bounds(land)
	var rng := RandomNumberGenerator.new()
	rng.seed = 20030101

	var row := 0
	var y := bb.position.y
	while y < bb.end.y:
		var col := 0
		var x := bb.position.x
		while x < bb.end.x:
			col += 1
			var o := Vector2(
				(rng.randf() - 0.5) * cell * JITTER * 2.0,
				(rng.randf() - 0.5) * cell * JITTER * 2.0)
			var r := Rect2(Vector2(x, y) + Vector2(gap, gap) * 0.5 + o,
				Vector2(cell - gap, cell - gap))
			x += cell
			if r.size.x <= 1.0 or r.size.y <= 1.0:
				continue

			var c := r.get_center()
			if not Geometry2D.is_point_in_polygon(c, land):
				continue
			var wet := false
			for sh in shadows:
				if Geometry2D.is_point_in_polygon(c, sh):
					wet = true
					break
			if wet:
				continue

			# tone: inside an authored mass keeps that mass's class
			var cls := "block" if (row + col) % 2 == 0 else "block2"
			for m in masses:
				if Geometry2D.is_point_in_polygon(c, m[0]):
					cls = String(m[1])
					break
			var pair := MapStyle.block_colors(cls)

			draw_rect(Rect2(r.position + Vector2(0, lift), r.size), Color(0, 0, 0, 0.32))
			draw_rect(r, pair[0])
			draw_rect(r, pair[1], false, edge_w)
		row += 1
		y += cell


## 4. Railway and major road cuts. Roads are a casing plus an inner strip, which
## is what gives the hand-cut grey ribbon its edge.
func _draw_rail_and_roads() -> void:
	var by_class: Dictionary = {}
	for item in _layer("rail-and-roads"):
		var c := String(item.get("class", ""))
		if not by_class.has(c):
			by_class[c] = []
		by_class[c].append(item)

	for item in by_class.get("road", []):
		var pts := _pts(item)
		if pts.size() >= 2:
			draw_polyline(pts, MapStyle.ROAD, _w(MapStyle.ROAD_W), true)
	for item in by_class.get("roadInner", []):
		var pts := _pts(item)
		if pts.size() >= 2:
			draw_polyline(pts, MapStyle.ROAD_INNER, _w(MapStyle.ROAD_INNER_W), true)
	for item in by_class.get("street", []):
		var pts := _pts(item)
		if pts.size() >= 2:
			draw_polyline(pts, MapStyle.STREET, _w(MapStyle.STREET_W), true)
	for item in by_class.get("rail", []):
		var pts := _pts(item)
		if pts.size() >= 2:
			draw_polyline(pts, MapStyle.RAIL, _w(MapStyle.RAIL_W), true)
	for item in by_class.get("railTie", []):
		var pts := _pts(item)
		if pts.size() >= 2:
			_draw_dashed(pts, MapStyle.RAIL_TIE, _w(MapStyle.RAIL_TIE_W),
				MapStyle.RAIL_TIE_DASH * _scale)


## 6. Public transit corridors: tram solid, metro dashed.
func _draw_public_transit() -> void:
	for item in _layer("public-transit"):
		var cls := String(item.get("class", ""))
		var pts := _pts(item)
		if pts.size() < 2:
			continue
		if cls == "tram":
			draw_polyline(pts, MapStyle.TRAM, _w(MapStyle.TRAM_W), true)
		elif cls == "metro":
			_draw_dashed(pts, MapStyle.METRO, _w(MapStyle.METRO_W),
				MapStyle.METRO_DASH * _scale)


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
	var r := maxf(17.0 * _scale, 9.0)

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
		draw_circle(pos, r * 0.52, fill)

	if live:
		var pulse: float = 1.0 if _reduced_motion() else 1.0 + 0.07 * sin(_t * 2.6)
		draw_arc(pos, r * 1.55 * pulse, 0, TAU, 44, MapStyle.ROUTE, _w(3.5), true)
	if id == _selected:
		draw_arc(pos, r * 1.32, 0, TAU, 40, MapStyle.TAB, _w(4.0), true)
	elif id == _hovered:
		draw_arc(pos, r * 1.32, 0, TAU, 40, MapStyle.SMALL_TEXT, _w(2.0), true)


func _draw_dashed_ring(c: Vector2, r: float, col: Color, width: float, dash: Vector2) -> void:
	var seg: float = maxf(dash.x + dash.y, 4.0)
	var count: int = maxi(int(TAU * r / seg), 6)
	for i in range(count):
		var a0 := (float(i) / count) * TAU
		var a1 := a0 + (dash.x / seg) * (TAU / count)
		draw_arc(c, r, a0, a1, 6, col, width, true)


# ── 12. labels on rough paper tabs ────────────────────────────────────────

func _draw_labels() -> void:
	var tight := _scale < 0.34
	for a in ContentRegistry.anchors():
		var id: String = a["id"]
		var state: String = a.get("sliceState", "locked")
		var live := _is_live_lead(id)
		if tight and not (live or id == _selected or state == "active"):
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

		draw_rect(Rect2(box.position + Vector2(0, maxf(2.0 * _scale, 1.0)), box.size),
			Color(0, 0, 0, 0.4))
		draw_rect(box, bg)
		draw_rect(box, edge, false, maxf(3.0 * _scale, 1.0))
		draw_string(_font, box.position + pad + Vector2(0, float(font_px) * 0.82), text,
			HORIZONTAL_ALIGNMENT_LEFT, -1, font_px, fg)


func _draw_placeholder_note() -> void:
	draw_string(_font, Vector2(10, size.y - 8),
		"structural relief from map/kallio-era1-2003-v1.svg — prototype treatment",
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
