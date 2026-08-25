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
	# Jaska stands and talks at his own table in Scene Club (enc-jaska-receipt,
	# enc-jaska-last-light). His own model now, built from a likeness the owner
	# supplied - no longer the borrowed local-v01 body.
	"jaska": "res://data/art/cast3d/jaska-v01.glb",
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
	LOCATION,    ## the person in their place, standing — a full figure in a room
	COUNTER,     ## head and torso, cropped by a counter — STAGE_SPEC §6
	INSET,       ## small, over something else — the opposing shot-caller
}

## Set before the node enters the tree. Defaults keep the news exactly as it was.
var speaker_id: String = "arvo"
var framing: Framing = Framing.BROADCAST

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

	# THE STUDIO IS THE NEWS, NOT THE COMPONENT.
	#
	# The blue field, the flat frontal key and the tube shader below are how a
	# 1990s Finnish bulletin looks. They shipped as unconditional because the
	# news was the only screen using this. The moment a speaker stands in a
	# painted room, an opaque background is a rectangle punched through the
	# room, and scanlines over a noodle bar say "you are watching television"
	# about a conversation you are having in person.
	var broadcast := framing == Framing.BROADCAST
	_viewport = SubViewport.new()
	_viewport.transparent_bg = not broadcast
	_viewport.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	_viewport.msaa_2d = Viewport.MSAA_DISABLED
	_viewport.msaa_3d = Viewport.MSAA_2X
	add_child(_viewport)

	# The studio: a flat low-saturation blue field, per ART_BIBLE §4.3.
	var env := Environment.new()
	env.background_mode = Environment.BG_COLOR if broadcast else Environment.BG_CLEAR_COLOR
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

	if broadcast:
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
	# BROADCAST is the shot the news was built around and stays exactly as it
	# was; the other two are starting points to be judged on a screen, not
	# measurements. Named constants rather than numbers inline, so tuning one
	# framing cannot quietly move another.
	match framing:
		Framing.LOCATION:
			# Further back and lower: a person standing in a room, not a bust.
			_rig.position = Vector3(0, -1.05, 0)
			_camera.position = Vector3(0, 0.25, 2.20)
			_camera.fov = 46.0
		Framing.COUNTER:
			# HEAD AND TORSO, for somebody working behind a counter.
			#
			# Derived rather than dialled. At fov 46 the vertical extent is
			# 2·z·tan(23°) = 0.849·z, so framing about 0.9 m of a 1.72 m man —
			# roughly the crown down to below the waist — wants z ≈ 1.06. The
			# camera sits at chest height so the crop lands where a counter
			# would, and the caller ends the viewport at the counter's own line.
			#
			# LOCATION is left exactly as it was. A standing figure in a room
			# and a man behind a bar are different shots, and reusing one for
			# the other is what made him look like a customer.
			_rig.position = Vector3(0, -1.05, 0)
			_camera.position = Vector3(0, 0.30, 1.06)
			_camera.fov = 46.0
		Framing.INSET:
			# Tighter than broadcast. The inset is small on screen, so the face
			# has to fill it or it reads as a smudge over the board.
			_rig.position = Vector3(0, -1.42, 0)
			_camera.position = Vector3(0, 0.06, 0.82)
			_camera.fov = 38.0
		_:
			_rig.position = Vector3(0, -1.32, 0)
			_camera.position = Vector3(0, 0.10, 1.05)
			_camera.fov = 42.0
	_lower_arms()


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


## HOW A SPEAKER IS ALIVE, per speaker.
##
## Nobody here has talking clips. Arvo never did — his glb ships one unused
## `clip0`, and everything the viewer reads as presence is procedural bone
## motion in `_process`. So a new speaker does not need Meshy, it needs a
## profile: the same three levers, different numbers, because a newsreader and
## a noodle cook are not alive in the same way.
##
## `breathe`   metres the chest rises, and how fast
## `glance`    how far the head drops, how long for, and how often
## `sway`      slow lateral head drift, the thing that stops a bust looking
##             switched off between glances
##
## ARVO'S NUMBERS ARE UNCHANGED. The broadcast shot is approved art direction
## (§13.2: "idle motion is minimal: breathing, blink, paper glance, small hand
## gesture") and this refactor must not quietly retune it.
const IDLE := {
	"arvo": {
		# A presenter reading: shallow breath, a glance DOWN AT THE SCRIPT
		# roughly every eleven seconds, a barely-there sway.
		"breathe_amp": 0.010, "breathe_rate": 1.15,
		"glance_amp": 0.16, "glance_period": 11.0, "glance_at": 8.4, "glance_len": 1.2,
		"sway_amp": 0.022, "sway_rate": 0.42,
	},
	"toko": {
		# A man working a counter while he talks. He is doing something with
		# his hands, so the glance is DEEPER and MORE OFTEN than a presenter's
		# — it is a look down at the bowl, not at a page — and it comes back up
		# to the customer. Slower, heavier breath: he is standing, not seated
		# under studio lights.
		"breathe_amp": 0.014, "breathe_rate": 0.92,
		"glance_amp": 0.22, "glance_period": 7.5, "glance_at": 4.6, "glance_len": 1.6,
		"sway_amp": 0.030, "sway_rate": 0.31,
	},
}

## What an unlisted speaker gets. Deliberately Arvo's, so a new face is alive
## rather than frozen, and QUEUE gets told rather than the player.
const IDLE_DEFAULT := "arvo"


func _idle_profile() -> Dictionary:
	return IDLE.get(speaker_id, IDLE[IDLE_DEFAULT])


func _process(dt: float) -> void:
	_t += dt
	if _skeleton == null:
		return
	var prof := _idle_profile()
	if _chest_bone >= 0:
		var breathe: float = sin(_t * float(prof["breathe_rate"])) * float(prof["breathe_amp"])
		var p := _rest_chest
		p.origin.y += breathe
		_skeleton.set_bone_pose(_chest_bone, p)
	if _head_bone >= 0:
		# a slow settle, and every so often a glance down — at the script, or
		# at the work, depending on who is standing there
		var glance := 0.0
		var period: float = float(prof["glance_period"])
		var at: float = float(prof["glance_at"])
		var glen: float = float(prof["glance_len"])
		var cycle := fmod(_t, period)
		if cycle > at and cycle < at + glen:
			glance = sin((cycle - at) / glen * PI) * float(prof["glance_amp"])
		var h := _rest_head
		h.basis = h.basis.rotated(Vector3(1, 0, 0), glance)
		h.basis = h.basis.rotated(Vector3(0, 1, 0),
			sin(_t * float(prof["sway_rate"])) * float(prof["sway_amp"]))
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
	material = mat


func _notification(what: int) -> void:
	if what == NOTIFICATION_RESIZED and _viewport:
		_viewport.size = Vector2i(maxi(int(size.x), 1), maxi(int(size.y), 1))
