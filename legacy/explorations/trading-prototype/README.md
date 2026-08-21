# Trading prototype — PARKED

Status: **superseded before completion, 2026-08-16.** Kept for its writing, not
its architecture. Nothing here is the direction of the project.

## What this is

A first pass at Piritori → Eden written *before* PR #269's brief was read: a
Drug Wars-style trading game over a static metro-diagram picture of Kallio.
Travel a station, the evening ends, prices reroll, a news bulletin moves
tomorrow's market.

## Why it is parked

It contradicts `../../BRIEF.md` on the project's central claim, in three ways:

1. **It is a menu.** The brief puts Drug Wars' "menu-only presentation" on the
   explicit do-not-copy list. This is a buy/sell counter with a picture above it.
2. **Nothing flows.** The brief's core idea is that ordinary people and hidden
   payload share one graph and one capacity. Here the map is a diagram, not a
   simulation — no agents, no queues, no bottleneck, no camouflage.
3. **One product.** The brief requires Piritori and Toko Move to be playable
   from the first slice off a shared neutral core. This has no seam at all.

The deeper lesson, worth keeping: arbitrage resolves instantly and flow resolves
over minutes, so bolting them together lets the instant layer win the player's
attention and reduces the moving city to wallpaper. This prototype is what that
failure looks like about an hour in. The fix is to make **latency the price
mechanism** — a load arrives later and sells into a market that moved while it
was in transit — so throughput becomes the arbitrage instrument rather than a
gate in front of it.

## What survives

`js/data.js` is architecture-independent and should be lifted rather than
rewritten:

- **eight Kallio nodes** with real geography and a reason to exist — Piritori,
  Kurvi, Vaasankatu, Kuudes linja, Kallion kirkko, Karhupuisto, Hakaniemi,
  Sörnäinen;
- **the contacts** — Jaska, Toko Slomo, the McCormicks, Igor;
- **the wire** — bulletins read by an Arvi-style anchor, split into market
  movers (effect lands the day *after* it airs, which is what makes tomorrow's
  bulletin worth hearing tonight) and period colour;
- **the story beats and the ending matrix**, including the timshel line the
  whole thing is built on: *sinä saat*.

`js/palette.js` (night paper, one metro-orange accent) is also portable.

Everything else — `market.js`, `map.js`, `main.js`, `index.html` — is the parked
architecture and should be read as a record, not reused.

## Running it

Open `index.html` from a local server. It is not wired to the arcade hub and
must not be listed there. `window.__pt` exposes the run state.
