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

## 5. The data, and the one thing that blocks it

To verify before implementation — this environment blocks `api.digitransit.fi`,
so none of the following was checked against live docs today.

| need | source | key? |
|---|---|---|
| stops, routes, timetable | HSL GTFS static extract, committed as a snapshot | no |
| next departures, routing | Digitransit routing API (GraphQL) | **yes — subscription key** |
| live vehicle positions | HSL high-frequency positioning (MQTT) | believed keyless |
| disruptions | GTFS-RT service alerts | via the above |

**The blocker: a cabinet has no server.** `DEPLOY_SPEC.md` is unambiguous — no
SSR, no API routes, no environment variables, static files only. A subscription
key shipped in a static page is a published key. That leaves three honest
options and the choice is the owner's:

1. **Snapshot only.** Commit a GTFS extract. Real stops, real routes, real
   timetable, no live positions. No key, works offline, and is *most* of what
   the ask describes — the map is real and the next tram is genuinely when the
   next tram is. **Recommended first step.**
2. **Keyless live positions.** Add MQTT vehicle positions on top of the
   snapshot. Trams move on the map for real. Needs no key if the feed is
   genuinely open; needs verifying.
3. **A proxy.** Full routing and alerts, and it ends the no-server rule for this
   cabinet. A real cost, not a technicality.

Two obligations either way: HSL open data is **CC BY 4.0**, so attribution goes
on screen in the transit panel, not buried in a readme; and the arcade's
offline-first promise means the live layer **must** degrade to the snapshot
without an error — which the §2 source model gives for free.

---

## 6. Decisions that are the owner's

1. **Which of the three data options** in §5. My recommendation is (1) now, (2)
   when it is verified keyless, (3) only if live routing turns out to be the
   point rather than a nice-to-have.
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
