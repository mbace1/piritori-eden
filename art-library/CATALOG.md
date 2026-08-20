# Art Library catalog

Visual and production rules are defined in the active
[Art Bible](../ART_BIBLE.md). Approval status is tracked in
[APPROVALS.md](APPROVALS.md) and machine-readable form in
[catalog.json](catalog.json).

Optimized prototype derivatives are registered separately in the
[v3 runtime manifest](../art/v3/manifest.json). Runtime code resolves those
stable ids and does not load review sheets directly.

## Approved active character system

- [Character manifest](characters/manifest.json)
- [Six cut-paper body-frame T-poses](characters/turnarounds/era1/base-body-frames-tpose-cut-v02.png)
- [Medium male/female optional 3D turnaround](characters/turnarounds/era1/base-medium-mf-turnaround-cut-v02.png)
- [Hand-ink personality heads](characters/modules/era1/head-personality-sheet-v03.png)
- [Personable Kallio cast heads](characters/modules/era1/head-kallio-diverse-sheet-v03.png)
- [Hand-ink upper clothing](characters/modules/era1/upper-clothing-handink-sheet-v03.png)
- [Hand-ink lower clothing](characters/modules/era1/lower-clothing-handink-sheet-v03.png)
- [Grip and holding poses](characters/system/grip-hold-personality-sheet-v03.png)
- [Subclass role tabs](characters/system/role-tabs-handink-v01.svg)

Individual transparent assets sit beside each review sheet.

## Approved equipment and animation

- [Weapon manifest](weapons/manifest.json)
- [Era I hand-ink handhelds](weapons/era1/handheld-handink-sheet-v03.png)
- [Animation manifest](animation/manifest.json)
- [Runner personality key poses](animation/characters/era1/runner-personality-sheet-v03.png)
- [Dog motion key poses](animation/animals/era1/dog-motion-handink-sheet-v03.png)
- [Tree and grass wind poses](animation/vegetation/era1/wind-motion-sheet-v01.png)

## Approved clean-cardstock variant

- [Heads](variants/approved-clean-cut-v02/head-sheet-v02.png)
- [Upper clothing](variants/approved-clean-cut-v02/upper-clothing-sheet-v02.png)
- [Lower clothing](variants/approved-clean-cut-v02/lower-clothing-sheet-v02.png)
- [Handhelds](variants/approved-clean-cut-v02/handheld-sheet-v02.png)
- [Dogs](variants/approved-clean-cut-v02/dog-motion-sheet-v02.png)
- [Grip poses](variants/approved-clean-cut-v02/grip-hold-sheet-v02.png)
- [Runner poses](variants/approved-clean-cut-v02/runner-pose-sheet-v02.png)

## Locations

- [Karhupuisto](locations/era1/location-karhupuisto-v01.png) — approved
- [Kallio courtyard v02](locations/era1/location-kallio-courtyard-v02.png) — semi-approved replacement candidate
- [Sörnäinen docks](locations/era1/location-sornainen-docks-v01.png) — semi-approved
- [Location layer map](locations/era1/layer-map.json)

## Semi-approved props

- [Kallio prop sheet](props/era1/kallio-props-sheet-v01.png)
- [Concrete barrier](props/era1/cover-concrete-barrier-v01.png)
- [Granite bollard](props/era1/street-granite-bollard-v01.png)
- [Green rubbish bin](props/era1/street-green-rubbish-bin-v01.png)
- [Bicycle rack](props/era1/street-bicycle-rack-v01.png)
- [Tram-stop panel](props/era1/street-tram-stop-panel-v01.png)
- [Park bench](props/era1/park-bench-v01.png)
- [Dock pallet and crate](props/era1/dock-pallet-crate-v01.png)
- [Abstract red-granite bear](props/era1/park-red-granite-bear-v01.png)

## UX and screen targets

- [3x3 formation grid](ui/battle/formation-grid-3x3.svg) — approved system baseline
- [Landscape command console](ui/battle/command-console-landscape.svg) — approved system baseline
- [Portrait command console](ui/battle/command-console-portrait.svg) — approved system baseline
- [Landscape alley battle](screens/battle-landscape-alley-v01.png) — semi-approved layout; replace plate
- [Portrait alley battle](screens/battle-portrait-alley-v01.png) — semi-approved mobile reflow; replace plate
- [Toko Slomo's Noodles v02](screens/instances/era1/toko-slomo-noodles-v02.png) — active approved fullscreen narrative prototype; corrected nested eye openings
- [Toko Slomo v02 implementation metadata](screens/instances/era1/toko-slomo-noodles-v02.json) — canvas, mask rule, events and responsive hit regions
- [Toko Slomo's Noodles v01](screens/instances/era1/toko-slomo-noodles-v01.png) — superseded approved prototype retained for provenance
- [Detail ceiling](references/battle-detail-ceiling-v01.png) — approved reference
- [Simplification floor](references/battle-simplification-floor-v01.png) — approved lower-bound reference

## Semi-approved weather

- [Weather manifest](weather/manifest.json)
- [Layer and stacking notes](weather/README.md)
- Back: cloud and fog
- Mid: fine rain and snow
- Front: near rain, near snow and gust debris
- Ground: wet sheen and puddle ripples

## Needs-rework archive

The rejected alley, fixed cast, rendered modular pass, rendered equipment and
older animal/character pose sheets are documented in
[archive/README.md](archive/README.md). They are preserved for comparison but
excluded from active manifests.

## System contracts

- [Modular character system](MODULAR_CHARACTER_SYSTEM.md)
- [Animation and environmental layers](ANIMATION_LAYER_CONTRACT.md)
- [Approval register](APPROVALS.md)
