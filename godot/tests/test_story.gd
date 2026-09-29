extends Node
## The city's new rules — the road (v4.58), sound (v4.59), Toko's counter and
## the board (v4.60/v4.61), the Thursday Load (v4.62), Kello's cut (v4.63),
## the chapter turn (v4.64), the ten-day chapter of spine and doors (v4.65) and
## Aatami fighting first, then the crew (v4.66) — against the web.
##
## Run: godot --headless --path . res://tests/test_story.tscn
##
## THE REFERENCE IS THE WEB BUILD ITSELF. `tests/fixtures/web-reference.json`
## is written by `tools/web-reference.mjs`, which runs web/js/v3's own road,
## board and Toko modules; CI regenerates it with `--check`. So "the same road"
## and "the same price" here mean the same numbers, journey by journey and cent
## by cent, not a port that looks about right.
##
## Debug hooks set up FIXTURES only (a block index, a pending event, a flag):
## every rule under test is exercised through the model's own functions.

const FIXTURE := "res://tests/fixtures/web-reference.json"

var _pass := 0
var _fail := 0
var _ref: Dictionary = {}


func check(label: String, condition: bool, detail: String = "") -> void:
	if condition:
		_pass += 1
		print("  ok    %s" % label)
	else:
		_fail += 1
		print("  FAIL  %s %s" % [label, detail])


func eq(label: String, a: Variant, b: Variant) -> void:
	check(label, a == b, "(got %s, want %s)" % [a, b])


func _ready() -> void:
	var bail := Timer.new()
	bail.wait_time = 60.0
	bail.one_shot = true
	bail.timeout.connect(func():
		print("STORY FAIL: timed out")
		get_tree().quit(1))
	add_child(bail)
	bail.start()

	print("── the road, the counter, the story ──")
	Loc.set_language("en")
	var parsed: Variant = JSON.parse_string(FileAccess.get_file_as_string(FIXTURE))
	check("the web reference fixture loads", typeof(parsed) == TYPE_DICTIONARY, FIXTURE)
	if typeof(parsed) == TYPE_DICTIONARY:
		_ref = parsed

	_test_content()
	_test_requirement_grammar()
	_test_the_roll_is_the_webs()
	_test_the_road_is_the_webs()
	_test_road_rules()
	_test_board_is_the_webs()
	_test_toko()
	_test_visits()
	_test_story()
	_test_every_clue_is_earned()
	_test_mission_battles_settle()
	_test_the_cut()
	_test_the_cut_is_the_webs()
	_test_chapter_turn()
	_test_chapter_turn_follows_the_data()
	# v4.65, mirroring web/test/doors.mjs.
	_test_doors_canon()
	_test_door_offers_are_the_webs()
	_test_doors_taken_once_are_the_webs()
	_test_door_rules()
	_test_two_fights_a_day()
	_test_escalation_is_the_webs()
	_test_bad_deals_escalate()
	_test_spine_beats_and_the_look_ahead()
	_test_the_chapter_walk_is_the_webs()
	# v4.66, mirroring web/test/aatami.mjs.
	_test_aatami_fights_first()
	_test_the_lineup_is_the_webs()
	_test_sound()
	_test_arrival_lines()

	print("\n%d passed, %d failed" % [_pass, _fail])
	if _fail > 0:
		print("STORY FAIL")
		get_tree().quit(1)
	else:
		print("STORY OK: the road, the board and the case match the web; sound and the arrival hold.")
		get_tree().quit(0)


func _fresh() -> void:
	GameState.new_campaign()


# ── content ────────────────────────────────────────────────────────────────

func _test_content() -> void:
	print("\ncanon arrives through sync")
	check("no registry errors", ContentRegistry.errors.is_empty(), str(ContentRegistry.errors))
	check("at least the nineteen v4.58 road events", ContentRegistry.road_events().size() >= 19, str(ContentRegistry.road_events().size()))
	check("the story-triggered event arrives through canon (the road skips it: the 34 journeys below match the web)", ContentRegistry.road_events().any(func(e): return e.has("trigger")))
	eq("nothing fires before story block 2", int(ContentRegistry.road_rules().get("first_story_block", 0)), 2)
	check("the story has at least eight clues", ContentRegistry.story_clues().size() >= 8, str(ContentRegistry.story_clues().size()))
	eq("three of them are key",
		ContentRegistry.story_clues().filter(func(c): return bool(c.get("key", false))).size(), 3)
	eq("the case waits at Piritori", String(ContentRegistry.story_case().get("anchor_id", "")), "piritori")
	eq("it opens on two key clues", PiritoriStory.key_clues_needed(), 2)
	eq("three optional visits", ContentRegistry.visits().size(), 3)
	check("Tokon Ramen is on Vaasankatu (v4.61)",
		String(ContentRegistry.site("toko_slomo_noodles").get("anchorId", "")) == PiritoriToko.ANCHOR)
	check("the Jade Lantern front is at Hakaniemi (v4.62, G1)",
		String(ContentRegistry.site(String(ContentRegistry.encounter("enc-jade-window").get("site_id", ""))).get("anchorId", "")) == "hakaniemi")
	var every_minutes := true
	for e in ContentRegistry.road_events():
		for ch in e.get("choices", []):
			if not (ch as Dictionary).has("minutes"):
				every_minutes = false
	check("every road choice states its minutes", every_minutes)


# ── the requirement grammar (web `requirementStatus`) ─────────────────────

func _test_requirement_grammar() -> void:
	print("\nthe requirement grammar is the web's")
	_fresh()
	check("flag: reads a flag", not GameState.meets_requirement("flag:toko-van-pattern"))
	GameState.apply_effect("flag:toko-van-pattern")
	check("  and is met once set — Name the empty van can be taken",
		GameState.meets_requirement("flag:toko-van-pattern"))
	check("relationship: reads a standing (Toko starts at 1)",
		GameState.meets_requirement("relationship:toko>=1")
		and not GameState.meets_requirement("relationship:toko>=2"))
	check("obligation: reads what is owed",
		not GameState.meets_requirement("obligation:mccormick_family>=1"))
	GameState.apply_effect("obligation:mccormick_family:+1")
	check("  and counts once owed", GameState.meets_requirement("obligation:mccormick_family>=1"))
	var st := GameState.requirement_status("deployed-crew>=2")
	check("deployed-crew counts who goes out", not bool(st["ok"]) and st["kind"] == "deployed-crew"
		and int(st["want"]) == 2, str(st))
	GameState.apply_effect("recruit:crew-slot-runner")
	GameState.apply_effect("recruit:crew-slot-watcher")
	check("  two recruited: met", GameState.meets_requirement("deployed-crew>=2"))
	check("crew-role: asks who is deployed",
		GameState.meets_requirement("crew-role:runner") and not GameState.meets_requirement("crew-role:fixer"))
	check("stock: reads a pack", not GameState.meets_requirement("stock:piri>=1"))
	check("memory: counts as a flag for a clue", not GameState.has_flag("memory:saw-the-tram"))
	GameState.apply_effect("memory:saw-the-tram")
	check("  and is found once remembered", GameState.has_flag("memory:saw-the-tram"))


# ── the roll and the road, against the web ─────────────────────────────────

func _test_the_roll_is_the_webs() -> void:
	print("\nthe roll is FNV-1a, bit for bit the web's")
	_fresh()
	for r in _ref.get("rolls", []):
		GameState.block_index = int(r["block"])
		var got := GameState.deterministic_roll(String(r["label"]))
		check("block %d, %s → %.12f" % [int(r["block"]), r["label"], float(r["value"])],
			absf(got - float(r["value"])) < 1e-12, "got %.15f" % got)


func _test_the_road_is_the_webs() -> void:
	print("\nthe road, journey by journey, is the web's")
	_fresh()
	var journey := {"path": PackedStringArray(["piritori", "siltasaari"]), "destination": "siltasaari"}
	var i := 0
	var fired := 0
	var mismatches: Array = []
	for want in _ref.get("road", []):
		# Setup only: the block the web walked at, and the recruit it made.
		if i == 2:
			GameState.block_index = 2
		if i == 18:
			GameState.block_index = 7
			GameState.day = 4
			GameState.roster.append("crew-slot-runner")
		var ev := PiritoriRoad.roll(journey)
		var got := {"journeys": int(GameState.road["journeys"]), "since": int(GameState.road["since"]),
			"event": String(ev.get("id", "")), "phase": String(PiritoriRoad.pending().get("phase", "")) if not ev.is_empty() else ""}
		if not ev.is_empty():
			fired += 1
			var pick := ""
			for c in ev.get("choices", []):
				if bool(PiritoriRoad.choice_status(c)["ok"]):
					pick = String(c["id"])
					break
			var res := PiritoriRoad.resolve(pick)
			got.merge({"choice": pick, "minutes": int(GameState.road["minutes"]),
				"clock": PiritoriRoad.clock_label(), "cash": GameState.cash_eur})
			if not bool(res.get("ok", false)):
				mismatches.append("journey %d: resolve refused" % i)
		for k in got:
			if not (want as Dictionary).has(k):
				continue
			var w = want[k]
			var same: bool = (int(w) == int(got[k])) if typeof(w) == TYPE_FLOAT else (String(w) == String(got[k]))
			if not same:
				mismatches.append("journey %d %s: got %s want %s" % [i, k, got[k], w])
		i += 1
	check("all %d journeys match the web (%d events)" % [i, fired], mismatches.is_empty(), str(mismatches.slice(0, 6)))
	eq("the same events seen, in the same order", Array(GameState.road["seen"]),
		Array(_ref.get("road_seen", [])))


func _test_road_rules() -> void:
	print("\nthe road's rules")
	_fresh()
	var journey := {"path": PackedStringArray(["piritori", "siltasaari"]), "destination": "siltasaari"}
	for n in 6:
		PiritoriRoad.roll(journey)
	check("nothing fires before story block 2, however far Aatami walks",
		PiritoriRoad.pending_event().is_empty() and int(GameState.road["since"]) == 0)
	GameState.block_index = 2
	GameState.road["since"] = 3
	var block := GameState.block_index
	var cash := GameState.cash_eur
	var ev := PiritoriRoad.roll(journey)
	check("the fourth journey since the last always fires", not ev.is_empty())
	check("  a roll turns no block and spends nothing",
		GameState.block_index == block and GameState.cash_eur == cash)
	var journeys := int(GameState.road["journeys"])
	check("one at a time: nothing stacks while one waits",
		PiritoriRoad.roll(journey).is_empty() and int(GameState.road["journeys"]) == journeys)

	# A save made with the event waiting comes back with it waiting.
	var saved := GameState.to_dict()
	var text := JSON.stringify(saved)
	GameState.new_campaign()
	GameState.from_dict(JSON.parse_string(text))
	eq("a pending event survives a reload", String(PiritoriRoad.pending_event().get("id", "")), String(ev["id"]))

	# Refused, never hidden.
	GameState.road["pending"] = {"id": "road-underpass", "phase": "transit", "from": "piritori", "to": "harju"}
	var stand: Dictionary = {}
	for c in PiritoriRoad.pending_event()["choices"]:
		if String(c["id"]) == "stand":
			stand = c
	var st := PiritoriRoad.choice_status(stand)
	# v4.66: a fight needs two who can fight; alone, Aatami is one.
	check("standing your ground needs two who can fight, and says so",
		not bool(st["ok"]) and String(st["failed"][0]["kind"]) == "fighters"
		and int(st["failed"][0]["have"]) == 1)
	eq("a refused choice is refused by the model too", PiritoriRoad.resolve("stand").get("reason", ""), "refused")
	var clock_before := PiritoriRoad.clock_label()
	var res := PiritoriRoad.resolve("pay")
	check("paying them off answers it", bool(res["ok"]) and PiritoriRoad.pending_event().is_empty())
	eq("  for €20", GameState.cash_eur, cash - 20)
	eq("  ten minutes on this block's clock", PiritoriRoad.minutes_this_block(), 10)
	check("  and the clock reads later (DAY · 10:10)", clock_before == "" and PiritoriRoad.clock_label() == "10:10",
		PiritoriRoad.clock_label())
	eq("  it never turns the block", GameState.block_index, block)
	check("  seen once: it will not come back", (GameState.road["seen"] as Array).has("road-underpass"))
	GameState.advance_block()
	check("minutes belong to their block: the next one starts on the hour",
		PiritoriRoad.minutes_this_block() == 0 and PiritoriRoad.clock_label() == "")

	# A road fight: the ordinary battle, no block advance.
	GameState.apply_effect("recruit:crew-slot-runner")
	GameState.apply_effect("recruit:crew-slot-watcher")
	GameState.road["pending"] = {"id": "road-underpass", "phase": "transit", "from": "piritori", "to": "harju"}
	(GameState.road["seen"] as Array).erase("road-underpass")
	var asked: Array = []
	var cb := func(bid, _neg): asked.append(bid)
	GameState.battle_requested.connect(cb)
	block = GameState.block_index
	var fight := PiritoriRoad.resolve("stand")
	GameState.battle_requested.disconnect(cb)
	eq("with two crew, standing becomes a fight", String(fight.get("start_battle", "")), "battle-karhupuisto-2v2")
	check("  the shell opens it as a ROAD fight — the model asks no mission battle", asked.is_empty())
	eq("  and the block does not turn", GameState.block_index, block)
	check("  the road is answered before the fight begins", PiritoriRoad.pending_event().is_empty())


func _test_board_is_the_webs() -> void:
	print("\nthe board prices a place as the web does")
	_fresh()
	GameState.current_anchor_id = PiritoriToko.ANCHOR
	GameState.seen = {"piritori": 0, "vaasankatu": 0}
	var rows := PiritoriBoard.rows()
	var want: Array = _ref.get("board", [])
	eq("the same places, in the same order", rows.map(func(r): return r["id"]),
		want.map(func(r): return r["id"]))
	var bad: Array = []
	for k in mini(rows.size(), want.size()):
		var g: Dictionary = rows[k]
		var w: Dictionary = want[k]
		if String(g["shown"]["level"]) != String(w["level"]) \
				or not is_equal_approx(float(g["truth"]["buy"]), float(w["buy"])) \
				or not is_equal_approx(float(g["truth"]["sell"]), float(w["sell"])):
			bad.append("%s: %s %.2f/%.2f vs %s %.2f/%.2f" % [g["id"], g["shown"]["level"],
				g["truth"]["buy"], g["truth"]["sell"], w["level"], w["buy"], w["sell"]])
	check("every price and level to the cent", bad.is_empty(), str(bad))
	eq("Toko's tip is the web's", String(PiritoriToko.tip().get("id", "")), String(_ref.get("tip", "")))


func _test_toko() -> void:
	print("\nToko's counter (v4.60/v4.61)")
	_fresh()
	eq("no bowl from Piritori", PiritoriToko.bowl_blocker(), "not-here")
	GameState.current_anchor_id = PiritoriToko.ANCHOR
	GameState.seen = {"piritori": 0, "vaasankatu": 0}
	eq("open on day one at Vaasankatu", PiritoriToko.bowl_blocker(), "")
	var before := JSON.stringify(PiritoriBoard.rows().map(func(r): return [r["id"], r["shown"]["level"]]))
	var tip := PiritoriToko.tip()
	check("asking what he would say changes nothing",
		JSON.stringify(PiritoriBoard.rows().map(func(r): return [r["id"], r["shown"]["level"]])) == before)
	var cash := GameState.cash_eur
	var got := PiritoriToko.buy_bowl()
	check("a bowl buys that tip", bool(got["ok"]) and String(got["anchor_id"]) == String(tip["id"]))
	eq("  for €6", GameState.cash_eur, cash - PiritoriToko.BOWL_EUR)
	eq("  saved as heard[anchor] = block", int(GameState.heard.get(String(tip["id"]), -1)), GameState.block_index)
	eq("  and tokoBowlAt", GameState.toko_bowl_at, GameState.block_index)
	var row := PiritoriBoard.row(String(tip["id"]))
	var h: Dictionary = _ref.get("heard", {})
	check("the board shows a RANGE, heard from Toko, not a visit",
		String(row["shown"]["level"]) == "range" and bool(row["heard"]) and not bool(row["visited"]))
	check("  the band is the web's to the cent",
		is_equal_approx(float(row["shown"]["low_sell"]), float(h.get("low_sell", -1)))
		and is_equal_approx(float(row["shown"]["high_sell"]), float(h.get("high_sell", -1)))
		and is_equal_approx(float(row["shown"]["low_buy"]), float(h.get("low_buy", -1)))
		and is_equal_approx(float(row["shown"]["high_buy"]), float(h.get("high_buy", -1))),
		"%s vs %s" % [row["shown"], h])
	check("  and it holds the true price",
		float(row["shown"]["low_sell"]) <= float(row["truth"]["sell"])
		and float(row["truth"]["sell"]) <= float(row["shown"]["high_sell"]))
	check("hearing is not seeing: the place is not marked visited", not GameState.seen.has(String(tip["id"])))
	eq("one bowl a block", PiritoriToko.buy_bowl().get("reason", ""), "already-this-block")
	var reload := JSON.stringify(GameState.to_dict())
	GameState.new_campaign()
	GameState.from_dict(JSON.parse_string(reload))
	eq("what he said survives a reload", String(PiritoriBoard.row(String(tip["id"]))["shown"]["level"]), "range")
	GameState.block_index += 1
	eq("the next block he talks about somewhere else, the web's", String(PiritoriToko.buy_bowl().get("anchor_id", "")),
		String(_ref.get("second_tip", "")))
	GameState.block_index += 5
	eq("what he said ages to a rumour", String(PiritoriBoard.row(String(tip["id"]))["shown"]["level"]),
		String(_ref.get("after_six", "")))
	GameState.block_index += 10
	eq("and to nothing, as the place was never visited",
		String(PiritoriBoard.row(String(tip["id"]))["shown"]["level"]), String(_ref.get("after_sixteen", "")))

	_fresh()
	GameState.current_anchor_id = PiritoriToko.ANCHOR
	GameState.cash_eur = 5
	eq("no money, no bowl", PiritoriToko.bowl_blocker(), "cash")
	check("  and nothing spent", not bool(PiritoriToko.buy_bowl()["ok"]) and GameState.cash_eur == 5)

	var w := PiritoriToko.weapons()
	check("he sells early weapons (%s)" % ", ".join(w), w.size() >= 3)
	var gun := false
	for id in w:
		if String(ContentRegistry.slice["equipment"].filter(func(e): return e["id"] == id)[0].get("hold", "")).contains("firearm"):
			gun = true
	check("  never a gun — the first handgun is the street seller's", not gun and not w.has("first-handgun"))
	_fresh()
	eq("not from Piritori", PiritoriToko.buy_weapon(w[0]).get("reason", ""), "not-here")
	GameState.current_anchor_id = PiritoriToko.ANCHOR
	var c0 := GameState.cash_eur
	var n0 := GameState.equipment.size()
	var bought := PiritoriToko.buy_weapon(w[0])
	check("at Vaasankatu a weapon costs the street price and is carried",
		bool(bought["ok"]) and GameState.cash_eur == c0 - GameState.buy_of(w[0]) and GameState.equipment.size() == n0 + 1)
	eq("he will not sell the handgun", PiritoriToko.buy_weapon("first-handgun").get("reason", ""), "not-sold-here")
	GameState.current_anchor_id = "piritori"
	check("the street seller at Piritori keeps the gear and the fence",
		GameState.can_shop_here() and GameState.can_fence_here() and GameState.is_purchasable("first-handgun"))


func _test_visits() -> void:
	print("\nBrahenkenttä, Thursday (v4.62, G3)")
	_fresh()
	GameState.current_anchor_id = "harju"
	check("no visit before Toko's night", PiritoriVisits.available().is_empty())
	GameState.resolved_encounters["enc-toko-quiet-voice"] = "eat-and-listen"
	var ids: Array = PiritoriVisits.available().map(func(v): return v["id"])
	check("after it, the Harju visit is open at Harju", ids.has("visit-harju-thursday"), str(ids))
	eq("  watching the tram needs one crew member",
		PiritoriVisits.resolve("visit-harju-thursday", "watch-the-tram").get("reason", ""), "refused")
	GameState.apply_effect("recruit:crew-slot-runner")
	var block := GameState.block_index
	check("with someone to watch the vans, Aatami watches the tram",
		bool(PiritoriVisits.resolve("visit-harju-thursday", "watch-the-tram")["ok"]))
	check("  and the load rides the 3: a KEY clue", GameState.has_flag("memory:saw-the-tram"))
	eq("  a visit never turns the block", GameState.block_index, block)
	check("  answered once", not PiritoriVisits.is_available("visit-harju-thursday"))


func _test_story() -> void:
	print("\nthe Thursday Load (v4.62)")
	_fresh()
	eq("no clue on day one", PiritoriStory.found_count(), 0)
	eq("the case is not known", PiritoriStory.case_blocker(), "not-enough")
	GameState.resolve_encounter("enc-first-purchase", "ask-control")
	check("asking who keeps watching names Kello (G2)",
		PiritoriStory.case_board().filter(func(c): return c["id"] == "kello-named")[0]["is_found"])
	eq("  a clue is not a KEY clue", PiritoriStory.key_clues_found(), 0)
	GameState.apply_effect("flag:mccormicks-know-skim")
	eq("one key clue is not enough", PiritoriStory.case_blocker(), "not-enough")
	GameState.apply_effect("flag:kello-receipts")
	check("two key clues: the case is known wherever Aatami is", PiritoriStory.case_known())
	GameState.current_anchor_id = "siltasaari"
	eq("  but it is answered at Piritori", PiritoriStory.case_blocker(), "not-here")
	GameState.current_anchor_id = "piritori"
	eq("  and at Piritori it opens", PiritoriStory.case_blocker(), "")
	var block := GameState.block_index
	var cash := GameState.cash_eur
	var rel := int(GameState.relationships.get("mccormick_family", 0))
	var res := PiritoriStory.resolve_case("sell-kello")
	check("selling Kello to the McCormicks", bool(res["ok"]))
	eq("  +€250", GameState.cash_eur, cash + 250)
	eq("  McCormick +2", int(GameState.relationships.get("mccormick_family", 0)), rel + 2)
	eq("  it never turns the block", GameState.block_index, block)
	eq("  answered once", PiritoriStory.case_blocker(), "resolved")
	eq("  a second answer is refused", PiritoriStory.resolve_case("tell-toko").get("reason", ""), "resolved")

	for m in ContentRegistry.slice.get("missions", []):
		var b := PiritoriStory.briefing(String(m["id"]))
		check("%s is briefed: premise, %d real steps, stakes, plant" % [b.get("title", "?"), (b.get("steps", []) as Array).size()],
			String(b.get("premise", "")) != "" and not (b.get("steps", []) as Array).is_empty()
			and not (b.get("success", []) as Array).is_empty() and String(b.get("plants", "")) != "")
	_fresh()
	eq("The Paper Bag is open on day one (its scene is next)", PiritoriStory.mission_status("mission-paper-bag"), "open")
	eq("The Courtyard Receipts is a title until someone tells you",
		PiritoriStory.mission_status("mission-courtyard-receipts"), "not-yet")
	var words := PiritoriStory.effect_words(ContentRegistry.mission("mission-courtyard-receipts")["success_effects"])
	check("stakes are said in words, from the mission's own effects", words.contains("+€120"), words)


## Every clue must be EARNED by some real effect somewhere in the game — an
## encounter, a visit, a mission's result, a road event — or the board promises
## something nobody can do (web `story.mjs`).
func _test_every_clue_is_earned() -> void:
	print("\nevery clue is earned by a real choice")
	var effects: Dictionary = {}
	var add := func(list: Array):
		for fx in list:
			effects[String(fx)] = true
	for e in ContentRegistry.slice.get("encounters", []):
		for ch in e.get("choices", []):
			add.call(ch.get("effects", []))
	for v in ContentRegistry.visits():
		for ch in v.get("choices", []):
			add.call(ch.get("effects", []))
	for m in ContentRegistry.slice.get("missions", []):
		for k in ["success_effects", "partial_effects"]:
			add.call(m.get(k, []))
	for e in ContentRegistry.road_events():
		for ch in e.get("choices", []):
			add.call(ch.get("effects", []))
	for c in ContentRegistry.story_clues():
		var flag := String(c["flag"])
		var effect := flag if flag.begins_with("memory:") else "flag:" + flag
		check("%s ← %s" % [c["id"], effect], effects.has(effect))


## A mission's fight pays that mission's own effects, once; a road fight never
## reaches a mission. Without this Kello's handwriting could not be found.
func _test_mission_battles_settle() -> void:
	print("\na mission's fight settles the mission (web `resultEffects`)")
	_fresh()
	var fund := GameState.exit_fund_eur
	eq("the courtyard fight, won, settles The Courtyard Receipts",
		GameState.settle_mission_battle("battle-courtyard-3v3", "win"), "mission-courtyard-receipts")
	eq("  +€120 to the exit fund", GameState.exit_fund_eur, fund + 120)
	check("  and Kello's handwriting is found (a KEY clue)", GameState.has_flag("kello-receipts"))
	eq("  the mission reads complete", String(GameState.mission_state.get("mission-courtyard-receipts", "")), "complete")
	eq("  a second fight pays nothing", GameState.settle_mission_battle("battle-courtyard-3v3", "win"), "")
	eq("  and moves nothing", GameState.exit_fund_eur, fund + 120)
	_fresh()
	GameState.settle_mission_battle("battle-courtyard-3v3", "partial")
	check("partly settled still keeps the receipts",
		GameState.has_flag("kello-receipts") and GameState.exit_fund_eur == 60)
	_fresh()
	GameState.settle_mission_battle("battle-karhupuisto-2v2", "loss")
	eq("a lost bear path is a failed mission", String(GameState.mission_state.get("mission-bear-path", "")), "failed")
	_fresh()
	GameState.apply_effect("complete:mission-bear-path")
	var cash := GameState.cash_eur
	GameState.settle_mission_battle("battle-karhupuisto-2v2", "win")
	eq("a mission already settled by its scene is not paid twice", GameState.cash_eur, cash)
	eq("a battle no mission names settles nothing", GameState.settle_mission_battle("battle-hermanni-training", "win"), "")


## Kello's cut (v4.63, web `story.mjs`): pays each night, and the risk grows.
func _test_the_cut() -> void:
	print("\nKello's cut (v4.63)")
	var cut: Dictionary = ContentRegistry.story_case().get("cut", {})
	var nightly := int(cut.get("nightly_eur", -1))
	var event_id := String(cut.get("found_out_event", ""))
	check("canon: the cut pays nightly and names its found-out event",
		nightly > 0 and not ContentRegistry.road_event(event_id).is_empty(), str(cut))
	check("  and that event belongs to the story", ContentRegistry.road_event(event_id).has("trigger"))
	_fresh()
	eq("no cut, no pay", int(PiritoriStory.settle_cut()["paid"]), 0)
	# Setup: the two key clues, standing at the case.
	GameState.apply_effect("flag:mccormicks-know-skim")
	GameState.apply_effect("flag:kello-receipts")
	GameState.current_anchor_id = String(ContentRegistry.story_case().get("anchor_id", ""))
	var before := JSON.stringify(GameState.to_dict())
	check("taking the cut starts it",
		bool(PiritoriStory.resolve_case("take-a-cut")["ok"]) and GameState.has_flag("thursday-cut"))
	var cash := GameState.cash_eur
	var first := PiritoriStory.settle_cut()
	check("the first night pays €%d and is safe" % nightly,
		int(first["paid"]) == nightly and GameState.cash_eur == cash + nightly and not bool(first["found_out"]))
	var found := _found_on()
	check("sooner or later a family finds out (payment %d)" % found, found > 0)
	GameState.from_dict(JSON.parse_string(before))
	PiritoriStory.resolve_case("take-a-cut")
	PiritoriStory.settle_cut()
	eq("the same save finds out on the same payment", _found_on(), found)

	# The found-out event is raised by the story and waits on the road.
	check("the story raises the event", PiritoriRoad.force(event_id, "piritori"))
	eq("  it waits on the road screen", String(PiritoriRoad.pending_event().get("id", "")), event_id)
	check("  one at a time: a second raise is refused", not PiritoriRoad.force(event_id, "piritori"))
	var raised := JSON.stringify(GameState.to_dict())
	GameState.cash_eur = 500
	check("paying them off ends the cut",
		bool(PiritoriRoad.resolve("pay")["ok"]) and GameState.has_flag("cut-ended"))
	eq("  an ended cut pays nothing", int(PiritoriStory.settle_cut()["paid"]), 0)
	check("  a seen event is not raised twice", not PiritoriRoad.force(event_id, "piritori"))
	GameState.from_dict(JSON.parse_string(raised))
	check("giving them Kello ends it too", bool(PiritoriRoad.resolve("give-kello")["ok"])
		and GameState.has_flag("kello-sold") and GameState.has_flag("cut-ended"))

	# The night's end is where it settles: through the clock, not by hand.
	_fresh()
	GameState.apply_effect("flag:thursday-cut")
	cash = GameState.cash_eur
	GameState.advance_block()
	eq("a day's end pays nothing", GameState.cash_eur, cash)
	GameState.advance_block()
	eq("a night's end pays the cut", int(GameState.cut.get("payments", 0)), 1)
	eq("  and marks the block it landed in, for the rail", GameState.cut_paid_block, GameState.block_index)
	var reload := JSON.stringify(GameState.to_dict())
	GameState.new_campaign()
	GameState.from_dict(JSON.parse_string(reload))
	eq("  the count survives a reload, under the web's key", int(GameState.cut.get("payments", 0)), 1)
	var raised_at := -1
	while not GameState.is_slice_complete() and raised_at < 0:
		GameState.advance_block()
		if String(PiritoriRoad.pending_event().get("id", "")) == event_id:
			raised_at = GameState.block_index
	var want_at := -1
	for row in _ref.get("cut", []):
		if bool(row["found_out"]) and want_at < 0:
			want_at = int(row["block"])
	eq("found out at a night's end, the event waits — on the web's block", raised_at, want_at)
	var payments := int(GameState.cut.get("payments", 0))
	GameState.advance_block()
	GameState.advance_block()
	eq("  while it waits the cut still pays", int(GameState.cut.get("payments", 0)), payments + 1)
	eq("  and nothing else is raised over it", String(PiritoriRoad.pending_event().get("id", "")), event_id)

	# A triggered event never rolls on the road, however long Aatami walks.
	_fresh()
	GameState.block_index = 8
	GameState.apply_effect("flag:thursday-cut")
	var seen: Array = []
	var journey := {"path": PackedStringArray(["piritori", "siltasaari"]), "destination": "siltasaari"}
	for i in 80:
		var ev := PiritoriRoad.roll(journey)
		if ev.is_empty():
			continue
		seen.append(String(ev["id"]))
		for c in ev.get("choices", []):
			if (c.get("requires", []) as Array).is_empty():
				PiritoriRoad.resolve(String(c["id"]))
				break
		if not PiritoriRoad.pending_event().is_empty():
			GameState.road["pending"] = null
	check("the found-out event never rolls by chance (%d events)" % seen.size(),
		not seen.has(event_id) and not seen.is_empty())


## Settle nights until a family finds out; the payment it happened on, or 0.
func _found_on() -> int:
	for i in range(2, 7):
		GameState.block_index += 2
		if bool(PiritoriStory.settle_cut()["found_out"]):
			return i
	return 0


## Every night of the cut, taken on day one and never ended, is the web's:
## the payment count, the roll and whether a family found out.
func _test_the_cut_is_the_webs() -> void:
	print("\nthe cut, night by night, is the web's")
	_fresh()
	GameState.apply_effect("flag:thursday-cut")
	var rows: Array = _ref.get("cut", [])
	check("the web walked every night of the slice", rows.size() * 2 == GameState.total_blocks, str(rows.size()))
	var bad: Array = []
	for w in rows:
		# Setup only: the block the web settled at.
		GameState.block_index = int(w["block"])
		var got := PiritoriStory.settle_cut()
		var roll := GameState.deterministic_roll("kello-cut:%d" % int(GameState.cut["payments"]))
		if int(GameState.cut["payments"]) != int(w["payments"]) or int(got["paid"]) != int(w["paid"]) \
				or bool(got["found_out"]) != bool(w["found_out"]) or absf(roll - float(w["roll"])) > 1e-12:
			bad.append("block %d: %s roll %.12f vs %s" % [int(w["block"]), got, roll, w])
	check("every payment, roll and discovery matches", bad.is_empty(), str(bad))


# ── doors and the ten-day chapter (v4.65, web/test/doors.mjs) ─────────────

const DOOR_KINDS := ["gig", "pickup", "sale", "favour", "watch", "hit"]


## A campaign standing at one block of the schedule (setup only).
func _at_block(index: int) -> void:
	_fresh()
	GameState.block_index = index
	GameState.day = index / 2 + 1


func _offers_text(offers: Array) -> String:
	return ", ".join(offers.map(func(o): return "%s@%s" % [o["template"], o["anchor"]]))


func _test_doors_canon() -> void:
	print("\ndoors in canon (content/doors-v1.json)")
	var ts := PiritoriDoors.templates()
	var ids := {}
	var dup := false
	for t in ts:
		dup = dup or ids.has(t["id"])
		ids[t["id"]] = true
	check("templates arrive through sync, unique", ts.size() >= 12 and not dup, str(ts.size()))
	eq("all six kinds of door", DOOR_KINDS.filter(func(k): return ts.any(func(t): return t["kind"] == k)).size(), 6)
	var fighting := ts.filter(func(t): return PiritoriDoors.can_fight(t))
	check("enough doors that can become a fight for one a block", fighting.size() >= 4, str(fighting.size()))
	check("a fight depends on the job, not only on hits (answer 23)", fighting.any(func(t): return t["kind"] != "hit"))
	var cap := int(PiritoriDoors.rules().get("fights_per_day_max", 0))
	eq("at most two fights a day", cap, 2)
	var bad: Array = []
	for t in ts:
		if (t.get("steps", []) as Array).size() != 3 or String(t.get("stakes", "")) == "":
			bad.append("%s is not briefed" % t["id"])
		# Answer 25: the way out is open AND safe — it cannot go bad or fight.
		if not t.get("choices", []).any(func(c): return (c.get("requirements", []) as Array).is_empty() \
				and c.get("escalates", null) == null \
				and not (c.get("effects", []) as Array).any(func(e): return String(e).begins_with("start-battle"))):
			bad.append("%s has no open, safe way out" % t["id"])
		var goes_bad: Array = t.get("choices", []).filter(func(c): return c.get("escalates", null) != null)
		for c in goes_bad:
			if not (float(c["escalates"]) > 0.0 and float(c["escalates"]) < 1.0 and String(c.get("forecast", "")).to_lower().contains("fight")):
				bad.append("%s/%s: an escalation is a chance the forecast names as a fight" % [t["id"], c["id"]])
		var fights_here: Array = t.get("choices", []).filter(func(c): return (c.get("effects", []) as Array).any(func(e): return String(e).begins_with("start-battle:")))
		if PiritoriDoors.can_fight(t) != (not fights_here.is_empty() or not goes_bad.is_empty()):
			bad.append("%s: a fight block exactly when a choice fights or can go bad" % t["id"])
		for c in t.get("choices", []):
			var fx: Array = c.get("effects", [])
			if fx.any(func(e): return String(e).begins_with("start-battle:")):
				if not PiritoriDoors.can_fight(t) or not fx.has("start-battle:" + String(t["fight"]["battle"])):
					bad.append("%s/%s starts a fight the door does not own" % [t["id"], c["id"]])
				if not (c.get("requirements", []) as Array).has("fights-today<%d" % cap):
					bad.append("%s/%s is not held to two a day" % [t["id"], c["id"]])
				if not c.get("requirements", []).any(func(r): return String(r).begins_with("fighters>=")):
					bad.append("%s/%s needs nobody who can fight" % [t["id"], c["id"]])
	check("every door is briefed, has a safe way out, and owns its one fight", bad.is_empty(), str(bad))
	check("bad deals escalate on most doors (answer 25)",
		ts.filter(func(t): return t.get("choices", []).any(func(c): return c.get("escalates", null) != null)).size() >= 6)
	var doors_at: Array = []
	for i in ContentRegistry.schedule().size():
		if PiritoriDoors.is_door_block(i):
			doors_at.append(i)
	eq("the free blocks are the web's", doors_at, _ref.get("door_blocks", []).map(func(v): return int(v)))
	eq("ten days, twenty blocks (from canon)", GameState.total_blocks,
		int(ContentRegistry.campaign().get("days", 0)) * GameState.blocks_per_day.size())
	eq("the shipment is the last night", String(ContentRegistry.schedule()[-1].get("encounter_id", "")), "enc-shipment-night")
	var ends := false
	for enc in ContentRegistry.slice.get("encounters", []):
		for c in enc.get("choices", []):
			if (c.get("effects", []) as Array).any(func(e): return String(e).begins_with("resolve-ending")):
				ends = true
	check("nothing ends the campaign on day 7 any more", not ends)


func _test_door_offers_are_the_webs() -> void:
	print("\nthe door offers, block by block and save by save, are the web's")
	var rows: Array = _ref.get("doors", [])
	check("the web rolled door boards", rows.size() >= 60, str(rows.size()))
	var bad: Array = []
	for w in rows:
		_at_block(int(w["block"]))
		# Setup: the save's identity (the roll's first term), packs, fights.
		GameState.content_package_id = String(w["content_id"])
		GameState.stock["piri"] = int(w["piri"])
		for f in int(w["fights"]):
			GameState.record_fight()
		var got := PiritoriDoors.offer_doors()
		if _offers_text(got) != _offers_text(w["offers"]) or GameState.fights_today() != int(w["fights_today"]):
			bad.append("%s block %d piri %d fights %d: %s vs %s" % [w["content_id"], int(w["block"]),
				int(w["piri"]), int(w["fights"]), _offers_text(got), _offers_text(w["offers"])])
	check("every board matches, door and anchor, in order (%d)" % rows.size(), bad.is_empty(), str(bad))


func _test_doors_taken_once_are_the_webs() -> void:
	print("\na door is taken once a chapter, as on the web")
	var bad: Array = []
	for w in _ref.get("door_chain", []):
		_fresh()
		GameState.content_package_id = String(w["content_id"])
		GameState.stock["piri"] = 2
		for st in w["steps"]:
			GameState.block_index = int(st["block"])
			GameState.day = int(st["block"]) / 2 + 1
			var offers := PiritoriDoors.offer_doors()
			var took := PiritoriDoors.take_door(String(offers[0]["template"]))
			if _offers_text(offers) != _offers_text(st["offers"]) \
					or String(took.get("encounter", {}).get("id", "")) != String(st["encounter"]):
				bad.append("%s block %d: %s took %s vs %s took %s" % [w["content_id"], int(st["block"]),
					_offers_text(offers), took.get("encounter", {}).get("id", ""), _offers_text(st["offers"]), st["encounter"]])
	check("each chain of three takes matches", bad.is_empty(), str(bad))


func _test_door_rules() -> void:
	print("\nthe door rules (doors.js's header)")
	var first := int(_ref.get("door_blocks", [15])[0])
	_at_block(first)
	var a := PiritoriDoors.offer_doors().duplicate(true)
	check("2-3 doors", a.size() >= 2 and a.size() <= 3, str(a.size()))
	var kinds := {}
	for o in a:
		kinds[PiritoriDoors.template_of(o["template"])["kind"]] = true
	eq("no two doors of one kind", kinds.size(), a.size())
	check("a door that can become a fight is on offer",
		a.any(func(o): return PiritoriDoors.can_fight(PiritoriDoors.template_of(o["template"]))))
	GameState.cash_eur = 9999
	GameState.stock["piri"] = 5
	eq("offers are kept for the block, whatever changes", _offers_text(PiritoriDoors.offer_doors()), _offers_text(a))
	var saved := GameState.to_dict()
	_fresh()
	GameState.from_dict(JSON.parse_string(JSON.stringify(saved)))
	eq("and survive a save and a reload", _offers_text(PiritoriDoors.offer_doors()), _offers_text(a))
	_at_block(first - 1)
	check("no doors on a spine block", PiritoriDoors.offer_doors().is_empty() and not PiritoriDoors.is_door_block())
	# Late doors only at night, over many saves.
	var late_by_day := 0
	var fight_every := 0
	var n := 0
	for seed in 40:
		for i in _ref.get("door_blocks", []):
			_at_block(int(i))
			GameState.content_package_id = "%s#%d" % [ContentRegistry.slice.get("id", ""), seed]
			GameState.stock["piri"] = 2
			var offers := PiritoriDoors.offer_doors()
			n += 1
			if offers.any(func(o): return PiritoriDoors.can_fight(PiritoriDoors.template_of(o["template"]))):
				fight_every += 1
			if GameState.current_block() != "night":
				late_by_day += offers.filter(func(o): return bool(PiritoriDoors.template_of(o["template"]).get("late", false))).size()
	eq("every door block offers a fight door while fights are left (%d boards)" % n, fight_every, n)
	eq("a late door never opens in the day", late_by_day, 0)

	# A late door closes at 22:00 on the block clock.
	_at_block(first)
	GameState.doors["offers"][str(first)] = [{"template": "watch-back-door", "anchor": "hakaniemi"},
		{"template": "gig-rauno-cart", "anchor": "harju"}]
	var late: Dictionary = GameState.doors["offers"][str(first)][0]
	eq("open at 20:00", PiritoriDoors.door_blocker(late), "")
	GameState.road = {"journeys": 0, "since": 0, "seen": [], "pending": null, "minutes": 125, "minutesBlock": first, "last": null}
	eq("closed at 22:05", PiritoriDoors.door_blocker(late), "closed")
	eq("an ordinary door stays open", PiritoriDoors.door_blocker(GameState.doors["offers"][str(first)][1]), "")
	eq("a closed door cannot be taken", String(PiritoriDoors.take_door("watch-back-door").get("reason", "")), "closed")

	# Taking a door: it becomes the block's encounter, where it is.
	_at_block(first)
	GameState.doors["offers"][str(first)] = [{"template": "gig-rauno-cart", "anchor": "harju"},
		{"template": "hit-bear-debt", "anchor": "karhupuisto"}]
	check("no lead before a door is taken", String(GameState.current_schedule().get("encounter_id", "")) == ""
		and GameState.story_lead_id() == "")
	eq("only an offered door", String(PiritoriDoors.take_door("nope").get("reason", "")), "not-offered")
	var r := PiritoriDoors.take_door("gig-rauno-cart")
	check("the door is taken", bool(r.get("ok", false)))
	eq("the lead is the door", GameState.story_lead_id(), "harju")
	var eid := String(GameState.current_schedule().get("encounter_id", ""))
	var enc := ContentRegistry.encounter(eid)
	check("the door is the encounter, with its scene",
		String(enc.get("door", "")) == "gig-rauno-cart" and String(enc.get("scene_asset_id", "")) == String(PiritoriDoors.rules()["scenes"]["harju"]))
	check("  standing where the door is", GameState.encounter_anchor(eid) == "harju"
		and GameState.available_encounters_at("harju").any(func(e): return e["id"] == eid)
		and not GameState.available_encounters_at("piritori").any(func(e): return e["id"] == eid))
	eq("one door a block", String(PiritoriDoors.take_door("hit-bear-debt").get("reason", "")), "already-taken")
	var saved2 := GameState.to_dict()
	_fresh()
	GameState.from_dict(JSON.parse_string(JSON.stringify(saved2)))
	eq("a taken door survives a reload", String(GameState.current_schedule().get("encounter_id", "")), eid)
	check("  and is an encounter again after it", not ContentRegistry.encounter(eid).is_empty() and GameState.is_encounter_available(eid))
	var cash := GameState.cash_eur
	check("its choices are ordinary effects", GameState.resolve_encounter(eid, "push") and GameState.cash_eur == cash + 20)
	eq("and it cost the block", GameState.block_index, first + 1)
	check("a door is taken once a chapter",
		not PiritoriDoors.offer_doors().any(func(o): return o["template"] == "gig-rauno-cart"))
	check("a taken door closes with its block", not GameState.is_encounter_available(eid))


func _test_two_fights_a_day() -> void:
	print("\nanswer 23: two fights a day, then no more")
	var first := int(_ref.get("door_blocks", [15])[0])
	_at_block(first)
	GameState.apply_effect("recruit:crew-slot-runner")
	GameState.apply_effect("recruit:crew-slot-watcher")
	GameState.apply_effect("recruit:crew-slot-fixer")
	var lean: Dictionary = {}
	for c in PiritoriDoors.template_of("hit-bear-debt")["choices"]:
		if c["id"] == "lean":
			lean = c
	check("a fight is open with a crew and no fights today", GameState.meets_all(lean["requirements"]))
	GameState.record_fight()
	check("one fight today, a second is allowed", GameState.fights_today() == 1 and GameState.meets_all(lean["requirements"]))
	GameState.record_fight()
	check("two fights today, no third", not GameState.meets_all(lean["requirements"]))
	var st := GameState.requirement_status("fights-today<2")
	check("  and it says so in the grammar", st["kind"] == "fights-today" and int(st["have"]) == 2, str(st))
	GameState.block_index = first + 1
	GameState.day = (first + 1) / 2 + 1
	check("the next day starts at nought", GameState.fights_today() == 0 and GameState.meets_all(lean["requirements"]))
	eq("a door fight pays the door, not a mission", PiritoriDoors.door_fight_effects("hit-bear-debt", "win"),
		PiritoriDoors.template_of("hit-bear-debt")["fight"]["win"])
	eq("  and a loss pays the door's loss", PiritoriDoors.door_fight_effects("hit-bear-debt", "loss"),
		PiritoriDoors.template_of("hit-bear-debt")["fight"]["lose"])
	eq("a door with no fight pays nothing for one", PiritoriDoors.door_fight_effects("gig-rauno-cart", "win"), [])


## Answer 25: every bad-deal roll the web made, with a crew, alone, and with
## the day's two fights spent.
func _test_escalation_is_the_webs() -> void:
	print("\na bad deal goes bad exactly when it does on the web (answer 25)")
	var rows: Array = _ref.get("escalation", [])
	check("the web rolled bad deals", rows.size() >= 200, str(rows.size()))
	var crew: Array = ContentRegistry.slice.get("crew", []).slice(0, 3).map(func(c): return String(c["id"]))
	var bad: Array = []
	var seen := {}
	for w in rows:
		_at_block(int(_ref.get("door_blocks", [15])[0]))
		# Setup: the save's identity, who is with Aatami, the day's fights.
		GameState.content_package_id = String(w["content_id"])
		GameState.roster = PackedStringArray(crew.slice(0, int(w["crew"])))
		for f in int(w["fights"]):
			GameState.record_fight()
		var r := PiritoriDoors.escalation(String(w["door"]), String(w["choice"]))
		var got := ""
		if r.has("battle"):
			got = "battle:" + String(r["battle"])
		elif r.has("effects"):
			got = "effects"
			if r["effects"] != PiritoriDoors.template_of(String(w["door"]))["fight"]["lose"]:
				got = "wrong effects"
		seen[got] = true
		if got != String(w["result"]):
			bad.append("%s %s/%s crew %d fights %d: %s vs %s" % [w["content_id"], w["door"], w["choice"],
				int(w["crew"]), int(w["fights"]), got, w["result"]])
	check("every roll matches, fight, stakes or held (%d)" % rows.size(), bad.is_empty(), str(bad))
	check("  and the rolls cover all three outcomes", seen.has("") and seen.has("effects")
		and seen.keys().any(func(k): return String(k).begins_with("battle:")), str(seen.keys()))


## web/test/aatami.mjs (H6.1, owner answer 24, COMBAT.md §9.9.1): he fights
## the first battles because he cannot afford a crew, then steps back for good.
func _test_aatami_fights_first() -> void:
	print("\nAatami fights first, then the crew does (answer 24)")
	var aatami := ContentRegistry.protagonist()
	var slots: Array = ContentRegistry.slice.get("crew", [])
	var crew: Array = slots.map(func(c): return String(c["id"]))
	check("Aatami is in canon, named, and steps back at a crew of three",
		String(aatami.get("id", "")) == "aatami" and bool(aatami.get("named", false))
		and int(aatami.get("steps_back_at_crew", 0)) == 3)
	check("he is not one of the six crew slots", not crew.has("aatami"))

	_fresh()
	check("on day one he fights", GameState.aatami_fights())
	eq("with nobody hired, he is the whole side", GameState.fighters(), PackedStringArray(["aatami"]))
	var rec := ContentRegistry.crew_member("aatami")
	var unit: Dictionary = BattleBuilder.build("battle-karhupuisto-2v2", ["aatami"]).get("player_units", [{}])[0]
	check("he has a condition like anyone who fights",
		int(rec.get("condition", 0)) > 0 and int(unit.get("condition", 0)) == int(rec.get("condition", 0)))
	check("his record resolves, and he is named",
		String(rec.get("name", "")) == "Aatami" and GameState.is_named("aatami"))

	GameState.roster = PackedStringArray([crew[0]])
	check("one hire and Aatami make two who can fight", GameState.meets_requirement("fighters>=2"))
	check("but only one crew with you", not GameState.meets_requirement("deployed-crew>=2"))
	check("\"someone with you\" still means crew",
		GameState.meets_requirement("deployed-crew>=1") and not GameState.meets_requirement("deployed-crew>=2"))
	var battle := BattleBuilder.build("battle-karhupuisto-2v2", Array(GameState.fighters()))
	eq("he takes the board, in front",
		(battle.get("player_units", []) as Array).map(func(u): return String(u["fighter_id"])), ["aatami", crew[0]])
	check("he has no career ceiling",
		GameState.age_crew(PackedStringArray(["aatami"])).is_empty() and not GameState.crew_fights.has("aatami"))
	eq("with one hire he does not step back", GameState.step_back_if_ready(), "")

	GameState.roster = PackedStringArray(crew.slice(0, 3))
	check("a crew of three: he could stay out", not GameState.aatami_fights())
	var beat := GameState.step_back_if_ready()
	check("the first time, he does, and it is a beat",
		beat == String(aatami.get("step_back_beat", "")) and beat != ""
		and GameState.has_flag("memory:aatami-stepped-back"))
	eq("the beat plays once", GameState.step_back_if_ready(), "")
	check("from then on the crew fights", not GameState.fighters().has("aatami"))
	# Missing, in the port, is taken by the police: off the roster for good.
	GameState.arrest(String(crew[0]))
	GameState.arrest(String(crew[1]))
	check("the withdrawal is permanent, even short-handed",
		not GameState.aatami_fights() and not GameState.fighters().has("aatami"))

	var text := JSON.stringify(GameState.to_dict())
	GameState.new_campaign()
	check("a fresh campaign has him fighting again", GameState.aatami_fights())
	GameState.from_dict(JSON.parse_string(text))
	check("a save carries the step-back", GameState.has_flag("memory:aatami-stepped-back")
		and not GameState.aatami_fights())


## tools/web-reference.mjs's lineups: for each crew the web was given, who
## fights, the gates, both fights' boards and the beat, all as the web says.
func _test_the_lineup_is_the_webs() -> void:
	print("\nwho takes the board is the web's (answer 24)")
	var rows: Array = _ref.get("fighters", [])
	check("the web recorded lineups", rows.size() >= 6, str(rows.size()))
	var slots: Array = ContentRegistry.slice.get("crew", []).map(func(c): return String(c["id"]))
	var bad: Array = []
	for w in rows:
		_fresh()
		if bool(w["stepped"]):
			GameState.roster = PackedStringArray(slots.slice(0, 3))
			GameState.step_back_if_ready()
		GameState.roster = PackedStringArray(w["hired"])
		var tag := "%d hired%s" % [(w["hired"] as Array).size(), ", stepped back" if bool(w["stepped"]) else ""]
		if GameState.aatami_fights() != bool(w["aatami_fights"]):
			bad.append("%s: aatami fights %s" % [tag, GameState.aatami_fights()])
		if Array(GameState.fighters()) != Array(w["fighters"]):
			bad.append("%s: fighters %s vs %s" % [tag, GameState.fighters(), w["fighters"]])
		for req in (w["requirements"] as Dictionary):
			if GameState.meets_requirement(String(req)) != bool(w["requirements"][req]):
				bad.append("%s: %s" % [tag, req])
		for id in (w["lineups"] as Dictionary):
			var want: Variant = w["lineups"][id]
			var got: Variant = null
			if GameState.fighters().size() >= int(ContentRegistry.battle(String(id)).get("player_deployed", 2)):
				got = (BattleBuilder.build(String(id), Array(GameState.fighters()))["player_units"] as Array) \
					.map(func(u): return String(u["fighter_id"]))
			if got != want:
				bad.append("%s: %s lineup %s vs %s" % [tag, id, got, want])
		var beat := GameState.step_back_if_ready()
		if beat != String(w["beat"]):
			bad.append("%s: beat '%s'" % [tag, beat])
		if Array(GameState.fighters()) != Array(w["fighters_after_beat"]):
			bad.append("%s: after the beat %s" % [tag, GameState.fighters()])
	check("every lineup, gate and beat matches (%d)" % rows.size(), bad.is_empty(), str(bad))


## web/test/doors.mjs's escalation block, and the resolution that carries it.
func _test_bad_deals_escalate() -> void:
	print("\nbad deals escalate (answer 25), by a roll the forecast names")
	var first := int(_ref.get("door_blocks", [15])[0])
	var crew: Array = ContentRegistry.slice.get("crew", []).slice(0, 3).map(func(c): return String(c["id"]))
	var fights := 0
	var alone := 0
	var same := true
	for seed in 200:
		_at_block(first)
		GameState.content_package_id = "%s#%d" % [ContentRegistry.slice.get("id", ""), seed]
		GameState.roster = PackedStringArray(crew)
		var a := PiritoriDoors.escalation("pickup-fish-stall", "skim")
		same = same and a == PiritoriDoors.escalation("pickup-fish-stall", "skim")
		if a.has("battle"):
			fights += 1
		GameState.roster = PackedStringArray()
		var b := PiritoriDoors.escalation("pickup-fish-stall", "skim")
		if not b.is_empty():
			alone += 1
			same = same and not b.has("battle") \
				and b["effects"] == PiritoriDoors.template_of("pickup-fish-stall")["fight"]["lose"]
	check("an escalation is deterministic, and alone it costs the losing stakes", same)
	check("the skim goes bad about half the time (%d/200)" % fights, fights > 80 and fights < 120)
	eq("with no crew the same rolls go bad, without a fight", alone, fights)
	_at_block(first)
	GameState.roster = PackedStringArray(crew)
	GameState.record_fight()
	GameState.record_fight()
	var any := 0
	for seed in 50:
		GameState.content_package_id = "%s#%d" % [ContentRegistry.slice.get("id", ""), seed]
		if not PiritoriDoors.escalation("pickup-fish-stall", "skim").is_empty():
			any += 1
	eq("nothing escalates past two fights a day", any, 0)
	_at_block(first)
	check("an honest job never escalates", PiritoriDoors.escalation("gig-rauno-cart", "push").is_empty())

	# Through the resolution: the quay's sell-two at the first free block goes
	# bad on the reference save's roll (web doors-browser.cjs).
	_at_block(first)
	GameState.stock["piri"] = 2
	GameState.current_anchor_id = "sornainen_harbour"
	GameState.roster = PackedStringArray(crew)
	GameState.doors["offers"][str(first)] = [{"template": "sale-quay-shift", "anchor": "sornainen_harbour"},
		{"template": "gig-rauno-cart", "anchor": "harju"}]
	PiritoriDoors.take_door("sale-quay-shift")
	var asked: Array = []
	var cb := func(bid, _n): asked.append(bid)
	GameState.battle_requested.connect(cb)
	var eid := PiritoriDoors.encounter_id_of(first, "sale-quay-shift")
	GameState.resolve_encounter(eid, "sell-two")
	GameState.battle_requested.disconnect(cb)
	check("sold two at the quay, it goes bad and it is the door's fight",
		asked == ["battle-kattilahalli-3v3"] and String(GameState.last_escalation.get("kind", "")) == "battle"
		and int(GameState.last_escalation.get("block", -1)) == first, "%s %s" % [asked, GameState.last_escalation])
	_at_block(first)
	GameState.stock["piri"] = 2
	GameState.current_anchor_id = "sornainen_harbour"
	GameState.doors["offers"][str(first)] = [{"template": "sale-quay-shift", "anchor": "sornainen_harbour"},
		{"template": "gig-rauno-cart", "anchor": "harju"}]
	PiritoriDoors.take_door("sale-quay-shift")
	var cash := GameState.cash_eur
	var sale := 0
	var lose := 0
	for fx in PiritoriDoors.template_of("sale-quay-shift")["choices"].filter(func(c): return c["id"] == "sell-two")[0]["effects"]:
		if String(fx).begins_with("cash:"):
			sale += int(String(fx).substr(5))
	for fx in PiritoriDoors.template_of("sale-quay-shift")["fight"]["lose"]:
		if String(fx).begins_with("cash:"):
			lose += int(String(fx).substr(5))
	GameState.resolve_encounter(eid, "sell-two")
	check("alone, it goes bad without a fight and costs the door (€%d, then €%d)" % [sale, lose],
		String(GameState.last_escalation.get("kind", "")) == "alone" and GameState.cash_eur == cash + sale + lose,
		"%s €%d" % [GameState.last_escalation, GameState.cash_eur])


func _test_spine_beats_and_the_look_ahead() -> void:
	print("\nthe spine beats of days 8-10, and the ending that is a look ahead")
	var k := ContentRegistry.encounter("enc-kello-reckoning")
	_at_block(14)
	var open: Array = k["choices"].filter(func(c): return GameState.meets_all(c["requirements"])).map(func(c): return c["id"])
	eq("with no case answered only the quiet way is open", open, ["let-it-pass"])
	GameState.apply_effect("flag:thursday-cut")
	check("the case outcome opens its own reckoning",
		GameState.meets_all(k["choices"].filter(func(c): return c["id"] == "ask-kello")[0]["requirements"]))

	var ship := ContentRegistry.encounter("enc-shipment-night")
	var last := ContentRegistry.schedule().size() - 1
	_at_block(last)
	GameState.current_anchor_id = "sornainen_harbour"
	GameState.cash_eur = 500
	check("the shipment needs the chapter goal", not GameState.meets_requirement("chapter-goal-met")
		and not GameState.meets_all(ship["choices"][0]["requirements"]))
	GameState.chapter_earned = GameState.chapter_threshold
	check("earned, it can run", GameState.meets_all(ship["choices"][0]["requirements"]))
	check("the shipment runs for its stake", GameState.resolve_encounter("enc-shipment-night", "run-shipment")
		and GameState.chapter_cleared and ["clean", "messy", "lost"].has(GameState.last_ending_outcome)
		and GameState.cash_eur == 100, "%s %s €%d" % [GameState.chapter_cleared, GameState.last_ending_outcome, GameState.cash_eur])
	check("and the chapter is over", GameState.is_slice_complete() and GameState.ending_id == "")

	_at_block(last)
	GameState.current_anchor_id = "sornainen_harbour"
	check("missing the boat still closes the chapter", GameState.resolve_encounter("enc-shipment-night", "let-it-go")
		and GameState.chapter_cleared and GameState.last_ending_outcome == "missed"
		and GameState.memories.has("chapter-cleared:1:missed"))

	_at_block(13)
	GameState.current_anchor_id = "makelansilta"
	var j := ContentRegistry.encounter("enc-jaska-last-light")
	GameState.resolve_encounter("enc-jaska-last-light", String(j["choices"][0]["id"]))
	check("day 7 points at Pasila instead of ending there", GameState.ending_id == ""
		and Array(GameState.memories).any(func(m): return String(m).begins_with("pasila-forecast:"))
		and GameState.has_flag("memory:pasila-forecast:" + String(GameState.forecast_ending().get("id", ""))))
	check("the forecast names an ending", String(GameState.forecast_ending().get("id", "")).begins_with("pasila-"))
	check("  and the week goes on", not GameState.is_slice_complete() and GameState.block_index == 14)
	# Each of the four is where some road points (web `forecastEnding`).
	for id in ["pasila-haunted", "pasila-expensive", "pasila-nearer", "pasila-deferred"]:
		_fresh()
		# Setup: a run shaped the way that ending reads it.
		match id:
			"pasila-haunted":
				GameState.crew_deaths = 1
			"pasila-expensive":
				GameState.exit_fund_eur = 200
				GameState.debt_eur = 300
			"pasila-nearer":
				GameState.exit_fund_eur = 200
				GameState.debt_eur = 100
				GameState.roster = PackedStringArray(["crew-slot-runner", "crew-slot-watcher"])
		eq("  the road can point at %s" % id, String(GameState.forecast_ending().get("id", "")), id)


func _test_the_chapter_walk_is_the_webs() -> void:
	print("\na whole chapter, walked the web's way, is the web's")
	_fresh()
	var got: Array = []
	for guard in 40:
		if GameState.is_slice_complete():
			break
		var door := ""
		if PiritoriDoors.is_door_block() and PiritoriDoors.taken_at().is_empty():
			var offers := PiritoriDoors.offer_doors()
			door = String(PiritoriDoors.take_door(String(offers[0]["template"])).get("offer", {}).get("template", ""))
		var entry := GameState.current_schedule()
		var eid := String(entry.get("encounter_id", ""))
		var enc := ContentRegistry.encounter(eid)
		GameState.current_anchor_id = GameState.story_lead_id()
		var quiet := ""
		var choices: Array = enc.get("choices", []).duplicate()
		choices.reverse()
		for c in choices:
			if GameState.meets_all(c.get("requirements", [])) \
					and not (c.get("effects", []) as Array).any(func(e): return String(e).begins_with("start-battle")):
				quiet = String(c["id"])
				break
		got.append({"block": GameState.block_index, "door": door, "encounter": eid, "choice": quiet})
		if quiet == "" or not GameState.resolve_encounter(eid, quiet):
			GameState.advance_block()
	var want: Array = _ref.get("chapter_walk", [])
	var bad: Array = []
	for i in maxi(got.size(), want.size()):
		var g: Dictionary = got[i] if i < got.size() else {}
		var w: Dictionary = want[i] if i < want.size() else {}
		if g.is_empty() or w.is_empty() or int(g["block"]) != int(w["block"]) or g["door"] != w["door"] \
				or g["encounter"] != w["encounter"] or g["choice"] != w["choice"]:
			bad.append("%s vs %s" % [g, w])
	check("all %d blocks play, door by door and choice by choice" % want.size(), bad.is_empty(), str(bad))
	eq("all of the schedule was walked", got.size(), ContentRegistry.schedule().size())
	var end: Dictionary = _ref.get("chapter_walk_end", {})
	check("the chapter closes without ending the game", GameState.is_slice_complete() and GameState.chapter_cleared
		and GameState.ending_id == "" and bool(end.get("cleared", false)))
	eq("  on the web's outcome", GameState.last_ending_outcome, String(end.get("outcome", "")))
	eq("  pointing where the web's road points", String(GameState.forecast_ending().get("id", "")), String(end.get("ending", "")))
	check("  and remembering the day-7 look ahead as the web does",
		GameState.has_flag(String(end.get("forecast", "-"))), String(end.get("forecast", "")))


## The chapter turn (v4.64), mirroring web/test/chapter.mjs.
func _test_chapter_turn() -> void:
	print("\nthe chapter turn (v4.64): what crosses into chapter 2")
	var turn: Dictionary = ContentRegistry.slice.get("chapter_turn", {})
	var r: Dictionary = turn.get("rules", {})
	var bad: Array = []
	for k in r:
		if not ["carry", "reset", "stake"].has(String(r[k])):
			bad.append(k)
	check("canon: every one of the %d rules is carry, reset or stake" % r.size(), bad.is_empty() and not r.is_empty(), str(bad))
	var stake := int(turn.get("opening_cash_eur", 0))
	check("cash opens on a standard stake", r.get("cash", "") == "stake" and stake > 0)
	eq("produce does not carry", String(r.get("stock", "")), "reset")
	eq("weapons carry", String(r.get("gear", "")), "carry")
	check("what you built carries", r.get("crew", "") == "carry" and r.get("upgrades", "") == "carry")
	eq("access is re-earned", String(r.get("mission_unlocks", "")), "reset")

	_fresh()
	var plan0 := PiritoriChapter.turn_plan()
	var want0: Array = _ref.get("chapter_plan", [])
	eq("the plan names the web's rows, in its order, with its rules",
		plan0.map(func(p): return "%s:%s" % [p["key"], p["rule"]]),
		want0.map(func(p): return "%s:%s" % [p["key"], p["rule"]]))

	_played()
	eq("no turn before the ending", PiritoriChapter.turn_chapter().get("reason", ""), "chapter-not-cleared")
	check("  a refused turn changes nothing", GameState.chapter == 1 and GameState.cash_eur == 900)
	var plan := PiritoriChapter.turn_plan()
	var row := func(k: String) -> Dictionary:
		for p in plan:
			if p["key"] == k:
				return p
		return {}
	check("the plan shows cash going to the stake",
		int(row.call("cash")["now"]) == 900 and int(row.call("cash")["next"]) == stake)
	check("  stock gone and gear kept",
		int(row.call("stock")["next"]) == 0 and int(row.call("gear")["next"]) == int(row.call("gear")["now"]))
	eq("  the plan reads, it never writes", int(GameState.stock.get("piri", 0)), 3)

	eq("the shipment runs", GameState.attempt_chapter_ending(), "")
	var gear := GameState.equipment.size()
	var crew := Array(GameState.roster)
	var debt := GameState.debt_eur
	var upgrades := Array(GameState.upgrades)
	var authored: bool = not ContentRegistry.slice.get("chapters", []).filter(func(c): return int(c.get("index", 0)) == 2).is_empty()
	GameState.temporary_crew = PackedStringArray(["crew-slot-runner"])
	var res := PiritoriChapter.turn_chapter()
	check("the chapter turns", bool(res.get("ok", false)))
	check("chapter 2 opens", GameState.chapter == 2 and not GameState.chapter_cleared)
	eq("cash is the stake", GameState.cash_eur, stake)
	check("stock is gone", GameState.stock.values().all(func(v): return int(v) == 0))
	eq("weapons carry", GameState.equipment.size(), gear)
	eq("crew carry", Array(GameState.roster), crew)
	eq("built upgrades carry", Array(GameState.upgrades), upgrades)
	check("debt and markka carry", GameState.debt_eur == debt and GameState.markka_mk == 300)
	check("the threshold counts this chapter only", GameState.chapter_earned == 0
		and GameState.chapter_loot_taken == 0 and GameState.chapter_fights_won == 0)
	check("mission unlocks are re-earned", not GameState.is_revealed("mission-paper-bag"))
	check("the city remembers the turn", GameState.has_flag("memory:chapter-turned:1"))
	check("help hired for one job does not follow", GameState.temporary_crew.is_empty())
	eq("says whether chapter 2 is authored yet", bool(res.get("authored", true)), authored)
	eq("one turn per ending", PiritoriChapter.turn_chapter().get("reason", ""), "chapter-not-cleared")
	var saved := JSON.stringify(GameState.to_dict())
	var cash := GameState.cash_eur
	GameState.new_campaign()
	GameState.from_dict(JSON.parse_string(saved))
	check("the turn survives a reload", GameState.chapter == 2 and GameState.cash_eur == cash
		and GameState.equipment.size() == gear)


## The rules are data: flip them in a copy of canon and the turn follows.
func _test_chapter_turn_follows_the_data() -> void:
	print("\nthe turn follows the data, not a habit")
	var flipped: Dictionary = ContentRegistry.slice.duplicate(true)
	flipped["chapter_turn"]["rules"]["cash"] = "carry"
	flipped["chapter_turn"]["rules"]["gear"] = "reset"
	flipped["chapter_turn"]["rules"]["stock"] = "carry"
	_played()
	GameState.attempt_chapter_ending()
	var cash := GameState.cash_eur
	var plan := PiritoriChapter.turn_plan(flipped)
	check("the plan reads the copy", plan.any(func(p): return p["key"] == "gear" and p["rule"] == "reset" and int(p["next"]) == 0))
	PiritoriChapter.turn_chapter(flipped)
	eq("cash:carry keeps the cash", GameState.cash_eur, cash)
	eq("gear:reset empties the stash", GameState.equipment.size(), 0)
	eq("stock:carry keeps the stock", int(GameState.stock.get("piri", 0)), 3)
	check("and canon itself was not touched",
		String(ContentRegistry.slice["chapter_turn"]["rules"]["gear"]) == "carry")


## A chapter that has been played (web chapter.mjs `played()`): money made,
## stock held, a weapon bought, someone recruited, a mission unlocked, and
## Aatami at the harbour. Fixtures only; the ending and the turn are real.
func _played() -> void:
	_fresh()
	GameState.cash_eur = 900
	GameState.stock["piri"] = 3
	GameState.chapter_earned = 450
	GameState.debt_eur = 275
	GameState.markka_mk = 300
	GameState.add_equipment("folding-knife")
	GameState.roster = PackedStringArray([String(ContentRegistry.slice["crew"][0]["id"])])
	GameState.apply_effect("reveal:mission-paper-bag")
	GameState.current_anchor_id = String(GameState.chapter_ending().get("anchor_id", ""))


func _test_sound() -> void:
	print("\nsound (v4.59): synthesised, one master bus, a switch")
	var was := Sound.on
	Sound.set_sound(true)
	var st := Sound.state()
	check("on: a graph is running", bool(st["running"]), str(st))
	check("  every voice routes through the master bus", bool(st["routed_to_master"]) and int(st["players"]) > 2)
	var n := Sound.played.size()
	Sound.till(1)
	Sound.till(-1)
	Sound.steps()
	Sound.sting()
	Sound.bell()
	check("  the till (in and out), steps, the sting and the bell play",
		Sound.played.slice(n) == PackedStringArray(["till-up", "till-down", "steps", "sting", "bell"]),
		str(Sound.played.slice(n)))
	Sound.set_sound(false)
	st = Sound.state()
	check("OFF closes the whole graph, not just the volume", not bool(st["running"]) and int(st["players"]) == 0)
	check("  and mutes the master bus", bool(st["master_muted"]))
	n = Sound.played.size()
	Sound.till(1)
	check("  nothing plays while off", Sound.played.size() == n)
	check("the switch is remembered", Sound._load_pref() == false)
	Sound.set_sound(true)
	check("ON again rebuilds it", bool(Sound.state()["running"]) and Sound._load_pref())
	var files := false
	for f in DirAccess.get_files_at("res://autoload"):
		if f.ends_with(".wav") or f.ends_with(".ogg") or f.ends_with(".mp3"):
			files = true
	check("no audio files: every sound is computed", not files)
	Sound.set_sound(was)


func _test_arrival_lines() -> void:
	print("\nthe arrival's lines are read from the save")
	_fresh()
	var lines := preload("res://scenes/arrival.gd").lines()
	eq("three lines", lines.size(), 3)
	check("the money, the markka and the debt from the save",
		lines[1].contains("€160") and lines[1].contains("300 mk") and lines[1].contains("€350"), lines[1])
	check("the first payment from the content: €75 on day 4",
		lines[1].contains("€75") and lines[1].contains("day 4"), lines[1])
	GameState.cash_eur = 999
	check("and they follow the save, not a typed number",
		preload("res://scenes/arrival.gd").lines()[1].contains("€999"))
	check("a new campaign owes the arrival", _new_owes())
	var saved := GameState.to_dict()
	GameState.from_dict(saved)
	check("a loaded one does not", not GameState.arrival_due)


func _new_owes() -> bool:
	GameState.new_campaign()
	return GameState.arrival_due
