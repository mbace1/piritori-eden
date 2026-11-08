# Piritori startup — current owner direction, 8 November 2026

Read `ROADMAP.md`, then the current rulings at the top of
`DESIGN_AUTHORITY.md` and `ART_BIBLE.md`. The roadmap remains the plan of
record. JS/web is the game; Godot is a paused port. Current source main is
Act I v4.99. Read release receipts to distinguish source from a live build.

## Visual restart: 9:16 scenes with overlays

The owner rejected the old UI, faces and clothes and explicitly requested
that they be deleted so they cannot become the basis again. This overrides
older visual, modular-cast and UI instructions in historical documents.

- The city/encounter presentation is **one fixed 9:16 illustrated frame**.
  HUD, dialogue, choices and consequences overlay that frame. The scene
  continues behind them. Desktop and landscape center the portrait frame;
  they do not introduce another wide page or reserve a footer below the art.
- **Combined gameplay UI must occupy at most 50% of the 9:16 frame.**
  Count HUD, dialogue, choices, consequences and temporary controls together.
  Leave at least half the frame for the scene. For edge-anchored city panels,
  also cap the combined top/bottom height bands, including insets and gaps.
  Keep actual 44px targets and 12px text; use dialogue then a replacement
  choice panel when simultaneous presentation cannot fit. Preserve every
  authored choice and its stakes. Measure actual rectangles; never meet the
  limit by clipping text or hiding meaningful information.
- Study the **active journey in current Toko Move** (`toko-move/js/play.js`
  in `mbace1/Suds-Jack`), not its retired map/sheet interface or older
  map-first briefs. Borrow scene-first presentation, compact overlays,
  clear stakes, short transitions and remembered consequences. Keep
  Piritori's own handmade art and gameplay.
- Retain only these selected character families as the new visual basis:
  approved Jaska cut-in; selected young Aatami front/side (rigs still
  semi-approved); approved Toko paper artwork. Exact IDs and sources are in
  `ART_BIBLE.md` and `art-src/restarts/scene-club/README.md`.
- The owner subsequently approved the shown side-view Aatami/Jaska Scene Club
  composition and motion for campaign integration (“Go”, 8 November). Use
  its shared runtime view through the real campaign controller. Other new
  compositions and the front/Toko studies still require their own review.
- The old modular face/outfit/cast library, UI textures and rejected review
  workbenches are deleted. Do not restore them from branches, Git history,
  cached exports or historical approvals to fill a placeholder. Use a
  neutral labelled placeholder until new character artwork is reviewed.
- `web/v3.css` is structural compatibility for the existing campaign, not a
  visual reference. The corrected presentation lives at
  `art-src/restarts/scene-club/`; its tests enforce the frame and layering.

## Preserve the game

C.19 Night Shift is the authoritative 3D tactical battle. Preserve arena
positioning, weapons, enemy intentions, police, fight/getaway objectives,
injuries, missing crew, recovery and campaign save/receipt integration.
Do not replace it with cards or the older formation board. Current C.19
stand-ins, arena kits and environment assets are outside the 2D cast cleanup.

Prefer authored scenes, decisions and consequences. Do not invent a new
story to demonstrate a presentation. Before scenario/environment changes,
read `design/SCENARIO_ATLAS.md` and its JSON and canonical references.

## Test and deliver

Inspect the existing tests before adding tests. Run relevant campaign,
outing/recovery, mission, progression, browser and responsive checks. Record
actual browser output at 390×844 and 1280×800, with landscape where relevant.
Measure actual stage/overlay bounds, text and touch targets; a scaled CSS
size does not establish physical readability. Browser emulation never
establishes physical Pixel/iPad acceptance.

Use feature branches and draft PRs; commit small reviewable slices. Verify
SHAs and CI results. New art and motion require actual visual review before
runtime promotion or deployment. Source approval, rig acceptance, a passed
test, source pushed, merged and live are distinct facts. Keep the roadmap
percentage unchanged without evidence. Keep raw/intermediate/rejected art
and credentials private. Preserve approved source hashes.

For explicitly commissioned 3D production, also read `3D_PIPELINE.md`,
`MESHY_AGENT_HANDOFF.md`, `assets/CHARACTER_SPEC.md` and the current production
manifest. Inventory deliveries first; do not infer readiness or buy/generate
replacements from historical PR descriptions. Do not modify unrelated games.
