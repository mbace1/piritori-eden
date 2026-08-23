# UX concepts

## The rule this folder learned

Three concepts were made and deleted the same day. They drew flat cut-paper
silhouettes on a 2D isometric board — the game as it was before the 3D ruling in
`PHASING.md` §1.055. Owner: *"these are old designs and don't treat this like the
game it is now with 3d fights."*

The cause is already in `QUEUE.md`: `ART_BIBLE.md` still describes cut cardstock
and contradicts the 3D ruling, and I prompted against the art bible instead of
against the build. **Look at what the game renders before drawing what it should
look like.**

## The two that were kept

### `battle-3d-b.png`
Made after reading `battle_stage_3d.gd`: dim blue ambient, one warm sodium lamp,
a cool blue rim light separating figures from the ground, a low-opacity grid
tinted cyan / neutral / red across six lanes and eight rows. The cast it drew is
recognisably ours because the description came from the real models.

### `chrome-carton-test.png` — the direction
Owner: *"some 2d art bible stuff works, like the ripped carton as layers look.
That or similar styles should be tested."*

So: **a 3D world, and torn-carton UI on top of it.** Not the board — the board
stays rendered. The panels, the bars, the buttons and the frames become thick
cream carton with ripped edges and ink lettering, layered with a soft shadow so
they read as pieces stuck onto the screen.

The contrast is the idea. A smooth lit world under rough flat card is a stronger
look than either alone, and it resolves the `ART_BIBLE` contradiction without
throwing the art bible away: **cardstock is the interface, not the world.**

## What is still invented in them, and must not be copied

- Titles: "KALLIO: YÖN VUOROT" is not the title.
- Stats: STR / MOV / DEF / MOR. There are five perks — strength, speed, wits,
  nerve, toughness.
- A skull for morale. `NARRATIVE.md` holds that people are never scenery and
  `COMBAT.md` §1 promises triage rather than a damage race.
- The action set omits MARK, which is now a real command.
- The grid glows harder than the build's low-alpha quads.

## Built from this

`PiritoriIcon` gained eight **place** pictograms — noodles, docks, bar, market,
yard, church, transit, home — drawn as vectors. Per-SITE rather than per-role,
which is why they can exist at all: twenty-five anchor roles onto twelve generic
icons was arbitrary symbolism, but a noodle bar and a dock draw themselves.

No credits, any pin size, and they take the tint.
