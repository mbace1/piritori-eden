# The first two minutes

Owner, 2026-09-27, asked what the first two minutes should feel like: *"You
tell me and let's see how far we are."* This is that answer. It is a target
and a measurement, and v4.57 is the first pass at closing the gap.

## The target

**What should grab you:**

1. **A real place at night:** Kallio 2003 on a lit map, with trams and street
   names, not a menu.
2. **A person and a choice with a price on it:** the first bag, €45, in a
   drawn scene.
3. **Money that moves:** €160 → €115 → €183, and you *feel* the +€23.

**What you should understand by 2:00, without reading a manual:**

- I am Aatami. I stand somewhere, and the story waits somewhere else.
- I get there myself (TRAVEL), and the day moves only when something happens.
- Buy low here, sell high there. Choices have prices, and the ledger records
  them.

**The rule that makes both possible:** at every moment there is exactly
**one lit thing to do**, and it is on screen without scrolling. Everything else
on the screen explains; one thing acts.

## How far we were (v4.56, measured)

A cold walk that follows only what the screen offers (`captures/cold`):

- **Steps with no lit action in view:** 3 of 11 on desktop and 5 of 11 on a
  390×844 phone.
- **Every time the story moved the lead,** the copy said *"go to the newly
  highlighted anchor"* and offered no button. The player had to know to tap a
  circle on the map.
- **On a phone,** ENTER and TRAVEL HERE sat below a 165px header and a
  map-sized board.
- **Returning to the map landed mid-page,** with the map scrolled away.
- **In the first encounter on a phone,** the scene art pushed every choice
  below the fold.
- **Money changed silently:** €115 → €183 was a digit swap in the corner.
- **Jargon:** "PUBLIC ANCHOR", "anchor".

## What v4.57 changes

- **The next-step bar.** It is pinned above the command bar on the route
  screen at every width, and holds exactly one lit action derived from the
  state:
  - ENTER · *the encounter* when Aatami is at the lead;
  - TRAVEL TO *the lead* when he is not (this plans the journey);
  - TRAVEL when a journey is planned.

  The bar only routes to the ordinary actions, so M1/M2's contracts are the
  ones already gated. The side panel keeps its buttons, but they are no longer
  lit. The opening is one step shorter: there is no hunting on the map.
- **A new screen starts at its top.**
- **Phone encounter:** the scene takes a third of the screen, not half.
- **The phone header** loses the repeated eyebrow and sets the wordmark on one
  line.
- **Money moves:** the cash card counts to the new value, pulses, and names the
  change (**+€68**, **−€45**). It shows a still value under reduced motion.
- **Plain words:** "Travel to Siltasaari"; no "anchor".

**After (cold walk):** every route step, at 390×844, 844×390 and 1280×800,
has exactly one lit action in view, and it is the step the story needs.
`web/test/next-step.cjs` holds this (57 checks), including that planning
through the bar changes nothing and arriving is free (D002).

## Still open against the target

- **Sound.** The first two minutes are silent. A tram bell, the till and
  street rain would do more for "a real place at night" than any pixel. There
  is no audio system in the city build yet.
- **The opening beat.** Begin drops you straight on the map. A 5–10 second
  arrival (the tram pulling into Piritori, Aatami stepping off) would sell
  both the place and "you are here" before the first tap.
- ~~**Arrival and transit events**~~ — shipped in v4.58 (`road.js`): every
  third or fourth journey from story block 2, a surprise, a bit of time on
  the clock, low-end hustle first.
- **Owner and device acceptance.**
