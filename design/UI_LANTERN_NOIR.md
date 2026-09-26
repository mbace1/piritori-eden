# Lantern Noir — the city interface (Act I v4.56)

Owner, 2026-09-26: *"The UI is now really needing an update. There were some
variations that codex looked at but please let's take leaps in the art and
readability."*

## Source of the direction

The variations are the six C.16 stylized studies
(`design/concepts/c16-stylized`). The owner shortlisted **03 Lantern Noir**
first and **06 Ink After Dark** second (see `C16_ART_HANDOFF.md`). They were
painted for the Night Shift courtyard, and they are a preference among
options, not an approval (DESIGN_AUTHORITY). What carries over to an
interface is their lighting logic, not their pixels:

- a dark, quiet ground;
- warm light only where the eye should go;
- one cool accent for what is yours;
- large, plain type on the command strip.

ART_BIBLE §5 stays the authority. Paper and carton are still the interface.
The change is WHICH things are paper: the things you read and act on, and not
every structural box.

## What was wrong, measured (captures/ui-before, v4.55)

| | before | after |
|---|---|---|
| text under 12px | 329 of 1070 (31%) | 0 |
| monospace text | 699 (65%) | 4 (dialogue only) |
| mean text size | 14.6px | 16.2px |

By eye:

- **Four font voices, no system.** The display face was Impact, which most
  machines lack, so it fell back to a thin sans. Narration was Georgia, labels
  a system mono.
- **The same torn frame on every panel**, on the same navy, so nothing led.
- **LOOK hotspots, which are interactive,** were purple mono inside ornate
  borders: the least readable thing on screen.
- **Cyan was spent on every eyebrow label,** so it no longer meant "you".
- **Other faults:** ledger headings huge and thin while prices were tiny;
  news sources as unstyled default links; fighter labels at 7–9px.

## The system (`web/lantern.css`)

**Type** (ART_BIBLE §5.1, OFL, `web/fonts/`):

| role | face | use |
|---|---|---|
| display condensed | Barlow Condensed 600/700 | titles, places, round |
| municipal grotesk | Barlow 400–700, tabular numerals | labels, prices, body, buttons |
| ledger mono | IBM Plex Mono 400/500 | dialogue, quotes, observations, battle log |

**Chrome** (§5.3):

- Panels are dark structural backing with a hairline edge.
- Paper faces are kept for choices, the day slip and tags.
- Primary buttons are lit: a lantern-amber face with dark text.

**Colour:**

- amber (`--lantern`) is the way forward: the lead and the primary action;
- cyan is you: presence, your journey and focus;
- magenta stays hidden trade;
- violet marks LOOK.

## Gates

- `web/test/readability.cjs` (50 checks) covers eight screens on desktop and
  phone: splash, map, journey preview, encounter, choices, ledger, news and
  battle.
  - It enforces a 12px floor, and mono only inside the ledger voice.
  - It requires WCAG AA against the **real pixels** behind each text,
    measured from a second shot with every glyph made transparent.
  - `READABILITY_QUERY=?look=classic` is the control; it fails 37 checks.
- `web/test/header-fit.cjs` (48) also checks that a landscape phone reaches its
  command bar.

## Comparing

Add `?look=classic` to the URL to see v4.55's interface on the same build. It
is never stored, so a comparison cannot stick. `captures/` in the Suds-Jack
session holds the before/after sheet and videos. They are not committed,
because they are review material, not source.

## Open

- Owner and device acceptance.
- The Godot port of the same moves (VERSIONS v4.56 Port block).
- 06 Ink After Dark, the owner's second pick, is not built. If wanted, it is
  a token swap in this one file: plaster-warm panels, heavier ink edges and a
  darker ground.
