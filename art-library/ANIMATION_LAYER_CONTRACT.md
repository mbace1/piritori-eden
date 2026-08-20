# Animation and environmental layer contract

Ambient motion must make Kallio feel inhabited without competing with tactical
intent. Dogs, foliage, precipitation and ground response remain interchangeable
assets rather than baked scenery.

## World and screen order

| Pass | Example contents | Camera behaviour |
|---|---|---|
| `weather/back` | far cloud, low fog, distant snow | shallow parallax |
| `location/backdrop` | sky and far silhouette | location parallax |
| `location/facade` | coherent building mass | location parallax |
| `vegetation/rear` | crown behind units, distant grass | world anchored |
| `location/ground` | park, street, dock | fixed anchor |
| `weather/ground` | wet sheen, puddle ripple, snow settle | projected to ground |
| `props-and-cover` | benches, bins, barriers | world anchored |
| `animals-and-units` | dogs, civilians, combatants | world anchored |
| `vegetation/front` | foreground branches and grass | world anchored |
| `weather/mid` | rain or snow intersecting play space | camera relative |
| `battle-fx` | targeting, impact, status | transient |
| `weather/front` | sparse large drops, flakes, gust debris | camera relative |
| `ui` | battle and narrative interface | safe-area aware |

## Dogs

The first pack uses two readable Helsinki street silhouettes: a compact
spitz-type dog and a mixed small-to-medium urban dog. They are background life,
not combat units by default.

Required clips:

- `idle` 4 frames
- `sniff` 6 frames
- `walk` 8 frames
- `look` 4 frames
- `bark` 4 frames
- `startle-flee` 6 frames

Export four isometric travel directions and mirror only when collar, markings
and leash hand do not create a continuity error. The root is between the paws;
the leash socket is at the collar.

## Trees and grass

Separate trunk, rear crown, front crown and optional loose leaves. The trunk is
fixed. Wind moves the crown in a short loop while small branches lag one frame.

| Strength | Frames | Motion |
|---|---:|---|
| calm | 4 | breathing-scale crown shift; grass tips only |
| breeze | 6 | crown leans 2–4 degrees; grass travels in a wave |
| gust | 8 | asymmetric lean, leaf/debris release, quick recovery |

Grass uses small tileable clusters, not a single animated lawn texture. Park
plates reserve planting masks so grass can move without redrawing paths.

## Weather families

Each weather preset combines independent layers:

| Preset | Back | Mid | Front | Ground |
|---|---|---|---|---|
| drizzle | low haze | fine diagonal rain | occasional drop | weak sheen and ripples |
| hard rain | dark cloud | dense angled rain | near streaks and splash | wet sheen and active ripples |
| wet snow | grey fog | slow heavy flakes | sparse large flakes | slush edge |
| dry snow | pale cloud | fine drifting snow | wind-blown flakes | gradual settle mask |
| cold clear | subtle sky band | none | breath puffs near units | frost edge |
| autumn wind | moving cloud | leaves and paper | larger gust debris | damp leaf clusters |

Weather never alters hit chance through hidden visual noise. Strong effects
thin automatically over active cells, faces and command UI.

## File and timing rules

- Sequences use `name-direction-frameNN.png` or a manifest-defined sprite sheet.
- Frame zero is a clean review pose.
- All frames in a sequence share dimensions and anchor coordinates.
- Ambient loops avoid synchronized starts; the engine applies seeded offsets.
- Near and far precipitation scroll at different speeds.
- Every animated layer includes a static fallback for low-power mobile devices.
