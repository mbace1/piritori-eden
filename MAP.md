# Piritori → Eden — Era I Kallio map specification

Version: 1.0  
Date: 2026-08-19  
Status: **ACTIVE — geographic, node-graph and map-layer authority**  
Machine-readable graph: `map/kallio-era1-2003-v1.json`  
Structural art blueprint: `map/kallio-era1-2003-v1.svg`

This pass replaces the prototype-derived ten-stop board as design authority.
The old runtime graph in `flow-core/city.js` remains useful evidence, but it is
too narrow for the locked Era I production boundary and duplicates several
places that should behave as one map cluster.

The new map keeps the geography recognisable while compressing it into one
screen. Exact public places ground the fiction. Fictional criminal services,
characters and routes are attached to broad public anchors rather than
presented as real addresses.

---

## 1. Map promise

The player should recognise Kallio before reading a label:

- Hakaniemi and Siltasaari form the low southern threshold;
- the rail edge and Alppiharju sit west;
- Harju and Vaasankatu rise north;
- Kurvi and the Sörnäinen metro entrance pinch the east-west streets;
- Vallila and industrial streets close the north;
- the former Sörnäinen harbour and water open the east;
- Kallion kirkko, Karhupuisto and Brahenkenttä orient the centre.

The board is a **relief diagram**, not a screenshot of a web map. Public
topology stays true; minor blocks, slopes and walking links may be shortened for
legibility.

### The safety and fiction seam

- No real residence is labelled as an illegal business.
- No real person is represented as part of a faction.
- Toko Slomo's Noodles, the McCormick service yard, the staffed bank encounter,
  Jaska's studio and Jade Lantern fronts are fictional composites.
- The graph models public streets and transit at district scale. It does not
  reproduce operational criminal routes or methods.

---

## 2. Production boundary and projection

Era I uses this approximate WGS84 frame:

| edge | geographic cue | value |
|---|---|---:|
| south | Siltasaari / Pitkäsilta threshold | 60.1760 N |
| north | Vallila / Sturenkatu band | 60.1940 N |
| west | Alppiharju rail edge | 24.9340 E |
| east | Sörnäinen harbour edge | 24.9740 E |

The source frame is roughly 2.2 km wide by 2.0 km tall. Source coordinates are
kept in WGS84. A local equirectangular projection supplies metres for
simulation and QA:

```
x_m = (lon - 24.9340) * 55,340
y_m = (lat - 60.1760) * 111,320
```

The art board then uses a uniform 2.35 m-per-design-unit scale with north up:

```
board_x = 60 + x_m / 2.35
board_y = 920 - y_m / 2.35
```

The visible relief may apply **no more than 12% local displacement** to labels,
minor blocks and decorative streets. Public anchors, coastline, rail edge and
major corridor order may not be mirrored or rearranged.

---

## 3. Anchor model

An **anchor** is a public place or area used to organise flow. A **site** is an
enterable authored scene attached to an anchor. Several sites may share one
anchor without producing several nearly overlapping map nodes.

This matters most at the eastern cluster:

- `piritori` represents Vaasanpuistikko, Kurvi and the western Sörnäinen metro
  entrance as one readable map anchor;
- `sornainen_metro` is a public transit site inside that anchor;
- `piritori_first_buy` is a fictional encounter at the same anchor;
- Kurvi is a label and traffic condition, not a second circle ten metres away.

### 3.1 Full Era I anchors

| id | map label | role | slice status | coordinate status |
|---|---|---|---|---|
| `siltasaari` | Siltasaari | southern threshold, staffed-bank site | active | representative public-area point |
| `hakaniemi` | Hakaniemi | market, metro, crowd source | active | public landmark |
| `linjat_yard` | Linjat / Hämeentie | nightlife/service compound | active | public yard vicinity; services fictional |
| `kallio_church` | Kallion kirkko | skyline and central orientation | landmark | documented public landmark |
| `karhupuisto` | Karhupuisto | park, bench scenes, ordinary flow | active | documented public landmark |
| `torkkelinmaki` | Torkkelinmäki | residential hill, Jaska's studio | active | representative district point |
| `harju` | Harju / Brahenkenttä | first sales, sport and street missions | active | documented public landmark |
| `vaasankatu` | Vaasankatu | Toko, shops and information | active | representative street midpoint |
| `piritori` | Piritori / Kurvi | opening purchase, recruitment, transfer | active | representative plaza point |
| `alppiharju` | Alppiharju | rail-edge expansion | locked | representative district point |
| `vallila` | Vallila | northern industrial/residential expansion | locked | representative district point |
| `sornainen_harbour` | Sörnäinen harbour | docks and eastern expansion | teaser | representative historic harbour edge |

The seven-day slice therefore has **eight active anchors**, one non-enterable
landmark, two visible locked expansion anchors and one teaser.

### 3.2 Enterable sites

| site id | parent | type | slice use |
|---|---|---|---|
| `piritori_first_buy` | Piritori | narrative encounter | opening purchase or refusal branch |
| `sornainen_metro` | Piritori | public transfer | ordinary flow and route leg |
| `toko_slomo_noodles` | Vaasankatu | narrative/service | buy information; risk sabotage |
| `jaska_studio` | Torkkelinmäki | narrative/home | family and art choices |
| `mccormick_yard` | Linjat / Hämeentie | narrative/service | crew, equipment and favours |
| `staffed_bank` | Siltasaari | narrative/service | convert old markka at a teller |
| `hakaniemi_market` | Hakaniemi | public market | crowd, ordinary trade, route unlock |
| `karhupuisto_bench` | Karhupuisto | narrative/public | recurring people and weather scene |
| `harju_pitch` | Harju | mission/public | early sale and recruitable contacts |
| `jade_lantern_front` | Linjat / Hämeentie | teaser | one restaurant-front encounter |

Site coordinates are inherited from their anchor. Scene art may show a
recognisable area, but the fictional door itself is not pinned to a real
business.

### 3.3 The 2003 Kuudes Linja rule

The real Kuudes Linja club began operating in 2005. Era I starts in 2003, so
the map labels the public area **LINJAT / HÄMEENTIE** and uses a fictional
McCormick yard in the same broad industrial-courtyard geography. A later chapter
may introduce the real period label after its documented opening; the 2003
screen must not imply that the later venue already existed.

---

## 4. Public corridors

The map graph records corridor identity and permitted movement modes. Runtime
balance derives actual travel cost; the map data does not hard-code final
mission timers.

### 4.1 Major spines

| corridor | order to preserve | map role |
|---|---|---|
| Siltasaarenkatu / Union axis | Siltasaari → Hakaniemi → Kallion kirkko | south-north landmark spine |
| Hämeentie | Hakaniemi → Linjat yard → Kurvi/Piritori → off-board northeast | tram, car and dense ordinary flow |
| Helsinginkatu | Alppiharju/Harju → Vaasankatu → Kurvi/Piritori | principal east-west pressure band |
| Fleminginkatu / Linjat mesh | Karhupuisto ↔ Harju ↔ Vaasankatu | walk and tram-facing local flow |
| Teollisuuskatu / Sturenkatu band | Alppiharju → Vallila → east | northern expansion boundary |
| Sörnäisten rantatie / harbour edge | Hakaniemi → harbour → off-board east | car, docks and waterfront flow |

### 4.2 Period public transport

- Hakaniemi and Sörnäinen metro stations were operating in 2003; the map treats
  the 900 m tunnel as one public transfer edge.
- The 3B/3T figure-eight designations are valid for this era. The Kallio-facing
  3B corridor is the visible tram loop through Hakaniemi, the Linjat/church
  area, Karhupuisto and Harju.
- Tram 6 supplies the Hämeentie flow from Hakaniemi through Kurvi toward
  Arabia. The 2003 slice renders the route only inside the production boundary.
- Line numbers belong to dated schedule data, not permanent geography. The
  shared engine should store corridor IDs separately from period service IDs.

### 4.3 Graph rules

- Walking forms the resilient base mesh.
- Tram and metro affect capacity and anonymity; they are not player-built rails.
- Road closures change both ordinary traffic and assignments.
- An anchor may be visually locked while ordinary flow still crosses it.
- A mission can activate a site without creating a new graph node.
- Route selection uses graph edges, never freehand straight lines through
  buildings or water.
- Distances come from source coordinates before visual compression.

---

## 5. Slice reveal schedule

| state | anchors |
|---|---|
| opening focus | Piritori |
| visible from first frame | Piritori, Vaasankatu, Harju, Karhupuisto, Torkkelinmäki, Linjat/Hämeentie, Hakaniemi, Siltasaari |
| landmark only | Kallion kirkko |
| visible but sealed | Alppiharju, Vallila |
| distant teaser | Sörnäinen harbour |

The complete boundary is always visible. Locked districts are not fog; they are
recognisable places with sealed service tabs. This supports the one-screen
promise and makes expansion feel geographic rather than menu-driven.

---

## 6. Visual layer contract

Back to front:

1. deep paper backing;
2. water and coastline;
3. district/landmass relief;
4. railway and major road cuts;
5. minor street/block collage;
6. public transit corridors;
7. ordinary people flow;
8. crew and goods flow;
9. local pressure/weather overlays;
10. anchors, missions and contacts;
11. selection and route preview;
12. labels and UX chrome.

### Separation requirements

- Coastline, roads, rail, districts and labels are separate source groups.
- Ordinary people, dogs, trees/grass, weather and traffic are separate runtime
  layers.
- Each anchor pin has base, state, badge, label and hit-target layers.
- Dynamic routes never bake into the relief artwork.
- Portrait uses the same world geometry, fit and cropped by camera—not a
  hand-redrawn false map.
- Hit targets are rectangular and at least 44 CSS px even when the paper pin is
  irregular.

### Map art treatment

- dark charcoal and blue-black relief card;
- grey road strips with irregular hand-cut edges;
- torn tan fibres at coast and district seams;
- limited cyan, magenta, mustard and orange for live information;
- small neutral residents as paper pips;
- restrained shadows indicating physical layer depth;
- sparse marker names on separate rough paper tabs.

The structural SVG is a geometry and hierarchy check. Final runtime relief must
use the Art Bible's material treatment and approved asset library.

---

## 7. Responsive camera

### Landscape

- Fit the full boundary inside the world area before opening the focus rail.
- Keep Piritori and Hakaniemi in the lower-right/lower-centre half.
- Labels may move within their displacement allowance to avoid the rail.
- A selected anchor may magnify to 1.35× with overview inset.

### Portrait

- Rotate nothing and rearrange no geography.
- Fit the same north-up map in the tall world window.
- Side edges may crop only after explicit zoom.
- The selected-node sheet attaches below or beside the pin and never covers it.
- `FIT MAP` restores the entire production boundary.

---

## 8. Migration from the v2 runtime graph

The v2 runtime has ten close nodes across roughly 610 × 1010 m. For v3:

1. preserve simulation interfaces while loading
   `map/kallio-era1-2003-v1.json`;
2. merge `vaasanaukio`, `kurvi` and `sornainen` into the `piritori`
   anchor with multiple sites;
3. rename the 2003 `kuudeslinja` map node to `linjat_yard`;
4. retain Kallion kirkko as landmark rather than required enterable site;
5. add Siltasaari, Alppiharju, Vallila and Sörnäinen harbour boundary anchors;
6. derive route length from WGS84/local metres rather than art coordinates;
7. keep period service metadata outside shared geography;
8. update both Piritori and Toko Move adapters without putting adult labels in
   shared data.

`flow-core/city.js` remains unchanged until the Step 7 implementation
milestone. This avoids breaking the published v2 while the v3 data adapter is
tested.

---

## 9. Validation gates

The map milestone passes when:

- every edge references existing anchors;
- every site references one parent anchor;
- anchor IDs are unique;
- exactly eight slice anchors are active;
- WGS84 points stay inside the production boundary;
- board positions are reproducible from the documented projection;
- the eastern cluster is one anchor with multiple sites;
- fiction/composite flags exist for every authored illicit service;
- the structural SVG renders at 1600 × 900 without clipped map labels;
- portrait and landscape UX can consume the same graph;
- no runtime or `gh-pages` files change during this design-only milestone.

Run:

```sh
node piritori/map/validate-map.mjs
```

---

## 10. Research ledger

### Documented public facts

- City of Helsinki Map Service — official maps, historical maps and geospatial
  datasets:  
  https://www.hel.fi/en/decision-making/information-on-helsinki/maps-and-geospatial-data/helsinki-map-service
- Helsinki City Archives guide map, 2002, CC BY 4.0:  
  https://www.finna.fi/Record/hka.139878320783000_168684056500700
- HKL route map, autumn 2003–spring 2004:  
  https://www.finna.fi/Record/fikka.3983187
- City history of Torkkelinmäki:  
  https://historia.hel.fi/fi/alueet/keskinen/torkkelinmaki
- City history of Sörnäinen harbour and industry:  
  https://historia.hel.fi/fi/alueet/keskinen/sornainen-entinen-satama-ja-teollisuusalue
- City location record for Karhupuisto:  
  https://tpr.hel.fi/TPRalusta/en/notification/info/2784/
- Kallio Church public landmark location:  
  https://commons.wikimedia.org/wiki/Category:Kallio_Church
- 3B/3T era and 2013 renaming:  
  https://yle.fi/a/3-6462625
- Kuudes Linja operating since 2005:  
  https://www.myhelsinki.fi/visit/eat-and-drink/clubbing-scene-in-helsinki/

### Design inference

- District centroids, street midpoints and the compressed board placement are
  design inferences from the official/public map references.
- Corridor sequences preserve topological order; the graph is not a surveyed
  pedestrian-routing dataset.

### Fictional composites

- all faction ownership;
- Toko Slomo's Noodles;
- the McCormick yard and its services;
- Jaska's studio;
- the staffed bank encounter;
- Jade Lantern restaurant fronts;
- missions, trade, pressure and clandestine routes.

---

## 11. Complete-run expansion frame — planning lock only

Era II requires its own sourced public-anchor graph before implementation. The
owner has nevertheless fixed the outer campaign frame:

| edge | outer area |
|---|---|
| north | Pasila |
| east | Kalasatama |
| south | Downtown Helsinki |
| west | Töölö |

Kallio remains the origin and connective centre. The later map includes no
playable area north of Pasila or east of Kalasatama. As in Era I, the full
frame is visible when the era opens while services, missions, relationships
and reliable information unlock through play.

This section defines scope, not coordinates, nodes or mission routes. It does
not authorise Era II runtime data or art before the feature-complete gate in
`DESIGN_LOCKS.md` §12.1.
