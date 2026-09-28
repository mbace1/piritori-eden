extends Node
## The city's new rules — the road (v4.58), sound (v4.59), Toko's counter and
## the board (v4.60/v4.61), and the Thursday Load (v4.62) — against the web.
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
	check("standing your ground needs two crew, and says so",
		not bool(st["ok"]) and String(st["failed"][0]["kind"]) == "deployed-crew")
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
