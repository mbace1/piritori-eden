# Sheets — one line per delivered image

Fill a row when a file lands in `approved/`. `check` column is the verdict from
`node kindling/tools/cut.mjs check`, not an opinion. **`NANO_BANANA.md` is how
to make the next one**; this is the record of what exists.

Two tables. The first is what has been delivered as reference. The second is
the shipping list — one line per file in `approved/`, and for anything in
`weapons/` or `cast/` it carries the anchor coordinates, without which nothing
composites (`NANO_BANANA.md` §5.2).

| id | file | kind | cell | contents | check |
|---|---|---|---|---|---|
| A | — | screen mockup | — | map, portrait — HUD, 2 routes, 4 pins, bottom nav | n/a |
| B | — | screen mockup | — | map, landscape, Finnish | n/a |
| C | — | screen mockup | — | fight, landscape — KIERROS 2 | n/a |
| D | — | screen mockup | — | fight, portrait | n/a |
| E | — | screen mockup | — | fight, landscape, alt crew | n/a |
| F | — | background | — | harbour at night | |
| G | — | background | — | courtyard with arch | |
| H | — | background | — | park square, gazebo (Karhupuisto) | |
| I | — | background | — | tenement courtyard | |
| J | — | sheet | 4×2 | props: barrier, bollard, bin, bike rack, board, bench, pallet, bear | |
| K | — | sheet | 4×2 | base bodies, T-pose, M/F × front/side/back/side | |
| L | — | sheet | 3×2 | body types, thin/medium/heavy × M/F | |
| M | — | sheet | 3×2 | trousers + footwear | |
| N | — | sheet | 4×2 | action poses — carry JOINT MARKERS at shoulder/elbow/knee, which are rig points, not decoration | |
| O | — | sheet | 4×2 | dogs: shiba, rottweiler | |
| P | — | sheet | 4×2 | trees and bushes, wind frames | |

| Q | — | sheet | — | second batch: flatter paper-cutout figures, joint markers | |
| R | — | sheet | — | second batch: weapon items with cyan grip / orange fore-grip dots | |

**Screen mockups are reference, not assets** — they define layout and are
implemented in code, never loaded.

---

## The shipping list

Nothing here yet. Format, per `NANO_BANANA.md` §8:

```
props/barrier-whole.png  128x128  hard cover, 14hp  ·  gen 2026-08-19 flash  ·  §6.5
weapons/rifle.png         64x64   grip 22,41  fore 39,36  ·  gen 2026-08-19 flash  ·  §6.7
cast/aatami-stand-near.png 128x192  joints sh 41,58 / el 33,78 / kn 47,132  ·  §6.6
```

| file | fit | anchors / notes | check |
|---|---|---|---|
| — | | | |

## Cast — whole-figure pose sets (2026-08-21)

Generated with `gen-pose-set.sh <role>`: approved runner poses as style anchor,
the role's own approved torso and legs as clothing reference, NANO_BANANA.md
§2 magenta rule and §3 block C, then cut.mjs key -> trim -> fit -> web.

No anchor coordinates: §6.6's cyan joint dots are deliberately not requested.
The model draws them as glowing orbs rather than flat dots, cut.mjs then erases
only their cores, and widening the key eats teal clothing. Whole-figure 2D
sprites are composited at the feet, not rigged, so they need no joints.

NOT REGISTERED in art/v3/manifest.json — that is the owner's approval step.

cast/runner-*.webp  3 poses  362x543  77 KB total  ·  gen 2026-08-21 flash  ·  §6.6
    strike downed shaken
cast/muscle-*.webp  9 poses  362x543  249 KB total  ·  gen 2026-08-21 flash  ·  §6.6
    idle-smile talk guard strike hit-light downed shaken walk-contact walk-pass
cast/watcher-*.webp  9 poses  362x543  181 KB total  ·  gen 2026-08-21 flash  ·  §6.6
    idle-smile talk guard strike hit-light downed shaken walk-contact walk-pass
cast/fixer-*.webp  9 poses  362x543  229 KB total  ·  gen 2026-08-21 flash  ·  §6.6
    idle-smile talk guard strike hit-light downed shaken walk-contact walk-pass
cast/driver-*.webp  9 poses  362x543  209 KB total  ·  gen 2026-08-21 flash  ·  §6.6
    idle-smile talk guard strike hit-light downed shaken walk-contact walk-pass
cast/local-*.webp  9 poses  362x543  241 KB total  ·  gen 2026-08-21 flash  ·  §6.6
    idle-smile talk guard strike hit-light downed shaken walk-contact walk-pass

## Arvo Linde — the §13.2 3D exception (2026-08-21)

The one 3D asset in the game. ART_BIBLE §13.2 permits a Meshy workflow for the
presenter alone, because recurring speech needs lip sync and small gestures.

Concept lineage, work/arvo/:
  v1  arvo-concept-onair.png   first pass — silver, severe, navy suit
  v2  arvo-concept-v2.png      pushed to the era signature; too austere
  v3  arvo-concept-v3.png      warm and genial, camel jacket, gold frames
  v4  arvo-concept-v4.png      brows and frames made pronounced
  v5  arvo-concept-v5.png      APPROVED — flat skin tones, hard edges
      arvo-tpose-v5.png        rigging pose, volumetric build
      arvo-rigged.glb          Meshy image-to-3D + auto-rig, 24 bones

The v4 -> v5 step is the one worth remembering. v4 read well at full size but
BLOTCHED when posterised, and it was not dithering — it persisted with dither
off. Soft tonal gradation in the source is what breaks under quantisation.
v5 has MORE facial definition than v3 and posterises cleanly, because its
surfaces are flat areas with hard edges and its features are lines and solid
shapes rather than shading. Tested down to eight colours; it holds.

LIKENESS: a fictional composite. §13.2 requires 'a fictional homage, not a
photoreal likeness of Arvi Lind'. Wardrobe, colouring and demeanour follow the
owner's reference; the face does not.

NOT REGISTERED in art/v3/manifest.json — the owner's approval step.

