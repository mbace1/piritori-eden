#!/usr/bin/env python3
"""Regression check for review-only motion QC. Synthetic frames, never game art.

Runs without Chromium or source-image downloads. The output is deliberately
outside the repository and never changes approval/manifests/runtime assets.
Requires Pillow, like review_aatami_motion.py.
"""
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from PIL import Image, ImageDraw


HERE = Path(__file__).resolve().parent
TOOL = HERE / "review_aatami_motion.py"
SIZE = (390, 844)


def fixture(path):
    """Create a genuine, non-static 70-frame 10-fps GIF."""
    images = []
    for i in range(70):
        im = Image.new("RGB", SIZE, (27, 32, 38))
        draw = ImageDraw.Draw(im)
        x = 18 + 4 * i
        draw.rectangle((x, 100, x + 35, 180), fill=(202, 171, 125))
        draw.rectangle((50, 300 + i, 95, 330 + i), fill=(106, 149, 128))
        images.append(im)
    images[0].save(path, format="GIF", save_all=True, append_images=images[1:],
                   duration=100, loop=0, disposal=2, optimize=False)
    with Image.open(path) as check:
        assert check.n_frames == 70, f"Fixture encoding collapsed frames: {check.n_frames}"


class MotionReviewRegression(unittest.TestCase):
    def test_fresh_directory_and_evidence_boundary(self):
        with tempfile.TemporaryDirectory(prefix="aatami-review-test-") as temp:
            root = Path(temp)
            front, side = root / "front.gif", root / "side.gif"
            fixture(front)
            fixture(side)
            output = root / "new" / "nested" / "output"
            self.assertFalse(output.exists(), "The fixture must exercise mkdir")
            completed = subprocess.run(
                [sys.executable, str(TOOL), "--out", str(output),
                 "--pair", "Synthetic", str(front), str(side)],
                capture_output=True, text=True, check=False)
            self.assertEqual(completed.returncode, 0, completed.stderr)
            self.assertTrue((output / "aatami-source-motion-contact.png").is_file())
            self.assertTrue((output / "aatami-source-face-detail.png").is_file())
            record = json.loads((output / "aatami-source-motion-QC.json").read_text())
            self.assertEqual(record["status"], "review-candidate-not-production")
            self.assertEqual(len(record["source_records"]), 2)
            self.assertEqual({r["pose"] for r in record["source_records"]},
                             {"FRONT", "SIDE"})
            for row in record["source_records"]:
                self.assertTrue(row["evidence_only"])
                self.assertEqual((row["width"], row["height"]), SIZE)
                self.assertEqual(row["frames"], 70)
                self.assertEqual(row["duration_ms"], 7000)
                self.assertGreaterEqual(row["unique_frame_hashes"], 8)
            self.assertFalse((output / "manifest.json").exists())
            self.assertFalse((output / "rig.json").exists())

    def test_invalid_source_does_not_create_review_output(self):
        with tempfile.TemporaryDirectory(prefix="aatami-bad-source-") as temp:
            root = Path(temp)
            bad = root / "one-frame.gif"
            Image.new("RGB", SIZE, (20, 30, 40)).save(bad, "GIF")
            output = root / "should-not-exist"
            result = subprocess.run(
                [sys.executable, str(TOOL), "--out", str(output),
                 "--pair", "Synthetic", str(bad), str(bad)],
                capture_output=True, text=True, check=False)
            self.assertNotEqual(result.returncode, 0)
            self.assertFalse(output.exists(), "Invalid input must not produce evidence")


if __name__ == "__main__":
    unittest.main(verbosity=2)
