# Act I playtest audit — 27 October 2026

Baseline: source `7e29641`, live Act I v4.81. Ratings are provisional player-experience judgments out of 10, not test pass rates. Do not interpret a module without a rating as a failure.

## What was actually tested

A remote desktop browser played the opening purchase, previewed and committed the walk to Siltasaari, and completed the first sale. Cash was €160 → €115 → €183. The three G0 links opened the right encounters; the courtyard choice handed over to Night Shift. The remote browser could not create a WebGL context, so neither its 3D fight presentation nor physical Pixel/iPad performance was assessed. No full chapter was played. In Node, 33 of 34 `.mjs` suites passed; `c18-render-contract.mjs` expects `startup.js?v=17` while the checked-in page uses v18. This is a stale assertion, not evidence that graphics are working. The fight balance simulator ran its 15 scenarios at heat 0 and 2 with 12 seeds.

| Area | Rating | Evidence and next action |
|---|---:|---|
| Opening and atmosphere | 7 | Arrival establishes debt, Kallio and a lead. Test sound and pacing on device. |
| Map and navigation | 6 | Preview and commit work; active position remains clear. The panel repeats information and memory exposed internal encounter IDs; simplify incrementally. |
| Opening economy | 7 | Purchase and sale resolved at the authored prices, with a clear €23 margin. More market routes and long-term balance were not played. |
| Encounters and missions | 6 | First purchase and sale present understandable choices; G0 links reach their scenes. More of the chapter, including alternate paths, needs playtesting. |
| Ledger, inventory and crew | 5 | Market, objectives, recruits, equipment and obligations are present, but one screen is extremely dense. Check disclosure and clarity before restructuring. |
| Fight rules and balance | 3 | Simulator: 10 of 11 fight jobs always won by a simple rush at both heats; 4 of 4 getaways always won by walking out in 2 rounds. This is not a human playtest. |
| 3D presentation and controls | Unrated | WebGL unavailable in remote browser; test physical devices and a working WebGL environment. |
| Story and consequences | Unrated | Opening is promising, but a full 10-day run and alternatives were not tested. The roadmap notes fight loot and recovery gaps. |
| Sound, performance, accessibility | Unrated | No reliable listening, physical-device frame rate, or accessibility audit performed. |
| News, Toko, road events, finale | Unrated | Not played during this audit; existing automated checks do not establish fun or readability. |

## Plan, in playable slices

1. Remove encounter IDs from the city memory while retaining old saves and the choice text. Candidate v4.82; device acceptance pending.
2. Complete the G0 physical playtest. Measure enemy blocked movement, rout and police timing separately before tuning; keep Aatami in chapter 1 fights per the existing ruling. Treat roadmap's numeric targets as proposed, not owner-approved.
3. Playtest the ledger on a phone and make the next decision visible with less repeated text, informed by PR #111. Verify the case board does not reveal the mystery prematurely before changing its presentation.
4. Connect fight consequences and recovery, then exercise the finale and a complete 10-day run. Continue in small release-sized steps. Godot remains paused.

No owner device acceptance is implied by this audit. Review and CI are required before deployment.
