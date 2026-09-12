# Piritori Character Spec v1

Status: contract draft, with unresolved common-rig and export conventions.
Machine-readable limits and required gates are in `character_spec.json`.
The approved F01/F02 images and later owner direction control their identity;
do not redesign them to fit a generic humanoid template.

## Delivery

- Conventional adult humanoid fighters, clear separated limbs. A-pose is
  acceptable if the rig works; do not force a cosmetic T-pose conversion.
- Runtime GLB, with embedded resources. Preserve editable Blender sources and
  meshless motion separately in the private continuity archive.
- Retain the current 15,000-triangle target and 14,500–16,500 candidate gate.
  The repaired v05 models exceed it. Reduce them with deformation/identity QA
  before production approval; this contract does not raise the budget.
- At most 2K textures and four influences per vertex. Verify actual textures,
  skinning, helper removal and material behavior through the existing gates.
- Model delivery is intended to use metres, Y up, +Z character forward and
  feet at ground origin. The v05 rigs retain source transforms and the test
  scene rescales both to 1.88 m. That is prototype behavior, not proof of
  normalized exports or approved character heights. Measure and record each
  fighter's height before locking the export contract.
- Use stable garment regions for team colors; skin/hair/identity stay intact.
  Keep props separate, with explicit grip/attachment transforms and colliders.

## Shared skeleton and motion

There is no accepted `humanoid_v1` skeleton yet. Both v05 rigs have 56 joints,
but have different rest/bind signatures. Preserve their current rig versions.
Record hierarchy, deform flags, rest axes/transforms, inverse binds, root
transform, units, attachments and root-motion policy. A rename or count match
is not a retarget.

Choose a canonical skeleton only after one shared motion survives retargeting
to both fighters, Blender export/reimport, and the project's actual Three.js
loader. Inspect full loops/transitions, feet, shoulders, elbows, wrists and
grips. Retarget motion to a mesh's compatible rest rig; do not silently force
different body proportions onto one bind pose. Freeze the resulting mapping
and test vectors so F02 can repeat F01's process without custom decisions.

First common action coverage: idle, walk, run, melee light/heavy, pistol fire,
hit front/back, death, brace, item use, talk, open hand, fist and grip. This
supports the current module and its rehearsal. Rifle fire, crouch and extra
idle/death variants can extend the versioned library later. They are not
claims of existing clips. Map semantic action IDs to motion files centrally;
avoid duplicate textured character exports for each animation.

The existing `alert-idle`, `casual-walk`, `hand-open-fist-grip` clips are
own-character demonstration clips. Runtime combat gestures are provisional.
Neither set is an approved common combat library.

## Acceptance

`VALIDATED`: numerical budget, normalized export, skin/material/finger QA,
common rig compatibility, full required motion, actual importer playback and
portable private source archive all pass against the exact candidate hash.

`GAME_READY`: additionally, owner visual acceptance and physical Pixel 10 Pro
and iPad M2 acceptance pass. `INTEGRATED`: additionally, the production scene
uses that exact runtime ID/version. The current C.03 module is prototype
integration and remains recorded separately.

Gate records must cite reviewable evidence and the exact candidate SHA-256.
The CLI checks records and artifact identity; it cannot judge anatomy, invent
a device result, or establish visual quality from JSON flags. Never mark a
manual gate passed without performing it. See `FIGHTER_ANIMATION_CONTINUITY.md`
and `art-src/meshy-input/MESHY_CANDIDATE_GATE.md` for the existing procedures.
