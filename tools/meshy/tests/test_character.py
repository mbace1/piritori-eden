"""Production ledger regression checks; no API calls or art generation."""
import contextlib
import copy
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest

MODULE = Path(__file__).resolve().parents[1] / "character.py"
definition = importlib.util.spec_from_file_location("character", MODULE)
c = importlib.util.module_from_spec(definition)
definition.loader.exec_module(c)


class CharacterLedgerTests(unittest.TestCase):
    def setUp(self):
        self.manifest = c.read_json(c.ROOT / "assets/asset_manifest.json")
        self.spec = c.read_json(c.ROOT / "assets/character_spec.json")
        self.item = copy.deepcopy(self.manifest["characters"]["CHR_F01"])

    def test_delivered_candidates_match_runtime_bytes_and_inventory(self):
        for asset_id, item in self.manifest["characters"].items():
            c.check_record(asset_id, item, self.spec)
            c.check_files(c.ROOT, item)

    def test_readiness_names_real_unfinished_work(self):
        result = c.readiness(self.item, self.spec)
        self.assertTrue(any("19412" in x for x in result))
        self.assertTrue(any("canonical rig" in x for x in result))
        self.assertTrue(any("pixel_10_pro" in x for x in result))
        self.assertTrue(any("private_archive" in x for x in result))

    def test_prototype_cannot_be_relabelled_game_ready(self):
        for status in ("VALIDATED", "GAME_READY", "INTEGRATED"):
            with self.subTest(status=status):
                self.item["status"] = status
                with self.assertRaisesRegex(ValueError, "overstates readiness"):
                    c.check_record("CHR_F01", self.item, self.spec)

    def test_old_evidence_cannot_accept_a_replacement_mesh(self):
        self.item["gates"]["owner_visual"] = {
            "result": "pass", "reason": "test record", "reviewed_at": "2026-09-12",
            "candidate_sha256": "a" * 64, "evidence": "test-only.md"}
        with self.assertRaisesRegex(ValueError, "different candidate"):
            c.check_record("CHR_F01", self.item, self.spec)

    def test_rejected_character_cannot_be_enabled(self):
        rejected = copy.deepcopy(self.manifest["characters"]["CHR_F03"])
        rejected["enabled"] = True
        with self.assertRaisesRegex(ValueError, "rejected concept"):
            c.check_record("CHR_F03", rejected, self.spec)

    def test_generated_stage_does_not_require_rig_yet(self):
        self.item["status"] = "GENERATED"
        self.item["candidate"]["rig"] = None
        self.item["candidate"]["joints"] = 0
        self.item["integration"] = {"mode": "none"}
        c.check_record("CHR_F01", self.item, self.spec)
        self.assertTrue(c.readiness(self.item, self.spec))

    def test_corrupted_binary_and_stale_registry_are_detected(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            candidate = self.item["candidate"]
            path = root / candidate["file"]
            path.parent.mkdir(parents=True)
            raw = bytearray((c.ROOT / candidate["file"]).read_bytes())
            raw[-1] ^= 1  # Same length and JSON inventory, different payload.
            path.write_bytes(raw)
            with self.assertRaisesRegex(ValueError, "sha256"):
                c.check_files(root, self.item)
            raw[-1] ^= 1
            path.write_bytes(raw)
            registry = {"assets": [{"id": self.item["integration"]["runtime_id"],
                "file": candidate["file"].removeprefix("art/v3/"),
                "bytes": candidate["bytes"], "sha256": "b" * 64}]}
            (root / "art/v3/manifest.json").write_text(json.dumps(registry), encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "runtime register mismatch"):
                c.check_files(root, self.item)

    def test_paths_cannot_escape_root(self):
        with self.assertRaises(ValueError):
            c.local_path(c.ROOT, "../outside.glb")

    def test_cli_reports_exit_codes_without_mutating_ledger(self):
        path = c.ROOT / "assets/asset_manifest.json"
        before = path.read_bytes()
        cases = [(["status", "CHR_F02", "--json"], 0),
                 (["validate", "CHR_F01", "--json"], 1),
                 (["validate", "CHR_F03", "--json"], 1),
                 (["status", "CHR_X99", "--json"], 2)]
        for args, expected in cases:
            with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
                self.assertEqual(c.main(args), expected)
        self.assertEqual(path.read_bytes(), before)


if __name__ == "__main__":
    unittest.main()
