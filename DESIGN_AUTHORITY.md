# Piritori → Eden — design authority

Status: **ACTIVE**  
Authority reset: 2026-08-19  
Latest owner rulings: 2026-08-28
Owner: Mikael Haveri  

This file defines which documents and assets control future work. It exists
because the playable prototype, several older briefs, an earlier Art Bible and
the newer approved design library currently disagree. Future implementation
must follow this hierarchy rather than selecting whichever file is convenient.

## Owner ruling, 2026-08-25 — JS is the build, Godot is the port

> "we develop on js and the version control and documentation assumes that each
> version will be ported to Godot for landscape and controller testing. Only
> meshes will be given to you via PR, but you control the primary tester build
> and hand off each version to the godot side."

**This SUPERSEDES the 2026-08-21 ruling that "Godot is the implementation."**
Recorded as a reversal rather than applied quietly, because that ruling is still
written below and would otherwise be read as current.

- **`web/` is the primary tester build**, and it is where behaviour is defined.
  The browser build has moved out of `legacy/` — a directory named `legacy`
  holding the primary build is a lie. What stayed behind is the genuinely dead
  flow prototype.
- **`godot/` is the port**, and it exists to answer a question the browser
  cannot: whether this plays in **landscape, on a controller**. It reproduces
  behaviour; it never invents it.
- **Every version is a port unit.** `VERSIONS.md` entries carry a `### Port`
  block naming what the Godot side must re-port. Numbers are `vMAJOR.MINOR`,
  the decimal scheme `eeri/` already uses; `?v=` tokens stay integers.
- **Rules cross as VECTORS, not as code.** GDScript cannot run the models, so
  `port/vectors.mjs` emits (input, expected output) rows and the port has one
  test that must reproduce them. That gives "ported" an objective pass
  condition instead of a code review.
- **Only meshes arrive here by PR.** This side does not make art; it receives,
  registers and checks meshes against `PORTING.md` §6.

`PORTING.md` is the working document and is ACTIVE. It sits directly under this
file in the authority order.

### Addendum, 2026-08-28 — the rename landed, and a stale claim corrected

Two facts, checked directly rather than assumed, from a session that reached
this same ruling independently before finding it already recorded above.

**The rename is done, as of this merge.** A plain `git mv legacy js` was
refused by that session's own tooling permission gate — recorded here because
the block is real and specific to that class of operation, not because the
rename itself was ever in doubt. It landed as `web/`, not `js/`, on the branch
that is now merged in.

**The 2026-08-21 ruling below claims the page "does not run in this
repository by construction," attributing it to the `../hub/shell.js` import.**
Corrected: the real cause was three separate stale relative paths in
`content.js`'s own content/map/art fetch and its `assetUrl()` image paths,
left over from the 2026-08-21 split, fixed the same day this addendum was
written. `../hub/shell.js` was checked directly against its real source in
Suds-Jack and left alone — it is correct once deployed and only 404s
harmlessly in local dev; it was never the reason the build failed to load.

## Owner rulings, 2026-08-24 — the counter

Two decisions about conversations that do not happen on a fight board. Detail
and consequences in `STAGE_SPEC.md` §6; the venue rule in `NEGOTIATION.md` §1.1.

**1. The Toko Slomo's Noodles plate is the goal reference, not a prototype that
missed.** It is the noodle bar, where you chat and buy information, and the
scene and Toko are slightly animated. It sets the target for **every
conversation staged off the board**, and partly for how Arvo Linde works on the
daily bulletins. It is not a level and must not be judged against §2's arena
rules.

**2. Toko is a 3D LAYER.** Not a cut-out, not a sprite, not a painted figure in
the plate. This settles the layer-separation question in the only direction that
works: the shipped plate has no alpha and nothing behind him, so he cannot be
lifted out of it — the room must be **regenerated empty** and the live 3D model
composited into the gap through `presenter_3d.gd` at `Framing.LOCATION`.

Everything that follows from ruling 2 is a consequence, not a preference:

- **The empty room is a required asset**, not an optimisation. `STAGE_SPEC.md`
  §6.3 is the brief for it.
- **Toko needs speaking clips.** Nothing in `cast3d/clips/` covers talking; the
  eight that shipped are walk, run, block and a bicep curl. This is the same gap
  `UX_SPEC.md` §18 already names.
- **The mask is part of the 3D character**, not a separate 2D pass. The manifest
  listed it as its own layer; that list predates this ruling.
- **The framing must match the plate.** The 3D Toko has to stand where the
  painted one stood, at the same size behind the same counter, or the
  composite reads as a cut-out — which is the exact failure the ruling avoids.

## Owner rulings, 2026-08-21

Three decisions, recorded here rather than applied silently.

**1. Godot is the implementation.** *(SUPERSEDED 2026-08-25 — see the ruling at
the top of this file. Kept because a reversed decision that is deleted looks
like it was never made, and the reasoning below is still why the two builds
share their canon.)* The browser prototype is superseded and
parked at `legacy/`. It is kept as evidence, not as code to extend; it does not
run in this repository by construction (its page loads the arcade's
`../hub/shell.js`, which lived in the old monorepo). The canon it read —
`content/`, `map/`, `art/` and the documents — did not move and is shared with
the Godot build through `godot/tools/sync-data.mjs`.

**2. This project is its own repository.** Split out of Suds-Jack with history
intact. It carries real art, a real engine and a documents-first process, which
is a different kind of project from the arcade cabinets and was taxing every
unrelated clone of that repo. The deployed build still ships as a folder on the
Suds-Jack `gh-pages` site, so the arcade links to it exactly as before.

**3. Shipping art is normal here.** See § Assets — the “exception” framing is
withdrawn.

## Authority order

From highest to lowest:

1. Direct owner decisions recorded after this reset.
2. `DESIGN_AUTHORITY.md`.
3. `PORTING.md`, for anything about which build owns what, versions and the
   handoff to Godot.
4. `DESIGN_LOCKS.md`.
5. `GAME_DESIGN_DOCUMENT.md`.
6. `ART_BIBLE.md` for visual and asset-production decisions.
7. `UX_SPEC.md` for interaction, navigation and responsive layout.
8. `MAP.md` and `map/kallio-era1-2003-v1.json` for Era I geography,
   public anchors, sites, corridors, projection and map-layer separation.
9. `content/era1-slice-v1.json` for the finite authored vertical-slice data,
   where it implements rather than contradicts the documents above.
10. `art/v3/manifest.json` for registered prototype runtime-art ids and status.
11. `NARRATIVE.md` and `SCREEN_AND_COMBAT_BASELINE.md`.
12. `art-library/APPROVALS.md`, `art-library/CATALOG.md` and the system contracts
   linked from them.
13. `FIGHT_BRIEF.md` and `DECISIONS.md`, but only where they do not
   conflict with the documents above.
14. The current runtime, tests and legacy design documents. These are evidence
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

## Assets

Owner ruling, 2026-08-21: **this project ships real art, and that is a normal
decision rather than an exception granted to it.**

Earlier wording here called Piritori “an explicit exception to the repository's
old global 'no image assets' convention”. That framing was wrong twice over.
There was no repository-wide rule to be excepted from — the Suds-Jack arcade
draws its hub marquees in code, and several cabinets there are deliberately
image-free, but those are choices about those projects. And describing a settled
design decision as an exception makes it sound like a debt some later cleanup
should pay off, which invites exactly the wrong edit.

What remains true, and is about pipeline hygiene rather than permission:

- Approved raster and vector assets are source material under `art-library/`.
- Optimized runtime derivatives ship under `art/v3/` and are registered in
  `art/v3/manifest.json`. Runtime code resolves stable ids from that manifest;
  it does not guess filenames or load review sheets directly.
- Generated review sheets and archived comparisons are not automatically
  deployed. `art-library/archive/needs-rework/` is provenance only and may never
  become a runtime dependency.

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
