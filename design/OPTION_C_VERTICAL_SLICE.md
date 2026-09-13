# Option C — Dream Loop vertical-slice design

Status: **implementation brief, not a completed build or approved art direction**. Owner direction, 2026-09-13. Read [ACTIVE_CONTEXT](../ACTIVE_CONTEXT.md) first. This brief applies the existing [3D_PIPELINE](../3D_PIPELINE.md); it does not replace the Meshy handoffs or create a second production process.

## What the slice must answer

Can we make a beautiful, readable Piritori arena and then reproduce its assets, lighting and character behavior without bespoke agent rescue for every character or scene?

Use one existing public meeting/battle location as the visual benchmark. Bear Path supplies an already functioning encounter and a repeatable static landmark. It is one location among many, not the game's whole scope. Build an additive development variant so C.08 remains the playable baseline. A second small arrangement of the same kit is the reproduction test, not another fully authored mission.

## Playable content and scale

Preserve the canonical request/result boundary and existing inspection, conversation, peaceful result, escalation, retreat and aftermath behavior. Campaign settlement remains separate until integrated; never charge another block for the battle. Keep authored NPC combat restrictions.

Add clearly labeled development fixtures with **2, 6 and 12 participants**, using temporary neutral stand-ins (owner authorization, 2026-09-13) until the existing two approved character types pass their motion/visual gates. They test framing, animation cost, selection, intent, cover and effects. They do not recast Aatami/Jaska/Slomo/Arvo, rewrite Bear Path's authored encounter, or turn the whole game into fixed-size squads. Formation front/middle/back and mostly hidden cells remain.

Retain practical battle-wide, closer inspection and manually rotated views, with camera-side cutaway and visible withdrawal space. Reflow for phone/tablet portrait and landscape. Do not hide density failures by removing participants or replacing everyone with a beautiful still image.

C.09 implements the first additive test arena at `web/arena-lab/`; see [its handoff](C09_ARENA_LAB.md). The source is shared through `feat/dream-loop-c09-arena-lab`. This is a working prototype, not completion of the production or device gates.

## Visual target

A separate numbered full-size arena target must show the actual character fidelity we can supply: approved F01/F02 identities, broad handmade forms and ink texture treatment, not eight different photographic cast members. No six-panel sheet and no new UI direction. Review preferences by element; a liked light/material does not approve the whole image.

Wear is 3–4/10. Beauty comes from coherent depth, practical light and convincing material response:
- cool fill and one deliberate key light that models bodies and stone;
- reflected light/roughness on selected wet ground, polished stone edges and municipal iron;
- contact and soft shadow grounding;
- restrained glow at real lamps/windows, layered distance atmosphere and subtle environmental motion;
- quiet tactical ground and richer authored edges, with light never concealing an actionable person.

Use Dream Loop's target → implement → live capture → independent visual critique cycle after a working target is established. Keep implementation evidence distinct from generated images. The current GitHub package is a workflow and asset guidance, not a lighting engine already installed in Piritori.

## Rendering work that creates a visible leap

| System | First implementation experiment | What must be measured |
| --- | --- | --- |
| Material response | Authored albedo, normal and roughness for granite, wet paving, timber and iron; reusable material library; environment lighting | Correct material read at battle distance and texture memory; no baked character highlights |
| Reflection | One bounded ground-reflection area or probe-based reflection with a roughness/wetness mask; compare real-time and cheaper static variants | Cost with 2/6/12 animated units, camera movement and restoration; no full mirror floor |
| Light and shadow | Deliberate key/fill/rim; contact grounding; limited shadowed lights with cached/static alternatives | Silhouette exposure, grounded feet, shadow cost on actual devices |
| Glow and atmosphere | Selective bounded bloom; depth/fog separation; optional sparse rain or leaf motion | No whiteout, bloom halos over targets, excessive overdraw or loss of contrast |
| Scene construction | Repeated Blender modules and a few authored landmarks; layered but uncluttered composition | New arrangement can be assembled from the same kit; no scene-specific material rescue |
| Character display | Preserve source identity; repair walk/down/contact and shared actions using the existing continuity process | Full deformed motion and grips, not finite matrices alone |

The existing mobile profile (650k buffer pixels, 1024 texture upload and disabled real-time shadows) is a recovery baseline, not an artistic ceiling. Test higher-quality features individually and provide measured quality tiers. Do not promise Pixel/iPad frame rate from desktop results. A proposed device gate is stable 30 fps on Pixel and 60 fps on iPad where feasible, with a clearly reported 30 fps fallback; these are test targets, not accepted performance facts.

## Who makes what, and where

| Asset/work | Production route | Responsibility and demonstrated boundary |
| --- | --- | --- |
| Direction, reference screens, paint/texture source | Built-in image generation, following Art Bible and approved identities | Astra can generate and document source images here; an image is not geometry, a rig or approval |
| Walls, curbs, rails, paving modules, benches, bins, base lamps | Versioned Blender scripts on the desktop; shared dimensions/material slots; GLB export | Astra can build/integrate these. The bear script has been rerun in a clean workspace; wider kit automation still needs proof |
| Organic landmark or complex character base | Existing Meshy delivery first; approved source → Meshy cloud generation/remesh/retexture when a new asset is actually needed | Use the documented Meshy operator/receiving-agent route. Current session has no callable Meshy connector or configured standard API environment variable; that does not erase the successful remote pilot |
| Cleanup, scale/origin, LOD, UV/bake, sockets and export | Blender desktop, versioned recipe and validation | Pipeline engineering is Sol/Turf's intended lane; Astra can run available deterministic scripts. Difficult rig/skin repair is not proven solved |
| Humanoid rig and reusable body/finger/prop actions | Existing preserved rigs and motions → common-clip retarget/repair in Blender → real importer tests | Follow CHARACTER_SPEC and FIGHTER_ANIMATION_CONTINUITY. Meshy's rigging success does not prove one shared skeleton or all clips work |
| Lighting, shaders, reflection, bloom, atmosphere and camera cutaway | Three.js/JS runtime, with Blender supplying geometry and texture/bake sources | Astra owns implementation and visual/performance testing; these are engine systems, not Meshy products |
| Deterministic intake and job operations | Existing manifest plus the worker specified in 3D_PIPELINE | Sol is the intended engineering owner; a future lightweight worker may operate it. The current CLI is status/check/validate only; do not claim a running build service |
| Physical play/visual acceptance | Pixel 10 Pro and iPad M2 | Owner/device operator; desktop checks are preliminary |

No agent was dispatched by this design. No new paid job or cost approval is implied. Asset decisions and task IDs stay in the existing manifest/journal system. Do not create new characters to avoid solving the F01/F02 reproduction problem.

## Production proof before scaling

1. **One accepted character recipe.** Repair/adopt F01's preserved source and demonstrate a complete grounded action sequence. Record rig signature, compatible clip files, source/export versions and exact artifact hashes.
2. **Same recipe on F02.** Repeat through configuration, not a new manual implementation. Log intervention count, elapsed machine/operator time, credit use and failures. If this needs individual rescue, improve the recipe before a roster order.
3. **One reusable environment kit.** Ship the benchmark arrangement, then assemble a second arrangement from the same modules, materials and light recipes. Record what genuinely needed new assets.
4. **Recovery and portability.** Restore private sources on a second authorized PC; reproduce geometry/rig semantics and importer playback. Export byte hashes may differ; record that honestly and compare content rather than promising bit-identical GLBs.
5. **Visual and device evidence.** Same camera captures, action recordings, 2/6/12 participant runs, orientation/graphics recovery and actual-device frame/memory behavior. No passing label when occlusion or feet remain visibly wrong.

The current audit has NOT cleared those gates. Blender 5.2.1 rebuilt the static bear in a separate directory: 8,610 triangles, two objects, zero textures and 302,460 GLB bytes. Its file hash differs from the shipped derivative. JSON structure and all position/normal/UV float accessors match exactly; one triangle-index accessor differs. This proves an executable rebuild with matching dimensions/attributes, not final sculpt quality, identical topology ordering or bit-identical output. Character manifest still reports over-budget v05 candidates and unresolved shared rig/actions/device gates.

## Build order and decision

First implement the lighting/material/grounding pass in the current scene and produce a real capture at honest character detail. Then run the density fixtures and repair occlusion/contact. In the pipeline lane, apply the existing F01/F02 continuity work and repeatable export contract. Finish with the second kit arrangement and private cross-PC restoration evidence.

Choose C only when visual preference, actual-device play and repeatable asset production justify it. If its character/motion or scene-production cost remains too high after the defined pilot, compare **A (Turf battle)** through the same request/result, actions and representative encounter. Existing sprite reuse may reduce rig risk, but new sprite-animation production is not automatically cheap; the previous large-frame production line was parked.

**B (Slay map/run)** is a campaign/navigation alternative and can use A or C. It is not the direct replacement for C's 3D asset pipeline. Keep the living Toko/Dope Wars map as the documented strategic baseline while evaluating the separate axis.

## Sources and current evidence

- [Existing Meshy handoff](../MESHY_AGENT_HANDOFF.md), [paid pilot record](../MESHY_PILOT_RESULTS.md), [pipeline](../3D_PIPELINE.md), [current manifest](../assets/asset_manifest.json).
- [Long-term scope and A/B/C axes](https://github.com/mbace1/piritori-eden/blob/fix/godot-approach-cell/PIRITORI_LONG_TERM_SCOPE.md); later first-principles C / variable-size owner rulings supersede its original mandatory 3v3 start.
- [Dream Loop source](https://github.com/achimala/dream-loop/tree/9bddb901f7d071cfefdd21e264267c757177a9df), [public demo](https://dream-loop-demo.anshu.dev/). Demo observed locally; its displayed FPS is not our device benchmark.
- [Art Bible](../ART_BIBLE.md) checked on both main and PR #68 and identical at this audit. [3D failures](BEAR_PATH_3D_AUDIT.md) remain unresolved.
- [Meshy Image-to-3D](https://docs.meshy.ai/en/api/image-to-3d) and [Rigging](https://docs.meshy.ai/en/api/rigging): backend capabilities, not proof of current authenticated access or final asset quality.

### Port

This is a design/evidence update. No gameplay or rendering change has shipped. A later JS slice exports the canonical request/result and effect/quality contracts for Godot; no new campaign rules originate in the port.
