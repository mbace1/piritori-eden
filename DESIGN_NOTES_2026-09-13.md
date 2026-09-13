# Piritori → Eden — Design Decisions, 2026-09-13

Status: **OWNER DIRECTION — feed into active GDD / market design**

This note captures the owner design discussion from 2026-09-13. It is intended as concise decision context for future design and implementation work. Where older proposals conflict with these owner decisions, resolve the conflict through the normal design-authority chain rather than silently averaging them.

## What we are really making

Eden is a run-based narrative strategy game in a familiar, truthful Helsinki setting with heightened/fantasy elements and darkly funny commentary on semi-big-city life and its corruption. The run structure has some high-level kinship with *Mewgenics* — systems, replay and emergent player stories — but Eden carries much more authored environment, social commentary and chapter narrative.

The *East of Eden* family tragedy is not flavour laid over the systems. It is central structure: Aatami/Adam gives way to the next generation, with the Cain/Abel pattern carried by his sons. Betrayal, loss of faith and the step away from one's own family should be readable through play, not only through authored story scenes.

**Design tie-breaker: when in doubt, the player story wins.**

## Run and chapter shape

Runs are open-ended within an authored chapter structure. Failure means starting again. Replaying an earlier chapter can be worthwhile because the player can become better prepared, gain loot or unlocks, deepen faction/family progression and then attempt the next chapter again.

Each chapter has a day/time limit. The timer creates pressure on hustling, preparation, missions and relationships without turning planning itself into a reflex game.

Era I is geographically and historically bounded around the established Helsinki neighbourhood scope in 2003. Era II moves the generational story forward to the modern period already established by the GDD (2024-era direction). Keep the geographic and period constraints meaningful rather than simulating an unlimited city.

## Core play rhythm outside battle

The player reads the map for mission goals and local market opportunities while keeping larger narrative goals in mind.

The basic grind is:

**hustle the market → travel → haggle/trade → build cash and equipment → recruit/build relationships → gear up → attempt dangerous missions/bosses → fight, escape or survive → deal with consequences → continue the run**

Combat is frequent and important, but preparation matters. The player can play defensively and attempt to escape battles rather than treating every encounter as mandatory extermination.

The market is not merely a detached buy-low/sell-high minigame. Hustling can improve the player's position while also changing the threat and social landscape around them.

## Market success creates attention

Economic leaps should be capable of producing actionable consequences. Aggressive haggling can itself escalate into conflict. A conspicuously good deal, large score or successful mission may attract attention because the player suddenly has more money, valuable stock, equipment or status.

Possible consequence faces include, depending on context and player choice:

- someone tries to steal what the player is carrying;
- somebody informs or involves police;
- a rival or faction begins looking for the player;
- a friend calls to warn that somebody is looking for them;
- an existing mission changes;
- a new mission, obligation or opportunity appears;
- the player is pushed toward a conversation, favour, payment, hired help, battle, avoidance or escape.

Consequences do **not** always fire immediately. Some can be immediate, some appear a few actions later, and others arrive at a natural contextual boundary. The overall weighting should favour consequences that emerge later in context so the city feels like it remembers rather than like a slot machine reacting to every click.

Not every big score must be punished. Sometimes the player simply gets away with it. **You have to hustle.** Clean wins preserve hope and make risk-taking worthwhile.

A useful guiding line is:

> **The bigger the score, the louder the possible echo — but the echo is never guaranteed.**

## Risk, reward and battles

Large mission/battle payoffs can produce stronger negative attention than ordinary hustling. This creates a readable risk/reward arc: the player takes bigger chances to prepare for harder challenges, but success itself can alter what comes next.

A strong win can be cash, a unique item, a distinctive weapon, a recruit, access or another tangible change in capability. High-risk battles should justify themselves with correspondingly meaningful rewards.

Escape is a first-class strategy. Avoiding or leaving a battle should remain a meaningful option where the encounter allows it, and the aftermath can carry cost, lost opportunity, damaged relationships or continuing danger rather than simply reading as failure.

## Families, factions, teams and turf

Families/factions/teams/turf each have unlock trees. These are not simple positive progression tracks. They are a balance equation: moving toward one relationship or opportunity can move the player away from another.

Progression can unlock:

- weapons and equipment;
- recruits;
- missions;
- information and services;
- alternate strategies/routes to reaching the next chapter;
- different ways of handling consequences.

Some of this progression persists beyond an individual attempt. The important design goal is that faction progression changes **what the player can do and what stories become possible**, not merely numerical combat strength.

## Consequence response should be playable

When attention or trouble develops, the player should usually have several grounded ways to respond rather than receiving a single automatic punishment. Depending on context these can include:

- talk to a friend/contact;
- make a conversational choice;
- call in a favour;
- pay or otherwise settle the problem;
- hire help;
- prepare for and take the fight;
- avoid the fight;
- escape;
- brush the warning aside and accept the risk.

The face of the consequence can be a friend, rival, faction member, opportunist or authority figure. Which face appears should follow from the player's choices and existing relationships rather than always drawing from one generic threat pool.

## Narrative-system principle

The economy, relationships, factions, missions and combat should feed one another. A market win is interesting not merely because a number rises, but because it can change who notices the player, who calls them, what becomes available, who becomes threatened, and what the player chooses to do next.

This is the desired player-story chain:

**choice → gain/loss → somebody notices (or doesn't) → delayed or immediate social/system response → player chooses a response → relationship/mission/map changes → later consequence**

The city should therefore generate stories from success as well as failure.

## Current development emphasis

Recent production has concentrated heavily on getting the tactics/battle mechanics working. That remains important, but the next design work should deliberately flesh out the systems around combat — especially the market, travel, consequence, relationship and mission loops — so battles feel like part of Eden rather than the whole game.

The purpose of the surrounding systems is not to add simulation for its own sake. They should make the player feel that preparing for a fight, making money, taking a mission and getting away with something all change the human situation around them.
