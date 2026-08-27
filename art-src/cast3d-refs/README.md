# cast3d reference images

Source images for Meshy image-to-3D, kept so a regeneration can be repeated or
argued with later. These are **candidates, not approved art** — approved
material lives in `art-src/approved/`.

The image-to-3D step behaves far better when the source is a single centred
figure, three-quarter view, flat neutral background, evenly lit, no cast
shadow, whole body in frame with margin around the silhouette. Every prompt
here asks for exactly that, and a candidate that crops the feet is a weak
source however good the character reads — Meshy has to invent whatever the
frame cut off.

## toko-ref-A.png / toko-ref-B.png (2026-08-27)

Made because `art/v3/cast3d/toko-v01.glb` has **a yellow emoji baked into its
texture atlas where his face should be** — confirmed by extracting the atlas
out of the GLB, not by guessing at the render. All 14 `cast3d/` models were
checked the same way and Toko is the only one affected.

Toko Slomo is canon in `NARRATIVE.md`: a Japanese noodle chef on Vaasankatu,
Aatami's friend, and explicitly "an independent shop owner, never an ethnic
servant analogue". Both prompts ask for a dignified individual and rule out
caricature in as many words.

- **A** — swept-back grey hair, charcoal apron, towel at the waist, full body
  including boots. Matches the shipped model's own colours, so replacing it
  disturbs the noodle-bar scene least. Feet in frame.
- **B** — cropped iron-grey hair, navy apron, warmer expression. Reads well as
  a character but **the legs are cut off at the bottom of the frame**, which
  makes it the weaker 3D source.

Nothing has been sent to Meshy. Regenerating costs real credits and needs an
explicit go-ahead; balance was 114 at the time of writing.
