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
## Everything carried, as INSTANCES rather than type ids.
##
## You can own many pipes, and they wear separately — so condition belongs to the
## thing, not to its kind (COMBAT.md §8.4). An earlier version of this stored
## condition per TYPE and justified it by the fact that `take_loot` refused a
## weapon you already owned. That refusal was the bug: a crew of four with a pipe
## each is the ordinary case.
##
## Each entry: {"id": String, "cond": Condition}. Nothing outside this file
## should index it directly — the helpers below are the interface.
var equipment: Array[Dictionary] = []


## The type ids carried, one per instance, duplicates included.
##
## Kept because plenty of code only wants to know WHAT is carried, and because
## everything that used to read `equipment_owned` means this.
var equipment_owned: PackedStringArray:
	get:
		var out: PackedStringArray = []
		for e in equipment:
			out.append(String(e.get("id", "")))
		return out
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

# ── growing (COMBAT.md §9.11) ──────────────────────────────────────────────

## Levels, skills and perks, all PER PERSON.
##
## Per class would have been easier and would have made §7, §9.8 and §9.10
## decoration: a bounded career, a retiree worth knowing and a veteran who is
## harder to kill all assume the individual is the investment.
##
## It also gives the career ceiling its meaning back. Ten fights is a handful of
## levels, so somebody arrives, becomes genuinely good, and leaves — and the
## levels are the reason losing them hurts.
var crew_perks: Dictionary = {}      ## crew_id -> {perk: points}
var crew_skills: Dictionary = {}     ## crew_id -> PackedStringArray
var crew_perk_points: Dictionary = {}  ## crew_id -> unspent points

## Fights per level. Against a ten-fight ceiling this is four levels in a full
## career, which is enough to feel and short enough to lose.
##
## PLAYTEST GATE, not canon (DESIGN_LOCKS §13).
const FIGHTS_PER_LEVEL := 3

## What a near-death survival or a double kill is worth (§9.11).
const GLORY_PERK_POINTS := 2


func level_of(crew_id: String) -> int:
	return (fights_of(crew_id) / FIGHTS_PER_LEVEL) + 1


func perks_of(crew_id: String) -> Dictionary:
	return crew_perks.get(crew_id, {})


func perk_value(crew_id: String, perk: String) -> int:
	return int(perks_of(crew_id).get(perk, 0))


func unspent_perk_points(crew_id: String) -> int:
	return int(crew_perk_points.get(crew_id, 0))


func skills_of(crew_id: String) -> PackedStringArray:
	return crew_skills.get(crew_id, PackedStringArray())


## Award a level's worth: one perk point to spend, and a skill choice pending.
##
## Called when a crew member crosses a level boundary, which is a function of
## fights survived — so growth is bought with the same currency the career
## ceiling spends.
func grant_level(crew_id: String) -> void:
	crew_perk_points[crew_id] = unspent_perk_points(crew_id) + 1
	state_changed.emit()


## Glory: survived at near-death, or two in one round (§9.11).
func grant_glory(crew_id: String) -> void:
	crew_perk_points[crew_id] = unspent_perk_points(crew_id) + GLORY_PERK_POINTS
	memories.append("glory:" + crew_id)
	state_changed.emit()


## Spend one point. Refuses rather than going negative, and refuses a perk the
## content does not define — a typo should not invent a stat.
func spend_perk(crew_id: String, perk: String) -> bool:
	if unspent_perk_points(crew_id) <= 0:
		return false
	if not ContentRegistry.slice.get("perks", []).has(perk):
		return false
	var p: Dictionary = crew_perks.get(crew_id, {})
	p[perk] = int(p.get(perk, 0)) + 1
	crew_perks[crew_id] = p
	crew_perk_points[crew_id] = unspent_perk_points(crew_id) - 1
	state_changed.emit()
	return true


## What this person could learn next (COMBAT.md §9.11, §9.12).
##
## Drawn from the pools of the aptitudes they hold, which is what makes holding
## more than one worth anything — and what makes a third a TRADE rather than a
## gain: the offer is the same size either way, so breadth costs depth.
##
## Deterministic from the campaign seed, the person and their level. A level-up
## offer that rerolls on reload is a slot machine, not a decision.
const SKILL_OFFER_SIZE := 3


func skill_offer(crew_id: String) -> Array:
	var level := level_of(crew_id)
	var known := skills_of(crew_id)

	var eligible: Array = []
	for a in aptitudes_of(crew_id):
		for sk in ContentRegistry.slice.get("skills", []):
			var s: Dictionary = sk
			if String(s.get("aptitude", "")) != String(a):
				continue
			if int(s.get("tier", 1)) > level:
				continue
			if known.has(String(s.get("id", ""))):
				continue
			eligible.append(s)

	if eligible.size() <= SKILL_OFFER_SIZE:
		return eligible

	# Stable shuffle: the same person at the same level is offered the same
	# three, however many times the screen is opened.
	var rng := RandomNumberGenerator.new()
	rng.seed = hash(crew_id) + seed_value * 13 + level * 101
	var pool := eligible.duplicate()
	var out: Array = []
	for i in SKILL_OFFER_SIZE:
		out.append(pool.pop_at(rng.randi_range(0, pool.size() - 1)))
	return out


## Everything this person could ever learn, for a screen that wants to show the
## road rather than the next step.
func skill_pool_size(crew_id: String) -> int:
	var n := 0
	for a in aptitudes_of(crew_id):
		for sk in ContentRegistry.slice.get("skills", []):
			if String((sk as Dictionary).get("aptitude", "")) == String(a):
				n += 1
	return n


func learn_skill(crew_id: String, skill_id: String) -> bool:
	var have: PackedStringArray = crew_skills.get(crew_id, PackedStringArray())
	if have.has(skill_id):
		return false
	# It has to be a real skill, belonging to an aptitude this person holds, at a
	# tier they have reached. Otherwise a typo teaches somebody a trick from a
	# class they have never been.
	var found := false
	for sk in ContentRegistry.slice.get("skills", []):
		var s: Dictionary = sk
		if String(s.get("id", "")) != skill_id:
			continue
		if not has_aptitude(crew_id, String(s.get("aptitude", ""))):
			return false
		if int(s.get("tier", 1)) > level_of(crew_id):
			return false
		found = true
	if not found:
		return false
	have.append(skill_id)
	crew_skills[crew_id] = have
	state_changed.emit()
	return true


## What somebody can do, as a SET (COMBAT.md §9.12).
##
## Nobody has "a class". Most people hold two aptitudes and some hold three, and
## the combinations are the design — a driver who can shoot is not a
## contradiction, it is the ordinary case.
##
## Falls back to the crew record's `role`, so the authored six and everyone
## generated before this existed still answer sensibly.
var crew_aptitudes: Dictionary = {}    ## crew_id -> PackedStringArray


func aptitudes_of(crew_id: String) -> PackedStringArray:
	if crew_aptitudes.has(crew_id):
		return crew_aptitudes[crew_id]
	# Opponents and third parties carry a character_id that is not a crew id.
	# Asking about them is normal, so it must not go through the strict lookup.
	if not ContentRegistry.has_crew(crew_id):
		return PackedStringArray()
	var rec := ContentRegistry.crew_member(crew_id)
	var role := String(rec.get("role", ""))
	return PackedStringArray([role]) if role != "" else PackedStringArray()


func set_aptitudes(crew_id: String, ids: PackedStringArray) -> void:
	crew_aptitudes[crew_id] = ids
	state_changed.emit()


func has_aptitude(crew_id: String, aptitude_id: String) -> bool:
	return aptitudes_of(crew_id).has(aptitude_id)


## Appearance follows the FIRST aptitude, so the look family still reads even
## though the person is not labelled by it.
func primary_aptitude(crew_id: String) -> String:
	var a := aptitudes_of(crew_id)
	return String(a[0]) if a.size() > 0 else ""


## Every verb this person brings to a board. The point of holding more than one.
func verbs_of(crew_id: String) -> PackedStringArray:
	var out: PackedStringArray = []
	for a in aptitudes_of(crew_id):
		var c := combat_class(String(a))
		var v := String(c.get("verb", ""))
		if v != "" and not out.has(v):
			out.append(v)
	return out


## The class table, from content.
func combat_class(class_id: String) -> Dictionary:
	for c in ContentRegistry.slice.get("classes", []):
		if String((c as Dictionary).get("id", "")) == class_id:
			return c
	return {}


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
	equipment.clear()
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
	# A veteran's levels belong to the campaign they were earned in.
	crew_aptitudes = {}
	crew_perks = {}
	crew_skills = {}
	crew_perk_points = {}
	chapter = 1
	chapter_cleared = false
	last_ending_outcome = ""
	_sync_chapter_from_content()
	chapter_earned = 0
	chapter_loot_taken = 0
	chapter_fights_won = 0
	_restore_generated_crew()


func current_block() -> String:
	return blocks_per_day[block_index % blocks_per_day.size()]


func is_slice_complete() -> bool:
	return block_index >= total_blocks


## Spend one Day/Night block. Nightly settlement is applied on entering night.
# ── gear wears out (COMBAT.md §8.4) ────────────────────────────────────────

## new -> used -> faulty -> broken, and it only goes one way.
enum Condition { NEW, USED, FAULTY, BROKEN }

## What worn gear fetches. This is the decision the flat model could not
## produce: sell it while it is still worth something, or keep using it and
## watch the price fall.
const CONDITION_RESALE := {
	Condition.NEW: 1.0,
	Condition.USED: 0.7,
	Condition.FAULTY: 0.4,
	Condition.BROKEN: 0.15,
}

## One piece in this many breaks outright instead of stepping down. A break is
## felt as an event where a slide is not, and it lands hardest on a §8 weapon
## that cannot be bought at any price — replacing it means taking another one off
## somebody.
const BREAK_ONE_IN := 8


func add_equipment(type_id: String, cond: Condition = Condition.NEW) -> void:
	if type_id == "":
		return
	equipment.append({"id": type_id, "cond": int(cond)})
	state_changed.emit()


func owns(type_id: String) -> bool:
	return count_of(type_id) > 0


func count_of(type_id: String) -> int:
	var n := 0
	for e in equipment:
		if String(e.get("id", "")) == type_id:
			n += 1
	return n


func condition_at(index: int) -> Condition:
	if index < 0 or index >= equipment.size():
		return Condition.NEW
	return int(equipment[index].get("cond", 0)) as Condition


func condition_word(c: Condition) -> String:
	match c:
		Condition.USED: return "equipment.cond_used"
		Condition.FAULTY: return "equipment.cond_faulty"
		Condition.BROKEN: return "equipment.cond_broken"
	return "equipment.cond_new"


## Lose one of a type. Takes the WORST first: what a fallen crew member was
## carrying is gone, and if you had a good one and a wrecked one in the same
## hands the wrecked one is the one that was being used.
func remove_one(type_id: String) -> bool:
	var worst := -1
	for i in equipment.size():
		if String(equipment[i].get("id", "")) != type_id:
			continue
		if worst < 0 or int(equipment[i].get("cond", 0)) > int(equipment[worst].get("cond", 0)):
			worst = i
	if worst < 0:
		return false
	equipment.remove_at(worst)
	state_changed.emit()
	return true


## A step of wear across everything carried, at a chapter boundary.
##
## Per CHAPTER, not per fight: that taxes hoarding, which is the actual target —
## a farmed stockpile carried into chapter four — where a per-fight slide would
## punish the player for playing.
##
## Deterministic from the campaign seed and the chapter, because a roguelike
## where the same decisions produce different rot is not one a player can learn.
func decay_equipment() -> void:
	var rng := RandomNumberGenerator.new()
	rng.seed = seed_value * 31 + chapter
	for e in equipment:
		var c := int(e.get("cond", 0))
		if c >= int(Condition.BROKEN):
			continue
		if rng.randi_range(1, BREAK_ONE_IN) == 1:
			e["cond"] = int(Condition.BROKEN)
		else:
			e["cond"] = c + 1
	state_changed.emit()


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
	chapter_cleared = false
	day = ((chapter - 1) * CHAPTER_DAYS) + 1
	block_index = (day - 1) * blocks_per_day.size()

	# The run layer.
	cash_eur = 0
	stock.clear()
	market_history.clear()
	flags.clear()

	# Gear crosses the boundary and is a step worse for it (§8.4). This is the
	# load the whole ledger carries: without decay, persistence plus re-runnable
	# chapters is a farming exploit.
	decay_equipment()

	# ...and what it is FOR may differ next time, so read it from content
	# rather than carrying the last chapter's goal forward.
	_sync_chapter_from_content()

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


## The authored chapter, or an empty dictionary if content has none.
##
## The goal and the threshold used to be variables with defaults in code. They
## belong here: varying the goal TYPE between chapters is where top-level variety
## comes from, and that variation is content's to author.
func chapter_def() -> Dictionary:
	for c in ContentRegistry.slice.get("chapters", []):
		if int((c as Dictionary).get("index", 0)) == chapter:
			return c
	return {}


## Pull goal and threshold out of content, falling back to whatever is set.
func _sync_chapter_from_content() -> void:
	var c := chapter_def()
	if c.is_empty():
		return
	var goal: Dictionary = c.get("goal", {})
	match String(goal.get("type", "")):
		"loot": chapter_goal = ChapterGoal.LOOT
		"fights": chapter_goal = ChapterGoal.FIGHTS
		"money": chapter_goal = ChapterGoal.MONEY
	if goal.has("threshold"):
		chapter_threshold = int(goal["threshold"])


## The climax, once it has been earned.
##
## The threshold buys ENTRY; it is not the ending. `MAP.md` §12.5 is the same
## idea one magnification down, where travelling and selling buys entry to a
## better meeting.
func chapter_ending() -> Dictionary:
	return chapter_def().get("ending", {})


func chapter_ending_available() -> bool:
	return chapter_goal_met() and not chapter_def().is_empty() \
		and not chapter_cleared


## Set when the ending has been run, so a chapter cannot be cleared twice.
var chapter_cleared: bool = false


## How the last operation went. "clean", "messy" or "lost".
var last_ending_outcome: String = ""

## How many hands it takes for a container to move quietly.
const OPERATION_IDEAL_CREW := 3


## Did the shipment get away?
##
## THE PENALTY CANNOT BE MONEY. Cash resets at a chapter boundary, so a fine
## levied at the end of a chapter costs nothing at all — that is the persistence
## ledger deciding the design rather than the other way round. What can be lost
## is what CARRIES: gear and people.
##
## Likewise the reward. A payout would evaporate, so a clean run buys a **built
## upgrade**, which is the one kind of thing the ledger says you keep.
##
## Resolved from the seed and the chapter so the same run resolves the same way,
## matching how gear decays. A player who reloads to reroll a shipment is playing
## a different game from the one being built.
func _resolve_operation(ending: Dictionary) -> String:
	var rng := RandomNumberGenerator.new()
	rng.seed = seed_value * 17 + chapter * 7

	# Hands on the job. A thin crew is the thing most likely to lose a container.
	var hands := roster.size()
	var margin := float(hands) / float(OPERATION_IDEAL_CREW)
	# Heat carried into the night makes it worse, which is what connects §9.5 to
	# the meta rather than leaving it a battle-only idea.
	var seen := float(arrested_crew.size()) * 0.15
	var score := margin - seen + rng.randf_range(-0.35, 0.35)

	if score >= 1.0:
		var up := String(ending.get("grants_upgrade", ""))
		if up != "":
			add_upgrade(up)
		return "clean"
	if score >= 0.5:
		# Something had to be left behind.
		if not equipment.is_empty():
			equipment.remove_at(equipment.size() - 1)
		return "messy"
	# Somebody did not come back. Costs a person, which is the only currency
	# that still means anything at a chapter boundary.
	for id in roster:
		if not is_named(String(id)):
			arrest(String(id))
			break
	return "lost"


## Run the ending, and turn the chapter over.
##
## An OPERATION rather than a battle: buying a shipment and moving it. If every
## chapter ended in a fight the market would be a supply line to the real game,
## and the GDD ruling is explicit that commerce should be able to be the climax.
##
## Returns "" on success, or a reason it could not be attempted.
func attempt_chapter_ending() -> String:
	if not chapter_ending_available():
		return "not-available"
	var ending := chapter_ending()
	var stake := int(ending.get("stake_eur", 0))
	if cash_eur < stake:
		return "cannot-afford"
	if String(ending.get("anchor_id", "")) != "" \
			and current_anchor_id != String(ending["anchor_id"]):
		return "wrong-place"

	cash_eur -= stake
	chapter_cleared = true
	last_ending_outcome = _resolve_operation(ending)
	# A chapter you finished is a thing the city remembers, and §9.8 makes
	# memories the seam every later system reads.
	memories.append("chapter-cleared:%d:%s" % [chapter, last_ending_outcome])
	state_changed.emit()
	return ""


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
				# Authored grants may repeat: a second pipe is a second pipe.
				add_equipment(eq)
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
	# What they can do, not what they are called (COMBAT.md 9.12).
	if record.has("aptitudes"):
		set_aptitudes(id, PackedStringArray(record["aptitudes"]))
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


## What a type fetches when new. The price of a PARTICULAR one is resale_at().
func resale_of(equipment_id: String) -> int:
	return int(_equipment(equipment_id).get("resale_eur", 0))


## What the one at this index fetches now, worn as it is (§8.4).
func resale_at(index: int) -> int:
	if index < 0 or index >= equipment.size():
		return 0
	var base := float(resale_of(String(equipment[index].get("id", ""))))
	var mult: float = CONDITION_RESALE.get(condition_at(index), 1.0)
	return int(round(base * mult))


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
		# No duplicate check. A crew of four with a pipe each is ordinary, and
		# refusing the second one was the bug that made condition look like a
		# property of the TYPE.
		add_equipment(eid, Condition.NEW)
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
	# Sells the BEST one you have, because that is what somebody selling would
	# do, and it leaves the worn one to keep using or to lose.
	var i := -1
	for k in equipment.size():
		if String(equipment[k].get("id", "")) != equipment_id:
			continue
		if i < 0 or int(equipment[k].get("cond", 0)) < int(equipment[i].get("cond", 0)):
			i = k
	if i < 0:
		return 0
	var paid := resale_at(i)
	equipment.remove_at(i)
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
		remove_one(String(id))
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
		var before_level := level_of(cid)
		crew_fights[cid] = fights_of(cid) + 1
		# Growth is bought with the same currency the ceiling spends: fights.
		# So a crew member becomes good on exactly the clock that is running out
		# for them, which is §9.11 and §7 being the same idea from two ends.
		if level_of(cid) > before_level:
			grant_level(cid)
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
	# DEEP COPY, not the live state.
	#
	# Every collection here is a reference type, so returning them bare made
	# to_dict() a live VIEW rather than a snapshot: a save held for a moment and
	# then mutated — which new_campaign() does — took the mutation with it. Found
	# by a decay test whose reloaded conditions came back empty.
	var out := {
		"schema_version": SCHEMA_VERSION,
		"generated_crew": generated_crew,
		"arrested_crew": arrested_crew,
		"upgrades": upgrades,
		"crew_aptitudes": crew_aptitudes,
		"crew_perks": crew_perks,
		"crew_skills": crew_skills,
		"crew_perk_points": crew_perk_points,
		"chapter": chapter,
		"chapter_cleared": chapter_cleared,
		"last_ending_outcome": last_ending_outcome,
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
		"equipment": equipment,
		"mission_state": mission_state,
		"obligations": obligations,
		"memories": Array(memories),
		"services": services,
		"crew_outcomes": Array(crew_outcomes),
		"battle_modifiers": battle_modifiers,
		"ending_id": ending_id,
		"crew_deaths": crew_deaths,
	}
	return out.duplicate(true)


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
	equipment.clear()
	for e in d.get("equipment", []):
		equipment.append({"id": String((e as Dictionary).get("id", "")),
			"cond": int((e as Dictionary).get("cond", 0))})
	mission_state = (d.get("mission_state", {}) as Dictionary).duplicate(true)
	obligations = (d.get("obligations", {}) as Dictionary).duplicate(true)
	memories = PackedStringArray(d.get("memories", []))
	services = (d.get("services", {}) as Dictionary).duplicate(true)
	crew_outcomes = PackedStringArray(d.get("crew_outcomes", []))
	battle_modifiers = (d.get("battle_modifiers", {}) as Dictionary).duplicate(true)
	ending_id = String(d.get("ending_id", ""))
	crew_deaths = int(d.get("crew_deaths", 0))

	state_changed.emit()
	crew_aptitudes = d.get("crew_aptitudes", {})
	crew_perks = d.get("crew_perks", {})
	crew_skills = d.get("crew_skills", {})
	crew_perk_points = d.get("crew_perk_points", {})
	upgrades = d.get("upgrades", PackedStringArray())
	last_ending_outcome = String(d.get("last_ending_outcome", ""))
	chapter_cleared = bool(d.get("chapter_cleared", false))
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
