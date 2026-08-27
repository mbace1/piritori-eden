# cast3d reference images

Source images for Meshy image-to-3D. Candidates, not approved art — approved
material lives in `art-src/approved/`.

`ART_BIBLE.md` §7 (the 3D pipeline) sets the format and it is not optional:
**full-figure T-pose, front, flat neutral ground, even light, no cast shadow,
margin on all four sides.** `art-library/references/bodies/` holds the format
that is known to work. Owner, 2026-08-27: *"t-pose is always direct to
camera."*

Before anything reaches Meshy, §7 also requires ZOOMING IN and checking four
things individually — the head (dead-front, both ears equal, eyes level),
both armpits (an open wedge of background between sleeve and torso), and both
feet (exactly two, fully separate). That rule was written after Jaska's T-pose
went to Meshy with a three-quarter head and broke the mesh down its
centreline.

## toko-tpose-v01-candidate.png (2026-08-27) — NOT APPROVED, NOT SENT

### What this is, and the mistake that produced it

Toko's yellow mask was reported here as a bug. **It is not a bug. It is
canon**, and the canon was already written down in two places I did not read
before diagnosing: `ART_BIBLE.md` §8.3 "Toko Slomo character and mask", and
`art/v3/manifest.json`, which says in as many words "The gold smiling mask is
CANON". Everything below exists because of that mistake, and the earlier
mask-less three-quarter candidates were deleted outright.

§8.3's actual direction: a full-face orange or golden-yellow fabric/card hood;
a white smile mark made from **three broad curved frames**; eye openings cut
**inside** the two white upper frames, following the same arch, leaving a
visible slice of white around each opening; grey eyebrows and hair layered
above; slight hand-cut asymmetry; and explicitly no glowing emoji face, no
plastic mascot gloss, no bare realistic face beneath.

The living reference for it is the approved narrative baseline,
`art/v3/scenes/toko-slomo-noodles-prototype-v02.webp`. **Look at that before
writing any prompt for Toko** — the prose alone produced three wrong masks.

### Where the candidate actually stands

Correct: dead-front and symmetrical, arms perfectly horizontal at shoulder
height, an open background wedge in each armpit, both feet flat and fully
separate, flat ground with no cast shadow, plain black apron with no text
(the manifest records that apron text had to be removed once already), grey
hair above the mask, and a smile that is a white curved band rather than a
toothy grin.

Still wrong, and why it has NOT been sent:

- **Proportions. Measured at 3.8 head-heights**, against roughly 7.5 for a
  normal adult and for the approved body sheets. Meshed as-is it would be a
  bobblehead that matches nothing else in `cast3d/`.
- **The eyes.** They read as white eyebrow strokes with dark eyes below them.
  §8.3 wants the openings cut inside the white arches with white showing all
  round. Three generations failed to move this, including one that fed the
  canon artwork in directly as an image reference.

Two faults, three attempts, so this stopped per `CLAUDE.md` rule 8 rather than
grinding on. Nothing has been sent to Meshy; balance was 114 credits.
