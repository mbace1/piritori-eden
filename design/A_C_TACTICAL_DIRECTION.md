# Shared direction for A and C — Mewgenics meets XCOM

Owner direction, 2026-09-13: the TURF summary applies to **A (2D Turf)** and **C (the active 3D route)**. Follow-up: **"it's Mewgenics meets Xcom."** This defines the shared design target, not complete reference-game parity. C.11 is the active public lab; see [implementation](C10_IMPLEMENTATION.md) and [release evidence](C10_RELEASE.json).

## Reference hierarchy

- Mewgenics: distinctive persistent people, emergent builds, equipment, liabilities and chapter/run growth.
- XCOM: deliberate squad positioning, Move + Act, weapon roles, cover, consequential attacks and readable tactical command.
- Turf's summary/GDD: the concrete shared combat guide, including full intent by default.
- Into the Breach: the full-information telegraph promise. Do not attribute this promise to MST.
- Metal Slug Tactics: expressive movement, silhouette clarity, readable action and pressure from varied enemy counts.
- Zero Company: optional action-camera presentation that returns control to a useful planning view.
- Piritori's Art Bible and GDD: Kallio 2003, underground identity, authored people/locations, city economy, chapter structure, consequences and visual identity.

Use named features, not entire borrowed games. The owner has not requested breeding/genetics, a card action economy, a fixed three-person Piritori squad or a replacement for the living city/tram layer.

## Shared combat contract

1. **One Move and one Action per unit, either order.** Also permit spending only one. Reload spends Action, preserving Move. C.10.1 implements the separate Move and Action budgets in the laboratory. This replaces the previous C.10 plan's deferral of Move + Act as an optional later experiment.
2. **Full enemy intent by default.** Show action/weapon, planned origin/destination, affected cells/target and timing before player commitment. Movement, pushes, death, obstruction and target loss must obey explicit, previewable invalidation rules. Do not silently retarget into a surprise attack after showing a fixed promise. A harder partial-intel mode is later design.
3. **Forecast and resolution share rules.** Show shot odds where RNG exists, guard/condition consequences, cover and total incoming danger. A forecast is not a promise that a probabilistic shot hits. Aggregate lethal threats rather than checking only the largest single attack. Preview cannot consume RNG or spend a turn.
4. **Two clearly different cover classes.** Full cover blocks travel and line of sight; partial/ranged cover protects without becoming a full blocker. Props and indicators represent the same data. Decorative poles do not become protection by accident. The art does not conceal cover or valid targets.
5. **The player chooses position.** Show legal paths and firing positions with costs/exposure. Never silently run to the cheapest tile when safer positions exist. Movement animation follows a validated route, not a straight line through bodies or cover.
6. **Weapons and builds change decisions.** Melee sharp, melee blunt/control, steady handgun and close burst are distinct profiles. Existing bat/knife/handgun start the active lab; shotgun/other profiles enter through data and their tests. Starting role is not a permanent class: skills, traits and equipment combine independently of name or appearance.
7. **Readable resolution.** Show LOOK then ACT for enemy actions; synchronize aim/swing/fire, impact, guard or injury response and down state to the resolved record. Action camera and effects cannot change the result. Manual camera, reduced motion and overview remain available.

## What transfers, and what stays specific

| Topic | A — 2D Turf | C — active 3D Piritori |
| --- | --- | --- |
| Tactical design | Existing Move + Act, forecasts and intent are the reference to inspect | C.10.1 implements the first pass; campaign migration is still separate |
| Presentation | 2D isometric sprites/plates, existing assets first | Meshy/Blender pipeline; authorized neutral stand-ins until F01/F02 pass |
| Camera | Player zoom/pan/FIT, offscreen threat markers | Overview, manual orbit/zoom/FIT, optional action focus and return |
| Scale | Current Turf encounters and roster are examples | Variable/asymmetric 2 to 10+ participants; no restored three-person cap |
| Persistence | Named crew, skills and equipment build the run | Preserve Piritori's chapter, injury, absence/death and relationship rules |
| Delivery | Preserve Turf's playable; reuse its tested lessons | Continue C as active; publish tested C batches to repo and hub |

These are compatible design contracts, not a claim that both runtimes already share one implementation. Use small data/adaptor boundaries and common behavioral vectors where useful; do not import a renderer or incompatible save format just to reuse code.

The old GDD formation-only, single-action battle paragraphs describe the prior implementation direction. This owner continuation sets the target for the A/C tactics track. Existing campaign/Bear Path saves and authored encounters retain their rules until an explicit tested migration. Do not impose the old formation-board dimensions as a limit on the new tactics design. Front/middle/back may remain useful positioning concepts without fixing the arena to two 3x3 halves.

## Persistent people and the larger game

Piritori GDD §12 already defines name/origin, competencies, a strength/liability, gear, wounds, obligations and relationships. Roles are flexible. Downed does not automatically mean dead: treatment, the exit and outcome matter. Missing/held, scars, death and veteran value stay meaningful.

The chapter addenda define re-playable chapter runs, unlocking the next chapter, people/gear that can carry but degrade, persistent contacts/upgrades, and a separate reset layer. Some asset/territory carryover details remain unresolved; do not invent them. A stronger combat core plugs into the existing mission/meeting -> escalation or escape -> aftermath -> city loop. It does not turn every meeting into a fight or erase Jaska/Slomo/Arvo's roles.

## Current evidence and sequencing

**Shipped C.13 — art and interface:** the reference-led paper console, equipment cards, actual-figure portraits, practical night lighting, board framing and connected intent paths now wrap the C.12 outing. Read [the reproducible pass](C13_ART_AND_UI.md) and [release evidence](C13_RELEASE.json). A and the Godot port should carry the same information hierarchy and intent semantics. This is implemented presentation, not owner approval of final art; production fighter and physical-device gates remain open.


**Shipped C.12 — Night Shift:** a persistent generated crew and supplied support equipment now connect to rescue/extraction, announced rivals, wounds/missing colleagues, and repeat outings. Read [C.12](C12_NIGHT_SHIFT.md) and [release evidence](C12_RELEASE.json). Both A and C should reuse this crew/mission contract. It is a separate pilot; authored city/meeting dispatch is the next integration, not already completed. Final rigs, economics and full trait/career systems remain open.


Turf GDD and PRODUCTION_PIPELINE contain early milestone text that predates v36. Read VERSIONS and code/tests before declaring a feature missing. MST_PARITY records later lessons: momentum is damage **or** evasion, not both; universal sync was measured and cut; arrivals are announced and stage pressure instead of simply piling onto a roster. Its old API-key and sprite-status notes are historical, not current production state.

**Shipped C.11 laboratory:** Move + Act, stored intents/forecasts, legal movement and both cover classes, temporary weapon motion, optional action focus and warm/cool practical lighting. Rules, browser/touch layouts, camera and graphics recovery gates passed. C.11 low walls protect only across explicit edges, work from either side and require movement detours. Stand-ins crouch and rise to shoot; flanks remain exposed. Final character motion remains future work. See [C.11 pass](C11_COMBAT_PASS.md). The C.10 plan is retained alongside the implementation receipt.

After that, deepen board-changing mechanics (cover degradation, pushes/hazards, ammo and authored arrivals as appropriate), then a repeatable objective variation and crew/build consequences. Bosses and additional run-map screens come after turn depth. Do not restart the parked mass-sprite production line or commission new paid characters from this summary.

C acceptance: both action orders, previews leaving state/RNG unchanged, forecasts matching resolution, illegal path/LOS rejection, total threat warnings, interrupted animation/recovery applying damage once, 2/6/12 density and phone/tablet orientations. Physical Pixel 10 Pro and iPad M2 acceptance remains separate.

## Checked sources

- Supplied [six-page summary](../references/turf-summary.pdf), SHA256 `d18a38878fd2c354b7c677bb7f00d96eebc4ce9b7434c1b620528e76b68e1828`, 115,762 bytes. All six pages read and rendered. Same Git blob `a75e8e0b3c9cabed3ec2be7be4d6616fdd01d192` in both repositories.
- [Suds Jack PR #512](https://github.com/mbace1/Suds-Jack/pull/512) and [Piritori PR #71](https://github.com/mbace1/piritori-eden/pull/71): merged after checks, 2026-09-13.
- [Turf GDD](https://github.com/mbace1/Suds-Jack/blob/801c95a8702f7e77e618dbf7dd4c8bb17c19cd76/turf/GDD.md), [production pipeline](https://github.com/mbace1/Suds-Jack/blob/801c95a8702f7e77e618dbf7dd4c8bb17c19cd76/turf/PRODUCTION_PIPELINE.md), [MST parity and measured failures](https://github.com/mbace1/Suds-Jack/blob/801c95a8702f7e77e618dbf7dd4c8bb17c19cd76/turf/MST_PARITY.md).
- Piritori [GDD](../GAME_DESIGN_DOCUMENT.md) §§12–13 and chapter/persistence addenda; [DESIGN_AUTHORITY](../DESIGN_AUTHORITY.md), [PORTING](../PORTING.md), Art Bible and current asset manifest.

Active C implementation and C.10 plan: [art/meshy-approved-pilots-2026-09-11](https://github.com/mbace1/piritori-eden/tree/art/meshy-approved-pilots-2026-09-11), [C.10 plan](https://github.com/mbace1/piritori-eden/blob/art/meshy-approved-pilots-2026-09-11/design/C10_COMBAT_DIRECTION.md). Main carries this shared direction and the source PDF; that does not mean the whole stacked art/runtime branch has merged.
