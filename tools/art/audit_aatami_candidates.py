#!/usr/bin/env python3
"""Read-only QC for PR #108's nine owner-selected Aatami review images.

Usage from a repository checkout:
    python3 tools/art/audit_aatami_candidates.py
Or against the corrected review ZIP:
    python3 tools/art/audit_aatami_candidates.py --zip /path/to/candidates.zip

No third-party dependencies. Never alters art, approvals, or runtime manifests.
A matching source PNG is NOT proof of an approved production cutout.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import struct
import sys
import zipfile
from pathlib import Path

PREFIX = "art-src/concepts/people/"
# (Git blob SHA-1, width, height). Fixed to the reviewed 2026-10-27 selection.
EXPECTED = {
    "aatami-young-final-v01.png": ("1a2d028710a03cf26f8179bfd919e358cc14cf08", 1144, 1375),
    "aatami-young-support-01.png": ("f217fda1105f825fdbdc3e2b515253231f42a6be", 1254, 1254),
    "aatami-young-support-02.png": ("8a239df35d2ea7e8b9d42a1146b967c1ddf850ca", 1145, 1374),
    "aatami-young-support-03.png": ("2057b1f762ad820bdde6096ab90155a8100cae3a", 1145, 1374),
    "aatami-young-support-04.png": ("3367a073c543fcee6e40e41012c435316b3cf755", 1145, 1374),
    "aatami-young-support-05.png": ("3d981e303d65ce4991f283b30996548472b0c490", 570, 1374),
    "aatami-young-support-06.png": ("20ed3517211356d0bc17e4a0f505b9c888fa045e", 1145, 1374),
    "aatami-young-support-07.png": ("9d5e297455c3cf9756fd9f3370bf32de37b9f807", 570, 1374),
    "aatami-older-final-v01.png": ("914446a7ccf9b35536abd373f5ac2d700d99cce4", 1024, 1536),
}
PNG_SIG = b"\x89PNG\r\n\x1a\n"
COLOR_TYPES = {0: "greyscale", 2: "RGB", 3: "indexed", 4: "greyscale+alpha", 6: "RGBA"}


def inspect(data: bytes) -> dict:
    sha = hashlib.sha1(b"blob " + str(len(data)).encode("ascii") + b"\0" + data).hexdigest()
    if len(data) < 33 or data[:8] != PNG_SIG or data[12:16] != b"IHDR":
        raise ValueError("invalid PNG signature/IHDR")
    width, height, depth, color, compression, filt, interlace = struct.unpack(">IIBBBBB", data[16:29])
    if not width or not height or color not in COLOR_TYPES:
        raise ValueError("invalid PNG dimensions/colour type")
    return {
        "sha": sha, "width": width, "height": height,
        "bit_depth": depth, "color_type": COLOR_TYPES[color],
        "has_alpha_channel": color in (4, 6),
        "bytes": len(data),
    }


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--zip", dest="zip_path", type=Path, help="corrected review ZIP instead of checkout")
    p.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[2])
    p.add_argument("--json", action="store_true")
    args = p.parse_args()
    results, errors = [], []
    archive = zipfile.ZipFile(args.zip_path) if args.zip_path else None
    try:
        for name, (expected_sha, width, height) in EXPECTED.items():
            path = PREFIX + name
            try:
                data = archive.read(path) if archive else (args.root / path).read_bytes()
                row = {"name": name, **inspect(data)}
                row["hash_match"] = row["sha"] == expected_sha
                row["dimensions_match"] = (row["width"], row["height"]) == (width, height)
                if not row["hash_match"] or not row["dimensions_match"]:
                    errors.append(f"{name}: unexpected bytes or dimensions")
                results.append(row)
            except (KeyError, OSError, ValueError) as exc:
                errors.append(f"{name}: {exc}")
    finally:
        if archive:
            archive.close()

    summary = {
        "selection": "1 young final + 7 young studies + 1 older final",
        "original_abc": "superseded, not separately delivered",
        "selected_count": len(EXPECTED),
        "verified_count": sum(r["hash_match"] and r["dimensions_match"] for r in results),
        "transparent_count": sum(r["has_alpha_channel"] for r in results),
        "excluded": ["aatami-older-support-01.png", "aatami-young-pose-sheet-v01.png"],
        "production_status": "review/source only; no runtime promotion",
        "files": results, "errors": errors,
    }
    if args.json:
        print(json.dumps(summary, indent=2))
    else:
        for r in results:
            print(f"{'OK' if r['hash_match'] and r['dimensions_match'] else 'FAIL'} "
                  f"{r['name']} {r['width']}x{r['height']} {r['color_type']}")
        for e in errors:
            print("ERROR", e, file=sys.stderr)
        print(f"Verified {summary['verified_count']}/{len(EXPECTED)} selected PNGs; "
              f"{summary['transparent_count']} with alpha channels.")
        print("All matching RGB sources still require extraction/approval before use as cutouts.")
        print("Older extra study excluded; original A/B/C superseded. No files changed.")
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
