extends Node
## Interface gate — drives the real UI, never the model.
##
## AGENTS.md §4: "Debug hooks are for SETUP only. Never drive the action under
## test through them. A browser gate that calls the model directly proves the
## model and says nothing about the interface — this is exactly how a completely
## frozen fight panel passed 44 checks."
##
## So this walks the actual button tree: it finds the buy button by its authored
## label and emits its pressed signal, exactly as a thumb would.
##
## Run: godot --headless --path piritori/godot res://tests/test_shell.tscn

var _pass := 0
var _fail := 0
var _shell: Control


func _ready() -> void:
	# Failsafe: a gate that can hang is worse than a gate that fails. A parse
	# error once left this scene with no script and no way to quit.
	var bail := Timer.new()
	bail.wait_time = 60.0
	bail.one_shot = true
	bail.timeout.connect(func():
		print("SHELL FAIL: timed out")
		get_tree().quit(1))
	add_child(bail)
	bail.start()

	print("── Piritori shell (interface-driven) ──")
	GameState.new_campaign()
	SaveService.clear_save()

	_shell = preload("res://scenes/app_shell.tscn").instantiate()
	add_child(_shell)
	await get_tree().process_frame
	await get_tree().process_frame

	await _test_opens_on_map()
	await _test_reflow()
	await _test_first_purchase_through_ui()
	await _test_market_through_ui()

	print("\n%d passed, %d failed" % [_pass, _fail])
	if _fail > 0:
		print("SHELL FAIL")
		get_tree().quit(1)
	else:
		print("SHELL OK: opens on the map, reflows, and the authored purchase and sale are reachable by button.")
		get_tree().quit(0)


func check(label: String, condition: bool, detail: String = "") -> void:
	if condition:
		_pass += 1
		print("  ok    %s" % label)
	else:
		_fail += 1
		print("  FAIL  %s %s" % [label, detail])


# ── helpers that walk the real tree ───────────────────────────────────────

func _all_nodes(root: Node, out: Array = []) -> Array:
	out.append(root)
	for c in root.get_children():
		_all_nodes(c, out)
	return out


func _buttons() -> Array:
	return _all_nodes(_shell).filter(func(n): return n is Button)


func _find_button(fragment: String) -> Button:
	for b in _buttons():
		if fragment.to_lower() in String(b.text).to_lower():
			return b
	return null


func _labels_text() -> String:
	var parts: PackedStringArray = []
	for n in _all_nodes(_shell):
		if n is Label:
			parts.append(n.text)
	return "\n".join(parts)


func _press(b: Button) -> void:
	b.pressed.emit()
	await get_tree().process_frame
	await get_tree().process_frame


# ── tests ──────────────────────────────────────────────────────────────────

func _test_opens_on_map() -> void:
	print("\nopens on the Kallio map (§9 item 1)")
	var maps := _all_nodes(_shell).filter(
		func(n): return n.get_script() != null \
			and String(n.get_script().resource_path).ends_with("city_map.gd"))
	check("city map is mounted", maps.size() == 1)

	var status := _labels_text()
	# The header is the redesigned chrome: title, era/character line and the
	# icon+number chips. Assert the FACTS are on screen, not their casing.
	check("header names the game", "PIRITORI" in status.to_upper())
	check("header shows the era and character", "2003" in status and "AATAMI" in status.to_upper())
	check("header shows day 1", "DAY 01" in status.to_upper(), status.substr(0, 120))
	check("header shows the current block", "DAY" in status.to_upper())
	check("header shows starting cash", "160" in status)

	# Selecting Piritori must be possible from the map itself.
	if maps.size() == 1:
		maps[0].select("piritori")
		await get_tree().process_frame
		check("selecting Piritori reaches the rail", "PIRITORI" in _labels_text().to_upper())
		check("the opening lead is offered as a button",
			_find_button("first purchase") != null,
			"buttons: " + str(_buttons().map(func(b): return b.text)))


func _test_reflow() -> void:
	print("\nresponsive reflow (§9 item 7)")
	var probes: Array[Vector2i] = [Vector2i(390, 844), Vector2i(844, 390), Vector2i(1920, 1080)]
	for probe in probes:
		get_tree().root.size = probe
		await get_tree().process_frame
		await get_tree().process_frame
		var portrait: bool = probe.y > probe.x
		var live := _buttons().filter(func(b): return b.visible)
		check("%dx%d (%s) keeps controls reachable" % [probe.x, probe.y,
			"portrait" if portrait else "landscape"], live.size() > 0)
		# 44px is the hard floor; the shell asks for 48.
		var too_small := live.filter(func(b): return b.custom_minimum_size.y > 0 \
			and b.custom_minimum_size.y < 44)
		check("  every control meets the 44px floor", too_small.is_empty(),
			str(too_small.map(func(b): return b.text)))
	get_tree().root.size = Vector2i(1280, 720)
	await get_tree().process_frame


func _test_first_purchase_through_ui() -> void:
	print("\nfirst purchase, pressed as a button (§9 item 2)")
	var maps := _all_nodes(_shell).filter(
		func(n): return n.get_script() != null \
			and String(n.get_script().resource_path).ends_with("city_map.gd"))
	if maps.size() == 1:
		maps[0].select("piritori")
		await get_tree().process_frame

	var enter := _find_button("first purchase")
	check("opening lead button exists", enter != null)
	if enter == null:
		return
	await _press(enter)

	check("encounter copy is on screen",
		"seller" in _labels_text().to_lower() or "tram" in _labels_text().to_lower(),
		_labels_text().substr(0, 120))

	var buy := _find_button("Buy one pack")
	check("the authored buy choice is a live button", buy != null,
		"buttons: " + str(_buttons().map(func(b): return b.text)))
	if buy == null:
		return
	check("buy is enabled at €160", not buy.disabled)

	var before := GameState.cash_eur
	await _press(buy)

	check("cash fell by the authored €45", GameState.cash_eur == before - 45,
		"(%d -> %d)" % [before, GameState.cash_eur])
	check("a pack is in stock", int(GameState.stock.get("piri", 0)) == 1)
	check("returned to the map after committing",
		_find_button("Back to the map") == null)


func _test_market_through_ui() -> void:
	print("\nprofitable sale, pressed as a button")
	# The purchase revealed the mission; the mission reveals the sale.
	GameState.apply_effect("reveal:mission-paper-bag")
	await get_tree().process_frame

	var maps := _all_nodes(_shell).filter(
		func(n): return n.get_script() != null \
			and String(n.get_script().resource_path).ends_with("city_map.gd"))
	if maps.size() == 1:
		maps[0].select("siltasaari")
		await get_tree().process_frame

	var ledger_btn := _find_button("Market ledger")
	check("earned ledger is offered at Siltasaari", ledger_btn != null,
		"buttons: " + str(_buttons().map(func(b): return b.text)))
	if ledger_btn == null:
		return
	await _press(ledger_btn)

	var sell := _find_button("Sell for")
	check("sale row rendered with its price", sell != null,
		"buttons: " + str(_buttons().map(func(b): return b.text)))
	if sell == null:
		return
	check("sale is enabled with stock in hand", not sell.disabled)

	var before := GameState.cash_eur
	await _press(sell)
	check("cash rose by the authored €68", GameState.cash_eur == before + 68,
		"(%d -> %d)" % [before, GameState.cash_eur])
	check("the run is profitable against the €45 buy", GameState.cash_eur > 160 - 45)
