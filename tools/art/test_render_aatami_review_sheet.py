#!/usr/bin/env python3
"""Source-only contact sheet regression tests, using tiny synthetic PNGs."""
from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from PIL import Image
import render_aatami_review_sheet as sheets
from test_audit_aatami_candidates import fixture_png, git_blob_sha


class ContactSheetTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name) / 'repo'
        self.root.mkdir()
        self.out = Path(self.tmp.name) / 'out'
        expected = {}
        for i, name in enumerate(sheets.ORDER):
            png = fixture_png(value=30+i)
            path = self.root / sheets.audit.PREFIX / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(png)
            expected[name] = (git_blob_sha(png), 2, 2)
        self.mock = patch.object(sheets.audit, 'EXPECTED', expected)
        self.mock.start()
        self.addCleanup(self.mock.stop)

    def test_sheet_has_exact_nine_and_clear_review_status(self):
        unselected = self.root / sheets.audit.PREFIX / 'aatami-older-support-01.png'
        unselected.write_bytes(fixture_png(value=88))
        result = sheets.render(self.root, self.out)
        self.assertEqual(result['sources_verified'], 9)
        self.assertFalse(result['production_ready'])
        self.assertEqual(result['original_abc_outfits'], 'superseded')
        self.assertEqual(result['source_order'], list(sheets.ORDER))
        self.assertNotIn('aatami-older-support-01.png', result['source_order'])
        self.assertEqual(len(result['sources']), 9)
        self.assertTrue(all(x['status'] == 'approval-candidate/source-only' for x in result['sources']))
        self.assertEqual(json.loads((self.out/sheets.REPORT_NAME).read_text()), result)
        with Image.open(self.out / sheets.SHEET_NAME) as rendered:
            self.assertEqual(rendered.size, tuple(result['contact_sheet_dimensions']))
            self.assertEqual(rendered.mode, 'RGB')

    def test_repeatable_image_and_manifest(self):
        sheets.render(self.root, self.out)
        first = ((self.out/sheets.SHEET_NAME).read_bytes(), (self.out/sheets.REPORT_NAME).read_bytes())
        sheets.render(self.root, self.out)
        self.assertEqual(first, ((self.out/sheets.SHEET_NAME).read_bytes(), (self.out/sheets.REPORT_NAME).read_bytes()))

    def test_changed_source_rejected_before_writing(self):
        name = sheets.ORDER[3]
        (self.root/sheets.audit.PREFIX/name).write_bytes(fixture_png(value=246))
        with self.assertRaisesRegex(ValueError, 'Source hash/dimension mismatch'):
            sheets.render(self.root, self.out)
        self.assertFalse(self.out.exists())

    def test_missing_source_rejected_before_writing(self):
        name = sheets.ORDER[6]
        (self.root/sheets.audit.PREFIX/name).unlink()
        with self.assertRaises(FileNotFoundError):
            sheets.render(self.root, self.out)
        self.assertFalse(self.out.exists())

    def test_no_output_inside_repository(self):
        with self.assertRaisesRegex(ValueError, 'outside'):
            sheets.render(self.root, self.root/'art'/'v3')
        self.assertFalse((self.root/'art').exists())

    def test_selection_changes_are_blocked(self):
        with patch.object(sheets.audit, 'EXPECTED', dict(list(sheets.audit.EXPECTED.items())[:8])):
            with self.assertRaisesRegex(ValueError, 'Pinned nine-image selection'):
                sheets.render(self.root, self.out)
        self.assertFalse(self.out.exists())


if __name__ == '__main__':
    unittest.main()
