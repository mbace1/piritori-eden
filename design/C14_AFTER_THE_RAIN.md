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
