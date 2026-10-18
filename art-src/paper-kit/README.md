# Paper kit — AD1, the material test sheet

**Decided 2026-10-17. Owner: "A, restrained."** Treatment A (clean scissor
and knife cuts, almost no marker, faint grain) is the house treatment for
the non-battle cut-paper register. It is `HOUSE` in `web/js/v3/paper-kit.js`;
B and C stay in `TREATMENTS` only as the record of what was shown.

Step AD1 of `design/ART_DIRECTION_NON_BATTLE.md` (the non-battle art overhaul
plan, PR #102). It draws the **cut-paper register** of `ART_BIBLE.md` in code,
so the owner can choose paper, edge and marker before any screen is touched.

The technique (cards as cached canvases, one shadow per card that falls away
from a single practical light) is borrowed from the Radio Free papercut films.
**The look is this repo's**: Art Bible paper families, edge vocabulary, marker
rules and Era I palette tokens. No shadowbox frame, no Radio Free palette, no
masks. No dependencies.

## The boards

Rendered to `design/art-direction/` at 1000 px wide, labels at 28 px or more:

| Board | Shows | Art Bible |
|---|---|---|
| `ad1-1-paper-families.jpg` | the six papers and the job each one does | §3.1 paper families |
| `ad1-2-edges.jpg` | scissor, blunt knife, torn fibre, corrugated break, folded corner | §3.2 edge vocabulary |
| `ad1-3-marker.jpg` | wobble, taper, skip, dry out, overshoot; the same box in three hands | §3.4 marker and ink |
| `ad1-4-pick-a-b-c.jpg` | **the pick**: the conversation band in three treatments, in front of the painted plate | §1 rule 2 (two registers), §3.5 texture order |

Board 4 uses the registered empty-bar plate
`art/v3/scenes/toko-slomo-noodles-empty-v01.webp` (semi-approved,
prototype-only) as the painted register, because `STAGE_SPEC.md` §6 (the
counter, "the goal reference for conversations that don't happen on a fight
area", owner 2026-08-24) already settled that the counter is a painted plate
with Toko as a 3D layer. Toko is a stand-in until proven (2026-10-02), so he
is absent here. The band's copy and choices are the approved v02 screen's.

## Run it

```bash
node art-src/paper-kit/capture.cjs     # writes the four JPEGs
```

Or open `art-src/paper-kit/ad1-boards.html` through any static server from the
repo root (it needs `web/fonts/` and `art/v3/`).

## Files

- `web/js/v3/paper-kit.js` (moved there in AD2 so the game ships it): palette
  tokens, seeded RNG, edges, paper fills, cards with cached shadows, the light,
  marker strokes and the treatments.
- `ad1-boards.html`: the four boards.
- `capture.cjs`: renders them with Playwright, as `web/test/*-browser.cjs` do.

## What was corrected while looking at the boards

- The first paper mottling (large soft blotches) read before the card's shape,
  which breaks §3.5's texture order. It became a coarse noise field at about
  four percent.
- Scissor and knife were indistinguishable at phone size. Scissor is now a soft
  curve with a step at each snip; knife is a dead-straight run, slightly off
  square, with one hard kink and a crushed line.
- Corrugated read as a postage stamp. It is now one broken side showing the
  liner, flute and liner section.
- In treatment C, dark marker vanished on dark card. Marker on dark card uses
  light ink.
