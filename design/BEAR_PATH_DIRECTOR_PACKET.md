# Bear Path — C.08 director packet

Owner direction, 13 September 2026: “Make large leaps astra use the concept art as a director and game director.” Astra selects Bear Path for the first connected scenario and a battle-entry camera pullback. These are implementation decisions under that delegation, not a claimed explicit owner selection or final visual acceptance. The campaign's locked purchase tutorial is unchanged.

## Authority and visual target

Read DESIGN_AUTHORITY, GDD, DESIGN_LOCKS, UX_SPEC, Art Bible, SCENARIO_ATLAS and the authored content before implementation. Runtime facts come from `content/era1-slice-v1.json`: `enc-bear-path`, `mission-bear-path`, `battle-karhupuisto-2v2`, `karhupuisto_bench`. The starting brief explicitly supplies the previously earned Three Vans flag `toko-van-pattern`; this preview does not pretend the earlier mission was played here.

Approved target: `kallio-2003-wide-scenes-v03.png`, panel 03, SHA-256 `f575627fdd5f12c0b9b14665ea8cb5ea31504928adeba9555d1b5a3ff96f61e7`. D008 records the owner's middle/right column approval. The image directs light, framing and material families, not literal geography or newly generated names.

| Beat | In-engine direction | Action and consequence |
| --- | --- | --- |
| Arrival | Cold street behind a warm pool of light; bear, bench and opposing pair establish the meeting | Observe before committing; no block spent |
| Read the space | Keep the plinth, contact and open path visible; foliage frames the perimeter | LOOK exposes cover, retreat and conflicting attention |
| Information | Slomo's note is explicitly in the starting brief, accessible without pixel hunting | Read the earlier Three Vans information for free |
| Commitment | A face cut-in from the actual opposing model sits beside dialogue while both crews remain in the scene | TALK opens canonical choices and forecasts; fixer branch disabled for this crew |
| Resolution | Peaceful handover stays intimate; holding the path pulls back once to the battle overview | One block for the encounter; no second block for combat; same actors and cover; withdrawal remains possible |
| Remembered return | Outcome facts stay visible; closed contact leaves after pre-fight withdrawal | Replayed local history, one settlement, no repeated reward; restart is explicitly another approach |

Use simple broad floor forms, matte granite and timber, warm lamp pools against cool blue-green depth, sparse leaves and an uncluttered playable center. Trees use shared cut-leaf cards. Avoid adding small noisy details before physical-device readability is checked. C.08 replaces the primitive bear with a Blender sculpt derivative and adds gravel, bench construction, wear and street detail. This remains short of final concept parity.

## Implemented boundary

The shared browser controller now hosts training or Bear Path. Bear Path preserves canonical battle condition, opponents and cover instead of the training fixture's five condition. Four actors reuse the already registered F01/F02 v05 candidates with opposing garment tints. Aatami is the commander, not recast as either fighter. Mikko/Pauli use temporary prototype casting. Jaska, Slomo and Arvo are not automatically spawned as combatants.

LOOK/TALK/USE/LEAVE, peaceful/withdraw/fight choices, aftermath, local resume and return are playable. Police heat uses the existing resolver; explicit Back off/Help your friends controls resolve its posture pause and export taken/rescued crew. Blue labeled entry markers are temporary police presentation. This does not add officer art, bespoke package-taking AI or a full campaign casualty resolver.

Portraits are captured once from the existing renderer and actors; there is no extra WebGL context. Camera motion happens only when combat starts, respects reduced motion, and yields to manual orbit/FIT. Graphics recovery preserves the committed action, encounter and pending settlement. The mobile renderer retains bounded resolution, downscaled textures and disabled shadows; FXAA softens edges without increasing resolution.

## Acceptance and next directed work

Automated checks cover authored effects, once-only time/reward, reload/tamper handling, both police postures, four viewport layouts, touch target separation, real graphics loss and bounded GPU allocations. These are desktop-host browser tests, not physical Pixel 10 Pro or iPad M2 acceptance.

The first device pass should assess whether the player can read the park, choose a peaceful route, use cover, withdraw and identify both crews in portrait and landscape. Next improve character deformation/grips, more natural sculpture anatomy, authored path wear, tree structure and background depth to approach the approved target. Keep candidate/rejected art private. Do not expand the roster or commission all locations to fix this slice.

Full campaign dispatch, travel, door availability, interiors, broader aftermath and package-specific AI remain separate integration work. Resolve D005's courtyard/Jaska site binding and D004's Arvo venue before inventing their doors. Preserve D002's current one-encounter-block baseline until the broader time rule changes explicitly.

### Port

Reproduce the encounter command/history contract and canonical request/result IDs first, then the scene staging and controls. `campaign_applied:false` is intentional. This milestone has no Godot implementation and no final asset lifecycle promotion.

## D009 — two art alternatives

Owner, 2026-09-13: “Middle and right. Seems like good 2 alt”. Keep [v04](concepts/bear-path-art-directions-v04.png) columns 2 **Ink & Stone** and 3 **Cold Street** as distinct environment directions. Neither is selected over the other; column 1 is not selected, not rejected. Ink is merely the initial comparison default. Exact generated signage, layout and people are not new canon.

The C.08 button swaps the shared scene's art profile without moving its camera or resetting an encounter. Ink uses warmer ochre, stronger painted/chiseled planes and reduced gravel contrast. Cold uses grey-blue gravel, muted timber/foliage and narrower warm practical lights. Both share the authored cover anchors and retain an open exit. The environment and character acceptance gates remain separate. See [C.08 verification](BEAR_PATH_C08_VERIFICATION.md).
