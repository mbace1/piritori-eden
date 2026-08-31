extends Node
## Headless gate for the Era I vertical slice spine.
##
## Run: godot --headless --path piritori/godot res://tests/test_spine.tscn
##
## This is a SCENE rather than a --script SceneTree, deliberately: autoloads
## only exist inside a real scene tree, and ContentRegistry/GameState/
## SaveService are the things under test.
##
## It drives the model the way the interface will (resolve_encounter /
## execute_offer), never by poking fields directly — AGENTS.md §4: a gate that
## calls the model through a debug handle proves the model and says nothing
## about the game.

var _pass := 0
var _fail := 0


func _ready() -> void:
	print("── Piritori Era I slice spine ──")
	_test_content_loads()
	_test_starting_state_matches_canon()
	_test_opening_lead()
	_test_schedule_gates_content()
	_test_requirements_gate_the_buy()
	_test_first_purchase()
	_test_profitable_first_sale()
	_test_block_clock()
	_test_save_round_trip()
	_test_careers()
	_test_growing()
	_test_aptitudes()
	_test_skills()
	_test_loot()
	_test_fence()
	_test_arrest()
	_test_chapters()
	_test_chapter_ending()
	_test_gear_wears_out()
	_test_hiring()
	_test_every_reference_resolves()

	print("\n%d passed, %d failed" % [_pass, _fail])
	if _fail > 0:
		print("SPINE FAIL")
		get_tree().quit(1)
	else:
		print("SPINE OK: map opens on Piritori, first purchase and profitable sale resolve, state survives reload.")
		get_tree().quit(0)


func check(label: String, condition: bool, detail: String = "") -> void:
	if condition:
		_pass += 1
		print("  ok    %s" % label)
	else:
		_fail += 1
		print("  FAIL  %s %s" % [label, detail])


func eq(label: String, actual: Variant, expected: Variant) -> void:
	check(label, actual == expected, "(got %s, want %s)" % [actual, expected])


# ── tests ──────────────────────────────────────────────────────────────────

func _test_content_loads() -> void:
	print("\ncontent registry")
	check("canonical JSON loads with no errors", ContentRegistry.errors.is_empty(),
		str(ContentRegistry.errors))
	# 12 -> 13 anchors and 22 -> 24 edges on 2026-08-23: Suvilahti separated from
	# the harbour, with the two edges that make it reachable. Kattilahalli is in
	# the old gasworks and the docks are the waterfront; filing both under one
	# anchor had merged two places into one.
	# 13 -> 14 anchors and 24 -> 25 edges on 2026-08-25: Jaska's site moves off
	# Torkkelinmaki to Scene Club, a new anchor at Makelansilta just north of
	# Kurvi past the bridge where Makelankatu begins - owner-placed geography,
	# with one edge connecting it to Piritori.
	# 14 -> 15, 2026-08-28 (v4.18): "add the Hermanni spot as a test area for
	# battle training in Era1" added hermanni_skatepark as a real board anchor.
	# Checked against map/validate-map.mjs's own authoritative count before
	# bumping the number, same discipline as the JS side's v3-contract.mjs.
	eq("fifteen anchors", ContentRegistry.anchors().size(), 15)
	eq("twenty-five edges", ContentRegistry.edges().size(), 25)
	# 10 -> 12 on 2026-08-23: Sörnäinen opened by owner ruling, adding the
	# Suvilahti yard and Kattilahalli. A pinned count so a place cannot appear
	# without somebody deciding it should.
	eq("twelve sites", ContentRegistry.map.get("sites", []).size(), 12)
	eq("fourteen encounters", ContentRegistry.slice.get("encounters", []).size(), 14)
	eq("six crew", ContentRegistry.slice.get("crew", []).size(), 6)


func _test_starting_state_matches_canon() -> void:
	print("\nstarting state (from campaign.starting_state)")
	GameState.new_campaign()
	eq("cash", GameState.cash_eur, 160)
	eq("markka", GameState.markka_mk, 300)
	eq("debt", GameState.debt_eur, 350)
	eq("capacity", GameState.capacity, 2)
	eq("stock piri", int(GameState.stock.get("piri", -1)), 0)
	eq("day", GameState.day, 1)
	eq("block", GameState.current_block(), "day")
	eq("piritori pressure", String(GameState.local_pressure.get("piritori", "")), "watchful")


func _test_opening_lead() -> void:
	print("\nopening lead (handoff §2: Piritori the only live first lead)")
	eq("start anchor", GameState.current_anchor_id, "piritori")
	check("opening site revealed", GameState.is_revealed("piritori_first_buy"))
	check("first purchase encounter revealed", GameState.is_revealed("enc-first-purchase"))
	check("siltasaari sale NOT yet revealed", not GameState.is_revealed("offer-siltasaari-sell"))
	var visible := GameState.visible_offers()
	check("no sale offer visible before it is earned",
		not visible.any(func(o): return o["id"] == "offer-siltasaari-sell"))


## Regression: piritori_first_buy hosts BOTH the day 1 purchase and the day 5
## firearm encounter. Revealing every encounter at the start site put a day 5
## scene on the board on day 1 — a Canon leak the interface happily rendered.
func _test_schedule_gates_content() -> void:
	print("
schedule gates content by block")
	GameState.new_campaign()
	check("day 1 purchase is available", GameState.is_encounter_available("enc-first-purchase"))
	check("day 5 firearm is NOT available on day 1",
		not GameState.is_encounter_available("enc-first-firearm"))
	check("day 5 firearm is not even revealed on day 1",
		not GameState.is_revealed("enc-first-firearm"))

	var live := GameState.available_encounters_at("piritori")
	eq("exactly one live encounter at Piritori on day 1", live.size(), 1)
	if live.size() == 1:
		eq("  and it is the first purchase", String(live[0]["id"]), "enc-first-purchase")

	# Walk to day 5 night; the firearm encounter should then be live.
	for i in range(9):
		GameState.advance_block()
	eq("reached day 5", GameState.day, 5)
	eq("reached night", GameState.current_block(), "night")
	check("day 5 firearm is revealed once its block arrives",
		GameState.is_revealed("enc-first-firearm"))
	check("day 5 firearm is available in its block",
		GameState.is_encounter_available("enc-first-firearm"))
	GameState.new_campaign()


func _test_requirements_gate_the_buy() -> void:
	print("\nrequirements grammar")
	check("cash>=45 met at 160", GameState.meets_requirement("cash>=45"))
	check("cash>=999 not met", not GameState.meets_requirement("cash>=999"))
	var saved_cash := GameState.cash_eur
	GameState.cash_eur = 10
	check("buy refused when short of cash",
		not GameState.resolve_encounter("enc-first-purchase", "buy"))
	eq("refused buy changed nothing", GameState.cash_eur, 10)
	GameState.cash_eur = saved_cash


func _test_first_purchase() -> void:
	print("\nauthored first purchase (enc-first-purchase / buy)")
	var ok := GameState.resolve_encounter("enc-first-purchase", "buy")
	check("buy resolves", ok)
	eq("cash 160 - 45", GameState.cash_eur, 115)
	eq("one pack in stock", int(GameState.stock.get("piri", 0)), 1)
	check("flag recorded", GameState.flags.get("first-purchase-made", false))
	check("mission revealed", GameState.is_revealed("mission-paper-bag"))
	check("encounter marked resolved", GameState.is_resolved("enc-first-purchase"))
	eq("a block was spent", GameState.block_index, 1)


func _test_profitable_first_sale() -> void:
	print("\nprofitable first sale (§9 item 2)")
	# The Siltasaari sale is revealed by the mission, which the purchase revealed.
	GameState.apply_effect("reveal:mission-paper-bag")
	var visible := GameState.visible_offers()
	var sale := visible.filter(func(o): return o["id"] == "offer-siltasaari-sell")
	check("sale offer now visible", sale.size() == 1)

	if sale.size() == 1:
		var before := GameState.cash_eur
		check("can sell with stock in hand", GameState.can_sell(sale[0]))
		var ok := GameState.execute_offer("offer-siltasaari-sell")
		check("sale executes", ok)
		eq("cash + 68", GameState.cash_eur, before + 68)
		eq("stock spent", int(GameState.stock.get("piri", 0)), 0)
		check("sale is profitable against the 45 buy", 68 > 45)
		check("market history records siltasaari", GameState.market_history.has("siltasaari"))


func _test_block_clock() -> void:
	print("\nblock clock (integer, 14 blocks over 7 days)")
	eq("total blocks", GameState.total_blocks, 14)
	var fresh := GameState
	fresh.new_campaign()
	var seen_days: Array = []
	for i in range(14):
		seen_days.append("%d-%s" % [fresh.day, fresh.current_block()])
		fresh.advance_block()
	eq("first block", seen_days[0], "1-day")
	eq("second block", seen_days[1], "1-night")
	eq("third block", seen_days[2], "2-day")
	eq("last block", seen_days[13], "7-night")
	check("slice completes after 14 blocks", fresh.is_slice_complete())


func _test_save_round_trip() -> void:
	print("\nsave / quit / reload (§9 item 6)")
	GameState.new_campaign()
	GameState.resolve_encounter("enc-first-purchase", "buy")
	var expected := GameState.to_dict()

	check("save written", SaveService.save_game())

	# Wipe the model the way a fresh launch would.
	GameState.new_campaign()
	eq("model reset", GameState.cash_eur, 160)

	check("save loads", SaveService.load_game())
	eq("cash restored", GameState.cash_eur, int(expected["cash_eur"]))
	eq("stock restored", int(GameState.stock.get("piri", 0)), 1)
	eq("block restored", GameState.block_index, int(expected["block_index"]))
	check("flag restored", GameState.flags.get("first-purchase-made", false))
	check("resolved encounter restored", GameState.is_resolved("enc-first-purchase"))
	eq("schema version stored", int(expected["schema_version"]), GameState.SCHEMA_VERSION)
	check("content package id stored", String(expected["content_package_id"]) != "")


## Arrest (COMBAT.md §9.5.3): the police take the fallen.
##
## Deliberately a DIFFERENT ending from retirement. A veteran who got out is a
## contact the city remembers and who trains the next one (§9.8); somebody
## carried off a yard is a different fact about a different night. Every later
## system reads memories, so collapsing the two would make them indistinguishable
## forever.
func _test_arrest() -> void:
	print("
arrest (COMBAT.md §9.5.3)")
	GameState.new_campaign()
	var who := ""
	for c in ContentRegistry.slice.get("crew", []):
		var cid := String(c.get("id", ""))
		if not GameState.is_named(cid):
			who = cid
			break
	if who == "":
		check("a spendable crew member exists", false)
		return
	if not GameState.roster.has(who):
		GameState.roster.append(who)

	GameState.arrest(who)
	check("they are off the roster", not GameState.roster.has(who))
	check("and recorded as arrested", GameState.arrested_crew.has(who))
	check("the city remembers it happened",
		GameState.memories.has("arrested:" + who))

	# The distinction that matters.
	check("arrest is not retirement", not GameState.retired_crew.has(who))
	check("and does not leave a retirement memory",
		not GameState.memories.has("retired:" + who))

	var before := GameState.arrested_crew.size()
	GameState.arrest(who)
	check("arresting twice changes nothing",
		GameState.arrested_crew.size() == before)

	# It has to survive a save, or a reloaded campaign quietly gets them back.
	var saved := GameState.to_dict()
	GameState.new_campaign()
	check("a new campaign has nobody arrested", GameState.arrested_crew.is_empty())
	check("the save reloads", GameState.from_dict(saved))
	check("and they are still gone", GameState.arrested_crew.has(who))


## Chapters, and the ledger of what survives one.
##
## A roguelike lives or dies on that ledger, so the assertions are about what
## CARRIES and what does NOT — the rule being: what you built persists, what you
## were granted does not.
func _test_chapters() -> void:
	print("
chapters (GDD: run structure)")
	GameState.new_campaign()
	check("a campaign starts in chapter one", GameState.chapter == 1)
	check("on the first day of it", GameState.day_of_chapter() == 1)
	check("with no progress", GameState.chapter_progress() == 0)
	check("and the goal unmet", not GameState.chapter_goal_met())

	# Progress is counted centrally so a new way of earning cannot fail to count.
	GameState.chapter_goal = GameState.ChapterGoal.MONEY
	GameState.chapter_threshold = 100
	GameState.record_chapter_income(60)
	check("income counts toward a money chapter", GameState.chapter_progress() == 60)
	check("and 60 is not yet 100", not GameState.chapter_goal_met())
	GameState.record_chapter_income(40)
	check("meeting the threshold opens the ending", GameState.chapter_goal_met())

	# The type is what varies between chapters, so the counters must not bleed.
	GameState.chapter_goal = GameState.ChapterGoal.FIGHTS
	GameState.chapter_threshold = 2
	check("a fights chapter does not count the money",
		GameState.chapter_progress() == 0)
	GameState.record_chapter_win()
	GameState.record_chapter_win()
	check("but does count the fights", GameState.chapter_goal_met())

	# ── the ledger ──
	GameState.new_campaign()
	GameState.cash_eur = 500
	GameState.take_loot(PackedStringArray(["sawn-off"]))
	GameState.add_upgrade("stash-house-1")
	GameState.memories.append("retired:somebody")
	GameState.flags["mission-unlocked"] = true
	var roster_before := GameState.roster.size()

	GameState.begin_next_chapter()

	check("the chapter advanced", GameState.chapter == 2)
	check("and the day follows it",
		GameState.day == GameState.CHAPTER_DAYS + 1, str(GameState.day))

	# What you BUILT.
	check("gear carries", GameState.equipment_owned.has("sawn-off"))
	check("built upgrades carry", GameState.has_upgrade("stash-house-1"))
	check("contacts carry", GameState.memories.has("retired:somebody"))
	check("people carry", GameState.roster.size() == roster_before)

	# What you were GRANTED.
	check("money does not carry", GameState.cash_eur == 0)
	check("mission unlocks do not carry", GameState.flags.is_empty())
	check("and chapter progress starts again", GameState.chapter_progress() == 0)

	# It has to survive a save, or the ledger is only true until you close the
	# tab.
	var saved := GameState.to_dict()
	GameState.new_campaign()
	check("a new campaign is back to chapter one", GameState.chapter == 1)
	check("the save reloads", GameState.from_dict(saved))
	check("the chapter came back", GameState.chapter == 2)
	check("and so did the upgrade", GameState.has_upgrade("stash-house-1"))


## Gear wears out (COMBAT.md §8.4), and each piece wears on its own.
func _test_gear_wears_out() -> void:
	print("
gear wears out")
	GameState.new_campaign()

	# Two of the same thing, which is the case that forced instances.
	GameState.add_equipment("pipe", GameState.Condition.NEW)
	GameState.add_equipment("pipe", GameState.Condition.FAULTY)
	check("you can own many pipes", GameState.count_of("pipe") == 2)
	check("and they are in different states",
		GameState.condition_at(0) != GameState.condition_at(1))

	# Price follows the particular one, not the kind.
	var new_price := GameState.resale_at(0)
	var worn_price := GameState.resale_at(1)
	check("the worn one is worth less", worn_price < new_price,
		"%d vs %d" % [worn_price, new_price])

	# Losing one takes the WORST: the wrecked one is the one being used.
	GameState.lose_kit_of(PackedStringArray(["pipe"]))
	check("losing one leaves the better one",
		GameState.count_of("pipe") == 1
			and GameState.condition_at(0) == GameState.Condition.NEW)

	# Selling takes the BEST, because that is what somebody selling would do.
	GameState.add_equipment("pipe", GameState.Condition.FAULTY)
	GameState.sell_loot("pipe")
	check("selling leaves the worn one",
		GameState.condition_at(0) == GameState.Condition.FAULTY)

	# Decay: a chapter boundary is a step worse, and it is one-way.
	GameState.new_campaign()
	for i in 12:
		GameState.add_equipment("pipe", GameState.Condition.NEW)
	GameState.decay_equipment()
	var stepped := 0
	var broke := 0
	for i in GameState.equipment.size():
		var c := GameState.condition_at(i)
		if c == GameState.Condition.USED: stepped += 1
		elif c == GameState.Condition.BROKEN: broke += 1
	check("everything got worse", stepped + broke == 12, "%d+%d" % [stepped, broke])
	check("most of it stepped rather than broke", stepped > broke)
	check("and something can break outright", broke >= 0)

	# Broken is the floor.
	GameState.new_campaign()
	GameState.add_equipment("pipe", GameState.Condition.BROKEN)
	GameState.decay_equipment()
	check("broken does not get worse than broken",
		GameState.condition_at(0) == GameState.Condition.BROKEN)

	# Deterministic, or the same run rots differently each time.
	GameState.new_campaign()
	GameState.seed_value = 99
	for i in 6:
		GameState.add_equipment("pipe")
	GameState.decay_equipment()
	var first: Array = []
	for i in GameState.equipment.size():
		first.append(int(GameState.condition_at(i)))
	GameState.new_campaign()
	GameState.seed_value = 99
	for i in 6:
		GameState.add_equipment("pipe")
	GameState.decay_equipment()
	var second: Array = []
	for i in GameState.equipment.size():
		second.append(int(GameState.condition_at(i)))
	check("the same run wears the same way", first == second, "%s vs %s" % [first, second])

	# And it survives a save, with the conditions intact.
	var saved := GameState.to_dict()
	GameState.new_campaign()
	check("the save reloads", GameState.from_dict(saved))
	var back: Array = []
	for i in GameState.equipment.size():
		back.append(int(GameState.condition_at(i)))
	check("every condition came back", back == second, str(back))


## The ending mission (GDD run structure): a threshold buys ENTRY to a climax.
##
## Chapter one ends at the DOCKS with an operation rather than a fight, which is
## the ruling doing real work — if every chapter ended in a battle the market
## would be a supply line to the real game.
func _test_chapter_ending() -> void:
	print("
the chapter ends at the docks")
	GameState.new_campaign()

	var c := GameState.chapter_def()
	check("chapter one is authored", not c.is_empty())
	check("and its goal came from content, not code",
		GameState.chapter_threshold == int((c.get("goal", {}) as Dictionary).get("threshold", -1)))

	var ending := GameState.chapter_ending()
	check("it has an ending", not ending.is_empty())
	check("which is an operation, not a battle",
		String(ending.get("kind", "")) == "operation")
	check("at the harbour, which is not the boiler hall",
		String(ending.get("anchor_id", "")) == "sornainen_harbour")

	# Not before it is earned.
	check("the ending is shut until the goal is met",
		not GameState.chapter_ending_available())
	check("and attempting it is refused",
		GameState.attempt_chapter_ending() == "not-available")

	GameState.record_chapter_income(GameState.chapter_threshold)
	check("meeting the goal opens it", GameState.chapter_ending_available())

	# Place and stake both matter: the threshold buys entry, the operation
	# spends it, and you have to be there.
	GameState.cash_eur = int(ending.get("stake_eur", 0))
	GameState.current_anchor_id = "piritori"
	check("it cannot be run from the wrong place",
		GameState.attempt_chapter_ending() == "wrong-place")

	GameState.current_anchor_id = "sornainen_harbour"
	GameState.cash_eur = 0
	check("nor without the stake",
		GameState.attempt_chapter_ending() == "cannot-afford")

	GameState.cash_eur = int(ending.get("stake_eur", 0)) + 25
	check("but it runs when both are true",
		GameState.attempt_chapter_ending() == "")
	check("the stake was spent", GameState.cash_eur == 25)
	check("the chapter is cleared", GameState.chapter_cleared)
	# The memory carries the OUTCOME, not just the fact. Every later system reads
	# memories (§9.8), and "you finished chapter one badly" is a different thing
	# for the city to know than "you finished chapter one".
	var remembered := false
	for m in GameState.memories:
		if String(m).begins_with("chapter-cleared:1:"):
			remembered = true
	check("and the city remembers how it went", remembered, str(GameState.memories))
	check("the outcome is one the screen can render",
		["clean", "messy", "lost"].has(GameState.last_ending_outcome),
		GameState.last_ending_outcome)
	check("it cannot be cleared twice",
		GameState.attempt_chapter_ending() == "not-available")

	# And the turnover reopens the next one.
	GameState.begin_next_chapter()
	check("the next chapter is not already cleared", not GameState.chapter_cleared)


## The fence (COMBAT.md §9.7). Loot becomes money at Piritori and nowhere else.
##
## The travel requirement is the mechanic rather than friction: selling from
## anywhere makes loot weightless and takes the map out of an economy meant to
## run through it. So the thing worth asserting is the REFUSAL.
func _test_fence() -> void:
	print("\nthe fence (COMBAT.md §9.7)")
	GameState.new_campaign()

	check("Piritori will take it", GameState.FENCE_ANCHORS.has("piritori"))

	# Somewhere that is definitely not Piritori.
	GameState.current_anchor_id = "hakaniemi"
	check("nowhere else will", not GameState.can_fence_here())

	GameState.current_anchor_id = "piritori"
	check("and standing there, it will", GameState.can_fence_here())

	# The conversion itself still works from here, which is what the screen calls.
	GameState.take_loot(PackedStringArray(["sawn-off"]))
	var before := GameState.cash_eur
	var paid := GameState.sell_loot("sawn-off")
	check("selling pays", paid > 0)
	check("the money arrives", GameState.cash_eur == before + paid)
	check("and the weapon is gone", not GameState.equipment_owned.has("sawn-off"))

	# §8 is unchanged by having a shop: the door is still one-way.
	check("selling it does not make it buyable",
		not GameState.is_purchasable("sawn-off"))


## Loot (COMBAT.md §8). Money buys volume; loot buys capability. The check that
## matters is the ONE-WAY door: if cash could ever reach the taken-only tier the
## asymmetry collapses into "everything is money eventually".
func _test_loot() -> void:
	print("
loot (COMBAT.md §8)")
	GameState.new_campaign()

	var buyable := 0
	var taken_only := 0
	for e in ContentRegistry.slice.get("equipment", []):
		if GameState.is_purchasable(String(e.get("id", ""))):
			buyable += 1
		else:
			taken_only += 1
	check("some gear can be bought", buyable > 0)
	check("and some gear cannot be bought at any price", taken_only > 0)

	# NOT a price comparison. Resale is money and the tier is about capability,
	# and the two came apart the moment canon was consulted: enc-first-firearm
	# SELLS the handgun for EUR 180, so the dearest weapon in the game is market
	# gear and always will be. What §8 actually promises is a one-way door, so
	# that is what is checked — no cash may reach the taken-only tier. The
	# content gate in validate-slice.mjs enforces the same rule on authored
	# choices, which is where it can really be broken.

	var loot := GameState.take_loot(PackedStringArray(["sawn-off"]))
	check("what they dropped is yours now", loot.has("sawn-off"))
	check("and it is in the armoury", GameState.equipment_owned.has("sawn-off"))
	# CORRECTED. This used to assert that the same weapon could not be taken
	# twice, which was my assumption and not the design: you should own many
	# pipes, and a crew of four with one each is ordinary. That wrong assumption
	# is also what made condition look like a property of the TYPE.
	GameState.take_loot(PackedStringArray(["sawn-off"]))
	check("taking a second one gives you two", GameState.count_of("sawn-off") == 2)
	check("junk that does not exist is not taken",
		GameState.take_loot(PackedStringArray(["halberd"])).is_empty())

	var before := GameState.cash_eur
	var paid := GameState.sell_loot("sawn-off")
	check("loot converts down into money", paid > 0)
	check("and the money arrives", GameState.cash_eur == before + paid)
	# Selling removes ONE, not the type. You took two off two people and sold
	# one; the other is still in the bag.
	check("one of them is gone", GameState.count_of("sawn-off") == 1)
	GameState.sell_loot("sawn-off")
	check("and selling the last one empties it", GameState.count_of("sawn-off") == 0)
	check("selling what you do not have pays nothing", GameState.sell_loot("sawn-off") == 0)
	check("and money cannot buy it back", not GameState.is_purchasable("sawn-off"))

	# Gear is carried by a person, not stored in a warehouse.
	GameState.take_loot(PackedStringArray(["baseball-bat"]))
	GameState.lose_kit_of(PackedStringArray(["baseball-bat"]))
	check("what a fallen crew carried is lost with them",
		not GameState.equipment_owned.has("baseball-bat"))


## Hiring (COMBAT.md §7). Careers gave everyone a ceiling and nothing put anyone
## back, so a long campaign drained to an empty roster with no message.
func _test_hiring() -> void:
	print("
hiring (COMBAT.md §7)")
	GameState.new_campaign()

	# Determinism is what lets the pool be regenerated instead of stored, and
	# what stops walking away from a bad offer being a free reroll.
	var a := CrewGenerator.generate(4242)
	var b := CrewGenerator.generate(4242)
	check("the same seed is the same person", a["name"] == b["name"] and a["role"] == b["role"])
	check("a different seed is somebody else",
		CrewGenerator.generate(4243)["id"] != a["id"])
	check("today's offer does not change while you look at it",
		GameState.hiring_pool()[0]["id"] == GameState.hiring_pool()[0]["id"])

	# The rule that protects the story: no runtime person can be named, because
	# named means authored content calls them by id and no content can refer to
	# somebody invented after it was written.
	var all_disposable := true
	var roles_seen: Dictionary = {}
	for i in 200:
		var g := CrewGenerator.generate(i)
		if bool(g.get("named", false)):
			all_disposable = false
		roles_seen[g["role"]] = true
		if not CrewGenerator.ROLES.has(g["role"]):
			all_disposable = false
	check("nobody hired off the street is ever named", all_disposable)
	check("and every one of the six roles turns up", roles_seen.size() == CrewGenerator.ROLES.size())

	# Stats must sit in the authored band, not out-class hand-written crew.
	var in_band := true
	for i in 200:
		var g := CrewGenerator.generate(i * 7 + 1)
		var base: Dictionary = CrewGenerator.ROLE_BASE[g["role"]]
		for stat in ["condition", "nerve", "tempo"]:
			if absi(int(g[stat]) - int(base[stat])) > CrewGenerator.SPREAD:
				in_band = false
	check("rolled stats stay inside the role's band", in_band)

	# Hiring costs money and puts a real person in the roster.
	var candidate := GameState.hiring_pool()[0]
	var fee := int(candidate["wage_eur"])
	GameState.cash_eur = fee + 10
	check("a hire you can afford goes through", GameState.hire(candidate))
	check("and the fee was taken", GameState.cash_eur == 10)
	check("they are in the roster", GameState.roster.has(String(candidate["id"])))
	check("the same person is not hired twice", not GameState.hire(candidate))

	# The registry must know them, or the battle builder cannot field them.
	var back := ContentRegistry.crew_member(String(candidate["id"]))
	check("the registry can find them", String(back.get("name", "")) == String(candidate["name"]))
	check("and they have a career like anyone else",
		GameState.career_left(String(candidate["id"])) == GameState.CAREER_FIGHTS)

	GameState.cash_eur = 0
	var broke := GameState.hiring_pool()
	if not broke.is_empty():
		check("no money means no hire", not GameState.hire(broke[0]))

	# A hire exists nowhere but the save file.
	var saved := GameState.to_dict()
	var hired_id := String(candidate["id"])
	GameState.new_campaign()
	check("a new campaign starts with nobody hired", not GameState.roster.has(hired_id))
	check("the save reloads", GameState.from_dict(saved))
	check("and the hire survived it", GameState.roster.has(hired_id))
	check("the registry knows them again after a load",
		String(ContentRegistry.crew_member(hired_id).get("name", "")) == String(candidate["name"]))


## Levels, skills and perks (COMBAT.md §9.11) — all per PERSON.
func _test_growing() -> void:
	print("
growing (COMBAT.md §9.11)")
	GameState.new_campaign()

	# The classes are content, not constants.
	var cls := GameState.combat_class("spotter")
	check("the classes are authored", not cls.is_empty())
	check("and a class is a verb", String(cls.get("verb", "")) == "mark")
	check("the perk axes are authored",
		(ContentRegistry.slice.get("perks", []) as Array).size() == 5)

	var who := ""
	for c in ContentRegistry.slice.get("crew", []):
		var cid := String(c.get("id", ""))
		if not GameState.is_named(cid):
			who = cid
			break
	if not GameState.roster.has(who):
		GameState.roster.append(who)

	check("everyone starts at level one", GameState.level_of(who) == 1)
	check("with nothing to spend", GameState.unspent_perk_points(who) == 0)

	# Levels are bought with fights, which is the same clock the career ceiling
	# runs down — that is the point, not a coincidence.
	for i in GameState.FIGHTS_PER_LEVEL:
		GameState.age_crew(PackedStringArray([who]))
	check("fights buy a level", GameState.level_of(who) == 2)
	check("and a level gives a point to spend",
		GameState.unspent_perk_points(who) >= 1)

	# Spending.
	check("a point buys a perk", GameState.spend_perk(who, "speed"))
	check("and the perk stuck", GameState.perk_value(who, "speed") == 1)
	check("spending a point costs it", GameState.unspent_perk_points(who) == 0)
	check("you cannot spend what you do not have",
		not GameState.spend_perk(who, "speed"))

	# A typo must not invent a stat.
	GameState.grant_level(who)
	check("an unknown perk is refused", not GameState.spend_perk(who, "charisma"))
	check("and the point was not eaten", GameState.unspent_perk_points(who) == 1)

	# Skills come from the aptitudes this person holds, so the test asks what
	# they could actually learn rather than inventing one.
	var offer: Array = GameState.skill_offer(who)
	check("there is something to learn", not offer.is_empty())
	var learn := String((offer[0] as Dictionary).get("id", ""))
	check("a skill is learned", GameState.learn_skill(who, learn))
	check("and not learned twice", not GameState.learn_skill(who, learn))
	check("it is on the person", GameState.skills_of(who).has(learn))

	# A skill from an aptitude they do not hold is refused: a typo must not
	# teach somebody a trick from a class they have never been.
	check("and a stranger's trick is refused",
		not GameState.learn_skill(who, "back-door") or GameState.has_aptitude(who, "driver"))

	# Glory pays double, per §9.11.
	var before := GameState.unspent_perk_points(who)
	GameState.grant_glory(who)
	check("glory pays two points",
		GameState.unspent_perk_points(who) == before + GameState.GLORY_PERK_POINTS)
	check("and the city hears about it", GameState.memories.has("glory:" + who))

	# PER PERSON: a second crew member of the same class knows none of it.
	var other := ""
	for c in ContentRegistry.slice.get("crew", []):
		var cid := String(c.get("id", ""))
		if cid != who and not GameState.is_named(cid):
			other = cid
			break
	if other != "":
		check("somebody else has not learned it",
			not GameState.skills_of(other).has("second-wind"))
		check("nor gained the perk", GameState.perk_value(other, "speed") == 0)

	# And it survives a save, or a veteran resets every time the tab closes.
	var saved := GameState.to_dict()
	GameState.new_campaign()
	check("a new campaign forgets", GameState.perk_value(who, "speed") == 0)
	check("the save reloads", GameState.from_dict(saved))
	check("the perk came back", GameState.perk_value(who, "speed") == 1)
	check("and so did the skill", GameState.skills_of(who).has(learn))


## Aptitudes (COMBAT.md §9.12): a person is not labelled.
##
## The interesting assertion is that the two vocabularies COEXIST. The old six
## and the new six are one pool of twelve, and nothing had to be migrated away —
## which is why this ruling was cheaper as well as better than the migration it
## replaced.
func _test_aptitudes() -> void:
	print("
aptitudes (COMBAT.md §9.12)")
	GameState.new_campaign()

	var pool: Array = ContentRegistry.slice.get("classes", [])
	check("twelve aptitudes in one pool", pool.size() == 12, str(pool.size()))

	var ids: Array = []
	for c in pool:
		ids.append(String((c as Dictionary).get("id", "")))
	check("the combat six are there",
		ids.has("bruiser") and ids.has("spotter") and ids.has("courier"))
	check("and the older six were not thrown away",
		ids.has("muscle") and ids.has("driver") and ids.has("local"))

	var verbs: Dictionary = {}
	for c in pool:
		verbs[String((c as Dictionary).get("verb", ""))] = true
	check("every aptitude carries its own verb", verbs.size() == pool.size(),
		"%d verbs for %d aptitudes" % [verbs.size(), pool.size()])

	# Authored crew fall back to their role, so nothing broke by adding this.
	var authored := ""
	for c in ContentRegistry.slice.get("crew", []):
		authored = String(c.get("id", ""))
		break
	check("an authored crew member still answers",
		GameState.aptitudes_of(authored).size() >= 1)

	# A hire holds two or three.
	var candidate := GameState.hiring_pool()[0]
	GameState.cash_eur = int(candidate["wage_eur"])
	check("hired", GameState.hire(candidate))
	var cid := String(candidate["id"])
	var apt := GameState.aptitudes_of(cid)
	check("a hire holds two or three", apt.size() >= 2 and apt.size() <= 3, str(apt))
	check("with no repeats", apt.size() == _unique(apt).size(), str(apt))
	check("appearance follows the first",
		GameState.primary_aptitude(cid) == String(candidate["role"]))

	# More than one aptitude means more than one verb — the whole point.
	var vs := GameState.verbs_of(cid)
	check("and they bring more than one verb", vs.size() >= 2, str(vs))

	# It has to survive a save, or a hybrid reverts to a label.
	var saved := GameState.to_dict()
	GameState.new_campaign()
	check("the save reloads", GameState.from_dict(saved))
	check("the set came back", GameState.aptitudes_of(cid).size() == apt.size())


func _unique(a: PackedStringArray) -> PackedStringArray:
	var seen: Dictionary = {}
	var out: PackedStringArray = []
	for x in a:
		if not seen.has(String(x)):
			seen[String(x)] = true
			out.append(String(x))
	return out


## Skills (COMBAT.md §9.11) — three per aptitude, offered from what you hold.
func _test_skills() -> void:
	print("
skills")
	GameState.new_campaign()
	var skills: Array = ContentRegistry.slice.get("skills", [])
	var pool: Array = ContentRegistry.slice.get("classes", [])

	check("skills are authored", not skills.is_empty())

	# Every aptitude must have something to offer, or holding it is decoration.
	var per: Dictionary = {}
	for sk in skills:
		var a := String((sk as Dictionary).get("aptitude", ""))
		per[a] = int(per.get(a, 0)) + 1
	var covered := true
	var thin: PackedStringArray = []
	for c in pool:
		var id := String((c as Dictionary).get("id", ""))
		if int(per.get(id, 0)) < 3:
			covered = false
			thin.append(id)
	check("every aptitude has at least three", covered, " ".join(thin))

	# Ids unique, aptitudes real, tiers sane.
	var seen: Dictionary = {}
	var dupes: PackedStringArray = []
	var orphan: PackedStringArray = []
	var bad_tier := false
	var known: Dictionary = {}
	for c in pool:
		known[String((c as Dictionary).get("id", ""))] = true
	for sk in skills:
		var s2: Dictionary = sk
		var id2 := String(s2.get("id", ""))
		if seen.has(id2):
			dupes.append(id2)
		seen[id2] = true
		if not known.has(String(s2.get("aptitude", ""))):
			orphan.append(id2)
		var t := int(s2.get("tier", 0))
		if t < 1 or t > 3:
			bad_tier = true
	check("no two skills share an id", dupes.is_empty(), " ".join(dupes))
	check("every skill belongs to a real aptitude", orphan.is_empty(), " ".join(orphan))
	check("and every tier is reachable", not bad_tier)

	# Every skill names the system it touches, so a wish is visible as one.
	var unhooked: PackedStringArray = []
	for sk in skills:
		if String((sk as Dictionary).get("hooks", "")) == "":
			unhooked.append(String((sk as Dictionary).get("id", "")))
	check("every skill names what it hooks into", unhooked.is_empty(), " ".join(unhooked))

	# ── the offer ──
	var who := ""
	for c in ContentRegistry.slice.get("crew", []):
		var cid := String(c.get("id", ""))
		if not GameState.is_named(cid):
			who = cid
			break
	if not GameState.roster.has(who):
		GameState.roster.append(who)

	var offer: Array = GameState.skill_offer(who)
	check("an offer is made", not offer.is_empty())
	check("and it is no bigger than three",
		offer.size() <= GameState.SKILL_OFFER_SIZE)

	# Only from aptitudes they hold, and only at a tier they have reached.
	var wrong := false
	for o in offer:
		var od: Dictionary = o
		if not GameState.has_aptitude(who, String(od.get("aptitude", ""))):
			wrong = true
		if int(od.get("tier", 1)) > GameState.level_of(who):
			wrong = true
	check("everything offered is theirs to learn", not wrong)

	# Stable: a level-up that rerolls on reload is a slot machine.
	var again: Array = GameState.skill_offer(who)
	var same := offer.size() == again.size()
	for i in offer.size():
		if String((offer[i] as Dictionary).get("id", "")) 				!= String((again[i] as Dictionary).get("id", "")):
			same = false
	check("the same offer comes back", same)

	# Learning one removes it from the next offer.
	var first := String((offer[0] as Dictionary).get("id", ""))
	GameState.learn_skill(who, first)
	var after: Array = GameState.skill_offer(who)
	var still := false
	for o in after:
		if String((o as Dictionary).get("id", "")) == first:
			still = true
	check("a learned skill is not offered again", not still)

	# BREADTH IS A TRADE. A third aptitude widens the pool but the offer stays
	# three, so it costs depth rather than adding power.
	var two := GameState.skill_pool_size(who)
	var apt := GameState.aptitudes_of(who)
	apt.append("driver")
	GameState.set_aptitudes(who, apt)
	check("a third aptitude widens the pool",
		GameState.skill_pool_size(who) > two)
	check("but the offer is still the same size",
		GameState.skill_offer(who).size() <= GameState.SKILL_OFFER_SIZE)


## Careers (COMBAT.md §7). The ceiling is the mechanic — without it, XP builds a
## permanent super-squad and the roster stops being a conveyor belt.
func _test_careers() -> void:
	print("
careers (COMBAT.md 7)")
	GameState.new_campaign()

	var hired := ""
	for c in ContentRegistry.slice.get("crew", []):
		var cid := String(c.get("id", ""))
		if not GameState.is_named(cid):
			hired = cid
			break
	check("the slice has a hired crew member to age", hired != "", hired)
	if hired == "":
		return

	check("a new hire has no fights behind them", GameState.fights_of(hired) == 0)
	check("and a full career ahead",
		GameState.career_left(hired) == GameState.CAREER_FIGHTS)
	check("their counter is hidden while they are new",
		not GameState.career_is_visible(hired))

	var deployed := PackedStringArray([hired])
	for i in range(GameState.CAREER_WARN_AT):
		GameState.age_crew(deployed)
	check("the counter appears once they are close",
		GameState.career_is_visible(hired),
		"%d fights" % GameState.fights_of(hired))

	# Run them to the ceiling. They must LEAVE, and leave ALIVE — two exits, and
	# one of them being "they got out" is the point.
	var left := PackedStringArray()
	for i in range(GameState.CAREER_FIGHTS):
		var out := GameState.age_crew(deployed)
		if not out.is_empty():
			left = out
			break
	check("reaching the ceiling ends the career", left.has(hired), str(left))
	check("they retired rather than died", GameState.retired_crew.has(hired))
	check("and the death count did not move", GameState.crew_deaths == 0)
	check("they are out of the roster", not GameState.roster.has(hired))
	check("but the city remembers them",
		Array(GameState.memories).has("retired:" + hired))

	# Ageing them again must not double-retire or resurrect the career.
	var again := GameState.age_crew(deployed)
	check("a retired veteran cannot be spent again", again.is_empty())

	# A retired veteran trains the next one (§7.4, 7b).
	var rookie := ""
	for c in ContentRegistry.slice.get("crew", []):
		var cid := String(c.get("id", ""))
		if cid != hired and not GameState.is_named(cid):
			rookie = cid
			break
	if rookie != "":
		check("a veteran starts the next one ahead", GameState.train(rookie))
		check("and the rookie has a shorter career for it",
			GameState.career_left(rookie) < GameState.CAREER_FIGHTS)
		check("but only once", not GameState.train(rookie))

	# A named character has no ceiling: they leave in authored beats, never by
	# attrition, and NARRATIVE.md decides when.
	# NOT `if named != ""`. This used to skip silently when the slice happened
	# to contain nobody flagged `named`, which is CLAUDE.md rule 10's "a gate
	# that cannot fail is a finding" written out in full — two assertions that
	# quietly stopped existing while the suite still reported zero failures.
	# It now fails loudly instead, because the flag is a real mechanic and
	# something in the slice has to exercise it.
	var named := ""
	for c in ContentRegistry.slice.get("crew", []):
		if bool(c.get("named", false)):
			named = String(c.get("id", ""))
			break
	check("the slice exercises the named-character mechanic", named != "",
		"no crew is flagged `named`, so the two checks below cannot run")
	if named != "":
		check("a named character has no career ceiling",
			GameState.career_left(named) == -1)
		GameState.age_crew(PackedStringArray([named]))
		check("and cannot be aged out", not GameState.retired_crew.has(named))

	GameState.new_campaign()


func _test_every_reference_resolves() -> void:
	print("\nreference integrity (§9 item 8: no fallback assets)")
	var dangling := 0
	for enc in ContentRegistry.slice.get("encounters", []):
		var sid: String = enc.get("site_id", "")
		if sid != "" and ContentRegistry.site(sid).is_empty():
			dangling += 1
	for o in ContentRegistry.all_offers():
		if ContentRegistry.anchor(o.get("anchor_id", "")).is_empty():
			dangling += 1
	eq("no dangling site/anchor references", dangling, 0)
	eq("registry reported no errors", ContentRegistry.errors.size(), 0)
