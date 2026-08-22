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

## Depth rows per side: front, middle, back.
static var rows: int = 3

## Lateral lanes across the board.
static var lanes: int = 6

## Owner ruling, 2026-08-21: the board grows. `GDD` §13.3 locked 3x3 per side
## with 3x4 as an arena modifier, sized for a game where combat was rare
## punctuation. `PHASING.md` §0 made the grid fighter the base game, and a
## board that reads as a chessboard corner is not enough stage for it.
##
## 4 rows x 5 lanes is 20 cells a side, 40 in play — up from 18. Deliberately
## short of Into the Breach's 8x8, which survives that size only because units
## walk freely; §13.3's "no free walking, no movement-point economy" would not.
##
## The fourth row is named `rear` in BattleBuilder.ROWS. That name is a
## PLACEHOLDER pending an owner word: front/middle/back are semantic in §13.5
## (close pressure / flexible / long-range safety) and "rear" does not obviously
## earn a fourth meaning. Authored content only uses the first three, so nothing
## depends on it yet. DESIGN_LOCKS §13 forbids hardening it silently.
const CANON_ROWS := 3
const CANON_LANES := 6


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


## True when the slot exists on the board. A slot's second component is a
## UNIFIED DEPTH, 0 .. total_rows()-1, not a per-side row.
##
## Owner ruling, 2026-08-21: "crews start in their colour areas and can move to
## all coloured areas." So the board is one grid that everyone shares — a
## fighter's depth ranges over the whole thing, and side decides only where they
## BEGIN and which team they are on.
static func has_slot(lane: int, depth: int) -> bool:
	return lane >= 0 and lane < lanes and depth >= 0 and depth < total_rows()


static func clamp_lane(lane: int) -> int:
	return clampi(lane, 0, lanes - 1)


## Clamp within ONE SIDE's band, for reading authored cell ids.
static func clamp_row(row: int) -> int:
	return clampi(row, 0, rows - 1)


## Clamp anywhere on the shared board.
static func clamp_depth(depth: int) -> int:
	return clampi(depth, 0, total_rows() - 1)


## The depths a side starts on. Movement is not limited to these.
static func home_band(is_player: bool) -> Array[int]:
	var out: Array[int] = []
	for r in range(rows):
		out.append(depth_of(r, is_player))
	out.sort()
	return out


## Which band a depth belongs to: -1 player, 0 neutral, 1 opposition.
static func band_of(depth: int) -> int:
	if depth < rows:
		return -1
	if is_neutral_depth(depth):
		return 0
	return 1


## Cells per side. Used by the deployment fallback and by the gates.
static func cell_count() -> int:
	return rows * lanes


## The lane index the board is centred on, as a float — 1.0 for three lanes,
## 1.5 for four. The view offsets by this so an even lane count straddles the
## centre line rather than sitting off to one side.
static func lane_centre() -> float:
	return (float(lanes) - 1.0) * 0.5


## Rows of NO MAN'S LAND between the two sides.
##
## Owner direction, 2026-08-21: the halves are joined. They used to be two
## mirrored boards floating apart across a CENTRE_GAP measured in tiles, which
## read as two grids rather than one battlefield. Now it is a single grid with a
## neutral band down the middle — from the side, three blue, two grey, three red.
##
## The grey rows are real cells. Nothing deploys there, but they are ground a
## unit can be pushed or repositioned into, and they are what a charge crosses.
const NEUTRAL_ROWS := 2


## Total depth of the unified grid: both sides plus the neutral band.
static func total_rows() -> int:
	return rows * 2 + NEUTRAL_ROWS


## A side's row index mapped onto the one shared depth axis.
##
## FRONT is the row nearest the middle for BOTH sides, which is what makes the
## grid read as two crews facing each other rather than two grids side by side.
## So the player's rows count backwards from the neutral band, and the
## opposition's count forwards from it.
static func depth_of(row: int, is_player: bool) -> int:
	if is_player:
		return rows - 1 - clamp_row(row)
	return rows + NEUTRAL_ROWS + clamp_row(row)


## True for the grey band in the middle — no side's ground.
static func is_neutral_depth(depth: int) -> bool:
	return depth >= rows and depth < rows + NEUTRAL_ROWS


## Half the grid's depth, in tiles, measured from the middle.
static func depth_reach() -> float:
	return (float(total_rows()) - 1.0) * 0.5 + 0.5


## How far the board reaches from its centre along each isometric axis. The view
## divides the floor by this to size a tile.
static func reach() -> float:
	return maxf(depth_reach(), lane_centre() + 0.5)
