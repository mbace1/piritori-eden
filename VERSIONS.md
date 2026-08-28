# Piritori → Eden — versions

## Unreleased — canon and systems since v3.1, recorded 2026-08-28

This changelog is the JS/web build's own record and stopped at the 2026-08-21
split. It describes a 12-anchor, 8-active, 22-edge map and two battle formats
that are no longer what this repo actually contains, and it never mentions
several systems that exist in the repo today. Recorded here rather than
silently left wrong, per `DESIGN_AUTHORITY.md`'s 2026-08-28 ruling that this
build now leads.

**Canon moved past this changelog while nothing here tracked it:**
- The map was rebuilt from real OSM coastline, streets and railway plus real
  HSL GTFS transit — no invented geometry remains. **14 anchors (11 active),
  25 edges**, not 12/8/22.
- A third authored battle exists: `2v2, 3v3, 3v3`, not `2v2, 3v3`.
- Crew are generated from name pools, never authored — `COMBAT.md` §7.1.
  Six crew that shipped with hand-written names lost them.

**Godot's implementation went well beyond what this changelog ever
described**, none of it logged here because it landed directly in
`godot/`'s own GDScript rather than as a JS build milestone: careers,
twelve aptitudes, fifty-two skills, perks, chapters, loot, the fence, arrest,
gear wear, hireling generation, plus in the fight itself — cover, telegraphed
enemy intent, the spotter's MARK, the anchor's shield, three stances, third
parties, police, skip-to-result. None of this exists in `legacy/js/v3/`,
which still runs a shallower, earlier battle model (fixed `hp:3/guard:1-2/
nerve:3`, a 25-line greedy auto-command, no cover, no stances as a real
system).

**A real, tested, unused layer exists and this changelog never mentioned
it.** `market/model.mjs`, `missions/model.mjs`, `people/roster.mjs` — pure,
seeded, engine-agnostic modules implementing the economy, mission triggers,
and the twelve-aptitude hiring model. **92 passing checks.** `legacy/js/v3`
imports none of them.

**Fixed today, in the JS build itself:** it could not load its own content
— `content.js`'s `content/map/art` fetch and its `assetUrl()` image paths
were both one directory level off a folder that moved during the split, and
three of its own tests had the same bug. `check-project.mjs` pointed at a
three-repo layout that never shipped and had not run since the split.
`node legacy/tools/check-project.mjs` passes 5/5 now.

**Still open:** the `legacy/` folder name is stale (a rename was proposed and
is blocked on tooling permission); `market/missions/people` are not wired
into the live UI; no `battle`/`fight` pure model exists yet to receive
`fixtures/stance-weights.json`, which was dumped from Godot's real
`stance_weight()` specifically so that model can be built to match rather
than re-guessed.

## v3.1 source pack — 2026-08-21

- Promotes the corrected Toko Slomo screen to the active v02 source and runtime
  derivative. The eye openings now sit inside the white mask arches while a
  visible white rim remains.
- Adds a self-contained `START_HERE.md`, one-command project checks and a local
  no-build file server so a new contributor can run the slice from a clean
  checkout without reconstructing the handoff from chat history.
- Keeps v01 for provenance; only v02 is registered by the active runtime-art
  manifest.

## v3 alpha — 2026-08-20

**The approved design becomes one playable, saved campaign state.**

- **Five modes, one state.** Route, location encounter, ledger, formation
  battle and sourced news are reachable from the same responsive shell. Cash,
  old markka, debt, stock, intel, crew, wounds, relationships and decisions
  persist locally instead of resetting between prototypes.
- **The authored seven days run as data.** The runtime consumes the validated
  fourteen-block Era I package rather than inventing a second story in code.
  Refusing the first purchase or first firearm does not soft-lock progress.
- **The classic loop is the opening.** The full Kallio map appears first with
  Piritori highlighted. Buying there immediately reveals the €68 Siltasaari
  demand lead after the €45 purchase, before the first family detour. The map
  then names the growth ladder from street buyer to emerging supplier.
- **The real graph replaces the old board.** Twelve north-up public anchors,
  eight active slice anchors, attached fictional sites and twenty-two public
  edges drive the one-screen relief map. Ordinary residents and hidden loads
  visibly share route capacity.
- **Approved art enters the runtime.** Toko's flattened narrative-instance
  prototype is cropped above its baked controls and receives live copy and
  choices. Karhupuisto foliage, dog and weather remain separate layers.
  Modular heads, torsos, legs and held props assemble the battle and ledger
  cast. The courtyard remains explicitly semi-approved prototype art.
- **Formation fights are positional.** The authored 2v2 and 3v3 use mirrored
  front, middle and back rows with mostly hidden cells, reposition, brace,
  readable intent, auto-command, negotiation and withdrawal. A critical wound
  is labelled before it can become a final-settlement death.
- **The complete-run contract is recorded.** A full Aatami-to-Kalle campaign
  targets 5–10 hours, with a larger Kallio–Pasila map in its second half.
  Bigger abstract loads raise forecast robbery risk and preparation needs;
  robbing the Jade Lantern Network can accelerate profit while starting a
  persistent, character-specific vengeance chain.
- **Era I media stays period-specific.** Market work lives in a paper ledger;
  calls and SMS belong to feature phones; the markka bulletin arrives through
  a CRT television. The UI has a Finnish-label alpha toggle while the authored
  narrative copy remains transparently labelled English pending translation.

This is the first v3 **alpha**, not an Art Bible completion claim. The active
design documents and art register remain authority over the runtime.

## v2 — 2026-08-19

**The art arrives, and the money stops leaking.**

- **Rooms you stand in.** Each of the four contacts has an interior you walk
  into from the map: full-bleed art, his line spoken over the foot of the
  picture, and two or three things to do about him laid side by side. The
  portrait is CUT OUT OF THAT SAME PICTURE (`face: [cx, cy, r]` per contact)
  rather than drawn beside it — a silhouette next to finished art does not read
  as a placeholder, it reads as a broken image.
- **The appraisal.** You cannot ask the man selling you a bag whether the bag
  is real; you can pay somebody else to look. A contact you have burned takes
  the money and tells you nothing, which is its own information about them.
- **The fight has people in it.** The board drew a rounded rectangle with a
  circle on top since the fight existed. Now: a bomber jacket from behind for
  your side, a dark work coat from the front for theirs, a body on the floor
  for either, five cover props that are real objects, and a lit courtyard,
  harbour, park or yard under all of it. A man who goes down stays down on the
  ground instead of vanishing.
- **Money could be posted into a hole.** A consignment sent to a district no
  drawn line reaches took the goods, planned no trip, arrived nowhere and said
  nothing — in one tap, for as much cash as you were holding. flow-core gained
  `reaches()` and the game asks before it takes.
- **2.6 MB of art, not 16.** The generator's plates are a build directory and
  are not deployed; what ships is cut, trimmed and WebP under `piritori/art/`.

Balance, measured rather than asserted: worked properly the seven nights take
400 € to about 7,400 € against a 3,000 € debt. Played naively — buy at the
square, ship to one fixed stop — it is roughly +8 € a day against six percent
compounding, which is a loss. That gap is the game.

## v1 — 2026-08-18

The first slice on the hub. The night map over real WGS84 Kallio, drawn lines
carrying consignments at the city's own capacity, six named goods on three
tiers, the bargain (and the cut bag), rank fights with guns, nerve, terrain
cover and three exits, seven nights, and an Eden that is never a node.
