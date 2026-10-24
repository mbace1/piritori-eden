# Art Library approvals

This register separates visual approval from production readiness. An approved
concept establishes the direction but can still require cleanup, socket tuning,
additional frames or true layer extraction before shipping.

## Approved

| Asset or group | Approval | Production note |
|---|---|---|
| Cut-cardstock body frames and optional 3D turnaround v02 | Structural baseline | Normalize rig sockets during implementation. |
| Hand-ink personality and Kallio cast heads v03 | Character baseline | Split hair and hats for production while retaining crooked marker lines. |
| Hand-ink torso and leg modules v03 | Clothing baseline | Build light/heavy bridges after the medium frame. |
| Hand-ink grip and handheld sets v03 | Equipment baseline | Normalize grip markers and battle scale. |
| Runner and dog key-pose sets v03 | Motion baseline | Add in-betweens, timing and root-motion data. |
| Lime tree and grass wind poses v01 | Foliage baseline | Extract rear/front crown pieces and build loops. |
| Clean-cardstock v02 variant set | Approved alternate | Retain as simplification and structural fallback. |
| Karhupuisto location plate | Location baseline | Separate trees, vegetation and landmark before animation. |
| Mirrored 3x3 formation geometry | System baseline | Keep the permanent grid invisible; reveal only actionable cells. |
| Landscape and portrait command geometry | UX baseline | Final typography and icon language remain open. |
| Arvo Linde presenter model v05 | Broadcast baseline | The ART_BIBLE 13.2 3D exception. Rigged, 24-bone humanoid, no blendshapes — lip sync needs them before recurring speech. Fictional composite, not a likeness. |
| Battle detail ceiling | Detail target | Reduce environmental texture about 25 percent for production. |
| Battle simplification floor | Lower bound | Final assets should retain more character detail. |
| Toko Slomo's Noodles fullscreen screen v02 | Narrative-instance baseline | Corrected eye openings sit inside the white arches. True PNG and normalized hit regions are implementation-ready; separate copy and controls for later dynamic content. |
| Toko Slomo paper rig v01 (`scene-toko-rig-v01`) | Owner-approved, 2026-10-21: "Approved, put it in the game" | Toko cut from the v02 screen into eleven pieces (hood, brows, eyelids, torso, both forearms, the note, a counter strip from the empty bar) and acted on hidden pivots: idle, lean (lowers his voice), buy, sabotage, leave. Drawn over `scene-toko-noodles-empty-v01` in place of `cast3d-toko-v01` at the counter; the owner chose this over the 3D layer. Provenance: `art-library/rigs/toko-slomo-paper-v01/README.md`. |
| F01 heavy bruiser front T-pose concept | Owner-approved Meshy pilot source | The 2D identity and pose are approved. Generated 3D geometry, topology, texture, rig, animation and runtime readiness require separate review; see [Meshy pilot results](../MESHY_PILOT_RESULTS.md). |
| F02 wiry skirmisher front T-pose concept | Owner-approved Meshy pilot source | The 2D identity and pose are approved. Generated 3D geometry, topology, texture, rig, animation and runtime readiness require separate review; see [Meshy pilot results](../MESHY_PILOT_RESULTS.md). |
| Jaska cut-in rig v01 (`cutin-jaska-rig-v01`) | Owner-approved, 2026-10-24: "Jaska ... already approved" | Cut from Jaska concept v03; waist-up over the Scene Club with the speech bubble the owner steered. Preview: ?cutin=jaska. |

## Semi-approved

| Asset or group | Approval | Production note |
|---|---|---|
| Sörnäinen dock plate | Location direction | Separate quay, water, crane and warehouse layers. |
| Kallio courtyard v02 | Replacement candidate | Coherent block and tactical space; user review still required. |
| Kallio street, park and dock props | Prop direction | Match the approved hand-ink foliage grammar and isometric pitch. |
| Alley landscape battle assembly | Layout direction | Replace the archived courtyard plate. |
| Alley portrait battle assembly | Mobile reflow direction | Replace its plate and retain the tighter crop. |
| Back/mid/front/ground weather vectors | Layer direction | Tune density, masks and palette in engine. |
| Arvo cut-in rig v01 (`cutin-arvo-rig-v01`) | Direction accepted, 2026-10-23: NPCs waist-up, "they don't need to be 3D" | Cut from the approved Arvo v05. Preview: ?cutin=arvo. The rig awaits owner review (PR #107). |

## Needs rework

| Asset or group | Reason | Replacement brief |
|---|---|---|
| Kallio alley/courtyard v01 | Wings, windows and arches do not read as one Helsinki block. | One coherent perimeter block with repeated window bays, granite base and one integrated porttikongi. |
| Fixed cast detail v00 | Too rendered and insufficiently modular. | Assemble units from approved v02/v03 body, head and clothing sets. |
| Modular detail v01 | Too polished and generic beside the foliage. | Use larger paper planes with sparse, visibly crooked marker accents. |
| Weapon detail v01 | Too rendered and mechanically fussy. | Use the approved broad v03 silhouettes and hand sockets. |
| Character and dog animation detail v01 | Generic illustration treatment. | Use the approved v03 cut-paper personality poses. |

Archived files live under `archive/needs-rework/` and are excluded from active
manifests.

## Runtime extraction status

`../art/v3/manifest.json` registers the first optimized prototype derivatives.
Registration does not change the approval table above. The active register contains
42 stable ids and explicitly preserves the Toko baked-screen
exception plus the courtyard/weather semi-approved status. The slice validator
rejects empty files, bad references and any needs-rework archive dependency.
