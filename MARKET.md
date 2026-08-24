# The market — Dope Wars as an economy tied to the map

**Status: design proposal, 2026-08-24. Not canon.** Owner direction opened this:
*a market system that lets you check local prices at each location — Dope Wars
as an economy mini-game tied to the map.*

Nothing here overrides `DESIGN_AUTHORITY.md`, `DESIGN_LOCKS.md` or the GDD. It
implements what GDD §7.2–§7.3 already specifies and fills the part those
sections deliberately left open: **the actual model**. §12 lists what is the
owner's to decide.

There is a working reference implementation, because a market design that has
never produced a number is a wish:

```
market/model.mjs              the model — one pure function, no dependencies
market/test/model.mjs         the gate — 19 checks, bare node
market/tools/price-table.mjs  what the board quotes today, as a table
market/tools/market-plate.mjs ux/market-era1.svg — what the player sees
```

---

## 1. What this is not

`DESIGN_LOCKS.md` §9.1 and GDD §7.7 already bound this and the model does not
push at them. Goods are **abstract packs** with tier names. There is no dose,
no preparation, no concealment, no consumption, no route method and no
purity — and the model has no place to put any of them, which is the point.
The euro figures are **balance values tuned for a play curve**; they are not
researched prices of anything and must never be presented as such.

The slice trades **piri only**. The other five street-register names exist in
the model as inactive rows so the shape is right when Era I opens up, not
retrofitted later.

---

## 2. The one structural decision

> **A price is a product of named factors, never a number with a note attached.**

GDD §7.2 requires the UI to explain the dominant cause of a change — "dry
week", "station closure", "old quote". The obvious implementation computes a
price one way and writes an explanation another way, and those two drift the
first time somebody tunes a constant. Then the game starts lying quietly, which
is the failure mode this whole repository keeps paying for.

So:

```
marketMid = base × f_site × f_day × f_hour × f_shock × f_drift
```

and the **explanation is just the factor furthest from 1.0 in log space**. It
cannot disagree with the number, because it *is* the number's largest term. The
rule that falls out of that is worth stating on its own:

**If a cause cannot be named, it cannot be in the price.**

The only unnamed term is `f_drift`, a small seeded jitter, and it is explicitly
barred from ever winning the explanation — "no reason" is not something the UI
is allowed to say. When every factor is quiet the offer says so: *"nothing much
moving it."*

`market/test/model.mjs` asserts this over 1,092 offers, so it stays true.

---

## 3. A place's market comes from what the place is

The board already says what each anchor is for — `market`, `nightlife`,
`residential`, `docks`, `crowd-source`, `faction`. The profile is **derived from
those roles**, not hand-authored per node:

| from roles | means |
|---|---|
| **demand** | what buyers here will bear |
| **supply** | how easily stock reaches here |
| **liquidity** | packs you can move before the price turns against you |
| **volatility** | how much the week and the hour swing it |
| **spread** | the gap between what they sell at and what they buy at |
| **watch** | exposure — feeds §6.6 pressure, not the price |

This keeps pillar §2.2 honest: the economy is attached to places rather than
sitting in a spreadsheet beside them. It also means **a new anchor gets a market
the moment it gets a role**, and that a designer changing Vaasankatu from
`shops` to `nightlife` changes its economy without touching the market at all.

Every profile is clamped. A node with five roles must not end up with three
times the demand of a node with two — roles say *what* a place is, not *how
much* of it there is.

What that produces on the real board, unedited:

| | buy | sell | spread | liquidity | why |
|---|---:|---:|---:|---:|---|
| Sörnäinen harbour | €40 | €32 | 20% | 5.0 | well supplied here |
| Piritori / Kurvi | €49 | €46 | 7% | 5.3 | well supplied here |
| Hakaniemi | €53 | €50 | 6% | 6.2 | quiet midweek |
| Siltasaari | €73 | €58 | 23% | 2.0 | thin supply here |
| Karhupuisto | €85 | €71 | 18% | 2.8 | thin supply here |
| Torkkelinmäki | €93 | €66 | **34%** | **1.0** | thin supply here |

The harbour is cheap and deep; the residential hill is dear, illiquid and has a
third of its value eaten by the spread. Nobody wrote those rows — they fall out
of `docks + industrial` against `home + family + residential`. **Torkkelinmäki
is a bad place to trade and a good place to live, and the model knows that
without being told.**

---

## 4. Information is the resource, not money

GDD §7.3 gives three levels. The mechanic worth having is that **they are not
three sources — they are one observation perishing.**

| level | what you see | how you get it |
|---|---|---|
| **Quote** | exact buy/sell, stamped with the block | asked a person, in the place |
| **Range** | a band that always contains the truth | an ageing quote, or a decent contact |
| **Rumour** | direction only — *dear*, *cheap*, *ordinary* | a call, an SMS, a bar |
| **Nothing** | the place is a cross on the map | never worked it |

**Age sets a ceiling; it does not push you down a ladder.** The first version
stepped down from whatever level you held, which meant a two-block-old rumour
had already decayed to nothing while a nine-block-old quote was still readable —
exactly backwards. A vague thing does not get vaguer as fast as a precise thing;
it is already vague and stays roughly true for a while. So `precision(age)` is
the best any observation can be at that age, and what you hold is the worse of
that and what you were told.

A **range never excludes the true price.** The band is generated around the
truth and widens with age. That matters: a player must be able to trust the band
even when they cannot trust the middle, or ranges become noise and everyone
ignores them. The gate checks every band it can generate.

---

## 5. The loop

1. **Stand somewhere and ask.** The location board gives an exact quote for
   here, plus what your ledger still believes about everywhere else.
2. **Read the ledger.** Places sorted by what you'd clear per pack, each row
   carrying its level and its age. Some rows are just `"dear"`. Some are blank.
3. **Decide what you don't know.** The best-looking row is often the oldest one.
   Going to look costs a block; being wrong costs the trip.
4. **Travel.** This is where the map does its work — see §6.
5. **Sell into a market**, which lowers what it pays you next time, and raises
   the pressure on that node.
6. **The information you just spent a day gathering is now a day old.**

The mini-game is not "buy low, sell high". It is **deciding how much you are
willing to pay to stop guessing.**

---

## 6. This is what the transit layer was for

`TRANSIT_LAYERS.md` built real HSL geometry, real stops and a real timetable
model. The market is the thing that makes travel time *cost* something.

- **Distance is time, and time is decay.** A quote is fresh in the block you
  took it. Crossing the board is a block. So the arbitrage you saw at Piritori
  is, by construction, a little less certain by the time you reach Karhupuisto.
- **The tram timetable is the price clock.** In Timetable and Live rate modes
  (§4.1 of the transit doc) missing a tram is not flavour — it is a block, and a
  block is a decay step. Waiting for the 9 because the 3 does not go where you
  are going is an economic decision.
- **The transfer is the risk.** §4.2 puts the encounter roll on the wait. The
  market gives that wait a number: you are standing on a platform holding
  something, watching a margin age.
- **Corridors explain shocks.** A `station closure` shock on Hakaniemi is not an
  abstract event — it is the metro works we can point at on the map, and the
  crowd it reroutes is why Hakaniemi's price moved.

None of that needs new systems. The transit layer already emits the block cost;
the market already consumes blocks as decay.

---

## 7. Saturation, and the exploit that taught it

Dope Wars let you farm one pair of towns forever. GDD §7.2 already asks for
"recent player saturation"; this is it, and **it is asymmetric**.

The symmetric version was a genuine exploit rather than a rough edge. Applied to
the mid price, dumping stock into a place lowered *both* sides of its book — so
the node you had just flooded became the cheapest place in the city to buy from.
A simulated fortnight collapsed into a pump-and-dump ping-pong between
Torkkelinmäki and Siltasaari at over 100% margin:

```
day 2  SUVILAHTI → TORKKELINMÄKI      €146.2      <- dump into a liquidity-1 block
day 3  TORKKELINMÄKI → SILTASAARI      €34.7      <- buy back the place you flooded
day 4  SILTASAARI → TORKKELINMÄKI     €137.1
day 5  TORKKELINMÄKI → SILTASAARI      €64.6
```

*(Those four lines are the original measurement, taken against the old €120
base. They are left at the scale they were measured at rather than halved to
match §12's ruling — the model that produced them no longer exists, so the
numbers cannot be re-derived, and quietly rescaling a historical reading is how
a record stops being one.)*

**Saturating a market must make it stop paying, never start supplying.** So the
factor only ever moves the side that hurts: sell into a place and it pays you
less; buy a place out and it charges you more. The same fortnight now:

```
day 0  SUVILAHTI → TORKKELINMÄKI       €32.5
day 4  SÖRNÄINEN HARBOUR → LINJAT      €21.3
day 7  nothing worth the trip
day 10 SÖRNÄINEN HARBOUR → LINJAT       €4.6
day 13 SUVILAHTI → TORKKELINMÄKI       €18.0
```

Sources stay structural — the harbour is always the cheap end, because a dock
*is* the cheap end — while destinations rotate as you use them up, margins decay
from €33 to small change, and **the board can be exhausted**. Day 7 offering
nothing worth the trip is not a bug; it is the pressure that makes missions,
contacts and territory worth having.

Other things holding the loop open, none of them new: capacity bands (§7.8),
local pressure rising with volume (§6.6), the spread eating small margins, debt
settlement dates, and opening hours.

---

## 7b. The market is a side hustle; the missions are the game

> "the dope wars side is a side hustle, the big bucks come from missions with risk"
> — owner, 2026-08-24

> "a mission could be 'here are 10 units of drug x' go find buyers, not a retailer"
> — owner, 2026-08-24

That is a statement about a ratio, and a ratio nobody has measured is a wish.
`market/tools/income-curve.mjs` measures both halves. It plays perfectly — full
knowledge of every price, the best route every block, no travel cost, no
pressure, nothing going wrong — so everything below is a **ceiling**, not an
expectation.

**The side hustle, per week, played perfectly:**

| capacity | packs/block | €/week | week 1 | week 3 |
|---|---:|---:|---:|---:|
| street buyer | 2 | €252 | €358 | €211 |
| neighbourhood seller | 4 | €243 | €337 | €208 |
| network builder | 8 | €238 | €333 | €203 |

**Capacity does not help, and that is the finding.** An eleven-anchor
neighbourhood cannot absorb volume: past two or three packs there is nowhere
left to put them at a price worth the walk. Carrying more is not a way to earn
more on this board — it is a way to be carrying more when something goes wrong.
So §7.8's network stages are about **risk and access**, not throughput, and the
only way volume becomes money is a mission that brings its own buyers or its own
wholesale terms. The design did not have to be argued into that; the board says
it.

Note the decay across weeks: the same perfect play earns a third less by week
three, because you have been saturating your own board. **The trickle runs dry,
and that is the pressure that should push a player toward the missions.**

### 7b.1 A consignment is a time problem

"Here are ten units, go find buyers" is not a delivery. There is no retailer —
the difficulty is the market's own shape, and it is entirely made of saturation:
you cannot put ten units into one place, so it becomes a route across days.

| units | patience | days | revenue | €/unit |
|---:|---|---:|---:|---:|
| 5 | hold out (≥90% of base) | 1.2 | €311 | €62 |
| 5 | take what comes (≥65%) | 1.0 | €294 | €59 |
| 10 | hold out | 2.8 | €596 | €60 |
| 10 | take what comes | 2.0 | €558 | €56 |
| 20 | hold out | 5.0 | €1,186 | €59 |
| 20 | take what comes | 2.0 | €1,047 | €52 |

**Speed costs about 12%; patience costs days.** That is the whole mission in one
line, and neither side of it had to be authored — a deadline bites because the
board is slow, and dumping is expensive because dumping is what saturation is
for. A mission that says *by Friday* is now a real problem, and a mission that
adds *and the McCormicks are watching Hakaniemi* takes a node out of the route
and makes it worse.

**The ratio the owner asked for:** one twenty-unit consignment clears roughly
€1,050–1,190 in two to five days. Perfect side-hustle play clears €243 a week.
**One mission is worth four or five weeks of trading** — and the trading is not
risky, which is exactly the right way round.

---

## 8. What the player sees

`ux/market-era1.svg` is the plate. Three surfaces:

**The map shows what you know, never what is true.** A quoted node is a filled
disc with numbers; a range is a ring with a band; a rumour is a dotted ring with
a word; a place you have never worked is a bare cross with no colour at all —
because colour is information. This is the rule that keeps DESIGN_LOCKS §5
intact: the fastest way to turn Era I into a smartphone app is a map that
quietly knows everything.

**The location board** is the "check local prices here" screen: two big numbers,
the spread, roughly how much they will take, and one sentence of why.

**The ledger** lists everywhere else with its level and its age. It records; it
does not quote — every number in it was learned from a person or a place, and it
is getting older while you read it.

The plate also carries a **factor breakdown** — the six named terms as bars
either side of 1.0, with the dominant one highlighted. That panel is the cheapest
possible guarantee that §2's promise is being kept, because the sentence under
*WHY* is visibly the longest bar.

---

## 9. Determinism

Every roll is a hash of `(seed, node, good, day)`, not a live RNG. So:

- the same save on the same day quotes the same price;
- a player who walks away and comes back is not re-rolling the city;
- a test can assert an exact number;
- there is no state to sync and no server.

A different seed is a different city, which is what makes a second run worth
playing.

---

## 10. The gate

`node market/test/model.mjs` — 19 checks, bare node, no browser:

- same inputs give the same offer; a different seed gives a different one
- `sell < mid < buy` always, every price finite and positive
- the market mid stays inside its clamp under stacked shocks
- **the stated cause is always the dominant named factor**
- some offers honestly report that nothing is moving them
- selling lowers what a place pays; buying out raises what it charges
- saturation is monotone — more volume never helps you
- every anchor profile is inside its clamps whatever its role count
- information decays one way and never improves with age
- **a range always contains the true price** (390 bands checked)
- a worthwhile route exists, and **most pairs are not worth the trip**

That last pair is the interesting one: a market with no profitable route is not
a mini-game, and a market where everything is profitable is not one either.

Two bugs the gate caught rather than review: saturation escaping its bound once
it was applied outside the clamped product (a quote of **€1,090,289**), and the
bounds test then failing on a price that was not wrong — which is how the model
came to distinguish `marketMid`, the place's own price, from `mid`, the midpoint
of the book you are being shown once your own footprint is in one side of it.

---

## 11. What is tuned and what is decided

**Decided** (structural, and changing them changes the design): price as a
product of named factors; profiles derived from roles; asymmetric saturation;
age as a ceiling on precision; determinism by seed; the map showing only what
is known.

**Tuned** (numbers, expected to move in balancing): every value in `GOODS` and
`ROLE`, the clamps, the decay thresholds, the spread baseline. None of them are
load-bearing for the design, and all of them are in two tables at the top of one
file.

---

## 12. Owner rulings, 2026-08-24

1. **Base price scale: HALVED.** A pack of piri is **€60**, not €120. A good
   route clears €20–35 a pack; a bad week clears nothing. The mechanics are
   untouched — the point is the ratio: the opening debt and the exit fund loom
   larger against earnings, so campaign pressure comes from proportion rather
   than from the size of the numbers. All six goods scaled together to keep the
   tier ordering.

2. **The ledger shows the margin.** Every known row carries what you would
   clear per pack. The arithmetic is not the interesting part — the decision
   about stale information is.

3. **No haggling, except where a mission's narrative demands it.**
   > "just dope wars the game features otherwise" — owner

   The quote is the quote. The spread carries the negotiation, and relationships
   move the spread rather than opening a dialogue on every trade. A scripted
   encounter may still stage a negotiation as a beat; that is authored content,
   not a market feature, and it must never become the default path through a
   transaction.

   **This is a general steer, not one answer.** The market keeps the Dope Wars
   feature set — check prices, buy, travel, sell — and systems that would thicken
   the per-transaction loop need a reason beyond "it would be richer".

4. **Both sides of the book are shown.** "They sell at €49 / they buy at €46."
   A hidden second price reads as a bug rather than a mystery, and the spread is
   how a place's character shows: Torkkelinmäki losing a third of its value to
   the gap is the design working.

5. **The decay clock stands: 1 / 4 / 12 blocks.** A quote is exact for the
   block you took it, a range for four, a rumour for twelve, then nothing.

6. **Rumours are free for places you have worked.** Once you have been
   somewhere, someone there still rings you, so a visited anchor never falls
   below a direction however stale the last real number is. An anchor you have
   never worked stays blank however long you look at the map. That is the floor
   on ignorance, and exploration is what moves it.

7. **The market is a side hustle.** The big money is missions with risk, and
   missions are narrative beats — multi-step, multi-location, and they may be a
   consignment, a hit, a fight or a chase. §7b measures the ratio and finds one
   twenty-unit consignment worth four or five weeks of perfect trading.

---

## 13. Still the owner's

1. **The decay clock.** A quote is exact for one block, a range for four, a
   rumour for twelve. That, more than any price, decides how much of the game is
   travelling.
2. **Are rumours free?** They arrive by call and SMS. Free means a floor on
   ignorance everywhere; costed makes information political.
3. **Can money buy a remote quote,** or only a range? An exact quote for a place
   you are not standing in is the smartphone app §5 forbids.
4. **Can a runner check a price for you?** It is the main way capacity turns
   into information, and the best argument for hiring anyone.
5. **Does travel time vary by route,** or is a trip a trip on a 2 km board?
6. **Does missing a tram cost a block** in Timetable and Live modes?
7. **Does selling volume feed §6.6 pressure** directly from the market? The
   profile already computes a `watch` term the market does not use.
8. **Saturation memory** — a node currently forgets about a third of your
   footprint per day, so roughly five days to clear.
9. **Stock across days** — is holding free and only carrying risky?
10. **Era I goods rollout** — all five extra names at once, or in tiers?
11. **Alpha-PVP** — model it now, or wait for the Era II gate and its harm loop?
