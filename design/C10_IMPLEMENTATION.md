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
  Software-only CI uses DPR 0.5 at unchanged CSS/touch layouts; local visual QA
  uses DPR 1. CI rendering is not a physical-device performance measurement.

Private captures and intermediate/rejected art stay private. Pixel 10 Pro and
iPad M2 physical acceptance is pending. Next: owner playtest, directional cover
and peek, stronger impact timing, then persistent crew/builds and chapter/city
integration. Do not expand paid generation or promote fighter rigs.

## Published release — C.10.1, 2026-09-13

C.10 source PR #73 and hub PR #513 were merged and deployed. The public smoke
check caught a destination-label defect: combining a shot forecast with an enemy
plan overwrote the announced firing position with the target cell. C.10.1 source
PR #74 and hub PR #514 preserve the firing position and track the aim separately;
a regression test covers moving-target previews. No balance or asset gate changed.

Final tested source: `70e0d90487b81ccdfdf6240a29213d2ff90606fc`.
Source integration merge: `dadabf078eaa2ca38a2bf79ceac17ea501b88208` on
`art/meshy-approved-pilots-2026-09-11`. This does not merge the older stacked #68
into main. Hub main merge: `501fcae9bd39e486faf97c499e2a25fae9b2daaf`.
Live commit: `896f6ed01f62a1961337f950d5417a980b43ea77`.
[Pages run 34754277807](https://github.com/mbace1/Suds-Jack/actions/runs/34754277807)
completed successfully. [Play C.10.1](https://mbace1.github.io/Suds-Jack/piritori-c09/web/arena-lab/?actors=6&release=10.1).

All source and relevant hub checks passed before merging the exact reviewed
heads. The exact staged C.10.1 package passed all four browser/touch layouts and
the camera suite. All 40 cabinet Git blob hashes matched the staged package;
36 unchanged-by-staging runtime files matched source; the scoped manifest is an
explicit transform. The public hub shows C.10.1 and its correct route. Public
C.10 movement, shooting, enemy resolution and withdrawal passed; C.10.1 was
rechecked for fixed intent destinations during a route preview and command flow.
The public release JSON was checked separately. This is not a claim that every
public HTTP asset was independently rehashed or that physical devices passed.

Review fixes before publication also cover Auto using a remaining Move, gamepad
B canceling previews, accurate cover wording, warm/cool light roles, hold-plan
classification and guard-only reactions. The final C.10 density sweep retained
full scenery visibility; actor overlap can still occur (minimum total sampled
visibility approximately 59%). See [machine-readable release](C10_RELEASE.json).
