class_name PiritoriToko
extends RefCounted
## Toko Slomo's counter — Tokon Ramen, Vaasankatu (web Act I v4.60/v4.61,
## `web/js/v3/toko.js`, the reference).
##
## GDD §14.3: Toko "offers insider fragments, introductions and uncertain
## sabotage wagers". GDD §7.4: "Toko Slomo unlocks price ranges and information
## purchases." Owner, 2026-09-27: Tokon Ramen is on Vaasankatu (answer 16) and
## Toko can be the first shop, so the counter is open from day one.
##
## A BOWL is the purchase: €6, one a block, and it buys what he heard — a RANGE
## (never a quote) for the best place to sell that you have no range or quote
## for right now. Saved as `heard[anchor] = block` and `tokoBowlAt`; it never
## marks the place seen.
##
## EARLY WEAPONS (owner: "Slo-mo can sell early weapons as well"): purchasable
## weapon gear that is not a firearm, at the street price. The first handgun,
## the fence and the rest of the gear stay with the Piritori street seller.

const BOWL_EUR := 6
const ANCHOR := "vaasankatu"


## Why a bowl cannot be bought right now, or "".
static func bowl_blocker() -> String:
	if GameState.current_anchor_id != ANCHOR:
		return "not-here"
	if GameState.toko_bowl_at == GameState.block_index:
		return "already-this-block"
	if GameState.cash_eur < BOWL_EUR:
		return "cash"
	return ""


## The place he would talk about: the best sell price you do not know.
static func tip() -> Dictionary:
	var unknown: Array = []
	for r in PiritoriBoard.rows():
		var lv := String(r["shown"]["level"])
		if bool(r["here"]) or String(r["id"]) == ANCHOR:
			continue
		if lv == PiritoriMarket.INFO_QUOTE or lv == PiritoriMarket.INFO_RANGE:
			continue
		unknown.append(r)
	if unknown.is_empty():
		return {}
	unknown.sort_custom(func(a, b):
		var sa := float(a["truth"]["sell"])
		var sb := float(b["truth"]["sell"])
		if sa != sb:
			return sa > sb
		return String(a["id"]) < String(b["id"]))
	return unknown[0]


## Buy a bowl and hear one range. {ok, anchor_id, reason}
static func buy_bowl() -> Dictionary:
	var reason := bowl_blocker()
	if reason != "":
		return {"ok": false, "reason": reason, "anchor_id": ""}
	var t := tip()
	GameState.cash_eur -= BOWL_EUR
	GameState.toko_bowl_at = GameState.block_index
	var told := ""
	if not t.is_empty():
		told = String(t["id"])
		GameState.heard[told] = GameState.block_index
	GameState.decision_recorded.emit("toko-bowl", ANCHOR, told)
	GameState.state_changed.emit()
	return {"ok": true, "anchor_id": told, "reason": ""}


## The early weapons under his counter, in content order.
static func weapons() -> PackedStringArray:
	var out := PackedStringArray()
	for e in ContentRegistry.slice.get("equipment", []):
		var id := String(e.get("id", ""))
		if String(e.get("kind", "")) != "weapon" or String(e.get("hold", "")).contains("firearm"):
			continue
		if not GameState.is_purchasable(id) or GameState.buy_of(id) <= 0:
			continue
		out.append(id)
	return out


## Buy one early weapon from Toko. {ok, paid, reason}
static func buy_weapon(equipment_id: String) -> Dictionary:
	if GameState.current_anchor_id != ANCHOR:
		return {"ok": false, "paid": 0, "reason": "not-here"}
	if not weapons().has(equipment_id):
		return {"ok": false, "paid": 0, "reason": "not-sold-here"}
	var price := GameState.buy_of(equipment_id)
	if GameState.cash_eur < price:
		return {"ok": false, "paid": 0, "reason": "cash"}
	GameState.cash_eur -= price
	GameState.add_equipment(equipment_id, GameState.Condition.NEW)
	GameState.decision_recorded.emit("toko-weapon", ANCHOR, equipment_id)
	GameState.state_changed.emit()
	return {"ok": true, "paid": price, "reason": ""}
