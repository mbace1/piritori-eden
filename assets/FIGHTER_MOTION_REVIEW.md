# F01/F02 motion rejection and repair

Owner feedback on the v05/C.06 presentation: **"The rigs suck"**.
Recorded 2026-09-13. This rejects the current rig/motion presentation, not the
approved F01/F02 concepts. Both production records remain RIGGED, prototype,
with owner_visual = fail. No production action library is accepted.

Follow-up feedback: **"Seems ok, bit jagged"**. Record this as qualified positive
feedback on the ongoing iteration; the exact view/device and whether "jagged"
means movement or edges are not yet specified. It does not retroactively
approve the rejected v05 presentation. See
[edge smoothing](../web/fight-module/EDGE_SMOOTHING.md) for the rendering pass.

## Reproduced defects

- F02 carries spread arms through the source idle and walk; neither source
  clip establishes an acceptable battle stance. Both characters need stronger
  grounded locomotion and transitions.
- Most C.06 actions use alert-idle with temporary arm IK. The body does not
  provide authored anticipation, weight transfer or recovery. The fixed right
  wrist targets can exceed the available reach and are clamped by the solver.
- Down rotates the entire still-animated body through 90 degrees. This is not
  an articulated collapse or a quiet final hold.
- The generic weapon box/cylinder offset does not put a handle at the palm
  socket. Wrist attachments and a verified numerical roundtrip did not prove
  real prop contact or a correctly aimed weapon.
- Movement speed and the source casual-walk cadence are independent.

The observed runtime bone lengths remain stable. That does not establish good
deformation, correct hand anatomy, approved proportions or expressive movement.
The earlier import, finite-transform and roundtrip checks were too narrow to
justify visual readiness.

## Private correction work

A local Blender recipe solves the same anatomical motion targets separately
on each preserved rest rig. Nine candidate clips cover stance, grounded walk,
brace, hit, down, melee, pistol, item and talk. Source meshes, UVs, materials,
weights, inverse binds and original binary data are retained; only new motion
is appended to each original GLB. This is per-rig baked retargeting, not proof
that raw quaternion tracks can be shared between the two rigs.

Editable Blender derivatives, rejected attempts, captures and candidate GLBs
remain private. No new Meshy jobs or character generations were submitted.
No new candidate is registered in the runtime manifest or deployed to the hub.

C.07 runtime support selects the complete baked body set only when all
required clips are present. One-shot actions clamp at their final frame;
locomotion loops retain phase and can match travel speed. That path bypasses
the old procedural gestures instead of layering both systems. Existing v05
files keep their old body-motion path until a reviewed replacement is selected.
Proxy handles are centered at the grip socket and oriented from the palm and
knuckles; proxy geometry still needs weapon-specific visual acceptance.

## Acceptance still required

1. Inspect complete motion from front, side, rear and actual battle camera,
   including stops, turns, interruptions and state recovery.
2. Test every deformed vertex against the ground. Foot-only probes missed a
   boot edge and an elbow in an early private draft; those drafts were not
   published. Include garment collapse, wrist seams and finger/prop contact.
3. Preserve exact source/candidate hashes and prove Blender reimport plus
   real Three.js action playback. Those checks support, not replace, review.
4. Review a visibly improved complete sequence before asking the owner to
   approve a replacement. Keep owner_visual failed for v05; a new candidate
   needs its own evidence and decision.
5. Keep normalization, triangle budget, full production library, private
   off-PC archive and physical Pixel 10 Pro/iPad M2 gates open until completed.

C.07 adds the Bear Path encounter and edge smoothing using the registered v05
models. The private replacement GLBs remain unpublished. This scene milestone
does not claim the rigs are fixed or final.
