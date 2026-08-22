# Character concept spec — 2D to Meshy

Everything needed to draw a character concept and turn it into a rigged 3D
figure. Written down because it was spread across `art-src/NANO_BANANA.md`,
three READMEs in this folder and two entries in `PHASING.md`, and because every
trap listed in §6 has already cost real credits at least once.

**Two drawings per role, not one.**

| # | Drawing | View | Purpose | Goes to |
|---|---|---|---|---|
| 1 | `<role>-<letter>.png` | three-quarter | judging the design | a human |
| 2 | `<role>-tpose.png` | flat front, T-pose | making the mesh | Meshy |

The concept is for choosing. The T-pose is for building. Never send the concept
to Meshy: a three-quarter figure with arms down rigs badly or not at all.

---

## 1. Stage one — the concept

Paste **Block A + Block B + Block C + the palette**, then the role body.
Blocks are quoted in full in `art-src/NANO_BANANA.md` §3–4; the short version:

- **A — house style.** Hard black ink-line illustration, flat muted fills,
  risograph print language, paper grain, registration drift. Darkest Dungeon
  rather than a comic. No gradients, no glow, no photographic rendering. Night,
  cold, used, deadpan. Helsinki 2003, not a crime film about it.
- **B — the magenta rule.** Flat solid `#FF00FF` background, nothing on it, no
  gradient, vignette, shadow, texture, border or frame. Subject does not touch
  the edges. This is what makes the figure cuttable by `art-src/tools/key.py`.
- **C — kill the presentation board.** No text, letters, numbers, labels,
  captions, watermark, logo, UI chrome, panel, card or drop shadow. Not a sheet,
  poster, turnaround or reference board. **Block C matters most** — every sheet
  delivered before it existed came back as a board, and a board cannot be cut
  because its background is not separable from its art.

### The proportion clause — say this, and do not say the other thing

```
Take the STYLE from the reference image — line weight, palette, grain, the flat
cut-paper handling. Do NOT take its body proportions. Draw a normally
proportioned adult: head roughly one seventh of standing height, legs a little
under half.
```

**The trap this exists for.** The first concept pass said *"same body proportions
and scale as the reference figure"* and the results looked squished. The cause
was the instruction: the approved 2D cast art measures **height / shoulder-width
= 1.51**, where a standing adult with arms down is nearer **2.8–3.2**. The
alternatives faithfully reproduced a 1.5 build. The three that looked right were
the three that had ignored the prompt.

A 1.5 build is defensible in 2D — a chunky silhouette reads at standee size and
`ART_BIBLE` asks for silhouette-first. It does not survive being a figure
standing on a real floor at real scale, which is what the 3D ruling made these
into.

**"Normally proportioned" and "heavy" are not opposites.** Correcting muscle's
proportions made it lean, which is wrong for the role. If a role is meant to be
big, the prompt must ask for tall **and** broad in the same sentence.

---

## 2. Stage two — the T-pose

**Block B does NOT apply here, and Block A is reduced.** This was checked
against the delivered files rather than assumed: the concepts really do carry a
magenta background (`#FE15FC`, keyable), and the T-poses really are flat neutral
grey. Two deliberate differences:

- **Grey, not magenta.** The T-pose is never cut out — Meshy wants a neutral
  field to read depth against, and a saturated magenta bleeds into the edges of
  the generated texture.
- **No grain, no registration drift.** Meshy photographs the drawing into the
  texture, so risograph grain bakes in permanently and then gets lit again in
  engine. Ask for the palette and the flat handling, not the print artefacts.

Use Block C unchanged — a presentation board is just as fatal here.

Square canvas, 1024 × 1024, then:

```
The figure stands in a strict T-POSE: the capital letter T. Both arms are
straight out sideways, horizontal, forming one straight line through both
shoulders, palms down. Legs straight and slightly apart. There is clear daylight
in both armpits and between the legs. Front view, flat on, symmetrical, no
perspective, no foreshortening, no turn of the head or hips. The whole body is
in frame with margin all round, evenly lit, no cast shadow.
```

**This step has failed twice.** The model draws arms-down unless the prompt names
**the capital letter T** and **the horizontal line through both shoulders**.
Naming only "T-pose" is not enough.

**Check every T-pose by eye before spending credits.** A heuristic was written to
verify them automatically and was wrong — it reported five of six as arms-down
because it assumed a background grey the images did not have. The contact sheet
showed all six were fine. A measurement that disagrees with the picture is a
measurement to throw away, not a picture to doubt.

---

**One inconsistency, unexplained.** Five T-poses sit on `#C7C7C7`; watcher sits
on `#949494`. Both worked, so it is not urgent, but a background that drifts
between figures is a variable nobody chose — match them on the next pass.

---

## 3. What Meshy needs from the image

- one centred figure, nothing else in frame
- flat neutral background, no cast shadow
- even lighting, no dramatic key light
- margin around the whole silhouette
- daylight in both armpits and between the legs — **this is what makes limbs
  separable**; a figure with arms against its body fuses into a single mass

---

## 4. The six roles

Silhouette does the work: on a 3D board a role must be identifiable from its
shape alone, never from a label. Chosen 2026-08-22 on distinctness.

| Role | h/w | Shape | Diegetic cue |
|---|---|---|---|
| **driver** | 2.83 | medium build, weight on rear foot | quilted work jacket, gloves, keys at the belt |
| **fixer** | 3.37 | tall and narrow — the only floor-length silhouette | long coat, scarf, key ring, document wallet |
| **local** | 1.79 | short and round — the only rounded one | ordinary practical layers, grocery bag, cigarette pack |
| **muscle** | 2.21 | a wide slab on long legs | heavy parka, work gloves, taped hand |
| **runner** | 3.16 | thin vertical, forward lean | wool cap, cross-body pouch, feature phone |
| **watcher** | 3.50 | lanky, hood up — the hood is a unique outline | long coat, notebook, compact camera |

`local` at 1.79 is not a proportion failure: the brief asks for a short round
woman in her sixties, which is genuinely a low ratio.

**A rejected design is worth recording.** Watcher B was a good drawing — "heavy
man in his fifties" — and was dropped because it collided with muscle at battle
scale. Two roles that read the same are worse than one role that reads plainly.

**Cast ordinary Kallio residents** across Finnish and immigrant-background faces,
without making ancestry a faction or class shorthand. A crew includes women and
older people. `NARRATIVE.md`: people are never scenery.

---

## 5. One model per role

A role needs **one** mesh. Crew variety inside a role comes from the hue-band
recolour in `scenes/battle_stage_3d.gd`, which costs nothing per person and
protects skin and boots from being tinted.

Do not generate a mesh per crew member. Six roles is six models.

---

## 6. The Meshy pipeline, and what it costs

Measured against the account balance, not quoted from the docs:

| Step | Endpoint | Credits each |
|---|---|---|
| image to mesh | `/openapi/v1/image-to-3d` | **30** |
| remesh | `/openapi/v1/remesh` | 5 |
| rig | `/openapi/v1/rigging` | 5 |
| **per role** | | **40** |

Six roles is 240 credits. Walk and run come free with the rig, and the four
fight clips already exist as a library that lifts onto any rig, so they do not
need regenerating per role.

### The 180-credit mistake, so it is not repeated

`should_remesh: true` is **mandatory** on the image-to-3D call. Without it
`target_polycount` is silently ignored — six meshes came back at ~2 million
faces each and rigging refused all six against its 320,000 limit. Recovery cost
another 25 credits in remeshing.

Meshy's own error message points at `POST /openapi/v2/remesh`, **which 404s**.
The working endpoint is `v1`.

Credits are real money. Check the balance before a batch and confirm before
spending a large share of it.

---

## 7. After the mesh

Textures come back at 2048². Run `art-src/tools/strip_glb_texture.py`:

- **characters** — `<in> <out> 512` keeps the texture and shrinks it. 6–8MB
  becomes ~1.6MB, and 512 is ample for a figure a hundred pixels tall on screen.
- **animation clips** — `<in> <out> 0` removes the texture entirely. Meshy
  returns each clip as a complete character carrying its own copy of the same
  image; the clip only needs its motion, and the base character already has a
  texture. 7.2MB becomes 0.7MB.

Then register in `art/v3/manifest.json` with a sha256, and run
`node godot/tools/sync-data.mjs`. Nothing reaches the game any other way.
