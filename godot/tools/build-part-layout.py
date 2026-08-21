#!/usr/bin/env python3
"""
build-part-layout.py — derive placement data for the modular character parts.

art-library/MODULAR_CHARACTER_SYSTEM.md defines named sockets (`root_ground`,
`neck`, `waist`, `grip_primary`) on "a common 1024-unit canvas", but NO numeric
socket coordinates exist anywhere in the repo. The exported parts are trimmed to
different canvas sizes (heads 362x362, torsos 512x512, legs 483x543), so they
cannot simply be stacked at the origin.

Two different things are therefore done here, and the difference matters:

  EQUIPMENT — real data. Every weapon and prop carries a small deliberate
  player-cyan (#38B8C8) marker at its grip point. Those are read directly and
  are exact.

  BODY PARTS — a derived approximation. Heads, torsos and legs carry no marker
  (the cyan pixels on legs-runner and torso-runner are shoe trim and a jacket
  zip, not sockets). Placement is computed from the alpha bounding boxes:
  legs sit on the ground line, the torso's hem drops WAIST_DROP into the legs,
  and the head's chin drops NECK_DROP into the torso.
  This is a stand-in until sockets are authored, and it is recorded as such in
  the output so nothing downstream mistakes it for canon.

  python tools/build-part-layout.py           write data/part-layout.json
  python tools/build-part-layout.py --check   fail if it would change

Requires Pillow. The repo's no-build rule covers shipped code; this is a
dev-time tool and reads .webp, which node cannot do without a dependency.
"""
import json
import os
import sys
import glob

try:
    from PIL import Image
except ImportError:
    sys.exit("build-part-layout: Pillow required. "
             "Use the venv: ~/.nano-banana/venv/Scripts/python.exe")

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
ART = os.path.join(ROOT, 'data', 'art')
OUT = os.path.join(ROOT, 'data', 'part-layout.json')

CYAN = (0x38, 0xB8, 0xC8)
CYAN_TOL = 42

# How far the joint sits INTO the part below, as a fraction of that lower
# part's visible height. Measured against the LOWER part on purpose: torso
# exports differ wildly in canvas fill, so anything measured against the torso
# leaves a gap under the tall ones. Tuned by looking at the render.
WAIST_DROP = 0.26   # torso hem, into the legs
NECK_DROP = 0.20    # head chin, into the torso


ALPHA_FLOOR = 40


def alpha_bbox(path):
    """Bounds of the SOLID artwork.

    Image.getbbox() counts any non-zero alpha, so a soft edge or a stray
    near-transparent pixel inflates it — the fixer jacket reported a bbox
    running to the bottom of its 512px canvas and the composed figure came out
    with a gap between the jacket and the jeans. Threshold the alpha first.
    """
    im = Image.open(path).convert('RGBA')
    mask = im.split()[3].point(lambda a: 255 if a >= ALPHA_FLOOR else 0)
    return im.size, mask.getbbox()


def grip_marker(path):
    """Centre of the deliberate cyan grip dot, or None."""
    im = Image.open(path).convert('RGBA')
    px = im.load()
    pts = []
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if a > 200 and abs(r - CYAN[0]) <= CYAN_TOL \
                    and abs(g - CYAN[1]) <= CYAN_TOL and abs(b - CYAN[2]) <= CYAN_TOL:
                pts.append((x, y))
    if len(pts) < 20 or len(pts) > 200:
        return None          # too few to be a marker, too many to be anything but artwork
    return [sum(p[0] for p in pts) // len(pts), sum(p[1] for p in pts) // len(pts)]


def rel(path):
    return os.path.relpath(path, ART).replace('\\', '/')


def collect():
    out = {
        'note': ('Body-part placement is DERIVED from alpha bounds, not authored. '
                 'Equipment grip points ARE authored, read from the cyan marker.'),
        'waist_drop': WAIST_DROP,
        'neck_drop': NECK_DROP,
        'parts': {},
        'equipment': {},
    }

    for kind in ('legs', 'torsos', 'heads'):
        for f in sorted(glob.glob(os.path.join(ART, 'characters', kind, '*.webp'))):
            size, bb = alpha_bbox(f)
            if bb is None:
                continue
            out['parts'][os.path.splitext(os.path.basename(f))[0]] = {
                'file': rel(f),
                'kind': kind,
                'size': list(size),
                'bbox': list(bb),
                'visible': [bb[2] - bb[0], bb[3] - bb[1]],
            }

    for f in sorted(glob.glob(os.path.join(ART, 'equipment', '*.webp'))):
        size, bb = alpha_bbox(f)
        grip = grip_marker(f)
        out['equipment'][os.path.splitext(os.path.basename(f))[0]] = {
            'file': rel(f),
            'size': list(size),
            'bbox': list(bb) if bb else None,
            'grip_primary': grip,
            'grip_source': 'cyan-marker' if grip else 'missing',
        }
    return out


def main():
    if not os.path.isdir(ART):
        sys.exit("build-part-layout: no data/art — run: node tools/sync-data.mjs")

    data = collect()
    text = json.dumps(data, indent=1, sort_keys=True)

    if '--check' in sys.argv:
        if not os.path.exists(OUT) or open(OUT, encoding='utf-8').read() != text:
            sys.exit("DRIFT: data/part-layout.json is stale. "
                     "Run: python tools/build-part-layout.py")
        print("PART LAYOUT OK: %d body parts, %d equipment grips."
              % (len(data['parts']), sum(1 for e in data['equipment'].values()
                                         if e['grip_primary'])))
        return

    with open(OUT, 'w', encoding='utf-8') as fh:
        fh.write(text)
    grips = sum(1 for e in data['equipment'].values() if e['grip_primary'])
    print("wrote data/part-layout.json")
    print("  %d body parts (derived placement)" % len(data['parts']))
    print("  %d/%d equipment grips read from the cyan marker"
          % (grips, len(data['equipment'])))
    for k, v in data['equipment'].items():
        if not v['grip_primary']:
            print("  WARNING: no grip marker on %s" % k)


if __name__ == '__main__':
    main()
