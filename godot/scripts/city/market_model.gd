class_name PiritoriMarket
extends RefCounted
## The market model — `market/model.mjs`, ported for the board (web `board.js`).
##
## The web build has read its prices off this model since the board landed;
## the Godot build had no board at all, so Toko's bowl (v4.61) had nowhere to
## put what he says. This is the part of the model the board needs — the
## offer, how knowledge decays, and what the player is shown — and nothing
## else (exposure stays web-only for now).
##
## THE STRUCTURAL RULE, unchanged: a price is a PRODUCT OF NAMED FACTORS, and
## the reason shown is the factor furthest from 1. The numbers are balance
## values, not researched prices; the goods are abstract (DESIGN_LOCKS §9.1).
##
## PARITY, not resemblance: the seeded noise is xmur3 + mulberry32 done in
## unsigned 32-bit arithmetic exactly as the JS does it, so the same save quotes
## the same price in both builds. `tests/test_story.gd` holds numbers computed
## by the web module and fails if a single one moves.

const INFO_QUOTE := "quote"
const INFO_RANGE := "range"
const INFO_RUMOUR := "rumour"
const INFO_NONE := "none"
const LEVELS := [INFO_QUOTE, INFO_RANGE, INFO_RUMOUR, INFO_NONE]

## The slice trades piri only (DESIGN_LOCKS §9.1).
const GOODS := {
	"piri": {"base": 60.0, "volatility": 0.16},
}

## demand, supply, liquidity, volatility, spread, watch — per role.
const ROLE := {
	"market": [0.10, 0.30, 0.30, 0.05, -0.05, 0.20],
	"crowd-source": [0.22, 0.00, 0.25, 0.08, -0.02, 0.15],
	"nightlife": [0.30, 0.05, 0.20, 0.18, -0.03, 0.10],
	"transfer": [0.08, 0.15, 0.15, 0.04, -0.04, 0.25],
	"residential": [0.12, -0.05, -0.15, -0.08, 0.08, -0.15],
	"home": [0.05, -0.05, -0.10, -0.06, 0.06, -0.20],
	"family": [0.00, -0.05, -0.10, -0.05, 0.05, -0.20],
	"docks": [-0.10, 0.35, 0.10, 0.10, 0.02, -0.05],
	"industrial": [-0.12, 0.28, 0.05, 0.08, 0.03, -0.10],
	"faction": [0.05, 0.30, 0.15, 0.15, -0.06, 0.05],
	"park": [0.15, 0.00, 0.05, 0.06, 0.02, 0.00],
	"social": [0.14, 0.00, 0.08, 0.05, 0.00, 0.02],
	"shops": [0.06, 0.05, 0.05, 0.00, 0.02, 0.10],
	"service": [0.04, 0.05, 0.05, 0.00, 0.01, 0.05],
	"information": [0.00, 0.05, 0.00, -0.02, -0.10, 0.05],
	"nightclub": [0.28, 0.05, 0.18, 0.16, -0.02, 0.10],
	"landmark": [-0.05, -0.05, -0.10, 0.00, 0.06, 0.10],
	"orientation": [0.00, 0.00, -0.05, 0.00, 0.03, 0.05],
	"threshold": [0.05, 0.05, 0.05, 0.02, 0.00, 0.10],
	"sport": [0.08, 0.00, 0.05, 0.04, 0.02, 0.02],
	"recruitment": [0.02, 0.05, 0.05, 0.02, 0.00, 0.05],
	"mission": [0.00, 0.00, 0.00, 0.02, 0.00, 0.05],
	"weather": [0.00, 0.00, 0.00, 0.03, 0.00, 0.00],
	"opening": [0.05, 0.05, 0.05, 0.02, 0.00, 0.05],
	"expansion": [0.00, 0.05, 0.05, 0.05, 0.04, -0.05],
	"rail-edge": [-0.05, 0.15, 0.00, 0.06, 0.05, -0.05],
}

const M32 := 0xFFFFFFFF


# ── seeded noise: xmur3 + mulberry32, unsigned 32-bit ─────────────────────

static func _imul(a: int, b: int) -> int:
	return GameState.imul32(a, b)


static func _hash_first(text: String) -> int:
	var h := (1779033703 ^ text.length()) & M32
	for i in text.length():
		h = _imul(h ^ text.unicode_at(i), 3432918353)
		h = ((h << 13) & M32) | (h >> 19)
	h = _imul(h ^ (h >> 16), 2246822507)
	h = _imul(h ^ (h >> 13), 3266489909)
	h = (h ^ (h >> 16)) & M32
	return h


## `rand01(...parts)`: the parts joined with "|", a repeatable float in [0, 1).
static func rand01(parts: Array) -> float:
	var strs := PackedStringArray()
	for p in parts:
		strs.append(str(p))
	var t := _hash_first("|".join(strs))
	t = _imul(t ^ (t >> 15), t | 1)
	t = (t ^ ((t + _imul(t ^ (t >> 7), t | 61)) & M32)) & M32
	return float((t ^ (t >> 14)) & M32) / 4294967296.0


# ── a place's profile, derived from its roles ─────────────────────────────

static func node_profile(anchor: Dictionary) -> Dictionary:
	var p := [0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
	for r in anchor.get("roles", []):
		var v: Array = ROLE.get(String(r), [])
		if v.is_empty():
			continue
		for i in 6:
			p[i] += float(v[i])
	return {
		"demand": clampf(1.0 + p[0], 0.72, 1.42),
		"supply": clampf(1.0 + p[1], 0.72, 1.55),
		"liquidity": clampf(2.0 + p[2] * 6.0, 2.0, 10.0),
		"volatility": clampf(1.0 + p[3], 0.7, 1.6),
		"spread": clampf(0.16 + p[4], 0.06, 0.34),
		"watch": clampf(1.0 + p[5], 0.5, 1.6),
	}


# ── the factors: [multiplier, cause id, cause key] ─────────────────────────
# The cause KEY names a row in locale/ui.csv, so the reason is said in the
# player's language rather than in the model's English.

static func _f_site(prof: Dictionary) -> Array:
	var m: float = prof["demand"] / prof["supply"]
	var key := "board.why_thin" if m > 1.08 else ("board.why_supplied" if m < 0.93 else "board.why_area")
	return [m, "site", key]


static func _f_day(prof: Dictionary, d: int) -> Array:
	var weekend := (d % 7) >= 4 and (d % 7) <= 5
	var swing: float = (prof["volatility"] - 1.0) * 0.5 + 0.06
	var m := 1.0 + swing if weekend else 1.0 - swing * 0.35
	return [m, "weekend" if weekend else "midweek",
		"board.why_weekend" if weekend else "board.why_midweek"]


static func _f_block(prof: Dictionary, block: String) -> Array:
	var swing: float = (prof["volatility"] - 1.0) * 0.35
	if block == "night":
		return [1.0 + swing + 0.05, "hour", "board.why_late"]
	if block == "evening":
		return [1.0 + swing * 0.5 + 0.02, "hour", "board.why_evening"]
	return [1.0, "hour", "board.why_hour"]


static func _f_noise(prof: Dictionary, good: String, node_id: String, d: int, seed: String) -> Array:
	var g: Dictionary = GOODS[good]
	var r := rand01([seed, node_id, good, d])
	var amp: float = float(g["volatility"]) * prof["volatility"] * 0.5
	return [1.0 + (r * 2.0 - 1.0) * amp, "drift", "board.why_drift"]


static func _f_saturation(prof: Dictionary, units: int) -> Array:
	if units == 0:
		return [1.0, "saturation", "board.why_untouched"]
	var m := clampf(exp(-float(units) / (prof["liquidity"] * 4.5)), 0.55, 1.6)
	return [m, "saturation", "board.why_selling" if units > 0 else "board.why_buying"]


static func _round2(v: float) -> float:
	# JS Math.round rounds half UP; these are positive prices, where
	# floor(x + 0.5) is the same thing.
	return floor(v * 100.0 + 0.5) / 100.0


## The true offer at a place: {buy, sell, mid, market_mid, cause, cause_key}.
## `clock` is {day, block}; `units` your footprint; `rapport` 0..1.
static func offer(anchor: Dictionary, good: String, clock: Dictionary, seed: String,
		units: int = 0, rapport: float = 0.0) -> Dictionary:
	var g: Dictionary = GOODS[good]
	var prof := node_profile(anchor)
	var sat := _f_saturation(prof, units)
	var factors := [
		_f_site(prof),
		_f_day(prof, int(clock.get("day", 1))),
		_f_block(prof, String(clock.get("block", "day"))),
		[1.0, "shock", "board.why_ordinary"],   # no campaign shocks in the slice
		sat,
		_f_noise(prof, good, String(anchor.get("id", "")), int(clock.get("day", 1)), seed),
	]
	var m := 1.0
	for f in factors:
		if String(f[1]) != "saturation":
			m *= float(f[0])
	m = clampf(m, 0.6, 1.75)
	var mid0: float = float(g["base"]) * m

	var best: Array = []
	var best_w := -1.0
	for f in factors:
		if String(f[1]) == "drift":
			continue
		var w: float = absf(log(float(f[0])))
		if w > best_w:
			best_w = w
			best = f
	var quiet := best.is_empty() or best_w < 0.04

	var spread: float = prof["spread"] * (1.0 - clampf(rapport, 0.0, 1.0) * 0.5)
	var buy := mid0 * (1.0 + spread / 2.0)
	var sell := mid0 * (1.0 - spread / 2.0)
	if units > 0:
		sell *= float(sat[0])
	elif units < 0:
		buy *= float(sat[0])
	return {
		"market_mid": _round2(mid0),
		"mid": _round2((buy + sell) / 2.0),
		"buy": _round2(buy),
		"sell": _round2(sell),
		"cause": "ordinary" if quiet else String(best[1]),
		"cause_key": "board.why_ordinary" if quiet else String(best[2]),
	}


# ── information: one thing decaying (MARKET.md §5) ────────────────────────

## Age sets a CEILING on how good what you know can be; a place you have
## worked never falls below a rumour, one you have not stays dark.
static func decay(level: String, blocks: int, visited: bool) -> String:
	var floor_i := 2 if visited else 3
	if level == INFO_NONE:
		return LEVELS[mini(3, floor_i)]
	var ceiling := 0 if blocks <= 1 else (1 if blocks <= 4 else (2 if blocks <= 12 else 3))
	return LEVELS[mini(floor_i, maxi(LEVELS.find(level), ceiling))]


## What the player is shown. A range is generated AROUND the truth, so the
## band never excludes the real price.
static func present(truth: Dictionary, level: String, blocks: int, seed: String,
		node_id: String, good: String, visited: bool) -> Dictionary:
	var lv := decay(level, blocks, visited)
	if lv == INFO_NONE:
		return {"level": lv}
	if lv == INFO_QUOTE:
		return {"level": lv, "buy": truth["buy"], "sell": truth["sell"], "age": blocks,
			"cause_key": truth["cause_key"]}
	if lv == INFO_RANGE:
		var w := 0.08 + minf(0.22, float(blocks) * 0.02)
		var off := (rand01([seed, node_id, good, "band", blocks]) * 2.0 - 1.0) * w * 0.4
		return {"level": lv, "age": blocks,
			"low_buy": _round2(float(truth["buy"]) * (1.0 - w + off)),
			"high_buy": _round2(float(truth["buy"]) * (1.0 + w + off)),
			"low_sell": _round2(float(truth["sell"]) * (1.0 - w + off)),
			"high_sell": _round2(float(truth["sell"]) * (1.0 + w + off)),
			"cause_key": truth["cause_key"]}
	var rel: float = float(truth["mid"]) / float(GOODS.get(good, GOODS["piri"])["base"])
	return {"level": lv, "age": blocks,
		"direction": "dear" if rel > 1.12 else ("cheap" if rel < 0.9 else "ordinary"),
		"cause_key": truth["cause_key"]}
