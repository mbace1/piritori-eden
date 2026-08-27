# Phenotypes — three per subclass, one settled

**READ THIS FIRST — the axis below is wrong.**

These sheets were built against `MODULAR_CHARACTER_SYSTEM.md`'s eight subclass
names. `COMBAT.md` §9.11 **supersedes that table** as a description of what a unit
is, and the live design is in `content/era1-slice-v1.json` — canon rank 10 — which
I had not read when I generated them.

The content defines **twelve aptitudes carrying six `look` values**, not eight
subclasses:

| look | aptitudes sharing it |
|---|---|
| `heavy` | bruiser, anchor, muscle |
| `thin` | blade, shooter, courier, runner |
| `hooded` | spotter, watcher |
| `long-coat` | fixer |
| `work-jacket` | driver |
| `rounded` | local |

A look is shared across characters, which is the whole point and is why there are
six of them and not twelve. Two of my eight — `hired` and `enforcer` — are not
aptitudes at all; they are opposition bodies.

**And the coverage already existed.** `art/v3/manifest.json` carries **18
`cast3d` assets**, including a body for every one of the six looks, plus approved
cut-paper T-pose body frames in `art-library/characters/manifest.json`
(`base-{light,medium,heavy}-{m,f}-tpose-cut-v02`) and an approved 3D modelling
turnaround (`base-medium-mf-turnaround-cut-v02`).

What survives from the work below is the **method and the measurements** — the
T-pose collapse on bulky outerwear, the key-colour drift, the Block C-T
one-scale result, and the tooling. The **eight-way split does not.**

---

**Unapproved.** Nothing here is in `APPROVALS.md`, `catalog.json` or
`art/v3/manifest.json`. `DESIGN_AUTHORITY.md` puts approval with the owner; this
is material for that decision.

Proto stage: **three candidates per subclass, one settled on.** Sheets in this
folder, cuts in `chosen/`, exact prompts in `prompts/`.

**Weight.** The sheets are JPEG at 1600px — they are review material and nobody
cuts from them. `chosen/` stays **PNG**, because each cut carries a magenta key
edge and JPEG ringing on a key edge is the thing a cutter trips on. 45 MB of raw
PNG went in before this was applied and git keeps it; the working tree is 10 MB.

---

## The hybrid question, and why these sheets are per-look-family

`COMBAT.md` §9.12 — the ruling that nobody has "a class" — puts **twelve
aptitudes in one pool**: bruiser, anchor, blade, shooter, spotter, courier
alongside runner, muscle, watcher, fixer, driver, local. **Most people hold two,
some three**, and the hybrids are the design: *muscle + spotter*, *courier +
blade*, *local + fixer*.

That reads at first like it needs twelve bodies, or worse, one per combination.
It does not, because the same section already rules:

> Appearance follows the **first** aptitude, so the look family still reads.

So a phenotype is **one look family plus a cue**, not a blend. The body comes
from aptitude one; aptitude two arrives as a diegetic prop, a garment layer or a
grip — the vocabulary `MODULAR_CHARACTER_SYSTEM.md` already lists as *diegetic
cue*. A heavy who reads the room is the **muscle** body carrying the watcher's
camera, not a new build halfway between them.

This is what makes the roster survivable. Twelve aptitudes taken two or three at
a time is 220+ combinations; eight look families times a cue is a wardrobe.

**These eight are the look families**, from `MODULAR_CHARACTER_SYSTEM.md`'s
subclass table, whose *silhouette and diegetic-cue guidance still stands as art
direction* per `COMBAT.md` §9.11:

`runner` · `muscle` · `watcher` · `fixer` · `driver` · `local` · `hired` ·
`enforcer`

The six combat verbs have no look of their own and should not get one. Bruiser is
a thing a body **does**, not a thing it **is**.

---

## Method

One sheet per subclass, three people on it, generated as a single image under
`NANO_BANANA.md` **Block C-T** — the turnaround exemption. One image is what
guarantees one scale, and on the first sheet it delivered: heights 1425 / 1308 /
1401 px with **groundlines within 6px**.

**The height variation is correct and the prompt was wrong to fight it.** It
asked for "all the same height in frame"; the model gave three people of
different heights standing on one line, which is what a body-frame reference
wants. The instruction is the defect, not the output.

---

## Findings

### 1. The T-pose collapses on bulky outerwear

Measured as **max arm span ÷ height**. A strict T-pose is ~1.0; arms at the sides
is ~0.5. First pass:

| sheet | v01 | | sheet | v01 |
|---|---|---|---|---|
| runner | 0.85 | | driver | 0.88 |
| muscle | **0.59** | | local | **0.55** |
| watcher | 0.83 | | hired | — |
| fixer | 0.88 | | enforcer | **0.51** |

**Every sheet that failed is a heavy-coat subclass.** Parkas, anoraks and long
coats; the light-clothing subclasses held the pose. This is Sprint 1 defect 2
recurring — *"T-pose dropped — arms hang instead"* — and the cause is the
garment, not the wording.

The fix was not to repeat the instruction. `_base-v02.txt` adds a positive
construction:

> **THE SLEEVES GO WITH THE ARMS.** Whatever coat, parka or jacket a figure
> wears, its sleeves point straight out sideways along the raised arms. On every
> figure there is a clear open wedge of flat background visible in each armpit.

| sheet | v01 | v02 |
|---|---|---|
| muscle | 0.59 | **fixed** |
| local | 0.55 | **0.91** |
| enforcer | 0.51 | **0.93** |

`muscle-v02` measures 2.38, which is the *measurement* failing rather than the
image: its three figures touch fingertips, so the splitter reads them as one. The
pose is correct on inspection.

### 2. The key colour drifts, and it is per-generation

| sheet | background | dE from `#FF00FF` |
|---|---|---|
| runner | `(253, 2, 253)` | **0.9** |
| fixer | `(254, 1, 252)` | 1.3 |
| hired | `(254, 1, 250)` | 2.3 |
| driver | `(253, 33, 253)` | 4.0 |
| enforcer | `(253, 55, 252)` | 9.2 |
| local | `(253, 67, 252)` | 12.9 |
| watcher | `(253, 81, 255)` | 17.1 |
| muscle | `(233, 54, 197)` | **32.4** |

Same prompt, same model, same session — **0.9 to 32.4**. The pipeline can hit the
key and does not do it reliably, which matches the owner's own cut-out sheets
(3.4–12.2) and the Sprint 1 v2 dog (32).

**Cut on tolerance, never on equality** — `ART_BIBLE.md` §7.5. `muscle` and
`watcher` should be regenerated before either becomes production input.

### 3. Two cosmetic defects

- **`muscle-v02` and `local-v02` carry a cream halo** around each figure, like a
  die-cut sticker border. Nothing asked for it and it will key badly.
- **`hired-v01` has a faint drawn groundline** under the feet. Harmless in a
  concept, wrong in a cut-out, and it broke the figure splitter until the band
  was moved off it.

---

## The eight settled on

Cut to `chosen/*-proto.png`. Each is the figure whose silhouette reads the
subclass fastest with the coat closed and the face ignored — the test that
matters at battle scale.

| subclass | taken from | why |
|---|---|---|
| runner | `runner-v01` #1 | lean, bum bag, two-stripe trackies; reads young and quick |
| muscle | `muscle-v02` #3 | broadest mass, beard, shortest negative space under the arms |
| watcher | `watcher-v01` #1 | long dark coat, camera at the chest, upright and withdrawn |
| fixer | `fixer-v01` #1 | the asymmetric layered read, keys at the hip, folder under the arm |
| driver | `driver-v01` #3 | work jacket, keys on the belt, solid through the middle |
| local | `local-v02` #1 | elderly, anorak over a jumper; the least tactical body in the set |
| hired | `hired-v01` #1 | full tracksuit, shaved head, duffel strap; cheap and planted |
| enforcer | `enforcer-v02` #3 | longest closed silhouette, cap, hands available and hidden |

`cut_one.py` splits a sheet on its leg band and cuts at the midpoints between
figure centres. `clean_cut.py` then floods from the centre and wipes anything not
connected, because a T-pose neighbour's fingertips reach past the boundary. It
cannot help `muscle`, whose figures **touch** — that crop still carries a
neighbour's hand at its right edge.

---

## Not done

- **Register.** These are ink line over flat fill, matching the owner's own body
  references. `ART_BIBLE.md` §1 rule 2 puts characters in **cut paper**, and the
  head sheets in `art-library/references/cutouts/` are visibly cardstock. Bodies
  and heads are not yet in the same material. That is the next question, not a
  defect in these.
- **Posture.** Half of `MODULAR_CHARACTER_SYSTEM.md`'s subclass read is stance —
  *forward lean*, *broad square*, *weight on the rear foot*. A T-pose discards
  all of it by design. These sheets carry silhouette, mass and costume only; the
  posture read belongs to the stance frames.
- **Gender and age balance.** The set skews male and middle-aged. `local` and
  `watcher` carry the widest range; `muscle` and `enforcer` are the narrowest and
  should be widened before approval.
- No hair/head separation, no `role_tab`, no sockets, no frames.
