# Meshy fighter pilot results

- Pilot run: 2026-09-11 (America/Los_Angeles)
- Lane: Art
- Runtime status: **not registered, not deployed, not game-ready**

This is the receiving-agent completion record requested by
[MESHY_AGENT_HANDOFF.md](MESHY_AGENT_HANDOFF.md). It records the exact two
owner-supplied source files, paid generation calls and geometry inspection
without promoting either raw output into the game.

## Owner scope

The owner approved the supplied 2D concepts and said: **“These are the new
poses, all others are the old ones.”** A later direct instruction ordered both
pilots and requested this PR. This superseded the handoff snapshot's narrower
F01-only submission limit.

Approval currently means:

- F01 and F02 **2D source concepts are approved**.
- F01 and F02 **3D geometry is awaiting owner review**.
- No remesh, texture, rig, animation, runtime registration or deployment is
  approved by this record.

Owner follow-up sets **15,000 triangles** as the remesh target for accepted
pilots so facial clarity has more room than the earlier 12k target. Fifteen
thousand is a runtime budget, not permission to publish the raw masters.

## Source references

| Pilot | Repository source | Received dimensions | SHA-256 |
|---|---|---:|---|
| F01 heavy bruiser | [`f01-heavy-bruiser-tpose-v01.jpg`](art-library/characters/concepts-3d/pilots/f01-heavy-bruiser-tpose-v01.jpg) | 1280 × 1067 | `75B02CB98746F19AA3ACF664A54591D9CDAEADD9B4CD456DBE021117EA029D87` |
| F02 wiry skirmisher | [`f02-wiry-skirmisher-tpose-v01.jpg`](art-library/characters/concepts-3d/pilots/f02-wiry-skirmisher-tpose-v01.jpg) | 853 × 1280 | `E7FBF7C927FAF4277757AB6BE6458A8ADFFDBAAAADCC3805AC12CFAC42329587` |

The handoff's earlier F01 PNG provenance hash is
`BC02611151B0D7BB255F899741953ACC5C8BA5D88E597B43D9595E46D720C26C`.
The received chat attachment was a JPEG and is therefore not byte-identical.
The JPEG hash above is the source-of-truth hash for this Meshy run.

## Meshy order

Official API documentation and pricing were rechecked immediately before the
order. Both calls used the same prepared geometry-only payload:

```json
{
  "model_type": "standard",
  "ai_model": "meshy-7",
  "should_texture": false,
  "should_remesh": false,
  "pose_mode": "t-pose",
  "image_enhancement": false,
  "target_formats": ["glb"]
}
```

| Pilot | Image-to-3D task ID | Status | Credits used |
|---|---|---|---:|
| F01 | `01a0928b-41b6-754b-b075-8024d416e00b` | succeeded | 20 |
| F02 | `01a0928b-4621-73da-8948-b8a8201cfc5e` | succeeded | 20 |
| **Total** | | | **40** |

No account balance, API key or billing detail is committed.

## Private output masters

The filenames below identify retained private outputs. They are deliberately
not committed because `should_remesh: false` produced high-density review
masters and the owner has not accepted them as runtime art.

| Pilot | Private GLB filename | Bytes | SHA-256 |
|---|---|---:|---|
| F01 | `F01-heavy-bruiser-meshy7-geometry.glb` | 35,036,376 | `41C221ABBA1108E65BC9C1C128BF2EE8B3C5AA3D73DD8B0C1F60C050D7E723DB` |
| F02 | `F02-wiry-skirmisher-meshy7-geometry.glb` | 35,529,492 | `B35A2730D4E1BC9B731D3DAD39E9CE4116838F9B39601B067C73DE0D4771E8B7` |

Private Meshy thumbnails, Blender files and front/side/back/three-quarter clay
renders are retained alongside the GLBs.

## Blender 5.2.1 inspection

Both GLBs imported as a single unrigged mesh, with no actions and no material.
This matches a geometry-only order. Dimensions are in imported Blender units.

| Check | F01 heavy bruiser | F02 wiry skirmisher |
|---|---|---|
| Dimensions X × Y × Z | 1.7482 × 0.4804 × 1.9025 | 1.5578 × 0.3492 × 1.9029 |
| Triangles | 1,946,496 | 1,974,065 |
| Loose vertices | 0 | 0 |
| Boundary / non-manifold edges | 0 / 0 | 3 / 3 |
| Pose | **Hold:** arms fell roughly 30–35° below horizontal into an A-pose | **Pass:** horizontal T-pose retained |
| Silhouette | **Pass:** broad torso, heavy jacket, trousers and boots read clearly | **Pass:** lean frame, padded vest, hoodie, track trousers and trainers read clearly |
| Face / hair | Broad likeness retained; eyes and expression simplified and require owner review | Short uneven hair and narrow face retained; fine likeness requires owner review |
| Hands / fingers | Individual fingers are visible; no arm/torso webbing | Hand silhouettes survive; digit deformation must be rechecked after remesh and rig |
| Armpits / legs / feet | Clear limb separation and planted separate feet | Clear armpits, leg gap and separate feet |

F02's three boundary edges form one tiny open loop, confined to an approximately
1 mm bounding box at imported coordinate `(-0.054, -0.148, 0.240)`. A derivative
must repair it; the source master remains unchanged.

The raw triangle counts are expected from the explicit `should_remesh: false`
review pass, but they are roughly two million triangles each and therefore fail
the owner-set 15k runtime target and phone download gate. Neither file belongs
in `art/v3/manifest.json` at this stage.

## Review decision and next gates

Current review disposition:

- **F01 — HOLD for owner shape/pose review.** The reconstruction is clean and
  recognizable, but it did not honor the requested T-pose. Before spending
  further credits, the owner must either accept the A-pose as the rigging base
  or request another geometry attempt.
- **F02 — READY for owner shape review.** The requested pose and main identity
  survived. Acceptance is still required before remesh, texturing or rigging.

After owner approval, each accepted pilot still needs:

1. a 15k-target remesh/retopology derivative and a repeat face, topology and
   hand check;
2. texture generation preserving the approved colour blocks and ink identity;
3. rigging and joint-deformation inspection;
4. one purposeful idle, then walk/stop/turn checks;
5. optimized runtime export, manifest registration and physical Pixel 10 Pro /
   iPad M2 validation.

## Official references checked

- <https://docs.meshy.ai/en/api/image-to-3d>
- <https://docs.meshy.ai/en/api/balance>
- <https://docs.meshy.ai/en/api/pricing>
