#!/usr/bin/env python3
"""Candidate-only package tests; synthetic PNGs, no production assets."""
from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from zipfile import ZipFile

import package_aatami_review as pack
from test_audit_aatami_candidates import fixture_png, git_blob_sha


class CandidatePackageTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name) / "source"
        self.root.mkdir()
        self.out1 = Path(self.temp.name) / "one.zip"
        self.out2 = Path(self.temp.name) / "two.zip"
        self.selected = {}
        for i in range(9):
            name = f"selected-{i:02d}.png"
            data = fixture_png(value=10 + i)
            dest = self.root / pack.audit.PREFIX / name
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(data)
            self.selected[name] = (git_blob_sha(data), 2, 2)
        self.patch = patch.object(pack.audit, "EXPECTED", self.selected)
        self.patch.start()
        self.addCleanup(self.patch.stop)

    def test_exact_nine_and_manifest_candidate_only(self):
        unselected = self.root / pack.audit.PREFIX / "aatami-older-support-01.png"
        unselected.write_bytes(fixture_png(value=99))
        report = pack.package(self.root, self.out1)
        self.assertEqual(report["selected_count"], 9)
        self.assertFalse(report["production_ready"])
        self.assertEqual(report["status"], "approval-candidates-only")
        self.assertEqual(report["abc_outfit_concepts"], "superseded")
        with ZipFile(self.out1) as z:
            names = z.namelist()
            self.assertEqual(len(names), 11)
            self.assertEqual(len(set(names)), len(names))
            self.assertNotIn(pack.audit.PREFIX + "aatami-older-support-01.png", names)
            self.assertEqual(
                set(names),
                {"REVIEW_ONLY.md", "review_manifest.json"}
                | {pack.audit.PREFIX + n for n in self.selected}
            )
            self.assertIn("none is an approved cutout", z.read("REVIEW_ONLY.md").decode())
            saved = json.loads(z.read("review_manifest.json"))
            self.assertFalse(saved["production_ready"])
            self.assertEqual(len(saved["files"]), 9)
            self.assertTrue(all(r["status"] == "review-only" for r in saved["files"]))

    def test_deterministic_package(self):
        pack.package(self.root, self.out1)
        pack.package(self.root, self.out2)
        self.assertEqual(self.out1.read_bytes(), self.out2.read_bytes())

    def test_modified_source_rejected_without_output(self):
        file = self.root / pack.audit.PREFIX / "selected-05.png"
        file.write_bytes(fixture_png(value=111))
        with self.assertRaisesRegex(ValueError, "Source mismatch"):
            pack.package(self.root, self.out1)
        self.assertFalse(self.out1.exists())

    def test_missing_source_rejected_without_output(self):
        (self.root / pack.audit.PREFIX / "selected-03.png").unlink()
        with self.assertRaises(FileNotFoundError):
            pack.package(self.root, self.out1)
        self.assertFalse(self.out1.exists())

    def test_cannot_write_into_checkout(self):
        with self.assertRaisesRegex(ValueError, "outside"):
            pack.package(self.root, self.root / "art/v3/review.zip")
        self.assertFalse((self.root / "art/v3/review.zip").exists())

    def test_changed_selection_requires_review(self):
        with patch.object(pack.audit, "EXPECTED", dict(list(self.selected.items())[:8])):
            with self.assertRaisesRegex(ValueError, "nine-image"):
                pack.package(self.root, self.out1)
        self.assertFalse(self.out1.exists())


if __name__ == "__main__":
    unittest.main()
