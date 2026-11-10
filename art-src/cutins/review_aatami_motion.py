#!/usr/bin/env python3
"""Review-only Aatami motion filmstrip from previously captured candidate GIFs.

Usage:
  python review_aatami_motion.py --out /tmp/candidate-qc \
    --pair Jaska jaska-front.gif jaska-side.gif \
    --pair Toko toko-front.gif toko-side.gif

Inputs are prior review renders, never runtime art. Output is evidence, not approval.
Requires Pillow. Does not create visemes, rig layers, or change game files.
"""
import argparse
import hashlib
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

TIMES = (0, 10, 20, 35, 55, 69)  # 0.0, 1.0, 2.0, 3.5, 5.5, 6.9 sec
TARGET = (390, 844)
COUNT = 70
CANVAS_BG = '#202328'
TILE_W = 182
TILE_H = round(TARGET[1] * TILE_W / TARGET[0])
LABEL_W = 132
MARGIN = 22
GAP = 8
ROW_GAP = 18


def font(size, bold=False):
    names = ['DejaVuSans-Bold.ttf', 'LiberationSans-Bold.ttf'] if bold else ['DejaVuSans.ttf', 'LiberationSans-Regular.ttf']
    for name in names:
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default()


def read_gif(file_path):
    p = Path(file_path)
    if not p.is_file():
        raise FileNotFoundError(str(p))
    image = Image.open(p)
    if image.format != 'GIF' or image.size != TARGET:
        raise ValueError(f'Expected {TARGET} GIF: {p}, got {image.format} {image.size}')
    if image.n_frames != COUNT:
        raise ValueError(f'Expected {COUNT} frames; got {image.n_frames} in {p}')
    duration = []
    hashes = []
    snapshots = {}
    for i in range(image.n_frames):
        image.seek(i)
        dt = int(image.info.get('duration', 0))
        duration.append(dt)
        rgb = image.convert('RGB')
        hashes.append(hashlib.sha256(rgb.tobytes()).hexdigest())
        if i in TIMES:
            snapshots[i] = rgb.copy()
    if not all(x == 100 for x in duration):
        raise ValueError(f'Expected 10fps, found durations {sorted(set(duration))} in {p}')
    if len(set(hashes)) < 8:
        raise ValueError(f'Insufficient motion variation (<8 unique frames): {p}')
    return snapshots, dict(file=p.name, source_sha256=hashlib.sha256(p.read_bytes()).hexdigest(),
                           width=image.width, height=image.height, frames=image.n_frames,
                           duration_ms=sum(duration), unique_frame_hashes=len(set(hashes)),
                           evidence_only=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--out', type=Path, required=True)
    parser.add_argument('--pair', action='append', nargs=3, metavar=('PARTNER','FRONT_GIF','SIDE_GIF'), required=True)
    args = parser.parse_args()
    labels = [p[0] for p in args.pair]
    if len(set(labels)) != len(labels):
        raise ValueError('Duplicate partner label')
    rows = []
    source_records = []
    for partner, front, side in args.pair:
        for pose_name, src in [('FRONT', front), ('SIDE', side)]:
            snaps, rec = read_gif(src)
            rec.update(partner=partner, pose=pose_name)
            rows.append((partner, pose_name, snaps))
            source_records.append(rec)

    ncols = len(TIMES)
    width = MARGIN*2 + LABEL_W + ncols*TILE_W + (ncols-1)*GAP
    header_h = 112
    row_h = TILE_H + 41
    height = header_h + len(rows)*(row_h+ROW_GAP) + 93
    img = Image.new('RGB', (width, height), CANVAS_BG)
    dr = ImageDraw.Draw(img)
    dr.text((MARGIN, 12), 'AATAMI | SOURCE-MOTION REVIEW', fill='#f0e4cf', font=font(24, True))
    dr.text((MARGIN, 49), 'Original 10 fps candidate GIFs  •  no new artwork  •  not approval', fill='#b4b9c0', font=font(13))
    for j, frame in enumerate(TIMES):
        x = MARGIN+LABEL_W+j*(TILE_W+GAP)
        dr.text((x, 83), f'{frame/10:0.1f} s', fill='#e4c48b', font=font(15, True))
    for idx,(partner, pose_name, shots) in enumerate(rows):
        yy=header_h+idx*(row_h+ROW_GAP)
        dr.text((MARGIN,yy+16),partner.upper(),fill='#f0e4cf',font=font(17, True))
        dr.text((MARGIN,yy+43),pose_name,fill='#e4c48b',font=font(15, True))
        for j,frame in enumerate(TIMES):
            x=MARGIN+LABEL_W+j*(TILE_W+GAP)
            tile=shots[frame].resize((TILE_W,TILE_H),Image.Resampling.LANCZOS)
            img.paste(tile,(x,yy))
            dr.rectangle((x,yy,x+TILE_W-1,yy+TILE_H-1),outline='#58626b',width=1)
        dr.line((MARGIN,yy+TILE_H+10,width-MARGIN,yy+TILE_H+10),fill='#41464e',width=1)
    footer=header_h+len(rows)*(row_h+ROW_GAP)
    dr.text((MARGIN,footer+4),'SOURCE LIMIT: Aatami has no jaw/viseme layer in registered front/side cut-in rigs.',
            fill='#efbd85',font=font(13,True))
    dr.text((MARGIN,footer+28),'Frame variation ≠ speaking-mouth animation. Human visual + physical-device approval remain open.',
            fill='#c0c7cd',font=font(13))
    args.out.mkdir(parents=True,exist_ok=True)
    img_path=args.out/'aatami-source-motion-contact.png'
    img.save(img_path,optimize=True)
    result={'status':'review-candidate-not-production','sample_frames':list(TIMES),
            'source_records':source_records,
            'notes':['GIF integrity and frame variation verified; no visual approval claimed.',
                     'Registered Aatami front/side rigs have torso, head and eyelids only; no mouth/jaw/viseme layer.',
                     'No editing, rig extraction, source change, approval update, runtime promotion or deployment.'],
            'contact_sheet':img_path.name}
    result_path=args.out/'aatami-source-motion-QC.json'
    result_path.write_text(json.dumps(result,indent=2)+'\n')
    print(f'Wrote {img_path} and {result_path}; {len(source_records)} candidate GIFs checked.')


if __name__ == '__main__':
    main()
