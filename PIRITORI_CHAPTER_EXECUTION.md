# Free-roaming chapters: owner direction and execution plan

Status: active implementation plan, 2026-09-11. This records direct owner direction after the September 10 scope. It does not declare an integrated C campaign or lift the Era II production gate.

## Owner direction

- The main map is mostly free to roam and pursue missions until chapter-ending events lock in.
- Combat frequency grows as the campaign develops and personnel change. Defensive stance and escape offer avoidance or withdrawal; some fights must be fought. This supersedes treating combat as uniformly rare or uniformly compulsory.
- Run-shaped chapters and boss-gated unlocks are a proposed progression direction. The current authored shipment operation remains an operation; do not silently turn it into a boss fight.
- Option B follows a separate StS-style map track. It is currently a standalone experiment; later integration or a wholly standalone product remains possible.
- Read the GDD and supporting documents first. Ask three numbered questions only when a material gap remains.
- Pixel 10 Pro and iPad M2 are the physical test devices. Reuse Piritori art and themes; Meshy availability is not a reason to duplicate existing assets.

These instructions supersede the older map-track assumptions and blanket combat-frequency statements in PHASING.md, the GDD and the September 10 scope where they conflict. Narrative protections and the JS-primary/Godot-port relationship remain.

## Findings from current main

The existing state model already stores crew, equipment, growth, chapter progress and authored consequences. The first chapter is chapter-1-piritori: EUR 400 income unlocks the shipment at sornainen_harbour, with a separate EUR 400 stake. Only one chapter is authored. Its ending resolves an operation, not a battle.

Ordinary ledger sales and route deliveries add cash but omit chapter income. Equipment resale counts. This makes the main trade loop fail to contribute to the advertised objective.

advanceSchedule selects the next scheduled anchor and encounter. A fully free-roaming mission director is therefore not established by the current seven-day playthrough. Preserve the authored story spine while separating opportunity selection from time advancement.

attemptChapterEnding settles immediately once its existing button is used. There is no explicit persisted finale phase or implemented next-chapter transition in the inspected browser state.

## Execution order

1. **Trade contributes to the chapter.** Count successful ledger-sale and route-delivery receipts exactly once, matching existing equipment-resale income semantics. Purchases and failures do not count. Crossing the threshold offers the ending; it does not finish the chapter. Regression tests must fail before the fix and pass afterward.
2. **Make current consequences legible.** Audit the live chapter panel, available ending and settlement through the actual interface. Show the actual state changes and next available action; do not add a second economy.
3. **Separate free roam from the story clock.** Keep authored events and deadlines, but make currently available missions selectable by place and prerequisites. Advancing time must not silently move the player. Provide a migration path for existing saves and a complete start-to-ending regression.
4. **Persist the finale commitment.** Distinguish available, committed and resolved. Forecast the cost and temporary travel restrictions before commitment. Save/reload must resume the committed activity; duplicate results cannot charge twice. Mandatory fights and escape conditions come from authored encounter data, not a universal stance shortcut.
5. **Add chapter unlocks only with authored content.** Boss victory may unlock the next chapter where specified. Operation success follows its own authored rules. No empty next chapter, invented boss, automatic Era II opening or unreviewed reset of money/crew/gear. Implement carry-over from documented persistence rules and explicit next-chapter data.
6. **Adapt a proven C resolver later.** Version the request/result boundary and preserve campaign ownership of consequences. C's present trainer battle is a separate rendering/input baseline, not rules parity. Test one existing character and one encounter before growing the asset set.
7. **Evaluate Option B separately.** Its branching route can later call a shared resolver, but does not dictate main-campaign navigation.

## Current milestone

Step 1 implemented and model-tested locally. Tests cover an authored 14-block ending, existing growth, market sale and route receipt accounting, purchase/failed-action exclusions, threshold availability without automatic completion, and save/load persistence.

Source review and CI precede deployment. A source test is not a physical-device playtest or evidence that the broader free-roam chapter system is complete.

## Godot handoff

Mirror receipt accounting at the successful market-sale and delivery mutation points. Use the same gross received amount as the browser; do not count spending, net-margin estimates or failed commands. Existing resale behavior defines the semantics. Port vectors should include below-threshold, threshold-crossing, rejected-sale, rejected-delivery and reload cases.
