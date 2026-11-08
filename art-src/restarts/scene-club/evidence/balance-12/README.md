# Current-source C.19 baseline — UI cap work

Source commit: `220ad40ba2ecd5bf28621b2379fcdcb4ab90fe57`. The 23 measured JS/data files were clean against that commit and their SHA-256 hashes stayed unchanged during execution. Pending UI-cap changes are outside this pure command-policy measurement.

Executed without RULES, TRACE, POLICY, CAREFUL_DODGE_FIRST or DEFENSIVE_POLICY overrides:

```sh
env -u RULES -u TRACE -u POLICY -u CAREFUL_DODGE_FIRST -u DEFENSIVE_POLICY SEEDS=12 node web/tools/fight-balance.mjs
```

**147 rows / 1,764 simulations:** 11 fight jobs × 3 heats × 3 policies, plus four getaways × 3 heats × 4 policies; 12 deterministic seeds per row, heats 0/2/3. All 15 scenarios are present, row keys are unique and no row reached the 40-iteration guard. Standard error output is empty.

| Goal / policy | Won | Net HP lost | Rounds | Fights with a down | Police |
|---|---:|---:|---:|---:|---:|
| fight / fight | 64.455% | 3.500 | 2.745 | 33.576% | 30.788% |
| fight / careful | 68.212% | 3.488 | 2.685 | 40.424% | 28.000% |
| fight / focused | 64.212% | 3.800 | 2.727 | 36.121% | 30.788% |
| getaway / run | 67.333% | 1.275 | 2.583 | 15.917% | 19.417% |
| getaway / careful | 63.917% | 0.000 | 3.475 | 0.000% | 36.083% |
| getaway / escort | 83.333% | 0.000 | 2.667 | 0.000% | 16.667% |

Comparisons use the same 33 fight/heat cohorts (396 runs per policy), or the same 12 getaway cohorts (144 runs per policy). These are means of rounded source rows, not reconstructed per-seed counts.

Careful versus aggressive fight play gains **3.758 win points**, saves only **0.012 net HP**, and increases the downed-fight rate by **6.848 points**. It improves wins in 10 cohorts, worsens seven and ties 16. The source policy tries an attack before repositioning, tries an attack again after moving, then Braces only if its immediate-threat score remains positive. This limits what its result can establish about defensive play; it does not establish that Brace is weak. This uninstrumented sampler does not count Brace commands.

Escort wins **83.333%** of getaways versus **67.333%** for straight-out play, with no net HP loss in these samples. Careful escape also has zero net HP loss but takes longer (3.475 rounds), with more police (36.083%).

All 147 rows match both preserved 12-seed datasets in all 14 current fields. The older instrumented file has additional Brace/Move/attack counters; those fields are not silently copied into this fresh run. Historical source bytes are not claimed identical to the current cache/appearance source; the newly measured outcomes are identical.

Artifacts: `baseline-12.json` is exact stdout; `stderr.log` is empty; `source.json` records command, commits, SHA-256 hashes and timing; `summary.json` contains matched policy means and scenario differences.

Limits: terminal net HP is not gross incoming damage; downed/taken counts are not permanent campaign deaths or recovery outcomes. Every policy answers police with BACK_OFF. No player tactics, rescue posture comparison, campaign settlement/recovery, UI-cap input usability, physical-device performance or wall-clock battle duration is measured. No rule or bot-policy changes were made.
