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
const PANEL := Color("#141B21")
const PANEL_EDGE := Color("#2A323C")
const INK := Color("#0A0D11")
const PAPER := Color("#D8D2C4")
const TEXT := Color("#F4ECDB")
const TEXT_DIM := Color("#B9B0A0")

# ── LANTERN NOIR (web Act I v4.56, `web/lantern.css`, design/UI_LANTERN_NOIR.md)
#
# The interface's lighting logic, not a new palette: a dark, quiet ground,
# warm light only where the eye should go, one cool accent for what is yours.
# Two meanings, and nothing else may borrow them:
#
#   YOU (cyan)      presence, your journey, focus — "this is you"
#   LANTERN (amber) the story lead and THE primary action — "the way forward"
#
# The map's own art palette above (PLAYER_CYAN et al.) is the world's; these
# are the interface's. Mono is the ledger voice only (PiritoriFonts.mono()).
const NIGHT := Color("#0B0F13")          ## the ground behind everything
const NIGHT_2 := Color("#10161C")        ## bars: header and command dock
const PANEL_2 := Color("#1B242C")        ## a raised face on a panel (a button)
const TEXT_FAINT := Color("#9A9386")     ## eyebrows; 5.6:1 on PANEL, still AA
const LINE := Color(0.957, 0.925, 0.859, 0.10)         ## hairline edge
const LINE_STRONG := Color(0.957, 0.925, 0.859, 0.22)  ## a control's edge
const YOU := Color("#62D4DF")
const LANTERN := Color("#F2A44C")
const LANTERN_HOT := Color("#F7B664")
const LANTERN_DEEP := Color("#C77A2A")
const LANTERN_EDGE := Color("#FFC27A")
const LANTERN_INK := Color("#1B1207")    ## text on a lit face, 9.0:1
const CASH_UP := Color("#8FD694")        ## a gain, always with its "+" sign
const CASH_DOWN := Color("#F08C7A")      ## a spend, always with its "−" sign


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


## Translation key for a slice state; the word itself lives in locale/ui.csv.
static func state_key(slice_state: String) -> String:
	match slice_state:
		"active": return "state.open"
		"opening": return "state.lead"
		"landmark": return "state.landmark"
		"teaser": return "state.rumoured"
		"locked": return "state.closed"
		_: return "state.closed"


static func offer_color(side: String) -> Color:
	return GOODS_MAGENTA if side == "sell" else INTEL_MUSTARD


static func confidence_label(confidence: String) -> String:
	match confidence:
		"exact", "quote": return "quoted"
		"estimate": return "estimated"
		"rumour": return "rumoured"
		_: return confidence
