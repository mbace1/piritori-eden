# Bear Path — 3D audit, 13 September 2026

**The renderer and combat function, but visual acceptance fails.** This follow-up tests C.08 r2 beyond loading, finite transforms and context recovery. No runtime/model changes or new deployment were made during this audit. The existing v05 rigs retain their rejected/provisional status.

Runtime source: `0b465132c90236052bf626d665180a4e26b74b28`. Hub deployment: `3aa2305c4cf03643b177baf125c72b36473f19d5`. [Structured findings](BEAR_PATH_3D_AUDIT.json).

## What was tested

- **96 visibility probes:** four actual fighter silhouettes at eight camera angles in desktop 1280×850, phone-shaped 412×915 and tablet-landscape 1194×834 viewports. The local diagnostic uses the production park, v05 models and camera code. It renders the target silhouette alone, then with black depth occluders; foliage alpha testing is retained. HUD is excluded from that measurement. A normal rendered screenshot confirms the worst case is real tree occlusion, not merely a mask artifact. Cold Street was used for this probe; both looks share this geometry and foliage alpha mask.
- **620 deformation samples:** ten action states per character, sampled at 24 Hz for 1.25 seconds, checking every skinned vertex in world coordinates. This tests idle, walk, strike, shoot, brace, item, talk, hit, grip and down. Nonfinite positions cause an execution failure. The -2 cm plane is a diagnostic penetration threshold, not a newly approved character specification.
- **Actual live UI:** moved the heavy fighter to C5 and attacked Mikko, reducing guard from 2 to 1; moved the wiry fighter to D5 and attacked Pauli, with the attack/team follow-up leaving Pauli at HP 2/3 and guard 0. An unreachable opponent was disabled. Enemy rounds and same-turn art switching worked. Reload retained round 3, both opponents' guard/condition, the selected look and the wiry fighter's spent action. These UI results establish action execution, not good animation quality.

## Findings

| Priority | Finding | Evidence | Next implementation target |
| --- | --- | --- | --- |
| P1 | Foreground foliage can completely hide a fighter | At the fifth 45° orbit increment from FIT (about 262°), Mikko has 0% visible silhouette on desktop/tablet and about 0.3% on the phone-shaped viewport. Another angle leaves roughly 3–5%. The normal screenshot confirms canopy coverage. | Camera-aware cutaway/fade for foreground scenery while preserving cover rules and all actionable fighter silhouettes. Re-run all eight angles and test moved units at board edges. |
| P1 | The current down action intersects the ground | F01 minimum vertex Y: −0.182 m, with up to 13.8% of vertices below −2 cm. F02: −0.159 m and 11.3%. | Replace the whole-body tilt with an articulated, grounded collapse and a still final pose; validate all vertices through entry, hold, interruption and reload. |
| P1 | Walk contact is weak, especially F02 | During the sampled casual walk, the lowest F02 vertex ranges from +0.023 to +0.110 m. F01 ranges from −0.009 to +0.067 m. | Calibrate ground origin and stance, solve planted feet and match travel speed to stride. Do not fix this by moving the entire model down and causing new penetration elsewhere. |
| P2 | Source gesture quality is still incomplete | Production v05 body actions continue to use source idle/walk plus temporary arm IK, as documented in FIGHTER_MOTION_REVIEW. The runtime tests do not establish anticipation, weight transfer, hand anatomy or prop-specific grip quality. | Review one complete private motion sequence for both approved rigs from front, side, rear and the battle view. Keep replacements private until visibly improved and accepted. |

At the default FIT camera, all four fighters retain visible silhouettes: approximately 100% for the crew and Mikko, and 78% for Pauli. That does not excuse the severe rotated-view cases. Draw/load/context recovery success is insufficient for visual readiness.

## Scope and next order

1. Fix scenery occlusion and preserve camera/turn/cover behavior; include valid movement cells near trees and the bear in acceptance.
2. Repair the existing two characters' stance, grounded locomotion and down state, then their action transitions and grips. Private v06 files remain unaccepted; this audit does not promote them or authorize a new roster.
3. Run a focused physical Pixel 10 Pro/iPad M2 session in portrait and landscape: readable figures, foot contact, combat selection and recovery after leaving/returning to the browser. Then continue path wear, tree structure and background polish toward the two approved art alternatives.

These tests ran in desktop Edge/Chromium using AMD Radeon graphics through ANGLE/D3D11. Allowing SwiftShader fallback in the launch flags did not force software rendering. WebKit and Firefox test browsers were not installed, so no cross-engine test was performed. No physical Pixel 10 Pro, iPad M2, Safari/Metal or controller-hardware performance claim is made. The sampled 1.25 seconds is not proof of every frame/transition in the source clips. The audit establishes specific failures and a reproducible test, not final geometry or motion approval.

## Reproduce

Serve the repository. Set `BEAR_PATH_URL` to its Bear Path URL and `BEAR_PATH_OUTPUT` to a private output directory, then run `node web/test/bear-path-3d-audit.cjs` with Playwright and Edge installed. The runner injects `three-audit-hooks.js` only into its test browser. It does not modify the game, registered GLBs or campaign state. The runner exits successfully when measurements complete even if they reveal visual defects; assess its report before making any acceptance claim. Detailed frames and rejected/intermediate art stay private.

### Port

No new runtime behavior to port. Carry these failure cases into the port's visibility and deformed-ground-contact checks. Preserve the distinction between visual acceptance and successful loading.
