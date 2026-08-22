# Second pass — proportions corrected

The first pass looked squished, and the cause was an instruction of mine.

**The existing cast art is itself squat.** Every approved sheet measures
`height / shoulder-width = 1.51`. A standing adult with arms down is nearer
**2.8–3.2**. The first concept prompt said *"same body proportions and scale as
the reference figure"*, so the alternatives faithfully reproduced a 1.5 build.
The three that looked right — fixer B at 2.65, watcher C at 2.25, local C at
2.07 — were the ones that ignored the instruction.

That build is defensible in 2D: a chunky silhouette reads at standee size, and
`ART_BIBLE` asks for silhouette-first. It does not survive being a figure
standing on a real floor at a real scale, which is what the 3D ruling made these
into.

This pass takes STYLE from the reference and explicitly not its proportions.

| role | old A | new B | new C |
|---|---|---|---|
| driver | 1.51 | 2.29 | 2.82 |
| fixer | 1.51 | 3.36 | 2.89 |
| local | 1.51 | 1.79 | 1.79 |
| muscle | 1.51 | 3.32 | 3.29 |
| runner | 1.51 | 3.16 | 3.13 |
| watcher | 1.52 | 2.19 | 3.49 |

## Known problem with this pass

**Muscle lost its bulk.** B and C are correctly proportioned and now read as
lean — which is wrong for the role. The fix is a third pass asking for tall AND
broad rather than trading one error for another: "normally proportioned" and
"heavy" are not opposites, and the prompt currently only says the first.

`local` barely moved (1.79) because the brief asks for a short round woman in
her sixties, which is genuinely a low ratio. That one may be correct as it is.
