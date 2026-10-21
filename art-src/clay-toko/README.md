# Clay Toko — the counter clips

Owner, 2026-10-19: Toko at the counter should "look, move, and sound exactly like
the Toko ones in the claymation RFH videos", as "loops that only change as
reactions". This folder renders those loops with the Radio Free clay kit.

**The kit is served, never copied.** `render.cjs --kit <path>` takes a Suds-Jack
checkout of `claude/radio-free-helsinki-pvtsw5` and serves
`radiofree/studio/art-motion/clay/dishes/lib/` (the `Toko` class, the clay
material, the mask traced from the master face, the post) and the studio's
three.js. The kit commit is written into each clip's `.json`.

```bash
node art-src/clay-toko/render.cjs --kit ~/src/Suds-Jack --still idle:1 --res 0.5   # a draft still in work/
node art-src/clay-toko/render.cjs --kit ~/src/Suds-Jack --clip idle                 # frames, then art/v3/cast-clay/*.mp4
```

## The clips

| clip | seconds | when |
|---|---|---|
| idle | 4.0, loops | for as long as you stand there |
| wave | 2.0 | once, as you come in |
| nod | 1.5 | buying a weapon |
| tilt | 1.6 | buying a bowl, as he tells you ('bwoop?') |

Every reaction starts and ends on idle's first frame (measured: the first frames
are identical; idle's last differs from its first by 0.2 of 255), so the cuts do
not show. Posed on twos, 12 poses a second, as in the films.

## The set

The painted plate (`scene-toko-noodles-empty-v01`) is inside each clip: one copy
behind Toko and one in front, cut at the counter's top edge, so the counter hides
him exactly where the painting's counter is, and the clip lines up with the plate
under it in the game. The grade is near-neutral so the painting stays the
painting; Toko keeps the films' clay, light and occlusion. No grain (it costs
bytes and is invisible at phone size). Four clips: about 700 KB together.

## Sound

Not rendered here: the game synthesises Toko's cues at run time
(`web/js/v3/toko-voice.js`), ported formula for formula from the films'
`lib/rfsound.py` (music box, felt piano, the upright's slide, knock, pat), because
Act I's sound is synthesised, never sampled.
