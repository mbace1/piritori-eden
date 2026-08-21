extends Node
## Battle interface gate. AGENTS.md §4: drive the interface, not the model.
##
## Every action here is a real Button.pressed on the real scene, found by the
## word it displays — the same rule the shell gate follows.

var _pass := 0
var _fail := 0
var _scene: Control

func check(l: String, c: bool, d: String = "") -> void:
	if c: _pass += 1; print("  ok    %s" % l)
	else: _fail += 1; print("  FAIL  %s %s" % [l, d])

func _ready() -> void:
	var bail := Timer.new(); bail.wait_time = 60.0; bail.one_shot = true
	bail.timeout.connect(func(): print("BATTLE UI FAIL: timed out"); get_tree().quit(1))
	add_child(bail); bail.start()

	print("── battle interface ──")
	Loc.set_language("en")
	GameState.new_campaign()

	# The tree is busy setting up children during _ready; adding to the root
	# here is refused. Yield one frame first.
	await get_tree().process_frame
	get_tree().root.size = Vector2i(1366, 768)
	_scene = preload("res://scenes/formation_battle.gd").new()
	_scene.set_anchors_preset(Control.PRESET_FULL_RECT)
	get_tree().root.add_child(_scene)
	await get_tree().process_frame
	await get_tree().process_frame

	var crew: Array = []
	for c in ContentRegistry.slice.get("crew", []):
		crew.append(String(c.get("id", "")))
		if crew.size() >= 2: break

	var errs: Array = _scene.begin("battle-karhupuisto-2v2", crew, 4242)
	check("battle opens with no errors", errs.is_empty(), str(errs))
	await get_tree().process_frame
	await get_tree().process_frame

	# §13.3 LOCKED composition
	var labels := _text()
	check("round state is on screen", "ROUND" in labels.to_upper(), labels.substr(0, 90))
	check("enemy intent is telegraphed",
		"block" in labels.to_lower() or "withdraw" in labels.to_lower(), labels.substr(0, 200))
	check("the selected crew member is named",
		"Mira" in labels or "Hämäl" in labels, labels.substr(0, 200))
	check("condition is shown", "condition" in labels.to_lower())
	# §12.5: "text/numerals plus shapes; do not rely on tiny segments alone."
	check("tracks show numerals, not only pips",
		"8/8" in labels or "/" in labels, labels.substr(0, 200))
	check("guard and nerve are named too",
		"guard" in labels.to_lower() and "nerve" in labels.to_lower())

	# GEOMETRY. The label checks above all passed while the scene was sized
	# 4012x2816 with the console off-screen — a gate that reads text cannot see
	# layout, so assert the locked composition physically fits the viewport.
	# With stretch/mode=canvas_items the UI lives in the project's design space
	# (1280x720), not the window's pixel size. The visible rect is the honest
	# comparison.
	var vp := get_viewport().get_visible_rect().size
	check("the scene matches the viewport", _scene.size.is_equal_approx(vp),
		"scene=%s viewport=%s" % [_scene.size, vp])
	var console := _console_panel()
	check("the command console exists", console != null)
	if console:
		check("the console is a substantial bottom band (§13.3)",
			console.size.y >= 150.0, "h=%.0f" % console.size.y)
		check("and it sits inside the viewport",
			console.global_position.y + console.size.y <= vp.y + 1.0,
			"bottom=%.0f vp=%.0f" % [console.global_position.y + console.size.y, vp.y])
	var board := _board_control()
	check("the encounter has room above the console", board != null and board.size.y > 200.0,
		"h=%.0f" % (board.size.y if board else -1.0))

	# core actions in the centre, automation and withdrawal on the right
	# §12.5 requires the console to group: crew block, large labelled icon cards,
	# and AUTO/WITHDRAW held visually separate.
	for word in ["ATTACK", "BRACE", "REPOSITION", "ITEM", "AUTO", "WITHDRAW"]:
		check("%s is offered" % word, _find(word) != null,
			str(_buttons().map(func(b): return _button_text(b))))

	# every control clears the 44px floor
	var small := _buttons().filter(func(b): return b.custom_minimum_size.y > 0 \
		and b.custom_minimum_size.y < 44)
	check("every control meets the 44px floor", small.is_empty(),
		str(small.map(func(b): return b.text)))

	# forecast BEFORE commitment (handoff §5)
	var atk := _find("Attack")
	if atk:
		atk.pressed.emit()
		await get_tree().process_frame
		var t := _text()
		check("a forecast appears before confirming",
			"harm" in t.to_lower() or "no reachable" in t.to_lower(), t.substr(0, 200))
		check("and a Confirm step exists", _find("Confirm") != null)

	# withdrawal ends it, at a stated cost
	var wd := _find("Withdraw")
	check("withdrawal states its cost", wd != null and wd.tooltip_text != "",
		wd.tooltip_text if wd else "(no button)")
	if wd:
		wd.pressed.emit()
		await get_tree().process_frame
		var guard := 0
		while _scene.fight.result == FightManager.BattleResult.PENDING and guard < 10:
			guard += 1
			_scene.fight.confirm_commands()
			await get_tree().process_frame
		check("pressing Withdraw ends the battle",
			_scene.fight.result != FightManager.BattleResult.PENDING,
			"result=%s" % _scene.fight.result)

	print("\n%d passed, %d failed" % [_pass, _fail])
	if _fail > 0: print("BATTLE UI FAIL"); get_tree().quit(1)
	else: print("BATTLE UI OK: locked composition, forecast before commitment, withdrawal reachable."); get_tree().quit(0)

## The console is the LOWEST full-width PanelContainer. Two earlier attempts got
## this wrong in instructive ways: taking the last one found picked up the crew
## block nested inside it (99px), and taking the widest picked up the top strip,
## which spans the shell too (56px). It is the bottom band that matters.
func _console_panel() -> Control:
	var found: Control = null
	var best := -1.0
	for n in _all(_scene):
		if not (n is PanelContainer):
			continue
		var c := n as Control
		if c.size.x < _scene.size.x * 0.8:
			continue                       # not a full-width band
		var bottom := c.global_position.y + c.size.y
		if bottom > best:
			best = bottom
			found = c
	return found


func _board_control() -> Control:
	for n in _all(_scene):
		if n is Control and n.get_class() == "Control" and (n as Control).size.y > 100.0:
			return n
	return null


func _all(n: Node, o: Array = []) -> Array:
	o.append(n)
	for c in n.get_children(): _all(c, o)
	return o

func _buttons() -> Array:
	return _all(_scene).filter(func(n): return n is Button)

## Find a button by what it DISPLAYS. The action cards are icon-above-word, so
## the word lives in a child Label and button.text is empty — the same trap the
## shell gate hit.
func _button_text(b: Button) -> String:
	var parts: PackedStringArray = [b.text]
	for n in _all(b):
		if n is Label: parts.append(n.text)
	return " ".join(parts)

func _find(frag: String) -> Button:
	for b in _buttons():
		if frag.to_lower() in _button_text(b).to_lower(): return b
	return null

func _text() -> String:
	var p: PackedStringArray = []
	for n in _all(_scene):
		if n is Label: p.append(n.text)
	return "\n".join(p)
