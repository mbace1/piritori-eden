# Piritori active context

Updated 2026-09-13. Read this before designing, resuming 3D work or asking the owner to repeat a decision. This is a retrieval index and current owner brief, not a second asset-status ledger.

## Read in this order

1. This file and [DESIGN_AUTHORITY.md](DESIGN_AUTHORITY.md).
2. [ART_BIBLE.md](ART_BIBLE.md), GDD, and the relevant location in [SCENARIO_ATLAS](design/SCENARIO_ATLAS.md).
3. For asset work: [MESHY_AGENT_HANDOFF.md](MESHY_AGENT_HANDOFF.md), its current-production notice, [3D_PIPELINE.md](3D_PIPELINE.md), [MESHY_PILOT_RESULTS.md](MESHY_PILOT_RESULTS.md), [CHARACTER_SPEC](assets/CHARACTER_SPEC.md), and [asset_manifest.json](assets/asset_manifest.json).
4. Current PR/manifest state before deciding that something is missing. This desktop has a partial checkout; a missing local file is not evidence it is absent from GitHub.

## Latest owner direction — carry into every design

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

Next: [Option C vertical-slice design](design/OPTION_C_VERTICAL_SLICE.md). Prove both the visual result and the cost of reproducing it. Compare A if C cannot clear the production gate; B is a separate map decision.

## Runtime truth at this update

C.09.1 is live as a separate [arena laboratory](https://mbace1.github.io/Suds-Jack/piritori-c09/web/arena-lab/?actors=6&release=9.1), from merged PR #70 / source `daddf480`. Read [release evidence](design/C091_RELEASE.json) for the hub commit and verification limits. C.08 r2 remains the authored Bear Path card. The following old-model audit applies to those imported prototypes: [3D audit](design/BEAR_PATH_3D_AUDIT.md): severe tree occlusion at some angles, weak walk contact, down poses below ground. Do not describe these as fixed. Movement, attacks and resume worked in the desktop tests. Asset status comes from the manifest and current evidence, never this prose alone.


## C.09 source continuation

`feat/dream-loop-c09-arena-lab` adds `web/arena-lab/` with grounded stand-ins, 2/6/12-person fixtures, wet paving/light probe and scenery cutaway. Read [C.09 handoff](design/C09_ARENA_LAB.md) for entry points, tests and remaining gates. PR #69 was merged into `art/meshy-approved-pilots-2026-09-11` and published on the hub as C.09. The stand-ins do not repair or promote Meshy models. C.09.1's performance/visibility batch is merged and public. Read its handoff and `piritori-c09/release.json` for the current public source commit. Next: physical Pixel/iPad tests, deliberate practical lighting, and a second reproducible environment arrangement; actor overlap and final rigs remain open.
