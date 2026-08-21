extends Node
## GameState — the one serialisable campaign model.
##
## GODOT_HANDOFF.md §4: "GameState owns one serialisable campaign model. Scenes
## emit commands and render state; they do not keep parallel cash, stock,
## relationship or time values."
##
## Every number here is seeded from content/era1-slice-v1.json's
## campaign.starting_state. Nothing is invented in this file.
##
## Determinism (§8): the clock is an integer block index, never a float dt, and
## randomness runs off a stored seed so a saved run reproduces.

signal state_changed
signal block_advanced(day: int, block: String)
signal encounter_resolved(encounter_id: String, choice_id: String)
signal slice_completed
## A scene asked for a battle. The shell opens it; the model never draws.
signal battle_requested(battle_id: String, negotiation_open: bool)
signal ending_resolved(ending_id: String)

const SCHEMA_VERSION := 2

## Era I interface lock (SCREEN_AND_COMBAT_BASELINE): the fixed historical rate.
const MARKKA_PER_EURO := 5.94573

# ── campaign clock: integer blocks, day/night ─────────────────────────────
var day: int = 1
var block_index: int = 0          ## 0-based index into the whole slice, 0..13
var blocks_per_day: PackedStringArray = ["day", "night"]
var total_blocks: int = 14

# ── economy ────────────────────────────────────────────────────────────────
var cash_eur: int = 0
var markka_mk: int = 0
var debt_eur: int = 0
var stock: Dictionary = {}
var capacity: int = 0
var intel: int = 0
var exit_fund_eur: int = 0

# ── standing ───────────────────────────────────────────────────────────────
var city_harm: String = "low"
var local_pressure: Dictionary = {}
var relationships: Dictionary = {}
var market_history: PackedStringArray = []
var debt_holder_memory: PackedStringArray = []

# ── progression ────────────────────────────────────────────────────────────
var flags: Dictionary = {}          ## flag name -> true
var roster: PackedStringArray = []          ## recruited crew ids
var temporary_crew: PackedStringArray = []  ## crew on loan for one job
var equipment_owned: PackedStringArray = [] ## equipment granted by play
var mission_state: Dictionary = {}          ## mission id -> complete|partial|failed
var obligations: Dictionary = {}            ## faction -> owed favours
var memories: PackedStringArray = []        ## authored remembered moments
var services: Dictionary = {}               ## service id -> disruption
var crew_outcomes: PackedStringArray = []   ## wound risks carried out of a scene
var battle_modifiers: Dictionary = {}       ## battle id -> {opponent_nerve}
var ending_id: String = ""                  ## authored ending, once resolved
## Crew lost permanently. GDD §13.10: downed is not death; death needs a lethal
## condition AND follow-through, set in Aftermath only.
##
## The slice has exactly one path to it, in battle-courtyard-3v3: "Only an
## unresolved, clearly flagged critical wound at the final settlement can become
## death", with stated mitigations and "no hidden death roll". So a critical
## wound left unresolved when the slice settles kills; anything resolved does
## not; and nothing else in Era I can raise this.
var crew_deaths: int = 0
var revealed: Dictionary = {}       ## content id -> true
var resolved_encounters: Dictionary = {}  ## encounter id -> choice id
var current_anchor_id: String = ""

# ── determinism ────────────────────────────────────────────────────────────
var seed_value: int = 0
var content_package_id: String = ""
var _rng := RandomNumberGenerator.new()


func _ready() -> void:
	if ContentRegistry.errors.is_empty():
		new_campaign()


## Reset to the slice's authored starting state.
func new_campaign(with_seed: int = 0) -> void:
	var campaign: Dictionary = ContentRegistry.campaign()
	var start: Dictionary = campaign.get("starting_state", {})

	day = 1
	block_index = 0
	blocks_per_day = PackedStringArray(campaign.get("blocks_per_day", ["day", "night"]))
	total_blocks = int(campaign.get("total_player_blocks", 14))

	cash_eur = int(start.get("cash_eur", 0))
	markka_mk = int(start.get("markka_mk", 0))
	debt_eur = int(start.get("debt_eur", 0))
	stock = (start.get("stock", {}) as Dictionary).duplicate(true)
	capacity = int(start.get("capacity", 0))
	intel = int(start.get("intel", 0))
	exit_fund_eur = int(start.get("exit_fund_eur", 0))

	city_harm = String(start.get("city_harm", "low"))
	local_pressure = (start.get("local_pressure", {}) as Dictionary).duplicate(true)
	relationships = (start.get("relationships", {}) as Dictionary).duplicate(true)
	market_history = PackedStringArray()
	debt_holder_memory = PackedStringArray()

	flags = {}
	roster = PackedStringArray()
	temporary_crew = PackedStringArray()
	equipment_owned = PackedStringArray()
	mission_state = {}
	obligations = {}
	memories = PackedStringArray()
	services = {}
	crew_outcomes = PackedStringArray()
	battle_modifiers = {}
	ending_id = ""
	crew_deaths = 0
	revealed = {}
	resolved_encounters = {}
	current_anchor_id = String(campaign.get("start_anchor_id", ""))

	content_package_id = String(ContentRegistry.slice.get("id", ""))
	seed_value = with_seed if with_seed != 0 else 20030101
	_rng.seed = seed_value

	# Handoff §2: "Piritori selected as the only live first lead". The slice
	# schedules exactly one encounter per block, so the opening reveal is the
	# day 1 / day entry — NOT every encounter that happens to share the site.
	# (piritori_first_buy also hosts the day 5 firearm encounter.)
	var start_site: String = String(campaign.get("start_site_id", ""))
	if start_site != "":
		revealed[start_site] = true
	_reveal_scheduled_block(1, "day")

	state_changed.emit()


# ── the clock ──────────────────────────────────────────────────────────────

func current_block() -> String:
	return blocks_per_day[block_index % blocks_per_day.size()]


func is_slice_complete() -> bool:
	return block_index >= total_blocks


## Spend one Day/Night block. Nightly settlement is applied on entering night.
func advance_block() -> void:
	if is_slice_complete():
		return
	block_index += 1
	day = (block_index / blocks_per_day.size()) + 1

	if not is_slice_complete():
		if current_block() == "night":
			_apply_nightly_settlement()
		_reveal_scheduled_block(day, current_block())
		block_advanced.emit(day, current_block())
	else:
		_apply_final_settlement()
		slice_completed.emit()
	state_changed.emit()


## The final settlement, per battle-courtyard-3v3's casualty table: an
## unresolved critical wound becomes a death here and only here. Telegraphed,
## never rolled.
func _apply_final_settlement() -> void:
	var unresolved := 0
	for o in crew_outcomes:
		if String(o) == "critical-wound-possible":
			unresolved += 1
	crew_deaths += unresolved


## Critical wounds still open. The UI must show this before the last block, so
## "spend-treatment" and "assign-fixer" remain real choices.
func open_critical_wounds() -> int:
	var n := 0
	for o in crew_outcomes:
		if String(o) == "critical-wound-possible":
			n += 1
	return n


func _apply_nightly_settlement() -> void:
	var settlement: Dictionary = ContentRegistry.campaign().get("settlement", {})
	var interest := int(settlement.get("nightly_interest_eur", 0))
	if interest != 0:
		debt_eur += interest


## Reveal the encounter the slice schedules for this block, and its site.
func _reveal_scheduled_block(d: int, b: String) -> void:
	var entry := ContentRegistry.scheduled_for(d, b)
	if entry.is_empty():
		return
	var eid := String(entry.get("encounter_id", ""))
	if eid == "":
		return
	revealed[eid] = true
	var enc := ContentRegistry.encounter(eid)
	var sid := String(enc.get("site_id", ""))
	if sid != "":
		revealed[sid] = true


## An encounter is playable once its scheduled block has arrived and it has not
## been resolved. A deferred encounter stays reachable rather than soft-locking
## (see enc-first-purchase's authored "fallback").
func is_encounter_available(encounter_id: String) -> bool:
	if not is_revealed(encounter_id) or is_resolved(encounter_id):
		return false
	var entry := ContentRegistry.schedule_of_encounter(encounter_id)
	if entry.is_empty():
		return true
	var due := ContentRegistry.block_ordinal(
		int(entry.get("day", 1)), String(entry.get("block", "day")))
	return due <= block_index


## Encounters playable right now at one anchor.
func available_encounters_at(anchor_id: String) -> Array:
	var out: Array = []
	for site in ContentRegistry.sites_for_anchor(anchor_id):
		for enc in ContentRegistry.encounters_at_site(site["id"]):
			if is_encounter_available(enc["id"]):
				out.append(enc)
	return out


# ── requirements and effects: the canonical grammar ───────────────────────

## Evaluate a requirement string from the slice, e.g. "cash>=45".
func meets_requirement(req: String) -> bool:
	var s := req.strip_edges()
	for op in [">=", "<=", ">", "<", "=="]:
		var idx := s.find(op)
		if idx > 0:
			var lhs := s.substr(0, idx).strip_edges()
			var rhs := s.substr(idx + op.length()).strip_edges()
			var left := _read_value(lhs)
			var right := int(rhs) if rhs.is_valid_int() else _read_value(rhs)
			match op:
				">=": return left >= right
				"<=": return left <= right
				">": return left > right
				"<": return left < right
				"==": return left == right
	# A bare token is a flag test.
	return flags.get(s, false)


func meets_all(reqs: Array) -> bool:
	for r in reqs:
		if not meets_requirement(String(r)):
			return false
	return true


func _read_value(token: String) -> int:
	match token:
		"cash": return cash_eur
		"markka": return markka_mk
		"debt": return debt_eur
		"intel": return intel
		"capacity": return capacity
		"exit_fund", "exit-fund": return exit_fund_eur
		"surviving-crew": return surviving_crew()
		"crew-deaths": return crew_deaths
		"day": return day
		_:
			if token.begins_with("stock:"):
				return int(stock.get(token.substr(6), 0))
			if stock.has(token):
				return int(stock[token])
			return 0


## Apply one canonical effect string. Recognised forms:
##   cash:-45  cash:+23        stock:piri:+1
##   intel:+1                  reveal:<id>
##   flag:<name>               relationship:<id>:-1
##   pressure:<anchor>:+1      market-history:<anchor>
##   debt-holder-memory:<note> capacity:+1
func apply_effect(effect: String) -> void:
	var parts := effect.strip_edges().split(":")
	if parts.is_empty():
		return
	var head := parts[0]

	match head:
		"cash":
			cash_eur += _delta(parts, 1)
		"markka":
			markka_mk += _delta(parts, 1)
		"debt":
			debt_eur += _delta(parts, 1)
		"intel":
			intel += _delta(parts, 1)
		"capacity":
			capacity += _delta(parts, 1)
		"exit_fund", "exit-fund":
			exit_fund_eur += _delta(parts, 1)
		"stock":
			if parts.size() >= 3:
				var product_id := parts[1]
				stock[product_id] = int(stock.get(product_id, 0)) + _delta(parts, 2)
		"reveal":
			if parts.size() >= 2:
				revealed[":".join(_tail(parts, 1))] = true
		"flag":
			if parts.size() >= 2:
				flags[":".join(_tail(parts, 1))] = true
		"relationship":
			if parts.size() >= 3:
				var who := parts[1]
				relationships[who] = int(relationships.get(who, 0)) + _delta(parts, 2)
		"pressure":
			if parts.size() >= 3:
				local_pressure[parts[1]] = _step_pressure(String(local_pressure.get(parts[1], "low")), _delta(parts, 2))
		"market-history":
			if parts.size() >= 2 and not market_history.has(parts[1]):
				market_history.append(parts[1])
		"debt-holder-memory":
			if parts.size() >= 2:
				debt_holder_memory.append(parts[1])
		"city-harm":
			if parts.size() >= 2:
				city_harm = parts[1]
		"equipment":
			if parts.size() >= 2:
				var eq := parts[1].lstrip("+")
				if not equipment_owned.has(eq):
					equipment_owned.append(eq)
		"recruit":
			if parts.size() >= 2 and not roster.has(parts[1]):
				roster.append(parts[1])
				revealed[parts[1]] = true
		"recruit-temporary":
			if parts.size() >= 2 and not temporary_crew.has(parts[1]):
				temporary_crew.append(parts[1])
				revealed[parts[1]] = true
		"complete", "partial", "fail":
			if parts.size() >= 2:
				var outcome := "complete"
				if head == "partial":
					outcome = "partial"
				elif head == "fail":
					outcome = "failed"
				mission_state[parts[1]] = outcome
		"convert-markka":
			# Era I lock: the fixed historical rate, 5.94573 markka to one euro.
			if parts.size() >= 2:
				var amount := markka_mk
				if parts[1] != "all":
					amount = mini(int(parts[1]), markka_mk)
				if amount > 0:
					markka_mk -= amount
					cash_eur += int(floor(float(amount) / MARKKA_PER_EURO))
		"obligation":
			if parts.size() >= 3:
				obligations[parts[1]] = int(obligations.get(parts[1], 0)) + _delta(parts, 2)
		"memory":
			if parts.size() >= 2 and not memories.has(parts[1]):
				memories.append(parts[1])
		"service":
			if parts.size() >= 3:
				services[parts[1]] = parts[2]
		"crew-outcome":
			if parts.size() >= 2:
				crew_outcomes.append(parts[1])
		"resolve-critical-wound":
			var idx := crew_outcomes.find("critical-wound-possible")
			if idx >= 0:
				crew_outcomes.remove_at(idx)
		"start-battle", "start-negotiation":
			if parts.size() >= 2:
				flags["pending-battle"] = parts[1]
				battle_requested.emit(parts[1], head == "start-negotiation")
		"battle-on-failure":
			# Armed, not fired: the mission's failure path asks for it.
			if parts.size() >= 2:
				flags["battle-on-failure:" + parts[1]] = true
		"battle":
			if parts.size() >= 2:
				flags["battle-" + parts[1]] = true
		"opponent-nerve":
			if parts.size() >= 2:
				var pending := String(flags.get("pending-battle", ""))
				var mods: Dictionary = battle_modifiers.get(pending, {})
				mods["opponent_nerve"] = int(mods.get("opponent_nerve", 0)) + _delta(parts, 1)
				battle_modifiers[pending] = mods
		"resolve":
			if parts.size() >= 2:
				flags["resolved:" + parts[1]] = true
		"resolve-ending":
			resolve_ending()
		"mccormick-family":
			if parts.size() >= 2:
				relationships["mccormick_family"] = int(
					relationships.get("mccormick_family", 0)) + 1
				flags["mccormick-" + parts[1]] = true
		_:
			push_warning("GameState: unrecognised effect '%s'" % effect)

	state_changed.emit()


func apply_effects(effects: Array) -> void:
	for e in effects:
		apply_effect(String(e))


func _tail(parts: PackedStringArray, from: int) -> PackedStringArray:
	var out := PackedStringArray()
	for i in range(from, parts.size()):
		out.append(parts[i])
	return out


func _delta(parts: PackedStringArray, idx: int) -> int:
	if idx >= parts.size():
		return 0
	return int(parts[idx])


const PRESSURE_LADDER := ["low", "watchful", "raised", "high", "hostile"]

func _step_pressure(current: String, delta: int) -> String:
	var i := PRESSURE_LADDER.find(current)
	if i < 0:
		i = 0
	return PRESSURE_LADDER[clampi(i + delta, 0, PRESSURE_LADDER.size() - 1)]


# ── encounters ─────────────────────────────────────────────────────────────

func is_revealed(id: String) -> bool:
	return revealed.get(id, false)


func is_resolved(encounter_id: String) -> bool:
	return resolved_encounters.has(encounter_id)


## Resolve an encounter choice: check requirements, apply effects, spend a block.
func resolve_encounter(encounter_id: String, choice_id: String) -> bool:
	var enc: Dictionary = ContentRegistry.encounter(encounter_id)
	if enc.is_empty():
		return false
	for choice in enc.get("choices", []):
		if choice.get("id", "") != choice_id:
			continue
		if not meets_all(choice.get("requirements", [])):
			return false
		apply_effects(choice.get("effects", []))
		resolved_encounters[encounter_id] = choice_id
		encounter_resolved.emit(encounter_id, choice_id)
		advance_block()
		return true
	return false


## Crew on the roster and not lost. Everyone recruited counts; the slice has
## no removal path yet, and inventing one would be inventing consequence.
func surviving_crew() -> int:
	return maxi(roster.size() - crew_deaths, 0)


## Pick the authored ending whose requirements the run actually meets.
##
## "resolve-ending:best-match" is the slice's own instruction. The endings are
## authored in order of specificity, so the FIRST full match wins and nothing is
## invented. If none match that is a finding, not a silent pass.
func resolve_ending() -> String:
	for e in ContentRegistry.slice.get("endings", []):
		if meets_all(e.get("requirements", [])):
			ending_id = String(e.get("id", ""))
			ending_resolved.emit(ending_id)
			return ending_id
	push_warning("GameState: no authored ending matched this run")
	return ""


func ending() -> Dictionary:
	if ending_id == "":
		return {}
	for e in ContentRegistry.slice.get("endings", []):
		if String(e.get("id", "")) == ending_id:
			return e
	return {}


# ── market ─────────────────────────────────────────────────────────────────

## Only offers whose revealing content has fired are visible — handoff §5:
## "The ledger reveals only earned contacts, offers and quote confidence."
func visible_offers() -> Array:
	var out: Array = []
	for o in ContentRegistry.all_offers():
		if is_revealed(o.get("revealed_by", "")) or is_revealed(o["id"]):
			out.append(o)
	return out


func can_sell(offer: Dictionary) -> bool:
	var pid: String = offer.get("product_id", "")
	return offer.get("side", "") == "sell" and int(stock.get(pid, 0)) > 0


func can_buy(offer: Dictionary) -> bool:
	var price := int(offer.get("quote", {}).get("eur", 0))
	var pid: String = offer.get("product_id", "")
	return offer.get("side", "") == "buy" \
		and cash_eur >= price \
		and _total_stock() < capacity


func _total_stock() -> int:
	var n := 0
	for v in stock.values():
		n += int(v)
	return n


## Execute a market offer at its quoted price. Spends a block.
func execute_offer(offer_id: String) -> bool:
	var offer: Dictionary = ContentRegistry.offer(offer_id)
	if offer.is_empty():
		return false
	var price := int(offer.get("quote", {}).get("eur", 0))
	var pid: String = offer.get("product_id", "")

	if offer.get("side", "") == "sell":
		if not can_sell(offer):
			return false
		stock[pid] = int(stock.get(pid, 0)) - 1
		cash_eur += price
	else:
		if not can_buy(offer):
			return false
		stock[pid] = int(stock.get(pid, 0)) + 1
		cash_eur -= price

	if not market_history.has(offer.get("anchor_id", "")):
		market_history.append(offer.get("anchor_id", ""))
	advance_block()
	return true


# ── serialisation (§8: schema version + content package + flags) ──────────

func to_dict() -> Dictionary:
	return {
		"schema_version": SCHEMA_VERSION,
		"content_package_id": content_package_id,
		"seed": seed_value,
		"day": day,
		"block_index": block_index,
		"cash_eur": cash_eur,
		"markka_mk": markka_mk,
		"debt_eur": debt_eur,
		"stock": stock,
		"capacity": capacity,
		"intel": intel,
		"exit_fund_eur": exit_fund_eur,
		"city_harm": city_harm,
		"local_pressure": local_pressure,
		"relationships": relationships,
		"market_history": Array(market_history),
		"debt_holder_memory": Array(debt_holder_memory),
		"flags": flags,
		"revealed": revealed,
		"resolved_encounters": resolved_encounters,
		"current_anchor_id": current_anchor_id,
		"roster": Array(roster),
		"temporary_crew": Array(temporary_crew),
		"equipment_owned": Array(equipment_owned),
		"mission_state": mission_state,
		"obligations": obligations,
		"memories": Array(memories),
		"services": services,
		"crew_outcomes": Array(crew_outcomes),
		"battle_modifiers": battle_modifiers,
		"ending_id": ending_id,
		"crew_deaths": crew_deaths,
	}


func from_dict(d: Dictionary) -> bool:
	if int(d.get("schema_version", -1)) != SCHEMA_VERSION:
		push_error("GameState: save schema %s does not match %s" % [d.get("schema_version"), SCHEMA_VERSION])
		return false
	if String(d.get("content_package_id", "")) != content_package_id and content_package_id != "":
		push_warning("GameState: save was made against content package '%s'" % d.get("content_package_id"))

	seed_value = int(d.get("seed", 20030101))
	_rng.seed = seed_value
	day = int(d.get("day", 1))
	block_index = int(d.get("block_index", 0))
	cash_eur = int(d.get("cash_eur", 0))
	markka_mk = int(d.get("markka_mk", 0))
	debt_eur = int(d.get("debt_eur", 0))
	stock = (d.get("stock", {}) as Dictionary).duplicate(true)
	capacity = int(d.get("capacity", 0))
	intel = int(d.get("intel", 0))
	exit_fund_eur = int(d.get("exit_fund_eur", 0))
	city_harm = String(d.get("city_harm", "low"))
	local_pressure = (d.get("local_pressure", {}) as Dictionary).duplicate(true)
	relationships = (d.get("relationships", {}) as Dictionary).duplicate(true)
	market_history = PackedStringArray(d.get("market_history", []))
	debt_holder_memory = PackedStringArray(d.get("debt_holder_memory", []))
	flags = (d.get("flags", {}) as Dictionary).duplicate(true)
	revealed = (d.get("revealed", {}) as Dictionary).duplicate(true)
	resolved_encounters = (d.get("resolved_encounters", {}) as Dictionary).duplicate(true)
	current_anchor_id = String(d.get("current_anchor_id", ""))
	roster = PackedStringArray(d.get("roster", []))
	temporary_crew = PackedStringArray(d.get("temporary_crew", []))
	equipment_owned = PackedStringArray(d.get("equipment_owned", []))
	mission_state = (d.get("mission_state", {}) as Dictionary).duplicate(true)
	obligations = (d.get("obligations", {}) as Dictionary).duplicate(true)
	memories = PackedStringArray(d.get("memories", []))
	services = (d.get("services", {}) as Dictionary).duplicate(true)
	crew_outcomes = PackedStringArray(d.get("crew_outcomes", []))
	battle_modifiers = (d.get("battle_modifiers", {}) as Dictionary).duplicate(true)
	ending_id = String(d.get("ending_id", ""))
	crew_deaths = int(d.get("crew_deaths", 0))

	state_changed.emit()
	return true
