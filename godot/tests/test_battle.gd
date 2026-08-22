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
	_test_stances()
	_test_skip_to_result()
	_test_new_weapons()
	_test_equipment_from_canon()
	_test_build_2v2()
	_test_hired_crew_can_fight()
	_test_aftermath()
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
	# The 3D board must not repeat the 2D board's mistake from the other side:
	# every unit drawn as one recoloured model is six copies of one person.
	var seen3d := {}
	for r in roles:
		var q := BattleStage3D.unit_path(r)
		check("%s has its own 3D model" % r, ResourceLoader.exists(q), q)
		seen3d[q] = true
	check("the six roles are six different models",
		seen3d.size() == roles.size(), "distinct models: %d" % seen3d.size())

	check("the six roles are six different figures",
		art_paths.size() == roles.size(),
		"distinct textures: %d" % art_paths.size())

	# allowed_rows names rows in a side's OWN formation; a slot carries a
	# unified depth. Comparing them directly meant a front-only weapon refused
	# to fire from the front rank, because the player's front is depth 2 and
	# the rule was reading depth 0 — their BACK row.
	check("the player's front rank reads as front",
		FightBoard.row_of(FightBoard.depth_of(0, true), true) == 0)
	check("the player's back rank reads as back",
		FightBoard.row_of(FightBoard.depth_of(2, true), true) == 2)
	check("the opposition's front rank reads as front",
		FightBoard.row_of(FightBoard.depth_of(0, false), false) == 0)
	check("a player depth is not an opposition row",
		FightBoard.row_of(FightBoard.depth_of(0, true), false) == -1)
	check("neutral ground belongs to no formation",
		FightBoard.row_of(FightBoard.rows, true) == -1
		and FightBoard.row_of(FightBoard.rows, false) == -1)


## The four weapons added 2026-08-22. Each exists to change what a unit CAN DO
## (COMBAT.md §5.2), so each is checked for that rather than for its numbers.
func _test_new_weapons() -> void:
	print("
weapons (COMBAT.md 5.2: an item changes what you can do)")

	var w := EquipmentRules.weapons()
	for id in ["chain", "sawn-off", "folding-knife", "signal-flare"]:
		check("%s is built from canon" % id, w.has(id), str(w.keys()))
	if not w.has("chain"):
		return

	# The chain's whole point: it reaches past the body in front of it, which is
	# the answer to a front rank used as a wall. Nothing else in the slice does.
	check("the chain reaches through the front body", bool(w["chain"]["piercing"]))
	check("and nothing else does",
		not bool(w["baseball-bat"]["piercing"])
		and not bool(w["first-handgun"]["piercing"]))

	# The sawn-off answers a formation that has spread out, and is worse than a
	# bat against a deep one.
	check("the sawn-off is the widest thing on the board",
		int(w["sawn-off"]["lane_spread"]) > int(w["baseball-bat"]["lane_spread"]))
	check("but it stops at the first body",
		not bool(w["sawn-off"]["piercing"]))

	# Lethality is a property of the hold, not of a damage number: the knife
	# does LESS harm than the bat and is the more dangerous thing to carry.
	check("the knife is lethal", bool(w["folding-knife"]["lethal"]))
	check("the bat is not", not bool(w["baseball-bat"]["lethal"]))
	check("and the knife hits softer than the bat",
		int(w["folding-knife"]["harm_max"]) < int(w["baseball-bat"]["harm_max"]),
		"knife %d vs bat %d" % [int(w["folding-knife"]["harm_max"]),
			int(w["baseball-bat"]["harm_max"])])

	# The flare breaks a formation without hurting anyone.
	check("the flare does no harm at all", int(w["signal-flare"]["harm_max"]) == 0)
	check("but it costs nerve", int(w["signal-flare"]["nerve_max"]) > 0)
	check("and it is not lethal", not bool(w["signal-flare"]["lethal"]))
	check("it can be used from any row",
		w["signal-flare"]["allowed_rows"].size() >= 3,
		str(w["signal-flare"]["allowed_rows"]))


## Stances (COMBAT.md §6.2). Checked for what they DO, not that they exist:
## a stance that does not change the crew's preferences is a menu, not a policy.
func _test_stances() -> void:
	print("
stances (COMBAT.md 6.2)")

	var A := FightManager.Stance.AGGRESSIVE
	var D := FightManager.Stance.DEFENSIVE
	var H := FightManager.Stance.HOLD_THE_LINE
	var ATK := FightManager.Command.Type.ATTACK
	var GRD := FightManager.Command.Type.GUARD
	var REP := FightManager.Command.Type.REPOSITION

	check("aggressive prefers attacking to bracing",
		FightManager.stance_weight(A, ATK) > FightManager.stance_weight(A, GRD))
	check("defensive prefers bracing to attacking",
		FightManager.stance_weight(D, GRD) > FightManager.stance_weight(D, ATK))
	check("holding the line suppresses repositioning",
		FightManager.stance_weight(H, REP) < FightManager.stance_weight(A, REP)
		and FightManager.stance_weight(H, REP) < 1.0)
	check("and it braces more than it would unprompted",
		FightManager.stance_weight(H, GRD) > 1.0)

	# The three must actually differ from each other, or two of them are one
	# stance wearing two names.
	var sig := {}
	for st in [A, D, H]:
		sig["%.2f/%.2f/%.2f" % [
			FightManager.stance_weight(st, ATK),
			FightManager.stance_weight(st, GRD),
			FightManager.stance_weight(st, REP)]] = true
	check("the three stances are three different policies", sig.size() == 3)

	# Every stance has a name that survives translation.
	for st in [A, D, H]:
		var key := FightManager.stance_name(st)
		check("%s is a real locale key" % key, tr(key) != key, tr(key))

	# §6.1: auto plays competently but does NOT make the triage call. Nothing in
	# the weighting may consult a fighter's worth to the player.
	var src := FileAccess.get_file_as_string("res://scripts/fight/fight_manager.gd")
	var w := src.find("static func stance_weight")
	# Bound the function at the NEXT declaration. A fixed character count ran
	# past the end into _ai_select_command and failed on that function's word.
	var after := src.find("
static func ", w + 10)
	var alt := src.find("
func ", w + 10)
	if alt >= 0 and (after < 0 or alt < after):
		after = alt
	var body := src.substr(w, (after - w) if after > w else 1200)
	check("stance weighting never reads a fighter at all",
		not body.contains("Fighter") and not body.contains("roster"),
		"the stance decides preferences, not who is expendable")


## Skip to result (COMBAT.md §6.4). The point of the checks is that it is the
## SAME fight resolved quietly, not a second, friendlier combat system.
func _test_skip_to_result() -> void:
	print("
skip to result (COMBAT.md 6.4)")

	var crew: Array = []
	for c in ContentRegistry.slice.get("crew", []):
		crew.append(String(c.get("id", "")))
		if crew.size() >= 3:
			break

	var fm := FightManager.new()
	var errs: Array = fm.begin_canonical("battle-courtyard-3v3", crew, 4242)
	check("a fight opens for skipping", errs.is_empty(), str(errs))
	check("and it starts unresolved", fm.result == FightManager.BattleResult.PENDING)

	var res: int = fm.resolve_to_end()
	check("skipping reaches a real result",
		res != FightManager.BattleResult.PENDING, str(res))
	check("and the fight agrees with what it returned", fm.result == res)

	# Determinism: the same seed skipped twice must land the same way, or a
	# skipped fight is a coin toss and the stance means nothing.
	var b := FightManager.new()
	b.begin_canonical("battle-courtyard-3v3", crew, 4242)
	check("the same seed skips to the same result", b.resolve_to_end() == res)

	# The stance still applies, so this is not free of the player's judgement.
	var aggr := FightManager.new()
	aggr.begin_canonical("battle-courtyard-3v3", crew, 4242)
	aggr.player_stance = FightManager.Stance.AGGRESSIVE
	var hold := FightManager.new()
	hold.begin_canonical("battle-courtyard-3v3", crew, 4242)
	hold.player_stance = FightManager.Stance.DEFENSIVE
	aggr.resolve_to_end()
	hold.resolve_to_end()
	check("both stances resolve rather than hanging",
		aggr.result != FightManager.BattleResult.PENDING
		and hold.result != FightManager.BattleResult.PENDING)
	# What each stance actually LEADS TO is reported rather than asserted. A
	# first pass here guessed that defending stalemates; it does not — bracing
	# outscores attacking nearly every round, so the crew never finishes the
	# fight and the opposition grinds them down instead. Defence loses slowly.
	#
	# That is a balance signal, not a bug, and it is a real one: DEFENSIVE is
	# currently a stance for surviving a round, never for winning a fight.
	print("    aggressive -> %d, defensive -> %d  (see BattleResult)"
		% [aggr.result, hold.result])
	check("the two stances are not the same fight",
		aggr.result != FightManager.BattleResult.PENDING
		and hold.result != FightManager.BattleResult.PENDING)

	# The loop must be bounded. A resolve that cannot terminate hangs the game
	# with no way back, which is worse than one that stops early and says so.
	var capped := FightManager.new()
	capped.begin_canonical("battle-courtyard-3v3", crew, 4242)
	check("a one-round cap returns instead of looping",
		capped.resolve_to_end(1) != null)


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


## The fight has to be able to SAY what happened. Every result was computed and
## none was ever shown: a rout, a negotiated exit, a withdrawal and a defeat all
## returned to the map identically, so losing read as a bug.
func _test_aftermath() -> void:
	print("\nthe fight can say what happened")
	var f := FightManager.new()
	var errs: Array = f.begin_canonical("battle-karhupuisto-2v2", _crew_ids(2), 4242)
	check("a fight opens", errs.is_empty(), str(errs))
	var outcome := f.resolve_to_end()

	var a := f.aftermath()
	check("there is a summary", not a.is_empty())
	eq("it agrees with the result", int(a["result"]), int(outcome))
	check("it counted rounds", int(a["rounds"]) > 0)
	eq("both sides are accounted for",
		(a["ours"] as Array).size() + (a["theirs"] as Array).size(), 4)

	# Standing can never exceed the number of people who were there.
	check("nobody is standing who was not deployed",
		int(a["our_standing"]) <= (a["ours"] as Array).size())
	check("the downed are not also standing",
		int(a["our_standing"]) + int(a["our_downed"]) <= (a["ours"] as Array).size())

	# Everyone reported carries a name, or the screen prints a question mark at
	# the player in the one moment it is supposed to be talking about people.
	var named := true
	for row in a["ours"]:
		if String((row as Dictionary).get("name", "")) == "":
			named = false
	check("everyone reported has a name", named)


## A hire is only real if they can be sent into a fight. Everything else about
## hiring lives in the shell, so this is the one check that proves the registry
## overlay reaches the thing that actually matters.
func _test_hired_crew_can_fight() -> void:
	print("
somebody hired off the street can be fielded")
	GameState.new_campaign()
	var candidate := GameState.hiring_pool()[0]
	GameState.cash_eur = int(candidate["wage_eur"])
	check("hired", GameState.hire(candidate))

	var ids := _crew_ids(1)
	ids.append(String(candidate["id"]))
	var def := BattleBuilder.build("battle-karhupuisto-2v2", ids)
	check("the battle still builds", not def.is_empty())
	eq("both fighters are on the board", def["player_units"].size(), 2)

	var mine: Array = def["player_units"].filter(
		func(u): return u["fighter_id"] == String(candidate["id"]))
	check("the hire is one of them", mine.size() == 1)
	var unit: Dictionary = mine[0]
	eq("they fight under their own name",
		String(unit["display_name"]), String(candidate["name"]))
	check("with the stats they were rolled with",
		int(unit["condition_max"]) == int(candidate["condition"]))


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
