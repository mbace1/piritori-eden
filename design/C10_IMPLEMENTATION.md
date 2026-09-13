# C.10 — Move + Act arena

2026-09-13. Owner authorized implementation, merge and publication. Deployment
IDs are appended after verification; this source record alone is not a live claim.

## Playable scope

- One four-step orthogonal Move plus one Action in either order; independent
  badges, ammo and Action-only reload. Attack, brace, bandage and withdrawal.
- Breadth-first routes around living units and full cover. Full cover blocks LOS;
  supercover lines block shots through touching wall corners.
- Partial cover is an occupiable protected cell marked by a low stone edge.
  Gun accuracy falls from 90 to 65. This abstraction protects from every direction;
  directional edge cover and crouch/peek IK are later work.
- Bat: 3 damage/range 1; knife: 2 damage/range 1 with 1 bypassing guard; handgun:
  3 damage/Manhattan range 6/magazine 4. These are lab tuning, not campaign canon.
- Pure previews share forecasts with resolution. Attacks commit seeded RNG once;
  previews, canceled selections and camera actions consume none.
- Enemy routes and tracking targets are fixed at round start. Breaking route,
  range or LOS, or downing the attacker, cancels its plan. No silent retargeting.
  Combined danger is capped worst-case HP/guard loss assuming every shot hits.
- Destination/attack preview then confirm; cancel keeps budgets. Board overlays
  show routes, cover, planned destinations and threatened targets.
- Path-following walk, distinct temporary bat/knife/gun geometry, aim/recoil,
  tracer/flash, cover miss, hit and down. Procedural stand-in parts and motion,
  not repaired F01/F02 rigs or accepted Blender production assets.
- Stable planning viewport, optional small action focus preserving viewing axis,
  return without drift, manual override and reduced motion/cramped-view fallback.
  First camera pass, not Zero Company feature parity.
- Wet-surface probe, bounded warm/cool practical light and scenery cutaway.
  No moving-character reflections or concept-art parity claim.

## Architecture / handoff

`web/fight-module/tactics.js` is lab-only; `session.js` routes lab fixtures to it.
Campaign/Bear Path keep their authored resolver. Lab checkpoints use version 3
and a new recovery namespace: old-rule histories cannot replay under new rules.
Campaign checkpoints/effects are unchanged. `tactical-ui.js` presents previews;
`main.js` commits before animation, follows route waypoints and restores committed
state after GPU loss. Fighter models/production manifest status are unchanged.

## Verification

- `tactics.mjs`: both action orders, double-spend rejection, reload, pure previews,
  occupancy/routes, LOS corners, cover, fixed plans, forecast versus resolution,
  combined danger and replay. `arena-lab.mjs`: 2/6/12 x 3 loadouts, unique cells,
  deterministic full battles to terminal outcomes and zero campaign effects.
- Existing fight/recovery, Bear Path, police and frame-clock unit checks pass.
- `arena-lab-browser.cjs`: desktop, phone portrait/landscape, tablet; preview,
  move, ranged attack, enemy round, replay, restart and forced graphics recovery;
  console-error and grounded/finite motion checks. Touch cases use tap input.
- `tactical-camera.cjs`: cancel, focus/return, manual override, reduced motion.
  A viewport resize/shift defect was found and fixed before publication.
- `arena-lab-capacity.cjs`: 12 actors, 45-second idle, stable resources,
  orientation during movement, 96 fixture + 272 free-cell camera views. Initial
  sweep: no scenery occlusion; minimum visibility including other actors 56.5%.
- Existing Bear Path browser suite passes four layouts: inspection, dialogue,
  peaceful handover, settlement once, return memory, battle, interrupted movement
  and repeated recovery. Desktop automation is not physical-device acceptance.
- C rules, legacy regression, touch/browser and camera tests are wired into CI.

Private captures and intermediate/rejected art stay private. Pixel 10 Pro and
iPad M2 physical acceptance is pending. Next: owner playtest, directional cover
and peek, stronger impact timing, then persistent crew/builds and chapter/city
integration. Do not expand paid generation or promote fighter rigs.
