# Meshy fighter pilot results

- Pilot run: 2026-09-11–12 (America/Los_Angeles)
- Lane: Art
- Current state: **public v02 playable-test derivatives; not final production art or deployed gameplay**

This is the receiving-agent completion record requested by
[MESHY_AGENT_HANDOFF.md](MESHY_AGENT_HANDOFF.md). It records the exact approved
sources, paid Meshy task chain, public optimized test fingerprints, private
provenance, Blender inspection, browser evidence, and the gates that remain.
Only the optimized v01/v02 test GLBs are public; raw outputs and working files
remain private.

## Owner scope

The owner approved the two supplied concepts and identified them as the only new
poses. The owner then ordered both pilot generations. In the follow-up on
[PR #68](https://github.com/mbace1/piritori-eden/pull/68), the owner explicitly
authorized both existing masters through a 15,000-triangle-target remesh,
defect review, texturing, rigging, joint-deformation checks, idle, and walk.
The same direction says F01's A-pose is acceptable when deformation works.

That authorization does **not** mean final runtime approval:

- F01 and F02 source concepts remain owner-approved.
- The derivative pipeline below is complete. The corrected v02 bodies and
  own-rig clip packs pass Blender and provisional browser QA, but still need
  final owner visual review.
- v02 is registered for a scoped browser locomotion test, with v01 retained for
  rollback. This is not production gameplay, hub deployment, or authorization
  for additional Image-to-3D generation.
- Raw masters, working derivative GLBs, FBXs, Blender files, full-resolution
  renders, and detailed QA reports remain only in the ignored private workspace.

## Source references

| Pilot | Repository source | Dimensions | SHA-256 |
|---|---|---:|---|
| F01 heavy bruiser | [`f01-heavy-bruiser-tpose-v01.jpg`](art-library/characters/concepts-3d/pilots/f01-heavy-bruiser-tpose-v01.jpg) | 1280 × 1067 | `75B02CB98746F19AA3ACF664A54591D9CDAEADD9B4CD456DBE021117EA029D87` |
| F02 wiry skirmisher | [`f02-wiry-skirmisher-tpose-v01.jpg`](art-library/characters/concepts-3d/pilots/f02-wiry-skirmisher-tpose-v01.jpg) | 853 × 1280 | `E7FBF7C927FAF4277757AB6BE6458A8ADFFDBAAAADCC3805AC12CFAC42329587` |

The earlier private F01 PNG provenance hash is
`BC02611151B0D7BB255F899741953ACC5C8BA5D88E597B43D9595E46D720C26C`.
The received chat attachment is a JPEG and is not byte-identical; the JPEG hash
above is the source-of-truth fingerprint for this run.

## Completed Meshy chain

The executed chain was:

`approved JPEG → geometry-only master → 15k remesh → 2k retexture → rig → Alert + Casual Walk`

The original geometry calls used Meshy-7, `standard`, `pose_mode: "t-pose"`,
`should_texture: false`, and `should_remesh: false`. The original masters were
therefore preserved before creating derivatives.

| Pilot | Image-to-3D task | Remesh task | Retexture task | Rig task |
|---|---|---|---|---|
| F01 | `01a0928b-41b6-754b-b075-8024d416e00b` | `01a0940b-dcfb-74c5-8893-8c30330fb84b` | `01a09424-95a8-73ba-b4f1-7d9f3bcdd7f9` | `01a09426-1412-70e8-ad48-a521dbd78601` |
| F02 | `01a0928b-4621-73da-8948-b8a8201cfc5e` | `01a0940c-8947-779c-9178-af19ab6f8ade` | `01a09425-21f8-7461-af82-bfdc1ad68820` | `01a09426-defb-740f-8ddb-a6a2b50a693c` |

Remesh used triangle topology with `target_polycount: 15000`. Retexture used the
approved source as `image_style_url`, Meshy-7, the original remesh UVs, a 2k
texture, and no PBR maps. Rigging received the textured derivative by
`model_url` at a declared 1.9 m height; the raw multi-million-triangle task was
never used as the rig input.

| Pilot | Clip | Action ID | Animation task | Frames at 30 fps |
|---|---|---:|---|---:|
| F01 | Alert / purposeful idle | 2 | `01a09428-6eb7-727a-9fe9-0daadeb0e7e3` | 1–96 |
| F01 | Casual Walk | 30 | `01a09428-de23-74ab-8671-b0876b34b013` | 1–101 |
| F02 | Alert / purposeful idle | 2 | `01a09429-2aaf-7379-be74-926dd4b71752` | 1–96 |
| F02 | Casual Walk | 30 | `01a09429-9848-714b-bb97-e43af717ee1c` | 1–101 |

### Credit record

| Stage | F01 | F02 | Total |
|---|---:|---:|---:|
| Image-to-3D masters | 20 | 20 | 40 |
| 15k remesh | 5 | 5 | 10 |
| 2k retexture | 10 | 10 | 20 |
| Rigging | 5 | 5 | 10 |
| Two animation actions | 6 | 6 | 12 |
| **Cumulative** | **46** | **46** | **92** |

No API key, account balance, billing identifier, or temporary download URL is
committed.

## Private output fingerprints

These filenames are identifiers for the ignored private workspace, not public
download links.

| Pilot / stage | Private GLB filename | Bytes | SHA-256 |
|---|---|---:|---|
| F01 master | `F01-heavy-bruiser-meshy7-geometry.glb` | 35,036,376 | `41C221ABBA1108E65BC9C1C128BF2EE8B3C5AA3D73DD8B0C1F60C050D7E723DB` |
| F01 remesh | `F01-heavy-bruiser-remesh-15k.glb` | 635,052 | `82AB273B365BD2483F1ED964F0BCFD29102AAEE10BD6E4704EBA088C0E55BFCC` |
| F01 textured | `F01-heavy-bruiser-textured-2k.glb` | 3,966,016 | `E92CE303E1064AD2E88ADF26CCBDB17E80C22444E747ED2C7C6DCB79807298FE` |
| F01 rigged | `F01-heavy-bruiser-rigged.glb` | 7,794,708 | `9FDDB141D5D1CDE397D3EB7256FA3B9BD900BE5F192B74AA59FFA382D4781229` |
| F01 Alert | `F01-heavy-bruiser-alert-idle.glb` | 7,839,836 | `5508A8148A795CFD128FEE199DB33E6DAB8BEA2ACB116DD46F2930ABBC8674E4` |
| F01 Casual Walk | `F01-heavy-bruiser-casual-walk.glb` | 7,842,048 | `C29208E194B93EEEFA672F67A9737273734A05928970494F0B4B2B8923E1BA35` |
| F02 master | `F02-wiry-skirmisher-meshy7-geometry.glb` | 35,529,492 | `B35A2730D4E1BC9B731D3DAD39E9CE4116838F9B39601B067C73DE0D4771E8B7` |
| F02 remesh | `F02-wiry-skirmisher-remesh-15k.glb` | 846,040 | `0FCC11D2B838ACB3E3576BE92D98953652C95203812438C5F01ED33826495542` |
| F02 textured | `F02-wiry-skirmisher-textured-2k.glb` | 4,574,844 | `057703D9DBB205F17AB04FE7FFB181A175EF5C36121449F387B0871A9445D703` |
| F02 rigged | `F02-wiry-skirmisher-rigged.glb` | 7,733,816 | `A77AF2632553DCBEADAC3573C4FE357F0556211F09E55D926CF19F1240EF355E` |
| F02 Alert | `F02-wiry-skirmisher-alert-idle.glb` | 7,780,360 | `CBA40745E833FAE4D7F3E6CCFDDE4A89FCC91A6634E602777A1B58EFC968E3B2` |
| F02 Casual Walk | `F02-wiry-skirmisher-casual-walk.glb` | 7,782,668 | `5C11E34D022FC3FE642387276B1FF85C7F237C0D876E9799981965CF915482E7` |

Meshy's rig task also returned basic-walking and basic-running GLBs plus FBX
versions. They are retained privately; the requested Alert and Casual Walk GLBs
were the clips used for this review.

## Public v02 playable-test derivatives — v4.49 / PR #68

The public repository now contains the four optimized v02 test artifacts below.
The v01 bodies and packs remain registered as rollback candidates. These hashes
identify the public GLBs; they are not fingerprints for the private raw masters,
editable Blender sources, or full QA bundle.

| Artifact | Bytes | SHA-256 | Contract |
|---|---:|---|---|
| `art/v3/cast3d/f01-heavy-bruiser-v02.glb` | 7,778,876 | `282F1826A4C90D3516638DBCC11F4F426766301A2DA5BC85AC35448414CEA2EE` | F01 body; 15,512 triangles; 24 bones; 2K texture |
| `art/v3/cast3d/clips/f01-heavy-bruiser-clips-v02.glb` | 133,524 | `B0F43F565D26BEB2370FDA081BB75EAD90D4D0AF3FFB050A346AB621934825B7` | F01 meshless own-rig Alert/Casual Walk pack |
| `art/v3/cast3d/f02-wiry-skirmisher-v02.glb` | 7,717,884 | `FD1121F26DA7BD5454FF8F4D3A0A1D5479469FF46C803C6FB872CB43D5A6FF2E` | F02 body; 15,503 triangles; 24 bones; 2K texture |
| `art/v3/cast3d/clips/f02-wiry-skirmisher-clips-v02.glb` | 136,532 | `4221905BB230D2819F10839DFCC0ED590BE02E749631390ECA45E8EB3C458F29` | F02 meshless own-rig Alert/Casual Walk pack |

The v02 rest edit shortens F01's Arm/ForeArm chains by factor `0.953` and
lengthens F02's by `1.080`, producing mean shoulder-to-wrist/height ratios of
`0.319953` and `0.250006`. The offline Blender 5.2 build preserves the source
triangle stream, UV values, joint membership, normalized weights, 24-bone
hierarchy, and 2K atlas. The body GLBs remove the duplicated emissive atlas and
carry metallic `0`, roughness `0.92`, and specular factor `0.5`; the two packs
contain no mesh, material, image, or texture payload.

The clip packs preserve every source joint/path channel, absolute key-time
range, 30 Hz cadence, and 4.0/4.2-second duration. Constant channels remain
sparse; the Blender playback gate evaluates 121 Alert plus 127 Walk frames per
fighter (496 total) against rest geometry.

The v02 browser checkpoint passes 76/76 regression checks across desktop,
mobile, Pixel, and iPad viewport emulations. It covers full-duration framing of
the configured F01 walk/F02 alert pair, independent fighter controls, a real
Pixel-profile swipe-scroll gesture, static selected poses for reduced motion,
and two BFCache suspend/resume cycles. CSS preserves `pan-y pinch-zoom`; this
suite does not synthesize a pinch gesture or assert terminal renderer disposal.
Viewport emulation is not physical-device evidence, and this record does not
claim that the hub has been deployed.

## Blender 5.2.1 remesh inspection

| Check | F01 heavy bruiser | F02 wiry skirmisher |
|---|---|---|
| Dimensions X × Y × Z | 1.7479 × 0.4797 × 1.9021 m | 1.5543 × 0.3481 × 1.9010 m |
| Actual triangles | **15,512** | **15,503** |
| Pose | A-pose retained; owner said this is not a hold if deformation works | Horizontal T-pose retained |
| Silhouette / identity | Broad jacketed bruiser, face, hands, trousers, and boots remain readable | Lean padded-vest silhouette, hair, face, hands, striped trousers, and trainers remain readable |

GLB import initially reports many boundary edges because the export splits
vertices at UV/normal seams. An exact positional weld made no geometric move,
changed no triangles, and reduced the diagnostic topology to:

| Diagnostic after exact weld | F01 | F02 |
|---|---:|---:|
| Vertices | 7,754 | 7,605 |
| Boundary edges | 33 | 144 |
| Overfull junction edges | 28 | 158 |
| Bounds change | 0 | 0 |

The original F02 master's isolated three-edge, approximately 1 mm closed hole
does not recur: after remesh/weld there are no closed hole loops eligible for a
tiny-hole fill. The remaining edges are garment/body junction topology rather
than nearly coincident cracks; tolerances from 10–250 μm made no further change.
No crack, webbing, missing limb, or silhouette break is visible in the renders.

A private 3 mm voxel-remesh experiment became internally manifold but slightly
smoothed the models, and its GLB reimport dropped faces. It was rejected. The
successful Meshy remesh tasks—not the rejected voxel tests or raw masters—fed
retexture and rigging. The residual junction counts remain documented as a
runtime-import caveat rather than being misreported as fully manifold.

## Rig and animation QA

Both delivered clips have:

- one skinned character mesh;
- one 24-bone deform armature and 24 matching vertex groups;
- normalized weights, no unweighted vertices, and at most four influences per
  vertex;
- one packed 2048 × 2048 texture;
- no NaN or infinite evaluated vertex coordinates at any sampled frame.

The basic skeleton has no finger bones. Hand silhouettes are preserved, but
individual finger articulation is not part of this rig.

Five frames were rendered from each Alert clip (`1, 25, 48, 72, 96`) and each
Casual Walk clip (`1, 26, 51, 76, 101`). Shoulder, elbow, hip, and knee motion is
coherent for both pilots. Identity and colour blocking remain readable; no
visible tearing or decisive self-intersection occurs. The vest/hoodie on F02
does not punch through at the shoulders. Both pilots show ordinary low-poly
cloth pinching around the crotch and knees during the walk, but it is not a
pilot-blocking failure.

Automated triangle-area comparison found only isolated outliers—at most three
of roughly 15.5k faces in a sample below 0.2× reference area, and only F01 had a
single face above 5×. None corresponds to a visible tear in the sampled renders.

Each private Meshy rig/animation source GLB also includes an unskinned 42-vertex
object named `Icosphere`. It is not part of the character. The public v01/v02
body derivatives strip it, and the public own-rig packs contain no render
payload.

### Visual evidence

The committed sheets are compressed pre-v02 source-motion evidence only. The
v02 proportion/material correction is reviewed in PR #68's playable browser
test; its full-resolution renders and per-frame JSON reports remain private.

![F01 Alert and Casual Walk deformation samples](art-library/characters/concepts-3d/pilots/f01-heavy-bruiser-rig-animation-review-v01.jpg)

![F02 Alert and Casual Walk deformation samples](art-library/characters/concepts-3d/pilots/f02-wiry-skirmisher-rig-animation-review-v01.jpg)

## Decision and remaining gates

- **F01 — current v02 provisional browser-test pass.** The corrected A-pose rig
  preserves the readable face, hands, jacket silhouette, and lower-body motion
  through its own Alert and Casual Walk pack.
- **F02 — current v02 provisional browser-test pass.** The corrected T-pose rig
  preserves the vest/hoodie, track-trouser silhouette, shoulders, hips, and
  knees through its own pack.

The public v02 GLBs are safe only for the scoped playable test. Before either is
promoted to final production art:

1. restore the accepted private archive in an independent clean location and
   verify its hashes and editable sources offline;
2. test a genuinely shared cross-rig clip on both v02 bodies;
3. author and inspect stop, turn, and transition behavior rather than inferring
   it from idle/walk;
4. add or explicitly waive finger articulation and representative weapon grips;
5. pass the real Godot importer and resolve any exposed junction-topology issue;
6. measure behavior on physical Pixel and iPad devices—viewport emulation does
   not satisfy this gate;
7. obtain final owner visual approval before production registration or deploy.

The validated 2K atlases are intentional for this checkpoint; a separate 1K
derivative is not a prerequisite. Final optimization remains part of production
review, and no hub deployment is claimed here.

## Official references checked

- <https://docs.meshy.ai/en/api/image-to-3d>
- <https://docs.meshy.ai/en/api/remesh>
- <https://docs.meshy.ai/en/api/retexture>
- <https://docs.meshy.ai/en/api/rigging>
- <https://docs.meshy.ai/en/api/animation>
- <https://docs.meshy.ai/en/api/animation-library>
- <https://docs.meshy.ai/en/api/pricing>
