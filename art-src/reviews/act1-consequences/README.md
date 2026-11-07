# Act I consequence workbench — review candidate

A clickable nine-case before/after workbench. **Review only: no campaign save, battle simulation, runtime promotion, merge or deployment.** Act I remains **48%** under [ROADMAP.md](../../../ROADMAP.md).

Open `art-src/reviews/act1-consequences/` on a server rooted at the repository. Example deep links: `?case=victory`, `?case=withdraw`, `?case=treatment`. The review hub is linked at `../act1-workbench/`, and the encounter gallery at `../act1-encounters/`; those sibling pages are assembled by their separate review branches.

## What to click

Choose a moment, toggle **Before / Preview after**, and apply it to the isolated fixture. On combat-result cases, **Replay same receipt** asks the actual campaign adapter to apply it again. **Reload fixture** round-trips JSON through the existing restore API in memory, then allows the same duplicate check. A repeated receipt changes no cash, loot, wound, history, wage or clock entry. Recruitment also exercises the actual duplicate-hire guard.

The page never reads or writes browser campaign storage. A normal page reload starts a fresh fixture. “Reload fixture” is an in-memory review operation, not a saved campaign.

## The nine moments

These are **fixture values, not measured bot outcomes or a completed campaign run**. Cash begins at the authored €160 stake. Starting crew, pressure, injuries and illustrative terminal receipts are explicit test setup.

| Moment | Actual existing effect shown | Fixture wallet |
|---|---|---|
| Trade | `offer-piritori-buy`, €45, one pack; real transactions may repeat per pack | €160 → €115 |
| Recruitment | Existing seeded pool: Aino Laine, €15 signing fee and €15/night | €160 → €145 |
| C.19 victory / loot | Authored courtyard job +€120; runner wounded; tire iron from a downed rival; €46 night wages and +€5 debt interest | €160 → €234 |
| Withdrawal / missing | Aatami carried home wounded; Lan missing; local pressure +1; existing €46 night wage rule still includes the missing roster member | €160 → €114 |
| Police / arrest | Lan taken and removed from working roster; pressure +1; remaining crew wage €18, interest +€5 debt | €160 → €142 |
| Rescue | Authored `favour-find-them / go`: missing runner returns wounded at condition 1; one day block spent | €160 unchanged |
| Critical treatment | Authored `enc-pasila-ledger / treat-crew`: €80, critical → wounded, condition remains 1 | €160 → €80 |
| Bail | Authored `favour-bail / pay`: €120, crew member restored by the existing bail rule | €160 → €40 |
| Local pressure | Authored failed courtyard effects: pressure +1, Jade relationship −1 | €160 unchanged |

The courtyard-ledger source door is night-only. Its three receipt fixtures therefore use **Day 8 / Night** and call the real block-advance API, including nightly wages and interest. Rescue and bail start in a day block. Treatment uses the authored Day 7 / Day context and isolates the choice effects without adding an anytime clinic or advancing its story calendar. Local pressure follows the fixture's actual address; it is not territory ownership.

## What is real, proposed, or absent

**Real functions/data:** `createState`, `restoreState`, `transactOffer`, `hiringPoolFor`, `hireFromPool`, `applyCampaignReceipt`, `doorFightEffects`, `applyEffects`, `outingSpoils`, `takeLoot`, `advanceSchedule`, and authored market/door/story records. The review settlement harness mirrors the city calls using those exports. It does not import `app.js` or invoke the storage-writing tactical `settle()` entry point.

**Illustrative fixtures:** the chosen terminal combat outcome, rounds, heat, downed rivals and people affected. No fight has been played to generate those terminal receipts. Optional Kello-cut and family-event dispatch are outside this bounded harness. The painted background is an existing registered illustration; it is not a C.19 arena render. Existing approval labels stay visible and unchanged.

**Proposed UI:** compact cost strip, readable person/condition change, side-by-side desktop states, phone before/after toggle, replay/reload proof and a short route back to the city. New prose is review-tool copy, not newly authored story content.

**Not implemented here:** territorial ownership, posted corners, new battles, new healing rules, modified police timing, the finale, the approved G4 travel/trade time activation, production localization, or physical-device acceptance.

Existing-rule observations worth reviewing later: missing recruited people still incur night wages; the bail effect restores maximum condition; generated hiring uses an unplaytested signing-fee rule; job cash is not fence income for chapter progress. These observations are shown, not silently changed.

## Tests and actual captures

```
node art-src/reviews/act1-consequences/test.mjs
node art-src/reviews/act1-consequences/capture.cjs
```

- **9/9 model fixtures pass.** Three real campaign-adapter receipts reject duplicate application before and after JSON restoration, with complete state equality. A throwing `localStorage` getter proves the model does not access campaign storage. Tests also check real repeatable trading, hire deduplication, registered plate IDs and authored costs/statuses.
- **18/18 browser fixture flows pass:** nine scenarios at **390×844** and **1280×800**. Previewing does not mutate the fixture. Real effects match the projected state. Receipt/hire replays and JSON restoration remain unchanged. Each primary action is at least 44px; phone actions appear in the initial viewport. Visible text is at least 12px, there is no horizontal overflow, and browser/storage-access checks stay clean.
- **20 actual screenshots** are in [captures/](captures/), with source SHA-256 hashes and per-case verification in [verification.json](captures/verification.json). Exact local outputs: [model tests](test-results.txt), [browser/capture tests](capture-results.txt).
- Browser emulation is not physical Pixel/iPad acceptance. Existing prototype/semi-approved plates remain review assets; no asset register or approval status changes.

Preview examples: [phone victory](captures/phone-victory-after.png), [phone withdrawal](captures/phone-withdraw-after.png), [desktop critical treatment](captures/desktop-treatment-after.png), [desktop before](captures/desktop-before.png).

## Bounded implementation order

This orders review proposals inside the existing roadmap; it does not replace its milestones.

1. **Milestone 4 / City and UI:** owner reviews trade/hire cost hierarchy. Implement one real seller or hire screen with unchanged effects, clear wages, reload checks and localized strings.
2. **Milestone 5 / G2:** bring the approved compact aftermath into the real C.19 return path. Preserve both receipt and city-settlement markers, night wages, dropped-weapon rules and actual 3D combat. Test victory, withdrawal, police and replay/reload end to end.
3. **G2 recovery:** make the existing rescue, bail and treatment entry points easy to find from their consequences. Keep “home”, “available”, “wounded” and “critical” distinct. Review wage/bail observations before any rule change.
4. **Milestone 6 / G4:** enable the approved 30%-of-a-block travel/trade costs only with complete ten-day reachability runs and authored chapter/endings evidence. Resolve the finale's high-level choice separately.
5. **Milestone 7 / Release:** physical Pixel/iPad and owner visual/gameplay checks, source/CI verification, then an explicitly approved release with a matching hub receipt. No percentage increase is claimed for review fixtures.
