# H1 + H2 build plan: a ten-day chapter made of a spine and doors

Owner, 2026-09-29: The Long Game is greenlit ("good to go in your order"). H7 shipped as v4.64. This plan is next in that order. It is a plan, not a build.

## Where the slice is today

- **Schedule.** Chapter 1 is 7 days of 14 blocks. **Every block carries an authored encounter** (`campaign.schedule`, from enc-first-purchase through enc-jaska-last-light), so the week has no free time.
- **Chapter ending.** The Sörnäinen shipment is attempted from the ledger once the money goal is met. It is off the schedule.
- **Campaign ending.** The Pasila ledger on day 7 leads to the four endings, and `endingId` ends the campaign. Under H8 those four endings become the result of **Era I** (chapter 4). So day 7 stops being the end of everything.

## H1: chapter 1 becomes ten days

- **Days 1–7 stay as authored.** They become the chapter's spine plus its opening week. They are not rewritten.
- **Days 8–10 are new, and the spine is thin on them.** Three authored beats go there:
  - day 8: Kello's reckoning, whichever way the case went;
  - day 9: a family calls in what it thinks you owe (read from standing);
  - day 10: the shipment night, at Sörnäinen.
  The other three blocks are doors.
- **The shipment moves onto the schedule** as the day-10 night beat. The threshold still buys entry: below it, the night is a missed boat and the chapter still turns, on the operation's "lost" outcome.
- **The Pasila ledger (day 7) becomes a look ahead, not an ending.** The four endings move behind H8. Until chapter 4 exists, a played-through chapter 1 ends at the chapter turn, with a "to be continued" screen that shows the H7 plan. This is the one change a returning player will notice.
- **Numbers.** `CHAPTER_DAYS` 10 stops being a placeholder. The debt payment on day 4 stays; a second payment lands on day 9.

## H2: doors

- **A door is an offer on the map** for a block the spine leaves free. There are 2–3 per free block. Taking one costs the block, as an encounter does now. The others close at nightfall, and those marked *late* close at 22:00 on the block clock (H7's minutes).
- **Doors are templates, not scenes.** `content/doors-v1.json` holds six kinds: gig, pickup, sale, favour, watch, hit. Each template has:
  - who offers it (a family, Toko, the network or the street);
  - where it can happen (anchors);
  - a risk band;
  - a briefing written the way v4.62 briefs missions (premise, steps, stakes, and "can become a fight · a way round exists");
  - effects in the ordinary grammar.
  The offer for a block is a deterministic roll from the save, like the road, so a reload cannot reroll it.
- **Doors feed the case.** A *watch* door can set a clue flag, which is how chapter 2's case gets clues from all three layers.
- **Doors read standing.** A family's doors open and close with H5's ladder. Until H5 exists, doors read the relationship numbers already in the save.
- **The hit door is the only door that can become a fight.** How often it is offered waits on owner question 23 (fight rhythm). Until then, one hit door per chapter is offered on days 8–10, and it is always telegraphed.

## Order of work

1. **Content first.** Write `doors-v1.json` with 12 templates (two per kind), a validator (`content/validate-doors.mjs`) and a node gate (`web/test/doors.mjs`): roll determinism, closing times, requirement grammar, no fights outside *hit*.
2. **Engine.** Write `doors.js` (pure: `offerDoors`, `takeDoor`). Then extend the schedule to 20 blocks (days 8–10: three spine beats and three free blocks).
3. **Screens.** Door pins on the map, a door briefing sheet, and the day-10 shipment beat. Update the next-step rail.
4. **Ending restructure.** Pasila becomes a look ahead, and chapter 1 ends in the turn plus the "to be continued" screen.
5. **Godot port.** A subagent ports it, the same way as H7.
6. **One hub release (v4.65)** carries H7's turn preview and the ten-day chapter together.

## Open until the owner answers

- **23:** fight rhythm. This sets how often the hit door is offered.
- **24:** whether Aatami fights. This sets whether he can take a hit door himself.

Neither answer blocks steps 1–4. The hit door's frequency is one number in `doors-v1.json`.
