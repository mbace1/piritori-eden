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

var map: Dictionary = {}
var slice: Dictionary = {}
var art: Dictionary = {}

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


func _ready() -> void:
	load_all()


func load_all() -> bool:
	errors.clear()
	map = _load_json(MAP_PATH)
	slice = _load_json(SLICE_PATH)
	art = _load_json(ART_PATH)
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
	for c in slice.get("crew", []):
		_crew[c["id"]] = c
	for p in slice.get("products", []):
		_products[p["id"]] = p
	for b in slice.get("battles", []):
		_battles[b["id"]] = b


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
	return _require(_encounters, id, "encounter")

func offer(id: String) -> Dictionary:
	return _require(_offers, id, "offer")

func mission(id: String) -> Dictionary:
	return _require(_missions, id, "mission")

func crew_member(id: String) -> Dictionary:
	return _require(_crew, id, "crew")

func product(id: String) -> Dictionary:
	return _require(_products, id, "product")

func battle(id: String) -> Dictionary:
	return _require(_battles, id, "battle")


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


## The authored 14-block schedule: one encounter per Day/Night block.
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
