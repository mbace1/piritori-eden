# UX concepts, 2026-08-23

Three phone-shaped mockups made against the owner's reference layout. **Concepts,
not runtime art** — nothing here is in `art/v3/manifest.json` and nothing is
drawn by the game. They exist to settle how the screens should look now that the
sizing work is done and the *look* has not moved.

## What they establish

| | |
|---|---|
| `crew-screen-a.png` | Torn-paper cards on charcoal, one per person; the expanded card carries the choice buttons |
| `map-medallions-a.png` | Site pins as **icon medallions with hanging label plates**, coloured dashed routes with arrowheads, a corner legend |
| `battle-telegraph-a.png` | Isometric board, side panel of per-enemy reads, shot-caller inset, four large action buttons |

## What is directly usable

- **The medallion pin.** A flat colour disc, a thick cream ring, a simple white
  pictogram, and a cream plate hanging below with a notch. This is the highest-
  impact visual change outstanding and it needs **no credits** — the pictograms
  are simple enough for `PiritoriIcon` to draw as vectors, and there are about
  six of them rather than one per anchor role.
- **The corner legend** matches what is already built.
- **Torn-paper cards** for crew, which the rail can do with a StyleBox and a
  grain texture.
- **The battle side-panel**, which is close to how telegraphs already read: name,
  a quiet line, then a coloured line whose colour is the risk band.

## What is WRONG in them, and must not be copied

- **Titles and copy are invented.** "HELSINKI 2003: COLD CASE KALLIO" is not the
  title. The Finnish on the crew screen is plausible but unauthored.
- **`ELIMINATE`, with a skull.** Directly against the game: `COMBAT.md` §1
  promises triage rather than a damage race, and `NARRATIVE.md` holds that people
  are never scenery. The verb set in the third image — PUNCH / GUARD / MOVE /
  LOOK — is much closer to correct.
- **`SURVEIL / MOVE / DEAL / ELIMINATE`** is not our command bar. Ours is ROUTE,
  CREW, MISSIONS, NEWS, END DAY.
- **VOIMA / TAITO** as the two stats. There are five perks — strength, speed,
  wits, nerve, toughness — and two bars would misrepresent them.
- **Palette runs hot.** The amber and the reds are more saturated than
  `ART_BIBLE`'s night palette. Take the composition, not the saturation.
- **Figures are generic silhouettes.** The cast has twelve aptitudes and a look
  family per class; these are placeholders.

## The open question they surface

The map concept reads as **sites** (noodle bar, drop point, safe house, docks)
where the game's map is built on **anchors** (districts) with sites hanging off
them. The concept is more legible than the current map, and adopting it means
deciding whether the pin is the district or the place — which is a design
decision rather than an art one.
