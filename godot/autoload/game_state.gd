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

const SCHEMA_VERSION := 6

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

# ── careers (COMBAT.md §7) ─────────────────────────────────────────────────
## Fights each crew member has come through, by id. A career is bounded: a
## hireling grows for a few fights and then leaves, one way or the other.
var crew_fights: Dictionary = {}

## Who has left the crew alive, and is now somebody in the city who knows what
## you did (§7.4). They train a rookie and they remember.
var retired_crew: PackedStringArray = []

## Rookies who started ahead because a veteran trained them (§7.4, 7b).
var trained_crew: PackedStringArray = []

## CAREER CEILING — the owner's figure, and a PLAYTEST GATE rather than canon
## (`DESIGN_LOCKS.md` §13 forbids hardening a placeholder silently). Ten fights,
## then retire or die.
##
## The ceiling is the point, not the number. Without it XP builds a permanent
## super-squad and the roster stops being a conveyor belt — which is what the
## churn in §7.1 depends on. Investment stays real but bounded, and cannot be
## re-bought: money replaces a body, nothing replaces six fights.
const CAREER_FIGHTS := 10

## When the counter becomes visible (§7.3, decision 6c). Nothing is shown until
## someone is close, then the game starts telling you — so the last fight is a
## deliberate choice rather than a guess, which §18.1 requires.
const CAREER_WARN_AT := 7
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
	crew_fights = {}
	retired_crew = PackedStringArray()
	trained_crew = PackedStringArray()
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
	generated_crew = {}
	arrested_crew = PackedStringArray()
	upgrades = PackedStringArray()
	chapter = 1
	chapter_earned = 0
	chapter_loot_taken = 0
	chapter_fights_won = 0
	_restore_generated_crew()


func current_block() -> String:
	return blocks_per_day[block_index % blocks_per_day.size()]


func is_slice_complete() -> bool:
	return block_index >= total_blocks


## Spend one Day/Night block. Nightly settlement is applied on entering night.
# ── what survives a chapter (GAME_DESIGN_DOCUMENT: the persistence ledger) ──

## WHAT YOU BUILT PERSISTS. WHAT YOU WERE GRANTED DOES NOT.
##
## That single line decides every case consistently and is explicable to a
## player: infrastructure is yours, access is lent. A stash-house upgrade carries
## because you made it; a mission unlock resets because it was permission handed
## over.
##
## Three states, not two — carries, carries-but-degrades, and resets:
##
##   people      mostly     they may leave, and they decay
##   gear        yes        decays with use
##   contacts    yes        who you know does not un-happen
##   upgrades    yes        a stash house stays improved
##   money       NO         resets every chapter
##   unlocks     NO         access is re-earned
##
## Decay is what keeps this honest. Persistence plus re-runnable early chapters
## is otherwise a farming exploit: enough repetitions and the fourth chapter is
## trivial. Decay makes a farmed advantage leak.
const RESETS_EACH_CHAPTER := [
	"cash_eur",
	"stock",
	"market_history",
	"revealed",
	"flags",
]

## Things bought or built, which carry. Distinct from `flags`, which are
## permission and do not.
var upgrades: PackedStringArray = []


func has_upgrade(id: String) -> bool:
	return upgrades.has(id)


func add_upgrade(id: String) -> void:
	if id == "" or upgrades.has(id):
		return
	upgrades.append(id)
	state_changed.emit()


## Start the next chapter without starting a new campaign.
##
## The roster, the gear, the contacts and the upgrades come with you. The money
## does not — that is what stops farming an early chapter buying away the next
## chapter's difficulty, which is the usual failure of a persistent-currency
## roguelike.
func begin_next_chapter() -> void:
	chapter += 1
	day = ((chapter - 1) * CHAPTER_DAYS) + 1
	block_index = (day - 1) * blocks_per_day.size()

	# The run layer.
	cash_eur = 0
	stock.clear()
	market_history.clear()
	flags.clear()

	# Chapter progress starts again; what it is FOR may differ next time.
	chapter_earned = 0
	chapter_loot_taken = 0
	chapter_fights_won = 0

	# `revealed`, `roster`, `equipment_owned`, `memories`, `crew_fights`,
	# `retired_crew`, `arrested_crew`, `trained_crew`, `generated_crew` and
	# `upgrades` are all deliberately untouched.
	state_changed.emit()


# ── chapters (GAME_DESIGN_DOCUMENT: run structure) ─────────────────────────

## An era is roughly forty days in four chapters, and a chapter is a run.
##
## The authored slice is a CHAPTER's worth, not an era's — everything built
## against it stands, but "seven days and an ending" is no longer the shape.
##
## PLACEHOLDER (DESIGN_LOCKS §13): ten days is the owner's figure and the slice
## currently authors seven, so the first chapter ends early on purpose rather
## than pretending the content is longer than it is.
const CHAPTER_DAYS := 10
const ERA_CHAPTERS := 4

## Which chapter, 1-based.
var chapter: int = 1

## What clears it. The TYPE varies per chapter, and that variation is where
## top-level variety comes from: a chapter cleared by earning is not the same
## chapter cleared by winning fights, even on the same map with the same crew.
enum ChapterGoal { MONEY, LOOT, FIGHTS }

var chapter_goal: ChapterGoal = ChapterGoal.MONEY
## PLAYTEST GATE, not canon. Nobody has played ten days to find out.
var chapter_threshold: int = 600

## Progress, counted live — a player who cannot see how close they are cannot
## decide whether to push or bank.
var chapter_earned: int = 0
var chapter_loot_taken: int = 0
var chapter_fights_won: int = 0


## Where the day sits inside its chapter, 1-based.
func day_of_chapter() -> int:
	return ((day - 1) % CHAPTER_DAYS) + 1


func chapter_progress() -> int:
	match chapter_goal:
		ChapterGoal.LOOT: return chapter_loot_taken
		ChapterGoal.FIGHTS: return chapter_fights_won
	return chapter_earned


## Has the player earned their way into the ending mission?
##
## The threshold buys ENTRY to the climax; it is not the climax. `MAP.md` §12.5
## is the same idea one magnification down, where travelling and selling buys
## entry to a better meeting.
func chapter_goal_met() -> bool:
	return chapter_progress() >= chapter_threshold


## Counted here rather than at each call site, so a new way of earning cannot
## quietly fail to count toward the chapter.
func record_chapter_income(amount: int) -> void:
	if amount > 0:
		chapter_earned += amount
		state_changed.emit()


func record_chapter_loot(n: int) -> void:
	if n > 0:
		chapter_loot_taken += n
		state_changed.emit()


func record_chapter_win() -> void:
	chapter_fights_won += 1
	state_changed.emit()


func advance_block() -> void:
	if is_slice_complete():
		return
	block_index += 1
	day = (block_index / blocks_per_day.size()) + 1
	# A chapter is a span of days, so it follows from the day rather than being
	# advanced separately — two counters for one fact would drift.
	chapter = ((day - 1) / CHAPTER_DAYS) + 1

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
		"label":
			# News applies a lasting label to a thing — "markka-dead-money".
			if parts.size() >= 2:
				flags["label:" + ":".join(_tail(parts, 1))] = true
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
# ── hiring (COMBAT.md §7) ──────────────────────────────────────────────────

## Everyone hired off the street, by id. Persisted, because a generated person
## exists nowhere else — lose this and a saved campaign loads with crew the
## registry has never heard of.
var generated_crew: Dictionary = {}


## Today's candidates. Regenerated on demand rather than stored, so the offer
## cannot drift out of sync with the day, and identical every time you look at
## the same day so that walking away is a real decision rather than a reroll.
func hiring_pool(count: int = 3) -> Array[Dictionary]:
	var out: Array[Dictionary] = []
	for c in CrewGenerator.pool(seed_value, day, count):
		if not roster.has(String(c.get("id", ""))):
			out.append(c)
	return out


## The signing fee is the crew member's own wage.
##
## PLACEHOLDER (DESIGN_LOCKS.md §13). Wages were displayed and never charged, so
## hiring was free and the churn careers created cost nothing — which removes
## the whole point of a bounded career. Using the wage makes the number already
## on screen mean something and is derived from authored data rather than
## invented, but it has never been playtested.
func hire(record: Dictionary) -> bool:
	var id := String(record.get("id", ""))
	if id == "" or roster.has(id):
		return false
	var fee := int(record.get("wage_eur", 0))
	if cash_eur < fee:
		return false
	cash_eur -= fee
	generated_crew[id] = record
	ContentRegistry.register_generated_crew(record)
	roster.append(id)
	revealed[id] = true
	state_changed.emit()
	return true


## Put every hire back in front of the registry. Called after a load, and after
## a new campaign clears the overlay, because the registry holds canon only.
func _restore_generated_crew() -> void:
	ContentRegistry.forget_generated_crew()
	for id in generated_crew:
		ContentRegistry.register_generated_crew(generated_crew[id])


# ── loot (COMBAT.md §8) ────────────────────────────────────────────────────

## Can this be bought at all, or only taken off somebody carrying it?
##
## §8 is asymmetric on purpose: loot converts DOWN into money freely, but the
## best gear cannot be bought at any price. Money buys volume; loot buys
## capability. That is what gives territory teeth — pushing into Jade Lantern
## ground is not just new revenue and new threats, it is the only place a class
## of weapon exists — and it is what gives robbery and vengeance (`GDD` §11.5) a
## reason beyond cash.
func is_purchasable(equipment_id: String) -> bool:
	var e := _equipment(equipment_id)
	return String(e.get("acquisition", "market")) != "taken"


func resale_of(equipment_id: String) -> int:
	return int(_equipment(equipment_id).get("resale_eur", 0))


func _equipment(equipment_id: String) -> Dictionary:
	for e in ContentRegistry.slice.get("equipment", []):
		if String(e.get("id", "")) == equipment_id:
			return e
	return {}


## Take what the losing side was carrying. This is the ONLY way taken-only gear
## enters the game, so it is the moment §8 exists at all.
func take_loot(equipment_ids: PackedStringArray) -> PackedStringArray:
	var got: PackedStringArray = []
	for id in equipment_ids:
		var eid := String(id)
		if eid == "" or _equipment(eid).is_empty():
			continue
		if equipment_owned.has(eid):
			continue
		equipment_owned.append(eid)
		got.append(eid)
		record_chapter_loot(1)
	if not got.is_empty():
		state_changed.emit()
	return got


## Where loot turns into money (COMBAT.md §9.7).
##
## Piritori, and only Piritori for now. The travel requirement IS the mechanic:
## selling from anywhere would make loot weightless — a number you clear whenever
## you like — and would take the map out of an economy that is supposed to run
## through it. Carrying a sawn-off across the city to sell it puts you where the
## hiring pool and the pressure both are.
##
## §9.7 also promises a better fence you have to earn, later. When that arrives
## this becomes a list and the Piritori rate becomes the floor rather than the
## only price.
const FENCE_ANCHORS := ["piritori"]


func can_fence_here() -> bool:
	return FENCE_ANCHORS.has(current_anchor_id)


## Loot converts DOWN into money. Deliberately one-way and deliberately poor:
## selling a thing you can only get by taking it should feel like a waste, which
## is what stops the asymmetry collapsing into "everything is money eventually".
func sell_loot(equipment_id: String) -> int:
	var i := equipment_owned.find(equipment_id)
	if i < 0:
		return 0
	var paid := resale_of(equipment_id)
	equipment_owned.remove_at(i)
	cash_eur += paid
	# Counted centrally (GDD run structure): a chapter cleared by earning has to
	# see every way of earning, and the fence is one of them.
	record_chapter_income(paid)
	state_changed.emit()
	return paid


## What a crew member carried is lost with them (§8): gear is on a person, not
## in a warehouse, which is the tactical half of the brake on spending people.
func lose_kit_of(equipment_ids: PackedStringArray) -> void:
	for id in equipment_ids:
		var i := equipment_owned.find(String(id))
		if i >= 0:
			equipment_owned.remove_at(i)
	state_changed.emit()


# ── careers (COMBAT.md §7) ─────────────────────────────────────────────────

## Is this person one of the story's own? Named characters are FFT story units:
## rare, deployed deliberately, and never lost to a random alley (§7.1). They
## have no career ceiling because they do not leave by attrition — they leave in
## authored beats, and `NARRATIVE.md` decides when.
##
## Everyone else is hired, and hired crew are Mewgenics-disposable: generated,
## genuinely expendable, and replacing them IS a loop rather than a penalty.
func is_named(crew_id: String) -> bool:
	return bool(ContentRegistry.crew_member(crew_id).get("named", false))


func fights_of(crew_id: String) -> int:
	return int(crew_fights.get(crew_id, 0))


## Fights left before the ceiling. -1 for a named character, who has no ceiling.
func career_left(crew_id: String) -> int:
	if is_named(crew_id):
		return -1
	return maxi(CAREER_FIGHTS - fights_of(crew_id), 0)


## §7.3, decision 6c: nothing until they are close, then the game tells you.
## A hidden counter would turn the exact spend-or-save decision that is the
## whole game into a guess.
func career_is_visible(crew_id: String) -> bool:
	if is_named(crew_id):
		return false
	return fights_of(crew_id) >= CAREER_WARN_AT


## Everyone who came through a fight is one fight older. Called once when a
## battle settles, never per round.
##
## Returns the ids who reached the ceiling and left — RETIRED, not dead. Two
## exits, and one of them being "they got out" is what makes benching a veteran
## a real decision rather than hoarding (§7.2).
func age_crew(deployed: PackedStringArray) -> PackedStringArray:
	var left: PackedStringArray = []
	for id in deployed:
		var cid := String(id)
		if is_named(cid) or retired_crew.has(cid):
			continue
		crew_fights[cid] = fights_of(cid) + 1
		if fights_of(cid) >= CAREER_FIGHTS:
			retire(cid)
			left.append(cid)
	if not left.is_empty():
		state_changed.emit()
	return left


## Everyone the police took (COMBAT.md §9.5.3).
##
## Deliberately NOT the same list as `retired_crew`. A veteran who got out is a
## contact the city remembers and who trains the next one (§9.8); somebody
## carried off a yard is a different fact about a different night, and the memory
## records which. Collapsing them would make the two exits read the same to every
## later system that reads memories.
var arrested_crew: PackedStringArray = []


## They were downed when the police walked in, and they are gone.
##
## This is where a loud fight actually costs something. The career system (§7)
## makes a crew member an investment; this is the one outcome that removes them
## without warning and without the fights they had learned.
func arrest(crew_id: String) -> void:
	if arrested_crew.has(crew_id):
		return
	arrested_crew.append(crew_id)
	var k := roster.find(crew_id)
	if k >= 0:
		roster.remove_at(k)
	memories.append("arrested:" + crew_id)
	state_changed.emit()



## They leave the crew and stay in the city (§7.4, decisions 7b + 7c): a name in
## a bar, someone who knows what you did — and someone who will start the next
## rookie ahead. Training is a service the CONTACT offers, so this is one
## mechanic rather than two.
func retire(crew_id: String) -> void:
	if retired_crew.has(crew_id):
		return
	retired_crew.append(crew_id)
	var i := roster.find(crew_id)
	if i >= 0:
		roster.remove_at(i)
	# A veteran in the city is a relationship, not a deleted row.
	memories.append("retired:" + crew_id)
	state_changed.emit()


## A rookie starts ahead if there is anyone left to teach them (§7.4, 7b).
## Bounded to one head start per rookie, and only while a veteran exists — the
## web of people you know is the reward, so it has to be spendable.
func train(crew_id: String) -> bool:
	if retired_crew.is_empty() or trained_crew.has(crew_id) or is_named(crew_id):
		return false
	trained_crew.append(crew_id)
	crew_fights[crew_id] = fights_of(crew_id) + 2
	state_changed.emit()
	return true


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
		"generated_crew": generated_crew,
		"arrested_crew": arrested_crew,
		"upgrades": upgrades,
		"chapter": chapter,
		"chapter_goal": int(chapter_goal),
		"chapter_threshold": chapter_threshold,
		"chapter_earned": chapter_earned,
		"chapter_loot_taken": chapter_loot_taken,
		"chapter_fights_won": chapter_fights_won,
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
		"crew_fights": crew_fights,
		"retired_crew": Array(retired_crew),
		"trained_crew": Array(trained_crew),
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
	crew_fights = (d.get("crew_fights", {}) as Dictionary).duplicate(true)
	retired_crew = PackedStringArray(d.get("retired_crew", []))
	trained_crew = PackedStringArray(d.get("trained_crew", []))
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
	upgrades = d.get("upgrades", PackedStringArray())
	chapter = int(d.get("chapter", 1))
	chapter_goal = d.get("chapter_goal", int(ChapterGoal.MONEY)) as ChapterGoal
	chapter_threshold = int(d.get("chapter_threshold", 600))
	chapter_earned = int(d.get("chapter_earned", 0))
	chapter_loot_taken = int(d.get("chapter_loot_taken", 0))
	chapter_fights_won = int(d.get("chapter_fights_won", 0))
	arrested_crew = d.get("arrested_crew", PackedStringArray())
	generated_crew = d.get("generated_crew", {})
	_restore_generated_crew()
	return true
