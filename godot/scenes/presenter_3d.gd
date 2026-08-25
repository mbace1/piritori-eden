extends SubViewportContainer
## Arvo Linde, live inside the television.
##
## ART_BIBLE §13.2, the one 3D exception in the whole game:
##   "Arvo may use a low-detail animation-ready 3D source model, including a
##   Meshy workflow, because recurring speech benefits from lip sync and
##   restrained hand motion. The exception is tightly contained: only the
##   moving presenter inside the TV uses 3D... output receives limited colour,
##   analogue softness, slight scanlines and CRT bloom... idle motion is
##   minimal: breathing, blink, paper glance, small hand gesture."
##
## So this is a real 3D render, but everything that reaches the player passes
## through the posterise shader first. The CRT shell, lower third and the whole
## surrounding world stay cut-cardstock and are drawn by news_event.gd.

## Registered as `presenter-arvo-linde-v05` in art/v3/manifest.json, so
## sync-data.mjs carries it like any other approved asset — it is no longer
## hand-staged.
## Everyone who can appear and speak (`UX_SPEC.md` §18).
##
## Only Arvo has a model. The others are listed as the backlog they are, so a
## missing speaker fails by name here instead of silently rendering nobody.
const SPEAKERS := {
	"arvo": "res://data/art/presenter/arvo-linde-v05.glb",
	# BORROWED BODIES, so the LOCATION and INSET framings can be judged on a
	# screen before anybody is commissioned. Owner's call, 2026-08-22: "use any
	# character in these places for now."
	# Toko has his own model now, apron and all — fetched off the Meshy account
	# by task id rather than uploaded. First named character to stop borrowing.
	"toko": "res://data/art/cast3d/toko-v01.glb",
	"shot-caller": "res://data/art/cast3d/enforcer-v01.glb",
	# Sean McCormick is a participant in authored encounters and had no model.
	# A suited older man fits a family that runs bars and restaurants, so this
	# one is cast rather than borrowed.
	"sean-mccormick": "res://data/art/cast3d/suited-man-v01.glb",
}

## Which of the above is standing in for somebody who does not exist yet.
##
## Declared rather than silent. A placeholder that nothing distinguishes from a
## finished asset is how the wrong face ships: it looks deliberate, so nobody
## questions it. This list is what a gate reads and what QUEUE.md tracks.
##
## The enforcer standing in for a faction shot-caller is nearly right by accident
## — a white suit reads as somebody senior — and is still listed, because "nearly
## right" is exactly the kind of thing that quietly becomes permanent.
const PLACEHOLDER_SPEAKERS := ["shot-caller"]


static func is_placeholder(id: String) -> bool:
	return PLACEHOLDER_SPEAKERS.has(id)

## Kept so existing callers and tests do not break while the news is still the
## only screen using this.
const MODEL := "res://data/art/presenter/arvo-linde-v05.glb"

## How much of them the camera takes in. One component, three framings
## (`UX_SPEC.md` §18): the television owns the whole window, a location shows the
## place, and a battle puts a shot-caller in the corner of the board.
enum Framing {
	BROADCAST,   ## full screen, head and shoulders — the news
	LOCATION,    ## the person in their place — Toko in the noodle bar
	INSET,       ## small, over something else — the opposing shot-caller
}

## Set before the node enters the tree. Defaults keep the news exactly as it was.
var speaker_id: String = "arvo"
var framing: Framing = Framing.BROADCAST

## Drop the studio field and let whatever is behind this node show through.
##
## The flat blue is right for a television and wrong at a COUNTER, where the
## painted room is the backdrop — a speaker standing in his own bar in front of
## a blue screen reads as a compositing mistake, which is the exact failure
## `DESIGN_AUTHORITY`'s 3D-layer ruling exists to avoid. Off by default, so the
## news and the board inset are untouched.
var transparent: bool = false

## Levels per channel. §13.2 asks for "limited colour"; the concept was tested
## down to eight and held.
@export var colour_levels: int = 10

var _viewport: SubViewport
var _rig: Node3D
var _skeleton: Skeleton3D
var _camera: Camera3D
var _t := 0.0
var _chest_bone := -1
var _head_bone := -1
var _rest_chest := Transform3D()
var _rest_head := Transform3D()


func model_path() -> String:
	return String(SPEAKERS.get(speaker_id, ""))


func available() -> bool:
	var p := model_path()
	if p == "":
		push_warning("presenter_3d: no model for speaker '%s' — see UX_SPEC 18" % speaker_id)
		return false
	return ResourceLoader.exists(p)


func _ready() -> void:
	stretch = true
	mouse_filter = Control.MOUSE_FILTER_IGNORE

	_viewport = SubViewport.new()
	_viewport.transparent_bg = transparent
	# THE SPEAKER STANDS IN HIS OWN WORLD, and this line is load-bearing.
	#
	# A SubViewport SHARES its parent's World3D unless told otherwise. On the
	# news that is invisible — nothing else is in the scene — so it survived
	# every capture of the only screen using this. Over the BOARD it is not: the
	# INSET came up showing one of the yard's dead birches behind the speaker,
	# lit by the battle's lights on top of the studio's own, which posterised his
	# white suit to a flat white blob with two faint eyes in it.
	#
	# Both symptoms are one cause. The fix is one line, and it must come BEFORE
	# the environment and the lights below, or they are added to a world this
	# viewport is about to stop using.
	_viewport.own_world_3d = true
	_viewport.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	_viewport.msaa_2d = Viewport.MSAA_DISABLED
	_viewport.msaa_3d = Viewport.MSAA_2X
	add_child(_viewport)

	# The studio: a flat low-saturation blue field, per ART_BIBLE §4.3 — unless
	# somebody is standing in a real room, in which case the room is the field.
	var env := Environment.new()
	env.background_mode = Environment.BG_CLEAR_COLOR if transparent else Environment.BG_COLOR
	env.background_color = Color("#1b2a36")
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color("#8fa8b8")
	env.ambient_light_energy = 0.9
	var world := WorldEnvironment.new()
	world.environment = env
	_viewport.add_child(world)

	# Flat frontal key, as a news studio actually lights a presenter.
	var key := DirectionalLight3D.new()
	key.light_energy = 1.5
	key.rotation_degrees = Vector3(-12, 8, 0)
	_viewport.add_child(key)
	var fill := DirectionalLight3D.new()
	fill.light_energy = 0.5
	fill.rotation_degrees = Vector3(-4, -150, 0)
	_viewport.add_child(fill)

	_camera = Camera3D.new()
	_viewport.add_child(_camera)

	if available():
		_rig = (load(model_path()) as PackedScene).instantiate()
		_viewport.add_child(_rig)
		_find_skeleton(_rig)
		_frame_presenter()

	_apply_tube_shader()


func _find_skeleton(n: Node) -> void:
	if n is Skeleton3D:
		_skeleton = n
		for i in range(_skeleton.get_bone_count()):
			var nm := _skeleton.get_bone_name(i).to_lower()
			if _head_bone < 0 and nm.contains("head"):
				_head_bone = i
			if _chest_bone < 0 and (nm.contains("spine") or nm.contains("chest")):
				_chest_bone = i
		if _head_bone >= 0:
			_rest_head = _skeleton.get_bone_pose(_head_bone)
		if _chest_bone >= 0:
			_rest_chest = _skeleton.get_bone_pose(_chest_bone)
		return
	for c in n.get_children():
		_find_skeleton(c)


## Frame him head and shoulders, seated height, as a bulletin does — and drop
## the arms out of the T-pose so he is not a scarecrow on air.
func _frame_presenter() -> void:
	if _rig == null:
		return
	# BROADCAST is the shot the news was built around and stays EXACTLY as it
	# was — hand numbers, tuned against Arvo, approved. Nothing below may move
	# it.
	if framing == Framing.BROADCAST:
		_rig.position = Vector3(0, -1.32, 0)
		_camera.position = Vector3(0, 0.10, 1.05)
		_camera.fov = 42.0
		_lower_arms()
		return

	# The other two were hand numbers too, and their own comment called them
	# "starting points to be judged on a screen". Judged: the INSET cropped the
	# top of the shot-caller's head off. The cause is that a hand offset is a
	# measurement of ONE model — it was tuned against a 1.7m body and every
	# speaker is a different height, so the same numbers frame each of them
	# differently. Nobody would find that by reading it.
	#
	# So these two are DERIVED from the model instead: aim at a fraction of its
	# own height, and show a fraction of its own height. Both are ratios of a
	# human figure and hold for any body the cast grows.
	var aim := 0.0
	var extent := 0.0
	match framing:
		Framing.LOCATION:
			# A person standing in a room, not a bust: waist up, so the counter
			# or the table they are behind has somewhere to be.
			aim = 0.72
			extent = 0.62
			_camera.fov = 46.0
		_:  # INSET
			# The inset is small on screen, so the face has to fill it or it
			# reads as a smudge over the board — head and a little shoulder.
			aim = 0.93
			extent = 0.26
			_camera.fov = 38.0

	var h := _rig_height()
	# PIRITORI_FRAME_DEBUG prints what was measured. Worth keeping: the first
	# version of _rig_height() returned 0.016 for a 1.7m man and the only
	# symptom on screen was an empty blue square.
	if OS.get_environment("PIRITORI_FRAME_DEBUG") != "":
		print("frame %s: h=%.3f aim=%.2f extent=%.2f" % [speaker_id, h, aim, extent])
	if h <= 0.0:
		# No visual instances to measure. Fall back to the old hand numbers
		# rather than dividing by zero and putting the camera inside his head.
		push_warning("presenter_3d: could not measure '%s'; using fallback framing" % speaker_id)
		h = 1.70
	_rig.position = Vector3(0, -aim * h, 0)
	var half := 0.5 * extent * h
	_camera.position = Vector3(0, 0.0, half / tan(deg_to_rad(_camera.fov) * 0.5))
	_lower_arms()


## The model's own height, in its own units, measured off the SKELETON.
##
## Measured rather than declared: `art/v3/manifest.json` records triangle counts
## and bone counts but not heights, and a rig that arrives 12% taller than the
## last one silently reframes the shot if the camera is placed by hand.
##
## It reads bones and not mesh bounds, and that is not a preference — it is the
## first thing tried and it failed. `MeshInstance3D.get_aabb()` on a SKINNED
## mesh does not return the posed figure's box: Toko came back 0.016 units tall,
## which put the camera 5mm from a 1.7m man and rendered an empty blue square.
## Bone rests are in the skeleton's own space and are always real.
##
## Bones stop at the top of the skull rather than the top of the hair, so the
## span is scaled back up by SKULL_TO_CROWN. Every speaker here is rigged — that
## is what `Framing` is for — so there is no unskinned case to handle.
const SKULL_TO_CROWN := 0.94

func _rig_height() -> float:
	if _skeleton == null:
		return 0.0
	var lo := INF
	var hi := -INF
	var t: Transform3D = _rig.global_transform.affine_inverse() * _skeleton.global_transform
	for i in range(_skeleton.get_bone_count()):
		var y: float = (t * _skeleton.get_bone_global_rest(i).origin).y
		lo = min(lo, y)
		hi = max(hi, y)
	return 0.0 if hi <= lo else (hi - lo) / SKULL_TO_CROWN


## The rig arrives in a T-pose because that is what rigs cleanly. On air he
## needs them down, so the shoulder bones are rotated once at load.
func _lower_arms() -> void:
	if _skeleton == null:
		return
	for i in range(_skeleton.get_bone_count()):
		var nm := _skeleton.get_bone_name(i).to_lower()
		if not (nm.contains("arm") or nm.contains("shoulder")):
			continue
		if nm.contains("fore") or nm.contains("hand"):
			continue
		var sign := 1.0 if nm.contains("left") else -1.0
		var p := _skeleton.get_bone_pose(i)
		p.basis = p.basis.rotated(Vector3(0, 0, 1), deg_to_rad(-72.0 * sign))
		_skeleton.set_bone_pose(i, p)


## §13.2: "idle motion is minimal: breathing, blink, paper glance, small hand
## gesture." This does the breathing and the glance; a blink needs blendshapes
## the mesh does not carry.
func _process(dt: float) -> void:
	_t += dt
	if _skeleton == null:
		return
	if _chest_bone >= 0:
		var breathe := sin(_t * 1.15) * 0.010
		var p := _rest_chest
		p.origin.y += breathe
		_skeleton.set_bone_pose(_chest_bone, p)
	if _head_bone >= 0:
		# a slow settle, and every so often a glance down at the script
		var glance := 0.0
		var cycle := fmod(_t, 11.0)
		if cycle > 8.4 and cycle < 9.6:
			glance = sin((cycle - 8.4) / 1.2 * PI) * 0.16
		var h := _rest_head
		h.basis = h.basis.rotated(Vector3(1, 0, 0), glance)
		h.basis = h.basis.rotated(Vector3(0, 1, 0), sin(_t * 0.42) * 0.022)
		_skeleton.set_bone_pose(_head_bone, h)


## Everything the player sees goes through the tube: limited colour, scanlines
## and a soft analogue bloom.
func _apply_tube_shader() -> void:
	var sh := Shader.new()
	sh.code = """
shader_type canvas_item;

uniform int levels : hint_range(2, 32) = 10;
uniform float scan_strength : hint_range(0.0, 0.6) = 0.16;
uniform float scan_period : hint_range(1.0, 8.0) = 3.0;
uniform float bloom : hint_range(0.0, 1.0) = 0.16;
uniform vec3 tint = vec3(0.94, 0.97, 1.0);

void fragment() {
	vec4 c = texture(TEXTURE, UV);

	// analogue softness: a cheap horizontal smear, the way a tube loses detail
	vec2 px = TEXTURE_PIXEL_SIZE;
	vec3 blur = texture(TEXTURE, UV + vec2(px.x, 0.0)).rgb
		+ texture(TEXTURE, UV - vec2(px.x, 0.0)).rgb;
	c.rgb = mix(c.rgb, blur * 0.5, 0.35);

	// limited colour — posterise, do not dither
	c.rgb = floor(c.rgb * float(levels) + 0.5) / float(levels);
	c.rgb *= tint;

	// slight scanlines
	float line = step(1.0, mod(FRAGCOORD.y, scan_period));
	c.rgb *= 1.0 - scan_strength * (1.0 - line);

	// restrained CRT bloom off the bright areas only
	float l = dot(c.rgb, vec3(0.299, 0.587, 0.114));
	c.rgb += c.rgb * smoothstep(0.62, 1.0, l) * bloom;

	COLOR = c;
}
"""
	var mat := ShaderMaterial.new()
	mat.shader = sh
	mat.set_shader_parameter("levels", colour_levels)
	if transparent:
		# NOT INSIDE A TELEVISION. `ART_BIBLE` §13.2 grants the 3D exception to
		# "the moving presenter inside the TV" and asks for scanlines and CRT
		# bloom on its output — which is a description of a broadcast, not of a
		# man behind a counter. Scanlines on Toko would say the player is
		# watching him on a screen.
		#
		# The POSTERISE stays, and that is the load-bearing half: limited colour
		# is what lets a rendered figure sit inside cut-paper art at all.
		#
		# OPEN, and the owner's to settle: §13.2 predates the counter, so it does
		# not say what treatment a speaker gets outside the tube. This is the
		# reading, not a ruling. See `STAGE_SPEC.md` §6.4.
		mat.set_shader_parameter("scan_strength", 0.0)
		mat.set_shader_parameter("bloom", 0.06)
		mat.set_shader_parameter("tint", Vector3(1.0, 1.0, 1.0))
	material = mat


func _notification(what: int) -> void:
	if what == NOTIFICATION_RESIZED and _viewport:
		_viewport.size = Vector2i(maxi(int(size.x), 1), maxi(int(size.y), 1))
