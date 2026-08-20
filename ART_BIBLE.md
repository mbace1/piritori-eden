# Piritori → Eden — Art Bible

Version: 1.1  
Date: 2026-08-20  
Status: **ACTIVE — Era I production authority**  
Visual system id: `cut-cardstock-hand-ink-v03`  

This Art Bible replaces the rejected visual rules previously stored at this
path. The earlier document remains recoverable in Git history but is no longer
an active source.

Read this with:

- `DESIGN_AUTHORITY.md` for authority and publishing rules;
- `DESIGN_LOCKS.md` and `GAME_DESIGN_DOCUMENT.md` for product requirements;
- `UX_SPEC.md` for interaction hierarchy and responsive reflow;
- `art/v3/manifest.json` for the registered prototype runtime derivatives;
- `art-library/APPROVALS.md` for per-asset approval status;
- `art-library/MODULAR_CHARACTER_SYSTEM.md` for rig and socket details;
- `art-library/ANIMATION_LAYER_CONTRACT.md` for motion and layer order.

The Art Bible defines how approved direction becomes production art. It does
not upgrade a semi-approved asset to approved, change a game rule or make a
review sheet runtime-ready by declaration.

The v3 runtime register is the first extraction milestone. It preserves source
status per asset: Toko and Karhupuisto are approved baselines; modular v03
pieces are prototype extractions; the courtyard and weather remain
semi-approved prototype material. Nothing in that pack is labelled final art.

---

## 1. Visual north star

**A handmade early-2000s Helsinki: broad cut-card shapes, torn paper edges,
sparse crooked marker lines and a dark but colourful street-noir palette.**

The city should look assembled by somebody at a kitchen table from carton,
packaging, folders, receipts, old newspapers and thick marker. Forms are
simple, physical and readable. Small irregularities reveal the hand that made
them. Characters are personable caricatures, not grim anonymous soldiers.

The emotional range includes dry humour, nerves, vanity, warmth, bad decisions
and sudden danger. Night is heavy; people are not uniformly miserable.

### Five governing rules

1. **Shape before line.** A figure, building or button must read from its large
   paper masses before ink detail appears.
2. **One material family.** Map, locations, battles, characters, animals,
   weapons, props and UI all use cut paper and hand marker.
3. **Helsinki before generic noir.** Geography, architecture, trams, weather,
   clothes and period objects make the setting specific.
4. **Drama through light and composition.** Battle intensity comes from
   contrast, scale, intent and consequence—not a switch to polished fantasy
   rendering.
5. **Every useful layer stays separable.** Anything that moves, localises,
   changes state or receives input is not baked into the background.

### The sentence test

An approved asset should be describable as:

> A small number of deliberately cut paper pieces, arranged with readable
> overlap, made specific by a few imperfect marker strokes.

If the description requires “painted realism,” “perfect vector,” “tiny costume
detail,” “generic game icon” or “cardboard bevel,” it has left the target.

---

## 2. Reference lessons and boundaries

References are used for design principles, not for copied characters, layouts,
logos, brushwork or assets.

| Reference family | Use | Do not copy |
|---|---|---|
| *Darkest Dungeon* | strong silhouette, tactical focus, dark framing, readable consequence, weighty command UI | its character anatomy, exact line treatment, gothic ornament, colour script, formation UI or class designs |
| early-1990s adventure games | staged locations, concise verbs, colourful props, readable character entrances | exact interface chrome, characters, jokes, procedural traps or pixel treatment |
| early-1990s adult animation | specific noses, jaws, brows, uneven hairlines, awkward posture and deadpan personality | any identifiable series character, face, wardrobe or house line |
| physical collage and carton craft | real overlaps, torn fibres, imperfect cuts, found-print fragments and shallow relief | a single cardboard texture pasted over digital painting |
| Helsinki photo references | building rhythm, street furniture, weather, transport and period silhouette | direct photo textures, private-courtyard reproduction or unlicensed imagery |

The current battle detail ceiling in
`art-library/references/battle-detail-ceiling-v01.png` contains about **25
percent more environmental surface detail** than production needs. The
simplification floor retains the correct broad shapes but needs slightly more
facial and clothing personality. Final work sits between them:

- environment closer to the simplification floor;
- character identity closer to the detail ceiling;
- line count reduced before silhouette or expression is reduced.

---

## 3. Material construction

### 3.1 Paper families

Use material differences intentionally:

| Material | Primary use | Read |
|---|---|---|
| heavy dark cardstock | night ground, water, deep interiors, HUD backing | stable and weighty |
| coloured construction paper | clothing, route strips, buttons, props, signs | clear broad colour |
| kraft card / carton | labels, dialogue panels, walls, counters, ordinary objects | worn and human |
| printed packaging fragments | one local accent, patterned clothing insert, small prop face | social texture, never noise |
| newsprint / receipt paper | broadcasts, ledger fragments, dated notices | information and period |
| translucent vellum-like layer | fog, window glow, breath, TV bloom | atmosphere only |

Found print is subordinate to the silhouette. It may fill part of a coat, mask,
poster or building plane; it may not turn a character into an unreadable mosaic.

### 3.2 Edge vocabulary

Every asset chooses one dominant edge treatment and at most one secondary:

- clean scissor cut;
- blunt knife cut;
- lightly torn fibre;
- corrugated break;
- folded or lifted corner.

Edges are irregular at a human scale, not randomly distressed at every pixel.
Long structural lines—building cornices, tram rails, counters—may be cleaner.
Clothes, labels, foliage and temporary notices tolerate more torn variation.

### 3.3 Relief and shadow

- Use shallow physical overlap, roughly **1–3 percent of the smaller piece's
  size**, to reveal construction.
- Use one soft contact shadow per layer family, not an embossed outline around
  every piece.
- Shadow direction follows the scene's practical light.
- UI panels may lift slightly from the scene; icons lift from their panel only
  when selected.
- Do not bake floor shadows into units, weapons, props or cover. The engine owns
  ground contact.

### 3.4 Marker and ink

Ink is an accent, not the underlying volume model.

- Reserve it for eyes, brows, mouths, hands, joints, folds, seams, labels and
  one or two material cues.
- Lines wobble, taper, skip, dry out, double back or overshoot slightly.
- Repeated objects do not reuse an identical perfect contour.
- A face normally needs brows, eyes, nose, mouth and one age or personality cue;
  it does not need fully rendered cheek, pore or hair shading.
- At final device size, no essential stroke may fall below two physical pixels.

Perfect vector lines are acceptable only for invisible registration,
hit-testing and underlying geometry. Visible vectors receive an authored
paper/marker treatment or remain deliberately neutral system overlays.

### 3.5 Texture budget

At normal view, the order of perception must be:

1. silhouette;
2. colour block;
3. overlap and edge;
4. expression or state;
5. fibre, print and wear.

If fibre is noticed before pose, texture density is too high. Never add noise to
make a clean asset feel “finished.”

---

## 4. Era I palette

Era I uses a dark neutral city base with warm analogue light and a small set of
clear system accents. Hex values are production starting tokens; physical paper
variation is allowed within a narrow band.

### 4.1 World colours

| Token | Hex | Use |
|---|---:|---|
| `night-paper` | `#121719` | outer night, deepest interiors |
| `charcoal-card` | `#24282A` | asphalt, dark façades, HUD panels |
| `wet-blue` | `#183542` | water, wet shadow, cold depth |
| `plaster-grey` | `#817F75` | Kallio walls, granite transition |
| `kraft-cream` | `#C7AA79` | labels, dialogue cards, warm paper |
| `paper-offwhite` | `#E2D8C2` | primary text and light card |
| `sodium-ochre` | `#D09535` | streetlamp and window light |
| `tram-green` | `#315A4B` | Era I tram, municipal metal |
| `moss-green` | `#52664B` | parks, practical clothing |
| `brick-rust` | `#9A4E34` | brick, warm threat, worn counters |

Pure white is rare outside the Toko mask mark, the hottest TV highlight and
accessibility states. Pure black is reserved for deepest separation and ink.

### 4.2 System accents

| Token | Hex | Meaning |
|---|---:|---|
| `player-cyan` | `#38B8C8` | player route, selected ally, confirmed access |
| `goods-magenta` | `#B84D83` | product flow, market quantity, nerve |
| `mission-orange` | `#C87539` | mission, hostility, commitment |
| `intel-mustard` | `#C5A044` | information, rumour, uncertain offer |
| `route-green` | `#648F63` | ordinary movement, driver, open connection |
| `public-blue` | `#4F7FA0` | transit, institution, public service |
| `danger-red` | `#A94B43` | lethal intent, enemy target, critical state |
| `locked-grey` | `#676B6B` | unavailable, unknown, closed |

Colour never carries a rule alone. Each state also uses a glyph, line pattern,
label, position or motion change. Red and green are never the only opposition.

### 4.3 Colour by mode

- **Map:** most restrained; dark navy/charcoal relief with bright route and
  node accents.
- **Locations:** local material colour and warm practical light; choices remain
  dark panels with coloured tabs.
- **Market/ledger:** kraft, receipt white, carbon blue and stamp colours; fewer
  dramatic reds.
- **Battle:** deepest blacks and strongest team/intent accents.
- **TV/news:** low-saturation studio blue, paper cream and controlled red;
  analogue bloom softens the moving image.

---

## 5. Typography, labels and icons

Typography belongs to the UI layer, not the illustration.

### 5.1 Type roles

| Role | Character | Use |
|---|---|---|
| display condensed | tall, blunt, slightly worn uppercase | title, district, round, large command |
| municipal grotesk | plain, compact, highly legible | labels, prices, time, navigation |
| ledger mono | typewriter/terminal rhythm with clear numerals | dialogue, quotes, SMS, online, source notes |

The UX pass selects locally hosted, properly licensed fonts matching these
roles. Until then, typography specimens are properties rather than a specific
font lock.

### 5.2 Text rules

- Finnish diacritics must work in every weight and case.
- Body text is never distressed.
- All-caps is for short labels, not paragraphs.
- Prices use tabular numerals; euro precedes or follows according to the active
  locale rules.
- Markka and euro are never merged visually.
- Core copy and labels are dynamic text. Only decorative, nonessential signs
  may be baked into a plate.
- Dates and source status remain readable without opening metadata.

### 5.3 Labels and buttons

Headlines sit on one broad torn or clean-cut paper shape, sometimes backed by a
large triangle or offset carton block. Buttons use **two or three large nested
shapes**:

1. dark structural backing;
2. lighter paper face;
3. optional coloured role tab or selected lift.

Avoid tiny patchwork inside controls. Button edges may be imperfect, but hit
regions remain rectangular and predictable.

### 5.4 Icons

- Build icons from two to five broad cut shapes plus, at most, two marker
  strokes.
- Give every recurring system one original symbol.
- Faction marks are invented and specific; no pagoda, dragon, shamrock or
  other ethnic shorthand substitutes for a written character or family.
- Weapon icons are silhouettes, not diagrams.
- The icon may decorate a command, never replace its text at first use.

---

## 6. Composition, camera and lighting

### 6.1 Camera families

There are three coherent camera families:

1. **relief plan** for the operations map;
2. **staged frontal/three-quarter interior** for narrative locations;
3. **fixed shallow isometric** for tactical encounters.

Do not change camera language inside a mode to make one asset easier.

### 6.2 Practical lighting

Every scene names its practical light: streetlamp, window, tram, fluorescent
counter, television, daylight gap or overcast sky.

- One dominant practical light establishes focus.
- Secondary light separates playable silhouettes from the background.
- Warm windows and lamps are individual cards that can switch state.
- Darkness is never allowed to hide a valid target, face or required object.
- Battle backgrounds may fall nearly to black outside the play space; location
  scenes keep more midtone room for looking and talking.

### 6.3 Negative space

Reserve quiet paper around:

- route intersections and active missions;
- faces and speaking hands;
- target paths and cover edges;
- dialogue and command controls;
- the current unit and likely targets in portrait crop.

Atmospheric props cannot occupy interaction space merely because the corner
looks empty.

---

## 7. Operations-map language

The map combines the approved relief-collage concept with accurate public
geography. **The concept's rendering is reference; its invented street layout
is not.** Step 5 owns the compressed graph and coordinates.

### 7.1 Geographic invariants

- Preserve coastline, rail corridor, major-street direction, district
  relationships and landmark adjacency.
- Compress minor blocks rather than bending the whole city.
- Do not depict or optimise real criminal routes.
- Place story nodes through the public map and fictional access logic.

### 7.2 Map construction order

1. deep navy water card;
2. district land pieces with torn shoreline;
3. building-block relief;
4. major road and rail strips;
5. parks and landmark patches;
6. district and street labels;
7. nodes, locks and attached mission tabs;
8. ordinary people flow;
9. player, crew and goods routes;
10. local pressure, closure and event overlays;
11. map HUD and navigation.

Routes and people remain code or vector layers above the map art. They are not
baked into the plate.

### 7.3 Nodes and routes

- A node uses a circular or compact polygon badge on a short stalk with a torn
  label card.
- A lock is a neutral physical seal, not an empty mystery cloud.
- Player routes use cyan; product movement uses magenta; missions and hostile
  interruption use orange/red. Ordinary flow stays muted green/cream.
- Route direction uses arrowheads, moving cut-paper pawns or both.
- Line pattern distinguishes scheduled, uncertain, blocked and hostile states.
- People are small varied cut silhouettes, not identical restroom symbols.

### 7.4 Map detail limit

The map is a one-screen strategy surface. Individual windows, roof machinery
and pavement wear appear only at landmarks. When zoomed out, district pieces,
roads, water and nodes must remain legible before decorative blocks.

---

## 8. Locations and narrative instances

Locations feel entered, not opened as a shop menu. Each is a stage with a
person, an object rhythm, a practical light and evidence of prior choices.

### 8.1 Environment construction

- Use one coherent building or room logic per plate.
- Repeated window bays, granite bases, plaster/brick masses, drainpipes,
  porttikongi passages and practical Finnish street furniture establish Kallio.
- Research a real public location or period photo for silhouette and material
  logic, then create a generic/composite playable scene.
- Keep shelves, counters, doors, windows, signs and important props as separate
  cards when their state may change.
- No polished cyberpunk neon, contemporary LED furniture, smartphone signage
  or later Kalasatama skyline in Era I.

### 8.2 Location identities

| Location | Visual identity | Tactical/narrative space |
|---|---|---|
| Piritori / Kurvi | transit glare, tile, concrete, cheap paper notices, pockets of crowd colour | first purchase, recruitment, early contested corner |
| Toko Slomo's Noodles | narrow warm counter, red/rust menu cloth, kraft bowls, steam, night tram through window | intimate information exchange and sabotage wager |
| Karhupuisto | crossing gravel paths, lime trees, low rail, gazebo, abstract red-granite bear | porous cover, family or street observation, wind and dogs |
| Kallio courtyard | one coherent U-shaped block, repeated windows, granite base, dark porttikongi | enclosed pressure, warm windows, modular cover |
| Sörnäinen docks | open asphalt, quay edge, warehouse, crane, rails, pallets, sodium light | long sightlines, hard cover, weather exposure |
| McCormick venue | ordinary bar/restaurant warmth with family clutter and a harder back-room layer | services emerge through people, not a weapon catalogue |
| restaurant front | distinct proprietor, kitchen/restaurant logic and local signage | network access without generic ethnic menace |
| staffed bank | fluorescent order, queue rails, paper forms, clock, teller glass | markka conversion, time and visibility |
| Jaska's studio | cheap daylight, found material, unfinished art, domestic mess | family contrast and choices outside profit |

### 8.3 Toko Slomo character and mask

Toko is an older Japanese resident of Kallio and a noodle chef, not a mysterious
oracle archetype. His posture, eyebrows, hands and timing carry age and humour.

The active mask direction is:

- a full-face orange or golden-yellow fabric/card hood;
- a white smile mark made from three broad curved frames;
- eye openings cut **inside** the two white upper frames, following the same
  arch and leaving a visible slice of white around each opening;
- grey eyebrows and grey hair layered above the mask;
- slight hand-cut asymmetry between left and right;
- no glowing emoji face, plastic mascot gloss or bare realistic face beneath.

The current fullscreen Toko v02 PNG is an approved narrative-instance baseline and
may be used as a prototype. Production separates at minimum:

1. rear shop/back wall;
2. window and tram/night pass;
3. counter and stools;
4. Toko torso and arms;
5. head, hood, white frames, eye openings, brows and hair;
6. bowls, till, radio and movable counter props;
7. steam and ambient motion;
8. speaker portrait;
9. dynamic dialogue;
10. dynamic choices and focus states.

### 8.4 Narrative-state variants

Prefer swapping a small layer over repainting the whole room:

- open / closed sign;
- warm / dark window;
- present / absent person;
- intact / damaged prop;
- fresh / old notice;
- clean / wet / snow-edged ground;
- trusted / guarded staging distance.

---

## 9. Characters and casting

### 9.1 Proportion

Characters use compact adult caricature, roughly **4.5–5.5 heads tall**.

- Heads, hands and shoes are slightly oversized for expression and battle
  readability.
- Light, medium and heavy bodies differ in shoulder/hip mass, negative space
  and stance—not merely uniform scale.
- Necks, wrists, elbows and knees are simple overlapping paper joints.
- Posture is individual: forward, planted, withdrawn, loose, stiff, vain,
  tired or watchful.

Avoid heroic anatomy, fashion-illustration legs, identical skulls, tiny hands
and uniformly hunched misery.

### 9.2 Face grammar

Build a face from specific choices:

- one strong head silhouette;
- one nose family;
- one jaw/chin family;
- asymmetric brow and eye attitude;
- hairline, hat or hair mass;
- one age, habit or personality mark.

Marker details remain visibly drawn. Mirror-perfect eyes and vector-smooth
mouths are out. Expressions can be amused, awkward, skeptical, eager, bored,
irritated, nervous or proud as well as frightened and angry.

### 9.3 Finnish and Kallio specificity

“Finnish” is not one face. Local specificity comes from a believable mixture
of:

- practical layered clothing for wet cold;
- ordinary Nordic hair colours and cuts alongside the full diversity of Kallio;
- thrifted coats, wool caps, rain shells, work jackets, early-2000s tracksuits,
  worn trainers and sensible boots;
- restrained posture, direct eye lines and dry expressions varied by person;
- age, body shape, occupation and neighbourhood history.

The cast includes Finnish-born and immigrant-background residents across
genders, skin tones, ages and body frames. Ancestry never determines faction,
role, morality, weapon or threat level. A restaurant network is made of named
individuals, not one repeated “Asian enemy” head; the McCormicks are a family,
not one repeated Irish brute.

### 9.4 Modular construction

The active stack, sockets and body frames are defined in
`art-library/MODULAR_CHARACTER_SYSTEM.md`. Art production must preserve:

- separate head and `hair_hat` in production;
- separate torso, arms, pelvis/legs, footwear, hands and held prop;
- feet-centre `root_ground` anchor;
- primary and secondary grip sockets;
- light/medium/heavy bridge rules;
- engine-owned floor shadow;
- role tab as a secondary cue only.

Review sheets may combine pieces for presentation. Runtime exports may not.

### 9.5 Roles and visual cues

Role readability follows this order:

1. posture and silhouette;
2. one clothing or prop cue;
3. equipment and behaviour;
4. small coloured role tab.

Runner, Muscle, Watcher, Fixer, Driver, Local, Hired and Enforcer remain
production archetypes, not personality or ethnicity locks. Named cast members
may bend a role silhouette if their animation and equipment still read.

### 9.6 Named-character rule

A named character needs at least three persistent identifiers:

- head/face silhouette;
- posture or body-frame rhythm;
- colour, prop, garment or material motif.

Do not rely on a name label to distinguish Aatami, Jaska, Toko, a McCormick or a
recurring restaurant contact at battle scale.

---

## 10. Animals, foliage and ambient people

Ambient life proves the city exists outside the mission.

### 10.1 Animals

- Dogs use the same broad cut pieces and sparse marker detail as foliage and
  characters.
- Keep visible breed/type differences through ear, muzzle, tail and body mass;
  do not add fur rendering.
- Dogs are background life by default, never disposable combat props.
- Leashes, collars and handlers are separate where continuity requires it.

### 10.2 Foliage

The approved lime tree and grass assets are the style calibration target for
all organic shapes:

- trunk / rear crown / front crown / loose leaves remain separate;
- crown mass uses broad uneven chunks, not thousands of leaves;
- grass is small planted clusters with directional tips;
- ink is limited to branch forks, a few veins and ground contact;
- wind movement lags between pieces like light card on pins.

### 10.3 Ambient people

Map and location crowds use varied coat, hat, bag, body and walking rhythms.
They are simplified one level below named characters but never identical
symbols. Crowd density must not obscure active routes or imply social harm only
through faceless masses.

---

## 11. Props, cover and weapons

### 11.1 Props

Era I props are specific through silhouette and one material cue:

- granite bollard;
- green rubbish bin;
- steel bicycle rack;
- tram-stop panel;
- park bench;
- pallet and crate;
- concrete barrier;
- abstract red-granite bear;
- CRT television, feature phone, desktop terminal, till, radio and paper form.

Keep props modular and ground-centre anchored. Any prop that can become cover,
break, open, switch or disappear requires its own asset and state.

### 11.2 Weapons and held objects

Weapons are broad nontechnical silhouettes. They communicate reach, one- or
two-hand grip and danger without instructional mechanical detail.

- One-hand objects define `grip_primary`.
- Two-hand objects define `grip_primary` and `grip_secondary`.
- Holding pose owns the arms and hands; the prop does not include hands.
- Blunt objects retain ordinary material identity—wood, pipe, board, baton.
- Firearms stay compact, dark and visually serious; no fetish lighting,
  exploded detail or branded model fidelity.
- Bottles, rocks and improvised objects use the same socket and silhouette
  rules.

Marker detail on a weapon is limited to grip, seam and one highlight. The
approved v03 weapon set is the active ceiling; the archived rendered set is not
used.

---

## 12. Tactical-battle art

Battle is a darker arrangement of the same physical world.

### 12.1 Board and camera

- Use a fixed shallow isometric view.
- Each side owns a mostly invisible 3 × 3 formation: front, middle and back
  rows across three lanes.
- A fourth lane appears only for an authored 3 × 4 arena modifier.
- The camera shows both formations, current cover and relevant target paths at
  once.
- The permanent grid stays hidden; reveal selected, valid, target, cover and
  intent cells only.

### 12.2 Team and intent reading

- Player selection and valid movement: cyan.
- Enemy selection and lethal intent: danger red.
- Cover and neutral terrain: kraft/ochre with a distinct block shape.
- Target paths: broken line plus arrow, never colour alone.
- Front/middle/back labels appear at both sides when needed for orientation.
- Enemy intent is readable before confirmation; dramatic lighting cannot hide
  it.

### 12.3 Unit staging

- Feet register to cell centre; upper body may lean beyond the cell.
- Front-row figures crouch or plant; back-row figures remain readable above or
  beside intervening silhouettes.
- Cover masks lower body without swallowing the face, weapon or condition
  state.
- Downed units remain as low separate silhouettes until removed or recovered.
- A death state is held and quiet, not a celebratory effect.

### 12.4 Battle detail target

Environment:

- large ground planes;
- one coherent façade or landmark mass;
- two to five modular cover objects;
- one practical light focus;
- limited wear and paper fibre.

Characters retain stronger facial and clothing specificity than the
simplification-floor reference. Background texture is reduced roughly 25
percent from the detail-ceiling reference. No arena receives more detail than
the units it is meant to clarify.

### 12.5 Battle UI visual rule

The approved command-console SVGs establish module geometry, not final type or
ornament.

- Use broad dark carton panels with cream edges and one role-colour tab.
- Portrait, name and condition form one block.
- Commands use large labelled icon cards.
- AUTO and WITHDRAW remain visually separate from immediate actions.
- Condition, guard, nerve and lethal exposure use text/numerals plus shapes;
  do not rely on tiny segments alone.
- Controls never cover the current unit or valid targets.

---

## 13. News, communications and Arvo Linde

### 13.1 Channel separation

Each Era I information channel has its own material:

| Channel | Visual object | Motion |
|---|---|---|
| TV bulletin | CRT shell, studio frame, lower-third cards, dated source tag | scanline roll, analogue softness, restrained presenter |
| SMS/call | physical feature phone and compact message slip | brief vibration, monochrome LCD change |
| online | desktop monitor, keyboard, browser/terminal paper layers | slower page/terminal reveal |
| ledger | folder, receipts, carbon paper, clipped quote cards | physical stacking and stamp changes |

No channel is wrapped in a modern app grid or smartphone shell.

### 13.2 Arvo Linde 3D exception

Arvo may use a low-detail animation-ready 3D source model, including a Meshy
workflow, because recurring speech benefits from lip sync and restrained hand
motion.

The exception is tightly contained:

- only the moving presenter inside the TV uses 3D;
- the model is a fictional homage, not a photoreal likeness of Arvi Lind;
- face, hair and suit shapes remain simple enough to survive posterisation;
- output receives limited colour, analogue softness, slight scanlines and CRT
  bloom;
- idle motion is minimal: breathing, blink, paper glance, small hand gesture;
- the CRT shell, lower third, newsroom props and all surrounding UI remain
  cut-cardstock layers;
- source-status labels are dynamic and never baked into the render.

### 13.3 News tone

Public news is calm, formal and specific. Visual alarm is reserved for actual
urgency. Documented fact, character inference, accusation and fictional
composite each receive a distinct written status, not only a colour.

---

## 14. Motion language

Motion should feel like paper moved by hands, pins and hinges without becoming
jerky or comic by default.

### 14.1 Timing families

- Character and animal actions: authored on an **8–12 fps** pose rhythm, while
  the renderer and UI may update smoothly.
- Ambient loops: four to eight held frames with seeded start offsets.
- UI focus: short lift, slide or tab reveal; no elastic mobile-app bounce.
- Route flow: continuous enough to read direction, with cut-paper pawns or
  dashes retaining their physical look.

### 14.2 Character motion

- Rotate and translate from hidden pivots inside overlaps.
- Add deformation only where it preserves the cut-piece read.
- Root stays fixed during battle holds; walking/repositioning exports root
  motion separately.
- Anticipation and recovery matter more than many in-betweens.
- A small registration shift is allowed in nonessential edges; face, hands,
  feet anchor and weapon sockets stay stable.

### 14.3 Environmental motion

- Tree crown pieces lag by one frame across gusts.
- Grass travels in small directional clusters.
- Dogs idle, sniff, look, walk, bark and startle on independent schedules.
- Steam, rain, snow, fog, window light and tram pass are separate loops.
- Nothing loops in perfect synchrony across the screen.

### 14.4 Reduced-motion and low-power fallbacks

Every loop has a static frame. Reduced motion removes parallax, registration
jitter, repeated lift and near-camera precipitation while preserving state.
Low-power mode reduces ambient agents and layer density before reducing text,
targets or interaction feedback.

---

## 15. Weather and seasonal layering

Weather is a set of independent back, ground, mid and front passes as defined
in `art-library/ANIMATION_LAYER_CONTRACT.md`.

- Far fog and cloud sit behind façades.
- Wet sheen and ripple response project onto the ground.
- Fine rain/snow intersects world space.
- Sparse large drops, flakes or debris pass in front of battle effects but
  behind UI.
- Strong weather automatically thins over faces, active cells, target paths,
  dialogue and controls.
- Weather may change route and opening state through the simulation; visual
  noise never secretly changes hit chance.

Era I presets: drizzle, hard rain, wet snow, dry snow, cold clear and autumn
wind. Each uses a static fallback and a palette-tinted night/day variant.

---

## 16. Responsive composition

Art is authored as separable layers, not one background that happens to crop.

### 16.1 Horizontal

- Primary world frame: 16:9.
- Keep the full tactical relationship or location stage visible.
- UI may occupy a bottom command band and a shallow top status band.
- Quiet scenery belongs at outer edges so it can be cropped later.

### 16.2 Portrait mobile

- Use a closer crop of the same location or battle, not a different scene.
- Crop quiet left/right scenery first.
- Keep current actor, speaking face, relevant cover and valid targets together.
- Reflow command cards into a bottom stack or compact grid.
- Preserve a clear world window above the controls.
- Move labels and dialogue independently; never scale the whole 16:9 UI down.

Every location plate ships a portrait crop guide. Every world-space interactive
element has a normalized anchor so it survives reflow.

### 16.3 Safe areas

- No essential face, target, label or hit region touches the outer 5 percent of
  the source frame.
- Device safe areas are applied by layout code, not painted padding.
- Letterboxing belongs to the screen background and does not alter hit-region
  coordinates.

---

## 17. Accessibility and readability gates

Every production asset or assembled screen must pass:

1. **thumbnail test:** silhouette and active state read at 25 percent size;
2. **grayscale test:** team, target and control hierarchy remain readable;
3. **blur test:** large masses and interaction focus survive mild blur;
4. **contrast test:** dynamic text and controls meet the project's accessible
   contrast target against their real background;
5. **colour-independence test:** state has symbol, pattern, label or position;
6. **mobile-crop test:** portrait retains actor, action and consequence;
7. **reduced-motion test:** all information remains in static frames;
8. **Finnish-text test:** long labels, diacritics and numbers fit;
9. **material test:** texture never reduces text or target clarity;
10. **content test:** vulnerable people are represented as people, not scenery
    or dehumanising monster silhouettes.

Focus rings and selection cells may be cleaner than diegetic art. Readability
is part of the handmade design, not a reason to hide interaction.

---

## 18. Production and export contract

### 18.1 Source and runtime separation

- `piritori/art-library/` stores approved source, comparison and production
  contracts.
- `piritori/art-library/archive/needs-rework/` is inactive and may not be a
  runtime dependency.
- `piritori/art/` receives optimized registered runtime derivatives.
- Review sheets stay in the library; runtime uses individual transparent
  assets, layer sets, atlases or vectors.
- A flattened approved screen may ship only as an explicitly documented
  prototype, such as the current Toko instance.

### 18.2 Required metadata

Every runtime asset declares:

- stable id;
- source library file and source version;
- approval status;
- dimensions and format;
- anchor/pivot and sockets where relevant;
- layer/pass;
- Era and location restrictions;
- animation sequence or static fallback;
- portrait crop or safe bounds where relevant;
- provenance/reference note;
- whether text or UI is baked.

### 18.3 Naming

Use lower kebab case:

`<category>-<subject>-<variant>-vNN.<ext>`

Frames use:

`<clip>-<direction>-frameNN.png`

Do not encode approval words such as `final-final` in filenames. Approval lives
in the register and manifest.

### 18.4 Canvas and anchors

- Characters use the shared 1024-unit rig canvas and `root_ground`.
- Props and cover use ground-centre.
- Dogs use ground-centre between paws.
- Trees use trunk/root centre.
- Weapons use grip sockets.
- Weather uses 1920 × 1080 view boxes or normalized screen coordinates.
- Location plates use a 16:9 master plus portrait crop guide.

### 18.5 Raster and vector

- PNG with alpha: units, modules, props, cover and organic pieces.
- PNG opaque: flattened source plates and explicit prototypes.
- SVG: cells, route geometry, icons, weather and UI shapes that benefit from
  scaling.
- Web delivery may derive WebP/AVIF where quality and alpha are verified; PNG
  source remains in the library.
- Never upscale a review cutout and call it production-ready.

### 18.6 Runtime performance

- Atlas small related pieces only after anchors and independent state are
  recorded.
- Lazy-load location-specific plates and cast.
- Keep front weather and full-resolution texture optional on low power.
- Do not merge independently animated foliage, props, units or lights merely to
  reduce request count.
- Performance optimization may reduce texture resolution and ambient count; it
  may not merge gameplay states into one unreadable image.

---

## 19. Approval workflow

Approval and production readiness remain separate.

### 19.1 Concept approval

A review image demonstrates:

- correct visual grammar;
- correct Helsinki/period cues;
- correct camera and broad composition;
- appropriate detail band;
- no copied or stereotyped design.

### 19.2 Extraction approval

The production asset then demonstrates:

- clean transparency or intended opaque plate;
- correct pieces and layer order;
- normalized anchors and sockets;
- portrait crop/safe bounds;
- dynamic text and state separation;
- static fallback;
- manifest entry and provenance.

### 19.3 Assembly approval

The in-game composition demonstrates:

- correct scale and contact shadow;
- readable active state;
- correct location lighting;
- horizontal and portrait behaviour;
- reduced-motion and low-power state;
- no dependency on archived art;
- acceptable load/memory budget.

Only then may `production_ready` become true.

---

## 20. Era I production priorities

The next art milestone should create registered, reusable pieces in this order:

1. extract and register the approved v03 medium character modules;
2. separate hair/hats and normalize heads to the neck socket;
3. register grips, v03 weapons and engine-owned shadows;
4. finish runner, dog, foliage and basic hit/down motion sets;
5. extract Karhupuisto into location, vegetation and landmark layers;
6. correct and extract the Kallio courtyard as one coherent block;
7. separate the Sörnäinen dock plate;
8. separate the Toko instance into stage, Toko, mask, props, steam, copy and
   controls;
9. build Piritori, McCormick venue, bank, Jaska studio and restaurant-front
   location baselines;
10. build the accurate compressed operations-map kit after Step 5 fixes its
    geometry;
11. assemble horizontal and portrait tests for all five interaction modes;
12. promote only tested derivatives to `piritori/art/`.

The clean-cardstock v02 set remains an approved simplification fallback for
small-scale units, low-power mode and structural tests. It does not silently
replace v03 personality art.

---

## 21. Explicit non-targets

Reject work that trends toward:

- photorealism or painterly realism;
- polished generic mobile-game illustration;
- perfect vector characters or icons without hand treatment;
- thick embossed cardboard, foam-board bevels or toy-diorama gloss;
- microscopic grime, pores, fabric rendering or gun detail;
- a separate glossy “battle style” unrelated to the map and locations;
- copied *Darkest Dungeon* anatomy, brushwork, UI or gothic decoration;
- copied adult-animation faces;
- cyberpunk neon or contemporary Helsinki cues in 2003;
- universal depression, monsterised vulnerable people or comic violence;
- ethnicity as class, faction, threat or costume shorthand;
- baked routes, units, weather, dialogue, prices or controls;
- modern smartphone metaphors for Era I;
- geography invented to match an attractive mockup.

When uncertain, remove detail, preserve the broad cut shape, restore one
specific local cue and add only the marker strokes needed to communicate
personality or state.
