#!/usr/bin/env python
"""Magenta key — turn a generated sheet into a cut asset with real alpha.

    python art-src/tools/key.py in.png out.png [--tol 0.35] [--bleed 2]

art-src/NANO_BANANA.md §2, THE MAGENTA RULE: everything except a full-bleed
background is generated on flat #FF00FF, and the key is run before anything is
tinted. This is that key.

WHY NOT kindling/tools/cut.mjs. That tool says of itself "IT IS NOT KINDLING'S
ANY MORE — Piritori ships art from the same magenta pipeline", and gen-pose-set.sh
still calls it by a path that stopped existing when this project became its own
repository. Bringing it across would bring PLAYWRIGHT with it, and CLAUDE.md
rule 2 says ask before adding a dependency. A chroma key does not need a
browser, and PIL is already this project's image tool. So the key lives here and
cut.mjs's other commands (fit, trim, web, slice, check) are simply not needed
yet — when one is, that is the moment to ask about the dependency rather than
inherit it now.

WHAT IT DOES

  key      alpha = 0 where the pixel is magenta, with a soft edge so the
           silhouette does not get a hard staircase
  despill  magenta that survives on the contour is pulled back toward its own
           green channel, which is what stops a pink halo appearing when the
           asset is later drawn over a dark stage
  bleed    the colour of edge pixels is pushed OUTWARD into the now-transparent
           ring, so a later downscale cannot sample magenta out of pixels it is
           about to make invisible

THE ONE TRAP. This art deliberately carries a MAGENTA RIM LIGHT along its
contour, and the product accent #F0027F is close enough to matter. The key is a
RATIO test — magenta relative to green — rather than a distance to a colour, so
a rim light drawn over a real material keeps enough green to survive while a
flat background does not.
"""

import argparse
import sys
from PIL import Image


def magenta_ratio(r: int, g: int, b: int) -> float:
    """1.0 for pure magenta, 0.0 for anything with as much green as red/blue."""
    mag = (r + b) * 0.5
    if mag <= 0:
        return 0.0
    return max(0.0, (mag - g) / mag)


def key(src: str, dst: str, tol: float, bleed: int, full: float = 0.70) -> int:
    im = Image.open(src).convert("RGBA")
    w, h = im.size
    px = im.load()

    cut = 0
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            ratio = magenta_ratio(r, g, b)
            if ratio <= tol:
                continue
            # Soft shoulder between `tol` and `full`, NOT between tol and 1.0.
            # Ramping all the way to a ratio of 1.0 meant a flat #FF00FF
            # background scoring 0.83 kept about 4% alpha — invisible to the eye
            # against magenta and a grey fog once composited over a night stage.
            # Background must reach EXACTLY zero.
            t = (ratio - tol) / max(1e-6, full - tol)
            new_a = int(round(a * (1.0 - min(1.0, t))))
            # Despill whatever survives: pull red and blue down toward green so
            # the contour does not glow pink over a dark stage.
            if new_a > 0:
                r = min(r, int(g + (r - g) * 0.35))
                b = min(b, int(g + (b - g) * 0.35))
            px[x, y] = (r, g, b, new_a)
            if new_a <= 2:
                px[x, y] = (r, g, b, 0)
                cut += 1

    # Outward bleed: give transparent pixels next to the subject the subject's
    # colour, so a downscale samples material rather than nothing.
    for _ in range(max(0, bleed)):
        snapshot = im.copy().load()
        for y in range(h):
            for x in range(w):
                if snapshot[x, y][3] != 0:
                    continue
                acc = [0, 0, 0, 0]
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < w and 0 <= ny < h:
                        nr, ng, nb, na = snapshot[nx, ny]
                        if na > 0:
                            acc[0] += nr; acc[1] += ng; acc[2] += nb; acc[3] += 1
                if acc[3]:
                    px[x, y] = (acc[0] // acc[3], acc[1] // acc[3], acc[2] // acc[3], 0)

    im.save(dst)
    return cut


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("dst")
    ap.add_argument("--tol", type=float, default=0.35,
                    help="magenta ratio above which a pixel is background")
    ap.add_argument("--bleed", type=int, default=2)
    ap.add_argument("--full", type=float, default=0.70,
                    help="ratio at or above which a pixel is fully transparent")
    a = ap.parse_args()
    cut = key(a.src, a.dst, a.tol, a.bleed, a.full)
    im = Image.open(a.dst)
    total = im.size[0] * im.size[1]
    print("keyed %s -> %s  (%d of %d px transparent, %.1f%%)"
          % (a.src, a.dst, cut, total, 100.0 * cut / total))
    if cut == 0:
        print("  WARNING: nothing was keyed. Was the background flat #FF00FF?",
              file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
