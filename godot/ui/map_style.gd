class_name MapStyle
extends RefCounted
## Authored map treatment, lifted verbatim from the <style> block of
## map/kallio-era1-2003-v1.svg — the canonical structural drawing.
##
## MAP.md §6 "Map art treatment":
##   dark charcoal and blue-black relief card; grey road strips with irregular
##   hand-cut edges; torn tan fibres at coast and district seams; limited cyan,
##   magenta, mustard and orange for live information; small neutral residents
##   as paper pips; restrained shadows indicating physical layer depth; sparse
##   marker names on separate rough paper tabs.
##
## Stroke widths are in BOARD units and must be multiplied by the view scale.

# ── surfaces ──────────────────────────────────────────────────────────────
const WATER := Color("#102530")          ## waterNoise base
const WATER_WAVE := Color("#19404e")
const LAND := Color("#171d20")           ## paperNoise base
const LAND_FIBRE := Color("#9b7e59")     ## torn tan seam
const LAND_FIBRE_W := 7.0
const PAPER_GRAIN := Color("#273034")
const WATER_SHADOW := Color("#0f2934")

## The urban bed the blocks are cut out of. Streets read as the GAPS between
## blocks, so the bed must be lighter than the block faces — that is what makes
## the collage look like a street grid rather than scattered cards.
const STREET_BED := Color("#3a4143")

const BLOCK := Color("#252c2f")
const BLOCK_EDGE := Color("#111719")
const BLOCK2 := Color("#20272a")
const BLOCK2_EDGE := Color("#101416")
const BLOCK_W := 3.0

# ── ways ──────────────────────────────────────────────────────────────────
const ROAD := Color("#555b5b")
const ROAD_W := 18.0
const ROAD_INNER := Color("#2e3538")
const ROAD_INNER_W := 11.0
const STREET := Color("#42494b")
const STREET_W := 7.0

const RAIL := Color("#090c0e")
const RAIL_W := 18.0
const RAIL_TIE := Color("#8a8272")
const RAIL_TIE_W := 3.0
const RAIL_TIE_DASH := Vector2(4, 12)

const TRAM := Color("#71885b")
const TRAM_W := 8.0
const METRO := Color("#c1783b")
const METRO_W := 7.0
const METRO_DASH := Vector2(13, 9)

# ── live information ──────────────────────────────────────────────────────
const ROUTE := Color("#43b8c4")          ## crew / player route
const ROUTE_W := 8.0
const GOODS := Color("#bd568c")          ## product movement
const GOODS_W := 7.0
const GOODS_DASH := Vector2(11, 10)

# ── anchors ───────────────────────────────────────────────────────────────
const NODE_OUTER := Color("#111719")
const NODE_RIM := Color("#b89a6d")
const NODE_RIM_W := 7.0
const NODE_INNER := Color("#1d2528")
const NODE_INNER_EDGE := Color("#0a0d0f")

const ACTIVE := Color("#43b8c4")
const SERVICE := Color("#bd568c")
const WARM := Color("#cc7a3e")
const PARK := Color("#81965c")
const LOCKED := Color("#303638")
const LOCKED_RIM := Color("#77736b")
const TEASER := Color("#22282b")
const TEASER_RIM := Color("#cc7a3e")
const TEASER_DASH := Vector2(8, 6)
const LANDMARK := Color("#b79b70")
const LANDMARK_EDGE := Color("#191d1f")

# ── paper tabs and chrome ─────────────────────────────────────────────────
const TAB := Color("#b79b70")            ## labelTab: tan paper
const TAB_EDGE := Color("#16191b")
const TAB_TEXT := Color("#16191b")
const DARK_TAB := Color("#151b1e")
const DARK_TAB_EDGE := Color("#8a7355")
const DARK_TAB_TEXT := Color("#e6d8bd")

const FRAME := Color("#0d1215")
const FRAME_EDGE := Color("#927b5f")
const TITLE_TEXT := Color("#e6d8bd")
const SUB_TEXT := Color("#83cbd2")
const SMALL_TEXT := Color("#c4b28f")
const TINY_TEXT := Color("#9ea3a0")

const FLOW := Color("#d6c5a5")           ## ordinary residents as paper pips
const FLOW_EDGE := Color("#181b1c")


## Fill/edge for a block, alternating by authored class.
static func block_colors(cls: String) -> Array:
	if cls == "block2":
		return [BLOCK2, BLOCK2_EDGE]
	return [BLOCK, BLOCK_EDGE]


## Disc fill for an anchor's slice state (SVG .active/.locked/.teaser/.landmark).
static func anchor_fill(slice_state: String) -> Color:
	match slice_state:
		"active": return ACTIVE
		"landmark": return LANDMARK
		"teaser": return TEASER
		"locked": return LOCKED
		_: return LOCKED


static func anchor_rim(slice_state: String) -> Color:
	match slice_state:
		"teaser": return TEASER_RIM
		"locked": return LOCKED_RIM
		"landmark": return LANDMARK_EDGE
		_: return NODE_RIM
