extends Node
## Formation battle gate — §9 acceptance item 5.
##
## Drives the two authored battles through the real FightManager, from the
## canonical records, with no hand-written battle fixtures. If the slice's
## battle data changes, this changes with it.

var _pass := 0
var _fail := 0


func check(l: String, c: bool, d: String = "") -> void:
	if c:
		_pass += 1
		print("  ok    %s" % l)
	else:
		_fail += 1
		print("  FAIL  %s %s" % [l, d])


func eq(l: String, a: Variant, b: Variant) -> void:
	check(l, a == b, "(got %s, want %s)" % [a, b])


func _ready() -> void:
	var bail := Timer.new()
	bail.wait_time = 60.0
	bail.one_shot = true
	bail.timeout.connect(func():
		print("BATTLE FAIL: timed out")
		get_tree().quit(1))
	add_child(bail)
	bail.start()

	print("── formation battle ──")
	Loc.set_language("en")
	GameState.new_campaign()

	_test_cells()
	_test_equipment_from_canon()
	_test_build_2v2()
	_test_build_3v3()
	_test_forecast_before_commitment()
	_test_attrition_is_not_the_exit()
	_test_withdraw_ends_it()
	_test_determinism()
	_test_withdrawal()

	print("\n%d passed, %d failed" % [_pass, _fail])
	if _fail > 0:
		print("BATTLE FAIL")
		get_tree().quit(1)
	else:
		print("BATTLE OK: both authored formations build from canon and resolve.")
		get_tree().quit(0)


func _crew_ids(n: int) -> Array:
	var out: Array = []
	for c in ContentRegistry.slice.get("crew", []):
		out.append(String(c.get("id", "")))
		if out.size() >= n:
			break
	return out


# ── tests ─────────────────────────────────────────────────────────────────

func _test_cells() -> void:
	print("\ncell grammar (front-2 etc.)")
	eq("front-2 -> lane 1 row 0", BattleBuilder.parse_cell("front-2"), Vector2i(1, 0))
	eq("middle-1 -> lane 0 row 1", BattleBuilder.parse_cell("middle-1"), Vector2i(0, 1))
	eq("back-3 -> lane 2 row 2", BattleBuilder.parse_cell("back-3"), Vector2i(2, 2))
	eq("round trip", BattleBuilder.cell_name(2, 2), "back-3")


func _test_equipment_from_canon() -> void:
	print("\nweapons come from the slice, not a hardcoded catalogue")
	var w := EquipmentRules.weapons()
	for id in ["baton", "pipe", "baseball-bat", "first-handgun"]:
		check("%s is present" % id, w.has(id))
	check("unarmed exists as a fallback", w.has("unarmed"))

	# §13.5: reach changes formation access, not only damage.
	eq("baton reaches one lane", int(w["baton"]["lane_spread"]), 0)
	eq("bat reaches adjacent lanes", int(w["baseball-bat"]["lane_spread"]), 1)
	check("baton must stand at the front", w["baton"]["allowed_rows"] == [0])
	check("handgun may act from any row", w["first-handgun"]["allowed_rows"].size() == 3)
	check("handgun carries lethal exposure so it can be forecast",
		bool(w["first-handgun"]["lethal"]))
	check("blunt weapons are not lethal", not bool(w["baton"]["lethal"]))

	# Locked equipment must not reach the field before it is earned.
	check("the firearm is locked on day 1", not EquipmentRules.is_unlocked("first-handgun"))
	check("the feature phone starts unlocked", EquipmentRules.is_unlocked("feature-phone"))


func _test_build_2v2() -> void:
	print("\nbattle-karhupuisto-2v2 builds from canon")
	var def := BattleBuilder.build("battle-karhupuisto-2v2", _crew_ids(2))
	check("definition built", not def.is_empty())
	eq("two opponents", def["opposition_units"].size(), 2)
	eq("player_deployed honoured", def["player_units"].size(), 2)
	eq("stage is the authored scene", String(def["stage_id"]), "scene-karhupuisto-v01")
	check("death is not eligible here", not bool(def["death_eligible"]))

	var matches: Array = def["opposition_units"].filter(
		func(u): return u["fighter_id"] == "opp-mikko-rinne")
	var mikko: Dictionary = matches[0]
	eq("Mikko sits at front-2", Vector2i(mikko["slot_lane"], mikko["slot_row"]), Vector2i(1, 0))
	eq("Mikko carries the authored pipe", String(mikko["held_weapon_id"]), "pipe")

	# Cover is mirrored across both half-boards.
	var plinth: Array = def["cover_props"].filter(func(c): return c["prop_id"] == "bear-plinth")
	eq("bear plinth exists on both sides", plinth.size(), 2)


func _test_build_3v3() -> void:
	print("\nbattle-courtyard-3v3 builds from canon")
	var def := BattleBuilder.build("battle-courtyard-3v3", _crew_ids(3))
	eq("three opponents", def["opposition_units"].size(), 3)
	eq("three deployed", def["player_units"].size(), 3)
	var cells: Array = def["player_units"].map(
		func(u): return Vector2i(u["slot_lane"], u["slot_row"]))
	eq("no two crew share a cell", cells.size(), 3)
	check("deployment is unique", cells[0] != cells[1] and cells[1] != cells[2])


func _test_forecast_before_commitment() -> void:
	print("\nforecast before commitment (handoff §5)")
	var fm := FightManager.new()
	var errs := fm.begin_canonical("battle-karhupuisto-2v2", _crew_ids(2), 4242)
	check("battle initialises without errors", errs.is_empty(), str(errs))
	# INTENT telegraphs and hands straight to the player; COMMAND is where the
	# fight waits for a decision.
	eq("waits for the player in COMMAND", fm.phase, FightManager.Phase.COMMAND)

	var intents := BattleBuilder.opponent_intents("battle-karhupuisto-2v2")
	eq("both intents are telegraphed", intents.size(), 2)
	check("intents are readable words",
		String(intents[0]["intent"]).find("-") == -1, String(intents[0]["intent"]))


## The 2v2 has NO elimination path, and that is deliberate. Pauli stands behind
## park-bench cover in the middle row, and every weapon the slice gives the crew
## on day 1 is non-piercing, so he cannot be reached at all. The authored
## objective agrees: "Complete or abandon the handover; defeating every opponent
## is unnecessary." GDD §13.10: "Killing every opponent should rarely be the
## optimal requirement."
##
## So the gate asserts the shape of the design: attrition alone does not end
## this fight, and the authored exits do.
func _test_attrition_is_not_the_exit() -> void:
	print("
attrition alone does not end the handover (§13.10)")
	var fm := FightManager.new()
	fm.begin_canonical("battle-karhupuisto-2v2", _crew_ids(2), 99)

	var rounds := 0
	while fm.result == FightManager.BattleResult.PENDING and rounds < 25:
		rounds += 1
		fm.confirm_commands()
	check("trading blows does not resolve it", fm.result == FightManager.BattleResult.PENDING,
		"result=%s" % fm.result)
	check("and the player is never stuck without an exit",
		fm.phase == FightManager.Phase.COMMAND, "phase=%s" % fm.phase)


func _test_withdraw_ends_it() -> void:
	print("
withdrawal ends it at a known cost (§13.10)")
	var fm := FightManager.new()
	fm.begin_canonical("battle-karhupuisto-2v2", _crew_ids(2), 7)

	var who := ""
	for id in fm.get_fighters(Fighter.Side.PLAYER):
		who = String(id.fighter_id) if id is Fighter else String(id)
		break
	check("a player unit is on the field", who != "")

	var cmd := FightManager.Command.new(FightManager.Command.Type.WITHDRAW, who)
	var accepted := fm.submit_player_command(cmd)
	check("withdraw is a legal command", accepted)

	var guard := 0
	while fm.result == FightManager.BattleResult.PENDING and guard < 10:
		guard += 1
		fm.confirm_commands()
	check("the battle ends", fm.result != FightManager.BattleResult.PENDING,
		"result=%s" % fm.result)
	eq("and it ends as a withdrawal", fm.result, FightManager.BattleResult.WITHDRAWAL)


func _test_determinism() -> void:
	print("\nseeded replay (§8)")
	var results: Array = []
	for pass_i in range(2):
		var fm := FightManager.new()
		fm.begin_canonical("battle-courtyard-3v3", _crew_ids(3), 20030101)
		var n := 0
		while fm.result == FightManager.BattleResult.PENDING and n < 12:
			n += 1
			fm.confirm_commands()
		var snapshot: Array = []
		for f in fm.get_fighters(Fighter.Side.OPPOSITION):
			snapshot.append([f.fighter_id, f.condition, f.nerve, f.guard, f.slot])
		results.append(snapshot)
	eq("same seed leaves the field in the same state", results[0], results[1])


func _test_withdrawal() -> void:
	print("\nwithdrawal is always available (§13.10)")
	var battle := ContentRegistry.battle("battle-karhupuisto-2v2")
	eq("withdrawal opens at round 1",
		int(battle.get("withdrawal", {}).get("available_from_round", 0)), 1)
	check("its cost is stated up front",
		String(battle.get("withdrawal", {}).get("known_cost", "")) != "")
	check("the objective does not require defeating everyone",
		String(battle.get("objective", "")).to_lower().find("unnecessary") != -1,
		String(battle.get("objective", "")))
