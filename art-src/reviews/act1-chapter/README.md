# Act I chapter rehearsal — review only

A clickable chapter planning tool at `art-src/reviews/act1-chapter/`. It reads the actual authored content and executes isolated real-model fixtures. It does not read/write campaign storage, change a runtime rule, approve art or advance the ROADMAP completion estimate (48%). Companion review sections and the shared workbench are linked at their agreed relative paths; they become available when the separate review branches are assembled.

## What is concrete

- All **20 scheduled blocks / 10 days / 17 authored encounters**, plus three free door blocks, are selectable. Openings, choices, requirements, effects, sites, mission signals and deadlines come from `content/era1-slice-v1.json` and `content/act1-story-v1.json`.
- The shipment fixture calls the real `attemptChapterEnding()` against an in-memory state at the authored Sörnäinen harbour. Cash/goal gates, deterministic clean/messy/lost result, stake, gear/upgrades/arrests and duplicate refusal are real model results. They are fixture outcomes, **not a full playthrough or bot balance measurement**.
- Chapter carryover calls actual `turnPlan()`; the four Pasila scenario forecasts call `forecastEnding()`. Chapter 2 remains unauthored.
- Existing C.19-integrated game routes are linked for the door fight, getaway and Bear Path. This review has no combat-card replacement or fake battle outcome.
- Eight bounded production plans retain ROADMAP milestones, dependencies, acceptance criteria and required tests. Checkmarks mean reviewed this session, not implemented or accepted.

## What remains proposed

The container-versus-van assignment sketch uses the existing authored quay/container/van and crew competencies. It does not invent another location, a boss, route odds or reward formulas. Keeping hands at the container versus reserving an extraction hand is a **qualitative proposal**; current operation simulation deliberately ignores it. The owner choice between a crew/route decision and a played fight remains open.

The D002 calculator uses the roadmap's 30% per trip/seller-visit direction and exact integer-tenth arithmetic. It compares today's zero trip/trade **block** cost with the proposed cost for chosen counts. Carrying a remainder into the next block is a review assumption. Road-event minutes remain separate. This does **not** simulate deadlines, interest, wages, door windows, fight caps, mission availability or a complete ten-day run, and makes no reachability claim.

## Source findings to resolve before finale implementation

1. `state.js`'s operation resolver reads recruited roster count, previous arrests and a deterministic seed. It does not read a shipment squad, route, competencies or current local pressure. The UI exposes this clearly rather than making the proposal secretly affect an old rule.
2. The original review found ROADMAP’s fence-only wording disagreed with the existing market/route income calls. Main v4.97 (`0587dae`) corrects ROADMAP and the chapter panel to market, route and fence sales; mission payouts remain excluded. Model checks still verify those existing paths. The fixture labels its field **chapter income**, separate from cash stake; the correction changes no income rule or tuning. Historical captures retain their original baseline.
3. Authored carryover rules retain what was built and set cash to €160. The real next-chapter lookup returns no authored chapter 2. Showing a carryover plan is not completing the next chapter.

## Reproduce and evidence

```
node art-src/reviews/act1-chapter/test.mjs
node art-src/reviews/act1-chapter/capture.cjs
```

The capture script starts an ephemeral local server and uses existing Playwright tooling. `BROWSER_PATH` may select an installed Chromium. It interacts with actual review controls at **390×844** and **1280×800**, protects a campaign-key sentinel, checks the complete storage snapshot remains unchanged, checks all tabs for overflow and a 12px text floor, verifies real refusal/settlement/duplicate behavior and qualitative plan selection, and captures the eight PNGs. `verification.json` and `capture.log` record the run. No game dependency was added.

Local results: **41 model checks**, **42 browser checks** pass. Actual screenshots are `timeline-*`, `shipment-*`, `budget-*` and `gates-*`. Browser emulation does not establish physical Pixel/iPad acceptance. No merge, deployment, asset promotion or full-green CI claim is made by these local results.

Sources: [ROADMAP](../../../ROADMAP.md), [design authority](../../../DESIGN_AUTHORITY.md), [GDD](../../../GAME_DESIGN_DOCUMENT.md), [scenario atlas](../../../design/SCENARIO_ATLAS.md), [state API](../../../web/js/v3/state.js), [chapter API](../../../web/js/v3/chapter.js), [road time API](../../../web/js/v3/road.js). `implementation-plan.json` is the bounded review backlog, not a replacement roadmap.
