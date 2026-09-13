# C.14 — After the Rain and gun aiming

Owner direction, 2026-09-13: “2 looks great, let's aim for that. Camera angles
can be used for aiming guns like zero company”. Concept 02 is the selected
implementation target for light, material and atmosphere. This does not certify
pixel parity, production character quality or physical-device acceptance.

## What the player sees

The Night Shift park uses irregular dark paving with broad wet islands, broken
highlights, warmer practical reflections and cool sky fill. The selected crew
record uses the lighter paper treatment in 02. Legal cells, cover, authored
landmarks, persistent crew and chapter boundaries stay the same.

Choose a handgun user, Attack, a legal target, then **Aim view**. A lower oblique
view frames both people and the space between them. The shooter holds the
weapon toward the target. The existing forecast remains visible and unchanged:
chance, HP/guard damage, cover/flank and remaining movement. This is a composed
inspection camera; the pointer does not aim the weapon or change accuracy.

**Overview**, **Cancel**, Escape and controller B return without spending
anything. Confirm commits the existing attack exactly once, holds the aiming
shot through its presentation, and returns to the saved planning angle/zoom.
Manual orbit/zoom interrupts automatic framing and becomes the new overview.
The FOCUS toggle controls automatic action shots independently of explicit
inspection. Reduced motion disables automatic moves; requested Aim view uses
an immediate static cut. Narrow portrait layouts use a steeper angle.

Foreground tree/foliage fragments clear a corridor between the two figures.
The existing actor cutaway remains. Neither alters cover, sight rules or
collision. Figures outside the shot stay in the scene; only their label clutter
is suppressed during the close view. Returning restores all normal labels.

The owner-requested inspection view is an explicit temporary exception to the
GDD's full-board planning composition. The next choice returns to planning.
It is not a permanent third-person shooter conversion or a participant cap.

## Reproduction and budgets

- `web/fight-module/aim-camera.js`: camera geometry and interpolation; shared
  orthographic renderer. Shoulder selection stays on the overview's side of
  the firing line. Both full figures have measured screen-space margins.
- `tactical-ui.js` and `main.js`: reversible presentation state, actual command
  confirmation, pose/label return and interruption. No RNG or save schema change.
- `web/bear-path/rain-surface.js`: deterministic canvas albedo/roughness/bump,
  three 512px maps, existing one-time PMREM probe, bounded analytic lamp glints.
  No new shadow map, per-frame reflection render target or second WebGL context.
  Glints represent fixed practical lights, not reflected characters or trees.
- The wet material is crew-only. Capacity fixtures keep the older material;
  the shared aiming control is available for their guns too. Authored Bear Path
  keeps its scene/rules. No new Meshy jobs or fighter-manifest promotions.
- Blender is appropriate for the next reusable prop/material kit, but is not
  required for these native engine effects. No Blender output is claimed here.

EA's official accessibility notes support an adjustable/off action camera and
highlights for obscured people/cover. Our reversible gun inspection is an
original Piritori design using those principles, not a claim to duplicate all
Zero Company camera behavior: https://www.ea.com/able/resources/star-wars-zero-company

## Verification and remaining work

`web/test/gun-aim-camera.cjs` drives real mouse/touch controls across desktop,
phone portrait, short landscape and tablet layouts. It checks actual framing,
forecast/snapshot invariance, endpoint visibility, Overview/Escape/controller
cancellation, manual interruption, reduced motion, graphics loss, one ammo/action
cost and reload persistence. `crew-run-browser.cjs` retains the full outing gate.
Final exact-commit CI, staging and public checks belong in the release receipt.

This advances 02's direction; it does not reach the illustration's full material,
foliage and lighting quality. Final character models/motion, wider authored
arenas, NPC/city integration and physical Pixel 10 Pro/iPad M2 review remain open.

### Port

Godot: reproduce shoulder choice, both-person bounds, static reduced-motion view,
preview/confirm/return, presentation-only aim pose and foliage corridor. Preserve
the existing C.12 rule vectors and save semantics. Recreate the material from
the deterministic maps/probe; no rule or retargeting change is implied.

## Art direction follow-through

Owner then requested more art passes with Astra acting as art director. The
same batch deepens the actual stage: asymmetric leaf masses with lit edges,
dark undergrowth, restrained lantern halos, stronger sodium key, quieter sky
fill, warmer timber and rear spill located at the existing rear-left lantern.
Wet reflections break into small irregular marks instead of smooth white pools.
Judge overview and gun framing together; the scene remains beautiful with
limited wear, rather than adding undirected grime. No new mission/cover layout.

## Director's assessment and next art pass

The actual C.14 captures improve warm/cool separation, wet-ground response and
gun-shot composition. They still show simple geometry and neutral articulated
figures. The concept's foliage softness, prop specificity and character identity
have not been reproduced. More bloom alone will not close those gaps.

Next priorities, in order:

1. Refine the large silhouettes: distinguish canopy layers and tree species,
   reduce repeated leaf fans, and preserve open space around legal destinations
   and the aiming corridor. Judge at the normal wide camera as well as close-up.
2. Build a small reusable Helsinki park kit from existing references. The repo
   already contains `art-library/props/era1/park-bench-v01.png`,
   `street-green-rubbish-bin-v01.png`, `street-granite-bollard-v01.png`,
   `street-bicycle-rack-v01.png` and `cover-concrete-barrier-v01.png`.
   These are source references, not evidence of finished 3D props. Inspect their
   approval records before authoring; retain the existing bear landmark GLB.
   Use Blender for repeatable mesh/UV/material exports, and the engine for
   practical lighting, wet response, cutaway and composition. This pass does
   not authorize a paid Meshy generation job or a new gameplay cover layout.
3. Give each material a readable response: warm timber, cool iron, rough stone,
   and broken wet paving. Keep wear near the owner's 3–4/10 direction. Preserve
   the painted-night backdrop and handmade shape language of the Art Bible.
4. Replace stand-ins only after the registered character fit/motion gates pass.
   Do not compensate for a poor rig with a camera angle that hides the defect.

Completion means an improvement in actual overview and gun-view captures at
phone portrait, short landscape and tablet layouts, with legal cells, intent
and target figures readable. Physical Pixel 10 Pro/iPad M2 performance and
owner visual acceptance remain separate checks. Keep intermediate art private.

Reference inspection for the next batch: `art-library/APPROVALS.md` calls the
street/park/dock props **semi-approved**, not finished assets. The inspected
bench has broad timber slats and curved green cast-iron ends; the litter bin
is a narrow green post-mounted box with an overhanging lid and dark opening.
Those distinctive profiles matter more than tiny scratches. The existing
`art-library/references/stages/stage-park-night-v01.jpg` uses tall irregular
canopies, warm lamps grazing the leaves, a dark fine-picket boundary and a
quiet open clearing. Borrow that light hierarchy; its raised platform and
stairs do not silently change this arena's authored traversable geometry.

Against concept 02, the next environment batch should also replace empty
peripheral space with a restrained Helsinki perimeter-block silhouette and
a few lit window/door bays, placed beyond the unchanged playable boundary.
Author it from the canonical location references, not a generic new district.
Keep warm amber glass and leaf edges, cool dark iron, and open sightlines as
shared checks across overview and gun framing. These are proposed next-work
criteria, not claims that C.14 already contains the new kit or facade.

## Delivery

C.14 is merged in Piritori PR #79 and Suds Jack PR #518 and verified on the
public hub. See [the exact release receipt](C14_RELEASE.json) for commit pins,
CI, staging, Pages and public-control evidence. Review corrected the foliage
shader key, used-label contrast, shortcut entry and catalogue version.
This delivery leaves the director assessment and physical/art gates above open.
