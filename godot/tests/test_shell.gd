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
	# Setup: the arrival is a New-Game veil and has its own gate below; the
	# older gates start on the city behind it.
	GameState.arrival_due = false

	_shell = preload("res://scenes/app_shell.tscn").instantiate()
	add_child(_shell)
	await get_tree().process_frame
	await get_tree().process_frame

	await _test_opens_on_map()
	await _test_reflow()
	await _test_next_step_opening()
	await _test_first_purchase_through_ui()
	await _test_next_step_through_ui()
	await _test_market_through_ui()
	await _test_language_switch()
	_test_debug_entry_parsing()
	_test_every_outcome_has_words()
	_test_interface_is_thumb_sized()
	await _test_settings_menu()
	_test_map_reads_on_a_phone()
	await _test_levelling_is_reachable()
	_test_speaking_character()
	_test_location_speaker()
	await _test_debug_hud()
	# Act I v4.58-v4.62, through the interface.
	await _test_road_through_ui()
	await _test_toko_through_ui()
	await _test_street_seller_through_ui()
	await _test_story_through_ui()
	await _test_cut_and_turn_through_ui()
	# Act I v4.65: doors, and the ten-day chapter's close.
	await _test_doors_through_ui()
	await _test_door_fight_through_ui()
	# Act I v4.66: Aatami fights first, then the crew does.
	await _test_aatami_through_ui()
	# Act I v4.67: the families' standing.
	await _test_standing_through_ui()
	await _test_sound_switch()
	await _test_arrival()

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
	# Sean McCormick's father was the example here until Jaska got a model and
	# stopped qualifying - somebody real rather than a nonsense string, so the
	# failure being tested is a character the game genuinely wants and does not
	# have. Update this line again the day he does too.
	p.speaker_id = "mccormick-senior"
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
	# Jaska too, 2026-08-25 - built from an owner-supplied likeness rather than
	# borrowing local-v01.
	check("Jaska is himself now", not p.is_placeholder("jaska"))
	check("and wears his own model",
		String(p.SPEAKERS["jaska"]).ends_with("jaska-v01.glb"))

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


## The map's own touch targets, which shrank for the same reason everything
## else did.
##
## This used to assert a `_device_gain()` text-scaling formula that was
## removed 2026-08-27 (see `city_map.gd`'s `_draw_labels()` comment — the fix
## for oversized labels turned out to be showing fewer of them, not scaling
## them) without updating this test, which called the now-missing method,
## hit a hard GDScript runtime error, and aborted before a single `check()`
## ran — CLAUDE.md rule 10's "a gate that cannot fail is a finding" made
## literal: it could not even RUN, and the pass count did not notice.
##
## What actually matters for reading the map on a phone is still true and
## still worth asserting: every anchor's hit target — `_hits`, built in
## `_rebuild_layout()` from the same pin radius `_draw_anchor()` paints —
## clears the 44px touch floor at a phone-width window.
func _test_map_reads_on_a_phone() -> void:
	print("
the map reads on a phone")
	var map = _shell._city_map
	check("there is a map", map != null)
	if map == null:
		return

	var prior_size := get_tree().root.size
	get_tree().root.size = Vector2i(390, 844)
	await get_tree().process_frame
	await get_tree().process_frame

	var hits: Dictionary = map._hits
	check("the map has hit targets", not hits.is_empty())
	var too_small: Array = []
	for id in hits:
		var r: Rect2 = hits[id]
		if r.size.x < 44.0 or r.size.y < 44.0:
			too_small.append(id)
	check("every anchor clears the 44px touch floor", too_small.is_empty(),
		str(too_small))

	get_tree().root.size = prior_size
	await get_tree().process_frame


## A level you cannot spend is not a level (UX_SPEC §19, CLAUDE.md rule 6).
##
## The point of this pass was reachability: skill_offer() and spend_perk() were
## both gated and neither had a screen. These assert the ROUTE, not the model —
## the crew screen must actually grow buttons when something is waiting.
func _test_levelling_is_reachable() -> void:
	print("
a level can be spent")
	var who := ""
	for c in ContentRegistry.slice.get("crew", []):
		var cid := String(c.get("id", ""))
		if not GameState.is_named(cid):
			who = cid
			break
	if not GameState.roster.has(who):
		GameState.roster.append(who)
	GameState.revealed[who] = true

	# Nothing waiting: the screen must not grow a permanent scoreboard.
	GameState.crew_perk_points[who] = 0
	_shell._show_crew()
	await get_tree().process_frame
	var quiet := _shell_button_count()

	# Something waiting: buttons appear.
	GameState.grant_level(who)
	_shell._show_crew()
	await get_tree().process_frame
	var loud := _shell_button_count()
	check("a pending level puts choices on the crew screen", loud > quiet,
		"%d -> %d" % [quiet, loud])

	# And the summary offers the way in.
	check("the summary counts what is waiting", _shell._waiting_count() > 0)
	check("and knows somebody is", _shell._anyone_waiting())

	# Spending it removes the offer again, so the screen settles.
	GameState.spend_perk(who, "speed")
	_shell._show_crew()
	await get_tree().process_frame
	check("spending it quiets the screen again",
		_shell_button_count() <= quiet + 1)
	check("and the perk landed", GameState.perk_value(who, "speed") >= 1)


func _shell_button_count() -> int:
	return _all_nodes(_shell).filter(func(n): return n is Button and n.visible).size()


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


## The rail's lit primaries (PiritoriChrome.LIT), live ones only.
func _rail_lit() -> Array:
	return _all_nodes(_shell._rail).filter(func(n): return n is Button \
		and n.is_visible_in_tree() and not n.is_queued_for_deletion() and PiritoriChrome.is_lit(n))


## Exactly one lit action on the rail, it is the step named, and it is actually
## PAINTED lit — the theme resolves the variation to the lantern face, which is
## the thing a player sees. Returns the button, or null.
func _one_lit(step: String, fragment: String) -> Button:
	var lit := _rail_lit()
	var names := lit.map(func(b): return b.text)
	check("  exactly one lit action on the rail", lit.size() == 1, str(names))
	if lit.size() != 1:
		return null
	var b: Button = lit[0]
	check("  it is %s (%s)" % [step, fragment],
		String(b.get_meta("next_step", "")) == step and fragment.to_lower() in b.text.to_lower(), b.text)
	check("  and it wears the lantern face",
		b.get_theme_stylebox("normal") == PiritoriChrome.lit()
		and b.get_theme_color("font_color") == PiritoriPalette.LANTERN_INK)
	check("  and it is the LAST thing on the rail", _rail_last_button() == b)
	return b


func _rail_last_button() -> Button:
	var last: Button = null
	for n in _all_nodes(_shell._rail):
		if n is Button and n.is_visible_in_tree() and not n.is_queued_for_deletion():
			last = n
	return last


func _cash_delta_text() -> String:
	for n in _all_nodes(_shell._status):
		if n is Label and n.name == "CashDelta" and not n.is_queued_for_deletion():
			return n.text
	return ""


## ART_BIBLE §17's contrast test has a size half: nothing under 12px at the
## 1280x720 design size (web v4.56 took 329 such texts to 0).
func _check_type_floor(where: String) -> void:
	var small: Array = []
	for n in _all_nodes(_shell):
		if (n is Label or n is Button) and n.is_visible_in_tree() and not n.is_queued_for_deletion():
			var t: String = n.text
			if t.strip_edges() == "":
				continue
			var px: int = n.get_theme_font_size("font_size")
			if px < PiritoriFonts.FLOOR_PX:
				small.append("%s@%d" % [t.substr(0, 24), px])
	check("%s: no text under %dpx" % [where, PiritoriFonts.FLOOR_PX], small.is_empty(), str(small))


# ── tests ──────────────────────────────────────────────────────────────────

## Web v4.57: the city rail ENDS with exactly one lit action derived from state.
## At the lead on day one, that is ENTER.
func _test_next_step_opening() -> void:
	print("\nnext step: the opening (web v4.57)")
	var maps := _all_nodes(_shell).filter(
		func(n): return n.get_script() != null \
			and String(n.get_script().resource_path).ends_with("city_map.gd"))
	if maps.size() == 1:
		maps[0].select("piritori")
		await get_tree().process_frame
	_one_lit("enter", "ENTER · FIRST PURCHASE")
	var unlit := _find_button("▶ First purchase")
	check("  the rail's own entry stays, unlit", unlit != null and not PiritoriChrome.is_lit(unlit))
	_check_type_floor("the map")


## buy → TRAVEL TO SILTASAARI → TRAVEL · SILTASAARI → ENTER, pressed as the lit
## button each time, the way web/test/next-step.cjs walks it.
func _test_next_step_through_ui() -> void:
	print("\nnext step: buy → travel to → travel → enter (web v4.57)")
	var maps := _all_nodes(_shell).filter(
		func(n): return n.get_script() != null \
			and String(n.get_script().resource_path).ends_with("city_map.gd"))
	if maps.size() != 1:
		check("city map is mounted", false)
		return
	var saved := GameState.to_dict()
	await _next_step_walk(maps[0])
	# Setup, not action (AGENTS.md §4): put the campaign back where the next
	# gate expects it, with Aatami at Piritori — even if the walk stopped early.
	GameState.from_dict(saved)
	_shell._show_city()
	await get_tree().process_frame
	await get_tree().process_frame
	check("restored for the next gate", GameState.current_anchor_id == "piritori")


func _next_step_walk(map: Node) -> void:
	var maps := [map]
	var snapshot := JSON.stringify(GameState.to_dict())
	check("after the buy, Aatami is at Piritori and the lead is Siltasaari",
		GameState.current_anchor_id == "piritori" and GameState.story_lead_id() == "siltasaari")

	var plan := _one_lit("plan", "TRAVEL TO SILTASAARI")
	if plan == null:
		return
	await _press(plan)
	check("TRAVEL TO plans the journey on the map", maps[0].journey_path.size() >= 2)
	check("  and looks at the lead", maps[0].inspected() == "siltasaari")
	check("  and planning through the bar changes nothing",
		JSON.stringify(GameState.to_dict()) == snapshot)
	var go := _one_lit("commit", "TRAVEL · SILTASAARI")
	var side := _find_button("TRAVEL")
	check("  the rail's own TRAVEL stays, unlit", side != null and side != go and not PiritoriChrome.is_lit(side),
		side.text if side else "none")
	if go == null:
		return
	var cash := GameState.cash_eur
	var block := GameState.block_index
	go.pressed.emit()
	go.pressed.emit()   # a double press: the second finds a stale step, does nothing
	await get_tree().process_frame
	await get_tree().process_frame
	check("TRAVEL arrives at Siltasaari, once", GameState.current_anchor_id == "siltasaari")
	check("  arriving is free (D002): same cash, same block",
		GameState.cash_eur == cash and GameState.block_index == block)
	var enter := _one_lit("enter", "ENTER · STAFFED BANK")
	if enter == null:
		return
	await _press(enter)
	check("ENTER opens the encounter at the lead",
		_find_button(tr("ui.leave_to_map")) != null and _rail_lit().is_empty(),
		"buttons: " + str(_buttons().map(func(b): return _button_text(b))))
	_check_type_floor("the encounter")

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
	check("  and the header names the change: −€45", _cash_delta_text() == "−€45",
		"got '%s'" % _cash_delta_text())
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
		_find_button("KAUPUNKI") != null,
		str(_buttons().map(func(b): return _button_text(b))))
	Loc.set_language("ja")
	await get_tree().process_frame
	await get_tree().process_frame
	check("Japanese actually reaches the command bar",
		_find_button("街") != null,
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
		# M1: looking at Siltasaari does not put Aatami there.
		var snapshot := JSON.stringify(GameState.to_dict())
		maps[0].select("siltasaari")
		await get_tree().process_frame
		check("inspecting Siltasaari leaves Aatami at Piritori", GameState.current_anchor_id == "piritori")
		check("  and changes nothing in the campaign", JSON.stringify(GameState.to_dict()) == snapshot)
		check("  the rail says INSPECTING and names both places",
			"INSPECTING" in _labels_text() and "AATAMI · PIRITORI" in _labels_text().to_upper()
			and "STORY LEAD · SILTASAARI" in _labels_text().to_upper(), _labels_text().substr(0, 200))
		check("  no market from over here", _find_button("Market ledger") == null)

		# M2: plan, cancel, plan, travel — pressed as buttons.
		var travel_here := _find_button("TRAVEL HERE")
		check("TRAVEL HERE is offered", travel_here != null,
			"buttons: " + str(_buttons().map(func(b): return _button_text(b))))
		if travel_here == null:
			return
		await _press(travel_here)
		check("the plan names the path and its cost",
			"PIRITORI" in _labels_text().to_upper() and "no extra time or money" in _labels_text(),
			_labels_text().substr(0, 240))
		check("  and the map draws it", maps[0].journey_path.size() >= 2)
		check("  planning changed nothing", JSON.stringify(GameState.to_dict()) == snapshot)
		await _press(_find_button("CANCEL"))
		check("cancel drops the plan and moves nobody",
			maps[0].journey_path.is_empty() and JSON.stringify(GameState.to_dict()) == snapshot)
		await _press(_find_button("TRAVEL HERE"))
		var go := _find_button("TRAVEL")
		var block := GameState.block_index
		var cash := GameState.cash_eur
		go.pressed.emit()
		go.pressed.emit()   # a double press
		await get_tree().process_frame
		check("TRAVEL arrives at Siltasaari", GameState.current_anchor_id == "siltasaari")
		check("  once, with no fare and no block", GameState.cash_eur == cash and GameState.block_index == block)
		check("  and the rail now says YOU ARE HERE", "YOU ARE HERE" in _labels_text())

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
	var block_before := GameState.block_index
	await _press(sell)
	check("cash rose by the authored €68", GameState.cash_eur == before + 68,
		"(%d -> %d)" % [before, GameState.cash_eur])
	eq_("  and the trade turned no block (answer 21)", GameState.block_index, block_before)
	# Web v4.57's gate: "€183 and +€68 at the sale". The count is a tween, so
	# wait it out; at rest the chip must read exactly the state.
	check("  and the header names the change: +€68", _cash_delta_text() == "+€68",
		"got '%s'" % _cash_delta_text())
	await get_tree().create_timer(0.9).timeout
	check("  and at rest the chip reads the state's €183",
		_shell._cash_label != null and _shell._cash_label.text == "€ %s" % _shell._thousands(GameState.cash_eur)
		and GameState.cash_eur == 183, _shell._cash_label.text if _shell._cash_label else "no chip")
	_check_type_floor("the ledger")
	check("the run is profitable against the €45 buy", GameState.cash_eur > 160 - 45)


# ── Act I v4.58-v4.62 through the interface ───────────────────────────────
#
# Fixtures are set in the model (a block, a pending event, a flag, where
# Aatami stands); every action under test is a real button's pressed signal.

func _world_has(script_tail: String) -> Node:
	for n in _all_nodes(_shell._world_host):
		if n.get_script() != null and String(n.get_script().resource_path).ends_with(script_tail) \
				and not n.is_queued_for_deletion():
			return n
	return null


func _rail_text() -> String:
	var parts: PackedStringArray = []
	for n in _all_nodes(_shell._rail):
		if n is Label and n.is_visible_in_tree() and not n.is_queued_for_deletion():
			parts.append(n.text)
	return "\n".join(parts)


func _live_button(fragment: String) -> Button:
	for b in _buttons():
		if b.is_visible_in_tree() and not b.is_queued_for_deletion() \
				and fragment.to_lower() in _button_text(b).to_lower():
			return b
	return null


func _fresh_city(anchor: String = "") -> void:
	GameState.new_campaign()
	GameState.arrival_due = false
	if anchor != "":
		GameState.current_anchor_id = anchor
		GameState.mark_seen(anchor)
	_shell._show_city()
	await get_tree().process_frame
	if anchor != "":
		_shell._city_map.select(anchor)
	await get_tree().process_frame
	await get_tree().process_frame


## web v4.58: a journey can stop on the road; the road shows where it happened,
## each choice's minutes and any refusal; it never turns the block.
func _test_road_through_ui() -> void:
	print("\nthe road (web v4.58), through the interface")
	await _fresh_city()
	GameState.resolve_encounter("enc-first-purchase", "buy")
	GameState.advance_block()
	# Setup: the story is at block 2 and this is the fourth journey since the
	# last event, so the next journey is on the road.
	GameState.road = {"journeys": 3, "since": 3, "seen": [], "pending": null,
		"minutes": 0, "minutesBlock": -1, "last": null}
	_shell._show_city()
	await get_tree().process_frame
	var block := GameState.block_index
	var cash := GameState.cash_eur
	var plan := _one_lit("plan", "TRAVEL TO")
	if plan == null:
		return
	await _press(plan)
	var go := _one_lit("commit", "TRAVEL ·")
	if go == null:
		return
	await _press(go)
	check("a journey that fires opens the road screen", _world_has("road_stage.gd") != null)
	var ev := PiritoriRoad.pending_event()
	check("  with the event waiting", not ev.is_empty())
	check("  the preview never said so: the journey cost nothing and turned no block",
		GameState.block_index == block and GameState.cash_eur == cash)
	var choices := _all_nodes(_shell._rail).filter(func(n): return n is Button and n.has_meta("road_choice"))
	eq_("  every choice is on the rail", choices.size(), (ev.get("choices", []) as Array).size())
	var mins := _all_nodes(_shell._rail).filter(func(n): return n is Label and n.has_meta("minutes"))
	check("  and each states its minutes", mins.size() == choices.size()
		and mins.all(func(l): return l.text.contains("MIN") or l.text.contains("NO TIME")))
	check("  nothing on the rail is lit while the road waits", _rail_lit().is_empty())
	var card := _world_has("road_stage.gd")
	check("  the card says where it happened", String(card.get_meta("phase", "")) != ""
		and (_labels_text().contains("ON THE WAY") or _labels_text().contains("ARRIVING")))

	# Nothing else opens past it.
	await _press(_shell._commands[0])
	check("the city waits behind it (CITY opens the road again)", _world_has("road_stage.gd") != null)
	_shell._end_block()
	await get_tree().process_frame
	eq_("  and END DAY does not turn the block past it", GameState.block_index, block)

	# The road was built again behind the guard: find its buttons afresh.
	choices = _all_nodes(_shell._rail).filter(func(n): return n is Button and n.has_meta("road_choice") \
		and not n.is_queued_for_deletion())
	var first: Button = null
	for b in choices:
		if not (b as Button).disabled:
			first = b
			break
	var picked := String(first.get_meta("road_choice"))
	var minutes := 0
	for c in ev["choices"]:
		if String(c["id"]) == picked:
			minutes = int(c.get("minutes", 0))
	await _press(first)
	check("answering it shows what came of it", _rail_text().contains("MIN") or _rail_text().contains("NO TIME"))
	eq_("  the block does not turn", GameState.block_index, block)
	if minutes > 0:
		check("  the header's clock reads later", _labels_text().contains(PiritoriRoad.clock_label())
			and PiritoriRoad.clock_label() != "", PiritoriRoad.clock_label())
	var cont := _rail_lit()
	check("  one lit CONTINUE", cont.size() == 1 and "CONTINUE" in (cont[0] as Button).text.to_upper())
	if cont.size() == 1:
		await _press(cont[0])
	check("CONTINUE returns to the city", _world_has("road_stage.gd") == null
		and _shell._city_map.is_inside_tree())

	# Refused, never hidden: the underpass with nobody to stand with.
	GameState.road["pending"] = {"id": "road-underpass", "phase": "transit", "from": "piritori", "to": "harju"}
	(GameState.road["seen"] as Array).erase("road-underpass")
	_shell._show_city()
	await get_tree().process_frame
	var stand := _live_button("Stand your ground")
	check("a choice you cannot take is shown", stand != null)
	check("  and refused", stand != null and stand.disabled)
	check("  and says why in words", _rail_text().contains("needs 2 who can fight"))
	# With two crew it becomes a fight: the ordinary battle, no mission, no block.
	GameState.apply_effect("recruit:crew-slot-runner")
	GameState.apply_effect("recruit:crew-slot-watcher")
	_shell._show_road()
	await get_tree().process_frame
	stand = _live_button("Stand your ground")
	check("with two crew it can be taken", stand != null and not stand.disabled)
	if stand != null:
		block = GameState.block_index
		await _press(stand)
		check("  and it is a fight", _shell.mode == _shell.Mode.BATTLE)
		check("  a ROAD fight: no mission behind it", _shell._road_battle)
		eq_("  and the block does not turn", GameState.block_index, block)
	_shell._show_city()
	await get_tree().process_frame


func eq_(label: String, a: Variant, b: Variant) -> void:
	check(label, a == b, "(got %s, want %s)" % [a, b])


## web v4.60/v4.61: Tokon Ramen on Vaasankatu — a bowl buys a range, heard on
## the board; early weapons under the counter; BACK is the one lit thing.
func _test_toko_through_ui() -> void:
	print("\nTokon Ramen (web v4.60/v4.61), through the interface")
	await _fresh_city("vaasankatu")
	var door := _live_button("TOKON RAMEN")
	check("at Vaasankatu the counter is on the rail", door != null)
	check("  unlit: the next step stays the one lit thing", door != null and not PiritoriChrome.is_lit(door)
		and _rail_lit().size() == 1 and _rail_last_button() == _rail_lit()[0])
	if door == null:
		return
	await _press(door)
	check("the counter opens with Toko behind it", _shell._stage_has_speaker
		and _world_has("location_stage.gd") != null)
	var lit := _rail_lit()
	check("  BACK TO THE STREET is the one lit thing, and last",
		lit.size() == 1 and "STREET" in (lit[0] as Button).text.to_upper() and _rail_last_button() == lit[0])
	check("  Toko says his line for the block", _labels_text().contains(tr("toko.line_%s" % str(GameState.block_index % 10))))
	var cash := GameState.cash_eur
	var tip := String(PiritoriToko.tip().get("id", ""))
	var bowl := _live_button("BUY A BOWL")
	check("a bowl is on the counter", bowl != null and not bowl.disabled)
	await _press(bowl)
	eq_("  it costs €6", GameState.cash_eur, cash - 6)
	check("  he names the best place you do not know, with a range",
		GameState.heard.has(tip) and _labels_text().contains("They are paying"))
	var eaten := _live_button("YOU HAVE EATEN")
	check("  one bowl a block", eaten != null and eaten.disabled)
	var weapon := _live_button("Buy the Baton")
	check("early weapons under the counter", weapon != null)
	check("  never a gun", _live_button("Handgun") == null)
	var kit := GameState.equipment.size()
	cash = GameState.cash_eur
	await _press(weapon)
	check("  a weapon at the street price", GameState.equipment.size() == kit + 1
		and GameState.cash_eur == cash - GameState.buy_of("baton"))
	# The board: heard, not seen.
	await _press(_shell._commands[3])
	var board := _live_button("THE BOARD")
	check("MISSIONS offers the board", board != null)
	await _press(board)
	var row: Node = null
	for n in _all_nodes(_shell._world_host):
		if n.name == "BoardRow_" + tip:
			row = n
	check("the board shows the place he named", row != null)
	check("  as a RANGE heard from Toko", row != null and String(row.get_meta("level")) == "range"
		and bool(row.get_meta("heard")))
	check("  and says so", row != null and _all_nodes(row).any(func(n): return n is Label and n.text.begins_with("Toko")))
	check("  it is not a visit", not GameState.seen.has(tip))
	_check_type_floor("the board")


## web v4.61: the Piritori street seller keeps the gear and the fence.
func _test_street_seller_through_ui() -> void:
	print("\nthe street seller (web v4.61), through the interface")
	await _fresh_city("piritori")
	var door := _live_button("STREET SELLER")
	check("at Piritori the street seller is on the rail, unlit", door != null and not PiritoriChrome.is_lit(door))
	if door == null:
		return
	await _press(door)
	check("  his screen sells gear", _live_button("Buy the Handgun") != null and _rail_text().contains(tr("ui.shop")))
	check("  and has the fence", _rail_text().contains(tr("ui.fence")))
	var lit := _rail_lit()
	check("  BACK TO THE STREET is the one lit thing", lit.size() == 1)
	if lit.size() == 1:
		await _press(lit[0])
	check("  and it goes back", _shell._city_map.is_inside_tree())


## web v4.62: briefings and the case board in the ledger; a visit earns a key
## clue; the Thursday Tram opens at Piritori on two, answered once.
func _test_story_through_ui() -> void:
	print("\nthe Thursday Load (web v4.62), through the interface")
	await _fresh_city()
	GameState.resolve_encounter("enc-first-purchase", "ask-control")
	GameState.apply_effect("flag:mccormicks-know-skim")
	await _press(_shell._commands[3])
	var ledger := _world_has("story_ledger.gd")
	check("MISSIONS opens the week's ledger", ledger != null)
	var cards := _all_nodes(_shell._world_host).filter(func(n): return String(n.name).begins_with("Mission_"))
	eq_("  every mission is briefed", cards.size(), (ContentRegistry.slice["missions"] as Array).size())
	var clues := _all_nodes(_shell._world_host).filter(func(n): return String(n.name).begins_with("Clue_"))
	eq_("  the case board lists every clue", clues.size(), ContentRegistry.story_clues().size())
	eq_("  two found, on paper", clues.filter(func(n): return bool(n.get_meta("found"))).size(), 2)
	eq_("  three marked KEY", clues.filter(func(n): return bool(n.get_meta("key"))).size(), 3)
	check("  and says how far the case is", _labels_text().contains("1 of 2 key clues"))
	_check_type_floor("the ledger")

	# Brahenkenttä: a visit, with someone to watch the vans.
	GameState.resolved_encounters["enc-toko-quiet-voice"] = "eat-and-listen"
	GameState.apply_effect("recruit:crew-slot-runner")
	GameState.current_anchor_id = "harju"
	_shell._show_city()
	await get_tree().process_frame
	_shell._city_map.select("harju")
	await get_tree().process_frame
	var visit := _live_button("VISIT")
	check("after Toko's night, Harju has a visit", visit != null and not PiritoriChrome.is_lit(visit))
	if visit == null:
		return
	await _press(visit)
	var block := GameState.block_index
	var watch := _live_button("watch the tram yourself")
	check("  watching the tram can be taken with one crew", watch != null and not watch.disabled)
	await _press(watch)
	check("  the load rides the 3: a KEY clue", GameState.has_flag("memory:saw-the-tram"))
	eq_("  a visit turns no block", GameState.block_index, block)

	# Two key clues: the case at Piritori.
	GameState.current_anchor_id = "piritori"
	_shell._show_city()
	await get_tree().process_frame
	_shell._city_map.select("piritori")
	await get_tree().process_frame
	var case_b := _live_button("THE THURSDAY TRAM")
	check("two key clues: the case waits at Piritori", case_b != null)
	check("  unlit, and the next step is still the one lit thing, last",
		case_b != null and not PiritoriChrome.is_lit(case_b) and _rail_lit().size() <= 1)
	if case_b == null:
		return
	await _press(case_b)
	var toko := int(GameState.relationships.get("toko", 0))
	var intel := GameState.intel
	block = GameState.block_index
	var give := _live_button("Give it to Toko")
	check("  its four answers are offered", _all_nodes(_shell._rail).filter(func(n): return n is Button and n.has_meta("case_choice")).size() == 4)
	await _press(give)
	check("giving it to Toko: Toko +2, intel +2",
		int(GameState.relationships.get("toko", 0)) == toko + 2 and GameState.intel == intel + 2)
	eq_("  the case turns no block", GameState.block_index, block)
	eq_("  answered once", PiritoriStory.case_blocker(), "resolved")
	check("  one lit way back", _rail_lit().size() == 1)
	_shell._show_city()
	await get_tree().process_frame
	_shell._city_map.select("piritori")
	await get_tree().process_frame
	check("the case is gone from Piritori", _live_button("THE THURSDAY TRAM") == null)
	await _press(_shell._commands[3])
	check("the board says it is settled", _labels_text().contains("Settled: Give it to Toko."))
	_shell._show_city()
	await get_tree().process_frame


## web v4.63: Kello's cut lands as a night ends and says so; found out, the
## story's road event opens. web v4.64: after the shipment the rail lists what
## crosses into chapter 2, and applies none of it while chapter 2 is unwritten.
func _test_cut_and_turn_through_ui() -> void:
	print("\nKello's cut and the chapter turn (web v4.63/v4.64), through the interface")
	await _fresh_city("piritori")
	# Fixtures: the cut taken, and the clock at a night.
	GameState.apply_effect("flag:thursday-cut")
	GameState.block_index = 1
	var paid := int(ContentRegistry.story_case()["cut"]["nightly_eur"])
	var cash := GameState.cash_eur
	_shell._end_block()
	await get_tree().process_frame
	await get_tree().process_frame
	eq_("the night's end pays Kello's cut", GameState.cash_eur, cash + paid)
	check("  and the rail says so", _labels_text().contains(tr("story.cut_paid") % paid))
	var event_id := String(ContentRegistry.story_case()["cut"]["found_out_event"])
	for i in 5:
		if not PiritoriRoad.pending_event().is_empty():
			break
		GameState.block_index += 1   # fixture: on to the next night
		_shell._end_block()
		await get_tree().process_frame
		await get_tree().process_frame
	eq_("found out, the story's event waits", String(PiritoriRoad.pending_event().get("id", "")), event_id)
	check("  and the road screen opens on it", _world_has("road_stage.gd") != null)
	var choices := _all_nodes(_shell._rail).filter(func(n): return n is Button and n.has_meta("road_choice") \
		and not n.is_queued_for_deletion())
	eq_("  with its three answers", choices.size(), (ContentRegistry.road_event(event_id)["choices"] as Array).size())
	var give: Button = null
	for b in choices:
		if String(b.get_meta("road_choice")) == "give-kello":
			give = b
	await _press(give)
	check("  giving them Kello ends the cut", GameState.has_flag("cut-ended"))

	# H1 (v4.65): the shipment is day 10's night at Sörnäinen, an encounter
	# like any other; the ledger no longer carries a button for it.
	await _fresh_city("sornainen_harbour")
	var ending := GameState.chapter_ending()
	GameState.record_chapter_income(GameState.chapter_threshold)
	GameState.cash_eur = int(ending.get("stake_eur", 0)) + 40
	GameState.stock["piri"] = 2
	_shell._show_market()
	await get_tree().process_frame
	await get_tree().process_frame
	check("the ledger has no shipment button any more", _live_button("Pay for the container") == null)
	var where := _all_nodes(_shell._rail).filter(func(n): return n is Label and n.name == "ChapterWhere" \
		and not n.is_queued_for_deletion())
	check("  it says where and when the shipment runs", not where.is_empty()
		and where[0].text.contains(String(ContentRegistry.anchor("sornainen_harbour").get("label", "")))
		and where[0].text.contains(str(int(ContentRegistry.campaign().get("days", 0)))),
		where[0].text if not where.is_empty() else "none")
	# Fixture: the clock walked on to the chapter's last night.
	var last := ContentRegistry.schedule().size() - 1
	while GameState.block_index < last:
		GameState.advance_block()
	_shell._show_city()
	await get_tree().process_frame
	await get_tree().process_frame
	var enter := _one_lit("enter", "ENTER · " + String(ContentRegistry.site("sornainen_quay").get("label", "")))
	if enter == null:
		return
	await _press(enter)
	var run := _choice_button("run-shipment")
	check("the shipment can be run", run != null and not run.disabled)
	if run == null:
		return
	await _press(run)
	check("the chapter closes: TO BE CONTINUED", _rail_named("ToBeContinued") != null
		and _labels_text().contains(tr("chapter.to_be_continued")))
	check("  headed CHAPTER 1 CLOSES", _labels_text().contains(tr("chapter.closes") % 1))
	check("  saying how the operation went", _rail_named("ChapterOutcome") != null
		and ["clean", "messy", "lost"].has(GameState.last_ending_outcome))
	var turn := _rail_named("ChapterTurn")
	check("after it, the rail lists what crosses", turn != null)
	if turn == null:
		return
	var rows := _all_nodes(turn).filter(func(n): return n is Label and n.has_meta("turn_row"))
	eq_("  one row per rule the data names", rows.size(), PiritoriChapter.turn_plan().size())
	check("  under INTO CHAPTER 2", _labels_text().contains(tr("chapter.into") % 2))
	var cash_row := rows.filter(func(l): return String(l.get_meta("turn_row")) == "cash")
	check("  cash reads now → the standard stake",
		not cash_row.is_empty() and cash_row[0].text.contains("€40 → €%d" % int(ContentRegistry.slice["chapter_turn"]["opening_cash_eur"])),
		cash_row[0].text if not cash_row.is_empty() else "no row")
	if PiritoriChapter.next_chapter().is_empty():
		check("  it says chapter 2 comes in a later build", _labels_text().contains(tr("chapter.later") % 2))
		check("  and offers no way on", _live_button(tr("chapter.next")) == null)
	check("  and where the road points", _rail_named("RoadPoints") != null
		and _labels_text().contains(String(GameState.forecast_ending().get("label", "---"))))
	check("shown, not applied: still chapter 1, still €40, still two packs, no ending",
		GameState.chapter == 1 and GameState.cash_eur == 40 and int(GameState.stock["piri"]) == 2
		and GameState.chapter_cleared and GameState.ending_id == "")
	# Looking at the map does not open a closed chapter back up.
	_shell._city_map.select("piritori")
	await get_tree().process_frame
	check("the map stays to look at; the rail stays closed", _rail_named("ToBeContinued") != null)
	var again := _one_lit("new-campaign", tr("chapter.new_ten"))
	if again == null:
		return
	await _press(again)
	check("START A NEW TEN DAYS opens day one", GameState.block_index == 0 and not GameState.chapter_cleared
		and _rail_named("ToBeContinued") == null)
	GameState.arrival_due = false
	if _shell._arrival != null:
		_shell._arrival.queue_free()
		_shell._arrival = null
	_shell._show_city()
	await get_tree().process_frame

	# Short of the goal, the boat leaves without you and the chapter still closes.
	await _fresh_city("sornainen_harbour")
	while GameState.block_index < last:
		GameState.advance_block()
	_shell._show_city()
	await get_tree().process_frame
	await get_tree().process_frame
	enter = _one_lit("enter", "ENTER · " + String(ContentRegistry.site("sornainen_quay").get("label", "")))
	if enter == null:
		return
	await _press(enter)
	run = _choice_button("run-shipment")
	check("short of the goal, the shipment is refused", run != null and run.disabled)
	check("  and says why in words", _rail_text().contains(tr("chapter.goal_unmet")))
	var go := _choice_button("let-it-go")
	await _press(go)
	check("watching the boat leave closes the chapter too", _rail_named("ToBeContinued") != null
		and GameState.last_ending_outcome == "missed" and _labels_text().contains(tr("chapter.out_missed")))
	_shell._show_city()
	await get_tree().process_frame


func _rail_named(node_name: String) -> Node:
	for n in _all_nodes(_shell._rail):
		if n.name == node_name and not n.is_queued_for_deletion():
			return n
	return null


func _choice_button(choice_id: String) -> Button:
	for n in _all_nodes(_shell._rail):
		if n is Button and String(n.get_meta("choice", "")) == choice_id and not n.is_queued_for_deletion():
			return n
	return null


## A door card on the rail's board, by template id.
func _door_cards() -> Array:
	return _all_nodes(_shell._rail).filter(func(n): return n is VBoxContainer and n.has_meta("door") \
		and not n.is_queued_for_deletion())


func _take_button(card: Node) -> Button:
	for n in _all_nodes(card):
		if n is Button and n.has_meta("take_door"):
			return n
	return null


## A block the spine leaves free (web doors-browser.cjs): the board, the pins,
## CHOOSE A DOOR; taking a quiet door, walking to it and doing it, by button.
func _test_doors_through_ui() -> void:
	print("\ndoors (web v4.65), through the interface")
	await _fresh_city("piritori")
	var first := int(ContentRegistry.schedule().map(func(e): return bool(e.get("door", false))).find(true))
	# Fixtures only: the block, packs, and a crew.
	GameState.block_index = first
	GameState.day = first / 2 + 1
	GameState.stock["piri"] = 2
	for id in ["crew-slot-runner", "crew-slot-watcher", "crew-slot-fixer"]:
		GameState.apply_effect("recruit:" + id)
	_shell._show_city()
	await get_tree().process_frame
	await get_tree().process_frame
	check("a free block shows its doors", _rail_named("DoorBoard") != null)
	var cards := _door_cards()
	check("two or three doors (%d)" % cards.size(), cards.size() >= 2 and cards.size() <= 3)
	var fights := _all_nodes(_shell._rail).filter(func(n): return n is Label and n.name == "DoorTags" \
		and bool(n.get_meta("can_fight", false)) and not n.is_queued_for_deletion())
	check("one of them can become a fight", fights.size() >= 1)
	var anchors := {}
	for c in cards:
		anchors[String(c.get_meta("anchor"))] = true
	var pins: PackedStringArray = _shell._city_map.door_pin_anchors()
	check("every door is pinned on the map", pins.size() == anchors.size()
		and Array(pins).all(func(a): return anchors.has(a)), str(pins))
	_one_lit("doors", tr("ui.next_doors"))
	_check_type_floor("the door board")
	# Most doors can go bad now (answer 25); pin one that cannot, so the walk
	# is about walking (fixture, as web doors-browser.cjs does).
	GameState.doors["offers"][str(first)] = [{"template": "gig-rauno-cart", "anchor": "harju"},
		{"template": "hit-bear-debt", "anchor": "karhupuisto"}]
	_shell._show_city()
	await get_tree().process_frame
	var quiet: Node = null
	for c in _door_cards():
		if String(c.get_meta("door")) == "gig-rauno-cart":
			quiet = c
	if quiet == null:
		check("a quiet door is on the board", false)
		return
	var door_id := String(quiet.get_meta("door"))
	await _press(_take_button(quiet))
	check("the door is taken", String(PiritoriDoors.taken_at().get("template", "")) == door_id
		and _rail_named("DoorBoard") == null)
	check("  and the rail says where to go", _rail_named("DoorTaken") != null)
	check("the board's pins are gone with it", _shell._city_map.door_pin_anchors().is_empty())
	# Walk there by the lit step (a road event on the way is answered).
	for i in 6:
		var lit := _rail_lit()
		if lit.size() != 1:
			break
		var step := String(lit[0].get_meta("next_step", ""))
		if step == "enter":
			break
		if step == "road-continue" or not PiritoriRoad.pending_event().is_empty():
			var open := _all_nodes(_shell._rail).filter(func(n): return n is Button and n.has_meta("road_choice") \
				and not n.disabled and not n.is_queued_for_deletion())
			if not open.is_empty():
				await _press(open[-1])
			var cont := _rail_lit()
			if cont.size() == 1:
				await _press(cont[0])
			continue
		await _press(lit[0])
	var enter := _one_lit("enter", String(PiritoriDoors.template_of(door_id).get("title", "")))
	if enter == null:
		return
	await _press(enter)
	var steps := _all_nodes(_shell._rail).filter(func(n): return n is Label and n.has_meta("door_step") \
		and not n.is_queued_for_deletion())
	eq_("the door plays as a briefed scene: three steps", steps.size(), 3)
	var choices := _all_nodes(_shell._rail).filter(func(n): return n is Button and n.has_meta("choice") \
		and not n.disabled and not n.is_queued_for_deletion())
	await _press(choices[-1])
	eq_("it cost the block", GameState.block_index, first + 1)
	var next_cards := _door_cards()
	check("the next free block has its own doors", next_cards.size() >= 2
		and not next_cards.any(func(c): return String(c.get_meta("door")) == door_id),
		str(next_cards.map(func(c): return c.get_meta("door"))))


## A door fight (answer 23): the bear debt, with a crew. It is a door fight,
## not a mission; it counts toward today's two; and when it ends it pays the
## door's own stakes.
func _test_door_fight_through_ui() -> void:
	print("\na door fight (answer 23), through the interface")
	await _fresh_city("karhupuisto")
	var first := int(ContentRegistry.schedule().map(func(e): return bool(e.get("door", false))).find(true))
	var today := int(ContentRegistry.schedule()[first].get("day", 0))
	# Fixtures only: the block, a crew, and which doors are on the board.
	GameState.block_index = first
	GameState.day = first / 2 + 1
	for id in ["crew-slot-runner", "crew-slot-watcher", "crew-slot-fixer"]:
		GameState.apply_effect("recruit:" + id)
	GameState.doors = {"offers": {str(first): [{"template": "hit-bear-debt", "anchor": "karhupuisto"},
		{"template": "gig-rauno-cart", "anchor": "harju"}]}, "taken": {}}
	GameState.fights_by_day = {}
	_shell._show_city()
	await get_tree().process_frame
	var take: Button = null
	for c in _door_cards():
		if String(c.get_meta("door")) == "hit-bear-debt":
			take = _take_button(c)
	check("the bear debt is on the board", take != null and not take.disabled)
	if take == null:
		return
	await _press(take)
	var enter := _one_lit("enter", "ENTER")
	if enter == null:
		return
	await _press(enter)
	var lean := _choice_button("lean")
	check("the fight is offered with a crew", lean != null and not lean.disabled)
	if lean == null:
		return
	var rel := int(GameState.relationships.get("mccormick_family", 0))
	var missions := GameState.mission_state.duplicate()
	await _press(lean)
	check("it is a fight", _shell.mode == _shell.Mode.BATTLE)
	check("  a DOOR fight, not a mission and not the road",
		_shell._door_battle == "hit-bear-debt" and not _shell._road_battle)
	eq_("  and it counts toward today's two", GameState.fights_by_day.get(str(today), 0), 1)
	# End it the way a thumb would: WITHDRAW, then let the round resolve.
	var scene := _world_has("formation_battle.gd")
	var wd := _live_button("Withdraw")
	if scene == null or wd == null:
		check("the battle can be withdrawn from", false)
		return
	await _press(wd)
	var guard := 0
	# The aftermath takes the stage down once the fight settles.
	while is_instance_valid(scene) and not scene.is_queued_for_deletion() \
			and scene.fight.result == FightManager.BattleResult.PENDING and guard < 10:
		guard += 1
		scene.fight.confirm_commands()
		await get_tree().process_frame
	await get_tree().process_frame
	check("withdrawn, the fight is over and the city is back", _shell.mode == _shell.Mode.CITY)
	eq_("  it paid the door's own stakes, not a mission's (a loss: McCormicks -1)",
		int(GameState.relationships.get("mccormick_family", 0)), rel - 1)
	check("  and settled no mission", GameState.mission_state == missions, str(GameState.mission_state))
	_shell._show_city()
	await get_tree().process_frame

	# Answer 25: a bad deal escalates. Selling two at the quay goes bad on
	# this block's roll (web doors-browser.cjs): with a crew it is a fight.
	for crew in [3, 0]:
		await _fresh_city("sornainen_harbour")
		GameState.block_index = first
		GameState.day = first / 2 + 1
		GameState.stock["piri"] = 2
		for id in ["crew-slot-runner", "crew-slot-watcher", "crew-slot-fixer"].slice(0, crew):
			GameState.apply_effect("recruit:" + id)
		GameState.doors = {"offers": {str(first): [{"template": "sale-quay-shift", "anchor": "sornainen_harbour"},
			{"template": "gig-rauno-cart", "anchor": "harju"}]}, "taken": {}}
		_shell._show_city()
		await get_tree().process_frame
		var take_quay: Button = null
		for c in _door_cards():
			if String(c.get_meta("door")) == "sale-quay-shift":
				take_quay = _take_button(c)
		if take_quay == null:
			check("the quay is on the board", false)
			return
		await _press(take_quay)
		enter = _one_lit("enter", "ENTER")
		if enter == null:
			return
		await _press(enter)
		var warn := _all_nodes(_shell._rail).filter(func(n): return n is Label and String(n.get_meta("escalates", "")) == "sell-two" \
			and not n.is_queued_for_deletion())
		check("a bad deal says it can go bad", not warn.is_empty() and warn[0].text.contains(tr("door.can_go_bad") % 40),
			warn[0].text if not warn.is_empty() else "none")
		var sell := _choice_button("sell-two")
		if sell == null:
			return
		var cash := GameState.cash_eur
		await _press(sell)
		if crew > 0:
			check("it goes bad, and it is a fight", _shell.mode == _shell.Mode.BATTLE
				and _shell._door_battle == "sale-quay-shift" and _shell._door_escalated
				and GameState.fights_by_day.get(str(today), 0) == 1, str(GameState.fights_by_day))
		else:
			check("alone, it goes bad without a fight and costs the door",
				_shell.mode == _shell.Mode.CITY and _rail_named("DealWentBad") != null
				and _labels_text().contains(tr("door.went_bad_alone")) and GameState.cash_eur == cash + 90 - 60,
				"€%d → €%d" % [cash, GameState.cash_eur])
		_shell._show_city()
		await get_tree().process_frame


## web/test/aatami-browser.cjs (answers 24 and 26): the bear debt's two-a-side
## fight with one hire, with none, and with three in chapter 3. Fixtures set
## the block, who is hired, the chapter and which door is on the board; the
## fight starts from a real press.
func _aatami_at_the_bear(hired: int) -> Button:
	await _fresh_city("karhupuisto")
	var first := int(ContentRegistry.schedule().map(func(e): return bool(e.get("door", false))).find(true))
	GameState.block_index = first
	GameState.day = first / 2 + 1
	for id in ["crew-slot-runner", "crew-slot-watcher", "crew-slot-fixer"].slice(0, hired):
		GameState.apply_effect("recruit:" + id)
	GameState.chapter = 3 if hired == 3 else 1
	GameState.doors = {"offers": {str(first): [{"template": "hit-bear-debt", "anchor": "karhupuisto"},
		{"template": "gig-rauno-cart", "anchor": "harju"}]}, "taken": {}}
	GameState.fights_by_day = {}
	_shell._show_city()
	await get_tree().process_frame
	var take: Button = null
	for c in _door_cards():
		if String(c.get_meta("door")) == "hit-bear-debt":
			take = _take_button(c)
	if take == null:
		check("the bear debt is on the board (%d hired)" % hired, false)
		return null
	await _press(take)
	var enter := _one_lit("enter", "ENTER")
	if enter == null:
		return null
	await _press(enter)
	return _choice_button("lean")


func _test_aatami_through_ui() -> void:
	print("\nAatami fights first, then the crew does (answers 24 and 26), through the interface")
	# One hire: Aatami makes the second fighter.
	var lean := await _aatami_at_the_bear(1)
	check("with one hire the fight is open (Aatami fights)", lean != null and not lean.disabled)
	if lean == null:
		return
	await _press(lean)
	var scene := _world_has("formation_battle.gd")
	var players: Array = scene.fight.get_fighters(Fighter.Side.PLAYER) if scene != null else []
	check("Aatami is on the board, in front", _shell.mode == _shell.Mode.BATTLE and players.size() == 2
		and String(players[0].fighter_id) == "aatami" and String(players[0].display_name) == "Aatami"
		and int(players[0].slot.y) == FightBoard.depth_of(0, true),
		str(players.map(func(f): return "%s@%s" % [f.fighter_id, f.slot])))
	check("  and not stepped back", not GameState.has_flag("memory:aatami-stepped-back"))
	check("  no beat opens a fight he stands in", scene != null and scene.fight_log.is_empty())

	# Nobody hired: the bear debt's fight is closed, and says why.
	lean = await _aatami_at_the_bear(0)
	check("alone he cannot take a two-a-side fight, and the card says so",
		lean != null and lean.disabled and _rail_text().contains("needs 2 who can fight"), _rail_text())

	# Chapter 3, The Supplier: the first fight he stays out of is a beat.
	lean = await _aatami_at_the_bear(3)
	if lean == null:
		return
	await _press(lean)
	scene = _world_has("formation_battle.gd")
	players = scene.fight.get_fighters(Fighter.Side.PLAYER) if scene != null else []
	check("in chapter 3 he steps back", _shell.mode == _shell.Mode.BATTLE and players.size() == 2
		and not players.any(func(f): return String(f.fighter_id) == "aatami")
		and GameState.has_flag("memory:aatami-stepped-back"))
	var beat := String(ContentRegistry.protagonist().get("step_back_beat", ""))
	var log_label: Label = scene.find_child("FightLog", true, false) if scene != null else null
	check("  and the fight opens on that beat", scene != null and scene.fight_log.size() == 1
		and scene.fight_log[0] == beat and beat.contains("edge of the board")
		and log_label != null and log_label.visible and log_label.text.contains(beat))
	GameState.chapter = 1
	_shell._show_city()
	await get_tree().process_frame


## web/test/standing-browser.cjs (v4.67, H5): the ledger's family cards, a
## bill after the night you insult them, paying it, a warning, then the
## retaliation — on a desktop and on a phone. Fixtures set the scene (the
## block, where Aatami stands, a family's number, cash); the choice that
## insults them, the nights that settle it and the answers are real presses.
func _family_cards() -> Array:
	return _all_nodes(_shell._world_host).filter(func(n): return n is PanelContainer and n.has_meta("family") \
		and not n.is_queued_for_deletion())


func _open_ledger() -> void:
	await _press(_shell._commands[3])
	await get_tree().process_frame


func _play_beat(choice_id: String) -> bool:
	# Fixture: the block's scene revealed, as arriving at the block reveals it.
	var eid := String(GameState.current_schedule().get("encounter_id", ""))
	GameState.revealed[eid] = true
	GameState.revealed[String(ContentRegistry.encounter(eid).get("site_id", ""))] = true
	_shell._show_city()
	await get_tree().process_frame
	_shell._city_map.select(GameState.current_anchor_id)
	await get_tree().process_frame
	var enter: Button = null
	for b in _rail_lit():
		if String(b.get_meta("next_step", "")) == "enter":
			enter = b
	if enter == null:
		check("the night's scene can be entered", false, str(_rail_lit().map(func(b): return b.text)))
		return false
	await _press(enter)
	var c := _choice_button(choice_id)
	if c == null or c.disabled:
		check("%s can be chosen" % choice_id, false)
		return false
	await _press(c)
	return true


func _road_button(choice_id: String) -> Button:
	for n in _all_nodes(_shell._rail):
		if n is Button and String(n.get_meta("road_choice", "")) == choice_id and not n.is_queued_for_deletion():
			return n
	return null


func _test_standing_through_ui() -> void:
	print("\nthe families' standing (web v4.67), through the interface")
	var prior := get_tree().root.size
	for probe in [["desktop", Vector2i(1280, 800)], ["phone", Vector2i(390, 844)]]:
		var name: String = probe[0]
		get_tree().root.size = probe[1]
		await _fresh_city("piritori")
		await _open_ledger()
		var cards := _family_cards()
		eq_("%s: the ledger shows both families" % name, cards.size(), 2)
		check("%s: both start neutral" % name, cards.all(func(c): return String(c.get_meta("rung")) == "neutral"))
		check("%s: the board says the police are not a family" % name, _labels_text().contains(tr("standing.police")))
		_check_type_floor("%s family board" % name)

		# Day 9's night: stalling the families insults the McCormicks (-1 -> -2).
		GameState.block_index = 17
		GameState.day = 9
		GameState.current_anchor_id = "linjat_yard"
		GameState.relationships["mccormick_family"] = -1
		GameState.cash_eur = 200
		if not await _play_beat("stall"):
			return
		check("%s: the night brings their bill" % name, _world_has("road_stage.gd") != null
			and String(PiritoriRoad.pending_event().get("id", "")) == "road-restitution-mccormick")
		check("%s: and it reads as theirs" % name, _labels_text().contains("The McCormicks send a bill"))
		var pay := _road_button("pay")
		if pay == null:
			check("%s: the bill can be paid" % name, false)
			return
		await _press(pay)
		var cont := _rail_lit()
		if cont.size() == 1:
			await _press(cont[0])
		check("%s: paying buys them back to wary" % name,
			int(GameState.relationships["mccormick_family"]) == -1 and GameState.cash_eur == 120,
			"%s €%d" % [GameState.relationships, GameState.cash_eur])

		# Retaliating: a warning one night, the McCormicks the next.
		GameState.block_index = 17
		GameState.day = 9
		GameState.current_anchor_id = "linjat_yard"
		GameState.relationships["mccormick_family"] = -2
		GameState.relationships["jade_lantern_network"] = 0
		GameState.standing = {"warned": {}, "demanded": {"mccormick_family": true}}
		GameState.resolved_encounters.erase("enc-family-calls")
		GameState.road["pending"] = null
		if not await _play_beat("stall"):
			return
		check("%s: retaliating, first they warn you" % name,
			int(GameState.relationships["mccormick_family"]) == -3
			and bool(GameState.standing["warned"].get("mccormick_family", false))
			and PiritoriRoad.pending_event().is_empty() and _world_has("road_stage.gd") == null)
		check("%s: the rail says so the morning after" % name, _rail_named("StandingWarning") != null
			and _rail_text().contains("Tomorrow night"))
		await _open_ledger()
		var mc: Node = null
		for c in _family_cards():
			if String(c.get_meta("family")) == "mccormick_family":
				mc = c
		var card_text := "" if mc == null else "\n".join(_all_nodes(mc).filter(func(n): return n is Label).map(func(l): return l.text))
		check("%s: the card says retaliating, and when" % name, mc != null
			and String(mc.get_meta("rung")) == "retaliating" and card_text.contains("Tomorrow night")
			and card_text.contains(tr("standing.rung_retaliating") + " · -3"), card_text)
		var board: Control = _world_has("story_ledger.gd").find_child("FamilyBoard", true, false) \
			if _world_has("story_ledger.gd") != null else null
		# The board asks for no more width than a phone has (the web's "no
		# overflow"): its cards wrap rather than push the screen wider.
		check("%s: the board fits the screen" % name, board != null
			and board.get_combined_minimum_size().x <= _shell.get_viewport_rect().size.x,
			"%s in %s" % [board.get_combined_minimum_size(), _shell.get_viewport_rect()] if board != null else "none")

		GameState.block_index = 19
		GameState.day = 10
		GameState.current_anchor_id = "sornainen_harbour"
		if not await _play_beat("let-it-go"):
			return
		_shell._show_city()
		await get_tree().process_frame
		check("%s: the next night they come" % name, _world_has("road_stage.gd") != null
			and String(PiritoriRoad.pending_event().get("id", "")) == "road-retaliation-mccormick")
		var stand := _road_button("stand")
		check("%s: alone, Aatami cannot stand against them" % name, stand != null and stand.disabled)
		if name == "phone":
			var debt := GameState.debt_eur
			var take := _road_button("take-it")
			if take != null:
				await _press(take)
			check("phone: letting them take it costs stock and debt", GameState.debt_eur == debt + 60
				and GameState.has_flag("took-the-hit"))
			cont = _rail_lit()
			if cont.size() == 1:
				await _press(cont[0])
			await _open_ledger()
			check("phone: the card still reads retaliating, the warning spent", _family_cards().any(func(c):
				return String(c.get_meta("family")) == "mccormick_family" and String(c.get_meta("rung")) == "retaliating")
				and not bool(GameState.standing["warned"].get("mccormick_family", true)))
	get_tree().root.size = prior
	await get_tree().process_frame
	_shell._show_city()
	await get_tree().process_frame


## web v4.59: SOUND · ON/OFF in the menu, remembered; OFF closes the graph.
func _test_sound_switch() -> void:
	print("\nsound (web v4.59) in the menu")
	var was := Sound.on
	Sound.set_sound(true)
	_shell._rebuild_language_buttons()
	await get_tree().process_frame
	_shell._menu_button.emit_signal("pressed")
	await get_tree().process_frame
	var sw := _live_button("SOUND")
	check("the menu has a SOUND switch", sw != null and "ON" in sw.text)
	check("  a real touch target", sw != null and sw.custom_minimum_size.y >= _shell.MIN_TARGET)
	if sw != null:
		await _press(sw)
		check("  pressing it turns sound off", not Sound.on and not bool(Sound.state()["running"]))
		sw = _live_button("SOUND")
		check("  and it says so", sw != null and "OFF" in sw.text)
		await _press(sw)
		check("  pressing again turns it back on", Sound.on and bool(Sound.state()["running"]))
	_shell._menu_button.emit_signal("pressed")
	await get_tree().process_frame
	Sound.set_sound(was)


## web v4.59/v4.61: the arrival — New Game only, any input skips it, it ends by
## itself, it changes nothing, and afterwards the next step is lit.
func _test_arrival() -> void:
	print("\nthe arrival (web v4.59/v4.61)")
	GameState.new_campaign()
	var snapshot := JSON.stringify(GameState.to_dict())
	var shell := preload("res://scenes/app_shell.tscn").instantiate()
	add_child(shell)
	await get_tree().process_frame
	await get_tree().process_frame
	var arrival: Node = shell.get_node_or_null("Arrival")
	check("a new game opens on the arrival", arrival != null)
	if arrival == null:
		shell.queue_free()
		return
	var text := "\n".join(_all_nodes(arrival).filter(func(n): return n is Label).map(func(l): return l.text))
	check("  its lines read the save: €160, 300 mk, a debt of €350",
		text.contains("€160") and text.contains("300 mk") and text.contains("€350"), text)
	check("  and the first payment from the content: €75 on day 4",
		text.contains("€75") and text.contains("day 4"))
	check("  the tram comes in with its sound", Sound.played.has("arrival") or not Sound.on)
	var skip: Button = null
	for n in _all_nodes(arrival):
		if n is Button and "SKIP" in n.text:
			skip = n
	check("  SKIP is there from frame one", skip != null)
	skip.pressed.emit()
	await get_tree().create_timer(0.7).timeout
	check("SKIP ends it", shell.get_node_or_null("Arrival") == null)
	check("  it never changed the save", JSON.stringify(GameState.to_dict()) == snapshot)
	var lit := _all_nodes(shell._rail).filter(func(n): return n is Button and n.is_visible_in_tree() \
		and not n.is_queued_for_deletion() and PiritoriChrome.is_lit(n))
	check("  afterwards the next step is lit: ENTER", lit.size() == 1 and "ENTER" in (lit[0] as Button).text)
	shell.queue_free()
	await get_tree().process_frame

	# Any key.
	GameState.new_campaign()
	shell = preload("res://scenes/app_shell.tscn").instantiate()
	add_child(shell)
	await get_tree().process_frame
	await get_tree().process_frame
	var key := InputEventKey.new()
	key.keycode = KEY_SPACE
	key.pressed = true
	Input.parse_input_event(key)
	await get_tree().create_timer(0.7).timeout
	check("any key ends it", shell.get_node_or_null("Arrival") == null)
	shell.queue_free()
	await get_tree().process_frame

	# By itself.
	GameState.new_campaign()
	shell = preload("res://scenes/app_shell.tscn").instantiate()
	add_child(shell)
	await get_tree().process_frame
	arrival = shell.get_node_or_null("Arrival")
	for i in 100:
		if arrival == null or not is_instance_valid(arrival):
			break
		arrival._process(0.1)
	await get_tree().create_timer(0.7).timeout
	check("left alone, it ends by itself (about 9.5 s)", shell.get_node_or_null("Arrival") == null)
	shell.queue_free()
	await get_tree().process_frame

	# Continue: a loaded campaign opens on the city.
	GameState.new_campaign()
	GameState.from_dict(JSON.parse_string(snapshot))
	shell = preload("res://scenes/app_shell.tscn").instantiate()
	add_child(shell)
	await get_tree().process_frame
	check("a loaded campaign never sees it", shell.get_node_or_null("Arrival") == null)
	shell.queue_free()
	await get_tree().process_frame
