# Piritori → Eden — current art direction

**Owner correction: 8 November 2026.** This is the active visual authority.
It replaces the old UI and modular face/clothing instructions. Their files
and misleading active-library entries are removed; older versions survive
only in Git history and are not a source for new work.

**Scene Club acceptance, 8 November:** after reviewing the current animated
preview, the owner said **“Go”** to campaign integration. The shown side-view
young Aatami/Jaska composition and motion may now be shared with the runtime.
This acceptance is scoped to that encounter; front-pose and Toko ensemble
studies remain review candidates. Keep the original source-register statuses
and source hashes; no new source painting or unrelated cast is approved.

## One 9:16 scene, with overlays

The city and encounters use a fixed **9:16 illustrated stage**. At 390×844
its fitted frame is 390×693⅓; at 1280×800 it is 450×800; at 844×390 it is
219⅜×390. Center it in the available viewport. Do not switch to a wide
composition or scale a wide page down inside the frame.

The illustrated room and character layers occupy the whole frame. A compact
HUD overlays the top; dialogue, choices and consequences overlay the lower
scene. These UI layers must not cut down or reflow the illustration. Keep
faces and important actions clear of the overlays. The quiet map appears
between encounters and preserves the canonical Kallio geography.

The UX reference is the **active Toko Move journey**, currently v3.15
(`mbace1/Suds-Jack`, `af5d870790fc22dba82d55ac8c6182d73fa16ca4`,
`toko-move/js/play.js`). Use its scene-first layering, compact status,
understandable choices, short transitions and persistent consequences.
Do not copy its flat-vector style, tram mechanics, simplified combat or
retired map/sheet layout. Piritori's fixed 9:16 requirement also applies on
desktop and landscape.

## UI coverage ceiling — owner, 8 November 2026

All combined gameplay UI occupies **at most 50% of the 9:16 frame**. HUD,
dialogue, choices, consequences and temporary controls share this one budget;
it is not a separate allowance for each panel. Leave at least half the frame
for the illustrated scene. Measure the actual covered rectangle union; for
edge-anchored city overlays also cap the summed top/bottom bands including
insets, panel padding and gaps.

Preserve readable text and actual 44px targets. Compact duplicate text and
show dialogue before a replacement choice panel when needed. Keep all
meaningful choices and stakes accessible; do not meet the cap by clipping,
shrinking text or silently discarding tactical information. Apply and test the
same limit in arrival, choice, result, map, study and menu states. C.19's
floating tactical labels need an actual area check, not a claim inferred only
from its edge-panel allocation.

## Retained character sources

| Character | Registered artwork | Source | Status |
|---|---|---|---|
| Jaska | `cutin-jaska-rig-v01` | `art-src/concepts/people/jaska-concept-v03.jpg` | Approved cut-in |
| Young Aatami, front | `cutin-aatami-front-rig-v01` | `art-src/concepts/people/aatami-young-support-06.png` | Selected source; rig semi-approved |
| Young Aatami, side | `cutin-aatami-rig-v01` | `art-src/concepts/people/aatami-young-final-v01.png` | Selected source; rig semi-approved |
| Toko Slomo | `scene-toko-rig-v01` | `art-library/screens/instances/era1/toko-slomo-noodles-v02.png` | Approved paper artwork |

Keep their identity, clothing, proportions, source directions, registration
and source hashes. These are the only character families retained as the
basis for this restart. A newer T-pose or an old roster label is not a newer
approved narrative cut-in. Do not reconstruct missing contacts with old
heads, bodies, outfits, pose sheets or cached generated derivatives. Use a
neutral labelled placeholder until its own new design is reviewed.

Existing Scene Club and empty noodle-bar paintings remain scene candidates:
`scene-scene-club-v01` and `scene-toko-noodles-empty-v01`. Toko's body,
head, hands and counter share their original room camera; foreground Aatami
is a separate layer. Do not turn the counter or baked buttons into a
floating character cutout.

## Handmade Kallio identity

Keep handmade cut-cardstock, marker/ink detail and miniature Kallio spaces.
Let the actual retained paintings establish the material and drawing, rather
than an obsolete texture pack or a generic filter. Preserve recognizable
character silhouettes, practical room lighting and tangible furniture.
Keep interface text, buttons and status live; do not bake them into art.
Do not flatten the existing environments into vector cards or redraw the
selected characters to make them fit a new UI.

## Readable decisions

Use short scene text and clear authored decisions with visible stakes. A
sentence may appear on arrival and the next sentence in the encounter;
keep their order and meaning. Do not silently remove a meaningful choice
to imitate Toko Move's two-button limit.

Keep rendered interface text at least 12px and native interaction targets
at least 44px. Adapt overlays to a narrow fitted frame; do not achieve the
aspect ratio by shrinking all text and controls. Compact numerical stakes
must derive from actual effects and retain the full authored accessible
label. Keep all current decisions visible without needless scrolling.
Use warm paper/ink overlays with enough contrast against actual scene pixels;
leave the illustration visible around them. No old chrome, UI raster pack
or modular portrait library is a valid fallback.

## Motion and review

Use subtle idle, blink and head/body speaking gestures. **The selected mouths
are static**: do not describe these rigs as lip-synced. Preserve glasses,
brows, head seams and proportions through actual animated output. Reduced
motion displays stable source artwork and preserves every outcome.

Check paired front and side Aatami with Jaska and Toko, at native and 50%
review scales. Inspect motion over time, face/overlay clearance, source-aware
framing, transitions and performance. A half-size study does not establish
native touch acceptance. Actual browser screenshots and videos are evidence;
physical Pixel/iPad acceptance remains separate.

Source approval does not approve a new rig, mask, motion or composition.
Show actual output before runtime promotion. Do not merge or deploy unapproved
art. The retained-source renderer and composition remain review candidates.

## Combat and asset boundaries

C.19 keeps its 3D arenas, fighters, weapons, tactical information and existing
procedural stand-ins. The 2D library deletion does not authorize replacing
C.19 with illustrated choices or changing combat rules. Preserve arena kits,
canonical map coordinates, authored content, campaign state and receipt stores.

Keep current runtime registrations and their source hashes accurate. Remove
obsolete registrations and callers together with deleted assets; do not leave
broken image URLs or misleading approval rows. Existing compatibility screens
must use neutral identity labels for contacts without retained artwork.
