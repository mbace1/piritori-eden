class_name FightBoard
extends RefCounted
## The board's shape, in one place.
##
## It was in four: the reach formula and the lane-centring in
## formation_battle.gd, a `dest.x <= 2` in the reposition rules, a `range(3)` in
## the intent scan, and two `clampi(_, 0, 2)` in the builder. Four copies of one
## number is four places to disagree, and the first attempt to try a bigger grid
## found three of them by breaking.
##
## GAME_DESIGN_DOCUMENT §13.3 locks 3x3 per side with 3x4 as a mission modifier,
## and that lock stands as the DEFAULT. But the owner asked (2026-08-21) whether
## it is enough to carry the visuals the reference games have, and that is a
## question you answer by looking rather than by arguing. So the shape is a
## variable with a canon default, overridable for a comparison:
##
##     ?rows=4&lanes=5
##
## Nothing may READ these at parse time into another constant. Read them where
## they are used, or the override silently does nothing — the same trap
## PAL.CYAN_LUX has in the arcade's Game of Life.

## Depth rows per side: front, middle, back, ... Canon default 3.
static var rows: int = 3

## Lateral lanes across the board. Canon default 3; §13.3 allows 4 as a
## deliberate mission or arena modifier for wide streets, yards and docks.
static var lanes: int = 3

## The canon shape, for resetting after a comparison.
const CANON_ROWS := 3
const CANON_LANES := 3


static func reset() -> void:
	rows = CANON_ROWS
	lanes = CANON_LANES


## Apply a debug override. Returns a description, or "" when nothing changed.
##
## Bounded deliberately: a 1x1 board is not a battle and an 8x8 one is a
## different game that §13.3's "no free walking" rule would not survive.
static func apply_override(want_rows: int, want_lanes: int) -> String:
	var r := clampi(want_rows, 2, 6)
	var l := clampi(want_lanes, 2, 6)
	if r == rows and l == lanes:
		return ""
	rows = r
	lanes = l
	return "board %dx%d per side" % [lanes, rows]


static func is_canon() -> bool:
	return rows == CANON_ROWS and lanes == CANON_LANES


## True when the slot exists on the board. The one place that answers this, so
## reposition, deployment and the intent scan cannot disagree about the edge.
static func has_slot(lane: int, row: int) -> bool:
	return lane >= 0 and lane < lanes and row >= 0 and row < rows


static func clamp_lane(lane: int) -> int:
	return clampi(lane, 0, lanes - 1)


static func clamp_row(row: int) -> int:
	return clampi(row, 0, rows - 1)


## Cells per side. Used by the deployment fallback and by the gates.
static func cell_count() -> int:
	return rows * lanes


## The lane index the board is centred on, as a float — 1.0 for three lanes,
## 1.5 for four. The view offsets by this so an even lane count straddles the
## centre line rather than sitting off to one side.
static func lane_centre() -> float:
	return (float(lanes) - 1.0) * 0.5


## How far the board reaches from the centre line, in tiles, along each
## isometric axis. The view divides the floor by this to size a tile.
static func reach(centre_gap: float) -> float:
	return centre_gap + float(rows - 1) + lane_centre() + 0.5
