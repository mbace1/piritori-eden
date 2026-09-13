# C.09 — Bear Park arena laboratory

Owner continuation, 2026-09-13: use temporary characters to reduce defects and keep each reviewable slice on Piritori GitHub. This implements the first additive part of [Option C](OPTION_C_VERTICAL_SLICE.md). It is a working development arena, not final art or production character acceptance.

## Source and play

Branch: `feat/dream-loop-c09-arena-lab`, based on PR #68 head `0085549f8b5a9fac0a2986126dd389ce2a4c7fe9`. Its PR targets that source branch to keep this batch reviewable. Do not merge the entire older stacked PR or change its base as a shortcut.

From a complete checkout, serve the repository root with `python -m http.server 8796` and open:

- `/web/arena-lab/?actors=2`
- `/web/arena-lab/?actors=6`
- `/web/arena-lab/?actors=12`

The existing `web/bear-path/` remains the authored encounter. The laboratory has no mission costs, campaign effects, narrative NPCs or automatic save into Bear Path. Changing participant fixture starts fresh. Graphics recovery retains committed commands using its separate session key.

**Hub status:** C.08 r2 remains the public hub baseline. Publishing this source branch/PR is not a hub deployment. The lab can be run by other PCs from this branch now; a separately versioned hub release remains to be made.

## What changed

- Neutral, articulated stand-ins with broad/slender proportions and jade/rust teams. One instanced body draw per fighter. No Meshy model download is required by the lab. These are test equipment, not F01/F02 redesigns.
- Idle, walk, strike, shoot, brace, item, talk, hit, grip and down presentations. Feet remain grounded by explicit limb targets and transformed support bounds. Weapons remain simple grip proxies. This is not a replacement for cloth, skinning, finger animation or retarget tests.
- 2/6/12-person fixtures use the existing battle resolver and the park's authored cover anchors. Selection, move, attack, end round, withdrawal, loadouts, rehearsal and recovery work through the existing controller.
- Lab autoplay prefers positions from which a legal attack is available. The previous forward-most choice could pass every opponent and stall at the board edge. This policy is lab-only so existing C.08 seeded command-replay saves remain compatible. Reach, cover, costs and damage rules are unchanged.
- Shared paving albedo/bump, variable wet roughness, and a small authored sky/practical-light PMREM probe. This gives material response without a live reflection pass. It is not screen-space reflection, dynamic reflected characters or the Dream Loop demo renderer.
- View-space scenery cutaway tracks up to twelve fighters. It removes obstructing fragments while retaining cover rules and distant scenery. It does not separate fighters who overlap each other from a side view.
- Compact crowded-scene tags, horizontally scrollable roster, explicit landscape panel scrolling, and shader warmup excluded from the first adaptive-performance decision.

## Verification

Automated checks ran on desktop Edge/Chromium with a local AMD graphics adapter, including touch viewport emulation. **No physical Pixel 10 Pro, iPad M2, Safari or controller hardware acceptance is claimed.** Current summaries are in [C09_ARENA_LAB_VERIFICATION.json](C09_ARENA_LAB_VERIFICATION.json). Private captures and intermediate review images are not in the public repository.

- Nine combinations: 2/6/12 participants × mixed/melee/ranged loadouts. Unique occupied cells/labels, matching park cover, deterministic checkpoint replay, terminal auto outcomes and zero campaign effects.
- Browser: desktop 1440×1000 (6), portrait phone 412×915 (12), landscape phone 915×412 (2), landscape tablet 1194×834 (12). Movement, an enemy round, ranged attack, restart, checkpoint replay and forced WebGL loss/restoration pass without console or page errors.
- 720 motion samples: both stand-in builds × ten actions × 36 samples, inspecting the actual transformed body vertices. Lowest surface stays about 1.5–2.6 cm above the floor; no body penetrations or nonfinite vertices in these samples. This is not evidence that imported F01/F02 have been repaired.
- 48 silhouette comparisons: six standing fighters × eight desktop camera angles. Scenery-only visibility is at least 99.6%. With other fighters included, the worst view is about 60.8% due to formation overlap. It remains possible to hide parts of a fighter behind another fighter; default view and identifiers help, but this is not a universal visibility pass for every move cell.
- Existing fight-module, recovery, Bear Path encounter and police suites pass. The authored encounter's automatic police outcome remains at round 9.

Run from the repository root:

```sh
node web/test/arena-lab.mjs
node web/test/fight-module.mjs
node web/test/fight-module-recovery.mjs
node web/test/bear-path.mjs
node web/test/bear-path-police.mjs
# Requires Playwright and Edge; point at your root-served URL:
ARENA_LAB_URL=http://127.0.0.1:8796/web/arena-lab/ node web/test/arena-lab-browser.cjs
```

For PowerShell set `$env:ARENA_LAB_URL` before the browser command. QA-only hooks are injected by the test; the shipped page does not load them. Local test output defaults to `.private/c09-qa`.

## Next acceptance work

1. Stage a more deliberate light/roughness arrangement; the current probe gives broad approximate highlights and still looks softer and simpler than the desired concept direction. Do not call the Dream Loop visual target complete.
2. Check cutaways after movement to every edge cell, 12-person rotated views, orientation changes during actions, and longer performance/memory runs. Side-on actor overlap remains a separate problem from scenery occlusion. The roster/secondary panel scroll on small screens; test discoverability on hardware.
3. Test on the actual Pixel and iPad before selecting quality tiers. Desktop touch emulation observed roughly 26–27 FPS; this is below a strict sustained-30 target and is not a hardware prediction. Desktop observed roughly 46 FPS with shadows.
4. Integrate F01/F02 only when their existing rig, ground-contact, prop/finger, visual and device gates pass. Production manifest and their rejected motion gate are unchanged. No new paid asset jobs were submitted.
5. Reproduce a second arrangement from the same environment kit, then connect the improved rendering to the authored meeting/dialogue/battle loop. Full campaign settlement, nearby lit doors/interiors, complete kit production and off-PC master restoration remain outside this batch.

## Continuation map

`web/fight-module/stand-in.js`: temporary body provider and grounded motion.
`web/bear-path/development-look.js`: probe, surface and cutaway recipe.
`web/fight-module/session.js`: opt-in capacity fixtures and recovery reconstruction.
`web/fight-module/resolver.js`: opt-in lab automatic reposition policy.
`web/fight-module/main.js`: existing presentation/controller with laboratory entry.
`web/test/arena-lab*`: repeatable rule/browser/geometry evidence.

Read ACTIVE_CONTEXT, DESIGN_AUTHORITY and the existing Meshy pipeline before continuing. Do not promote placeholders or candidates in the asset manifest based on these tests.

## CI metadata correction

The first GitHub run found two inherited invalid `direction-approved` labels on the bear and gravel. They are now honestly `unreviewed-prototype` / `not-owner-approved`, retaining `playable-test-only`. The validator accepts this state only for 3D location-stage prototypes with those explicit restrictions; it rejects attempted production promotion or character use. No art bytes, hashes or F01/F02 production gates change. Run `node web/test/runtime-art-status.mjs` for the negative cases.

