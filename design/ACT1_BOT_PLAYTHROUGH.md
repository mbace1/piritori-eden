# Act I, chapter 1, played by bots (ROADMAP G4 groundwork)

Owner, 2026-11-01: *"Run bots through act1 and rate all parts of each chapter."*

Build: **Act I v4.95** (`main` at `273ee4c`). 32 runs, all ten days, all closed.
Pictures: `design/ACT1_CH1_BLOCKS.jpg` (the 20 blocks) and
`design/ACT1_CH1_SYSTEMS.jpg` (the systems and endings), both phone-sized.

**Only chapter 1 exists to play.** Act I's other chapters ("A place in the
neighbourhood", "What stays behind") are proposals in `ACT_I_NARRATIVE.md`
(the Act I chapter plan); nothing of them is authored, so nothing is rated.

## How the bots play

`web/tools/act1-bot/bot.cjs` plays the real city in Chrome through its own
buttons (`data-action`), following the "next step" bar the way a new player
would, and choosing by personality:

| Bot | Runs | Chooses |
|---|---|---|
| story | 2 | the first open choice |
| random | 16 | any open choice; visits and the side case sometimes |
| hustler | 4 | the choice that pays most |
| cautious | 4 | the choice that avoids a fight |
| trader | 4 | as hustler, plus 2 buy-and-sell loops a block on the LEDGER tab |
| farmer | 2 | as trader, but 15 loops in one block, to test the market's limit |

A fight is handed to Night Shift as the game does it (`crew-run/?campaign=1&outing=…`).
The bot answers that page with a stand-in that loads Night Shift's own `run.js`,
plays the fight with the careful or careless player of `web/tools/fight-balance.mjs`
(the fight-measuring tool), and settles it with `run.js`'s own `settle()`, which
writes the receipt into the campaign save. Only the 3D drawing is skipped.

```
NODE_PATH=<playwright> node web/tools/act1-bot/bot.cjs out/a.jsonl story 1 random 11 trader 41
node web/tools/act1-bot/analyze.cjs out content/era1-slice-v1.json
```

The bot starts the repo's own `web/tools/serve.mjs`, which serves `.mjs` as
JavaScript. A server that does not (Python's, on Windows) makes every module
import fail silently and every browser test time out.

**Not covered:** the hiring pool, the fence (v4.93's loot sale), Toko's ramen
counter and training. The bots never pressed those, so they are not rated.

## Findings, by what a player would feel

1. **The market had no limit (closed in v4.98, below).** A farmer bot sold 30 packs in one block for
   €2,220, through the real LEDGER tab and real journeys. The sale price is the
   quote every time: `transactOffer` in `web/js/v3/state.js` (the city's rules)
   uses `offerPrice`, and the footprint the app records on a sale is never read
   by the price. Journeys cost no time yet: that is D002, the 30%-of-a-block rule
   (ROADMAP §9 answer 6), planned for G4.
2. **The finale is all or nothing.** "Run the shipment" needs €400 earned and
   €400 in hand on day 10. The 26 bots that never traded earned €0 toward the
   goal and never could run it; the 6 that traded always could, from day 4 on.
   All 6 shipments ended the same way ("The shipment got away, and something
   was left behind.").
3. **One ending.** "One more winter" in 27 of 31 readable closes, "The empty
   portrait" in 4. In chapter 1:
   - **"A door, not Eden" cannot be reached.** It needs an exit fund of €180 and
     debt of €250 or less (`forecastEnding`, state.js). The only debt payment
     in the content is "Pay debt before the exit fund" on day 7, the same
     encounter as "Ring-fence the exit fund" (`enc-pasila-ledger`), and an
     encounter takes one choice. Debt starts at €350.
   - **"A clean address, an unpaid city" needs a flawless courtyard.** It needs
     the courtyard won (+€120 exit fund) and the day-7 fund (+€120). But any HP
     a crew member loses in the courtyard leaves them critical
     (`campaign-adapter.js`, the Night Shift–to-city bridge), and the only cure
     is another choice in that same day-7 encounter.
4. **The side case hides day 8.** Four of the five choices at Kello's reckoning
   need flags set by the Thursday Load case (`content/act1-story-v1.json`). It
   opens off the guided path, and only 4 of 32 runs opened it; 28 of 32 "let
   it pass".
5. **The first firearm (day 5 night) is decided by money.** At €180, 30 of 32
   refused it.
6. **A document said something the code did not (fixed in v4.97, found independently by Codex's review).** ROADMAP's 31 October
   check-in says v4.93's fence is "the only money the chapter's goal counts".
   Market sales still count: `transactOffer` calls `recordChapterIncome`.

What works: 32 of 32 bots finished the chapter by following the next-step bar,
at about six taps a block, with no page errors. Fights on v4.95 are real
(37 fought: 29 won, 7 pulled out, 1 lost; someone down in 8; police in 7).

## Score

Average **3.15 of 5** over the 20 blocks. Strongest: the first purchase,
Jaska's two scenes, the runner, the McCormick yard, the Bear Path and the Jade
window (4 each). Weakest: the shipment (1), the first firearm and Kello's
reckoning (2 each).

## Next, for G4

Put D002 in (a trip or a trade costs 30% of a block), then run the same 32
bots again: the market finding should close and the finale should become a
question of how the ten days were spent. Findings 3 and 4 are content and
design questions for the owner, not tuning.

## Re-run on v4.99: D002 is in (a trip or a trade takes 30% of a block)

Same 32 bots, same seeds, `main` at `34f82bc`. All 32 closed, no page errors.
Picture: `design/ACT1_D002_BOTS.jpg`.

| Measure | v4.95 | v4.99 |
|---|---|---|
| Most buy-and-sell loops in one block | 15 | 1 |
| A trader's earnings toward the €400 goal | €4,244 | €1,036 |
| Day the goal is met by trading | day 4 | day 7 |
| Bots that never trade: earned | €0 | €0 |
| Shipment, for the 6 who can run it | messy 6/6 | lost 6/6 |
| "A clean address, an unpaid city" seen | 0 runs | 2 runs |

**Finding 1 is closed:** "No time left to trade this block" refused 78 trades.

**New: the shipment is a headcount, not a roll.** `resolveOperation`
(state.js) scores crew ÷ 3, minus 0.15 per arrest, plus
`rand01(state.seed, 'operation', chapter)`. Every campaign starts from
`DEFAULT_SEED` 20030101, so that roll is always −0.294:

| Crew on the roster | Result |
|---|---|
| 2 or fewer | lost (someone is arrested) |
| 3 | messy (the last stash item is left) |
| 4, nobody arrested | clean |

Under D002 the traders reached day 10 with 2 crew, not 3, so all six lost
after paying the €400 stake. ROADMAP calls the finale "one roll"; it is a
fixed rule, which matters for the finale question waiting on the owner
(ROADMAP §8 item 7).
