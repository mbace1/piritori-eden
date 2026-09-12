#!/usr/bin/env python3
"""Block Meshy post-processing until recorded visual gates pass.

The decision JSON stays in the ignored private workspace. This checker contains
no credentials and never calls Meshy. See ``art-src/meshy-input/
MESHY_CANDIDATE_GATE.md`` for the workflow and the adjacent JSON template.

Examples:

    python art-src/tools/meshy_candidate_gate.py decision.json --before remesh
    python art-src/tools/meshy_candidate_gate.py decision.json --before rig
    python art-src/tools/meshy_candidate_gate.py --self-test
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import tempfile
from pathlib import Path
from typing import Any


SCHEMA_VERSION = 1
HEX_64 = re.compile(r"^[0-9a-fA-F]{64}$")
PRIVATE_VALUE = re.compile(r"(?:^|[^A-Za-z0-9])msy_[A-Za-z0-9_-]+")
SECRET_KEY = re.compile(r"api.?key|authorization|bearer|password|secret|token", re.I)

REQUIRED_EVIDENCE = {
    "generation": (
        "front",
        "back",
        "left",
        "right",
        "three_quarter",
        "face",
        "left_hand",
        "right_hand",
    ),
    "production_input": (
        "front",
        "back",
        "three_quarter",
        "gameplay_scale",
        "face",
        "left_hand",
        "right_hand",
    ),
    "rig": (
        "bind_front",
        "idle",
        "walk",
        "hands_open",
        "hands_relaxed",
        "hands_fist",
        "hands_grip_contact",
    ),
}

REQUIRED_CHECKS = {
    "generation": (
        "approved_source_and_identity",
        "rest_pose_matches_request",
        "arm_proportions_and_symmetry",
        "five_digits_each_hand",
        "finger_gaps_and_thumb_opposition",
        "clean_limb_and_wrist_attachment",
        "no_holes_floaters_or_intersections",
        "face_and_silhouette_readable",
    ),
    "production_input": (
        "actual_triangles_within_14500_16500",
        "face_readable_at_gameplay_size",
        "all_digits_survive_remesh",
        "clean_wrist_and_cuff",
        "skin_is_natural_not_white",
        "face_and_hands_match",
        "hair_and_clothing_unchanged",
        "no_uv_bleed_or_seams",
    ),
    "rig": (
        "required_joint_contract",
        "independent_finger_controls",
        "arm_length_stable_in_motion",
        "clean_deformation",
        "open_relaxed_fist_and_grip",
        "prop_contact",
        "no_skin_or_material_regression",
    ),
}

STAGE_GATES = {
    "remesh": ("generation",),
    "texture": ("generation",),
    "rig": ("generation", "production_input"),
    "animate": ("generation", "production_input", "rig"),
    "integrate": ("generation", "production_input", "rig"),
}

PREREQUISITE_STATUS = {
    "texture": ("remesh",),
    "rig": ("remesh", "texture"),
    "animate": ("remesh", "texture", "rig"),
    "integrate": ("remesh", "texture", "rig", "animate"),
}


class InvalidRecord(Exception):
    """The record cannot provide trustworthy provenance."""


class GateBlocked(Exception):
    """The record is valid, but visual acceptance has not been earned."""


def fail_if_secret(value: Any, path: str = "root") -> None:
    if isinstance(value, dict):
        for key, child in value.items():
            if SECRET_KEY.search(str(key)):
                raise InvalidRecord(f"{path}.{key}: secret-shaped keys are forbidden")
            fail_if_secret(child, f"{path}.{key}")
    elif isinstance(value, list):
        for index, child in enumerate(value):
            fail_if_secret(child, f"{path}[{index}]")
    elif isinstance(value, str) and PRIVATE_VALUE.search(value):
        raise InvalidRecord(f"{path}: Meshy credentials must never enter a decision record")


def require_dict(parent: dict[str, Any], key: str, path: str) -> dict[str, Any]:
    value = parent.get(key)
    if not isinstance(value, dict):
        raise InvalidRecord(f"{path}.{key}: expected object")
    return value


def require_text(parent: dict[str, Any], key: str, path: str) -> str:
    value = parent.get(key)
    if not isinstance(value, str) or not value.strip():
        raise InvalidRecord(f"{path}.{key}: expected non-empty text")
    return value.strip()


def require_sha256(value: Any, path: str) -> str:
    if not isinstance(value, str) or not HEX_64.fullmatch(value):
        raise InvalidRecord(f"{path}: expected a 64-character SHA-256")
    return value.lower()


def local_path(value: Any, record_dir: Path, path: str) -> Path:
    if not isinstance(value, str) or not value.strip():
        raise InvalidRecord(f"{path}: expected a local evidence path")
    if "://" in value:
        raise InvalidRecord(f"{path}: URLs are forbidden; retain evidence privately")
    resolved = Path(value)
    if not resolved.is_absolute():
        resolved = record_dir / resolved
    if not resolved.is_file():
        raise InvalidRecord(f"{path}: file not found: {resolved}")
    return resolved


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for block in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def validate_source(record: dict[str, Any], record_dir: Path) -> None:
    source = require_dict(record, "source", "root")
    local_path(source.get("reference"), record_dir, "root.source.reference")
    require_sha256(source.get("sha256"), "root.source.sha256")
    require_text(source, "approval_record", "root.source")


def validate_generation(record: dict[str, Any]) -> None:
    generation = require_dict(record, "generation", "root")
    channel = require_text(generation, "channel", "root.generation")
    if channel not in {"workspace", "3d-agent", "api"}:
        raise InvalidRecord("root.generation.channel: use workspace, 3d-agent, or api")
    require_text(generation, "plan", "root.generation")
    require_text(generation, "model", "root.generation")
    require_sha256(
        generation.get("settings_sha256"), "root.generation.settings_sha256"
    )
    shown = generation.get("live_free_retries_shown")
    if not isinstance(shown, int) or shown < 0:
        raise InvalidRecord(
            "root.generation.live_free_retries_shown: expected a non-negative integer"
        )
    if channel == "api" and shown != 0:
        raise InvalidRecord("API generations cannot claim Workspace Free Retry")

    attempts = generation.get("attempts")
    if not isinstance(attempts, list) or not attempts:
        raise InvalidRecord("root.generation.attempts: expected at least one attempt")
    seen: set[int] = set()
    free_retries = 0
    settings_sha = generation["settings_sha256"].lower()
    for index, attempt in enumerate(attempts):
        path = f"root.generation.attempts[{index}]"
        if not isinstance(attempt, dict):
            raise InvalidRecord(f"{path}: expected object")
        number = attempt.get("attempt")
        if number != index:
            raise InvalidRecord(f"{path}.attempt: attempts must be contiguous from zero")
        seen.add(number)
        kind = require_text(attempt, "kind", path)
        if index == 0:
            if kind != "initial" or attempt.get("parent_attempt") is not None:
                raise InvalidRecord(f"{path}: attempt zero must be an initial root")
        else:
            parent = attempt.get("parent_attempt")
            if not isinstance(parent, int) or parent not in seen or parent == number:
                raise InvalidRecord(f"{path}.parent_attempt: expected an earlier attempt")
            if kind == "free-retry":
                free_retries += 1
                if channel not in {"workspace", "3d-agent"}:
                    raise InvalidRecord(f"{path}: API resubmission is not a Free Retry")
                attempt_settings = require_sha256(
                    attempt.get("settings_sha256"), f"{path}.settings_sha256"
                )
                if attempt_settings != settings_sha:
                    raise InvalidRecord(
                        f"{path}: a Free Retry must retain the recorded input/settings fingerprint"
                    )
            elif kind != "paid-resubmit":
                raise InvalidRecord(f"{path}.kind: expected free-retry or paid-resubmit")

        outcome = require_text(attempt, "outcome", path)
        if outcome not in {"completed", "technical-failure"}:
            raise InvalidRecord(f"{path}.outcome: expected completed or technical-failure")
        if kind == "free-retry" and outcome == "technical-failure":
            raise InvalidRecord(
                f"{path}: technical failures should be recorded as refunded, not Free Retry"
            )
        require_sha256(attempt.get("result_sha256"), f"{path}.result_sha256")
        decision = require_text(attempt, "decision", path)
        if decision not in {"accept", "redo", "reject"}:
            raise InvalidRecord(f"{path}.decision: expected accept, redo, or reject")
        failures = attempt.get("failure_codes")
        if not isinstance(failures, list) or any(
            not isinstance(code, str) or not code.strip() for code in failures
        ):
            raise InvalidRecord(f"{path}.failure_codes: expected a list of codes")
        if decision == "accept" and failures:
            raise InvalidRecord(f"{path}: accepted attempt cannot retain failure codes")
        if decision != "accept" and not failures:
            raise InvalidRecord(f"{path}: redo/reject requires at least one failure code")

    if free_retries > shown:
        raise InvalidRecord("recorded Free Retry attempts exceed the live UI entitlement")
    selected = generation.get("selected_attempt")
    if not isinstance(selected, int) or selected not in seen:
        raise InvalidRecord("root.generation.selected_attempt: unknown attempt")
    if attempts[selected].get("decision") != "accept":
        raise GateBlocked("the selected generation attempt is not accepted")


def validate_artifact(
    record: dict[str, Any], key: str, record_dir: Path, triangles: bool = False
) -> None:
    artifacts = require_dict(record, "artifacts", "root")
    artifact = require_dict(artifacts, key, "root.artifacts")
    path = local_path(artifact.get("path"), record_dir, f"root.artifacts.{key}.path")
    expected = require_sha256(
        artifact.get("sha256"), f"root.artifacts.{key}.sha256"
    )
    actual = sha256(path)
    if expected != actual:
        raise InvalidRecord(
            f"root.artifacts.{key}.sha256: expected {expected}, measured {actual}"
        )
    if triangles:
        count = artifact.get("triangles")
        if not isinstance(count, int) or not 14500 <= count <= 16500:
            raise GateBlocked(
                f"production input has {count!r} triangles; expected 14,500-16,500"
            )


def validate_gate(record: dict[str, Any], name: str, record_dir: Path) -> None:
    gates = require_dict(record, "gates", "root")
    gate = require_dict(gates, name, "root.gates")
    if gate.get("decision") != "pass":
        raise GateBlocked(f"{name} gate decision is not pass")
    require_text(gate, "reviewed_by", f"root.gates.{name}")
    require_text(gate, "reviewed_at", f"root.gates.{name}")
    require_text(gate, "notes", f"root.gates.{name}")

    evidence = require_dict(gate, "evidence", f"root.gates.{name}")
    for key in REQUIRED_EVIDENCE[name]:
        local_path(
            evidence.get(key), record_dir, f"root.gates.{name}.evidence.{key}"
        )

    checks = require_dict(gate, "checks", f"root.gates.{name}")
    missing = [key for key in REQUIRED_CHECKS[name] if checks.get(key) != "pass"]
    if missing:
        raise GateBlocked(f"{name} checks are not passing: {', '.join(missing)}")


def validate_before(record: dict[str, Any], before: str, record_dir: Path) -> None:
    if record.get("schema_version") != SCHEMA_VERSION:
        raise InvalidRecord(f"root.schema_version: expected {SCHEMA_VERSION}")
    require_text(record, "asset_id", "root")
    fail_if_secret(record)
    validate_source(record, record_dir)
    validate_generation(record)
    validate_artifact(record, "generation_master", record_dir)

    for gate in STAGE_GATES[before]:
        validate_gate(record, gate, record_dir)
    if "production_input" in STAGE_GATES[before]:
        validate_artifact(record, "production_input", record_dir, triangles=True)

    downstream = require_dict(record, "downstream", "root")
    for stage in PREREQUISITE_STATUS.get(before, ()):
        entry = require_dict(downstream, stage, "root.downstream")
        if entry.get("status") != "succeeded":
            raise GateBlocked(f"downstream.{stage} has not succeeded")


def self_test() -> None:
    with tempfile.TemporaryDirectory(prefix="meshy-gate-") as temp:
        root = Path(temp)
        for name in ("source.jpg", "master.glb", "production.glb", "evidence.png"):
            (root / name).write_bytes(name.encode("utf-8"))
        artifact_sha = {
            name: sha256(root / name)
            for name in ("source.jpg", "master.glb", "production.glb")
        }
        all_evidence = {key: "evidence.png" for keys in REQUIRED_EVIDENCE.values() for key in keys}
        record: dict[str, Any] = {
            "schema_version": 1,
            "asset_id": "self-test",
            "source": {
                "reference": "source.jpg",
                "sha256": artifact_sha["source.jpg"],
                "approval_record": "self-test approval",
            },
            "generation": {
                "channel": "workspace",
                "plan": "premium",
                "model": "meshy-7",
                "settings_sha256": "1" * 64,
                "live_free_retries_shown": 12,
                "attempts": [
                    {
                        "attempt": 0,
                        "kind": "initial",
                        "parent_attempt": None,
                        "outcome": "completed",
                        "result_sha256": artifact_sha["master.glb"],
                        "decision": "accept",
                        "failure_codes": [],
                    }
                ],
                "selected_attempt": 0,
            },
            "artifacts": {
                "generation_master": {
                    "path": "master.glb",
                    "sha256": artifact_sha["master.glb"],
                },
                "production_input": {
                    "path": "production.glb",
                    "sha256": artifact_sha["production.glb"],
                    "triangles": 15000,
                },
            },
            "gates": {},
            "downstream": {
                name: {"status": "succeeded"}
                for name in ("remesh", "texture", "rig", "animate")
            },
        }
        for name in REQUIRED_CHECKS:
            record["gates"][name] = {
                "decision": "pass",
                "reviewed_by": "self-test",
                "reviewed_at": "2026-09-12T00:00:00Z",
                "notes": "self-test evidence",
                "evidence": {key: all_evidence[key] for key in REQUIRED_EVIDENCE[name]},
                "checks": {key: "pass" for key in REQUIRED_CHECKS[name]},
            }
        validate_before(record, "integrate", root)

        blocked = json.loads(json.dumps(record))
        blocked["gates"]["generation"]["checks"]["five_digits_each_hand"] = "fail"
        try:
            validate_before(blocked, "remesh", root)
        except GateBlocked:
            pass
        else:
            raise AssertionError("failed generation gate did not block remesh")

        invalid = json.loads(json.dumps(record))
        invalid["generation"]["channel"] = "api"
        invalid["generation"]["live_free_retries_shown"] = 1
        try:
            validate_before(invalid, "remesh", root)
        except InvalidRecord:
            pass
        else:
            raise AssertionError("API record incorrectly claimed a Free Retry")
    print("PASS: Meshy candidate gate self-test")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("record", nargs="?", type=Path)
    parser.add_argument(
        "--before",
        choices=tuple(STAGE_GATES),
        default="rig",
        help="downstream action to authorize (default: rig)",
    )
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        self_test()
        return 0
    if args.record is None:
        parser.error("record is required unless --self-test is used")

    try:
        record = json.loads(args.record.read_text(encoding="utf-8"))
        if not isinstance(record, dict):
            raise InvalidRecord("root: expected object")
        validate_before(record, args.before, args.record.resolve().parent)
    except (OSError, json.JSONDecodeError, InvalidRecord) as error:
        print(f"INVALID: {error}", file=sys.stderr)
        return 2
    except GateBlocked as error:
        print(f"BLOCKED before {args.before}: {error}", file=sys.stderr)
        return 1
    print(f"PASS: {args.record} is authorized before {args.before}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
