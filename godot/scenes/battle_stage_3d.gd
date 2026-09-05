class_name BattleStage3D
extends SubViewportContainer
## The battle board, in 3D.
##
## Owner ruling 2026-08-22: the game is 3D (`PHASING.md` §1.055). This replaces
## what `formation_battle.gd` used to draw with `_draw()` — the stage, the grid
## and the units — and nothing else. The command console, the forecast, the
## withdrawal and every line of FightManager wiring stay exactly where they are,
## because none of that was ever about pixels.
##
## THE GRID IS GEOMETRY NOW, and that is the whole point (`PHASING.md` §1.056).
## The 2D board carried a square-tile rule, FORWARD (1, -0.5), LANE_AXIS
## (1, 0.5), a depth sort and an arena expressed in normalised plate
## coordinates — all of it to fake a projection that a camera does for free.
## There is no projection arithmetic anywhere in this file. A cell is a square
## on the ground; the camera is orthographic at yaw 45 and pitch -26.565
## (atan(0.5) — the same 2:1 the art is drawn in).
##
## A SubViewportContainer rather than a plain 3D scene, so the board still lives
## inside a Control and the console can float over it exactly as before. That is
## the pattern `presenter_3d.gd` already uses for Arvo.

## The places a fight can happen, keyed by the battle's `scene_asset_id`.
##
## There used to be exactly one stage, hardcoded. A second arriving is what
## turned that constant into a lookup — the same shape as UNIT_BY_ROLE, and for
## the same reason: content names a place, code resolves it to a file, and
## nothing in between gets to guess.
## Owner 2026-09-06: stage3d dioramas PARKED (awful + bury fighters).
## Map kept empty on purpose — restore entries when Art has a STAGE_SPEC
## floor. `?stage=` override still consults this table for art review.
const STAGE_BY_SCENE := {
}

## Used when a battle names a scene nothing has been built for. Unlike the unit
## fallback this one is quiet on purpose: a fight in the wrong yard is still a
## fight, where a fighter with no body is a bug you need to see.
## Owner 2026-09-06: stage3d dioramas parked (awful + bury fighters).
## Empty fallback — `_build_stage` must no-op when path is empty.
const STAGE_FALLBACK := ""
const USE_STAGE3D_ARENAS := false

## Set by DebugEntry from ?stage=, so a new arena can be walked onto without
## content having placed it anywhere yet. CLAUDE.md rule 6: a mode you cannot
## reach from a phone in under thirty seconds is not finished.
static var stage_override: String = ""


## Which place this is, handed over by formation_battle at mount. Empty means
## nobody said, and the fallback yard is used.
var scene_asset_id: String = ""


static func stage_path(scene_asset_id: String) -> String:
	## Owner 2026-09-06: park dioramas unless ?stage= override is set for art review.
	if not USE_STAGE3D_ARENAS and stage_override == "":
		return ""
	if stage_override != "":
		return String(STAGE_BY_SCENE.get(stage_override, STAGE_FALLBACK))
	return String(STAGE_BY_SCENE.get(scene_asset_id, STAGE_FALLBACK))
## A model PER ROLE. Every unit used to be the muscle recoloured, which made a
## 3v3 six copies of one person — the same failure the 2D board had before the
## cast sets were registered, arrived at from the opposite direction.
##
## Chosen on SILHOUETTE: a slab, a round one, a long coat, a thin vertical, a
## hood and a medium build. On a 3D board a role is identified by its shape.
const UNIT_BY_ROLE := {
	"driver":  "res://data/art/cast3d/driver-v01.glb",
	"fixer":   "res://data/art/cast3d/fixer-v01.glb",
	"local":   "res://data/art/cast3d/local-v01.glb",
	"muscle":  "res://data/art/cast3d/muscle-v01.glb",
	"runner":  "res://data/art/cast3d/runner-v01.glb",
	"watcher": "res://data/art/cast3d/watcher-v01.glb",
	# The MODULAR_CHARACTER_SYSTEM "Hired" subclass, which was in the design
	# with no model until one arrived rigged. Cheap gear, planted stance: the
	# people the roster churns through.
	"hired":   "res://data/art/cast3d/hired-v01.glb",
	# Police, standing in the yard. The white suit is a PLACEHOLDER by owner's
	# call — uniformed police get their own model later — and it is listed as one
	# so it cannot quietly become the answer.
	"police":  "res://data/art/cast3d/enforcer-v01.glb",
	# Opposition only. Deliberately absent from CrewGenerator.ROLES: `hired`
	# is what you buy, `enforcer` is what faces you, and the split is the
	# reason an enemy should not look like somebody on your own payroll.
	"enforcer": "res://data/art/cast3d/enforcer-v01.glb",
}

## Used when a fighter carries a role nothing has been modelled for. Loud rather
## than silent: a missing role should look like the wrong person, not like a
## person who happens to be the muscle.
const UNIT_FALLBACK := "res://data/art/cast3d/muscle-v01.glb"


## Extra bodies a role may wear, beyond the one in UNIT_BY_ROLE.
##
## SPEC.md §5 says a role needs ONE mesh and that crew variety comes from the
## free hue-band recolour. That still holds for the six specialists, where the
## silhouette IS the role: a watcher must read as a watcher at a glance, so a
## second watcher shape would cost more than it gave.
##
## `hired` is the exception, and on purpose. Its identity is "somebody off the
## street" rather than a tactical read, so two different ordinary bodies make it
## MORE itself, not less. Variants are free once the mesh exists — no credits, no
## rig work — but they are only worth taking where they do not blur a role.
const UNIT_VARIANTS := {
	"hired": [
		"res://data/art/cast3d/hired-v01.glb",
		"res://data/art/cast3d/hired-b-v01.glb",
		"res://data/art/cast3d/street-raver-v01.glb",
		# parka-man RETIRED from this pool 2026-09-02. He was added here on the
		# reasoning that a heavy man in a work parka is an ordinary person off
		# the street, which is exactly what `hired` means — sound, except the
		# asset HAS NO SKELETON. `port/rig-vectors.mjs` measured it: 13 of 14
		# cast bodies carry an identical 24-joint rig and can take the shared
		# fight clips; this one carries none and cannot be animated at all.
		# With clips now wired in both builds, leaving him in a pool of four
		# meant roughly one hired crew member in four standing motionless while
		# the other three fought.
		#
		# He stays REGISTERED — he is a real, paid-for, usable body for any
		# ambient or non-combat use, and the manifest note keeps his history.
		# What he is not is a fighter. The manifest's `role` is cleared in the
		# same change, because `test_battle`'s own gate asserts this list and
		# the manifest agree.
	],
}


## Which body this particular person wears.
##
## `fighter_id` picks deterministically, so the same crew member is the same
## person every time the board is drawn — a figure that changed shape between
## rounds would be worse than one that repeats.
static func unit_path(role: String, fighter_id: String = "") -> String:
	if UNIT_VARIANTS.has(role):
		var options: Array = UNIT_VARIANTS[role]
		if fighter_id == "":
			return String(options[0])
		return String(options[absi(fighter_id.hash()) % options.size()])
	return String(UNIT_BY_ROLE.get(role, UNIT_FALLBACK))

## Fight clips, keyed by what a fighter is DOING. They arrive as separate glbs
## because that is how Meshy delivers them; their animations are lifted onto the
## unit at load so one figure can play any of them.
const CLIPS := {
	"idle":   "res://data/art/cast3d/clips/muscle-idle-v01.glb",
	"attack": "res://data/art/cast3d/clips/muscle-attack-v01.glb",
	"hit":    "res://data/art/cast3d/clips/muscle-behit-v01.glb",
	"dead":   "res://data/art/cast3d/clips/muscle-dead-v01.glb",
}

## Loaded once and shared: four clips fetched per unit per refresh would reload
## the same files six times a round.
static var _clip_cache: Dictionary = {}

## World size of one cell — DERIVED, not chosen. The board is fitted to the
## arena's own footprint at load, so a bigger yard gets a bigger board rather
## than a small one floating in the middle of it. Set in _fit_board().
var CELL := 0.78

## How much of the yard's shorter side the playable board should span. The rest
## is where cover, props and the crowd live.
const BOARD_COVERAGE := 0.72

## The diorama's walkable surface is NOT at y=0 — the base has real thickness,
## so the ground sits up inside the bounding box. Measured at load; the first
## prototype guessed and stood the crew in mid-air above a wall.
var _ground := 0.0

## Fraction of the arena's footprint sampled when looking for the ground. Kept
## small so the sample sits in the open middle of the yard rather than in its
## furniture.
const GROUND_SAMPLE := 0.34

## Half the arena's footprint, measured at load. The faint grid stops here
## rather than running on into the void.
var _arena_half := Vector2(6.0, 6.0)

const SIDE_CYAN := Color("#57c8e8")
const SIDE_RED := Color("#c8443c")
## A third side reads as neither. Cold white-blue: institutional, and
## deliberately not a warm colour that would suggest an ally.
const SIDE_THIRD := Color("#dfe6ef")
const NEUTRAL_GREY := Color("#8d9199")

var fight: FightManager = null

var _vp: SubViewport
var _world: Node3D
var _cam: Camera3D
var _cells: Node3D
var _units: Node3D
var _unit_nodes: Dictionary = {}     ## fighter_id -> Node3D
var _highlight: Dictionary = {}      ## Vector2i(lane, depth) -> String
## Whoever is mid-command, so the board can show the swing rather than a idle.
var _acting_id := ""

## Recolour: one rigged mesh becomes a crew. Skin and boots are protected
## explicitly, because pale skin and a pale jacket are both low-saturation and
## bright — a band wide enough for the jacket turns every face green.
const RECOLOUR := """
shader_type spatial;
uniform sampler2D base : source_color, hint_default_white;
uniform float jacket_shift = 0.0;
uniform float trouser_shift = 0.0;
uniform float dim = 1.0;
uniform vec3 rim_tint = vec3(0.62, 0.78, 1.0);
uniform float rim_power = 2.6;
uniform float rim_gain = 0.85;
uniform float lift = 0.10;
vec3 rgb2hsv(vec3 c){
	vec4 K = vec4(0.0,-1.0/3.0,2.0/3.0,-1.0);
	vec4 p = mix(vec4(c.bg,K.wz), vec4(c.gb,K.xy), step(c.b,c.g));
	vec4 q = mix(vec4(p.xyw,c.r), vec4(c.r,p.yzx), step(p.x,c.r));
	float d = q.x-min(q.w,q.y);
	return vec3(abs(q.z+(q.w-q.y)/(6.0*d+1e-10)), d/(q.x+1e-10), q.x);
}
vec3 hsv2rgb(vec3 c){
	vec4 K = vec4(1.0,2.0/3.0,1.0/3.0,3.0);
	vec3 p = abs(fract(c.xxx+K.xyz)*6.0-K.www);
	return c.z*mix(K.xxx, clamp(p-K.xxx,0.0,1.0), c.y);
}
void fragment(){
	vec3 c = texture(base, UV).rgb;
	vec3 h = rgb2hsv(c);
	bool skin  = h.x < 0.09 && h.y > 0.22 && h.y < 0.62 && h.z > 0.35;
	bool boots = h.x < 0.09 && h.y >= 0.62;
	if (!skin && !boots) {
		if (h.y < 0.30 && h.z > 0.45) h.x = fract(h.x + jacket_shift);
		else if (h.x > 0.45 && h.x < 0.62) h.x = fract(h.x + trouser_shift);
	}
	// LIFT, then RIM.
	//
	// Four of the six wear dark clothes and the stage is a night yard, so at
	// battle scale the crew read as six dark shapes — the silhouettes differ,
	// which was the point of choosing them, but the difference was invisible.
	//
	// The lift is a floor under the albedo so black cloth is not pure black.
	// The rim is what actually separates a figure from the ground: a cool edge
	// where the surface turns away from the viewer, which is how a person is
	// picked out against a dark street in real life.
	vec3 col = hsv2rgb(h);
	col = mix(col, col + vec3(lift), 1.0 - h.z);
	ALBEDO = col * dim;
	ROUGHNESS = 0.9;

	float f = pow(1.0 - clamp(dot(normalize(NORMAL), normalize(VIEW)), 0.0, 1.0),
		rim_power);
	EMISSION = rim_tint * f * rim_gain * dim;
}
"""


func _ready() -> void:
	stretch = true
	mouse_filter = Control.MOUSE_FILTER_IGNORE

	_vp = SubViewport.new()
	_vp.transparent_bg = false
	_vp.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	_vp.msaa_3d = Viewport.MSAA_2X
	add_child(_vp)

	_world = Node3D.new()
	_vp.add_child(_world)

	_build_night()
	_build_stage()
	_build_grid()

	_units = Node3D.new()
	_world.add_child(_units)

	_build_camera()


## Cold ambient, one warm practical, and shadows. The shadow is what does the
## work: a stylised figure and a photoreal yard stop arguing the moment the
## figure casts a real shadow onto the ground, which no amount of palette
## matching achieves.
func _build_night() -> void:
	var env := Environment.new()
	env.background_mode = Environment.BG_COLOR
	env.background_color = Color("#0b0e13")
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color("#6a8aaa")
	env.ambient_light_energy = 1.45
	env.fog_enabled = true
	env.fog_light_color = Color("#12161d")
	env.fog_density = 0.02
	env.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	env.glow_enabled = true
	env.glow_intensity = 0.22
	var we := WorldEnvironment.new()
	we.environment = env
	_world.add_child(we)

	var moon := DirectionalLight3D.new()
	moon.rotation_degrees = Vector3(-56, 34, 0)
	moon.light_color = Color("#7f9ec4")
	moon.light_energy = 1.15
	moon.shadow_enabled = true
	_world.add_child(moon)

	var lamp := OmniLight3D.new()
	lamp.position = Vector3(-2.1, 2.4, 0.9)
	lamp.light_color = Color("#ffcf8f")
	lamp.light_energy = 11.0
	lamp.omni_range = 9.0
	lamp.shadow_enabled = true
	_world.add_child(lamp)


func _build_stage() -> void:
	var stage := stage_path(scene_asset_id)
	if stage == "" or not ResourceLoader.exists(stage):
		# Parked dioramas: 2D plate stays visible in formation_battle; cast
		# still stands on the default slab sized from `_arena_half`.
		_build_ground_fill()
		_fit_board()
		return
	var a := (load(stage) as PackedScene).instantiate()
	a.scale = Vector3(5.4, 5.4, 5.4)
	_world.add_child(a)
	# Global transforms are only real once the node is in the tree, and both the
	# bounding box and the ground sample use them.
	a.force_update_transform()
	var box := _aabb(a)
	_ground = _measure_ground(a, box)

	# CENTRE THE ARENA ON THE BOARD, not the other way round. A diorama's own
	# origin is wherever the generator put it, so the board came out sitting off
	# to one side of the yard. The board is the fixed thing (PHASING §1.055), so
	# the arena moves to meet it.
	var c := box.get_center()
	a.position -= Vector3(c.x, 0.0, c.z)
	_arena_half = Vector2(box.size.x, box.size.z) * 0.5
	_build_ground_fill()
	_fit_board()


## CONCRETE UNDER THE HOLES.
##
## A generated diorama models what it was asked for and nothing else, so the
## ground is whatever the generator happened to build — Kattilahalli is a hall
## with open sides and simply has no floor beyond its own footprint. Figures at
## the edge of the board would stand on nothing and the camera would see through
## to the skybox.
##
## So a plain slab is laid under the whole arena. It is not scenery and does not
## try to be: it reads as the hardstanding that a Helsinki industrial yard
## actually is, and it only shows where the diorama left a gap.
##
## Placed slightly BELOW the measured ground rather than exactly on it. Two
## coplanar surfaces z-fight, which flickers as the camera moves and looks far
## worse than a hole; a couple of centimetres down is invisible through a gap
## and never fights.
##
## Sized from STAGE_SPEC.md §1.1 — the floor must be larger than the arena, not
## equal to it, or the board runs to the exact edge of the world.
const GROUND_MARGIN := 1.22
const GROUND_DROP := 0.02

func _build_ground_fill() -> void:
	var slab := MeshInstance3D.new()
	var plane := PlaneMesh.new()
	var span := maxf(_arena_half.x, _arena_half.y) * 2.0 * GROUND_MARGIN
	plane.size = Vector2(span, span)
	slab.mesh = plane

	var mat := StandardMaterial3D.new()
	# Wet night concrete: desaturated, dark, and rough enough that the one warm
	# lamp does not turn the whole floor into a mirror.
	mat.albedo_color = Color("#3A3D3F")
	mat.roughness = 0.92
	mat.metallic = 0.0
	mat.specular_mode = BaseMaterial3D.SPECULAR_DISABLED
	slab.material_override = mat

	slab.position = Vector3(0.0, _ground - GROUND_DROP, 0.0)
	# Cast nothing: it is a gap filler, and a slab shadowing the arena from
	# underneath would darken the very holes it exists to hide.
	slab.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	_world.add_child(slab)


## One cell size, from the arena. The 2D board had this backwards — a fixed
## board and a play area hand-tuned per painting. Here the board measures the
## ground it was given.
func _fit_board() -> void:
	var span := minf(_arena_half.x, _arena_half.y) * 2.0 * BOARD_COVERAGE
	var across := maxf(float(FightBoard.lanes), float(FightBoard.total_rows()))
	CELL = maxf(span / across, 0.15)


## FIND THE WALKABLE SURFACE. A fraction of the bounding box does not work: a
## diorama's height is mostly tree and lamp-post, so "30% up from the bottom"
## landed about two metres above the ground and the whole board floated.
##
## The ground is measured instead. Vertices are sampled from the OPEN MIDDLE of
## the yard only — where nothing stands — and the highest of those is the
## surface people walk on. Everything below it is the thickness of the base.
func _measure_ground(root: Node, box: AABB) -> float:
	var lim := Vector2(box.size.x, box.size.z) * 0.5 * GROUND_SAMPLE
	var mid := box.get_center()
	var best := -INF
	var found := 0
	for mi in _meshes(root):
		var mesh: Mesh = mi.mesh
		if mesh == null:
			continue
		for surf in range(mesh.get_surface_count()):
			var arr: Array = mesh.surface_get_arrays(surf)
			if arr.size() <= Mesh.ARRAY_VERTEX:
				continue
			var verts: PackedVector3Array = arr[Mesh.ARRAY_VERTEX]
			var xf: Transform3D = mi.global_transform if mi.is_inside_tree() else mi.transform
			# Sampling every vertex of a 30k mesh is wasted work for a single
			# number; a stride is plenty to find a flat plane.
			var step := maxi(1, verts.size() / 4000)
			for i in range(0, verts.size(), step):
				var v: Vector3 = xf * verts[i]
				if absf(v.x - mid.x) > lim.x or absf(v.z - mid.z) > lim.y:
					continue
				found += 1
				if v.y > best:
					best = v.y
	if found == 0 or best == -INF:
		push_warning("battle_stage_3d: could not measure the ground; using the box")
		return box.position.y + box.size.y * 0.25
	return best


func _meshes(n: Node, out: Array = []) -> Array:
	if n is MeshInstance3D:
		out.append(n)
	for c in n.get_children():
		_meshes(c, out)
	return out


## Two grids, per the owner: the PLAYABLE board centred on the yard, and a
## fainter one running wall to wall behind it.
##
## The wide one is not a board and nothing may stand on it. It is there because
## a small bright rectangle floating on a large dark yard reads as a mat someone
## put down, while a ground that is ruled all over reads as a place with a
## marked-out area in it.
func _build_grid() -> void:
	_cells = Node3D.new()
	_world.add_child(_cells)

	var lanes := FightBoard.lanes
	var depth := FightBoard.total_rows()

	# The faint grid runs wall to wall — but only as far as there is wall. It
	# stops at the arena's own footprint, because ruling the empty space beyond
	# the yard just draws attention to the fact that the yard has an edge.
	var reach_l := int(ceil(_arena_half.x / CELL)) + 1
	var reach_d := int(ceil(_arena_half.y / CELL)) + 1
	for d in range(-reach_d, depth + reach_d):
		for l in range(-reach_l, lanes + reach_l):
			if l >= 0 and l < lanes and d >= 0 and d < depth:
				continue
			var at := cell_world(l, d)
			if absf(at.x) > _arena_half.x * 0.92 or absf(at.z) > _arena_half.y * 0.92:
				continue
			_cells.add_child(_quad(l, d, lanes, depth,
				Color(0.62, 0.68, 0.75, 0.05), 0.92))

	# The board itself, banded: player rows, neutral, opposition.
	for d in range(depth):
		var col := NEUTRAL_GREY
		if d < FightBoard.rows:
			col = SIDE_CYAN
		elif not FightBoard.is_neutral_depth(d):
			col = SIDE_RED
		for l in range(lanes):
			var c := col
			c.a = 0.20
			_cells.add_child(_quad(l, d, lanes, depth, c, 0.94))


func _quad(lane: int, depth_i: int, lanes: int, depth: int,
		col: Color, fill: float) -> MeshInstance3D:
	var m := MeshInstance3D.new()
	var q := QuadMesh.new()
	q.size = Vector2(CELL * fill, CELL * fill)
	m.mesh = q
	m.rotation_degrees = Vector3(-90, 0, 0)
	m.position = cell_world(lane, depth_i) + Vector3(0, 0.012, 0)
	var mat := StandardMaterial3D.new()
	mat.albedo_color = col
	mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	m.material_override = mat
	return m


## A cell's centre in world space. The board is CENTRED on the arena, which is
## what "more centred" means concretely: the middle of the neutral band sits at
## the origin, not the player's back rank.
func cell_world(lane: int, depth_i: int) -> Vector3:
	var lanes := float(FightBoard.lanes)
	var depth := float(FightBoard.total_rows())
	return Vector3(
		(float(lane) - (lanes - 1.0) * 0.5) * CELL,
		_ground,
		(float(depth_i) - (depth - 1.0) * 0.5) * CELL)


## Orthographic, yaw 45, pitch -atan(0.5). Perspective would make the arena's
## far edge a different size from its near one and the grid would stop being a
## grid.
func _build_camera() -> void:
	_cam = Camera3D.new()
	_cam.projection = Camera3D.PROJECTION_ORTHOGONAL
	# Framed on the board's own diagonal so the whole thing is in shot whatever
	# size the arena turned out to be.
	var board_span := maxf(float(FightBoard.lanes), float(FightBoard.total_rows())) * CELL
	_cam.size = board_span * 1.5
	_cam.rotation_degrees = Vector3(-26.565, -135.0, 0.0)
	# FROM THE PLAYER'S SIDE. The player's rows are the low depths, which sit at
	# negative Z, so a camera parked at +X/+Z was standing behind the OPPOSITION
	# and looking at the player's crew across the board. Your own people belong
	# in the foreground — the rim light made it obvious, because the near team
	# was rimmed in the opposition's red.
	var back := board_span * 1.6
	_cam.position = Vector3(-back, back * 0.62 + _ground, -back)
	_world.add_child(_cam)


## Rebuild the units from the fight's own state. Called whenever the model moves.
func refresh(acting_id: String = "") -> void:
	_acting_id = acting_id
	if fight == null or _units == null:
		return
	for c in _units.get_children():
		c.queue_free()
	_unit_nodes.clear()
	var sh := Shader.new()
	sh.code = RECOLOUR
	var i := 0
	for side in [Fighter.Side.PLAYER, Fighter.Side.OPPOSITION]:
		for f in fight.get_fighters(side):
			if f == null:
				continue
			var path := unit_path(String(f.role), String(f.fighter_id))
			if not ResourceLoader.exists(path):
				continue
			var n := (load(path) as PackedScene).instantiate()
			n.position = cell_world(f.slot.x, f.slot.y)
			n.scale = Vector3(0.60, 0.60, 0.60)
			# Face the other side across the board.
			n.rotation_degrees = Vector3(0,
				225.0 if side == Fighter.Side.PLAYER else 45.0, 0)
			_units.add_child(n)
			_unit_nodes[f.fighter_id] = n
			_paint(n, sh, i, f)
			_animate(n, f)
			i += 1


## One mesh, many people. The shift is derived from the fighter's own id so a
## given person looks the same every time the board is rebuilt.
func _paint(n: Node, sh: Shader, index: int, f: Fighter) -> void:
	var mi := _mesh(n)
	if mi == null:
		return
	var tex: Texture2D = null
	var m0 := mi.mesh.surface_get_material(0)
	if m0 is BaseMaterial3D:
		tex = (m0 as BaseMaterial3D).albedo_texture
	# Each role now has its own model, so the recolour's job changed: it no
	# longer has to invent six different people out of one mesh, only to tell
	# apart two hirelings of the SAME role. A gentle shift keeps the role's own
	# colours recognisable — a driver who is bright purple is not a driver.
	var seed_v := float(abs(hash(f.fighter_id)) % 1000) / 1000.0
	var mat := ShaderMaterial.new()
	mat.shader = sh
	mat.set_shader_parameter("base", tex)
	mat.set_shader_parameter("jacket_shift", seed_v * 0.16 - 0.08)
	mat.set_shader_parameter("trouser_shift", seed_v * 0.20 - 0.10)
	# Downed and routed units read as darker rather than absent.
	mat.set_shader_parameter("dim",
		0.45 if not f.is_active() else 1.0)
	# The side's own colour in the rim, so which team a figure belongs to is
	# readable from its edge before any label is read. §12.2 asks for team and
	# intent to be readable, and colour alone never carries meaning — the
	# silhouette carries the role, the rim carries the side.
	# Three sides now, so a two-way choice would have painted the police as the
	# opposition — the same class of mistake as the loot bug in COMBAT.md
	# §9.5.36, but visual: they would LOOK like somebody to fight.
	var side_tint := SIDE_THIRD
	if f.side == Fighter.Side.PLAYER:
		side_tint = SIDE_CYAN
	elif f.side == Fighter.Side.OPPOSITION:
		side_tint = SIDE_RED
	mat.set_shader_parameter("rim_tint",
		Vector3(side_tint.r, side_tint.g, side_tint.b))
	mat.set_shader_parameter("rim_gain", 0.35 if not f.is_active() else 0.85)
	mi.set_surface_override_material(0, mat)


## Every clip in the library, loaded once.
## SHARED FIGHT CLIPS ARE OFF — see `_animate`. Keep the CLIPS table and this
## loader for the re-export pass; until then return empty so we never call the
## deleted `_first` helper (CI parse error on test_battle_ui).
static func _clips() -> Dictionary:
	return {}


## What a fighter should be seen doing, from its own state. The board already
## knows this — `PoseArt.pose_for()` answers the same question for the 2D
## renderer — so the mapping lives in one shape rather than two vocabularies.
static func clip_for(f: Fighter, acting: bool) -> String:
	match f.status:
		Fighter.Status.DOWNED, Fighter.Status.ROUTED:
			return "dead"
		Fighter.Status.SHAKEN:
			return "hit"
		_:
			return "attack" if acting else "idle"


func _animate(n: Node, f: Fighter) -> void:
	## SHARED FIGHT CLIPS ARE OFF (QUEUE 2026-09-02 owner option 3).
	## `clips/muscle-*-v01.glb` are not the muscle body's own rest pose — every
	## rigged body fails `port/rig-vectors.mjs`. Three retarget attempts failed.
	## Web already replaced them with `fight-motion.js` (deltas on own rest).
	## Godot keeps still, correct bodies until clips are re-exported against a
	## real rig (Meshy after credit refresh + T-pose review). Do not re-enable
	## the CLIPS table below without that asset fix.
	return

func _mesh(n: Node) -> MeshInstance3D:
	if n is MeshInstance3D:
		return n
	for c in n.get_children():
		var r := _mesh(c)
		if r != null:
			return r
	return null


func _find(n: Node, cls: String) -> Node:
	if n.is_class(cls):
		return n
	for c in n.get_children():
		var r := _find(c, cls)
		if r != null:
			return r
	return null


func _aabb(n: Node, box: AABB = AABB()) -> AABB:
	if n is MeshInstance3D:
		var mi := n as MeshInstance3D
		var b := mi.get_aabb()
		if mi.is_inside_tree():
			b = mi.global_transform * b
		box = b if box.size == Vector3.ZERO else box.merge(b)
	for c in n.get_children():
		box = _aabb(c, box)
	return box


func _notification(what: int) -> void:
	if what == NOTIFICATION_RESIZED and _vp:
		_vp.size = Vector2i(maxi(int(size.x), 1), maxi(int(size.y), 1))
