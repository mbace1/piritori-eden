# 3D production concepts — awaiting selection

Twelve alternatives, two per role, generated 2026-08-22 against each role's
existing 2D cast sheet so the style holds. `sheet-<role>.png` puts the current
design (**A**) beside the two alternatives (**B**, **C**) at matched height, so
the choice is like-for-like.

**These are CONCEPTS, not runtime art.** Nothing here is in
`art/v3/manifest.json` and nothing is drawn by the game. They exist so the owner
can pick which designs are worth paying Meshy for — image-to-3D plus a rig is
about 20 credits per role, so choosing on paper is much cheaper than choosing
in 3D.

## What happens to a chosen design

1. Redraw it as a **T-pose** — arms out horizontally, daylight in both armpits
   and between the legs, a volumetric body. `PHASING.md` §1.06: this is the
   fragile step, and the model ignores the instruction unless the prompt names
   the capital letter T and the horizontal line through both shoulders.
2. `image-to-3d`, then `rigging`. Walk and run come free with the rig.
3. The four fight clips already exist as a library (`PHASING.md` §1.07) and are
   lifted onto any rig, so they do not need regenerating per role.

A role needs **one** model. Crew variety inside a role comes from the hue-band
recolour in `scenes/battle_stage_3d.gd`, which costs nothing per person.
