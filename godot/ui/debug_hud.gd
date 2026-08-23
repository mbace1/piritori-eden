extends CanvasLayer
## DebugHUD — the instrument for CLAUDE.md rule 9.
##
## Rule 9: "Runs well on a mid-range Android phone is a phase gate, not a
## pre-release check. If a change costs frames on the target device, say so in
## your summary even if it looks fine on desktop."
##
## You cannot report what you cannot measure, and rule 6 forbids measuring it
## with a desktop console. So the numbers live on the screen, on the phone,
## behind a toggle.
##
## A CanvasLayer rather than a Control in the tree, so it floats above every
## mode — including the battle, which fills the world host and would otherwise
## draw straight over it.
##
## Reached three ways:
##   ?hud=1              on the URL
##   the DEV button      in the shell's status strip
##   F3                  on a keyboard, for desktop work
##
## The toggle persists (user://debug_hud.cfg) so a phone session does not have
## to re-enable it after every reload. It is OFF unless asked for.

const SAVE_PATH := "user://debug_hud.cfg"

## Frame times are noisy; a single frame's number is unreadable and unactionable.
## This is the window used for the min/avg readout.
const SAMPLES := 60

var _label: Label
var _panel: PanelContainer
var _frames: Array[float] = []
var _worst := 0.0
var _since_reset := 0.0

## Set by the shell at mount. The HUD reads `shell.mode` rather than having the
## shell push a name from each of its eight _show_ functions — one reference is
## a smaller seam than eight assignments that can each be forgotten.
var shell: Node = null

const MODE_NAMES := ["CITY", "LOCATION", "MARKET", "BATTLE", "NEWS"]


func _ready() -> void:
	layer = 128                      # above the shell and anything it mounts
	process_mode = Node.PROCESS_MODE_ALWAYS

	_panel = PanelContainer.new()
	_panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_panel.set_anchors_preset(Control.PRESET_TOP_LEFT)
	_panel.position = Vector2(8, 8)
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color(0, 0, 0, 0.72)
	sb.set_border_width_all(1)
	sb.border_color = Color(0.45, 0.85, 0.45, 0.8)
	sb.set_corner_radius_all(3)
	sb.content_margin_left = 8
	sb.content_margin_right = 8
	sb.content_margin_top = 6
	sb.content_margin_bottom = 6
	_panel.add_theme_stylebox_override("panel", sb)
	add_child(_panel)

	_label = Label.new()
	_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_label.add_theme_font_size_override("font_size", 12)
	_label.add_theme_color_override("font_color", Color(0.72, 1.0, 0.72))
	_panel.add_child(_label)

	visible = _load_pref() or DebugEntry.is_on("hud")


func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo \
			and event.keycode == KEY_F3:
		toggle()
		get_viewport().set_input_as_handled()


func toggle() -> void:
	visible = not visible
	_save_pref(visible)
	if visible:
		reset_worst()


## The worst frame is only meaningful since you last cared. Cleared on show and
## on demand, so a hitch during load does not sit in the readout all session.
func reset_worst() -> void:
	_worst = 0.0
	_frames.clear()


func _process(dt: float) -> void:
	if not visible:
		return

	_frames.append(dt)
	if _frames.size() > SAMPLES:
		_frames.remove_at(0)
	# Ignore the first moments after a reset: a scene change always costs a
	# frame and reporting it as the worst case is a lie about steady state.
	_since_reset += dt
	if _since_reset > 0.5:
		_worst = maxf(_worst, dt)

	var avg := 0.0
	for f in _frames:
		avg += f
	avg /= maxf(float(_frames.size()), 1.0)

	_label.text = "\n".join(_lines(avg))


## Changed by hand whenever something worth confirming ships. A cached build
## shows an old stamp, which is the difference between "it did not work" and
## "you are not running it".
const BUILD_STAMP := "2026-08-23 scale+police"


func _lines(avg: float) -> PackedStringArray:
	var out: PackedStringArray = []

	# ── rule 9: the performance gate ──
	out.append("%d fps   avg %.1f ms   worst %.1f ms" % [
		Engine.get_frames_per_second(), avg * 1000.0, _worst * 1000.0])
	out.append("draw %d   objects %d   nodes %d" % [
		Performance.get_monitor(Performance.RENDER_TOTAL_DRAW_CALLS_IN_FRAME),
		Performance.get_monitor(Performance.RENDER_TOTAL_OBJECTS_IN_FRAME),
		Performance.get_monitor(Performance.OBJECT_NODE_COUNT)])
	out.append("mem %.1f MB   video %.1f MB" % [
		Performance.get_monitor(Performance.MEMORY_STATIC) / 1048576.0,
		Performance.get_monitor(Performance.RENDER_VIDEO_MEM_USED) / 1048576.0])

	# ── the interface's own size, which cannot be judged from a screenshot ──
	#
	# Reported because a scale fix shipped and appeared to do nothing, and there
	# was no way to tell a stale cache from a broken calculation. These three
	# numbers separate them: if the factor is 1.0 on a phone the code did not
	# run, and if it is right while buttons are small the build is old.
	var win := get_window()
	if win != null:
		var natural: float = minf(float(win.size.x) / 1280.0, float(win.size.y) / 720.0)
		out.append("")
		out.append("window %dx%d   stretch %.3f" % [win.size.x, win.size.y, natural])
		out.append("scale factor %.2f   effective %.3f   button %.0fpx" % [
			win.content_scale_factor, natural * win.content_scale_factor,
			48.0 * natural * win.content_scale_factor])
		out.append("build %s" % BUILD_STAMP)

	# ── where the campaign is ──
	out.append("")
	var mode_bit := ""
	if shell != null:
		var m: int = shell.mode
		if m >= 0 and m < MODE_NAMES.size():
			mode_bit = "  " + MODE_NAMES[m]
	out.append("day %d %s  (block %d/%d)%s" % [
		GameState.day, GameState.current_block(),
		GameState.block_index + 1, GameState.total_blocks, mode_bit])
	out.append("EUR %d   debt %d   mk %d   intel %d" % [
		GameState.cash_eur, GameState.debt_eur,
		GameState.markka_mk, GameState.intel])

	var stock_bits: PackedStringArray = []
	for k in GameState.stock:
		if int(GameState.stock[k]) != 0:
			stock_bits.append("%s %d" % [k, int(GameState.stock[k])])
	out.append("stock: " + ("—" if stock_bits.is_empty() else ", ".join(stock_bits)))

	out.append("crew %d   deaths %d   wounds open %d" % [
		GameState.roster.size(), GameState.crew_deaths,
		GameState.open_critical_wounds()])

	# ── rule 6 asks for load errors, and they must be visible on the device ──
	if not ContentRegistry.errors.is_empty():
		out.append("")
		out.append("CONTENT ERRORS: %d" % ContentRegistry.errors.size())
		out.append(String(ContentRegistry.errors[0]).left(60))

	if DebugEntry.active:
		out.append("")
		out.append("entry: " + str(DebugEntry.params))

	out.append("")
	out.append("F3 or DEV to hide   lang %s" % Loc.code)
	return out


# ── the preference, so a phone session survives a reload ───────────────────

func _load_pref() -> bool:
	var f := FileAccess.open(SAVE_PATH, FileAccess.READ)
	if f == null:
		return false
	return f.get_line().strip_edges() == "1"


func _save_pref(on: bool) -> void:
	var f := FileAccess.open(SAVE_PATH, FileAccess.WRITE)
	if f != null:
		f.store_line("1" if on else "0")
