# Sprint 1 concepts, v2 — the dog

One image, three views. Replaces `../dog-front.png`, `../dog-side.png` and
`../dog-back.png`, which are kept in place as evidence rather than deleted.

**Unapproved.** Nothing here is registered in `art-library/`, nothing is in
`APPROVALS.md`, nothing is Meshy input. `DESIGN_AUTHORITY.md` puts approval
with the owner; this is material for that decision.

Generated under `art-src/NANO_BANANA.md` **Block C-T**, the turnaround
exemption, which was added in the same branch as this image.

## Why it is one image and not three

The v1 dog carried defect 1 — body scale does not match across views — and it
was not a prompt failure. Cross-view alignment to ±2px is not achievable across
separate generations. The three v1 dogs were three prompts, so they were three
dogs.

Measured on this sheet:

| view | height (px) | groundline | width |
|---|---|---|---|
| side | 1156 | 1362 | 1274 |
| front | 1154 | 1360 | 460 |
| back | 1156 | 1360 | 460 |

**Height spread 2px (0.2%). Groundlines within 2px.** One image is what
guarantees one scale.

The side view *looks* larger at a glance and is not — a dog in profile is
genuinely about 2.8× wider than head-on. Checked by measurement after the
eyeball read said otherwise.

## Why the prompt changed shape

v1 already said *"no individual drawn hairs and no fur texture"* and *"No
gradients"*, and the model drew fur and airbrushed the volume anyway. Repeating
a ban that has already been ignored is not a fix.

v2 states the **construction** positively instead — *about six flat solid
shapes of a single uniform colour each, as if cut from coloured paper with
scissors and glued down; a shape is one colour from edge to edge, the same
value at its centre as at its rim.* Defect 6 does not appear in the result.

## The magenta, measured

v1's background was never magenta. Nobody logged this.

| | dominant background | L1 distance from `#FF00FF` |
|---|---|---|
| v1 `dog-side.png` | `(210, 67, 127)` | **240** |
| v2 this sheet | `(252, 21, 247)` | **32** |

v1 was a dusty rose. Its own swatch strip printed `#FF00FF` next to a background
that was nothing of the kind.

**v2 is not bit-exact either** — 0.0% of the image is literally `(255,0,255)`,
and the background drifts from `(237,40,231)` to `(255,27,248)` corner to
corner. The cause is the risograph grain in Block A, which the model applies
over the background as well as the subject. A key on an exact value returns
nothing; a key at tolerance 60 returns 67.4% of the image, which is the
background. **Anything downstream must key on tolerance, not equality.** Worth
deciding whether that is acceptable before this becomes Meshy input.

## Known defects in v2

| | defect | note |
|---|---|---|
| 1 | ears are both folded in all three views | spec asked for one up, one half-folded |
| 2 | background carries grain and is not bit-exact magenta | see above; inherent to Block A's riso grain |
| 3 | left margin is 120px against a 2752px width | Block C-T does not restate the 10% margin rule that the v1 per-view prompts did — arguably the block's gap, not the image's |

Defects 1–6 from `../README.md` are not carried: 1 (scale) is measured above,
6 (off-style) does not appear, and 2–5 were specific to the human views.

## Files

- `dog-turnaround-v01.png` — 2752×1536
- `prompts/dog-turnaround-v01.txt` — the exact prompt, verbatim
