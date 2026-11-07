# Scene Club review candidate — 7 November 2026

Act I completion remains **48%**, using ROADMAP.md's existing rubric. No release, merge, art approval or physical-device acceptance is claimed.

Based on main `b114bf7` and unmerged PR #119 head `468e8fc`. Public `https://mbace1.github.io/Suds-Jack/piritori/` advertised v4.96 when fetched on 7 November. Its release receipt identifies hub `a8b1262f`; the source receipt does not establish physical-device acceptance.

## Change

The existing Jaska conversation showed labels without the forecasts carried by the ordinary choice cards. Now each enabled option shows its authored forecast; disabled options retain their requirements. The choices span the lower scene, use at least 12px text and 44px targets, and retain a bounded scroll fallback for landscape. The dialogue backdrop is opaque, and location dialogue omits redundant speaker names (UI_DIET step 3); news source labels remain. Existing artwork, rigs, animation clips, campaign choice application and C.19 are unchanged. Cache tokens advance, but the hub/release version stays v4.96 until a release.

Reference read: Toko Move v3.12's ROADMAP, VERSIONS and `js/journey.js` (`stakesOf` and the scene/card flow). Transferred principle: show the stakes at the decision, with the scene behind. No Toko art or mechanics copied.

## Reproduce

Serve the repository root on port 8781, then run:

```
node web/test/scene-club-browser.cjs
node web/tools/fight-balance.mjs > baseline-12.json
SEEDS=30 node web/tools/fight-balance.mjs > baseline-30.json
node web/tools/c19-policy-report.mjs baseline-12.json baseline-30.json
TRACE=door:hit-courtyard-ledger POLICY=careful node web/tools/fight-balance.mjs
```

`BROWSER_PATH` may select installed Chromium. `PIRITORI_CAPTURE_DIR` preserves screenshots. The new regression is also wired into the existing Act I scenes CI job. Browser fixtures use a fresh campaign at schedule index 2, choose the authored ask-envelope option, verify +300 markka/+1 Jaska trust and the flag, return to the map, then reload without applying it twice. Manual review jump: `/web/?encounter=enc-jaska-receipt` (throwaway, unsaved).

## Bot baseline

All 15 fights, heats 0/2/3, 147 scenario/heat/policy rows. Twelve seeds = 1,764 simulations; thirty = 4,410. Same rules in both runs; this is a sample-size comparison, **not** a gameplay before/after claim.

For fight jobs, careful over aggressive: +3.76 win percentage points / 0.01 HP saved (12 seeds); +2.30 points / −0.16 HP saved (30). No stuck pairs. JSON retains per-scenario win/withdraw/loss, rounds, HP lost, downs, police and rout. These simulations do not measure post-fight campaign recovery.

The careful implementation attempts an available attack before evaluating safer routes or Brace. Its threat scoring uses announced plans, whereas rivals can press on after blocked movement. The saved courtyard trace ends in three rounds without Brace. This is evidence to improve policy instrumentation and compare defensive choices; it does not prove Brace is a bad mechanic. Combat rules are untouched.

## Visual evidence

Before/after phone (390×844), after desktop (1280×800), and a real-time WebM of the existing Jaska/Aatami animations and choice loop. Existing semi-approved Aatami art remains semi-approved. Landscape 844×390 keeps a scroll fallback; physical Pixel/iPad checks remain pending. No new animation candidate was created or promoted.

## Follow-up: keyboard access and verification

Dialogue now declares a modal, cycles Tab/Shift+Tab through its enabled choices, keeps focus in the dialog during Aatami's response, updates the accessible speaker label, and restores the previous control when it still exists. Scene Club regression checks the keyboard cycle at all three viewports.

Local results: 35/35 bare-node suites pass after updating the cache-token assertion; Scene Club browser passes phone, desktop and landscape, and Aatami browser passes 16/16. The first CI run on `72524a7` failed its old `app.js?v=63` assertion after the intended cache bump to 64; that assertion is corrected in the follow-up. Other CI/browser results must be checked on the final head before claiming full acceptance.
