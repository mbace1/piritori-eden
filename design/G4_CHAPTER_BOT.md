# G4 step 2: the ten days, played by a bot

`web/tools/chapter-bot.mjs`, 2026-11-07, on v4.99. A measuring tool like `fight-balance.mjs`, not a gate.

**What it plays.** Every block of the chapter, the way `app.js` does:

- journeys are real journeys, so D002 charges their time and the road rolls its events;
- a free block takes a door;
- the scene is played where it stands;
- a night settles wages, Kello's cut and the families' books.

**What it cannot do is fight.** Every policy prefers a choice that starts no fight. A fight it cannot avoid is settled on its own stakes as a win (`FIGHTS=lose` for the other side), with no loot.

## The table

| Policy | What it does | Goal (€400 by selling) | Cash on the last night | Shipment |
|---|---|---|---|---|
| forward | the first open choice: buy, complete, hire, take the deal | €0 | €175 | missed |
| decline | walks away from every scene | €0 | €167 | missed |
| cash | whatever pays most in cash now | €0 | €175 | missed |
| trader | forward, plus every spare trip spent trading, with routes | €3,168, met day 3 | €574 | clean 57% · messy 43% |
| saver | the trader, but it pays for nothing it can refuse | €2,292, met day 5 | €665 | clean 57% · messy 43% |
| lean | the saver, and it hires nobody it can refuse | €1,700, met day 7 | €752 | messy 31% · lost 69% |

The shipment's odds are over 300 seeds (`SEEDS=300`). Only the operation's own roll reads the seed here, so every seed walks the same ten days to the same night.

## What it found

1. **Every block plays.**
   - All 20 blocks, on every policy: no scene without an open choice, no door block without a door, no journey refused.
   - No policy was forced into a fight. Every road event, door and scene offered a way out. **A chapter can be finished without one fight.**
2. **The story alone earns nothing toward the €400.**
   - Scenes pay cash, and cash from a scene is a payout, not a sale (v4.97).
   - A player who plays only the scenes reaches day 10 with the goal at €0, and the shipment is closed to them.
3. **A route was a hole in D002, now closed (v4.99).**
   - Re-pinning a route emptied its count. So one Piritori visit could buy, send down the route, re-pin and repeat: €3,400 counted inside one block, using 30% of it.
   - Now a route's hidden loads are counted per block, re-pinned or not: 1 to 3 packs a block, whatever ordinary traffic leaves free.
4. **With routes, €400 is small for anyone who trades.**
   - The trader meets it on day 3 and earns eight times it by day 10. The careful saver meets it on day 5.
   - **The time rule bites:** the trader runs out of time in 13 of 20 blocks. But routes carry what walking cannot.
   - Before D002 (`NOTIME=1`) the same trader earned €4,236. So D002 takes about a quarter off a trader who uses routes, and three quarters off one who does not (€910 against €3,728).
5. **For a trader, the crew decides the finale, not the money.**
   - The operation reads hands against three:
     - three hands: clean or messy, about even;
     - one hand: lost two times in three.
   - Wages are €70 a night for three. They squeeze the trader who also buys the story's things (Toko's information, the handgun, paying the debt). Without routes, that trader could not hold the stake at all; with them it can.

## For the owner (ROADMAP §8 item 7)

The gate is reachable and the time rule is in. What the €400 measures now is **whether you traded at all**, not how well. Three ways to size it, none chosen:

1. **Keep €400.** The finale is then a crew question. That fits "a crew-and-route choice with the risks shown".
2. **Raise it toward €1,500.** The careful line meets it on day 8, and spending on the story's offers then costs you the shipment.
3. **Count less of a route sale.** The route stays a tool, not the whole economy.
