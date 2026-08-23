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
