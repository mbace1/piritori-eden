# Toko Slomo, paper rig v01

**Owner-approved, 2026-10-21.** Owner, on the review reel: *"Loops review is good but could be slightly more
animated"*, then, on v2: *"Approved, put it in the game"*. Asked where (the game had moved to a 3D Toko in the empty
bar since the 2026-08-24 ruling), the owner chose this paper Toko placed in the empty bar, in place of the 3D speaker.

## What it is

The approved v02 screen (`art-library/screens/instances/era1/toko-slomo-noodles-v02.png`) with Toko cut out of it
into pieces that move on hidden pivots (ART_BIBLE §14.2):

| piece | pivot | moves |
|---|---|---|
| torso | the waist, on the counter's back edge | breath, lean over the counter |
| head (hood + hair) | the neck | tilt, nod, bow, look to the window |
| brows | own centre | raise, knit (over a cleaned patch of hood) |
| eyelids | n/a | a blink: hood-yellow card over the eye openings |
| fore_r: cloth, fist, forearm | right elbow | drying, set down, three waves |
| hand_l: sleeve and hand | left elbow | lift, push, tap |
| note | its centre | slid across the counter to you |
| counter | n/a | the counter in front of his waist, cut from the EMPTY BAR so it matches the room |

The pieces are drawn over `scene-toko-noodles-empty-v01`. That room is v02's own camera with nobody in it, and its
counter line falls within a pixel of v02's. So the room behind him is painted, not filled, and anything his pieces
uncover when they move is real room. Steam, rain, the street lamp and the tram's headlights are additive passes (STAGE_SPEC tier 0).

## How it was made

The pieces were cut in Suds-Jack (`piritori/explorations/toko-loops/`) and scaled from 1672×941 to the empty bar's
1536×864:
- `tools/seg.py`: a GrabCut seeded by hand polygons.
- `tools/layers.py`: the split into pieces, the brow patch and the shaded fills.

Review renders, the concept sheet and the original player are in that folder (`renders/`), along with the
clip timings this runtime reproduces. Nothing was generated: every pixel of Toko is the approved painting.
