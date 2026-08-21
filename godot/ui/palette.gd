class_name PiritoriPalette
extends RefCounted
## The canonical palette from ART_BIBLE.md §4.2.
##
## ART_BIBLE §4.2: "Colour never carries a rule alone. Each state also uses a
## glyph, line pattern, label, position or motion change. Red and green are
## never the only opposition."
##
## So every helper that returns a colour here has a partner that returns a
## glyph or label. Nothing in the UI may branch on colour alone.

# System accents
const PLAYER_CYAN := Color("#38B8C8")     ## player route, selected ally, confirmed access
const GOODS_MAGENTA := Color("#B84D83")   ## product flow, market quantity, nerve
const MISSION_ORANGE := Color("#C87539")  ## mission, hostility, commitment
const INTEL_MUSTARD := Color("#C5A044")   ## information, rumour, uncertain offer
const ROUTE_GREEN := Color("#648F63")     ## ordinary movement, open connection
const PUBLIC_BLUE := Color("#4F7FA0")     ## transit, institution, public service
const DANGER_RED := Color("#A94B43")      ## lethal intent, enemy target, critical
const LOCKED_GREY := Color("#676B6B")     ## unavailable, unknown, closed

# Material colours
const MOSS_GREEN := Color("#52664B")
const BRICK_RUST := Color("#9A4E34")

# Map mode is "most restrained; dark navy/charcoal relief" (§4.3)
const MAP_GROUND := Color("#161B22")
const MAP_RELIEF := Color("#1E252E")
const MAP_WATER := Color("#141C26")
const PANEL := Color("#11151A")
const PANEL_EDGE := Color("#2A323C")
const INK := Color("#0A0C0F")
const PAPER := Color("#D8D2C4")
const TEXT := Color("#C9C4B6")
const TEXT_DIM := Color("#8A8577")


## Anchor colour by slice state. Always paired with state_glyph().
static func anchor_color(slice_state: String) -> Color:
	match slice_state:
		"active": return PLAYER_CYAN
		"opening": return PLAYER_CYAN
		"landmark": return PUBLIC_BLUE
		"teaser": return INTEL_MUSTARD
		"locked": return LOCKED_GREY
		_: return LOCKED_GREY


## The non-colour half of the same signal (ART_BIBLE §4.2).
static func state_glyph(slice_state: String) -> String:
	match slice_state:
		"active": return "◆"
		"opening": return "◆"
		"landmark": return "▲"
		"teaser": return "◇"
		"locked": return "×"
		_: return "·"


static func state_label(slice_state: String) -> String:
	match slice_state:
		"active": return "open"
		"opening": return "lead"
		"landmark": return "landmark"
		"teaser": return "rumoured"
		"locked": return "closed"
		_: return "unknown"


static func offer_color(side: String) -> Color:
	return GOODS_MAGENTA if side == "sell" else INTEL_MUSTARD


static func confidence_label(confidence: String) -> String:
	match confidence:
		"exact", "quote": return "quoted"
		"estimate": return "estimated"
		"rumour": return "rumoured"
		_: return confidence
