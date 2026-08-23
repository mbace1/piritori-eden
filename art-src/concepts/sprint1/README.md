# Sprint 1 concepts — the three body profiles the library does not have

Status: **UNAPPROVED CONCEPT MATERIAL.** Nothing here is registered in
`art-library/`, nothing is in `APPROVALS.md`, and nothing here is Meshy input
yet. `DESIGN_AUTHORITY.md` puts approval with the owner; this directory is
material for that decision and nothing more.

Generated 2026-08-20 with base `gemini-2.5-flash-image`, one subject per image,
using Blocks A/B/C and the palette block from `art-src/NANO_BANANA.md` §3-4
verbatim, with `art-library/characters/turnarounds/era1/base-medium-mf-turnaround-cut-v02.png`
attached as the style reference. The exact prompt for every image is in
`prompts/`.

## Why these three

`MESHY_PROMPT_GUIDE.md` §2 names four body profiles. The library has the
standard male (the `base-medium-mf` turnaround, which is also Sprint 1's
"Photo 1"). It has no broad body, no older body and no dog, so those are what
is here — three views each, front / side / back, as `MESHY_PROMPT_GUIDE.md` §1
asks for.

**Two of them are formally blocked for production.** `ART_SPRINT_1.md` blocks
steps 5+ — broad body, clothing swap, heads, outerwear, equipment — until step 4
locks the shared contracts, and gives the reason: variation added before the
contracts settle has to be re-rigged. These are concepts to approve or redirect,
not work to hand to Meshy. The dog is not named in that block.

## What passes

All nine key cleanly. The background is never the `#FF00FF` that was asked for
— it lands between `#d63a82` and `#e411e6` — but `cut.mjs`'s hue-ratio test eats
all of it, which is exactly the drift its corner-vote comment was written for.
Checked at the top corners and both flanks at 40% height, never the bottom
corners: §4 asks for the swatch strip on every prompt and the strip is
cream-backed, so it owns the bottom two corners. Sampling them reported four
good images as failures on a feature the pipeline requires.

## What does NOT pass, per `MESHY_PROMPT_GUIDE.md` §1

1. **Body scale does not match across views, on any of the three subjects.**
   The checklist wants eye, shoulder, hip, knee and ground lines within ±2px
   across front, side and back. `broad-front` fills far more of its frame than
   `broad-side`; `older-front` is drawn much smaller than `older-side`. This is
   not a prompting mistake — see the contradiction below.
2. **`broad-side` and `older-side` are not in the T-pose.** Both drop the arms
   instead of holding the T from the side. The guide requires one pose across
   all views.
3. **`older-side` has a horizontal black rule drawn through the arm** — the
   model rendered the instruction "arms level with the ground" as an actual
   drawn line.
4. **`older-front` is a reject**: different, more saturated magenta, the swatch
   strip pulled into the picture, a black band across the bottom third, and a
   figure at a different scale from its own side and back views. Four attempts
   produced four variants of the same failure.
5. **Ground contact marks under the feet** on `broad-side` and `older-side`.
   §1 says remove cast shadows, keep the foot contact.
6. **The dog is off-style.** It is the best-looking image here and the furthest
   from the Art Bible: soft gradient shading over the coat, airbrushed volume,
   drawn fur. Rule 1 of §1 is shape before line and §3.1 is flat cut paper —
   "no gradients" is explicit. It should be re-run flatter before it is judged
   on anything else.

## The contradiction worth an owner decision

`NANO_BANANA.md` Block C says, in bold, **do not ask for a turnaround** — every
sheet delivered so far has been a board and a board cannot be cut. That rule is
right for props and scenes and it is *wrong for turnarounds*, because
`MESHY_PROMPT_GUIDE.md` §1 requires cross-view alignment to ±2px and **separate
generations cannot hold a common scale**. Nine images here demonstrate it.

The repo already contains the counter-example: `base-medium-mf-turnaround-cut-v02.png`
is a board, on clean flat magenta, with eight figures at one consistent scale,
and it is the approved base body. One image is what guarantees one scale.

So the resolution is probably: Block C keeps its ban on *presentation* boards —
panels, captions, drop shadows, mounted cards — and turnarounds are exempted on
the condition that the background stays flat magenta edge to edge and the views
are laid out plainly with nothing between them. That is a change to
`NANO_BANANA.md` and therefore the owner's call, not this directory's.
