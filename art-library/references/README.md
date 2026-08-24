# Reference set — the owner's art direction, 2026-08-24

These are **references and targets, not shipping assets.** Nothing here is
registered in `catalog.json`, nothing is in `APPROVALS.md`, and nothing here is
Meshy input. `DESIGN_AUTHORITY.md` puts approval with the owner.

Delivered as 34 MB of PNG; stored as ~8 MB of JPEG with the long edge capped at
2048. References are for reading, not for cutting — the originals are the
authority if any of this is ever traced.

---

## What this set settles

**The style question has an answer, and it is "two registers, split by layer".**

`ART_BIBLE.md` §1 rule 2 says *one material family — map, locations, battles,
characters, animals, weapons, props and UI all use cut paper and hand marker.*
The references do not do that, and the way they diverge is consistent enough to
be a decision rather than a drift:

| register | used for | look |
|---|---|---|
| **cut paper** | heads, weapons, props, UI chrome, the Toko interior | kraft card, torn edges, flat fills, visible paper grain |
| **painted night** | fight stages and city backdrops | rendered, lit, atmospheric, not cut from anything |

The split tracks §1 rule 5 — *every useful layer stays separable*. **What is cut
out is cut paper; what is never cut is painted.** That is coherent, and it is
still a change to rule 2, which is the owner's to make. Recorded in
`ART_BIBLE.md` §7.5 rather than assumed here.

---

## `cutouts/` — magenta-key sheets

Production-shaped material: flat `#FF00FF` field, subject clear of the edges.

| file | holds |
|---|---|
| `props-street-magenta-v01.jpg` | barrier, granite bollard, litter bin, bicycle in a rack, noticeboard, bench, crate on pallets, **the Karhupuisto bear** |
| `heads-set-a-magenta-v01.jpg` | 8 heads, three-quarter, kraft-card construction |
| `heads-set-b-magenta-v01.jpg` | 12 heads, visibly wider range of age, gender and background |
| `weapons-magenta-v01.jpg` | period phone, baton, pipe, pistol, bat, plank, shotgun, rifle |
| `toko-mask-v01.jpg` | Toko Slomo's mask, isolated |

**The bear is not a generic prop.** `REFERENCE_NOTES.md` records Karhupuisto as
named for Jussi Mäntynen's *Bear on the Anthill*, and specifies an abstract
red-granite bear rather than a reproduction. That is what this is.

### Two things measured rather than assumed

**1. The key colour drifts, on every sheet.** Measured on the delivered PNGs,
before any conversion here:

| sheet | background | dE from `#FF00FF` |
|---|---|---|
| props | `(247, 3, 247)` | 3.4 |
| weapons | `(243, 4, 242)` | 5.5 |
| heads A | `(240, 4, 238)` | 7.1 |
| heads B | `(226, 2, 226)` | **12.2** |

No sheet is bit-exact, and the exact value covers 1.7–16.7% of its image. This
is the same finding the Sprint 1 v2 dog turned up, from a different generator, so
it is a property of the pipeline rather than of one prompt.

**Anything downstream must key on tolerance, never on equality.** A cutter
written against `== #FF00FF` returns almost nothing here. Heads B is far enough
off to be worth regenerating if these become production input.

**2. `toko-mask-v01.jpg` has no alpha.** It arrived looking like a transparent
PNG and is not — the transparency checkerboard is **painted into the pixels**.
Corner samples read `(241,241,241)`, `(254,254,254)`. Cutting from it yields a
checkerboard. It needs a real key or a real alpha before use.

---

## `stages/` — fight grounds

Two families. Both hold **an empty middle**, which is what
`SCREEN_AND_COMBAT_BASELINE.md` and the arena prompts ask for: the props are at
the rim, the floor is clear, and the stage is a stage.

**Painted night, in the target register:**
`stage-kallio-kulma-yard-night-v01.jpg` · `stage-harju-sports-yard-night-v01.jpg`
· `stage-kallio-docks-night-v01.jpg` · `stage-sornainen-docks-wide-night-v01.jpg`
· `stage-park-gazebo-night-v01.jpg`

Practical light does all the work — sodium lamps, lit windows, wet stone
throwing it back. This is `ART_BIBLE.md` §6.2 built.

**3D dioramas on a square base, a different register again:**
`stage-skatepark-underbridge-a/b` · `stage-park-day` · `stage-park-night` ·
`stage-quay` · `stage-sornainen-metro` · `stage-brick-yard`

Photoreal, grey studio background, visible plinth. `stage-park-day` and
`stage-park-night` are **the same asset under two lightings** — which is the
day/night question already answered in miniature, and worth looking at before
anyone builds a daytime palette.

---

## `ui/` — mode targets

| file | mode |
|---|---|
| `ui-target-city-map-v01.jpg` | city map, portrait |
| `ui-target-city-map-landscape-v01.jpg` | city map, landscape |
| `ui-target-battle-portrait-v01.jpg` | battle, portrait |
| `ui-target-battle-landscape-v01.jpg` | battle, landscape |
| `ui-target-location-toko-v01.jpg` | location encounter — Toko Slomo's Noodles |

**Both orientations exist for both modes**, which is what `UX_SPEC.md` §2 asks
for and what the five-mode wireframes only sketched.

**The UI is in Finnish.** `PÄIVÄ 04`, `KIERROS 2`. The locale is not a
post-process — it is in the target.

Battle reads: cyan tiles are yours, red tiles are theirs, `BACK / MIDDLE /
FRONT` rails on both flanks, dashed red lines for declared threat, and the
selected fighter's `GUARD` and `NERVE` as segment bars rather than numbers.

---

## `bodies/` — full-figure T-poses

`body-broad-dreadlocks-tpose-v01.jpg` · `body-thin-tracksuit-tpose-v01.jpg` ·
`body-heavy-older-tpose-v01.jpg`

Ink line over flat fills, neutral grey ground, **a real T-pose** — arms
horizontal, which is what Sprint 1 defect 2 recorded as dropped. Three clearly
different builds.

**Not on magenta.** These are style references, not cut-ready.

**One thing to resolve before these become production:**
`body-thin-tracksuit` carries **Adidas trefoil and three stripes**. Period-true
for 2003 Kallio and a real trademark. `ART_BIBLE.md` §9.3 asks for Finnish and
Kallio specificity; it does not authorise a live mark. Needs either a decision or
a redraw into a generic three-stripe.

---

## `photos/` — ground truth

`photo-hakaniemi-square-night.jpg` · `photo-hakaniemi-square-day.jpg` ·
`photo-sornainen-square-night.jpg`

Real squares, two of them the same place under different light. These anchor
geography and lamp behaviour; they are not a style target.

---

## `locations/` — illustrated isometric

`kattilahalli-suvilahti-iso-v01.jpg` — Suvilahti's boiler hall and gasometer.
`kallio-kulma-night-iso-v01.jpg` — a Kallio corner at night.

Ink line with muted fills, more drawn than the painted stages and more detailed
than the cut-paper register. A third position between the two, and the one this
set is least decided about.
