#!/usr/bin/env python3
"""Prepare the two individual young-Aatami studies from PR #108's pose sheet.

Run at repository root:
    python3 -m pip install Pillow
    python3 tools/art/split_aatami_pose_sheet.py

This deliberately writes only review/source art. It never updates runtime
manifests, changes approval status, or merges a PR.
"""
from __future__ import annotations

import hashlib
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
PEOPLE = ROOT / "art-src/concepts/people"
SOURCE = PEOPLE / "aatami-young-support-05.png"
EXPECTED_BLOB_SHA = "31fa3213699dc2bee57ebf53511ef2a7da031578"
EXPECTED_SIZE = (1145, 1374)

def git_blob_sha(data: bytes) -> str:
    return hashlib.sha1(b"blob " + str(len(data)).encode() + b"\0" + data).hexdigest()

def main() -> None:
    data = SOURCE.read_bytes()
    actual_sha = git_blob_sha(data)
    if actual_sha != EXPECTED_BLOB_SHA:
        raise SystemExit(f"Refusing to crop changed source: {actual_sha}")

    original_sheet = PEOPLE / "aatami-young-pose-sheet-v01.png"
    if original_sheet.exists() and original_sheet.read_bytes() != data:
        raise SystemExit("Refusing to overwrite a different original pose sheet")
    original_sheet.write_bytes(data)

    with Image.open(SOURCE) as original:
        if original.size != EXPECTED_SIZE:
            raise SystemExit(f"Unexpected pose sheet size: {original.size}")
        im = original.convert("RGB")
        # Verified full-figure crops. The right figure starts at x=575.
        for filename, crop in (
            ("aatami-young-support-05.png", (0, 0, 570, 1374)),
            ("aatami-young-support-07.png", (575, 0, 1145, 1374)),
        ):
            output = PEOPLE / filename
            im.crop(crop).save(output, optimize=True)
            print(f"Wrote {output.relative_to(ROOT)}")

    (PEOPLE / "aatami-young-support-05.txt").write_text(
        "Young Aatami, left individual pose cropped from "
        "aatami-young-pose-sheet-v01.png; source review only.\n"
    )
    (PEOPLE / "aatami-young-support-07.txt").write_text(
        "Young Aatami, right individual pose cropped from "
        "aatami-young-pose-sheet-v01.png; source review only.\n"
    )
    (PEOPLE / "aatami-young-pose-sheet-v01.txt").write_text(
        "Unmodified original two-pose study; split into individual supporting "
        "studies 05 and 07. Not a runtime asset.\n"
    )
    print("Review-only split complete. Do not promote or merge automatically.")

if __name__ == "__main__":
    main()
