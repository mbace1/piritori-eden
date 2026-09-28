class_name PiritoriVisits
extends RefCounted
## Optional visits (web `web/js/v3/visits.js`, the reference).
##
## A visit is a scene you may drop into where you stand — Jaska's room after
## the receipt, Toko's after service, Brahenkenttä on a Thursday (v4.62, G3).
## It has an encounter's shape (opening, inspectables, choices) but it is never
## on the schedule: it is answered once, records what the choice says (the
## slice gives visits only memories), and it never turns the block.
##
## The Godot port had no visits until the Thursday Load needed one: the only
## way to see the load go onto the 3 is the Brahenkenttä visit, and that is one
## of the case's three key clues.


## Visits open here, now (web `availableVisits`).
static func available() -> Array:
	if GameState.chapter_cleared or GameState.ending_id != "" or GameState.is_slice_complete():
		return []
	var out: Array = []
	for v in ContentRegistry.visits():
		if int(v.get("chapter", 1)) != GameState.chapter:
			continue
		if not GameState.is_resolved(String(v.get("requires_encounter", ""))):
			continue
		if GameState.is_resolved(String(v.get("id", ""))):
			continue
		var site := ContentRegistry.site(String(v.get("site_id", "")))
		if String(site.get("anchorId", "")) != GameState.current_anchor_id:
			continue
		out.append(v)
	return out


static func is_available(visit_id: String) -> bool:
	return available().any(func(v): return String(v.get("id", "")) == visit_id)


## Answer a visit once. {ok, reason}
static func resolve(visit_id: String, choice_id: String) -> Dictionary:
	if not is_available(visit_id):
		return {"ok": false, "reason": "visit-unavailable"}
	var visit := ContentRegistry.visit(visit_id)
	var choice: Dictionary = {}
	for ch in visit.get("choices", []):
		if String(ch.get("id", "")) == choice_id:
			choice = ch
	if choice.is_empty():
		return {"ok": false, "reason": "unknown-choice"}
	if not GameState.meets_all(choice.get("requirements", [])):
		return {"ok": false, "reason": "refused"}
	GameState.apply_effects(choice.get("effects", []))
	GameState.resolved_encounters[visit_id] = choice_id
	GameState.decision_recorded.emit("visit", visit_id, choice_id)
	GameState.state_changed.emit()
	return {"ok": true, "reason": ""}
