#!/usr/bin/env python3
"""Create a verified, review-only ZIP of PR #108's nine selected Aatami PNGs.

No artwork is generated or modified. The output must be outside the repository
checkout; never write to art/v3, art-library/APPROVALS.md, or playable assets.

Usage:
  python3 tools/art/package_aatami_review.py --out /tmp/aatami-nine-review.zip
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from zipfile import ZIP_STORED, ZipFile, ZipInfo

import audit_aatami_candidates as audit

README = """# Aatami — nine selected source images (REVIEW ONLY)

This ZIP contains one young final, seven young studies, and one older final.
Original A/B/C outfit explorations were **superseded**, not finished separately.

The additional older study and the original two-pose sheet are excluded from
this selected package (the source sheet remains preserved in PR #108 history).

All nine images are opaque concept/source PNGs; none is an approved cutout,
animation, rig, dialogue character, or playable asset. The owner must separately
approve any new extraction, animation and runtime promotion, after device QC.

Authority: DESIGN_AUTHORITY.md, ART_BIBLE.md, art-library/APPROVALS.md,
ROADMAP.md, and art-src/concepts/people/AATAMI_BRIEF.md.

PR: https://github.com/mbace1/piritori-eden/pull/108
"""


def add_to_zip(z: ZipFile, name: str, data: bytes) -> None:
    # Fixed timestamps and ordering keep generated evidence reproducible.
    info = ZipInfo(name, date_time=(1980, 1, 1, 0, 0, 0))
    info.compress_type = ZIP_STORED
    info.external_attr = 0o644 << 16
    z.writestr(info, data)


def package(root: Path, output: Path) -> dict:
    root = root.resolve()
    output = output.resolve()
    if output == root or root in output.parents:
        raise ValueError("Review ZIP output must be outside the repository/source checkout")
    if len(audit.EXPECTED) != 9:
        raise ValueError("The pinned nine-image selection has changed; review before packaging")

    # Complete integrity check BEFORE creating a ZIP, so failure leaves no
    # partial or misleading review artifact.
    files = []
    records = []
    for name, (sha, width, height) in audit.EXPECTED.items():
        file_name = audit.PREFIX + name
        data = (root / file_name).read_bytes()
        result = audit.inspect(data)
        if (result["sha"], result["width"], result["height"]) != (sha, width, height):
            raise ValueError(f"Source mismatch: {file_name}")
        if result["has_alpha_channel"]:
            raise ValueError(f"Source no longer has the expected opaque format: {file_name}")
        files.append((file_name, data))
        records.append({"path": file_name, "git_blob_sha1": sha,
                        "sha256": hashlib.sha256(data).hexdigest(),
                        "width": width, "height": height, "status": "review-only"})

    manifest = {
        "status": "approval-candidates-only",
        "production_ready": False,
        "selected_count": 9,
        "selection": "young final + young supports 01–07 + older final",
        "abc_outfit_concepts": "superseded",
        "excluded_from_package": [
            "aatami-older-support-01.png", "aatami-young-pose-sheet-v01.png"
        ],
        "files": records,
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    with ZipFile(output, "w") as z:
        add_to_zip(z, "REVIEW_ONLY.md", README.encode("utf-8"))
        add_to_zip(z, "review_manifest.json", (json.dumps(manifest, indent=2, ensure_ascii=False) + "\n").encode("utf-8"))
        for path, data in files:
            add_to_zip(z, path, data)
    return manifest


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[2])
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    manifest = package(args.root, args.out)
    print(f"Packaged {manifest['selected_count']} verified, unapproved source PNGs: {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
