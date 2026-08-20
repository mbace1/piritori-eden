# Piritori → Eden — design authority

Status: **ACTIVE**  
Authority reset: 2026-08-19  
Latest owner rulings: 2026-08-20
Owner: Mikael Haveri  

This file defines which documents and assets control future work. It exists
because the playable prototype, several older briefs, an earlier Art Bible and
the newer approved design library currently disagree. Future implementation
must follow this hierarchy rather than selecting whichever file is convenient.

## Authority order

From highest to lowest:

1. Direct owner decisions recorded after this reset.
2. `DESIGN_AUTHORITY.md`.
3. `DESIGN_LOCKS.md`.
4. `GAME_DESIGN_DOCUMENT.md`.
5. `ART_BIBLE.md` for visual and asset-production decisions.
6. `UX_SPEC.md` for interaction, navigation and responsive layout.
7. `MAP.md` and `map/kallio-era1-2003-v1.json` for Era I geography,
   public anchors, sites, corridors, projection and map-layer separation.
8. `content/era1-slice-v1.json` for the finite authored vertical-slice data,
   where it implements rather than contradicts the documents above.
9. `art/v3/manifest.json` for registered prototype runtime-art ids and status.
10. `NARRATIVE.md` and `SCREEN_AND_COMBAT_BASELINE.md`.
11. `art-library/APPROVALS.md`, `art-library/CATALOG.md` and the system contracts
   linked from them.
12. `FIGHT_BRIEF.md` and `DECISIONS.md`, but only where they do not
   conflict with the documents above.
13. The current runtime, tests and legacy design documents. These are evidence
   and prototypes, not permission to change the design.

When two sources at the same level disagree, stop and record a decision. Do not
silently average them together.

`DESIGN_LOCKS.md` closes the structural choices required for Art Bible and UX
work. Values explicitly marked as playtest gates may change only after the test
and reason are recorded; they are not open placeholders in the meantime.

Where visual appearance and interaction layout meet, `ART_BIBLE.md` owns the
material, colour, asset and motion treatment; `UX_SPEC.md` owns hierarchy,
input, state transition and responsive reflow.

Where the City screen meets real geography, `MAP.md` owns public topology and
anchor identity, `ART_BIBLE.md` owns material treatment, and `UX_SPEC.md`
owns camera, focus and input behaviour.

## Locked product direction

- Piritori → Eden is a narrative strategy game combining a visible city-flow
  simulation, location-based market management, authored encounters and rare
  isometric formation battles.
- Era I, Kallio in 2003, is the production focus. Era II, Pasila in 2024–2025,
  remains canon but phase-gated until the Era I slice works end to end.
- A complete run spans both eras and targets five to ten hours, centred near
  six to eight. Era I teaches the street-to-supplier climb on Kallio; Era II
  hands the inherited network to Kalle on a larger Kallio–Pasila board.
- The later board keeps Kallio central and is bounded by Pasila in the north,
  Kalasatama in the east, Downtown in the south and Töölö in the west. It does
  not extend north of Pasila or east of Kalasatama.
- The family structure deliberately adapts *East of Eden* character functions:
  Aatami carries the Adam role, Kalle the Cal/Cain role and Aaro the Aron/Abel
  role. Aaro's 2025 death is inevitable; choices alter responsibility,
  closeness, guilt and aftermath, never whether he survives.
- Kati is the boys' intermittently present mother: a roaming, unstable family
  figure, not a Cathy/Kate replica or a stable household anchor. Aida carries
  the outside-witness function and sees both brothers without existing to
  redeem either one. Aaro's death triggers Aatami's stroke and final reckoning.
- The first slice begins with Aatami's small purchase at Piritori and expands
  through recurring people and places rather than opening a complete market
  table immediately.
- Combat supports variable XvX encounters. The first slice concentrates on 2v2
  and 3v3 using front, middle and back rows on mostly invisible 3x3 or 3x4
  formation spaces.
- Toko Move shares the neutral flow engine, not Piritori's adult content,
  factions, economy or narrative data.
- Real Helsinki geography grounds the fiction. Criminal operations, exact
  routes, named groups and actionable methods remain fictional or abstract.
- Era I uses the twelve-anchor graph in `map/kallio-era1-2003-v1.json`, with
  eight active slice anchors and fictional services attached as sites.
- The first playable content package is the validated seven-day spine in
  `content/era1-slice-v1.json`: fourteen blocks and encounters, four mission
  families, six crew, five offers, one 2v2, one 3v3 and one sourced bulletin.
- Larger loads create forecast robbery risk and require greater crew,
  equipment, information or faction protection. Robbing a rival network can
  accelerate profit but creates persistent grievance and authored vengeance;
  it is never a consequence-free optimal loop.

## Active visual baseline

`ART_BIBLE.md` is the active visual production authority. It converts the
approved categorized `art-library/` into medium, character, environment,
motion, responsive-layout and export rules. Neither the rejected earlier Bible
nor the current prototype's code-drawn placeholders remain visual authority.

- Broad, low-detail cut-cardstock shapes establish silhouette and volume.
- Torn fibres, imperfect cuts, physical overlaps and shallow layer shadows make
  the construction readable.
- Sparse marker and ink details define faces, joints, folds and highlights.
  Lines should visibly wobble, skip, overshoot or vary in pressure.
- Characters, animals, weapons, foliage, locations and UI belong to the same
  handmade material family.
- The approved hand-ink `v03` character and equipment sets are the main
  baseline. The clean-cardstock `v02` set is the simplification fallback.
- Darkest Dungeon informs contrast, tactical readability, consequence and UI
  weight. It does not create a separate rendered-ink art register, and its
  characters, layouts and assets are not copied.
- Finnish Kallio specificity comes through geography, architecture, practical
  clothing, weather, trams, signs and ordinary residents—not caricature.

The older claim that the map/interiors must be PAPER while fights become a
separate polished INK style is superseded. Battles may be darker and more
dramatic, but they retain the same cut-paper and hand-marker construction.

## Active art status

`art-library/APPROVALS.md` is the approval register.

- **Approved:** modular v03 characters and equipment, v02 fallback, foliage,
  Karhupuisto, formation geometry, responsive command geometry and the Toko
  Slomo narrative-instance baseline.
- **Semi-approved:** Sörnäinen docks, Kallio courtyard v02, props, weather and
  current battle-screen layouts.
- **Inactive:** everything under `art-library/archive/needs-rework/`.

Approval establishes direction; it does not mean every review sheet is already
split, compressed, registered or animation-ready.

The first registered runtime derivative pack is `art/v3/manifest.json`. It is
prototype art, not a blanket final-art approval. Its courtyard and weather
entries remain visibly semi-approved, and its flattened Toko screen keeps an
explicit baked-copy/UI exception until production separation.

## Legacy material

These files are retained only as production history and reference:

- `ART_BRIEF_CONCEPT.md`
- `ART_PROMPTS.md`
- `ART_REQUEST.md`
- `ASSETS.md`
- `CLAUDE_HANDOFF.md`
- `CONTENT_HANDOVER.md`

Their still-useful facts have been migrated where appropriate. Their visual
rules do not override the active Art Bible, library or hierarchy above.

## Asset exception

Piritori is an explicit exception to the repository's old global “no image
assets” convention. Approved raster and vector assets are source material under
`piritori/art-library/`; optimized runtime derivatives may ship under
`piritori/art/`. Generated review sheets and archived comparisons are not
automatically deployed.

## Direct publishing workflow

There is one owner and one active design agent. Work does not wait for a PR
merge.

1. Make one coherent, reviewable milestone.
2. Validate its documents, manifests, links and relevant runtime gates.
3. Commit approved source directly to `main` with a narrow message.
4. Do not update the playable version for document-only work.
5. For a playable milestone, bump the visible project version and changelog,
   deploy the exact tested files to `gh-pages`, update the hub metadata, and
   verify the live hashes.

The current published prototype is v2. The next playable milestone is v3; Art
Bible and design commits before it remain source milestones rather than false
playable releases.
