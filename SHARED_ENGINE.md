# Piritori → Eden / Toko Move shared engine

Status: architecture intent, not an implementation order.

## Promise

Build one neutral flow simulation and prove it through two small products from
the beginning. Do not finish Piritori and then attempt to strip drugs out of it.
That would create a reskin, not a shared engine.

Suggested repository seams:

- flow-core/ — graph, agents, routes, time, queues, events, seeds, saves and
  rendering contracts;
- piritori/ — market, debt, heat, trust, adult narrative and night presentation;
- toko-move/ — daily mobility goals, pollution, access, services and day
  presentation.

The product folders should own their entry points. Shared code must never branch
on product names.

## Neutral model

### Node

- stable id and map position;
- tags such as home, work, school, shop, transfer or service;
- demand generation;
- queue and capacity;
- product-owned metadata held outside the core.

### Edge

- mode;
- direction;
- travel time;
- capacity;
- cost;
- temporary state such as delayed or closed.

### Trip

- origin and destination;
- urgency;
- party/load size;
- allowed modes;
- optional opaque payload tag;
- current path and transfer state.

The core moves trips. It does not know whether an opaque payload is groceries,
maintenance parts, contraband or cash.

### Pressure

The neutral core exposes load, repetition, delay, failure and visibility
signals. Piritori interprets them as attention/heat. Toko Move interprets them
as congestion, service pressure and pollution. The calculation inputs can be
shared; product meaning and thresholds should not be.

### Event

Seeded data that may:

- change demand;
- alter travel time or capacity;
- open or close a node/edge;
- add a temporary modifier;
- request a product-owned choice.

Narrative text, market effects and family-friendly framing live in the product
adapter.

## Shared systems

- deterministic seeded clock;
- map graph and coordinate transform;
- node/edge authoring data;
- route creation, editing and validation;
- pathfinding and transfer logic;
- demand spawning;
- queues and capacity;
- vehicle/carrier scheduling;
- pause and speed;
- event hooks;
- save/replay snapshot;
- mobile pointer gestures;
- camera pan/zoom;
- accessibility identifiers;
- flow renderer;
- audio event bus;
- diagnostics and deterministic tests.

## Piritori-only systems

- district markets and price history;
- inventory and product classes;
- debt and interest;
- cash return;
- heat interpretation and inspection outcomes;
- contact trust;
- adult event writing;
- campaign ending matrix;
- hidden-layer presentation.

## Toko Move-only systems

- home/work/school/shop/leisure schedules;
- access and journey-completion scoring;
- emissions and pollution;
- public-service and freight goals;
- family-friendly incidents;
- morning-to-evening day arc;
- no-hard-failure or challenge-mode rules.

## Engineering constraints

- Vanilla browser modules and no build step fit the repository unless a later PR
  justifies a change.
- Simulation state and rendering state remain separate.
- Product adapters use data and hooks, not imports from each other.
- Core uses generic names: trip, payload, pressure, event, modifier. No drug,
  police, school or pollution terminology in flow-core.
- A seeded run must reproduce the same nodes, demand and events.
- The renderer may drop decorative density on weaker phones, but never route,
  queue, warning or timing truth.
- Both entry points receive the same core change in the same PR during the
  prototype phase.

## First implementation order

1. Static map plus nodes and animated people.
2. Route drawing and deterministic pathing.
3. Queues, capacity and one visible overload.
4. Two product adapters with different labels, palettes and win metrics.
5. Piritori market/debt loop.
6. Toko Move daily schedule/access loop.
7. Shared event system.
8. Save/replay and phone performance gate.

Do not begin with a full economy, Helsinki data import, narrative database or
final visual effects. The first proof is a route you draw, people who visibly
use it, and a bottleneck you can understand.

## Contract tests for the first code PR

- identical seed creates identical neutral movement in both products;
- no Piritori term appears in the Toko Move bundle or UI;
- no Toko Move-specific goal appears in Piritori;
- deleting or redrawing a route never loses an agent;
- a closed edge reroutes or visibly queues every affected trip;
- pause freezes simulation without breaking touch editing;
- all critical map states remain distinguishable without colour;
- phone viewport has no horizontal UI overflow.
