class_name PiritoriStanding
extends RefCounted
## The families' standing (H5 of The Long Game; web Act I v4.67,
## `web/js/v3/standing.js`, the reference; VERSIONS.md v4.67 ### Port).
## Corners were shelved by answer 27 (2026-09-30); standing stands alone.
##
## `content/families-v1.json` holds the ladder and the two families. The
## rules, one per line, the same as the web's:
##   - Standing is READ from `GameState.relationships[family]`, which choices,
##     doors and fights already move. The rung is the highest whose `min` the
##     number reaches: Friendly >= 2, Neutral >= 0, Wary -1, Insulted -2,
##     Retaliating -3, Vendetta below.
##   - Friendly: their doors are offered first. Wary or worse: their doors are
##     not offered at all.
##   - Night settles standing (once, after a night block ends):
##       Insulted    -> a restitution demand, once per fall to Insulted;
##       Retaliating -> a warning one night, the retaliation the next;
##       Vendetta    -> the retaliation every night.
##     Demands and retaliation are triggered, repeatable road events, raised
##     one a night like the found-out cut; a family not raised tonight keeps
##     its bookkeeping and tries again tomorrow. The police are not a family.
##
## No clock, no randomness: everything reads `GameState.relationships` and
## writes `GameState.standing` ({warned, demanded}, the web save's key and
## shape). Families are walked in canon order, as the web walks them.

const ORDER := ["friendly", "neutral", "wary", "insulted", "retaliating", "vendetta"]


static func rungs() -> Array:
	return ContentRegistry.family_rungs()


static func families() -> Array:
	return ContentRegistry.families_list()


## The rung a relationship number reads (web `rungOf`).
static func rung_of(value: int) -> Dictionary:
	var all := rungs()
	for r in all:
		if value >= int(r.get("min", 0)):
			return r
	return all[-1] if not all.is_empty() else {}


## {family, value, rung, warned}, or {} for an unknown family (web `standingOf`).
static func standing_of(family_id: String) -> Dictionary:
	var family := ContentRegistry.family(family_id)
	if family.is_empty():
		return {}
	var value := int(GameState.relationships.get(family_id, 0))
	return {"family": family, "value": value, "rung": rung_of(value),
		"warned": bool(state()["warned"].get(family_id, false))}


static func standings() -> Array:
	var out: Array = []
	for f in families():
		out.append(standing_of(String(f.get("id", ""))))
	return out


static func _worse(rung: Dictionary, than: String) -> bool:
	return ORDER.find(String(rung.get("id", ""))) >= ORDER.find(than)


## A door from a family that is Wary or worse is not offered.
static func door_allowed(template: Dictionary) -> bool:
	var s := standing_of(String(template.get("from", "")))
	return s.is_empty() or not _worse(s["rung"], "wary")


## A door from a Friendly family is offered first.
static func door_favoured(template: Dictionary) -> bool:
	var s := standing_of(String(template.get("from", "")))
	return not s.is_empty() and String(s["rung"].get("id", "")) == "friendly"


## The live record, made whole (web `state.standing ??= ...`).
static func state() -> Dictionary:
	if typeof(GameState.standing) != TYPE_DICTIONARY:
		GameState.standing = {}
	if not GameState.standing.has("warned"):
		GameState.standing["warned"] = {}
	if not GameState.standing.has("demanded"):
		GameState.standing["demanded"] = {}
	return GameState.standing


## A saved standing record, made whole: {warned, demanded}, bools by family.
static func normalised(v: Variant) -> Dictionary:
	var out := {"warned": {}, "demanded": {}}
	if typeof(v) != TYPE_DICTIONARY:
		return out
	for k in ["warned", "demanded"]:
		var d: Variant = (v as Dictionary).get(k, null)
		if typeof(d) == TYPE_DICTIONARY:
			for id in d:
				out[k][String(id)] = bool(d[id])
	return out


## Settle standing after a night (web `settleStanding`). Returns
## {raise, warnings}: at most one road event id to raise (the caller raises it
## with `PiritoriRoad.force`), and the warnings to show. Only the family whose
## event is raised has its bookkeeping moved.
static func settle() -> Dictionary:
	var st := state()
	var warnings := PackedStringArray()
	var raise := ""
	for family in families():
		var id := String(family.get("id", ""))
		var rung: Dictionary = standing_of(id)["rung"]
		var rid := String(rung.get("id", ""))
		if not _worse(rung, "insulted"):
			st["demanded"][id] = false
		if not _worse(rung, "retaliating"):
			st["warned"][id] = false
		if rid == "insulted" and not bool(st["demanded"].get(id, false)) and raise == "":
			raise = String(family.get("restitution_event", ""))
			st["demanded"][id] = true
		elif rid == "retaliating":
			if not bool(st["warned"].get(id, false)):
				st["warned"][id] = true
				warnings.append(String(family.get("warning", "")))
			elif raise == "":
				raise = String(family.get("retaliation_event", ""))
				st["warned"][id] = false
		elif rid == "vendetta" and raise == "":
			raise = String(family.get("retaliation_event", ""))
	return {"raise": raise, "warnings": warnings}
