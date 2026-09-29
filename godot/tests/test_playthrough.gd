extends Node
## The ten-day chapter, played through — §9 acceptance item 4.
##
## Walks the whole authored slice: every scheduled block, every encounter
## resolved through the real model, a door taken on every free block (v4.65,
## H2), ending on the chapter turn with the Pasila ending only forecast (H8).
## Counts are read from canon: the schedule is the length of the chapter.
##
## The repo's own lesson, from eeri: "rooms.mjs proves a room's geometry;
## playthrough.cjs proves it is PLAYABLE — it exists because the prover passed
## a level nobody could finish." The spine gate proves the model; this proves
## the slice can actually be played to its end.

var _pass := 0
var _fail := 0
var _battles: Array = []


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
	bail.wait_time = 90.0
	bail.one_shot = true
	bail.timeout.connect(func():
		print("PLAYTHROUGH FAIL: timed out")
		get_tree().quit(1))
	add_child(bail)
	bail.start()

	print("── the ten-day chapter, played through ──")
	Loc.set_language("en")
	GameState.new_campaign()
	GameState.battle_requested.connect(func(bid, negotiation):
		_battles.append({"id": bid, "negotiation": negotiation}))

	_test_every_effect_is_understood()
	_test_walk_the_slice()
	_test_chapter_closes()
	_test_endings_are_reachable()

	print("\n%d passed, %d failed" % [_pass, _fail])
	if _fail > 0:
		print("PLAYTHROUGH FAIL")
		get_tree().quit(1)
	else:
		print("PLAYTHROUGH OK: all %d blocks play, every authored effect lands, the chapter closes." % ContentRegistry.schedule().size())
		get_tree().quit(0)


## Every effect string the slice can produce must be understood. An unknown verb
## only warns at runtime, which is invisible — exactly the silent-fallback shape
## this repo has been bitten by before.
func _test_every_effect_is_understood() -> void:
	print("\nthe authored effect vocabulary")
	var verbs: Dictionary = {}
	for enc in ContentRegistry.slice.get("encounters", []):
		for ch in enc.get("choices", []):
			for e in ch.get("effects", []):
				verbs[String(e).split(":")[0]] = true
	for m in ContentRegistry.slice.get("missions", []):
		for key in ["success_effects", "partial_effects", "failure_effects"]:
			for e in m.get(key, []):
				verbs[String(e).split(":")[0]] = true
	# News carries effects too. Scanning only encounters and missions is how
	# `label:` sat unimplemented while every gate stayed green.
	for n in ContentRegistry.slice.get("news", []):
		for e in n.get("effects", []):
			verbs[String(e).split(":")[0]] = true
	# And the doors (v4.65): their choices and what a door fight pays.
	for t in ContentRegistry.door_templates():
		for ch in t.get("choices", []):
			for e in ch.get("effects", []):
				verbs[String(e).split(":")[0]] = true
		if PiritoriDoors.can_fight(t):
			for key in ["win", "lose"]:
				for e in t["fight"].get(key, []):
					verbs[String(e).split(":")[0]] = true

	var known := [
		"cash", "markka", "debt", "intel", "capacity", "exit_fund", "exit-fund",
		"stock", "reveal", "flag", "relationship", "pressure", "market-history",
		"debt-holder-memory", "city-harm", "equipment", "recruit",
		"recruit-temporary", "complete", "partial", "fail", "convert-markka",
		"obligation", "memory", "service", "crew-outcome",
		"resolve-critical-wound", "start-battle", "start-negotiation",
		"battle-on-failure", "battle", "opponent-nerve", "resolve",
		"resolve-ending", "mccormick-family", "label",
		"forecast-ending", "chapter-ending",
	]
	var unknown: Array = []
	for v in verbs:
		if not known.has(v):
			unknown.append(v)
	check("every verb the slice uses is implemented", unknown.is_empty(), str(unknown))
	print("        %d distinct verbs across the slice" % verbs.size())


## Play the schedule: at each block, resolve that block's encounter by taking
## the first choice whose requirements are met. A free block takes the first
## door on its board, which then IS the block's encounter.
func _test_walk_the_slice() -> void:
	print("\nwalking all %d blocks" % GameState.total_blocks)
	var played := 0
	var doors := 0
	var journeys := 0
	var skipped: Array = []

	for i in range(GameState.total_blocks):
		if GameState.is_slice_complete():
			break
		if PiritoriDoors.is_door_block() and PiritoriDoors.taken_at().is_empty():
			var offers := PiritoriDoors.offer_doors()
			check("day %d %s: a free block offers 2-3 doors" % [GameState.day, GameState.current_block()],
				offers.size() >= 2 and offers.size() <= 3, str(offers))
			if not offers.is_empty() and bool(PiritoriDoors.take_door(String(offers[0]["template"])).get("ok", false)):
				doors += 1
		var entry := GameState.current_schedule()
		if entry.is_empty():
			GameState.advance_block()
			continue
		var eid := String(entry.get("encounter_id", ""))
		var enc := ContentRegistry.encounter(eid)
		if enc.is_empty():
			skipped.append(eid)
			GameState.advance_block()
			continue

		check("day %d %s: %s is available" % [
			GameState.day, GameState.current_block(), eid],
			GameState.is_encounter_available(eid))

		# M2: the schedule moves the LEAD; Aatami walks there himself.
		var lead := GameState.story_lead_id()
		if GameState.current_anchor_id != lead:
			var plan := GameState.preview_journey(lead)
			check("  %s is reachable from %s" % [lead, GameState.current_anchor_id],
				bool(plan.get("ok", false)), str(plan))
			var cash := GameState.cash_eur
			var block := GameState.block_index
			var went := GameState.commit_journey(plan)
			check("  and the journey costs no money or block",
				bool(went.get("ok", false)) and GameState.cash_eur == cash and GameState.block_index == block)
			journeys += 1
		eq("  Aatami stands at the lead", GameState.current_anchor_id, lead)

		var took := ""
		for ch in enc.get("choices", []):
			if GameState.meets_all(ch.get("requirements", [])):
				took = String(ch.get("id", ""))
				break
		if took == "":
			skipped.append(eid + " (no affordable choice)")
			GameState.advance_block()
			continue
		if GameState.resolve_encounter(eid, took):
			played += 1
		else:
			skipped.append(eid + " (refused)")
			GameState.advance_block()

	check("no block was unplayable", skipped.is_empty(), str(skipped))
	eq("every scheduled block resolved", played, ContentRegistry.schedule().size())
	eq("  a door taken on every free block", doors,
		ContentRegistry.schedule().filter(func(e): return bool(e.get("door", false))).size())
	check("the walk travelled explicitly (%d journeys)" % journeys, journeys >= 8)
	check("the slice reports itself complete", GameState.is_slice_complete())
	print("        cash €%d · debt €%d · crew %d · missions %d · memories %d" % [
		GameState.cash_eur, GameState.debt_eur, GameState.surviving_crew(),
		GameState.mission_state.size(), GameState.memories.size()])
	print("        battles requested: %s" % str(_battles.map(func(b): return b["id"])))


## v4.65 (H1/H8): the chapter closes on the shipment night — run, or the boat
## leaving without you — and the game does not end. Day 7 only pointed at
## Pasila; the four endings are the era's result.
func _test_chapter_closes() -> void:
	print("\nthe chapter closes; the game does not end")
	check("the chapter is cleared", GameState.chapter_cleared)
	check("  on an outcome the screen can render",
		["clean", "messy", "lost", "missed"].has(GameState.last_ending_outcome), GameState.last_ending_outcome)
	check("  and the city remembers how", Array(GameState.memories).has(
		"chapter-cleared:%d:%s" % [GameState.chapter, GameState.last_ending_outcome]))
	eq("no ending resolved", GameState.ending_id, "")
	var forecast := ""
	for m in GameState.memories:
		if String(m).begins_with("pasila-forecast:"):
			forecast = String(m).substr(16)
	check("day 7 left a look ahead at Pasila", forecast != "", str(GameState.memories))
	var e := GameState.forecast_ending()
	check("the road points at an authored ending", not e.is_empty() and String(e.get("summary", "")) != "")
	if not e.is_empty():
		print("        where the road points: %s — %s" % [e.get("id", ""), e.get("label", "")])


## Each authored ending must be where SOME road points, or it is dead content.
func _test_endings_are_reachable() -> void:
	print("\nevery authored ending is where some road points")
	var endings: Array = ContentRegistry.slice.get("endings", [])
	check("the slice authors endings", endings.size() > 0)
	for e in endings:
		GameState.new_campaign()
		# Put the run into the shape this ending asks for, then confirm the
		# forecast actually picks it.
		for req in e.get("requirements", []):
			_force(String(req))
		var got := String(GameState.forecast_ending().get("id", ""))
		check("  %s is reachable" % e.get("id", ""), got == String(e.get("id", "")),
			"(the forecast chose '%s')" % got)

	# pasila-haunted has exactly one authored path: battle-courtyard-3v3 says
	# "Only an unresolved, clearly flagged critical wound at the final
	# settlement can become death." Prove the settlement honours both halves.
	GameState.new_campaign()
	GameState.apply_effect("recruit:crew-slot-runner")
	GameState.apply_effect("crew-outcome:critical-wound-possible")
	check("a critical wound is visible before the end",
		GameState.open_critical_wounds() == 1)
	for i in range(GameState.total_blocks):
		GameState.advance_block()
	eq("an UNRESOLVED critical wound becomes a death at settlement",
		GameState.crew_deaths, 1)

	GameState.new_campaign()
	GameState.apply_effect("recruit:crew-slot-runner")
	GameState.apply_effect("crew-outcome:critical-wound-possible")
	GameState.apply_effect("resolve-critical-wound:one")
	check("treating it clears the risk", GameState.open_critical_wounds() == 0)
	for i in range(GameState.total_blocks):
		GameState.advance_block()
	eq("a RESOLVED critical wound kills nobody", GameState.crew_deaths, 0)


## Bend the model to satisfy one requirement string, for reachability testing.
func _force(req: String) -> void:
	var s := req.strip_edges()
	for op in [">=", "<=", ">", "<", "=="]:
		var idx := s.find(op)
		if idx <= 0:
			continue
		var lhs := s.substr(0, idx).strip_edges()
		var rhs := int(s.substr(idx + op.length()).strip_edges())
		var want := rhs
		if op == ">":
			want = rhs + 1
		elif op == "<":
			want = maxi(rhs - 1, 0)
		match lhs:
			"exit-fund", "exit_fund": GameState.exit_fund_eur = want
			"debt": GameState.debt_eur = want
			"cash": GameState.cash_eur = want
			"surviving-crew":
				GameState.roster = PackedStringArray()
				for c in ContentRegistry.slice.get("crew", []):
					if GameState.roster.size() >= want:
						break
					GameState.roster.append(String(c.get("id", "")))
			"crew-deaths":
				GameState.crew_deaths = want
		return
