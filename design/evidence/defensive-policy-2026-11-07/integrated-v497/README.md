# Integrated v4.97 evidence — 30 seeds

Fresh measurement on the integrated v4.97 combat source, with the corrected target-free extraction path. This is bot/test evidence; no runtime policy or combat rule is promoted. Act I remains 48%.

The opt-in sampler ran all 15 Act I fights × 3 heats × their original policies plus defensive: **192 rows / 5,760 simulations**. Its 147 retained peer rows represent 4,410 simulations and the 45 new defensive rows represent 1,350. `default-30.json` is filtered from those retained peers, not a second independent run. Every field in all 147 historical 30-seed rows matches exactly. Newly measured action counters remain separate from that older file's missing counters. No row hits the iteration guard.

## Matched fight jobs

33 fight/heat cohorts, 30 identical deterministic seeds each (990 runs per policy). Values are means of the sampler's rounded per-row values. Net HP loss is terminal HP shortfall, including any healing; it is not cumulative incoming damage.

| Policy | Won | Net HP lost | Rounds | Fights with a down | Police | Brace commands |
|---|---:|---:|---:|---:|---:|---:|
| Aggressive | 65.182% | 3.412 | 2.724 | 33.636% | 31.485% | 0.000 |
| Careful | 67.485% | 3.576 | 2.667 | 40.667% | 28.364% | 0.000 |
| Focused | 65.333% | 3.745 | 2.715 | 36.970% | 30.697% | 0.000 |
| Defensive (opt-in) | 62.091% | 0.503 | 3.255 | 2.182% | 37.909% | 0.736 |

Versus aggressive play, defensive saves **2.909 net HP** and reduces downed-fight rate **31.454 percentage points**, while losing **3.091 win points**, taking **0.531 extra rounds** and increasing police arrivals **6.424 points**. This comparison changes several policy decisions, so it does not isolate Brace as the cause. The constrained matched resolver fixture separately proves one legal Brace survival case.

## Matched getaways

12 fight/heat cohorts, 30 identical seeds each (360 runs per policy).

| Policy | Won | Net HP lost | Rounds | Police | Brace commands |
|---|---:|---:|---:|---:|---:|
| Straight out | 66.667% | 1.300 | 2.525 | 18.333% | 0.000 |
| Careful | 62.500% | 0.000 | 3.458 | 37.500% | 0.000 |
| Escort | 83.333% | 0.000 | 2.667 | 16.667% | 0.000 |
| Defensive (opt-in) | 46.917% | 0.225 | 3.575 | 53.083% | 1.558 |

The experimental policy still performs poorly in getaways after its extraction fix. It can value attacks above southward progress and makes no claim to replace escort. All 45 defensive cohorts exercise Brace, but using an action is not itself proof of a good decision. Default policies remain unchanged.

## Provenance and reproduction

[source.json](source.json) records the exact sampler-start commit, runtime base, original policy commits, command and selected source hashes. [comparison-30.json](comparison-30.json) contains every matched cohort and input hashes. Raw rows are in [defensive-30.json](defensive-30.json) and [default-30.json](default-30.json). The source base includes main `0587dae` v4.97; it is distinct from the original 12-seed `a0a60e7` evidence. The merged Godot fixture correction changes no measured runtime source.

```sh
SEEDS=30 DEFENSIVE_POLICY=1 node web/tools/fight-balance.mjs > /tmp/defensive-30.json
node web/test/defensive-policy.mjs
node web/test/defensive-policy-report.mjs
```

Per-seed raw outcomes/confidence intervals, cumulative damage, permanent campaign casualties, missing crew/recovery settlement, device performance and wall-clock battle time are not measured by this table. Existing campaign receipt/recovery tests remain separate. No rules, squad tuning, artwork, save schema or default bot policy are changed. A no-Brace ablation remains unrun; the report makes no blanket causal claim about Brace or human tactics.
