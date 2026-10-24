# Night Shift places: the level pass

Owner, 2026-10-24, on the courtyard: *"The level looks broken"*, then *"Lots of
layers to fix here. Plan it out, then execute. Level art is bad sometimes. Walls
don't connect right etc"*, then *"Find easy ways to get further in development,
if something works, duplicate"*.

This is the plan. Each layer ships to the hub and is rendered before the next.

## What there is (measured, 2026-10-24)

- **Three sets.**
  - The courtyard and the yard: `crew-run/locations.js`, Blender kit v02 motifs placed by hand.
  - The park: `bear-path/park.js`, boxes built in code.
- **Eleven Act I places.** Two courtyards, two yards, two parks, four streets and one quay. Street and quay fall back to the courtyard, so **7 of 11 fights are fought in the courtyard**.
- **The kit, measured in the browser.**
  - `facade_bay` is 3.12 × 6.44 × 1.03 m: a slab, with no roof, no back and no ends.
  - `archway` is 3.28 m wide; `service_bay` is 4.0 × 4.4 × 2.09 m.
  - Every material is double-sided.
- **The camera fits the board, not the set.**
  - A 1280×800 desktop shows about 27 m across; a phone shows about 22 m front to back.
  - Rotate adds 45°, and dragging rotates freely.

## What is wrong (eight-angle audit, `desk-*-r0..r7`)

| | Fault | Where |
|---|---|---|
| 1 | **Joins.** The archway's neighbours sit at ±4.6 for a 3.28 m archway, leaving a 1.4 m hole on each side. The left wing stops 0.93 m short of the back wall. v4.75's wing has a 0.6 m notch at its corner and runs into the back wall. | courtyard |
| 2 | **Slabs, not buildings.** Seen edge-on or from the side, a wall is a card. From behind it is the inside of a façade with lit windows. Over the cornice there is void. | courtyard, yard |
| 3 | **Ends in the air.** Fixed in v4.75 for the default view only. | courtyard |
| 4 | **Props inside walls.** A planter runs 0.4 m into the left wing, and one stands in the back wall at the jog. | courtyard |
| 5 | **The wrong side of the set.** Rotating past about ±70° puts the back of the set between the camera and the board. The x-ray discs then do the work. | all |
| 6 | **No street and no quay.** Four street fights and the quay fight are staged in a courtyard. | campaign |

## What works, and gets duplicated

- **The park's buildings** (`park.js`, "municipal street beyond the park"): each block is a box volume with a front, a cornice and a roof. They read as buildings from any angle. **Duplicate:** a building mass behind every kit façade run.
- **The yard's sheds:** one module at its exact width, end to end, so they join by construction. **Duplicate:** every run is placed at the motif's measured width, never at a typed coordinate.
- **The park's street strip:** road, rails, a tram and a row of blocks. **Duplicate:** a real **street** set, which takes four fights off the courtyard.
- **The yard's sheds plus a quay edge:** the **quay** set (one fight).

## Layers, in order

1. **Runs (joins by construction).** A wall is a run: an origin, a direction and the modules it holds. Each module is placed at its measured width.
   - Corners are where two runs meet face to back. An outside corner gets a stone pier.
   - The archway's neighbours sit at 1.64 + 1.5 m.
2. **Masses (slabs become buildings).** Every run gets the building behind it, after the park's blocks:
   - a plaster box from the slab's back, depth about 8 m, to cornice height;
   - a zinc roof and chimneys;
   - the archway's passage left open under a bridge.
   A run's end becomes a gable.
3. **Coverage.** Runs and masses carry past the widest frame at Tactical and Oblique, worked out from `fitBattleCamera`.
4. **Props clear.** Nothing stands inside a wall or another prop. Lamps touch their wall.
5. **The cutaway**, built instead of a camera limit. A camera limit would have taken away a control the gates and players use.
   - Each run is its own group, with its building, balconies, lamps and chimneys.
   - A run whose face turns away from the camera is hidden, the way tactics games lift the near walls.
   - The presets and free rotation are unchanged.
6. **Street set**, duplicated from the park's street (next release).
7. **Quay set** (after the street).
8. **A layout gate** (bare node, `level-layout.mjs`). It checks that:
   - every run is continuous;
   - every corner is closed;
   - no module stands outside a run;
   - props are clear;
   - the runs cover the frames.
   The audit renderer stays as a tool: an art change ends in a picture, not a green suite.

Layers 1–5 are v4.76 (courtyard and yard). The street is v4.77, then the quay. The park is audited too: whatever it needs joins whichever release finds it.

## Not in this pass

- A new Blender kit. There is no Blender in this environment. Corners, masses and roofs are built in code from the kit's own materials, the way the park already is.
- Character art.
- Lighting retunes.

## Status

- **v4.76:** layers 1, 2, 4, 5 and 8 for the courtyard and the yard. The courtyard is rebuilt as four runs. `level-layout.mjs` passes 507 checks, and it fails on the old free-standing bay, a wing pulled off its corner, and a back wall that stops short. Renders: the eight-angle audit, three presets at 1280 and 1920 wide.
- **Layer 3 (coverage)** holds at the default and Oblique presets on 1280 and 1920 frames, checked by render. It is not computed by the gate yet.
- **Next:** layer 6, the street set duplicated from the park's street. Then layer 7, the quay.
