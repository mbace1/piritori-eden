extends Node
## ContentRegistry — resolves canonical IDs from the imported JSON.
##
## GODOT_HANDOFF.md §4: "ContentRegistry resolves canonical IDs and reports
## missing references as errors rather than silently substituting placeholders."
##
## The JSON under res://data/ is a byte-identical copy of the canon above this
## project (tools/sync-data.mjs keeps it honest). Nothing here rewrites canon
## values; it indexes them and hands them back by stable string ID.

const MAP_PATH := "res://data/kallio-era1-2003-v1.json"
const SLICE_PATH := "res://data/era1-slice-v1.json"
const ART_PATH := "res://data/art-v3-manifest.json"
## Act I v4.58: the road — events in transit and on arriving.
const ROAD_PATH := "res://data/road-events-v1.json"
## Act I v4.62: the woven story — briefings, the case board, the case.
const STORY_PATH := "res://data/act1-story-v1.json"
## Act I v4.65 (H2 of The Long Game): doors — offers on the blocks the spine
## leaves free. Templates, not scenes.
const DOORS_PATH := "res://data/doors-v1.json"

var map: Dictionary = {}
var slice: Dictionary = {}
var art: Dictionary = {}
var road: Dictionary = {}
var story: Dictionary = {}
var doors: Dictionary = {}

## Errors collected while loading. Non-empty means the port must not claim to
## resolve every referenced ID (§9 acceptance item 8).
var errors: PackedStringArray = []

var _anchors: Dictionary = {}      # id -> anchor
var _sites: Dictionary = {}        # id -> site
var _edges: Array = []
var _encounters: Dictionary = {}   # id -> encounter
var _offers: Dictionary = {}       # id -> market offer
var _missions: Dictionary = {}     # id -> mission
var _crew: Dictionary = {}         # id -> crew
var _products: Dictionary = {}     # id -> product
var _battles: Dictionary = {}      # id -> battle
var _road_events: Dictionary = {}  # id -> road event
var _visits: Dictionary = {}       # id -> optional visit


func _ready() -> void:
	load_all()


func load_all() -> bool:
	errors.clear()
	map = _load_json(MAP_PATH)
	slice = _load_json(SLICE_PATH)
	art = _load_json(ART_PATH)
	road = _load_json(ROAD_PATH)
	story = _load_json(STORY_PATH)
	doors = _load_json(DOORS_PATH)
	if errors.size() > 0:
		return false
	_index()
	_verify_references()
	return errors.is_empty()


func _load_json(path: String) -> Dictionary:
	if not FileAccess.file_exists(path):
		errors.append("missing data file: %s (run: node tools/sync-data.mjs)" % path)
		return {}
	var text := FileAccess.get_file_as_string(path)
	var parsed: Variant = JSON.parse_string(text)
	if typeof(parsed) != TYPE_DICTIONARY:
		errors.append("unparseable JSON: %s" % path)
		return {}
	return parsed


func _index() -> void:
	for a in map.get("anchors", []):
		_anchors[a["id"]] = a
	for s in map.get("sites", []):
		_sites[s["id"]] = s
	_edges = map.get("edges", [])

	for e in slice.get("encounters", []):
		_encounters[e["id"]] = e
	for o in slice.get("market_offers", []):
		_offers[o["id"]] = o
	for m in slice.get("missions", []):
		_missions[m["id"]] = m
	# CREW NAMES ARE GENERATED, NEVER AUTHORED.
	#
	# Owner, 2026-08-27: "there are no crew members that are canon, only
	# mainline characters. every other name is generated from first and last
	# pool to make combo." `COMBAT.md` §7.1 already said the same thing —
	# named characters are FFT story units, "everyone else is disposable...
	# generated... their interest comes from generated traits worth reading,
	# not from authorship" — but six crew shipped with hand-written names
	# anyway, and one of them turned up on a battle screen looking like canon.
	#
	# The slice still defines six recruitable people, because the content
	# needs six distinct field roles to hire and their stats, wage and origin
	# are real authorship. It does not get to name them: the name comes from
	# the same first/family pools as anyone hired off the street, seeded from
	# the crew id so a slot is the same person in every run and across a save.
	#
	# NOTE the overloaded word. A crew member's `named` flag is NOT "is canon"
	# — `content/validate-slice.mjs` uses it to mean "an encounter refers to
	# this id, so careers must not retire them and break that content". That
	# is a content-dependency fact and is left alone here.
	for c in slice.get("crew", []):
		var rec: Dictionary = c.duplicate(true)
		rec["name"] = CrewGenerator.name_for_id(String(rec.get("id", "")))
		_crew[rec["id"]] = rec
	for p in slice.get("products", []):
		_products[p["id"]] = p
	for b in slice.get("battles", []):
		_battles[b["id"]] = b
	for v in slice.get("optional_visits", []):
		_visits[v["id"]] = v
	for ev in road.get("events", []):
		_road_events[ev["id"]] = ev


## Cross-check every reference the slice and map make at each other.
## A dangling ID here is exactly what §9 item 8 forbids.
func _verify_references() -> void:
	for s in _sites.values():
		if not _anchors.has(s.get("anchorId", "")):
			errors.append("site '%s' references unknown anchor '%s'" % [s["id"], s.get("anchorId", "")])

	for e in _edges:
		for endpoint in ["from", "to"]:
			if not _anchors.has(e.get(endpoint, "")):
				errors.append("edge '%s' references unknown anchor '%s'" % [e.get("id", "?"), e.get(endpoint, "")])

	for enc in _encounters.values():
		var sid: String = enc.get("site_id", "")
		if sid != "" and not _sites.has(sid):
			errors.append("encounter '%s' references unknown site '%s'" % [enc["id"], sid])

	for o in _offers.values():
		if not _anchors.has(o.get("anchor_id", "")):
			errors.append("offer '%s' references unknown anchor '%s'" % [o["id"], o.get("anchor_id", "")])
		if not _products.has(o.get("product_id", "")):
			errors.append("offer '%s' references unknown product '%s'" % [o["id"], o.get("product_id", "")])

	for m in _missions.values():
		var dest: String = m.get("destination_anchor_id", "")
		if dest != "" and not _anchors.has(dest):
			errors.append("mission '%s' references unknown anchor '%s'" % [m["id"], dest])

	# The road and the story point INTO the slice and the map, so they are
	# checked the same way: a road fight must name a real battle, and a case
	# must stand somewhere on the map and brief missions that exist.
	for ev in _road_events.values():
		for ch in ev.get("choices", []):
			for fx in ch.get("effects", []):
				var f := String(fx)
				if f.begins_with("start-battle:") and not _battles.has(f.substr(13)):
					errors.append("road event '%s' starts unknown battle '%s'" % [ev["id"], f.substr(13)])
	for v in _visits.values():
		if not _sites.has(String(v.get("site_id", ""))):
			errors.append("visit '%s' references unknown site '%s'" % [v["id"], v.get("site_id", "")])
		if not _encounters.has(String(v.get("requires_encounter", ""))):
			errors.append("visit '%s' requires unknown encounter '%s'" % [v["id"], v.get("requires_encounter", "")])
	for sm in story.get("missions", []):
		if not _missions.has(String(sm.get("id", ""))):
			errors.append("story briefs unknown mission '%s'" % sm.get("id", ""))
	var the_case: Dictionary = story.get("case", {})
	if not the_case.is_empty() and not _anchors.has(String(the_case.get("anchor_id", ""))):
		errors.append("story case '%s' stands at unknown anchor '%s'" % [
			the_case.get("id", ""), the_case.get("anchor_id", "")])

	# A door stands somewhere on the map, shows a registered scene there, and a
	# door that can become a fight names a real battle.
	var door_scenes: Dictionary = doors.get("rules", {}).get("scenes", {})
	for t in doors.get("templates", []):
		for a in t.get("anchors", []):
			if not _anchors.has(String(a)):
				errors.append("door '%s' happens at unknown anchor '%s'" % [t.get("id", ""), a])
			elif not door_scenes.has(String(a)):
				errors.append("door '%s' has no scene at '%s'" % [t.get("id", ""), a])
		var fight: Dictionary = t.get("fight", {}) if typeof(t.get("fight", null)) == TYPE_DICTIONARY else {}
		if not fight.is_empty() and not _battles.has(String(fight.get("battle", ""))):
			errors.append("door '%s' fights unknown battle '%s'" % [t.get("id", ""), fight.get("battle", "")])

	var campaign: Dictionary = slice.get("campaign", {})
	if not _anchors.has(campaign.get("start_anchor_id", "")):
		errors.append("campaign start_anchor_id '%s' is not a known anchor" % campaign.get("start_anchor_id", ""))
	if not _sites.has(campaign.get("start_site_id", "")):
		errors.append("campaign start_site_id '%s' is not a known site" % campaign.get("start_site_id", ""))


# ── lookups: every one errors loudly rather than substituting ──────────────

func anchor(id: String) -> Dictionary:
	return _require(_anchors, id, "anchor")

func site(id: String) -> Dictionary:
	return _require(_sites, id, "site")

func encounter(id: String) -> Dictionary:
	if _door_encounters.has(id):
		return _door_encounters[id]
	return _require(_encounters, id, "encounter")


## A taken door is the block's encounter (web `doorEncounter`), built from its
## template at runtime. Like generated crew it lives in an overlay, never in
## canon: GameState owns the record and puts it back after a load.
var _door_encounters: Dictionary = {}


func register_door_encounter(enc: Dictionary) -> void:
	var id := String(enc.get("id", ""))
	if id == "" or _encounters.has(id):
		push_error("ContentRegistry: door encounter '%s' collides with canon" % id)
		return
	_door_encounters[id] = enc


func forget_door_encounters() -> void:
	_door_encounters.clear()


func is_door_encounter(id: String) -> bool:
	return _door_encounters.has(id)

func offer(id: String) -> Dictionary:
	return _require(_offers, id, "offer")

func mission(id: String) -> Dictionary:
	return _require(_missions, id, "mission")

## Crew hired off the street (COMBAT.md §7) are not in the authored slice, so
## they are kept in an overlay rather than written into canon. Canon stays
## immutable and loaded-from-disk; the overlay is runtime state that GameState
## owns and re-registers after a load.
var _generated: Dictionary = {}


## Is this id somebody's crew record at all?
##
## Opponents and third parties are fighters with a `character_id` that is not a
## crew id, so asking about them is ordinary rather than exceptional — and
## `crew_member()` pushes an error, which turned a normal question into log spam.
func has_crew(id: String) -> bool:
	return _generated.has(id) or _crew.has(id) or _is_protagonist(id)


## Web `crewRecord`: a slot, a hire, or Aatami himself (v4.66, owner answer
## 24). He is a mainline character, so his authored name stands.
func crew_member(id: String) -> Dictionary:
	if _generated.has(id):
		return _generated[id]
	if not _crew.has(id) and _is_protagonist(id):
		return protagonist()
	return _require(_crew, id, "crew")


## Aatami's fighter record (`content.protagonist`, COMBAT.md §9.9.1): named,
## no career ceiling, and on the board until he can field a crew of three.
func protagonist() -> Dictionary:
	return slice.get("protagonist", {})


func _is_protagonist(id: String) -> bool:
	return id != "" and String(protagonist().get("id", "")) == id


func register_generated_crew(record: Dictionary) -> void:
	var id := String(record.get("id", ""))
	if id == "":
		push_error("ContentRegistry: generated crew with no id")
		return
	if _crew.has(id) or _is_protagonist(id):
		# A generated id colliding with an authored one would silently shadow a
		# story character, which is the worst failure this file can have.
		push_error("ContentRegistry: generated crew '%s' collides with canon" % id)
		return
	_generated[id] = record


func forget_generated_crew() -> void:
	_generated.clear()

func product(id: String) -> Dictionary:
	return _require(_products, id, "product")

func battle(id: String) -> Dictionary:
	return _require(_battles, id, "battle")

func road_event(id: String) -> Dictionary:
	return _require(_road_events, id, "road event")

func visit(id: String) -> Dictionary:
	return _require(_visits, id, "visit")

## Optional visits (web `visits.js`): a scene you may drop into, never a block.
func visits() -> Array:
	return slice.get("optional_visits", [])

## The road's authored events, in authored order (the order IS the tie-break).
func road_events() -> Array:
	return road.get("events", [])

func road_rules() -> Dictionary:
	return road.get("rules", {})

## The door templates and their rules (content/doors-v1.json).
func door_rules() -> Dictionary:
	return doors.get("rules", {})

func door_templates() -> Array:
	return doors.get("templates", [])

## A mission's woven words (premise, plants) from the story, or {}.
func story_mission(id: String) -> Dictionary:
	for m in story.get("missions", []):
		if String(m.get("id", "")) == id:
			return m
	return {}

func story_clues() -> Array:
	return story.get("clues", [])

func story_case() -> Dictionary:
	return story.get("case", {})

func story_thread() -> Dictionary:
	return story.get("thread", {})


func _require(table: Dictionary, id: String, kind: String) -> Dictionary:
	if not table.has(id):
		push_error("ContentRegistry: unknown %s id '%s'" % [kind, id])
		return {}
	return table[id]


# ── collections ────────────────────────────────────────────────────────────

func anchors() -> Array:
	return map.get("anchors", [])

func edges() -> Array:
	return _edges

func sites_for_anchor(anchor_id: String) -> Array:
	var out: Array = []
	for s in _sites.values():
		if s.get("anchorId", "") == anchor_id:
			out.append(s)
	return out

func encounters_at_site(site_id: String) -> Array:
	var out: Array = []
	for e in _encounters.values():
		if e.get("site_id", "") == site_id:
			out.append(e)
	return out

func offers_for_anchor(anchor_id: String) -> Array:
	var out: Array = []
	for o in _offers.values():
		if o.get("anchor_id", "") == anchor_id:
			out.append(o)
	return out

func all_offers() -> Array:
	return _offers.values()

func campaign() -> Dictionary:
	return slice.get("campaign", {})


## The authored schedule: one Day/Night block per entry. A door block (H2)
## carries `door: true` and no encounter until a door is taken.
func schedule() -> Array:
	return slice.get("schedule", [])


## Index of a block within the slice, 0-based. Day 1 day = 0, day 1 night = 1.
static func block_ordinal(d: int, b: String) -> int:
	return (d - 1) * 2 + (1 if b == "night" else 0)


func scheduled_for(d: int, b: String) -> Dictionary:
	for entry in schedule():
		if int(entry.get("day", 0)) == d and String(entry.get("block", "")) == b:
			return entry
	return {}


## A news bulletin by id.
func news(id: String) -> Dictionary:
	for n in slice.get("news", []):
		if String(n.get("id", "")) == id:
			return n
	return {}


## The bulletin scheduled to play BEFORE this block, if any.
func news_before(d: int, b: String) -> String:
	var entry := scheduled_for(d, b)
	return String(entry.get("news_before", ""))


## The schedule entry that introduces this encounter, if any.
func schedule_of_encounter(encounter_id: String) -> Dictionary:
	for entry in schedule():
		if String(entry.get("encounter_id", "")) == encounter_id:
			return entry
	return {}

func board_size() -> Vector2:
	var board: Dictionary = map.get("coordinateSystem", {}).get("board", {})
	return Vector2(board.get("width", 1000), board.get("height", 1000))
