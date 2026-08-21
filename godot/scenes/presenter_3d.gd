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

const MODEL := "res://data/art/presenter/arvo-linde.glb"

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


func available() -> bool:
	return ResourceLoader.exists(MODEL)


func _ready() -> void:
	stretch = true
	mouse_filter = Control.MOUSE_FILTER_IGNORE

	_viewport = SubViewport.new()
	_viewport.transparent_bg = false
	_viewport.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	_viewport.msaa_2d = Viewport.MSAA_DISABLED
	_viewport.msaa_3d = Viewport.MSAA_2X
	add_child(_viewport)

	# The studio: a flat low-saturation blue field, per ART_BIBLE §4.3.
	var env := Environment.new()
	env.background_mode = Environment.BG_COLOR
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
		_rig = (load(MODEL) as PackedScene).instantiate()
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
	material = mat


func _notification(what: int) -> void:
	if what == NOTIFICATION_RESIZED and _viewport:
		_viewport.size = Vector2i(maxi(int(size.x), 1), maxi(int(size.y), 1))
