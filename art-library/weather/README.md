# Weather layers

These transparent SVGs are composable static fallbacks and motion sources. The
engine offsets or scrolls them; the files do not depend on browser SVG
animation.

Recommended stack:

1. `back/cloud-band.svg`
2. `back/fog-band.svg`
3. location backdrop and façade
4. `ground/wet-sheen.svg` and `ground/puddle-ripples.svg`
5. props, animals and units
6. `mid/rain-fine.svg` or `mid/snow-fine.svg`
7. battle effects
8. `front/rain-near.svg`, `front/snow-near.svg` or `front/wind-debris.svg`
9. UI

All view boxes are `1920 1080`. Opacity may be tinted or reduced by the engine.
Strong effects should be masked over active cells, portraits and command UI.
