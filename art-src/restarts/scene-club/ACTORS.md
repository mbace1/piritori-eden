# Fresh retained-source actor renderer

`actors.js` renders transparent registered parts only. It imports no earlier
review, UI/player renderer, modular cast source or derivative artwork. Original
source files and manifest remain unchanged. All new motion/aperture masks are
review candidates. Mouths are static; talk is head/torso acting, not lip sync.

```js
const actors = createActors(container, {
  aatami: 'front', // or side; keep source direction intact
  partner: 'jaska', // or toko
  reducedMotion: false,
});
await actors.ready;
actors.setSpeaker('aatami');
actors.play('aatami', 'talk'); // idle / talk / nod / shake / blink
actors.bounds(); // viewport canvas/head rectangles and mouth anchors
actors.setReducedMotion(true); // exact registered-piece rest, without blink
actors.destroy();
```

Canvases are `.actor.actor-aatami`, `.actor.actor-jaska` or
`.actor.actor-toko`. Root CSS owns size/placement; intrinsic aspect ratios stay
450×685 front, 470×700 side and 520×700 Jaska. No fixed portrait stage, bubble,
background, controls, frame, nameplate or baked Toko buttons are drawn.

Toko uses **`[496,68,400,472]`** in the original **1536×864** rig coordinates.
The rest actor alpha union is approximately `[519,107]–[873,463]`. Extra margin
preserves proportions/motion clearance. The `counter` member is excluded:
its opaque room strip overlaps the actor and cannot be removed by a rectangle.
Torso/head/brows/eye masks/forearm/hand/note retain original source coordinates.
No room, counter, till or ambient layer is loaded or drawn.

That cropped Toko is an isolated renderer study. The actual paired bar view
uses `toko-composition.js`: room, Toko, counter and hands share the original
1536×864 camera, while Aatami stays in the foreground. See the README and
ensemble report for the native paired-scene checks.

The registered human eyelids are fully opaque skin swatches, including Jaska's
misregistered right rectangle extending beyond his head. New narrow masks are
head-local, repositioned over the actual apertures and transformed with the
head. The original glasses/brow pixels outside these openings stay intact.
A small closed-eye marker line is procedural candidate animation. Open/half/
closed states must be visually inspected for all three human variants before
this renderer is accepted; no prior repair masks/images are imported.

Debug controls allow deterministic real-browser captures:

```js
actors.debug.rest(); // hold exact unanimated pieces
actors.debug.hold('aatami', 'blink', .22); // full blink
actors.debug.hold('jaska', 'blink', .13); // partial blink
actors.debug.hold('aatami', 'talk', 1.0);
actors.debug.resume();
actors.debug.snapshot();
```

Reduced motion always wins over debug/play and displays exact rest. One-shot
clips return to idle; they never freeze permanently on the last talk frame.
Speaker changes update classes/data without removing the other actor. `destroy`
stops rendering and removes only the canvases this instance created.

## Isolated renderer verification

Actual private-browser harness checks passed for front/side Aatami × Jaska/Toko
at 390×844: both actors load, held full blinks change pixels, reduced-motion
rendering matches exact normal-rest PNG bytes, destroy removes both canvases,
and no page/console/HTTP errors occur. A real-time private recording also checks
talk returning to idle, subsequent idle/blink and a nod (no frozen one-shot).

Held open/partial/full head captures were inspected at native source scale in a
1280×1000 harness. Full-blink changed-pixel bounds/counts in each actor canvas:

| Actor | Changed pixels | Bounds (inclusive) |
|---|---:|---|
| Young front | 280 | x235–306 / y110–125 |
| Jaska | 348 | x249–330 / y162–169 |
| Young side | 91 | x309–324 / y120–126 |
| Toko (cropped canvas) | 949 | x168–248 / y123–156 |

The current aperture candidates show no rectangular tabs at those inspected
states; Jaska's glasses and Aatami's brows remain visible. Diagnostic stills,
the private harness recording and measurements remain outside Git at
`/workspace/evidence/visual-reset-actor-private/`. They are construction/QC
evidence, not new source artwork or approval deliverables.

These checks isolate the renderer. The root composition still needs native
portrait/landscape paired-scene, source-relative scale, bubble/choices, long-text,
motion continuity and physical Pixel/iPad acceptance. No ensemble/gameplay or
owner approval is established by the isolated harness.
