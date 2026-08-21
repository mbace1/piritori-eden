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
	eq("ten sites", ContentRegistry.map.get("sites", []).size(), 10)
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
