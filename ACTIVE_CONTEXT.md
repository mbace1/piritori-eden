# Owner direction — 2026-09-23

> C.19 is the main active, Godot is alive and should catch up with that. A.1
> should be started. B.1 is Slay and separate game mode worked in different
> instance. Likely still a part of the bigger Piritori, like the map
> mini-game (also separate) and the dope wars mini-game that needs
> integration to map and narrative side here.

- **C.19 is the active build.** Night Shift / `web/crew-run/` is what ships.
- **Godot is alive** and catches up with C.19, not with the older v4.x line.
- **A.1 started** — [design/A1_TURF_BASE.md](design/A1_TURF_BASE.md): the
  battle request/result contract, TURF's engine run against it, and the
  measured distance between the two rule sets. Source only; not playable.
- **B.1 is Slay the Spire-style routing, built in another instance.** B, the
  map mini-game and the Dope Wars mini-game are all parts of Piritori that
  still need integrating with the map and narrative here; none is owned by
  this line of work.

# C.19 implementation and release record — 2026-09-17

The approved acceptance/readability implementation is in [source PR #89](https://github.com/mbace1/piritori-eden/pull/89).
The matching hub records are [development #546](https://github.com/mbace1/Suds-Jack/pull/546)
and [Pages #547](https://github.com/mbace1/Suds-Jack/pull/547). Read their latest
acceptance/publication receipts rather than inferring publication from this
document or a source merge. The shipping `piritori-c17/release.json` records
exact source/tested heads, file hashes and the public build identity.

Read [C.19 behavior and Godot port boundary](design/C19_READABILITY.md).
Focused/full fighter labels, selected/target cues, rescue/recovery guidance,
automatic crew-picker closure and a labelled exit preserve existing rules.
Tests add defeat, checkpoint replay and onward recovery. Physical Pixel/iPad
and owner visual/play acceptance remain OPEN; Godot presentation is unported.
External character models remain parked. Map/mission work follows the approved
small-iteration programme below, not an automatic new mission or map layout.

# Piritori active context

## Owner-approved continuation — 2026-09-17

Owner: **“Yes to all, and then map and missions will take many steps to get right”**.
Read [the approved sequence and iteration plan](design/POST_C18_ITERATION_PLAN.md).

Order: close C.18 acceptance gaps; improve battlefield readability and procedural
character presentation before combat-rule changes; connect one authored
city/contact/mission/consequence loop; only then expand toward a short chapter.
Map and missions require many small playable iterations, not a one-shot map
build or an immediate content expansion. Final layout, mission selection,
balance, art approval and battle-base selection remain separate decisions.

The next bounded batch is acceptance/readability, not another disconnected
system. Preserve full enemy intentions and action costs while reducing duplicated
floating panels; clarify selected fighter, target, rescue and extraction. Keep
external character models and Meshy work parked. Physical-device acceptance and
owner visual/gameplay acceptance must remain distinct from automated checks.

For map/mission work, progress through existing-system audit, navigation,
meaningful travel, one contact/opportunity, authored mission alternatives,
persistent consequences and repeat visits. Each checkpoint may take several
builds and can be revisited. The 6–8-anchor / 20–30-minute chapter remains a later
prototype target, not a quota or a claim that its map/missions are designed.

## Historical C.18 public release — Night Shift

The release record in [source PR #87](https://github.com/mbace1/piritori-eden/pull/87)
identifies integration commit `48c9e2950c921521c6f5f0ef084d1eb89ad216a9` on
`art/meshy-approved-pilots-2026-09-11`, **not source main**. Feature work is #86;
the build-identity correction is #87. Hub #537/#538 publish the matching package.

Existing public acceptance run `35221092835` checked all 61 file hashes and the
actual hub card in portrait/landscape through preparation → deployment → confirmed
movement → next round → retreat → aftermath → preparation, including actual
WebGL scene pixels and no page errors. Source checks separately cover
rescue/extraction/recovery. These are recorded results, not new tests performed
by this documentation update. The physical Pixel 10 Pro / iPad M2 rendering gate
is still open; hosted Chromium/SwiftShader does not close it.

[Play C.18](https://mbace1.github.io/Suds-Jack/piritori-c17/web/crew-run/?campaign=1&release=18).
Header and About should both say C.18. The package path retaining `piritori-c17`
is intentional. Menu → Graphics offers reflection-bypass safe graphics.
C.16.1 remains a rollback; C.08 was removed from the hub and must not be described
as a current card. Historical release notes below are retained for context.
This documentation-only continuation changes no runtime or public version.

## C.18 owner feedback / UI consolidation — 2026-09-16 (historical brief)

C.17.1 loads UI on the owner phone but leaves the arena black. Simplify the current visual target: less clutter and less patchwork. External character models remain on hold. See design/C18_UNIFIED_UI.md. Menus and green logic checks do not prove visible mobile 3D. Physical-device acceptance remains open.

## Owner art feedback — 2026-09-15

The owner named **03 — Lantern Noir** and **06 — Ink After Dark** after the six
numbered studies. The last explicit ranking was 03 first / 06 second, followed
by a standalone “6”; whether that changes the ranking is unresolved. Preserve
both as the current shortlist, with final direction and art approval still open.
The earlier assistant recommendation of 05 + 04 is not the owner’s selection.

All six concepts, prompts, the Blender generator, scenery kit, textures, tests
and runtime work are in this repository. See [the art handoff](design/C16_ART_HANDOFF.md).
This update records feedback and submission status; it does not change C.16.1.

## C.16.1 previous public release — Night Shift / retained rollback

2026-09-14: source PR #82 and hub PR #523 are merged; Pages and the public hub
card, equipment, deployment, movement, save reload, HOME return, all 56 hashes
and controller navigation are verified. Read [release evidence](design/C161_RELEASE.json)
and [play C.16.1](https://mbace1.github.io/Suds-Jack/piritori-c09/web/crew-run/?release=16.1).
All eight source CI jobs and the final hub checks passed. The failed Slay lighting
pixel check was rerun at the same hub head; its final result is in the receipt.

C.16 adds recessed windows, passage depth, cavity shading, wear and bounded wet
reflections. Timing/recovery fixes preserve real action duration on slow renderers
and prepare graphics before controls unlock. C.16.1 restores gamepad polling in
static menus and repairs the complete cache transition. Windows exports now use
`git -c core.autocrlf=false archive` plus raw blob verification. See
[delivery procedure](design/HUB_RELEASE.md).

## Retained art direction — read with the 2026-09-17 sequence above

Owner: “Let's start finalizing the art pass. Mechanics and gameplay pass next.”
The released C.16.1 look follows [02 / After the Rain](design/concepts/c13-review/02-after-the-rain.png).
For the next stylization study, use the owner’s 03 / 06 shortlist above.
The six newer [numbered studies](design/concepts/c16-stylized/README.md) are
illustrations and unapproved proposals. Read [C.16 art finish](design/C16_ART_FINISH.md).
The first corrected private art review reached 7.1/10; that is not owner acceptance.

Next: actual Pixel 10 Pro and iPad M2 checks in both orientations, concept parity
and final fighter/motion acceptance. Then continue the mechanics/gameplay pass
and authored city/chapter bridge under the existing direction. Keep neutral
stand-ins until F01/F02 fit and look good; F03 remains rejected. No asset lifecycle
promotion, paid generation or new art approval occurred in this release.

## C.15 previous release — Night Places

Owner wants new arenas, minimalist rain-concept UI, mood lights and varied cameras.
Read [C.15](design/C15_NIGHT_PLACES.md) and [GitHub resources](design/C15_GITHUB_RESOURCES.md).
Courtyard/service-yard/park selection uses the existing separate Night Shift rules.
Twelve Blender motifs and two painted textures, static scene reflection probe,
compact crew drawer and three camera presets are live. Source PR #80 and hub
PR #519 are merged. Pages and the actual public hub/game are verified; read
[release evidence](design/C15_RELEASE.json) and
[play C.15](https://mbace1.github.io/Suds-Jack/piritori-c09/web/crew-run/?release=15).
The private visual review reached 6.1/10; material/window detail, concept parity
and physical-device acceptance remain open.


## C.14 previous public release — After the Rain art and gun aiming

Owner: “2 looks great, let's aim for that. Camera angles can be used for aiming
guns like zero company”. Use [02](design/concepts/c13-review/02-after-the-rain.png)
for the current lighting/material/atmosphere target. Read [C.14 implementation](design/C14_AFTER_THE_RAIN.md).
Gun inspection is reversible and uses the actual forecast. Target selection is
not pixel-parity, rig or physical-device acceptance. Source PR #79 and hub PR #518 are merged. C.14 is deployed and verified through
the public hub and real Aim view / cancel / confirm controls. Read
[release evidence](design/C14_RELEASE.json) and
[play C.14](https://mbace1.github.io/Suds-Jack/piritori-c09/web/crew-run/?release=14).
The next art pass is scoped in the C.14 director assessment; final characters,
concept parity and physical Pixel/iPad acceptance remain open.

Updated 2026-09-17. Read this before designing, resuming 3D work or asking the owner to repeat a decision. This is a retrieval index and current owner brief, not a second asset-status ledger.

## Read in this order

1. This file, [the post-C.18 iteration plan](design/POST_C18_ITERATION_PLAN.md) and [DESIGN_AUTHORITY.md](DESIGN_AUTHORITY.md).
2. [ART_BIBLE.md](ART_BIBLE.md), GDD, and the relevant location in [SCENARIO_ATLAS](design/SCENARIO_ATLAS.md).
3. For asset work: [MESHY_AGENT_HANDOFF.md](MESHY_AGENT_HANDOFF.md), its current-production notice, [3D_PIPELINE.md](3D_PIPELINE.md), [MESHY_PILOT_RESULTS.md](MESHY_PILOT_RESULTS.md), [CHARACTER_SPEC](assets/CHARACTER_SPEC.md), and [asset_manifest.json](assets/asset_manifest.json).
4. Current PR/manifest state before deciding that something is missing. This desktop has a partial checkout; a missing local file is not evidence it is absent from GitHub.

## C.13 art and UI foundation (historical)

The owner rejected C.12's interface as poorly grounded in the design. Read
[the C.13 pass](design/C13_ART_AND_UI.md): the actual portrait/landscape UI targets
and park-night reference were inspected. This batch restores the dark carton /
cream console, a crew ledger, actual-figure portraits and practical night light.
C.13 was verified through the public hub and real controls; see C.18 above for the current release. Source PR #78
and hub PR #517 are merged. Read [release evidence](design/C13_RELEASE.json) and
[play C.13](https://mbace1.github.io/Suds-Jack/piritori-c09/web/crew-run/?release=13). Owner visual review and physical Pixel/iPad acceptance remain
open. No new character approval is implied.

Concept history: [two numbered concept directions](design/concepts/c13-review/README.md). These are illustrations, not shipped graphics. The owner selected 02 as the current implementation target; parity remains open.

## C.12 foundation (retained in C.13)

C.12 continuation: the owner asked for a bigger leap. `web/crew-run/` now joins
crew/loadout preparation, a rescue/extraction objective, announced rival arrivals,
persistent wounds/missing people and a repeat outing. Read
[Night Shift](design/C12_NIGHT_SHIFT.md). This is a connected gameplay pilot with
its own save, not a new authored chapter track. The city/meeting bridge is next;
weapons/replacements are supplied for testing and all Meshy gates remain open.
C.12 shipped the connected outing; its rules and saves continue in C.13.
Source PR #77 / hub PR #516 are merged. Read [release evidence](design/C12_RELEASE.json)
and the [playable](https://mbace1.github.io/Suds-Jack/piritori-c09/web/crew-run/?release=12).

Move + Act, full stored intent, cover/LOS/path previews, ammo/reload, route motion, visible temporary weapons and optional conservative action focus are implemented in the C laboratory. See [C.10 implementation and test receipt](design/C10_IMPLEMENTATION.md). C.11 adds directional low walls, flanking, route detours, crouch/rise/fire/return and resolved HP/guard/wall/miss feedback. See [C.11](design/C11_COMBAT_PASS.md) and its release receipt. Campaign/Bear Path keep their authored resolver. No fighter asset gate changed.

## Latest owner direction — carry into every design

- Latest approved sequence: [post-C.18 iteration plan](design/POST_C18_ITERATION_PLAN.md). Device/outcome acceptance and battlefield clarity first; map and missions require many revisitable playable steps before chapter expansion. No external-model work is authorized by that continuation.

- Latest owner clarification: **Mewgenics meets XCOM**; the TURF summary guides both A (2D) and C (active 3D). Read [shared tactical direction](design/A_C_TACTICAL_DIRECTION.md). Move + Act and full intent are core targets now, not a deferred optional experiment. Persistent crew/builds tie combat back into chapters and the living city. C.18 Night Shift is the live crew pilot with C.17's opt-in campaign bridge; C.11 capacity fixtures remain linked.

- Owner playtest, 2026-09-13: C.09.1 playable is good. Next requests: richer attack/gun/cover animation and presentation, concept-art parity, Star Wars Zero Company camera reference and Metal Slug Tactics telegraphing/movement. See [C.10 combat plan](design/C10_COMBAT_DIRECTION.md). C.11 builds on the first combat/camera pass with directional low-wall cover and stand-in crouch/peek. C.12 adds persistent crew and rescue/extraction consequences. Final art and the city bridge remain open.

- Owner continuation, 2026-09-13: minimize defects; use temporary placeholder characters until F01/F02 fit and look good. These are development stand-ins, not redesigns or asset promotions.
- Push each reviewable vertical-slice batch to **mbace1/piritori-eden on GitHub**, with its tests and handoff, so agents on other PCs can continue from the same source. Local work alone is not delivery. The owner also authorizes merging and requires each tested playable batch on the **Suds Jack hub**; finish with the public route verified. See [release procedure](design/HUB_RELEASE.md).

- Prefer substantial, visible progress using the Dream Loop workflow. The request is for Astra Extra High; do not claim an app/model setting was changed without evidence.
- Art Bible controls visual identity. Dream Loop improves dimensional light, materials, reflections and atmosphere; it does not replace Piritori with generic realistic humans or fantasy art.
- Wear/neglect roughly **3–4/10**. Underground themes can still be beautiful. Lighting and style matter more than blanket grime.
- A selected option is normally a comparative preference, not approval. Record which element was preferred: style, light, composition, material, etc. D009's v04 middle/right choice was overstated and is corrected. Preserve earlier explicit approvals within their actual scope.
- Stop six-in-one comparison sheets for this exploration. Use separate numbered, substantially different full-size arena views. UI and other narrative-scene exploration are separate.
- Targets should resemble attainable game screens, with honest character fidelity and reproducible assets. No photographic people substituting for the approved Meshy characters.
- Game encounters range from **2 to 10+ participants**. Four is only an existing fixture, not a game limit. Use 2/6/12 participants as proposed capacity tests, not newly authored missions.
- Bear Park is one local tram-stop/weed-buying/meeting/fight location, not the whole game. Nearby places share market conditions; preserve the reason to travel by tram.
- Actual test devices: **Pixel 10 Pro and iPad M2**, portrait and landscape. Desktop emulation is not device acceptance.
- If clarification is needed, ask numbered questions, three at a time. Check the documents first.

## Existing pipeline — use it, do not reinvent it

Astra owns integration, visual direction, rendering and tests. Sol / Turf is the intended pipeline-engineering counterpart in 3D_PIPELINE.md. A role assignment is not proof that a task was dispatched or a worker is running.

The receiving agent already completed F01/F02's paid geometry → remesh → retexture → rig → idle/walk chain. IDs, fingerprints and historic credit use are in MESHY_PILOT_RESULTS. Adopt existing inputs; do not rerun paid jobs because this desktop lacks API configuration.

F01: broad man, black leather jacket, ochre knit, dark trousers, heavy shoes. F02: lean woman, short uneven dark hair, black padded vest, grey hoodie, rust striped track pants, offwhite trainers. Their exact approved source images control identity. F03 is scrapped. No roster expansion to solve a pipeline problem.

Current v05 models are rigged playable prototypes, not final. Common-rig compatibility, complete shared actions, normalization, final visual/device acceptance and off-PC archive delivery remain open in the manifest. Private v06 candidates are not accepted or deployed. Keep intermediate/rejected art and masters private.

## Decision axes and next work

- A = Turf-based battle implementation.
- C = Dream Loop-based battle implementation.
- B = Slay-style campaign map/run structure, compatible with either battle approach.
- The living Toko/Dope Wars city remains the strategic baseline. The long-term scope lives on the documented fix/godot-approach-cell branch; later owner rulings supersede its original mandatory 3v3 start.

Next: follow [the approved iterative sequence](design/POST_C18_ITERATION_PLAN.md), with [Option C vertical-slice design](design/OPTION_C_VERTICAL_SLICE.md) retained as background. Prove the visual result and reproducible production cost. Record the A/C comparison and selection before making a default campaign resolver; B remains a separate map decision.

## Runtime truth at this update — 2026-09-17

C.18 is the current recorded live [Night Shift crew pilot](https://mbace1.github.io/Suds-Jack/piritori-c17/web/crew-run/?campaign=1&release=18). See [source #87 and release evidence](https://github.com/mbace1/piritori-eden/pull/87), [C.18 UI/rendering](design/C18_UNIFIED_UI.md) and [C.17 campaign bridge](design/C17_CREW_MATTERS.md). Source integration remains `art/meshy-approved-pilots-2026-09-11`, not `main`. C.16.1 remains a rollback; C.08 is no longer a public hub card. The C.17 bridge is opt-in, not a completed authored city/chapter integration.

The following historical audit concerns imported model prototypes, not proof that current stand-ins have the same defects or that the imported models were fixed: [3D audit](design/BEAR_PATH_3D_AUDIT.md) recorded severe tree occlusion at some angles, weak walk contact and down poses below ground. Asset status comes from the manifest and current evidence, never this prose alone. External character work is parked by the current owner direction.

## C.09 source continuation (historical)

`feat/dream-loop-c09-arena-lab` adds `web/arena-lab/` with grounded stand-ins, 2/6/12-person fixtures, wet paving/light probe and scenery cutaway. Read [C.09 handoff](design/C09_ARENA_LAB.md) for entry points, tests and remaining gates. PR #69 was merged into `art/meshy-approved-pilots-2026-09-11` and published on the hub as C.09. The stand-ins do not repair or promote Meshy models. C.11 builds on the C.09.1/C.10.1 performance and visibility work. The current laboratory adds Move + Act, full stored intent, cover/route/attack previews, ammo/reload, temporary weapon motion and conservative optional action focus. Read `piritori-c09/release.json` for that cabinet's pinned source; current C.18 release evidence is linked above. C.11 adds oriented low walls, flank previews, detours and crouch/peek/impact feedback. C.12 adds crew/loadout preparation, rescue, extraction, announced arrivals and persistent wounds/missing people. Physical Pixel/iPad tests and the authored chapter/city bridge remain open as described in the current plan.
