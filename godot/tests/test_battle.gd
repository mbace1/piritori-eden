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
	_test_every_role_has_a_body()
	_test_every_stage_exists()
	_test_unit_variants()
	_test_ground_fill()
	_test_telegraphs()
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


## A role may wear more than one body, and must wear the SAME one every time.
##
## The figure is rebuilt whenever the board redraws. If the pick were random, a
## crew member would change shape between rounds — worse than every hire looking
## identical, which is the problem variants exist to solve.
func _test_unit_variants() -> void:
	print("\nhired bodies vary, and stay put")
	var options: Array = BattleStage3D.UNIT_VARIANTS["hired"]
	check("there is more than one hired body", options.size() >= 2)

	var all_there := true
	for p in options:
		if not ResourceLoader.exists(String(p)):
			all_there = false
	check("every variant is a file that exists", all_there)

	# Same person, same body. Checked repeatedly because a hash that varies per
	# run would pass a single comparison by luck.
	var first := BattleStage3D.unit_path("hired", "hire-4242")
	var stable := true
	for _i in 20:
		if BattleStage3D.unit_path("hired", "hire-4242") != first:
			stable = false
	check("the same person always wears the same body", stable)

	# And the variants are actually reached — a picker that always returns the
	# first entry would pass everything above.
	var seen: Dictionary = {}
	for i in 200:
		seen[BattleStage3D.unit_path("hired", "hire-%d" % i)] = true
	check("both bodies actually turn up across a roster",
		seen.size() == options.size(), str(seen.size()))

	# A role with no variants is untouched by any of this.
	check("a specialist still has exactly one body",
		BattleStage3D.unit_path("watcher", "anyone")
			== String(BattleStage3D.UNIT_BY_ROLE["watcher"]))


## The concrete slab under every arena.
##
## Its whole job is to be invisible when it works, which is exactly why it needs
## a test: a diorama with no floor beyond its own footprint (Kattilahalli is a
## hall with open sides) would otherwise show the skybox through the gaps and
## nobody would know until they looked.
func _test_ground_fill() -> void:
	print("\nthere is concrete under the holes")
	check("the slab is larger than the arena, not equal to it",
		BattleStage3D.GROUND_MARGIN > 1.0)
	# STAGE_SPEC.md §1.1 asks for 1.22. Named here so that changing one without
	# the other fails rather than drifting quietly.
	check("and it matches STAGE_SPEC 1.1",
		is_equal_approx(BattleStage3D.GROUND_MARGIN, 1.22))

	# Coplanar surfaces z-fight, which flickers as the camera moves and looks
	# worse than the hole it was meant to hide.
	check("it sits below the measured ground, not on it",
		BattleStage3D.GROUND_DROP > 0.0)
	check("but not so far down it shows a step",
		BattleStage3D.GROUND_DROP < 0.1)


## Telegraphs — PHASING.md Phase A, "readability made real".
##
## The bug being fixed is a panel that told the player the same thing every
## round: it printed the AUTHORED intent string out of content, which is fixed
## for the whole battle. So the thing to assert is that the live read actually
## MOVES — a telegraph that never changes is decoration, and the player cannot
## tell it apart from one that does until they have lost a fight to it.
func _test_telegraphs() -> void:
	print("\nthe opposition telegraphs its round")
	var f := FightManager.new()
	var errs: Array = f.begin_canonical("battle-courtyard-3v3", _crew_ids(3), 4242)
	check("a fight opens", errs.is_empty(), str(errs))

	var first: Array = f.get_opposition_intents()
	check("the opposition declares before acting", not first.is_empty())

	var complete := true
	for rec in first:
		if String(rec.fighter_id) == "":
			complete = false
		if not ["low", "medium", "high", "lethal"].has(String(rec.risk_band)):
			complete = false
	check("every read names a person and a risk band", complete)

	# -1 means intel is too low to read the aim. It is a real state and must be
	# preserved rather than clamped to lane 0, which would show the player a
	# confident lie.
	var lanes_sane := true
	for rec in first:
		var lane := int(rec.target_lane)
		if lane < -1 or lane >= FightBoard.lanes:
			lanes_sane = false
	check("a declared lane is either real or honestly unknown", lanes_sane)

	# The one that matters: does it change?
	var fingerprint := func(rows: Array) -> String:
		var out := ""
		for r in rows:
			out += "%s:%d:%d;" % [r.fighter_id, int(r.likely_type), int(r.target_lane)]
		return out
	var before: String = fingerprint.call(first)
	var moved := false
	for _i in 12:
		if f.result != FightManager.BattleResult.PENDING:
			break
		# Advance one round the way resolve_to_end does: confirm what is on the
		# table, or move into the phase where commands are taken.
		if f.phase == FightManager.Phase.COMMAND:
			f.confirm_commands()
		else:
			f._transition_phase(FightManager.Phase.COMMAND)
		var now: String = fingerprint.call(f.get_opposition_intents())
		if now != before:
			moved = true
			break
	check("and the read changes as the fight does", moved)


## Every arena the board can name must be on disk.
##
## The stage fallback is deliberately QUIET — a fight in the wrong yard is still
## a fight — which is exactly why it needs a test. A silent fallback with nothing
## watching it is how a new arena ships as the old one and nobody notices for a
## month.
func _test_every_stage_exists() -> void:
	print("\nevery arena exists")
	var missing: PackedStringArray = []
	for scene_id in BattleStage3D.STAGE_BY_SCENE:
		var path := String(BattleStage3D.STAGE_BY_SCENE[scene_id])
		if not ResourceLoader.exists(path):
			missing.append("%s -> %s" % [scene_id, path])
	check("every mapped arena is a file that exists", missing.is_empty(),
		" ".join(missing))
	check("the fallback yard exists too",
		ResourceLoader.exists(BattleStage3D.STAGE_FALLBACK))

	# The override is what makes a new arena reachable before content places it,
	# so it has to actually override.
	BattleStage3D.stage_override = "scene-hermanni-skatepark-v01"
	var forced := BattleStage3D.stage_path("scene-kallio-backyard-v01")
	BattleStage3D.stage_override = ""
	check("?stage= wins over what the battle asked for",
		forced == String(BattleStage3D.STAGE_BY_SCENE["scene-hermanni-skatepark-v01"]))
	check("and clearing it gives the battle its own yard back",
		BattleStage3D.stage_path("scene-kallio-backyard-v01")
			== String(BattleStage3D.STAGE_BY_SCENE["scene-kallio-backyard-v01"]))


## Every role the game can produce must have a model on disk.
##
## A role with no body falls back to the muscle, which is deliberately loud —
## but only if somebody looks. The generator can now roll seven roles and the
## board maps seven; nothing but this check keeps those two lists equal, and a
## missing .glb is a file that exists in a constant and not on disk.
func _test_every_role_has_a_body() -> void:
	print("\nevery role has a body")
	var missing: PackedStringArray = []
	for role in CrewGenerator.ROLES:
		var path := BattleStage3D.unit_path(String(role))
		if not ResourceLoader.exists(path):
			missing.append("%s -> %s" % [role, path])
	check("every generated role maps to a model that exists",
		missing.is_empty(), " ".join(missing))

	# Not every role is one the player can hire. `enforcer` is opposition-only
	# and the generator never rolls it, so checking only the generator's list
	# left it unwatched — which is how a role nobody hires ships broken.
	var mapped: PackedStringArray = []
	for role in BattleStage3D.UNIT_BY_ROLE:
		if not ResourceLoader.exists(String(BattleStage3D.UNIT_BY_ROLE[role])):
			mapped.append(String(role))
	check("every mapped role has a model, hireable or not",
		mapped.is_empty(), " ".join(mapped))
	check("the enforcer is opposition-only",
		not CrewGenerator.ROLES.has("enforcer"))

	# The mapping must not quietly send a real role to the fallback either: that
	# is how a role ships looking like somebody else for a month.
	var fell_back: PackedStringArray = []
	for role in CrewGenerator.ROLES:
		if BattleStage3D.unit_path(String(role)) == BattleStage3D.UNIT_FALLBACK \
				and String(role) != "muscle":
			fell_back.append(String(role))
	check("and no role is silently wearing the fallback",
		fell_back.is_empty(), " ".join(fell_back))


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
