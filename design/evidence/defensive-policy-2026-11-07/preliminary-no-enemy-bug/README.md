# Preliminary run — invalid opt-in getaway interpretation

Archived from local commit `5c6a2e9`. The defensive bot incorrectly returned no decision when no living enemies remained, even though a C.19 getaway still requires extraction. Its getaway losses/rounds/police rates are contaminated by that bot bug and must **not** be read as a meaningful tactical tradeoff or a game-rule defect. These files are preserved only as debugging history. See the parent evidence folder for the corrected run and exact matrix validation. The original 147 default rows were unaffected. The archived report retains its original generation-time source pathnames; its candidate SHA-256 belongs to the archived JSON, not the corrected file now present at that old pathname.

---

# Defensive bot-policy evidence — 7 November 2026

Tool/test evidence only, based on source `a0a60e7`. No combat rule, authored scenario, save schema, live AI, artwork or runtime UI changes. The existing default measuring policies and their results remain unchanged. Act I completion stays at the existing ROADMAP estimate, 48%; no promotion, release or device acceptance is implied.

## What the new policy actually does

`DEFENSIVE_POLICY=1` adds a `defensive` measuring policy. It evaluates legal movement cells, existing enemy intentions, directional cover, crew health and guard, available attacks, and the Move/Action budgets through the same pure C.19 `routes`, `forecast` and `threats` APIs. It does not read future RNG results or simulate hidden opponent decisions.

For each living fighter, it scores a legal Move plus an Action. It considers attack, Brace, bandage, reload and getaway extraction where available. It penalizes predicted HP loss and a worst-case down, while retaining progress toward the job and rewarding attacks which can remove an enemy intention. Crew act with the carrier first in getaways, then low health first. All scoring constants are explicit bot heuristics, not new gameplay rules.

Brace is a real action: **+2 persistent guard, capped at 4; Action is spent; Move remains separate.** The policy can choose it when it reduces incoming intent risk. It also uses an otherwise-unavailable attack opportunity to prepare guard while moving toward the opposition/exit: if it cannot attack from the candidate cell, closing with spare Action can build guard without spending an extra round. It does not repeatedly Brace at full guard or hold still to farm preparation score.

The earlier careful policy attacks immediately if possible; after moving, it again tries an attack before considering Brace, and only braces if it still sees immediate harm. This leaves unspent Actions unused on safe approaches. Its zero observed Brace count is evidence about that policy, not proof that Brace cannot help a player.

## Deterministic fixtures: legal behavior, not authored outcomes

`web/test/defensive-policy.mjs` uses the existing tactical resolver and clearly constrained fixtures:

1. A damaged fighter with no reachable alternative faces a telegraphed bat hit. It Braces, the partner attacks, the announced hit consumes guard first, and the damaged fighter attacks next round to win in round 2. The matched control performs the same partner attack but omits Brace; the damaged fighter is downed. This isolates the legal survival effect in that fixture.
2. A ranged fighter advances into real north-facing partial cover and attacks. The existing enemy forecast drops from exposed to covered accuracy; Move and Action are both exercised.
3. A melee fighter without an available attack advances and uses its spare Action to prepare persistent guard in the same round.
4. Planning leaves snapshots/RNG unchanged, spent Actions cannot be spent again, and full guard does not cause a pointless Brace loop.

The constrained low-health fixture uses `reach:0` to remove dodge alternatives; the cover/preparation fixtures use `reach:1`. These are deliberate fixtures of existing movement semantics, not claims that the 15 authored fights trap the crew the same way. No fixture result is mixed into the campaign balance table.

## Matrix reconciliation

The matrices are intentionally different in size, so only matched fight/heat/policy cohorts are compared:

| Run | Rows | Simulations at 12 seeds |
|---|---:|---:|
| Default fight jobs: 11 fights × 3 heats × 3 policies | 99 | 1,188 |
| Default getaways: 4 fights × 3 heats × 4 policies | 48 | 576 |
| **Default total** | **147** | **1,764** |
| Added defensive policy: 15 fights × 3 heats | 45 | 540 |
| **Opt-in total** | **192** | **2,304** |

Fight jobs retain aggressive (`fight`), careful and focused. Getaways retain straight-out (`run`), aggressive, careful and escort. The optional run adds only `defensive` to each existing fight/heat case; it does not invent focused-getaway rows or replace any baseline policy.

Every one of the 147 non-defensive rows in `defensive-12.json` equals `default-12.json` exactly as parsed JSON. The fresh default also equals the earlier preserved `scene-club-2026-11-07/instrumented-default-12.json`. Historical files were not rewritten. `comparison.json` includes file hashes and validates this equality before producing matched comparisons.

Seeds are the existing deterministic outing nonces `m0h{heat}` through `m11h{heat}`, at heats 0, 2 and 3. Each fight-job policy is compared over the same 33 fight/heat cases (396 runs per policy); each getaway policy over the same 12 cases (144 runs per policy). The 147-row and 192-row whole-matrix means are never compared as if they were the same sample.

## Measured result

These are equal-weight means of the same rounded per-case source rows across **all three heats**, not the older roadmap's two-heat figures or fresh player observations. HP lost is the existing tool's net initial-to-final crew HP measure, so any legal in-fight bandage is included; it is not gross damage before healing.

| Fight-job policy | Won | HP lost | Rounds | Fights with a down | Police | Successful Braces |
|---|---:|---:|---:|---:|---:|---:|
| Aggressive | 64.455% | 3.500 | 2.745 | 33.576% | 30.788% | 0.000 |
| Careful | 68.212% | 3.488 | 2.685 | 40.424% | 28.000% | 0.000 |
| Focused | 64.212% | 3.800 | 2.727 | 36.121% | 30.788% | 0.000 |
| **Defensive (opt-in)** | **61.576%** | **0.527** | **3.279** | **2.970%** | **38.424%** | **0.752** |

Defensive versus aggressive in fight jobs saves 2.973 HP and lowers downed-fight rate by 30.606 percentage points, while losing 2.879 win points and taking 0.534 extra rounds. It makes a real safety/clock tradeoff rather than producing a universal win advantage. The policy also changes movement, target choice and acting order, so this comparison **does not isolate Brace as the cause** of all damage reduction. A no-Brace ablation is a possible next test before making that causal claim.

| Getaway policy | Won | HP lost | Rounds | Police | Successful Braces |
|---|---:|---:|---:|---:|---:|
| Straight out | 67.333% | 1.275 | 2.583 | 19.417% | 0.000 |
| Careful | 63.917% | 0.000 | 3.475 | 36.083% | 0.000 |
| Escort | 83.333% | 0.000 | 2.667 | 16.667% | 0.000 |
| **Defensive (opt-in)** | **45.167%** | **0.233** | **3.567** | **54.833%** | **1.567** |

The defensive policy is worse than escort for getaways, by 38.166 win points in these matched cases. It stays opt-in; no default promotion is recommended. All 45 scenario/heat cohorts show a nonzero average successful Brace count, and no policy/scenario row is stuck at the 40-iteration guard.

## Telemetry and limits

Existing measured fields remain: win/withdraw/loss/rout/police rates, rounds, HP lost, downs, downed-fight rate and successful Brace/Move/attack commands. New defensive rows additionally record average successful Braces chosen with immediate incoming intents, Braces chosen as spare-action preparation, and Braces whose shared worst-case forecast changed from down to standing. The last is explicitly a **decision forecast**, not measured saved lives. It is zero in the authored samples, even though the constrained survival fixture proves the legal case.

Successful commands and decision components are rounded per-row averages; component means can differ slightly from total Brace mean after rounding. Per-seed raw outcomes were not retained by this measuring tool, so exact total command counts/confidence intervals are not reconstructed from rounded rows. Bandage and reload command counts were not instrumented, although the policy can legally use those actions; their contribution cannot be separately inferred from the current summary. No injuries/recovery after campaign receipt settlement, wall-clock duration, device performance or owner acceptance was measured here.

Threat scoring is conservative and approximate: the shared combined-threat preview consumes guard as though earlier announced hits land, and the policy then chance-weights those views. It does not solve the full hit/miss tree, explicitly price all weapon noise or predict the rout boundary. Police are answered with the same BACK_OFF behavior as the baseline policies. The trace path now answers police too, matching the batch loop rather than hanging on an unresolved police prompt.

## Reproduce

From the repository root, with no `RULES` or `CAREFUL_DODGE_FIRST` override:

```
node web/test/defensive-policy.mjs
node web/test/defensive-policy-report.mjs
node web/test/tactics.mjs
node web/test/c19-outing.mjs
node web/tools/fight-balance.mjs > default-12.json
DEFENSIVE_POLICY=1 node web/tools/fight-balance.mjs > defensive-12.json
node web/tools/defensive-policy-report.mjs default-12.json defensive-12.json 12 design/evidence/scene-club-2026-11-07/instrumented-default-12.json > comparison.json
TRACE=door:hit-courtyard-ledger POLICY=careful node web/tools/fight-balance.mjs
TRACE=door:hit-courtyard-ledger POLICY=defensive node web/tools/fight-balance.mjs
```

The saved courtyard traces use the same `trace` nonce for both policies; that trace seed is separate from the `m0`…`m11` sample matrix. The defensive trace records actual selected decisions and commands, including legal guard preparation followed by attacks. Fixtures, analyzer validation and the existing tactics/C.19 outing tests pass; logs are preserved here. CI, a 30-seed defensive run and a no-Brace ablation remain follow-up checks, not completed results.
