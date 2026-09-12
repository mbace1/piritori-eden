#!/usr/bin/env python3
"""Read-only production ledger checker. No network, spending or promotion."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import struct
import sys

STATES = ("CONCEPT", "APPROVED", "GENERATING", "GENERATED", "RIGGED",
          "VALIDATED", "GAME_READY", "INTEGRATED")
ROOT = Path(__file__).resolve().parents[2]
SHA = re.compile(r"[0-9a-f]{64}\Z")


def read_json(path):
    def reject_constant(_):
        raise ValueError("nonfinite JSON number")
    return json.loads(path.read_text(encoding="utf-8-sig"), parse_constant=reject_constant)


def local_path(root, relative):
    if not isinstance(relative, str) or not relative or "\\" in relative:
        raise ValueError("expected a repository-relative POSIX path")
    path = (root / relative).resolve()
    if Path(relative).is_absolute() or not path.is_relative_to(root.resolve()):
        raise ValueError("asset path escapes repository")
    return path


def inventory(path):
    raw = path.read_bytes()
    if len(raw) < 20 or struct.unpack_from("<4sII", raw) != (b"glTF", 2, len(raw)):
        raise ValueError("invalid GLB header")
    size, kind = struct.unpack_from("<I4s", raw, 12)
    if kind != b"JSON" or size % 4 or 20 + size > len(raw):
        raise ValueError("invalid GLB JSON chunk")
    doc = json.loads(raw[20:20 + size])
    if any("uri" in x for x in doc.get("buffers", []) + doc.get("images", [])):
        raise ValueError("runtime GLB must embed its resources")
    primitives = [p for m in doc.get("meshes", []) for p in m["primitives"]]
    triangles = 0
    for primitive in primitives:
        if primitive.get("mode", 4) != 4:
            raise ValueError("expected triangle primitives")
        index = primitive.get("indices", primitive["attributes"]["POSITION"])
        count = doc["accessors"][index]["count"]
        if count % 3:
            raise ValueError("incomplete triangle primitive")
        triangles += count // 3
    if len(doc.get("skins", [])) > 1 or not primitives:
        raise ValueError("expected at most one humanoid skin and a nonempty mesh")
    return {"bytes": len(raw), "sha256": hashlib.sha256(raw).hexdigest(),
            "triangles": triangles, "joints": len(doc["skins"][0]["joints"]) if doc.get("skins") else 0,
            "clips": sorted(a["name"] for a in doc.get("animations", []))}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def check_record(asset_id, item, spec):
    require(re.fullmatch(r"CHR_[A-Z][0-9]{2}", asset_id), "invalid character ID")
    require(item["status"] in STATES, "unknown lifecycle state")
    require(type(item["enabled"]) is bool, "enabled must be boolean")
    approval = item["concept"]["approval"]
    require(approval in ("pending", "approved", "rejected"), "invalid approval")
    if approval == "rejected":
        require(not item["enabled"] and item["status"] == "CONCEPT" and
                item.get("candidate") is None, "rejected concept cannot build or integrate")
    if STATES.index(item["status"]) >= 1:
        require(approval == "approved", "production requires an approved concept")
    require(item["job"]["state"] in ("idle", "pending", "running", "failed", "canceled", "uncertain"),
            "invalid job health")
    gates = spec["validation_gates"] + spec["game_ready_gates"] + spec["integration_gates"]
    require(set(item["gates"]) == set(gates), "missing or unknown gate")
    for name, gate in item["gates"].items():
        require(gate["result"] in ("pending", "pass", "fail"), "invalid gate result")
        require(bool(gate["reason"]), "gate needs a reason")
        if gate["result"] == "pass":
            require(bool(gate.get("evidence")) and bool(gate.get("reviewed_at")),
                    name + " needs evidence and review date")
            require(gate.get("candidate_sha256") == item["candidate"]["sha256"],
                    name + " evidence belongs to a different candidate")
    candidate = item.get("candidate")
    if STATES.index(item["status"]) >= 3:
        require(candidate is not None, "generated stage needs a candidate")
    if candidate:
        require(SHA.fullmatch(candidate["sha256"]), "invalid candidate SHA-256")
        for key in ("bytes", "triangles", "version"):
            require(type(candidate[key]) is int and candidate[key] > 0, "invalid " + key)
        require(type(candidate["joints"]) is int and candidate["joints"] >= 0, "invalid joint count")
        if STATES.index(item["status"]) >= 4:
            require(candidate["joints"] > 0 and candidate["rig"] and
                    SHA.fullmatch(candidate["rig"]["signature"]), "missing rig signature")
        require(type(candidate["production_actions"]) is list, "actions must be a list")
        require(set(candidate["production_actions"]) <= set(spec["required_actions"]),
                "unknown production action")
    require(item["integration"]["mode"] in ("none", "prototype", "production"),
            "invalid integration mode")
    if item["integration"]["mode"] != "none":
        require(candidate and item["integration"]["candidate_sha256"] == candidate["sha256"],
                "integration version does not match candidate")
    if STATES.index(item["status"]) >= 5:
        require(not readiness(item, spec, item["status"]),
                "lifecycle overstates readiness: " + "; ".join(readiness(item, spec, item["status"])))
    if item["integration"]["mode"] == "production":
        require(item["status"] == "INTEGRATED", "production integration requires INTEGRATED")


def readiness(item, spec, target="GAME_READY"):
    problems = []
    if not item["enabled"]:
        problems.append("character disabled")
    if item["concept"]["approval"] != "approved":
        problems.append("concept not approved")
    candidate = item.get("candidate")
    if not candidate:
        return problems + ["candidate missing"]
    if not spec["triangle_min"] <= candidate["triangles"] <= spec["triangle_max"]:
        problems.append(f"triangle budget: {candidate['triangles']} outside {spec['triangle_min']}–{spec['triangle_max']}")
    if not spec["canonical_rig"] or (candidate.get("rig") or {}).get("compatible_with") != spec["canonical_rig"]:
        problems.append("canonical rig compatibility unproven")
    missing = [a for a in spec["required_actions"] if a not in candidate["production_actions"]]
    if missing:
        problems.append("production actions missing: " + ", ".join(missing))
    gates = list(spec["validation_gates"])
    if target in ("GAME_READY", "INTEGRATED"):
        gates += spec["game_ready_gates"]
    if target == "INTEGRATED":
        gates += spec["integration_gates"]
        if item["integration"]["mode"] != "production":
            problems.append("production integration absent")
    for name in gates:
        gate = item["gates"][name]
        if gate["result"] != "pass":
            problems.append(name + ": " + gate["reason"])
    return problems


def check_files(root, item):
    candidate = item.get("candidate")
    if not candidate:
        return
    measured = inventory(local_path(root, candidate["file"]))
    for key in ("bytes", "sha256", "triangles", "joints", "clips"):
        require(measured[key] == candidate[key], "GLB does not match recorded " + key)
    if item["integration"]["mode"] != "none":
        registry = read_json(root / "art/v3/manifest.json")
        matches = [a for a in registry["assets"] if a["id"] == item["integration"]["runtime_id"]]
        require(len(matches) == 1, "runtime ID missing or duplicated")
        entry = matches[0]
        require(local_path(root, "art/v3/" + entry["file"]) == local_path(root, candidate["file"]),
                "runtime path mismatch")
        for key in ("bytes", "sha256"):
            require(entry[key] == candidate[key], "runtime register mismatch: " + key)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("status", "check", "validate"))
    parser.add_argument("asset_id", nargs="?")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args(argv)
    try:
        manifest = read_json(ROOT / "assets/asset_manifest.json")
        spec = read_json(ROOT / "assets/character_spec.json")
        require(manifest["schema_version"] == spec["schema_version"] == 1, "unsupported schema")
        require(manifest["spec_id"] == spec["id"], "character spec mismatch")
        characters = manifest["characters"]
        require(not args.asset_id or args.asset_id in characters, "unknown character ID")
        ids = [args.asset_id] if args.asset_id else list(characters)
        rows = []
        for asset_id in ids:
            item = characters[asset_id]
            check_record(asset_id, item, spec)
            if args.command != "status":
                check_files(ROOT, item)
            rows.append({"id": asset_id, "status": item["status"], "enabled": item["enabled"],
                         "integration": item["integration"]["mode"],
                         "blockers": readiness(item, spec),
                         "files_checked": args.command != "status"})
        # Disabled characters still get checked; a batch readiness check skips them.
        failed = args.command == "validate" and any(r["blockers"] for r in rows
                                                      if r["enabled"] or args.asset_id)
        result = {"command": args.command, "ok": not failed, "characters": rows}
        if args.json:
            print(json.dumps(result, indent=2))
        else:
            for row in rows:
                print(f"{row['id']}: {row['status']}; {row['integration']}; enabled={row['enabled']}")
                for blocker in row["blockers"]:
                    print("  - " + blocker)
            print("Record/file check passed." if args.command == "check" else
                  "Not production ready." if failed else "Read-only report; no state changes.")
        return 1 if failed else 0
    except (OSError, ValueError, KeyError, TypeError, IndexError, struct.error) as error:
        # Never dump raw file contents, API payloads or environment values.
        message = "Invalid manifest or local artifact: " + str(error)
        print(json.dumps({"ok": False, "error": message}) if args.json else message, file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
