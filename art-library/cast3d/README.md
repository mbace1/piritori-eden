# cast3d — the 3D bodies, and where they came from

**Unapproved.** Nothing in this folder is in `APPROVALS.md` or
`art/v3/manifest.json`. The thirteen bodies that *are* registered live in
`art/v3/cast3d/`.

Built under `ART_BIBLE.md` §9.7 — the character pipeline. Tools in
`art-src/meshy-input/`.

---

## Naming: describe the body, do not name the role

The registered set already sets this convention and it is worth keeping:
`parka-man-v01`, `suited-man-v01`, `street-raver-v01` describe **what a body
looks like**. Only the six that back a crew role are named for one.

**Crew names are randomly generated from first- and last-name pools**, and hires
roll random aptitudes and skills. So a body is never a person: it is a look that
many people can wear, recoloured. Naming a mesh `samira-elmi` would tie one
generated name to one mesh permanently and quietly undo that.

That is why `hooded-camera-woman-v02` is not called `watcher`. **Owner ruling,
2026-08-24: she is not hired crew.** Bystander, informant or press — undecided,
and the file name does not need it decided.

---

## What is here

| body | tris | texture | from |
|---|---|---|---|
| `heavy-dreads-v02` | 31k | 1024 | the owner's dreadlocks T-pose |
| `hooded-camera-woman-v02` | 31k | 1024 | `art-src/concepts/people/hooded-camera-woman-v02.png` |

Each has a `-rigged.glb` (skeleton, one animation) and a `-clips.glb` (both
animations, no texture — see below). `muscle-rigged-source-v01.glb` predates
this work.

**`heavy-dreads-v02` duplicates `hired-b-v01`**, which is the same character and
was already rigged and animated in the repo. It was generated before the
manifest was checked, which is why §9.7 now says to check it first. Kept as the
comparison that produced the resolution findings, not as an asset anyone needs.

---

## Three things that cost time, so they are written down

**Rigging returns different keys from the other endpoints.** `image-to-3d` and
`text-to-3d` give `model_urls.glb`; rigging gives `rigged_character_glb_url`,
plus `basic_animations` with a free walking and running clip. Reading for
`model_urls` finds nothing and the run looks like a hang rather than a failure.

**Meshy's animation files cannot be committed as they arrive.** Each is a whole
character — mesh, skeleton and full texture, ~7.5 MB — so two animations put the
same texture in the repo three times. `glb_make_clips.py` merges them, drops
every texture and repacks the buffer: 15.8 MB → 2.5 MB. The repack is the part
that matters; removing the image entry alone leaves its bytes in the chunk and
the file does not shrink at all.

**A `.glb` cannot be judged from its texture atlas.** A low-res atlas has hard
pixel edges and a high-res one has smooth gradients, so comparing atlases
measures resolution and calls it style. That mistake is what produced two wrong
claims in §9.7 before `glb_render.py` existed. Render it and look.

---

## Weight

`--target-polycount 12000`, texture re-encoded to 1024 with `glb_retex.py`.
About **0.55 MB a character** — under `hired-b-v01`'s 0.9 MB. Polycount is the
lever; texture size is nearly free, and 12k reads *better* than 31k because
fewer, larger facets suit flat fills. Measured in §9.7.

The two bodies here are 31k, generated before that was known. They are the
evidence for it rather than the shape of it.
