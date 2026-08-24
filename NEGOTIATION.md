# Negotiation — talking, staged

**Status: design proposal, 2026-08-24. Not canon.** From owner direction on what
happens when a conversation matters: a police stop, a mission beat, a deal that
is not an ordinary trade. It sits under `DESIGN_LOCKS.md` §2's location
interaction grammar and GDD §9; where it disagrees with those, they win.

> "Negotiations should be in the fight view with the seller on the map and you
> near, zoomed faces shown as view boxes with face talking, when conversation is
> going. Multiple choice after convo clears, convo can continue to other choices.
> Intelligence, weapons, etc. can impact otherwise unavailable choices. Example,
> (threaten with a gun), (bluff, int10), is seen next to a skill, means it uses
> some way to unlock a new option, likely better than others" — owner

---

## 1. It reuses the fight view, and that is the point

A negotiation is staged in the **isometric formation view** — the other party
standing where they are on the map, you near them, the same camera the fight
uses. Over it, **zoomed portrait boxes**: the speaker's face, animating while
the line runs.

The reason this is right rather than merely economical: **the same view means
the same stakes.** A conversation that can become a fight should not happen in a
different room from the fight. Nobody has to be told that threatening someone
here might not work — the board they are standing on already says so, and the
distance between the two figures is real information.

It also means the negotiation inherits everything the fight view already knows:
who is present, how many of them, where the exits are, who is armed.

## 2. The beat

1. **A line runs.** Portrait box up, face working, text advancing.
2. **The line clears.** Only then do choices appear — never over the top of
   somebody still talking.
3. **You choose.** The conversation continues, which may open further choices,
   loop back, or end.
4. **It resolves** into an outcome, or into the fight it was always near.

This is `DESIGN_LOCKS.md` §2's **TALK** verb escalated into a scene, not a new
grammar. Choices are contextual actions, and §2's rule stands: *verbs describe
intent; contextual buttons describe the actual commitment.*

## 3. Gated options, and the one design rule they need

An option may be unlocked by what you have or what you are — and it says so
inline, next to the choice:

```
  “I don’t have it on me.”
  (bluff, int 10)
  (threaten with a gun)                     ← needs a weapon, present
  (mention Toko)                            ← needs the relationship
```

The requirement is **visible on the option**, including when you do not meet it.
Seeing `(bluff, int 10)` greyed out is how a player learns what a build is for;
hiding it teaches nothing and reads as a missing feature.

**The rule that keeps this honest.** The owner's note says a gated option is
"likely better than others", and taken literally that collides with GDD §9.4,
which bars choices where one answer is obviously correct. The resolution is not
to make gated options weaker — it is that **a gated option is better at
something and costs something else**:

| option | better at | costs |
|---|---|---|
| *(threaten with a gun)* | ending it now, on your terms | they remember, and so does anyone watching — exposure, grievance, a door closed later |
| *(bluff, int 10)* | walking away clean and cheap | it can fail, and failing is worse than not trying |
| *(mention Toko)* | an outcome nothing else reaches | spends a relationship you cannot spend twice |

So the unlock is not a solve button — it is a **different currency for the same
problem**, which is exactly §9.4's "oppose kinds of value". A player with every
option should still have a decision.

## 4. What the fight view already gives it

- **Position is an argument.** Three of them and one exit is a different
  conversation from the same words in the open.
- **Being armed is legible before anyone says anything** — which is also why it
  raises exposure in `market/model.mjs`'s `exposure()`.
- **Escalation needs no transition.** If it goes wrong, it goes wrong here.

## 5. Where it meets the market

Ordinary trades are **not** negotiations (MARKET.md §12.3 — no haggling except
where a mission's narrative demands it). This view is for the moments that are
already scenes: a police stop, a consignment's terms, a debt settled in person,
a rival at the same stop.

Rapport earned in those scenes lands on the market as a **narrower spread**
(MARKET.md §7e) rather than a better mid — a relationship does not change what
goods are worth in Kallio, it changes how much of the gap the other party keeps.

---

## 6. Who is speaking

> "crew can talk" — owner, 2026-08-24

**A negotiation is not always Aatami's.** Any crew member present can take the
conversation, and that turns the roster into something with a use between
fights — which is most of the time.

The rule that follows is simple and worth stating flatly: **requirements are
checked against the SPEAKER, not the player.** `(bluff, int 10)` is open if the
person doing the talking has it. So a crew member who is no use in a fight can
be the reason a scene resolves without one, and *choosing who speaks becomes the
first decision in the scene* rather than a menu detail.

What it costs, so it is a decision rather than a free lookup:

- **They are the one standing there.** Exposure, and whatever happens next,
  lands on them. §7d already counts crew present; this puts one of them in
  front.
- **They have their own relationships, and their own history.** A name that
  opens a door for Aatami may mean nothing from somebody else's mouth — or
  worse than nothing.
- **They answer as themselves.** A crew member is a person with a temperament
  (§12.3), not a stat block you point at a problem. Sending the one who is good
  at threatening is choosing that the scene will contain a threat.

This is also the honest answer to "what is a low-combat crew member for". Quite
a lot, if the game is mostly conversations.

---

## 7. Failure is a scene, not a scar

> "just for that scene" — owner, 2026-08-24

**A failed bluff closes that option for this scene only.** Come back next week
and you can try it again on the same person.

That is the light-touch answer, and it has one consequence that has to be built
in deliberately: **if failure does not follow you out of the room, it has to
bite inside the room.** Otherwise bluffing is free and every player simply tries
it first, every time.

So a failed gated option must cost something immediately and visibly:

- the terms get worse, and stay worse for this scene;
- an option that was open closes — you have shown them something;
- the temperature rises, sometimes into the fight the view is already staged for;
- they remember the *attempt* even though the option returns — a relationship
  can carry "tried it on with me once" without the mechanic being locked.

The distinction worth keeping: **the option returns, the memory does not have
to.** That gets the owner's forgiving rule without making a failed bluff
consequence-free.

---

## 8. Open

1. Are portraits drawn per character, or per role with per-character marks? The
   art budget probably decides how many named speakers Era I can support.
2. Does the player see the other party's disposition before choosing, or only
   read it off the face and the staging?
3. Can the *other* side have gated options against you — does a rival who knows
   about your debt get a line you cannot answer?
