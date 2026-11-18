#!/usr/bin/env python3
"""Regression tests for PR #108's read-only nine-source Aatami audit.

Runs exclusively on synthetic tiny PNG fixtures in temporary directories.
Does not write artwork, approvals, manifests, or source files in the checkout.
The real nine-image source hashes are checked separately by the CI audit.
"""
from __future__ import annotations

import contextlib
import hashlib
import importlib.util
import io
import json
import struct
import sys
import tempfile
import unittest
import zipfile
import zlib
from pathlib import Path
from unittest.mock import patch

SCRIPT = Path(__file__).with_name("audit_aatami_candidates.py")
SPEC = importlib.util.spec_from_file_location("aatami_source_audit", SCRIPT)
AUDIT = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
SPEC.loader.exec_module(AUDIT)

NAME = "synthetic-review-fixture.png"
PATH = AUDIT.PREFIX + NAME


def png_chunk(kind: bytes, payload: bytes) -> bytes:
    chunk = kind + payload
    return struct.pack(">I", len(payload)) + chunk + struct.pack(">I", zlib.crc32(chunk) & 0xFFFFFFFF)


def fixture_png(width: int = 2, height: int = 2, value: int = 127) -> bytes:
    """Minimal valid RGB PNG; never a game asset."""
    head = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    raw = b"".join(b"\x00" + bytes([value]) * (width * 3) for _ in range(height))
    return (b"\x89PNG\r\n\x1a\n" + png_chunk(b"IHDR", head)
            + png_chunk(b"IDAT", zlib.compress(raw)) + png_chunk(b"IEND", b""))


def git_blob_sha(data: bytes) -> str:
    return hashlib.sha1(b"blob " + str(len(data)).encode("ascii") + b"\0" + data).hexdigest()


class AatamiSourceAuditTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.good = fixture_png()
        self.expected = {NAME: (git_blob_sha(self.good), 2, 2)}

    def run_audit(self, *, zip_path: Path | None = None) -> tuple[int, dict]:
        args = ["audit_aatami_candidates.py", "--json", "--root", str(self.root)]
        if zip_path:
            args.extend(["--zip", str(zip_path)])
        output = io.StringIO()
        with patch.object(AUDIT, "EXPECTED", self.expected), patch.object(sys, "argv", args):
            with contextlib.redirect_stdout(output):
                code = AUDIT.main()
        return code, json.loads(output.getvalue())

    def put_source(self, data: bytes) -> None:
        target = self.root / PATH
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)

    def test_exact_valid_source_passes_without_promotion(self) -> None:
        self.put_source(self.good)
        code, report = self.run_audit()
        self.assertEqual(code, 0)
        self.assertEqual(report["verified_count"], 1)
        self.assertEqual(report["selected_count"], 1)
        self.assertEqual(report["transparent_count"], 0)
        self.assertFalse(report["errors"])
        self.assertEqual(report["production_status"], "review/source only; no runtime promotion")
        self.assertEqual(report["original_abc"], "superseded, not separately delivered")
        self.assertEqual(set(report["excluded"]),
                         {"aatami-older-support-01.png", "aatami-young-pose-sheet-v01.png"})

    def test_missing_source_is_rejected(self) -> None:
        code, report = self.run_audit()
        self.assertEqual(code, 1)
        self.assertEqual(report["verified_count"], 0)
        self.assertTrue(any(NAME in error for error in report["errors"]))

    def test_same_dimensions_but_changed_source_is_rejected(self) -> None:
        self.put_source(fixture_png(value=126))
        code, report = self.run_audit()
        self.assertEqual(code, 1)
        self.assertFalse(report["files"][0]["hash_match"])

    def test_changed_dimensions_are_rejected(self) -> None:
        data = fixture_png(width=3, height=2)
        self.put_source(data)
        # Isolate the dimension gate; real audit also rejects its hash.
        with patch.object(self, "expected", {NAME: (git_blob_sha(data), 2, 2)}):
            code, report = self.run_audit()
        self.assertEqual(code, 1)
        self.assertTrue(report["files"][0]["hash_match"])
        self.assertFalse(report["files"][0]["dimensions_match"])

    def test_invalid_png_is_rejected(self) -> None:
        self.put_source(b"not a PNG")
        code, report = self.run_audit()
        self.assertEqual(code, 1)
        self.assertTrue(any("invalid PNG" in error for error in report["errors"]))

    def test_zip_uses_same_integrity_checks(self) -> None:
        archive = self.root / "review.zip"
        with zipfile.ZipFile(archive, "w") as out:
            out.writestr(PATH, self.good)
            out.writestr(AUDIT.PREFIX + "aatami-older-support-01.png", fixture_png(value=32))
        code, report = self.run_audit(zip_path=archive)
        self.assertEqual(code, 0)
        self.assertEqual(report["verified_count"], 1)
        self.assertEqual(report["selected_count"], 1)
        self.assertNotIn("aatami-older-support-01.png", {r["name"] for r in report["files"]})

        with zipfile.ZipFile(archive, "w") as out:
            out.writestr(PATH, fixture_png(value=32))
        code, report = self.run_audit(zip_path=archive)
        self.assertEqual(code, 1)
        self.assertFalse(report["files"][0]["hash_match"])


if __name__ == "__main__":
    unittest.main()
