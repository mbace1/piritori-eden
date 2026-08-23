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
	# Pin the language. Loc persists the player's choice, so a gate that reads
	# whatever was saved last is not a gate — this run went Japanese purely
	# because a screenshot pass had selected it earlier.
	Loc.set_language("en")
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
	await _test_language_switch()
	_test_debug_entry_parsing()
	_test_every_outcome_has_words()
	_test_interface_is_thumb_sized()
	await _test_settings_menu()
	_test_speaking_character()
	_test_location_speaker()
	await _test_debug_hud()

	print("\n%d passed, %d failed" % [_pass, _fail])
	if _fail > 0:
		print("SHELL FAIL")
		get_tree().quit(1)
	else:
		print("SHELL OK: opens on the map, reflows, and the authored purchase and sale are reachable by button.")
		get_tree().quit(0)


## CLAUDE.md rule 6 — the deep link is what makes every later phase reviewable
## on a phone, so it gets a gate like anything else.
##
## The PARSING is what is tested here, because it is pure and can be driven
## honestly. Actually launching the shell with a query string needs a browser,
## and a gate that fakes one would be proving its own fake — AGENTS.md §4.
func _test_debug_entry_parsing() -> void:
	print("
debug entry (CLAUDE.md rule 6)")

	var q := DebugEntry._parse("?battle=battle-courtyard-3v3&day=5&hud=1")
	check("query string splits into keys",
		q.get("battle", "") == "battle-courtyard-3v3", str(q))
	check("a numeric value survives as text", q.get("day", "") == "5", str(q))
	check("a bare flag reads as on", q.get("hud", "") == "1", str(q))

	var bare := DebugEntry._parse("--reveal")
	check("a desktop flag with no value is on", bare.get("reveal", "") == "1", str(bare))

	var esc := DebugEntry._parse("?encounter=piritori%2Dfirst%2Dbuy")
	check("percent-escapes decode",
		esc.get("encounter", "") == "piritori-first-buy", str(esc))

	check("an empty query yields nothing", DebugEntry._parse("").is_empty())
	check("a normal launch is not in debug mode", not DebugEntry.active)

	# Every id the deep link accepts must resolve, or the affordance sends a
	# tester somewhere that does not exist.
	check("the documented battle id is real",
		not ContentRegistry.battle("battle-courtyard-3v3").is_empty())


## The HUD is the instrument for rule 9, so it is driven the way a thumb drives
## it: find the DEV button by its face and emit its pressed signal.
func _test_debug_hud() -> void:
	print("
debug HUD (CLAUDE.md rules 6 and 9)")

	var hud: CanvasLayer = null
	for n in _all_nodes(_shell):
		if n is CanvasLayer and n.has_method("toggle"):
			hud = n
			break
	check("the HUD is mounted", hud != null)
	if hud == null:
		return

	check("it floats above the shell and the battle", hud.layer >= 100,
		"layer %d" % hud.layer)

	# The overlay remembers whether it was left on, which is right for a phone
	# and wrong for a gate: this assertion would pass or fail depending on what
	# the last person to run the game had chosen. Clear the preference and ask
	# the HUD to re-read it, so the check means the same thing on every machine.
	DirAccess.remove_absolute(hud.SAVE_PATH)
	hud.visible = hud._load_pref()
	check("it is off unless asked for", not hud.visible)

	var dev := _find_button("DEV")
	check("a DEV toggle exists without a keyboard or a URL", dev != null,
		"buttons: " + str(_buttons().map(func(b): return _button_text(b))))
	if dev == null:
		return
	check("the toggle meets the 48px target floor",
		dev.custom_minimum_size.x >= 48.0 and dev.custom_minimum_size.y >= 48.0,
		str(dev.custom_minimum_size))

	await _press(dev)
	check("pressing DEV shows the overlay", hud.visible)
	await _press(dev)
	check("pressing it again hides it", not hud.visible)

	# The readout must survive being asked for before a frame has been drawn;
	# an overlay that crashes the first time you open it is worse than none.
	var lines: PackedStringArray = hud._lines(0.016)
	check("the readout names fps", String(lines[0]).contains("fps"), str(lines))
	check("the readout carries the campaign block",
		"
".join(lines).contains("day"), str(lines))


func check(label: String, condition: bool, detail: String = "") -> void:
	if condition:
		_pass += 1
		print("  ok    %s" % label)
	else:
		_fail += 1
		print("  FAIL  %s %s" % [label, detail])


# ── helpers that walk the real tree ───────────────────────────────────────

## Every way a fight can end must have words.
##
## This is the bug the aftermath screen exists to fix, so it is the bug the gate
## has to be able to catch: a result the shell has no copy for would put the
## player back on the map with no idea what just happened, exactly as a defeat
## used to. Asks the shell's own mapping rather than restating it here, because a
## second copy of the table would agree with itself and not with the game.
func _test_every_outcome_has_words() -> void:
	print("\nevery outcome has words")
	var titles: Dictionary = {}
	var lines: Dictionary = {}
	# PENDING is the only result with no screen: the fight has not ended.
	for r in [FightManager.BattleResult.VICTORY_ROUT,
			FightManager.BattleResult.VICTORY_BREAK,
			FightManager.BattleResult.STAND_DOWN,
			FightManager.BattleResult.WITHDRAWAL,
			FightManager.BattleResult.PARTIAL,
			FightManager.BattleResult.DEFEAT]:
		var tk: String = _shell._outcome_title(r)
		var lk: String = _shell._outcome_line(r)
		check("result %d has a title that is translated" % r, tr(tk) != tk)
		check("result %d has a line that is translated" % r, tr(lk) != lk)
		titles[tk] = true
		lines[lk] = true
	# Distinct, or two different endings are being told the same story — which
	# is how "you withdrew" and "you were beaten" become the same screen.
	check("six endings, six headlines", titles.size() == 6, str(titles.size()))
	check("six endings, six explanations", lines.size() == 6, str(lines.size()))



## The interface has to be big enough to hit.
##
## Reported from play as two separate bugs — "menu is small" and "not all touch
## controls work" — which were one bug: the project renders at a 1280x720 base
## with stretch "expand", so a phone about 412px wide showed everything at 0.32
## and a 48px button became a 15px touch target.
##
## Apple and Google both put the minimum touch target at 44 points. That is a
## published number, so it can be asserted rather than eyeballed.
func _test_interface_is_thumb_sized() -> void:
	print("
the interface is big enough to hit")
	const BUTTON_PX := 48.0        # _make_button's height in design space
	const GUIDELINE_PX := 44.0     # Apple HIG and Material both

	var rendered: float = BUTTON_PX * _shell.UI_TARGET_SCALE
	check("a button clears the 44px touch guideline on a phone",
		rendered >= GUIDELINE_PX, "%.1f px" % rendered)

	# The previous version of this test stopped here, and that was the mistake:
	# it asserted a CONSTANT and never the thing on screen. The interface shipped
	# with 15px buttons anyway, because the command bar takes its height from
	# MIN_TARGET and not from the scale at all.
	#
	# So this measures the bar the way a phone sees it. get_viewport_rect() is in
	# design units, so a portrait phone reports a very tall viewport — and a bar
	# sized as a FRACTION of that is correct however the stretch behaves.
	var phone := Vector2(1280.0, 2840.0)      # 412x915 at the 0.32 stretch
	_shell._size_commands(phone)
	var tallest := 0.0
	for b in _shell._commands:
		if b != null:
			tallest = maxf(tallest, b.custom_minimum_size.y)
	check("on a phone the command bar is far taller than the 48 minimum",
		tallest > BUTTON_PX * 2.0, "%.0f design units" % tallest)

	# In CSS pixels, which is the number a thumb actually meets.
	var css := tallest * (412.0 / phone.x)
	check("which is a real touch target in CSS pixels",
		css >= GUIDELINE_PX, "%.0f px" % css)

	# And a desktop must not get a cliff across the bottom of the screen.
	_shell._size_commands(Vector2(1280.0, 720.0))
	var desk := 0.0
	for b in _shell._commands:
		if b != null:
			desk = maxf(desk, b.custom_minimum_size.y)
	check("and a desktop bar stays a bar", desk < 120.0, "%.0f" % desk)

	# The first attempt at this landed at 0.70, which renders 34px and reads as
	# "touch does not work". Named so a future tweak cannot quietly go back.
	check("and the target is not the value that failed once",
		_shell.UI_TARGET_SCALE > 0.8)

	# Desktop must be left exactly alone: it already shows the design at 1:1 or
	# better, and scaling it up would crop the layout for no gain.
	var desktop_natural: float = minf(1920.0 / 1280.0, 1080.0 / 720.0)
	var desktop_factor: float = clampf(_shell.UI_TARGET_SCALE / desktop_natural,
		1.0, _shell.UI_SCALE_MAX)
	check("a desktop is not scaled", is_equal_approx(desktop_factor, 1.0))


## The speaking character (UX_SPEC 18): one component, three framings.
##
## Generalised from the news presenter so Toko in the noodle bar and an enemy
## shot-caller over the board are the same component with a different shot. The
## risk in a change like this is that the screen it was extracted FROM quietly
## breaks, so the news framing is what gets pinned.
func _test_speaking_character() -> void:
	print("
the speaking character")
	var p = preload("res://scenes/presenter_3d.gd").new()

	check("it defaults to Arvo, so the news is unchanged", p.speaker_id == "arvo")
	check("and to the broadcast framing",
		p.framing == p.Framing.BROADCAST)
	check("Arvo has a model", p.available())
	check("which is the one the news always used", p.model_path() == p.MODEL)

	# A speaker with no model must fail by NAME. Silently rendering nobody is how
	# "no Arvo in news" took a headless probe to diagnose.
	# Jaska, who is all through NARRATIVE.md and has no model and no stand-in.
	# Deliberately somebody real rather than a nonsense string: the failure being
	# tested is a character the game genuinely wants and does not have.
	p.speaker_id = "jaska"
	check("somebody with no model is not available", not p.available())
	check("and is not silently swapped for Arvo", p.model_path() == "")

	# Everyone listed must resolve to something real, placeholder or not. A
	# speaker that is registered and missing is worse than one that was never
	# registered, because the caller has been told it is fine.
	var broken: PackedStringArray = []
	for id in p.SPEAKERS:
		if not ResourceLoader.exists(String(p.SPEAKERS[id])):
			broken.append(String(id))
	check("every registered speaker has a model on disk",
		broken.is_empty(), " ".join(broken))

	# Borrowed bodies must stay DECLARED. A placeholder nothing distinguishes
	# from finished art is how the wrong face ships: it looks deliberate, so
	# nobody questions it.
	check("the shot-caller is still a borrowed body", p.is_placeholder("shot-caller"))
	check("Arvo is not", not p.is_placeholder("arvo"))
	# Toko stopped borrowing when his own model arrived. Asserted rather than
	# just deleted, so a regression that quietly puts him back in someone else's
	# clothes fails here.
	check("Toko is himself now", not p.is_placeholder("toko"))
	check("and wears his own model",
		String(p.SPEAKERS["toko"]).ends_with("toko-v01.glb"))

	# Every placeholder has to be a real speaker, or the list rots into names
	# nobody uses.
	var orphan: PackedStringArray = []
	for id in p.PLACEHOLDER_SPEAKERS:
		if not p.SPEAKERS.has(String(id)):
			orphan.append(String(id))
	check("no placeholder names somebody who is not a speaker",
		orphan.is_empty(), " ".join(orphan))
	p.free()


## The LOCATION framing, driven off content rather than configuration.
##
## UX_SPEC 18's named example: talking to Toko should show Toko in the noodle
## bar. Content already says who is in the room, so the check is that the scene
## reads it — and, just as importantly, that it stays quiet in the rooms where
## nobody has a model.
func _test_location_speaker() -> void:
	print("
the person you came to see")
	var p = preload("res://scenes/presenter_3d.gd").new()

	var toko := ContentRegistry.encounter("enc-toko-quiet-voice")
	check("the noodle bar encounter exists", not toko.is_empty())
	check("and content says Toko is in it",
		(toko.get("participants", []) as Array).has("toko"))
	check("Toko is somebody the game can show", p.SPEAKERS.has("toko"))

	# Aatami is in every scene and is not somebody you look at. If he were
	# matched first, every encounter would show the player staring at himself.
	check("the player is never the one on screen", not p.SPEAKERS.has("aatami"))

	# Most participants never get a model — a bank clerk, a lunch crowd, a dog
	# owner. An empty frame in those rooms would be worse than the text that
	# already works, so silence has to be the default rather than the exception.
	var with_speaker := 0
	var total := 0
	for e in ContentRegistry.slice.get("encounters", []):
		total += 1
		for who in (e.get("participants", []) as Array):
			if String(who) != "aatami" and p.SPEAKERS.has(String(who)):
				with_speaker += 1
				break
	check("some encounter puts a person on screen", with_speaker > 0)
	check("and most do not, which is correct for now",
		with_speaker < total, "%d of %d" % [with_speaker, total])
	p.free()


## Language and DEV moved behind a hamburger, so they must still be REACHABLE.
##
## Pressed rather than inspected. A hidden Button still answers `pressed` in a
## test, so checking the model would pass while a player could not get to it —
## which is exactly the failure this whole session has been finding.
func _test_settings_menu() -> void:
	print("
settings live behind the menu")
	var langs = _shell._langs
	var menu = _shell._menu_button
	check("there is a menu control", menu != null)
	check("and it is a real touch target",
		menu != null and menu.custom_minimum_size.y >= _shell.MIN_TARGET,
		"%.0f" % (menu.custom_minimum_size.y if menu != null else 0.0))

	check("the header does not start cluttered with settings",
		langs != null and not langs.visible)

	menu.emit_signal("pressed")
	await get_tree().process_frame
	check("pressing it reveals them", langs.visible)

	# Every language has to be there, or one becomes unreachable on a phone.
	var codes: Array = []
	for c in langs.get_children():
		if c is Button and String(c.text) != "DEV":
			codes.append(String(c.text).to_lower())
	var all_there := true
	for lang in Loc.SUPPORTED:
		if not codes.has(String(lang).to_lower()):
			all_there = false
	check("with every language on it", all_there, str(codes))

	menu.emit_signal("pressed")
	await get_tree().process_frame
	check("and pressing again puts them away", not langs.visible)


func _all_nodes(root: Node, out: Array = []) -> Array:
	out.append(root)
	for c in root.get_children():
		_all_nodes(c, out)
	return out


func _buttons() -> Array:
	return _all_nodes(_shell).filter(func(n): return n is Button)


## Find a button by what it DISPLAYS. The command bar keeps its word in a child
## Label beside an icon, so button.text alone is empty there.
func _button_text(b: Button) -> String:
	var parts: PackedStringArray = [b.text]
	for n in _all_nodes(b):
		if n is Label:
			parts.append(n.text)
	return " ".join(parts)


func _find_button(fragment: String) -> Button:
	for b in _buttons():
		if fragment.to_lower() in _button_text(b).to_lower():
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
			"buttons: " + str(_buttons().map(func(b): return _button_text(b))))


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
		"buttons: " + str(_buttons().map(func(b): return _button_text(b))))
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


## UX_SPEC §13: "Language changes at a decision boundary without restarting the
## run." So the campaign model must survive the switch untouched.
func _test_language_switch() -> void:
	print("
language switch keeps the run (§13)")
	var cash := GameState.cash_eur
	var block := GameState.block_index
	var flags := GameState.flags.size()

	for lang in ["fi", "ja", "en"]:
		Loc.set_language(lang)
		await get_tree().process_frame
		await get_tree().process_frame
		check("%s: run state untouched" % lang,
			GameState.cash_eur == cash and GameState.block_index == block 				and GameState.flags.size() == flags,
			"(cash %d block %d)" % [GameState.cash_eur, GameState.block_index])
		var live := _buttons().filter(func(b): return b.visible)
		check("  %s: controls still reachable" % lang, live.size() > 0)

	Loc.set_language("fi")
	await get_tree().process_frame
	await get_tree().process_frame
	check("Finnish actually reaches the command bar",
		_find_button("REITTI") != null,
		str(_buttons().map(func(b): return _button_text(b))))
	Loc.set_language("ja")
	await get_tree().process_frame
	await get_tree().process_frame
	check("Japanese actually reaches the command bar",
		_find_button("ルート") != null,
		str(_buttons().map(func(b): return _button_text(b))))
	Loc.set_language("en")
	await get_tree().process_frame


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
		"buttons: " + str(_buttons().map(func(b): return _button_text(b))))
	if ledger_btn == null:
		return
	await _press(ledger_btn)

	var sell := _find_button("Sell for")
	check("sale row rendered with its price", sell != null,
		"buttons: " + str(_buttons().map(func(b): return _button_text(b))))
	if sell == null:
		return
	check("sale is enabled with stock in hand", not sell.disabled)

	var before := GameState.cash_eur
	await _press(sell)
	check("cash rose by the authored €68", GameState.cash_eur == before + 68,
		"(%d -> %d)" % [before, GameState.cash_eur])
	check("the run is profitable against the €45 buy", GameState.cash_eur > 160 - 45)
