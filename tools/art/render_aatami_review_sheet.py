#!/usr/bin/env python3
"""Build a nine-source Aatami *review* contact sheet; never modifies source art.

Requires Pillow. Verifies the exact PR #108 source hashes and dimensions before
rendering. The sheet and its JSON manifest must be written outside the repo.
This is a visual selection aid, not character art, rig work, or approval.

Usage: python3 tools/art/render_aatami_review_sheet.py --out-dir /tmp/aatami-evidence
"""
from __future__ import annotations

import argparse
import hashlib
import io
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps
import audit_aatami_candidates as audit

ORDER = (
    'aatami-young-final-v01.png',
    'aatami-young-support-01.png',
    'aatami-young-support-02.png',
    'aatami-young-support-03.png',
    'aatami-young-support-04.png',
    'aatami-young-support-05.png',
    'aatami-young-support-06.png',
    'aatami-young-support-07.png',
    'aatami-older-final-v01.png',
)
SHEET_NAME = 'aatami-nine-selected-contact-sheet.png'
REPORT_NAME = 'aatami-nine-selected-contact-sheet.json'
WIDTH, HEIGHT = 360, 490
MARGIN, GAP, HEADER, FOOTER = 32, 20, 144, 112
BG, CARD, FRAME = '#24282a', '#ded4be', '#faf7ef'


def font(size: int, bold: bool = False):
    choices = (['DejaVuSans-Bold.ttf', 'LiberationSans-Bold.ttf'] if bold
               else ['DejaVuSans.ttf', 'LiberationSans-Regular.ttf'])
    for face in choices:
        try:
            return ImageFont.truetype(face, size)
        except OSError:
            pass
    return ImageFont.load_default()


def label(name: str) -> tuple[str, str]:
    if name == 'aatami-young-final-v01.png':
        return 'YOUNG FINAL', 'Selected illustration · source only'
    if name == 'aatami-older-final-v01.png':
        return 'OLDER FINAL', 'Selected illustration · no cut-in rig'
    index = int(name.rsplit('support-', 1)[1].split('.')[0])
    return f'YOUNG STUDY {index:02d}', ('Front-facing cut-in source · review only' if index == 6
                                      else 'Supporting pose · review only')


def render(root: Path, out_dir: Path) -> dict:
    root, out_dir = root.resolve(), out_dir.resolve()
    if out_dir == root or root in out_dir.parents:
        raise ValueError('Review evidence output must be outside the repository/source checkout')
    if len(ORDER) != 9 or set(ORDER) != set(audit.EXPECTED):
        raise ValueError('Pinned nine-image selection changed; review required')

    sources = []
    # Complete verification before writing output. Excluded images are NEVER opened.
    for name in ORDER:
        expected_sha, expected_w, expected_h = audit.EXPECTED[name]
        content = (root / audit.PREFIX / name).read_bytes()
        props = audit.inspect(content)
        if (props['sha'], props['width'], props['height']) != (expected_sha, expected_w, expected_h):
            raise ValueError(f'Source hash/dimension mismatch: {name}')
        if props['has_alpha_channel']:
            raise ValueError(f'Expected opaque concept source, not transparent rig: {name}')
        try:
            with Image.open(io.BytesIO(content)) as image:
                image.verify()
            with Image.open(io.BytesIO(content)) as image:
                picture = image.convert('RGB')
        except (OSError, ValueError) as exc:
            raise ValueError(f'Decoding failed for {name}: {exc}') from exc
        sources.append((name, picture, props, hashlib.sha256(content).hexdigest()))

    full_w = 2*MARGIN + 3*WIDTH + 2*GAP
    full_h = HEADER + 3*HEIGHT + 2*GAP + FOOTER
    sheet = Image.new('RGB', (full_w, full_h), BG)
    draw = ImageDraw.Draw(sheet)
    draw.text((MARGIN, 20), 'AATAMI  /  NINE SELECTED SOURCES', fill='#f1e7d0', font=font(27, True))
    draw.text((MARGIN, 63), 'PR #108  |  Source illustrations only  |  NOT production-approved',
              fill='#d8c8a7', font=font(17))
    draw.text((MARGIN, 96), 'Three original A/B/C outfits were superseded, not completed separately.',
              fill='#c6cbd0', font=font(16))

    rows = []
    for index, (name, picture, props, digest) in enumerate(sources):
        col, row = index % 3, index // 3
        x, y = MARGIN + col*(WIDTH+GAP), HEADER + row*(HEIGHT+GAP)
        draw.rounded_rectangle((x, y, x+WIDTH-1, y+HEIGHT-1), radius=8, fill=CARD)
        title, subtitle = label(name)
        draw.text((x+15, y+13), title, fill='#22272b', font=font(19, True))
        # Letterbox the full source illustration without cropping or modifications.
        box = (x+15, y+48, x+WIDTH-15, y+HEIGHT-58)
        draw.rectangle(box, fill=FRAME)
        inner_w, inner_h = (box[2]-box[0]-12, box[3]-box[1]-12)
        thumb = ImageOps.contain(picture, (inner_w, inner_h), method=Image.Resampling.LANCZOS)
        paste_x = box[0] + (box[2]-box[0]-thumb.width)//2
        paste_y = box[1] + (box[3]-box[1]-thumb.height)//2
        sheet.paste(thumb, (paste_x, paste_y))
        draw.text((x+15, y+HEIGHT-45), subtitle, fill='#4c5356', font=font(13))
        draw.text((x+15, y+HEIGHT-25), f'{props["width"]} x {props["height"]}   ·   RGB SOURCE',
                  fill='#616669', font=font(12))
        rows.append({'file': name, 'role': title, 'git_blob_sha1': props['sha'],
                     'sha256': digest, 'width': props['width'], 'height': props['height'],
                     'status': 'approval-candidate/source-only'})

    footer_y = full_h-FOOTER+15
    draw.text((MARGIN, footer_y), 'EXCLUDED: older support 01 and original two-pose sheet.',
              fill='#efd09b', font=font(17, True))
    draw.text((MARGIN, footer_y+33), 'No jaw/viseme or older animated cut-in; owner and device checks remain open.',
              fill='#e3e0d7', font=font(15))
    draw.text((MARGIN, footer_y+61), 'No source edits, new assets, runtime promotion, manifest changes or approval.',
              fill='#b4bfc2', font=font(14))

    report = {'status': 'approval-candidates-only', 'production_ready': False,
              'sources_verified': len(rows), 'source_order': list(ORDER),
              'original_abc_outfits': 'superseded',
              'excluded': ['aatami-older-support-01.png', 'aatami-young-pose-sheet-v01.png'],
              'contact_sheet': SHEET_NAME, 'contact_sheet_dimensions': [full_w, full_h],
              'sources': rows}
    out_dir.mkdir(parents=True, exist_ok=True)
    sheet.save(out_dir / SHEET_NAME, format='PNG')
    (out_dir / REPORT_NAME).write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[2])
    parser.add_argument('--out-dir', type=Path, required=True)
    args = parser.parse_args()
    report = render(args.root, args.out_dir)
    print(f'Rendered {report["sources_verified"]} pinned source images as an unapproved review sheet: '
          f'{args.out_dir / SHEET_NAME}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
