# The transit layer — real lines, two eras, one engine

**Status: design proposal, 2026-08-23. Not canon.** Owner direction opened this;
nothing here overrides `DESIGN_AUTHORITY.md`, `MAP.md` or `DESIGN_LOCKS.md`, and
§6 lists the decisions that are the owner's rather than mine.

The ask, in the owner's words: real metro and tram maps over Helsinki (Era II)
and Greater Kallio (Era I); moving between locations shows the **real** tram
route; an adjacent mode — *city real-time public* — carrying live HSL service
information on the same layers, with cars kept and congestion added as a visual
band. And the sharp end of it:

> if you have "cities" open in the game app, with the tram layer open, you could
> be made to wait for the next real tram to arrive to take you to the next
> location, or even tram transfer to get to your mission in real time.

---

## 1. This is not a new system — it is the substrate §12 already asked for

`MAP.md` §12 (owner ruling, 2026-08-22) says travel is the game between fights:
exposure on top, time underneath, **predictable stops and unpredictable events**,
narrative in transit, and runs that tempt rather than confirm.

Every one of those wants a timetable underneath it, and §4.2 already cut the
seam:

> Line numbers belong to dated schedule data, not permanent geography. The
> shared engine should store corridor IDs separately from period service IDs.

So the corridor is the geography, the **service** is the period, and this
document is what fills the second half. Nothing in §4 has to change.

---

## 2. One engine, two clocks

**There is no real-time feed for 2003 and there never will be.** If the live
layer is built as an Era II feature, Era I gets a different transport system,
and the design claim that these are one city across twenty-one years quietly
dies.

So the game never asks a feed anything. It asks a **service model** one
question:

```
nextDepartures(stopId, serviceId, direction, atTime) -> [ {due, vehicle?, live: bool} ]
```

and that model has three interchangeable sources:

| source | era | where the numbers come from | network |
|---|---|---|---|
| **period** | Era I, 2003 | authored headway tables per service, per daypart, seeded jitter | none |
| **snapshot** | either | a committed GTFS extract — real stops, real timetable, no live positions | none |
| **live** | Era II, 2024– | HSL real-time (§5) | yes |

Same interface, same UI, same encounter hooks. `live: false` is the honest flag
that makes the difference visible in the corner of the screen rather than
pretended away.

**Consequence worth stating: the Era I half is buildable now, offline, with no
licence and no key.** It is Phase C work, not Era II work — real 2003 headways
for 3B/3T, tram 6 and the Hakaniemi–Sörnäinen tunnel give §12's "predictable
stops" their teeth immediately. Era II swaps a source; it does not build a
system.

---

## 2b. Era scope — and the metro that did not move

**Era II is all of Helsinki, live.** The larger board (`DESIGN_LOCKS.md` §1:
Pasila north, Kalasatama east, Downtown south, Töölö west) takes the whole feed
— metro, tram, train, bus, ferry. There is no reason to crop a feed that arrives
free.

**Era I is Kallio, with its own routes** — and one of them is not a
reconstruction at all.

> "Metro hasn't even changed since then for that area." — owner, 2026-08-23

That is the useful half of this. In the Kallio band the metro is **era-
invariant**: Hakaniemi and Sörnäinen have been open since the line did, the
tunnel between them runs where it ran, and the station names are the names.
`MAP.md` §4.2 already treats that tunnel as one public transfer edge in 2003.

So the two eras split by mode rather than by map:

| mode | Kallio 2003 vs today | where the geometry comes from |
|---|---|---|
| **metro** | unchanged | **real modern data, used directly for both eras** |
| **tram** | changed — 3B/3T became 2/3 in 2013, and routes moved with it | real modern geometry where the corridor survives; period service IDs on top |
| **bus** | changed heavily | Era II only |
| **train, ferry** | outside the Kallio band | Era II only |

**Consequence: the Era I metro needs no invention and no research ledger
entry.** It can be lifted straight from the same GTFS snapshot Era II uses, and
it will be right. That is one whole mode moved out of `MAP.md` §10's "design
inference" column and into "documented public fact", for free.

The trams are where the authoring is, and the split is narrower than it looks —
the *corridor* is mostly unchanged even where the *service* is not. Hämeentie is
Hämeentie. So the period tables carry service IDs, headways and stop sets, and
inherit corridor geometry from the same source the metro uses.

---

## 3. The layer stack

The map is drawn as a stack, and every layer above L1 is independently
toggleable. The paper register (`ART_BIBLE.md`) belongs to L0–L1; everything
above it is **ink on the paper**, drawn in code, never generated art.

| | layer | content | era |
|---|---|---|---|
| **L0** | ground | the cut-paper board: land, water, blocks | both |
| **L1** | corridors | permanent geography — `MAP.md` §4.1 corridor IDs | both |
| **L2** | services | the period's lines drawn *on* corridors: 3B/3T, tram 6, the metro tunnel. Real routing, real stop order | both |
| **L3** | vehicles | where the trams actually are, and when the next one is due | live only |
| **L4** | pressure | crowding and road congestion as a colour band on L1 | both (fictional in Era I) |
| **L5** | play | your route, exposure, pins, mission markers | both |

Two rules that keep it readable:

- **L2 is the map people recognise.** Line colours are HSL's own where the era
  has them; stop order and interchange structure are real. This is the layer
  that makes a Helsinki player say *that is my tram*.
- **L4 is never a number.** Congestion is a band that thickens and warms. The
  moment it becomes a percentage it is a spreadsheet, and `MAP.md` §6's
  separation requirements exist to stop exactly that.

Cars stay. They are L1 flow with an L4 band over them — the owner's "cars may
remain" is already how §4.3 treats road closures.

---

## 4. The waiting problem, which is the whole idea and the whole risk

Making a player wait for a real tram is the best thing in this proposal and the
one most likely to kill it. A Helsinki tram runs every 5–10 minutes in the day
and 10–20 in the evening. **Ten minutes of wall clock staring at a stop is not a
mechanic, it is a punishment**, and no amount of atmosphere fixes that if it is
the default.

It survives on two conditions.

### 4.1 Rate is a setting; the timetable is the model

Three modes over the *same* schedule:

| mode | rate | a 7-minute wait is | for |
|---|---|---|---|
| **Story** | blocks | one block, as today | the campaign. **Default.** |
| **Timetable** | ~60:1 | 7 seconds | the campaign with real headways under it — a 3B every 8 minutes *matters*, but you play at game speed |
| **Live** | 1:1 | 7 minutes | opt-in. The city clock. |

Nothing branches. One rate constant, one clock source. Story mode is what the
seven-day slice already plays like, so nothing that exists gets slower.

### 4.2 The wait must be somewhere you can act

§12.2 and §12.3 already provide this: the stops are known, what happens at them
is not, and beats belong on the journey. **The wait is when the exposure clock
runs and the encounter table rolls.** Police with a dog reach the platform while
you are standing on it holding something. A rival is on the same tram. The old
teacher sits down next to you.

That inverts the cost: waiting is not dead time before content, it *is* the
content, and choosing the slower line to avoid the busy interchange is the
decision Phase C's gate asks for.

**Live mode is therefore an ambient mode, not a hard mode.** It is the version
you leave open on a phone while you are actually on the 3B. Which is the thing
worth building this for: standing at Hakaniemi, the game says the next one is
four minutes away, and it is. At that moment the game and the city are the same
object. Nothing else in this repository can do that.

---

## 5. The data — what is settled, and what the feed still costs

The owner supplied a working Node-RED flow against the HSL feed
(`references/transit/hsl-hfp-node-red-flow.json`), which settles the question §5
used to lead with.

### 5.1 Settled: the vehicle feed is keyless

The flow connects to **`mqtt.hsl.fi:1883`, `usetls: false`, no username, no
password, no subscription key**, subscribes to the high-frequency positioning
firehose and reads `VP` payloads carrying everything the map layer needs:

| field | is |
|---|---|
| `veh` | vehicle number — the identity that makes a tram *the same tram* between messages |
| `lat` / `long` | where it is |
| `hdg` | bearing, so the icon can point |
| `spd` | speed |
| `desi` | the designation a passenger reads — "3", "6" |
| `tst` | timestamp |

So **L3 needs no key and no account.** That removes the blocker this section was
written around: option (2) in the old draft — real trams moving on the real map
— is available, and only *routing and alerts* still want the Digitransit
subscription key. A cabinet with no server can have live vehicles.

### 5.2 Not settled: a browser cannot open that socket

Node-RED is not a browser. **Port 1883 is raw MQTT over TCP, and a web page
cannot open a TCP socket** — a static cabinet can only speak **MQTT over
WebSockets**. HSL is understood to publish one (`wss://mqtt.hsl.fi:443/`,
believed to be the same broker over a WebSocket listener), but that endpoint is
**unverified** — `mqtt.hsl.fi` is unreachable from the environment this was
written in, like every other outbound host.

**This is the one thing to check before anything is built**, because it decides
the shape of everything above it:

- if a WSS listener exists, L3 is a client-side library and ~50 lines, and the
  no-server rule survives intact;
- if it does not, live vehicles need a bridge, and that is the same architectural
  cost as the routing proxy — a real decision, not a technicality.

The flow proves the data is open. It does not prove it is reachable from a page.

### 5.3 Not settled: the topic in the flow is the old one

The flow subscribes to `/hfp/journey/#`, which is **HFP v1**. The current
structure is v2 and is far more useful here:

```
/hfp/v2/journey/ongoing/vp/<mode>/<operator>/<vehicle>/<route>/<direction>/
        <headsign>/<start_time>/<next_stop>/<geohash_level>/<geohash>/#
```

Two consequences, and they are both good news:

**The mode is in the topic.** The flow has to guess mode from `source` strings
(`hsl helmi` → bus, `hsl live` → "Train/tram") and its own comments show that
guess is lossy — trains and trams share a bucket, and it calls `node.error` on
anything it does not recognise. In v2 you subscribe to `.../vp/tram/#` and the
question does not arise.

**The topic carries a geohash, so the filter is server-side.** This matters more
than it sounds. `/hfp/journey/#` unfiltered is *the entire HSL fleet* — every
bus, tram, train and ferry in the region, roughly one message per vehicle per
second. That is thousands of messages a second arriving in a browser tab whose
job is to draw about a dozen trams in Kallio. Subscribing by geohash prefix
turns the firehose into a trickle before it reaches the page, which is the
difference between a layer that works on a phone and one that melts it.

**Both the v2 topic layout and the geohash levels need verifying** against
current HSL documentation. The flow is old enough that v1 may no longer be
served at all, so it is evidence about openness and payload shape rather than a
copyable subscription.

### 5.4 Still needs a key: routing and alerts

Unchanged from the first draft. Next-departure prediction and service alerts go
through the Digitransit routing API, which wants a subscription key that a static
page cannot hold. The three options stand, and with 5.1 settled the middle one is
now clearly the right first move:

1. **Snapshot only** — a committed GTFS extract. Real stops, routes, timetable.
2. **Snapshot + live positions** — add the keyless MQTT feed on top. Real
   timetable, real trams moving. **Recommended, conditional on 5.2.**
3. **A proxy** — full routing and alerts, and the end of the no-server rule.

Two obligations either way: HSL open data is **CC BY 4.0**, so attribution goes
on screen in the transit panel; and the offline promise means live degrades to
the snapshot without an error, which the §2 source model gives for free.

---

## 6. Decisions that are the owner's

1. **Which of the three data options** in §5.4. The feed is now known to be
   keyless (§5.1), so my recommendation is (2) — snapshot plus live positions —
   **conditional on the WebSocket endpoint in §5.2 existing.** If it does not,
   (2) and (3) cost the same architecturally and the choice becomes whether live
   routing is worth a server at all.
2. **Does Live mode want location?** A player physically in Helsinki is the case
   this shines for, and geolocation would let the game know which stop you are
   standing at. It also collects a real person's position, only helps people in
   one city, and needs a recorded decision under `NARRATIVE.md`'s people-are-not-
   scenery discipline before anyone writes it.
3. **How real is Era I allowed to be?** 2003 headways can be researched or
   invented. `MAP.md` §10 already separates documented fact from design
   inference from fictional composite; the schedule tables need the same three
   columns, and inventing a plausible 2003 timetable is legitimate as long as it
   is filed in the right column.
4. **Era II is phase-gated** (`PHASING.md` Phase E, `DESIGN_LOCKS.md` §12.1).
   Everything in §2's `period` and `snapshot` sources serves Era I Phase C and
   is not gated. Everything `live` is.

---

## 7. The safety seam extends

`MAP.md` §1 holds the line that geography is real and criminals are invented. A
live feed makes the city real in a new way, so the line moves with it:

- **No real vehicle is ever a game actor.** A tram on L3 is scenery and a clock.
  It does not carry contraband, get searched, or belong to anybody in the
  fiction. The moment a real, identifiable, currently-running service becomes a
  prop in a drug plot, this stops being a game set in a real city and starts
  being something else.
- **No real service disruption is given a fictional cause.** If the feed says
  the 3B is delayed, the game may say the 3B is delayed. It may not say why.
- Era I is fiction throughout and carries none of this, which is another reason
  the two sources are worth keeping distinct rather than blended.

---

## 8. First slice, if this is taken up

Small enough to prove the idea and refuse to build the rest until it holds:

0. **Answer §5.2 first, and it is ten minutes of work on a machine with an open
   network**: point any browser MQTT client at the WebSocket endpoint and
   subscribe to `/hfp/v2/journey/ongoing/vp/tram/#`. If trams arrive, everything
   below is worth doing and L3 is cheap. If they do not, stop and decide about a
   bridge before writing anything else.
1. `services.json` — 2003 Kallio: 3B/3T, tram 6, the metro tunnel. Stop order,
   direction, per-daypart headway. Filed against `MAP.md` §10's three columns.
2. The service model of §2 with the `period` source only. Bare node, seeded,
   testable with no browser — the shape every gate in this repo already takes.
3. L2 drawn on the existing board: real stop order, real interchanges, HSL
   colours where the era has them.
4. Timetable mode wired to the existing block clock, with the wait feeding the
   §12.2 encounter roll.

**Gate: a player who knows Kallio recognises the line before reading its
number** — and a wait at Hakaniemi produces a beat rather than a progress bar.

---

## 9. The visuals

Plate: **`ux/transit-layers-plate.svg`** — every element below drawn at size, in
the board's own palette, on the board's own card, and *looked at* rather than
described (`PHASING.md` standing rule 4: an art change ends in a picture). Authored SVG, because this layer
is **ink on the paper and never generated art**: it moves, it carries live data,
and `ART_BIBLE.md`'s paper register belongs to what is underneath it.

### 9.1 The service colours are the one loud thing on the board

The board is muted card — `#d6c5a5` paper, `#0f2934` water, ochre and umber. The
transit lines are **the only saturated colour allowed on it**, and that is not a
concession, it is how the real thing works: HSL's colours are a wayfinding
system printed on a grey city, and the board being quiet is what lets a player
find their line without reading a number.

| mode | HSL | on the board |
|---|---|---|
| metro | orange | **see 9.2 — collides with a reserved colour** |
| tram | green | the Kallio workhorse; both eras |
| train | purple | Era II only |
| bus | blue | Era II only, and drawn thinner than rail — there are hundreds |
| ferry | light blue | Era II only |

Weight carries hierarchy before colour does: **metro heaviest, tram medium, bus
thinnest.** A colour-blind player reads the network off stroke width and the
line chips alone, which is the accessibility floor this repo already holds
elsewhere.

### 9.2 One collision, and it needs a ruling

**HSL metro orange is `#FF6319`. This project reserves `#ff7a1a` as warning
orange** — applied in code, never in art, because it means something.

They are four points apart in hue and indistinguishable on a phone. Shipping
both means the colour that says *you are about to be caught* and the colour that
says *this is the metro* are the same colour on the same screen. Three ways out,
and it is §6's kind of decision:

1. **Move the warning colour.** Cleanest read, touches the most code.
2. **Print the metro rather than match it.** Era I is a 2003 paper map anyway —
   a printed metro line in the board's own umber-orange `#cc7a3e` is period-
   correct and clears the warning hue by a mile. Era II live keeps true HSL
   orange, and the era difference does part of the work. **Recommended.**
3. Keep both and separate by weight and glow alone. Cheapest, and it is the one
   that fails on a bright day outdoors.

### 9.3 Era reads at a glance: printed vs live

Same geometry, two treatments, and nobody has to be told which era they are in.

**Era I — printed.** The line is flat matte colour with a hard black keyline,
laid on the card with a 1px registration drift, exactly like everything else the
riso press touched. Line numbers are paper chips — the existing SVG already
draws one for tram 6 and it is the right object. No glow. It is a map somebody
folded into a pocket in 2003.

**Era II — live.** The same path gains a thin bright core and a soft bloom, and
vehicles run on it. The bloom is the only lit thing on a night board, so the eye
goes to the network the moment the layer is on.

### 9.4 A live vehicle, and the honesty of it

A **chip**: a small rounded rectangle in the line's colour with a hard black
keyline, a notch at the leading edge pointing along `hdg`, and the `desi` set in
the chip when there is room.

Three rules, and the third is the one that matters:

- **Interpolate between fixes.** HFP is roughly 1 Hz; a chip that jumps once a
  second reads as broken rather than as data.
- **Never extrapolate past the last fix.** Interpolation between two known
  points is drawing what happened; continuing past the last one is inventing a
  tram.
- **Decay to a ghost.** After ~15 s with no message the chip goes hollow and
  loses its colour, and the arrival it feeds drops to `live: false`. A tram that
  has stopped reporting must *look* like a tram that has stopped reporting.

### 9.5 The stop, and the one-glance truth about time

Every arrival carries the §2 flag as a mark rather than a word:

- **filled dot** — live. A vehicle is reporting and this is where it actually is.
- **hollow ring** — timetable. This is when it is *supposed* to come.

Same shape, same place, one fill. The player learns it in a day and never has to
read "scheduled" anywhere. It is also what keeps Era I honest: Era I is *all*
hollow rings, because there is no such thing as a live 2003 tram, and the map
says so without apologising for it.

### 9.6 Congestion is a band, never a number

L4 thickens and warms along the corridor it describes: a soft ochre swell at the
edge of the road, deeper and warmer where it is worse. No percentage, no
gradient legend, no colour scale.

`MAP.md` §6's separation requirements exist to stop the board becoming a
dashboard, and a congestion figure is exactly how that starts. If a player
cannot tell Hämeentie is bad tonight by looking at it, the band is drawn wrong —
adding a number does not fix it, it just moves the failure somewhere it can be
argued about.

### 9.7 The wait screen is a place, not a progress bar

§4.2 makes the wait the content, so it gets composed like a location rather than
a loading state: the platform in the paper register, the line chip, the
countdown, the exposure meter filling, and whoever else is standing there.

The countdown is **the only element on the board that ticks in real seconds**
regardless of the rate mode, because a countdown that lies about time is worse
than no countdown at all. In Story mode it counts down fast and honestly; in
Live mode it counts down in real minutes; in both it is describing the same
timetable.

---

---

## 10. The actual maps — and we have them now

Asked whether we had the real Helsinki tram maps. We did not. **We do now** —
`map/kallio-rail-v1.json`, 49 KB, extracted and committed 2026-08-23.

### 10.1 What was here already

Real WGS84 for all thirteen anchors, and the 2003 service patterns as anchor
sequences in `periodServices`, already flagged for provenance:
`metro_m_2003` is `documented`, the two trams are
`documented-service-inferred-anchor-sequence`.

What was missing was **geometry** — the board's tram lines were two hand-drawn
polylines of five and three points, schematic marks rather than the path the
rails take — and **stops**, of which the board had none.

### 10.2 Where it came from

HSL's own GTFS, reached through a mirror published with the `r5py` sample data
(`r5py/r5py.sampledata.helsinki`, `data/helsinki_gtfs.zip`, **SHA-256 verified
against the value that package publishes**). HSL's own host is unreachable from
this environment; GitHub raw is not, and the mirror is the same feed under the
same licence. 36 MB in, 49 KB out.

`map/tools/gtfs-extract.mjs` does the work and is committed with it, so the
extract is reproducible rather than a thing that appeared: routes filtered to
tram and metro, one shape per line per direction (the longest, which is the
full-length working rather than a short turn), clipped to the production
boundary, Douglas–Peucker at ~2 m — under the width the line is drawn at, so
the simplification is invisible at every zoom the board has.

It deliberately never opens `stop_times.txt`. That file is **472 MB** of every
departure of every trip in the region, and the board does not want a timetable:
§2's `period` source authors Era I headways and Era II asks the live feed.

**26 line directions, 287 stops.** Metro M1/M2/M2M; trams 1, 2, 3, 4, 5, 6, 7,
8, 9, 10.

### 10.3 It agrees with the board, and that is a check on both

Neither file knew about the other — the anchors were placed by hand from public
sources, the geometry came out of a feed — so laying them together tests both.
`map/tools/rail-anchors.mjs` does it, needs no network, and reports:

| | |
|---|---|
| Siltasaari | **3 m** from tram 3 |
| Alppiharju | **14 m** from tram 3 |
| Karhupuisto | **16 m** from tram 9, **11 m** from the metro |
| Linjat / Hämeentie | **17 m** from tram 3 |
| Piritori / Kurvi | **17 m** from tram 1, **28 m** from the metro |

**Ten of thirteen anchors sit within 150 m of a real tram line.** The three that
do not are right to be: Torkkelinmäki is a hill between two lines, and the
harbour and Suvilahti had no tram then and have none now. The board was placed
well.

Plate: **`ux/kallio-rail-check.svg`** — the extract drawn against the anchors.

### 10.4 Two things I got wrong, recorded because both produced confident errors

**Distance must be point-to-SEGMENT, not point-to-vertex.** The extract is
simplified, so a straight run can be 400 m between kept points, and an anchor
beside the middle of one measures far from both ends while being metres from
the line. Hakaniemi read as 180 m that way; it is 35 m.

**And I doubted the data before I doubted my mental model.** The metro comes out
11 m from Karhupuisto, which I called suspicious on the grounds that the tunnel
runs under Hämeentie, well east. It does not — between Hakaniemi and Sörnäinen
it bows west through the Kallio blocks, and the 44 published shape points say so
plainly. The feed was right and I was wrong, which is the argument for checking
numerically instead of by eye.

### 10.5 The routes, per line — and a rule I had to fix to get them right

Geometry is not a route. `anchorSequence` on each line is the bridge: which of
the board's anchors it passes, in order. Plates: **`ux/kallio-routes.svg`**, one
panel per service, and **`ux/tram9-kallio.svg`** for one line at street level
with its real stop names.

**THE FIRST VERSION OF THIS SECTION WAS WRONG, and the bug is worth keeping.**
The extractor picked the *longest* shape per route and direction, on the
reasoning that short workings are short. **Diversions and depot runs are
LONGER**, so "longest" reliably picks the rarity: tram 9 came out running via
Kallion kirkko on a shape used by **37 trips**, while the route **695 trips**
actually take goes another way — and a finding was written on top of that before
anybody looked at the trip counts. The rule is now MOST TRIPS, which is the only
one here that is about how the city is used rather than about geometry.

| | route through the board | trips |
|---|---|---|
| **3** | siltasaari → hakaniemi → karhupuisto → kallio_church → harju → alppiharju | 696 |
| **9** | siltasaari → hakaniemi → karhupuisto → kallio_church → harju → vaasankatu | 709 |
| **7** | siltasaari → hakaniemi → linjat → piritori → vallila | 1382 |
| **6** | siltasaari → hakaniemi → linjat → piritori | 659 |
| **1** | harju → vaasankatu → piritori → vallila | 563 |
| **8** | harju → vaasankatu → piritori | 640 |
| **4** | one corner only | — |
| **2, 5, 10** | clip the box, serve nothing on it | — |

**Both of the board's 2003 inferences are corroborated, and now by the right
lines.**

`tram_6_2003` guessed `hakaniemi → linjat_yard → piritori`. Measured modern 6:
`siltasaari → hakaniemi → linjat_yard → piritori`. The inference is a clean
sub-sequence.

`tram_3b_2003` guessed `hakaniemi → kallio_church → karhupuisto → harju →
alppiharju`. Measured modern **3**: `siltasaari → hakaniemi → karhupuisto →
kallio_church → harju → alppiharju`. **The same anchors and the same
endpoints** — kirkko and karhupuisto are 200 m apart, so which is passed first
is inside the 150 m tolerance and not a real disagreement. And 3B is line 3's
own ancestor: the 3B/3T lettering became 2/3 in 2013.

So the board's inferred 2003 routes are not merely plausible — they are the
routes that still run, on rails that were there then. `MAP.md` §10 can move both
from *design inference* toward *documented*, with this extract as the citation.

### 10.6 `anchorSequence` means PASSES, not CALLS AT — and for the metro that is everything

The metro's sequence reads `siltasaari → hakaniemi → karhupuisto →
torkkelinmäki → piritori`, and only two of those are stations. **The tunnel runs
under Karhupuisto, Torkkelinmäki and Kallion kirkko and stops at none of them.**
In the Kallio band the metro calls at Hakaniemi and Sörnäinen, full stop.

A 150 m proximity test cannot know the difference, so the field says so in the
data itself (`source.anchorSequenceMeans`). **A game that lets you board the
metro at Karhupuisto is wrong**, and it would be an easy and completely
invisible bug to write — the sequence looks like a stopping pattern and is not
one. Calling points come from `stops.txt` and the route's stop list, which is
the next extract if the layer is built.

### 10.7 A decision this forces: stops are not anchors

287 stops against 13 anchors. Drawing only anchors keeps the board clean and
throws away the recognisability that is the whole point; making every stop
actionable adds nodes nobody authored content for.

**Recommendation: draw them all, make only anchors actionable.** Real stops
render as small marks on L2 with their real names — Hakaniemi reads as Hakaniemi
*because* Sörnäinen is visibly three stops along. A player sees a true map and
plays a curated one, which is what `MAP.md` §2's production boundary already
does for geography.

### 10.8 What is still not here

**The feed is dated 2022-02-22.** It is real HSL data and right for geometry,
which barely moves, but it is not this week's timetable and must not be
presented as one. Refreshing it is one run of the same extractor against a
current feed, on a machine that can reach HSL directly.

**Era I service patterns are still `periodServices`** — this changes nothing
about them. The geometry is modern, used for Era I under §2b's argument; the
2003 lines that ran on it stay inferred, and stay labelled as inferred.
