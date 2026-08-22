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
	_test_board_shape()

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

## The board's shape used to be four copies of the number 3, in the view, the
## reposition rule, the intent scan and the builder. Trying a bigger grid found
## three of them by breaking. This holds them together.
func _test_board_shape() -> void:
	print("
board shape (one number, not four)")

	check("canon is 6 lanes x 3 rows per side", FightBoard.is_canon(),
		"%dx%d" % [FightBoard.lanes, FightBoard.rows])
	check("eighteen cells a side", FightBoard.cell_count() == 18)
	check("six lanes straddle the centre", is_equal_approx(FightBoard.lane_centre(), 2.5))
	check("the far corner is on the board", FightBoard.has_slot(5, 2))
	check("one past it is not", not FightBoard.has_slot(6, 2))
	# Depth runs across the WHOLE board now: both bands plus the neutral rows.
	check("the neutral band is real ground", FightBoard.has_slot(0, FightBoard.rows))
	check("the far end of the board exists",
		FightBoard.has_slot(0, FightBoard.total_rows() - 1))
	check("one past the far end does not",
		not FightBoard.has_slot(0, FightBoard.total_rows()))
	check("three blue, two grey, three red",
		FightBoard.band_of(0) == -1 and FightBoard.band_of(FightBoard.rows) == 0
		and FightBoard.band_of(FightBoard.total_rows() - 1) == 1)

	# The owner's rule: crews START in their colours and may move to all of them.
	var home := FightBoard.home_band(true)
	check("the player's home band is their own rows", home.size() == FightBoard.rows)
	for d in home:
		check("home depth %d is player ground" % d, FightBoard.band_of(d) == -1)

	# An even lane count must straddle the centre line rather than sit off to
	# one side — that is what lane_centre() is for.
	FightBoard.apply_override(4, 4)
	check("an override takes", FightBoard.lanes == 4 and FightBoard.rows == 4)
	check("sixteen cells a side", FightBoard.cell_count() == 16)
	check("four lanes straddle the centre",
		is_equal_approx(FightBoard.lane_centre(), 1.5))
	check("the narrower board still admits lane 3", FightBoard.has_slot(3, 3))
	check("and now refuses lane 4", not FightBoard.has_slot(4, 0))

	# Deployment is generated, not a table of three fixed cells: on a wider
	# board the old table put everyone down the left and left the centre empty.
	var seen := {}
	for i in range(6):
		var slot := BattleBuilder._default_player_slot(i, 6)
		check("deploy %d is on the board" % i,
			FightBoard.has_slot(slot.x, slot.y), str(slot))
		seen[slot] = true
	check("six deployed take six distinct cells", seen.size() == 6, str(seen.keys()))

	# Bounded on purpose: a 1x1 board is not a battle, and an 8x8 one is a
	# different game that §13.3's "no free walking" would not survive.
	FightBoard.apply_override(99, 99)
	check("an absurd board is clamped, not accepted",
		FightBoard.rows <= 6 and FightBoard.lanes <= 6,
		"%dx%d" % [FightBoard.lanes, FightBoard.rows])

	FightBoard.reset()
	check("reset returns to canon", FightBoard.is_canon())

	# Every role a battle can field must have its own art. The cast sets existed
	# for weeks but were never in the manifest, so sync-data did not carry them
	# and every unit fell back to one figure — six identical people in a 3v3,
	# which no gate could see because the fight resolved perfectly.
	# Typed: an untyped array yields Variant elements and PoseArt.texture wants a
	# String, which is a parse error rather than a runtime one.
	var roles: Array[String] = ["driver", "fixer", "local", "muscle", "runner", "watcher"]
	for r in roles:
		var tex := PoseArt.texture(r, "idle-smile")
		check("%s has its own idle art" % r, tex != null)
	var art_paths := {}
	for r in roles:
		var t := PoseArt.texture(r, "idle-smile")
		if t != null:
			art_paths[t.resource_path] = true
	check("the six roles are six different figures",
		art_paths.size() == roles.size(),
		"distinct textures: %d" % art_paths.size())


func _test_cells() -> void:
	print("\ncell grammar (front-2 etc.)")
	# Authored ids are absolute lanes written for a three-lane board. On a wider
	# board they are CENTRED, so "front-2" — the middle of three — lands on the
	# middle of five. Pinning them left instead put the two formations out of
	# line and made every unarmed attack report no reachable target.
	var off := BattleBuilder._authored_lane_offset()
	# A slot's second component is a UNIFIED DEPTH now, not a per-side row.
	# Authored cells belong to the opposition, whose band starts after the
	# neutral rows — so front is the depth NEAREST the middle, not zero.
	var opp_front := FightBoard.depth_of(0, false)
	var opp_mid := FightBoard.depth_of(1, false)
	var opp_back := FightBoard.depth_of(2, false)
	eq("front-2 is the centre lane, opposition front",
		BattleBuilder.parse_cell("front-2"), Vector2i(1 + off, opp_front))
	eq("middle-1 is one to its left", BattleBuilder.parse_cell("middle-1"),
		Vector2i(0 + off, opp_mid))
	eq("back-3 is one to its right", BattleBuilder.parse_cell("back-3"),
		Vector2i(2 + off, opp_back))
	eq("round trip", BattleBuilder.cell_name(2 + off, opp_back), "back-3")
	check("opposition front is nearer the middle than its back",
		opp_front < opp_back, "%d %d" % [opp_front, opp_back])

	var l := BattleBuilder.parse_cell("front-1").x
	var m := BattleBuilder.parse_cell("front-2").x
	var r := BattleBuilder.parse_cell("front-3").x
	check("an authored formation stays symmetrical", m - l == r - m,
		"%d %d %d" % [l, m, r])

	FightBoard.apply_override(3, 3)
	eq("a three-lane board is unshifted", BattleBuilder.parse_cell("front-2"),
		Vector2i(1, FightBoard.depth_of(0, false)))
	FightBoard.reset()


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
	eq("Mikko sits at the centre of the opposition front rank",
		Vector2i(mikko["slot_lane"], mikko["slot_row"]),
		Vector2i(1 + BattleBuilder._authored_lane_offset(),
			FightBoard.depth_of(0, false)))
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
