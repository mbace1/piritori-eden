# C.11 — directional cover and action readability

Owner continuation, 2026-09-13: proceed with directional cover, crouch/peek and
stronger attack impacts, then deepen persistent crew and chapter/city ties.
This batch remains the separate C arena; physical Pixel 10 Pro/iPad M2 acceptance
and the rejected F01/F02 motion gates remain open. No paid generation.

## Changed behavior

Four low walls now occupy explicit north/east/south/west cell edges. North is
increasing grid row, world -Z. Both adjacent cells can use the same wall. A shot
entering a protected cell through that edge loses 25 percentage points of
accuracy; side/rear shots get no bonus. Exact 45-degree corners count as cover.
Melee receives no accuracy penalty. Full-cover cells still block travel/sight.
Low walls block crossing their edge, so four-step routes go around them. They
are not destructible, vaultable or a promise of automatic full-wall peek logic.

The same edge data drives geometry, route rejection, forecasts, enemy intent,
ground edge marks, stance and wall impact positions. The 6x8 test arrangements
are fixtures, not newly authored missions or a participant limit.

Stand-ins crouch with fixed limb lengths and grounded feet beside a low wall,
rise over it to shoot, then return to crouch. Movement leaves the cover pose.
Gunfire starts at the visible barrel; melee has a small controlled follow-through.
Guard, HP damage, wall interception and a clean miss have distinct feedback.
The attack's existing random roll decides whether cover actually stopped it:
65..90 is a wall interception, 90..100 is a natural miss. No extra RNG or damage.
Effects clean up on completion/interruption; camera movement cannot repeat damage.

## Validation and release

`directional-cover.mjs` covers each orientation, both sides, flanks/corners,
detours, stored-plan invalidation, melee, wall-versus-miss outcomes and replay.
`cover-presentation.cjs` uses UI commands for entering cover and shooting; it
checks crouch/rise/return, feedback cleanup and GPU loss during an actual attack.
Existing tactics, four-layout browser/touch, motion, camera and legacy gates
remain required. Desktop automation is not physical-device acceptance.

Source/release IDs and public verification are added after deployment. Until
then C.10.1 remains live. All intermediate captures remain private.

### Port

Port `cover-edges.js` and its semantic tests before changing Godot rules. See
[portable vectors](C11_PORT_VECTORS.json). Laboratory rule ID is `c11-v1`, recovery
checkpoint version 4, new C.11 session-storage namespace. Reject older lab
checkpoints rather than replay their old all-direction cover under new rules.
Authored campaign/Bear Path checkpoint formats and resolver remain intact.
Animation consumes the committed event's `impact`, `coverEdge` and `coverPoint`;
it must not infer a wall interception from a miss alone. Procedural stand-in
poses are development motion, not shared production clips for F01/F02.

## Following work

Physical device feedback, then persistent crew strengths/liabilities, equipment
builds, injuries and aftermath under the shared A/C guide and GDD. Keep the living
city/tram and authored chapter layer; do not turn every meeting into combat.
