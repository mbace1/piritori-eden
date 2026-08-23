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
	_test_loot()
	_test_fence()
	_test_arrest()
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
	eq("twelve anchors", ContentRegistry.anchors().size(), 12)
	eq("twenty-two edges", ContentRegistry.edges().size(), 22)
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
	check("the same weapon is not taken twice",
		GameState.take_loot(PackedStringArray(["sawn-off"])).is_empty())
	check("junk that does not exist is not taken",
		GameState.take_loot(PackedStringArray(["halberd"])).is_empty())

	var before := GameState.cash_eur
	var paid := GameState.sell_loot("sawn-off")
	check("loot converts down into money", paid > 0)
	check("and the money arrives", GameState.cash_eur == before + paid)
	check("the weapon is gone with it", not GameState.equipment_owned.has("sawn-off"))
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
	var named := ""
	for c in ContentRegistry.slice.get("crew", []):
		if bool(c.get("named", false)):
			named = String(c.get("id", ""))
			break
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
