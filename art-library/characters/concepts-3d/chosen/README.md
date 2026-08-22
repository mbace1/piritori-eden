# The six chosen for 3D production

Selected 2026-08-22 on **silhouette distinctness**, because in a 3D board a role
has to be identifiable at a glance from its shape rather than from a label. The
six read as six different shapes:

| role | pick | h/w | the shape |
|---|---|---|---|
| driver | C | 2.83 | medium build, quilted coat, keys at the belt |
| fixer | B | 3.37 | tall narrow — a long coat is the only floor-length silhouette |
| local | B | 1.79 | short and round, the only rounded one in the cast |
| muscle | D | 2.21 | a wide slab on long legs |
| runner | B | 3.16 | thin vertical |
| watcher | C | 3.50 | lanky, hood up — the hood is a unique outline |

**Watcher B was dropped despite being a good drawing.** "Heavy man in his
fifties" collides with muscle at battle scale, and two roles that read the same
are worse than one role that reads plainly.

**Muscle needed a third pass.** The proportion fix in `../proportioned/` made B
and C correctly proportioned and lean, which is wrong for the role — the prompt
said "normally proportioned" and never said "heavy", and those are not
opposites. D asks for both: tall AND broad, small head, long legs, "a wide slab
on long legs". 2.21 rather than 3.32.

## The T-poses

`<role>-tpose.png` is what goes to Meshy. Every one was CHECKED before spending
credits, because this is the step that has failed twice: the model draws
arms-down unless the prompt names the capital letter T and the horizontal line
through both shoulders.

A verification heuristic was written to check them automatically and was WRONG —
it reported five of six as arms-down because it assumed a background grey the
images do not have. The sheet was looked at instead. A measurement that
disagrees with the picture is a measurement to throw away, not a picture to
doubt.
