# Bear Path C.08 — art comparison and verification

Local verification complete; publication is recorded separately in the hub release receipt and PR #68. This milestone implements two owner-approved directions from D009, **Ink & Stone** and **Cold Street**, on the same park. It does not claim concept parity or final character acceptance.

## What is included

- A local Blender bear sculpt (8,610 triangles, 302,460 bytes, two mesh objects, no textures); static feet are normalized to the plinth and the model to 1.72 m long × 1.029 m high × 0.630 m wide. GLB SHA-256 `fc3fc41681d5c7dbcec7a7471d75b248597412ffd8664cee2489db4a9b7240f1`.
- Generated gravel albedo (1254² PNG, 3,483,080 bytes), downsampled on upload to at most 1024². Contrast is controlled in the material shader; there are no baked lights. The runtime register records its exact hash.
- Shared worn timber/masonry maps authored in code; bench slats, arms/feet/bolts, low curbs, package, gate piers, drain, lamp hardware, window sills/cornices and a static tram give the scene more structure. The tram is unnumbered context, not an authored route or travel mechanic. Lamp and leaf presentation follows the chosen look.
- A 44px look switch with URL and local preference support, no scene reload, unchanged camera/encounter/turn, input locking and context-recovery continuity. Ground and bear load by ID/bytes/hash with an explicit failure state.

## Evidence and limits

See [machine-readable report](../web/bear-path/art-verification.json). Four desktop-host viewport shapes cover touch/mouse interaction, both art profiles, reload, no tracked geometry/texture growth across six switches, one real context loss per style test, and preserved camera/turn/story. The existing four-viewport encounter suite and police/pullback transition tests pass. Legacy training passes real graphics-loss/recovery regression on phone, tablet and desktop shapes.

The mobile/recovered scene stays within 650,000 drawing-buffer pixels, FXAA, no realtime shadows, and 1024² character/ground texture uploads. Measurements in software-rendered Edge are functional evidence, not Pixel 10 Pro or iPad M2 frame-rate claims. Tested style-recovery frames use 25 tracked geometries and 12 textures; draw calls vary by viewport/phase and were 55–56 in battle. Environment transfer is 3,785,540 bytes, in addition to existing fighters/vendor code.

The source v05 character rigs remain rejected/provisional, with weak foot contact, spread idle arms and temporary actions. No v06 character is promoted or shipped. The new bear is a recognizable improvement over the primitive proxy but still needs more natural carved anatomy. Tree structures, painted wear, prop variety, environment depth and physical-device readability still need polish. Full campaign dispatch/casualty settlement, package-taking AI, doors and travel remain outside this milestone.

## Provenance and reproducibility

The [final review sheet and exact prompt](concepts/bear-path-art-directions-v04.md) record the built-in image-generation source and approval boundary. The final v04 sheet is included so other agents can follow D009. Unselected does not mean rejected. Blender generation is reproducible with `tools/blender/build_karhupuisto_bear.py`; it writes masters and candidates only under the private directory. Only the tested static derivative is registered.

The gravel was generated with the built-in Image Generation tool as a square, seamless, orthographic grey granite-grit/park-gravel albedo study for a roughly 4 × 4 m patch: muted gouache wear, sparse embedded autumn-leaf fragments, neutral mid-grey, broad restrained material variation; no baked lighting/shadows, specular highlights, lettering, horizon, objects or perspective. This summarizes its brief; it is not claimed as a verbatim prompt transcript. The original PNG is preserved without creative postprocessing; mipmapping/downsampling and material tint happen in the engine.

Private evidence, masters and superseded renders remain outside the public payload. No Meshy API job, token spend, new character concept or gameplay rule change occurred.

### Port

Carry over the shared-layout profiles, independent art preference, stable encounter/camera state and load-error/recovery behavior. Match the exact asset hashes and bounded texture upload. The character lifecycle and canonical campaign rules are unchanged.
