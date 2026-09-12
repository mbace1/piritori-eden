#!/usr/bin/env python3
"""Build deterministic F01/F02 v02 body and own-rig clip candidates.

Run with Blender 5.2 in background/offline mode:

  blender --background --factory-startup --offline-mode \
    --python art-src/tools/build_fighter_pilot_v2.py -- \
    PRIVATE_PILOT_ROOT OUTPUT_DIRECTORY

``PRIVATE_PILOT_ROOT`` is the ignored ``meshy-pilot`` directory containing a
``derivatives`` child.  The script performs no network operations, never writes
to its inputs, and refuses to reuse an existing output directory.

The proportion pass is a real rig-v2 rest edit.  It translates the unconnected
ForeArm and Hand bone origins, warps only mesh positions with the existing skin
weights, and re-exports the original rest-relative actions against the new
skeleton.  Topology, UVs, joint order and weights are contract-checked before
and after the GLB round trip.
"""

from __future__ import annotations

import hashlib
import json
import math
import os
import struct
import sys
import traceback
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

import bpy
from mathutils import Vector


ACTION_NAMES = ("alert-idle", "casual-walk")
ANIMATION_PATHS = ("translation", "rotation", "scale")
PIPELINE_FPS = 30
MAX_ACTION_FRAMES = 300
MAX_KEYS_PER_CHANNEL = 600
MAX_CLIP_DURATION_SECONDS = 10.0
ARM_BONES = (
    "LeftArm",
    "LeftForeArm",
    "LeftHand",
    "RightArm",
    "RightForeArm",
    "RightHand",
)
ARM_CHAINS = {
    "left": ("LeftArm", "LeftForeArm", "LeftHand"),
    "right": ("RightArm", "RightForeArm", "RightHand"),
}

PILOTS = {
    "F01": {
        "slug": "heavy-bruiser",
        "factor": 0.953,
        "triangles": 15512,
        "body": {
            "file": "F01-heavy-bruiser-rigged.glb",
            "bytes": 7794708,
            "sha256": "9FDDB141D5D1CDE397D3EB7256FA3B9BD900BE5F192B74AA59FFA382D4781229",
        },
        "clips": {
            "alert-idle": {
                "file": "F01-heavy-bruiser-alert-idle.glb",
                "bytes": 7839836,
                "sha256": "5508A8148A795CFD128FEE199DB33E6DAB8BEA2ACB116DD46F2930ABBC8674E4",
            },
            "casual-walk": {
                "file": "F01-heavy-bruiser-casual-walk.glb",
                "bytes": 7842048,
                "sha256": "C29208E194B93EEEFA672F67A9737273734A05928970494F0B4B2B8923E1BA35",
            },
        },
    },
    "F02": {
        "slug": "wiry-skirmisher",
        "factor": 1.080,
        "triangles": 15503,
        "body": {
            "file": "F02-wiry-skirmisher-rigged.glb",
            "bytes": 7733816,
            "sha256": "A77AF2632553DCBEADAC3573C4FE357F0556211F09E55D926CF19F1240EF355E",
        },
        "clips": {
            "alert-idle": {
                "file": "F02-wiry-skirmisher-alert-idle.glb",
                "bytes": 7780360,
                "sha256": "CBA40745E833FAE4D7F3E6CCFDDE4A89FCC91A6634E602777A1B58EFC968E3B2",
            },
            "casual-walk": {
                "file": "F02-wiry-skirmisher-casual-walk.glb",
                "bytes": 7782668,
                "sha256": "5C11E34D022FC3FE642387276B1FF85C7F237C0D876E9799981965CF915482E7",
            },
        },
    },
}

JSON_CHUNK = 0x4E4F534A
BIN_CHUNK = 0x004E4942
COMPONENT_FORMAT = {
    5120: "b",
    5121: "B",
    5122: "h",
    5123: "H",
    5125: "I",
    5126: "f",
}
TYPE_WIDTH = {
    "SCALAR": 1,
    "VEC2": 2,
    "VEC3": 3,
    "VEC4": 4,
    "MAT2": 4,
    "MAT3": 9,
    "MAT4": 16,
}


def script_args() -> tuple[Path, Path]:
    if "--" not in sys.argv:
        raise SystemExit("usage: blender ... -- PRIVATE_PILOT_ROOT OUTPUT_DIRECTORY")
    args = sys.argv[sys.argv.index("--") + 1 :]
    if len(args) != 2:
        raise SystemExit("usage: blender ... -- PRIVATE_PILOT_ROOT OUTPUT_DIRECTORY")
    return Path(args[0]).resolve(), Path(args[1]).resolve()


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest().upper()


def bytes_sha256(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest().upper()


def rounded(value: float, places: int = 8) -> float:
    result = float(value)
    if not math.isfinite(result):
        raise RuntimeError(f"non-finite numeric value: {result}")
    return round(result, places)


def vector_values(value: Iterable[float], places: int = 8) -> list[float]:
    return [rounded(component, places) for component in value]


def finite_values(values: Iterable[float], label: str) -> tuple[float, ...]:
    result = tuple(float(value) for value in values)
    if any(not math.isfinite(value) for value in result):
        raise RuntimeError(f"{label}: non-finite numeric value")
    return result


def finite_frame_range(start: float, end: float, label: str) -> list[int]:
    start_value, end_value = finite_values((start, end), f"{label} frame range")
    if end_value < start_value:
        raise RuntimeError(f"{label}: reversed frame range {start_value}..{end_value}")
    first, last = math.floor(start_value), math.ceil(end_value)
    frames = list(range(first, last + 1))
    if not frames or len(frames) > MAX_ACTION_FRAMES:
        raise RuntimeError(
            f"{label}: {len(frames)} evaluated frames exceeds {MAX_ACTION_FRAMES}"
        )
    duration = (end_value - start_value) / PIPELINE_FPS
    if duration > MAX_CLIP_DURATION_SECONDS:
        raise RuntimeError(
            f"{label}: {duration:.6f}s exceeds {MAX_CLIP_DURATION_SECONDS}s"
        )
    return frames


def reset_scene() -> None:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    # glTF seconds must always map to the Meshy source's 30 fps frame grid.
    # Factory defaults are 24 fps, which silently shortens playback sampling.
    bpy.context.scene.render.fps = PIPELINE_FPS
    bpy.context.scene.render.fps_base = 1.0


def import_glb(path: Path) -> None:
    if not path.is_file():
        raise FileNotFoundError(path)
    bpy.ops.import_scene.gltf(filepath=str(path))


def armatures() -> list[Any]:
    return [obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE"]


def meshes() -> list[Any]:
    return [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]


def is_skinned(obj: Any) -> bool:
    return obj.type == "MESH" and any(
        modifier.type == "ARMATURE" and modifier.object for modifier in obj.modifiers
    )


def is_importer_bone_shape(obj: Any) -> bool:
    return obj.type == "MESH" and any(
        collection.name == "glTF_not_exported" for collection in obj.users_collection
    )


def asset_meshes() -> list[Any]:
    return [obj for obj in meshes() if not is_importer_bone_shape(obj)]


def select_only(objects: list[Any]) -> None:
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.hide_set(False)
        obj.hide_viewport = False
        obj.select_set(True)
    if objects:
        bpy.context.view_layer.objects.active = objects[0]


def remove_object(obj: Any) -> None:
    if obj and obj.name in bpy.data.objects:
        bpy.data.objects.remove(obj, do_unlink=True)


def clear_actions() -> None:
    for obj in bpy.data.objects:
        if obj.animation_data:
            obj.animation_data_clear()
    for action in list(bpy.data.actions):
        bpy.data.actions.remove(action)


def used_materials(mesh_objects: list[Any]) -> list[Any]:
    found: list[Any] = []
    seen: set[int] = set()
    for obj in mesh_objects:
        for slot in obj.material_slots:
            material = slot.material
            if material and material.as_pointer() not in seen:
                seen.add(material.as_pointer())
                found.append(material)
    return found


def used_images(mesh_objects: list[Any]) -> list[Any]:
    found: list[Any] = []
    seen: set[int] = set()
    for material in used_materials(mesh_objects):
        if not material.use_nodes:
            continue
        for node in material.node_tree.nodes:
            image = getattr(node, "image", None)
            if image and image.as_pointer() not in seen:
                seen.add(image.as_pointer())
                found.append(image)
    return found


def exact_action(rig: Any) -> Any:
    if rig.animation_data and rig.animation_data.action:
        return rig.animation_data.action
    if rig.animation_data:
        for track in rig.animation_data.nla_tracks:
            for strip in track.strips:
                if strip.action:
                    return strip.action
    raise RuntimeError(f"{rig.name}: no linked action")


def assign_action(rig: Any, action: Any) -> None:
    if rig.animation_data is None:
        rig.animation_data_create()
    rig.animation_data.action = action
    if hasattr(rig.animation_data, "action_slot") and len(action.slots):
        rig.animation_data.action_slot = action.slots[0]


def read_glb(path: Path) -> tuple[dict[str, Any], bytes]:
    data = path.read_bytes()
    if len(data) < 20:
        raise RuntimeError(f"{path.name}: too small to be a GLB")
    magic, version, declared = struct.unpack_from("<4sII", data, 0)
    if magic != b"glTF" or version != 2 or declared != len(data):
        raise RuntimeError(f"{path.name}: invalid GLB header")
    offset = 12
    document: dict[str, Any] | None = None
    binary = b""
    while offset < len(data):
        length, chunk_type = struct.unpack_from("<II", data, offset)
        offset += 8
        payload = data[offset : offset + length]
        offset += length
        if chunk_type == JSON_CHUNK:
            document = json.loads(payload.decode("utf-8").rstrip(" \t\r\n\x00"))
        elif chunk_type == BIN_CHUNK:
            binary = payload
    if document is None:
        raise RuntimeError(f"{path.name}: missing JSON chunk")
    return document, binary


def write_glb(path: Path, document: dict[str, Any], binary: bytes) -> None:
    json_bytes = json.dumps(
        document, ensure_ascii=False, separators=(",", ":"), sort_keys=True
    ).encode("utf-8")
    json_bytes += b" " * ((4 - len(json_bytes) % 4) % 4)
    binary_bytes = binary + b"\x00" * ((4 - len(binary) % 4) % 4)
    total = 12 + 8 + len(json_bytes)
    if binary_bytes:
        total += 8 + len(binary_bytes)
    with path.open("wb") as stream:
        stream.write(struct.pack("<4sII", b"glTF", 2, total))
        stream.write(struct.pack("<II", len(json_bytes), JSON_CHUNK))
        stream.write(json_bytes)
        if binary_bytes:
            stream.write(struct.pack("<II", len(binary_bytes), BIN_CHUNK))
            stream.write(binary_bytes)


def accessor_values(
    document: dict[str, Any], binary: bytes, accessor_index: int
) -> list[tuple[float | int, ...]]:
    accessor = document["accessors"][accessor_index]
    if accessor.get("sparse"):
        raise RuntimeError("sparse accessors are not supported by this validator")
    if "bufferView" not in accessor:
        raise RuntimeError(f"accessor {accessor_index} has no bufferView")
    view = document["bufferViews"][accessor["bufferView"]]
    component_type = accessor["componentType"]
    if component_type not in COMPONENT_FORMAT:
        raise RuntimeError(f"unsupported component type {component_type}")
    width = TYPE_WIDTH[accessor["type"]]
    component_format = COMPONENT_FORMAT[component_type]
    component_size = struct.calcsize("<" + component_format)
    packed_size = component_size * width
    stride = view.get("byteStride", packed_size)
    if stride < packed_size:
        raise RuntimeError(f"accessor {accessor_index} has invalid byteStride {stride}")
    start = view.get("byteOffset", 0) + accessor.get("byteOffset", 0)
    final_byte = start + max(0, accessor["count"] - 1) * stride + packed_size
    if start < 0 or final_byte > len(binary):
        raise RuntimeError(f"accessor {accessor_index} exceeds the BIN chunk")
    unpack_format = "<" + component_format * width
    result = []
    for index in range(accessor["count"]):
        record = struct.unpack_from(unpack_format, binary, start + index * stride)
        if component_type == 5126 and any(not math.isfinite(value) for value in record):
            raise RuntimeError(f"accessor {accessor_index} contains a non-finite float")
        result.append(record)
    return result


def raw_mesh_contract(
    document: dict[str, Any], binary: bytes
) -> dict[str, Any]:
    mesh_records = document.get("meshes", [])
    if len(mesh_records) != 1 or len(mesh_records[0].get("primitives", [])) != 1:
        raise RuntimeError("expected exactly one mesh primitive")
    primitive = mesh_records[0]["primitives"][0]
    if primitive.get("mode", 4) != 4 or "indices" not in primitive:
        raise RuntimeError("expected one indexed triangle primitive")
    attributes = primitive.get("attributes", {})
    required = {"POSITION", "NORMAL", "TEXCOORD_0", "JOINTS_0", "WEIGHTS_0"}
    if not required.issubset(attributes):
        raise RuntimeError(
            f"mesh primitive is missing attributes: {sorted(required - set(attributes))}"
        )
    position_count = document["accessors"][attributes["POSITION"]]["count"]
    positions = tuple(
        tuple(float(value) for value in record)
        for record in accessor_values(document, binary, attributes["POSITION"])
    )
    values = {
        semantic: accessor_values(document, binary, accessor_index)
        for semantic, accessor_index in attributes.items()
        if semantic.startswith("TEXCOORD_") or semantic in {"JOINTS_0", "WEIGHTS_0"}
    }
    if any(len(records) != position_count for records in values.values()):
        raise RuntimeError("mesh attribute accessor counts differ")
    indices = tuple(
        int(record[0])
        for record in accessor_values(document, binary, primitive["indices"])
    )
    if len(indices) % 3 or any(index < 0 or index >= position_count for index in indices):
        raise RuntimeError("mesh index accessor is not a valid triangle stream")
    skin = raw_skin_contract(document, binary)
    joint_names = skin["joint_names"]
    memberships = []
    for joints, weights in zip(values["JOINTS_0"], values["WEIGHTS_0"]):
        memberships.append(
            tuple(
                sorted(
                    (joint_names[int(joint)], float(weight))
                    for joint, weight in zip(joints, weights)
                    if float(weight) > 1e-8
                )
            )
        )
    uv_sets = {
        semantic: tuple(tuple(float(value) for value in record) for record in records)
        for semantic, records in values.items()
        if semantic.startswith("TEXCOORD_")
    }
    return {
        "attribute_semantics": tuple(sorted(attributes)),
        "vertices": position_count,
        "positions": positions,
        "indices": indices,
        "uv_sets": uv_sets,
        "memberships": tuple(memberships),
    }


def compare_raw_mesh_contracts(
    source: dict[str, Any],
    output: dict[str, Any],
    expected_positions: tuple[tuple[float, float, float], ...],
) -> tuple[dict[str, Any], dict[int, int]]:
    if source["attribute_semantics"] != output["attribute_semantics"]:
        raise RuntimeError("GLB mesh attribute semantics changed")
    if set(source["uv_sets"]) != set(output["uv_sets"]):
        raise RuntimeError("GLB UV set semantics changed")
    if len(source["indices"]) != len(output["indices"]):
        raise RuntimeError("GLB triangle index count changed")
    if len(expected_positions) != source["vertices"]:
        raise RuntimeError("expected position count does not match logical source vertices")

    output_to_source: dict[int, int] = {}
    source_to_outputs: dict[int, set[int]] = {}
    max_uv_delta = 0.0
    max_weight_delta = 0.0
    max_position_delta = 0.0
    for source_index, output_index in zip(source["indices"], output["indices"]):
        previous = output_to_source.setdefault(output_index, source_index)
        if previous != source_index:
            raise RuntimeError("GLB export merged distinct logical source vertices")
        source_to_outputs.setdefault(source_index, set()).add(output_index)
        for semantic in source["uv_sets"]:
            before_uv = source["uv_sets"][semantic][source_index]
            after_uv = output["uv_sets"][semantic][output_index]
            if len(before_uv) != len(after_uv):
                raise RuntimeError(f"{semantic}: UV width changed")
            max_uv_delta = max(
                max_uv_delta,
                max((abs(a - b) for a, b in zip(before_uv, after_uv)), default=0.0),
            )
        before_membership = source["memberships"][source_index]
        after_membership = output["memberships"][output_index]
        if tuple(name for name, _ in before_membership) != tuple(
            name for name, _ in after_membership
        ):
            raise RuntimeError("GLB joint membership changed at a triangle corner")
        max_weight_delta = max(
            max_weight_delta,
            max(
                (
                    abs(before_weight - after_weight)
                    for (_, before_weight), (_, after_weight) in zip(
                        before_membership, after_membership
                    )
                ),
                default=0.0,
            ),
        )
        expected_position = expected_positions[source_index]
        actual_position = output["positions"][output_index]
        max_position_delta = max(
            max_position_delta,
            math.sqrt(
                sum(
                    (float(actual) - float(expected)) ** 2
                    for actual, expected in zip(actual_position, expected_position)
                )
            ),
        )
    if max_uv_delta > 2e-6:
        raise RuntimeError(f"GLB UV values drifted by {max_uv_delta}")
    if max_weight_delta > 2e-6:
        raise RuntimeError(f"GLB skin weights drifted by {max_weight_delta}")
    if len(source_to_outputs) != source["vertices"]:
        raise RuntimeError("GLB triangle stream does not reference every logical source vertex")
    if max_position_delta > 2e-6:
        raise RuntimeError(f"GLB warped positions drifted by {max_position_delta} m")
    expected_min = tuple(min(value[axis] for value in expected_positions) for axis in range(3))
    expected_max = tuple(max(value[axis] for value in expected_positions) for axis in range(3))
    output_min = tuple(min(value[axis] for value in output["positions"]) for axis in range(3))
    output_max = tuple(max(value[axis] for value in output["positions"]) for axis in range(3))
    max_bounds_delta = max(
        abs(actual - expected)
        for actual, expected in zip(output_min + output_max, expected_min + expected_max)
    )
    if max_bounds_delta > 2e-6:
        raise RuntimeError(f"GLB warped bounds drifted by {max_bounds_delta} m")
    splits = sum(max(0, len(indices) - 1) for indices in source_to_outputs.values())
    return ({
        "triangle_stream_equal": True,
        "triangle_count": len(source["indices"]) // 3,
        "logical_source_vertices": source["vertices"],
        "output_attribute_vertices": output["vertices"],
        "exporter_vertex_splits": splits,
        "distinct_source_vertices_not_merged": True,
        "joint_membership_equal_per_corner": True,
        "max_uv_delta": max_uv_delta,
        "max_weight_delta": max_weight_delta,
        "max_expected_position_delta_m": max_position_delta,
        "expected_bounds_min": vector_values(expected_min),
        "expected_bounds_max": vector_values(expected_max),
        "max_expected_bounds_delta_m": max_bounds_delta,
    }, output_to_source)


def blender_mesh_positions_for_gltf(mesh: Any) -> tuple[tuple[float, float, float], ...]:
    """Return Blender mesh vertices in the exported glTF world basis (Y-up)."""
    positions = []
    for vertex in mesh.data.vertices:
        world = mesh.matrix_world @ vertex.co
        positions.append(finite_values((world.x, world.z, -world.y), "mesh position"))
    return tuple(positions)


def compare_imported_source_positions(
    mesh: Any, source_raw_mesh: dict[str, Any]
) -> dict[str, Any]:
    imported = blender_mesh_positions_for_gltf(mesh)
    source = source_raw_mesh["positions"]
    if len(imported) != len(source):
        raise RuntimeError("Blender import changed the source POSITION vertex count")
    max_delta = max(
        (
            math.sqrt(sum((a - b) ** 2 for a, b in zip(actual, expected)))
            for actual, expected in zip(imported, source)
        ),
        default=0.0,
    )
    if max_delta > 2e-6:
        raise RuntimeError(f"Blender source import changed POSITION by {max_delta} m")
    return {
        "vertex_order_equal": True,
        "max_position_delta_m": max_delta,
    }


def compare_reimported_positions(
    mesh: Any,
    output_raw_mesh: dict[str, Any],
    expected_positions: tuple[tuple[float, float, float], ...],
    output_to_source: dict[int, int],
) -> dict[str, Any]:
    imported = blender_mesh_positions_for_gltf(mesh)
    raw_positions = output_raw_mesh["positions"]
    if len(imported) != len(raw_positions) or set(output_to_source) != set(range(len(imported))):
        raise RuntimeError("body reimport vertex order/count differs from exported POSITION")
    max_raw_delta = 0.0
    max_expected_delta = 0.0
    for output_index, actual in enumerate(imported):
        raw = raw_positions[output_index]
        expected = expected_positions[output_to_source[output_index]]
        max_raw_delta = max(
            max_raw_delta,
            math.sqrt(sum((a - b) ** 2 for a, b in zip(actual, raw))),
        )
        max_expected_delta = max(
            max_expected_delta,
            math.sqrt(sum((a - b) ** 2 for a, b in zip(actual, expected))),
        )
    if max_raw_delta > 2e-6 or max_expected_delta > 3e-6:
        raise RuntimeError(
            "body reimport POSITION drifted: "
            f"raw={max_raw_delta} m expected={max_expected_delta} m"
        )
    actual_min = tuple(min(value[axis] for value in imported) for axis in range(3))
    actual_max = tuple(max(value[axis] for value in imported) for axis in range(3))
    expected_min = tuple(min(value[axis] for value in expected_positions) for axis in range(3))
    expected_max = tuple(max(value[axis] for value in expected_positions) for axis in range(3))
    max_bounds_delta = max(
        abs(actual - expected)
        for actual, expected in zip(actual_min + actual_max, expected_min + expected_max)
    )
    if max_bounds_delta > 3e-6:
        raise RuntimeError(f"body reimport bounds drifted by {max_bounds_delta} m")
    return {
        "raw_vertex_order_equal": True,
        "max_raw_position_delta_m": max_raw_delta,
        "max_expected_position_delta_m": max_expected_delta,
        "max_expected_bounds_delta_m": max_bounds_delta,
        "bounds_min": vector_values(actual_min),
        "bounds_max": vector_values(actual_max),
    }


def canonical_quaternion(values: Iterable[float]) -> tuple[float, float, float, float]:
    result = finite_values(values, "quaternion")
    if len(result) != 4:
        raise RuntimeError("quaternion does not have four components")
    length = math.sqrt(sum(value * value for value in result))
    if length <= 1e-12:
        raise RuntimeError("zero-length quaternion")
    result = tuple(value / length for value in result)
    sign_probe = (result[3], result[0], result[1], result[2])
    first_nonzero = next((value for value in sign_probe if abs(value) > 1e-12), 1.0)
    if first_nonzero < 0.0:
        result = tuple(-value for value in result)
    return result  # type: ignore[return-value]


def quaternion_multiply(
    left: Iterable[float], right: Iterable[float]
) -> tuple[float, float, float, float]:
    ax, ay, az, aw = finite_values(left, "left quaternion")
    bx, by, bz, bw = finite_values(right, "right quaternion")
    return (
        aw * bx + ax * bw + ay * bz - az * by,
        aw * by - ax * bz + ay * bw + az * bx,
        aw * bz + ax * by - ay * bx + az * bw,
        aw * bw - ax * bx - ay * by - az * bz,
    )


def relative_quaternion(
    base: Iterable[float], animated: Iterable[float]
) -> tuple[float, float, float, float]:
    bx, by, bz, bw = canonical_quaternion(base)
    inverse = (-bx, -by, -bz, bw)
    return canonical_quaternion(quaternion_multiply(inverse, animated))


def raw_animation_contract(
    document: dict[str, Any],
    binary: bytes,
    animation: dict[str, Any],
    expected_joint_names: Iterable[str],
) -> dict[str, Any]:
    """Canonical rest-relative glTF animation, independent of node indices/signs."""
    nodes = document.get("nodes", [])
    joint_names = tuple(expected_joint_names)
    required = {(name, path) for name in joint_names for path in ANIMATION_PATHS}
    records: dict[tuple[str, str], dict[str, Any]] = {}
    starts: list[float] = []
    ends: list[float] = []
    for channel in animation.get("channels", []):
        target = channel.get("target", {})
        node_index = target.get("node")
        path = target.get("path")
        if not isinstance(node_index, int) or not 0 <= node_index < len(nodes):
            raise RuntimeError("animation channel has an invalid target node")
        node_name = nodes[node_index].get("name", "")
        key = (node_name, path)
        if key not in required or key in records:
            raise RuntimeError(f"unexpected or duplicate animation channel: {key}")
        sampler_index = channel.get("sampler")
        if not isinstance(sampler_index, int) or not 0 <= sampler_index < len(animation.get("samplers", [])):
            raise RuntimeError(f"{key}: invalid sampler")
        sampler = animation["samplers"][sampler_index]
        interpolation = sampler.get("interpolation", "LINEAR")
        if interpolation not in {"LINEAR", "STEP"}:
            raise RuntimeError(f"{key}: unsupported interpolation {interpolation}")
        times = [float(item[0]) for item in accessor_values(document, binary, sampler["input"])]
        values = accessor_values(document, binary, sampler["output"])
        if not times or len(times) > MAX_KEYS_PER_CHANNEL or len(values) != len(times):
            raise RuntimeError(f"{key}: invalid key count {len(times)}/{len(values)}")
        if any(right <= left for left, right in zip(times, times[1:])):
            raise RuntimeError(f"{key}: key times are not strictly increasing")
        starts.append(times[0])
        ends.append(times[-1])
        normalized_times = tuple(value - times[0] for value in times)
        if normalized_times[-1] > MAX_CLIP_DURATION_SECONDS:
            raise RuntimeError(f"{key}: animation exceeds {MAX_CLIP_DURATION_SECONDS}s")
        max_frame_grid_delta = max(
            (
                abs(value * PIPELINE_FPS - round(value * PIPELINE_FPS))
                for value in normalized_times
            ),
            default=0.0,
        )
        if max_frame_grid_delta > 2e-5:
            raise RuntimeError(
                f"{key}: key time is off the {PIPELINE_FPS}fps grid by "
                f"{max_frame_grid_delta} frames"
            )
        node = nodes[node_index]
        if "matrix" in node:
            raise RuntimeError(f"{key}: animated joint uses a matrix base transform")
        if path == "translation":
            base = finite_values(node.get("translation", (0.0, 0.0, 0.0)), f"{key} base")
            canonical_values = tuple(
                tuple(float(value[index]) - base[index] for index in range(3))
                for value in values
            )
        elif path == "rotation":
            base = node.get("rotation", (0.0, 0.0, 0.0, 1.0))
            canonical_values = tuple(relative_quaternion(base, value) for value in values)
        else:
            base = finite_values(node.get("scale", (1.0, 1.0, 1.0)), f"{key} base")
            if any(abs(value) <= 1e-12 for value in base):
                raise RuntimeError(f"{key}: zero base scale")
            canonical_values = tuple(
                tuple(float(value[index]) / base[index] for index in range(3))
                for value in values
            )
        if any(not math.isfinite(value) for row in canonical_values for value in row):
            raise RuntimeError(f"{key}: non-finite canonical animation value")
        records[key] = {
            "interpolation": interpolation,
            "times": normalized_times,
            "values": canonical_values,
            "max_frame_grid_delta_frames": max_frame_grid_delta,
        }
    if set(records) != required:
        missing = sorted(required - set(records))
        raise RuntimeError(f"animation is missing required joint/path channels: {missing}")
    if max(starts) - min(starts) > 2e-6 or max(ends) - min(ends) > 2e-6:
        raise RuntimeError("animation channels do not share one frame range")
    duration = max(ends) - min(starts)
    expected_frames = round(duration * PIPELINE_FPS) + 1
    if expected_frames > MAX_ACTION_FRAMES or abs(duration * PIPELINE_FPS - round(duration * PIPELINE_FPS)) > 2e-5:
        raise RuntimeError(f"animation duration {duration} is not a bounded {PIPELINE_FPS}fps range")
    digest_payload = {
        f"{name}|{path}": {
            "interpolation": record["interpolation"],
            "times": [rounded(value, 6) for value in record["times"]],
            "values": [[rounded(value, 5) for value in row] for row in record["values"]],
        }
        for (name, path), record in sorted(records.items())
    }
    return {
        "records": records,
        "source_time_range_seconds": [min(starts), max(ends)],
        "normalized_frame_range_seconds": [0.0, duration],
        "expected_frames_at_30fps": expected_frames,
        "channel_count": len(records),
        "canonical_sha256_5dp": bytes_sha256(
            json.dumps(digest_payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
        ),
    }


def compare_animation_contracts(
    source: dict[str, Any], output: dict[str, Any], label: str
) -> dict[str, Any]:
    if set(source["records"]) != set(output["records"]):
        raise RuntimeError(f"{label}: joint/path channel set changed")
    if source["expected_frames_at_30fps"] != output["expected_frames_at_30fps"]:
        raise RuntimeError(f"{label}: 30fps frame range changed")
    source_duration = source["normalized_frame_range_seconds"][1]
    output_duration = output["normalized_frame_range_seconds"][1]
    if abs(source_duration - output_duration) > 2e-6:
        raise RuntimeError(f"{label}: duration changed {source_duration} -> {output_duration}")
    max_absolute_range_delta = max(
        abs(a - b)
        for a, b in zip(
            source["source_time_range_seconds"], output["source_time_range_seconds"]
        )
    )
    if max_absolute_range_delta > 2e-6:
        raise RuntimeError(f"{label}: absolute frame range drifted by {max_absolute_range_delta}s")
    max_time_delta = 0.0
    max_translation_delta = 0.0
    max_scale_delta = 0.0
    max_rotation_delta = 0.0
    max_source_frame_grid_delta = 0.0
    max_output_frame_grid_delta = 0.0
    for key, expected in source["records"].items():
        actual = output["records"][key]
        max_source_frame_grid_delta = max(
            max_source_frame_grid_delta, expected["max_frame_grid_delta_frames"]
        )
        max_output_frame_grid_delta = max(
            max_output_frame_grid_delta, actual["max_frame_grid_delta_frames"]
        )
        if expected["interpolation"] != actual["interpolation"]:
            raise RuntimeError(f"{label}/{key}: interpolation changed")
        if len(expected["times"]) != len(actual["times"]):
            raise RuntimeError(f"{label}/{key}: key count changed")
        max_time_delta = max(
            max_time_delta,
            max((abs(a - b) for a, b in zip(expected["times"], actual["times"])), default=0.0),
        )
        if len(expected["values"]) != len(actual["values"]):
            raise RuntimeError(f"{label}/{key}: value count changed")
        path = key[1]
        for left, right in zip(expected["values"], actual["values"]):
            if path == "rotation":
                max_rotation_delta = max(max_rotation_delta, quaternion_angle(left, right))
            else:
                delta = max(abs(a - b) for a, b in zip(left, right))
                if path == "translation":
                    max_translation_delta = max(max_translation_delta, delta)
                else:
                    max_scale_delta = max(max_scale_delta, delta)
    if max_time_delta > 2e-6:
        raise RuntimeError(f"{label}: key times drifted by {max_time_delta}s")
    # These are armature-local units under a 0.01 object scale. Blender's
    # glTF import/export float32 decomposition introduces at most 7.5e-7 m.
    if max_translation_delta > 7.5e-5:
        raise RuntimeError(f"{label}: rest-relative translation drifted by {max_translation_delta}")
    if max_scale_delta > 2e-6:
        raise RuntimeError(f"{label}: rest-relative scale drifted by {max_scale_delta}")
    if max_rotation_delta > 2e-5:
        raise RuntimeError(f"{label}: rest-relative rotation drifted by {max_rotation_delta} rad")
    return {
        "joint_path_set_equal": True,
        "interpolation_equal": True,
        "key_counts_equal": True,
        "frame_range_equal": True,
        "source_time_range_seconds": vector_values(source["source_time_range_seconds"], 6),
        "max_absolute_frame_range_delta_seconds": max_absolute_range_delta,
        "normalized_frame_range_seconds": vector_values(
            source["normalized_frame_range_seconds"], 6
        ),
        "expected_frames_at_30fps": source["expected_frames_at_30fps"],
        "source_canonical_sha256_5dp": source["canonical_sha256_5dp"],
        "output_canonical_sha256_5dp": output["canonical_sha256_5dp"],
        "max_time_delta_seconds": max_time_delta,
        "max_source_frame_grid_delta_frames": max_source_frame_grid_delta,
        "max_output_frame_grid_delta_frames": max_output_frame_grid_delta,
        "max_rest_relative_translation_delta": max_translation_delta,
        "max_rest_relative_scale_delta": max_scale_delta,
        "max_rest_relative_rotation_delta_radians": max_rotation_delta,
    }


def raw_skin_contract(
    document: dict[str, Any], binary: bytes
) -> dict[str, Any]:
    skins = document.get("skins", [])
    if len(skins) != 1 or len(skins[0].get("joints", [])) != 24:
        raise RuntimeError("expected exactly one 24-joint skin")
    nodes = document.get("nodes", [])
    parents: dict[int, int] = {}
    for parent_index, node in enumerate(nodes):
        for child_index in node.get("children", []):
            parents[child_index] = parent_index
    joints = skins[0]["joints"]
    records = []
    for node_index in joints:
        node = nodes[node_index]
        parent_index = parents.get(node_index)
        if "matrix" in node:
            transform = {"matrix": [rounded(value, 8) for value in node["matrix"]]}
        else:
            transform = {
                "translation": [rounded(value, 8) for value in node.get("translation", (0, 0, 0))],
                "rotation": [rounded(value, 8) for value in canonical_quaternion(node.get("rotation", (0, 0, 0, 1)))],
                "scale": [rounded(value, 8) for value in node.get("scale", (1, 1, 1))],
            }
        records.append(
            {
                "name": node.get("name", ""),
                "parent": nodes[parent_index].get("name", "") if parent_index is not None else None,
                "transform": transform,
            }
        )
    ibm_index = skins[0].get("inverseBindMatrices")
    if ibm_index is None:
        raise RuntimeError("skin has no inverseBindMatrices accessor")
    inverse_binds = accessor_values(document, binary, ibm_index)
    if len(inverse_binds) != 24 or any(len(matrix) != 16 for matrix in inverse_binds):
        raise RuntimeError("inverse bind matrix payload is not 24 MAT4 values")
    canonical = json.dumps(records, separators=(",", ":"), sort_keys=True).encode("utf-8")
    return {
        "joint_names": [record["name"] for record in records],
        "records": records,
        "rest_signature_sha256": bytes_sha256(canonical),
        "inverse_binds": [tuple(float(value) for value in matrix) for matrix in inverse_binds],
    }


def compare_raw_skins(body: dict[str, Any], pack: dict[str, Any]) -> dict[str, Any]:
    if body["joint_names"] != pack["joint_names"]:
        raise RuntimeError("body/pack joint order differs")
    if body["records"] != pack["records"]:
        raise RuntimeError("body/pack hierarchy or base TRS differs")
    max_ibm_delta = max(
        abs(left - right)
        for body_matrix, pack_matrix in zip(body["inverse_binds"], pack["inverse_binds"])
        for left, right in zip(body_matrix, pack_matrix)
    )
    if max_ibm_delta > 1e-6:
        raise RuntimeError(f"body/pack inverse binds differ by {max_ibm_delta}")
    return {
        "joint_order_equal": True,
        "hierarchy_and_base_trs_equal": True,
        "body_rest_signature_sha256": body["rest_signature_sha256"],
        "pack_rest_signature_sha256": pack["rest_signature_sha256"],
        "max_inverse_bind_delta": max_ibm_delta,
    }


def sanitize_raw_materials(path: Path) -> dict[str, Any]:
    document, binary = read_glb(path)
    before_binary_sha = bytes_sha256(binary)
    materials = document.get("materials", [])
    if len(materials) != 1:
        raise RuntimeError(f"{path.name}: expected exactly one material")
    for material in materials:
        material.pop("emissiveFactor", None)
        material.pop("emissiveTexture", None)
        extensions = material.setdefault("extensions", {})
        extensions.pop("KHR_materials_emissive_strength", None)
        extensions["KHR_materials_specular"] = {"specularFactor": 0.5}
        pbr = material.setdefault("pbrMetallicRoughness", {})
        pbr["metallicFactor"] = 0.0
        pbr["roughnessFactor"] = 0.92
        pbr.pop("metallicRoughnessTexture", None)
    used = [
        value
        for value in document.get("extensionsUsed", [])
        if value != "KHR_materials_emissive_strength"
    ]
    if "KHR_materials_specular" not in used:
        used.append("KHR_materials_specular")
    document["extensionsUsed"] = used
    required = [
        value
        for value in document.get("extensionsRequired", [])
        if value != "KHR_materials_emissive_strength"
    ]
    if required:
        document["extensionsRequired"] = required
    else:
        document.pop("extensionsRequired", None)

    temporary = path.with_name(path.name + ".sanitizing")
    write_glb(temporary, document, binary)
    os.replace(temporary, path)
    _, after_binary = read_glb(path)
    after_binary_sha = bytes_sha256(after_binary)
    if before_binary_sha != after_binary_sha:
        raise RuntimeError(f"{path.name}: material sanitation changed the BIN chunk")
    return {
        "binary_sha256_before": before_binary_sha,
        "binary_sha256_after": after_binary_sha,
        "binary_unchanged": True,
    }


def validate_raw_materials(document: dict[str, Any]) -> dict[str, Any]:
    materials = document.get("materials", [])
    if len(materials) != 1:
        raise RuntimeError("body must contain exactly one material")
    material = materials[0]
    if "emissiveFactor" in material or "emissiveTexture" in material:
        raise RuntimeError("emissive factor/texture survived sanitation")
    pbr = material.get("pbrMetallicRoughness", {})
    if pbr.get("metallicFactor") != 0.0:
        raise RuntimeError("metallicFactor is not zero")
    if abs(float(pbr.get("roughnessFactor", -1.0)) - 0.92) > 1e-6:
        raise RuntimeError("roughnessFactor is not 0.92")
    specular = material.get("extensions", {}).get("KHR_materials_specular", {})
    if abs(float(specular.get("specularFactor", -1.0)) - 0.5) > 1e-6:
        raise RuntimeError("KHR_materials_specular.specularFactor is not 0.5")
    if "specularColorFactor" in specular or "specularColorTexture" in specular:
        raise RuntimeError("unexpected specular color override survived sanitation")
    return {
        "emissive_keys_absent": True,
        "metallic_factor": pbr["metallicFactor"],
        "roughness_factor": pbr["roughnessFactor"],
        "specular_factor": specular["specularFactor"],
        "specular_color": "glTF default white",
    }


def set_principled_input(node_tree: Any, node: Any, name: str, value: Any) -> None:
    socket = node.inputs.get(name)
    if socket is None:
        raise RuntimeError(f"Principled BSDF has no {name!r} input")
    for link in list(node_tree.links):
        if link.to_socket == socket:
            node_tree.links.remove(link)
    socket.default_value = value


def sanitize_blender_materials(mesh_objects: list[Any]) -> list[dict[str, Any]]:
    records = []
    materials = used_materials(mesh_objects)
    if len(materials) != 1:
        raise RuntimeError(f"expected one used material, found {len(materials)}")
    for material in materials:
        if not material.use_nodes:
            raise RuntimeError(f"{material.name}: nodes are disabled")
        principled = [node for node in material.node_tree.nodes if node.type == "BSDF_PRINCIPLED"]
        if len(principled) != 1:
            raise RuntimeError(f"{material.name}: expected one Principled BSDF")
        node = principled[0]
        set_principled_input(material.node_tree, node, "Emission Color", (0.0, 0.0, 0.0, 1.0))
        set_principled_input(material.node_tree, node, "Emission Strength", 0.0)
        set_principled_input(material.node_tree, node, "Metallic", 0.0)
        set_principled_input(material.node_tree, node, "Roughness", 0.92)
        set_principled_input(material.node_tree, node, "IOR", 1.45)
        set_principled_input(material.node_tree, node, "Specular IOR Level", 0.25)
        set_principled_input(material.node_tree, node, "Specular Tint", (1.0, 1.0, 1.0, 1.0))
        records.append(
            {
                "material": material.name,
                "shader": node.name,
                "emission_color": [0.0, 0.0, 0.0, 1.0],
                "emission_strength": 0.0,
                "metallic": 0.0,
                "roughness": 0.92,
                "ior": 1.45,
                "specular_ior_level": 0.25,
                "specular_tint": [1.0, 1.0, 1.0, 1.0],
            }
        )
    return records


def mesh_skin_stats(obj: Any) -> dict[str, Any]:
    obj.data.calc_loop_triangles()
    counts = []
    sums = []
    for vertex in obj.data.vertices:
        weights = [entry.weight for entry in vertex.groups if entry.weight > 1e-8]
        finite_values(weights, f"{obj.name} skin weights")
        counts.append(len(weights))
        sums.append(sum(weights))
    return {
        "vertices": len(obj.data.vertices),
        "triangles": len(obj.data.loop_triangles),
        "vertex_groups": len(obj.vertex_groups),
        "unweighted_vertices": sum(count == 0 for count in counts),
        "max_influences": max(counts, default=0),
        "vertices_over_4_influences": sum(count > 4 for count in counts),
        "weight_sum_min": min(sums, default=0.0),
        "weight_sum_max": max(sums, default=0.0),
    }


def mesh_contract(obj: Any) -> dict[str, Any]:
    mesh = obj.data
    mesh.calc_loop_triangles()
    group_name = {group.index: group.name for group in obj.vertex_groups}
    weights = []
    for vertex in mesh.vertices:
        finite_values(vertex.co, f"{obj.name} vertex position")
        weights.append(
            tuple(
                sorted(
                    (group_name[entry.group], float(entry.weight))
                    for entry in vertex.groups
                    if entry.weight > 1e-8
                )
            )
        )
    uv_layers = {}
    for layer in mesh.uv_layers:
        uv_layers[layer.name] = tuple(
            finite_values((item.uv.x, item.uv.y), f"{obj.name}/{layer.name} UV")
            for item in layer.data
        )
    contract = {
        "vertices": len(mesh.vertices),
        "edges": tuple(tuple(sorted(edge.vertices)) for edge in mesh.edges),
        "polygons": tuple(tuple(polygon.vertices) for polygon in mesh.polygons),
        "groups": tuple(sorted(group.name for group in obj.vertex_groups)),
        "weights": tuple(weights),
        "uv_layers": uv_layers,
    }
    canonical = {
        "vertices": contract["vertices"],
        "edges": contract["edges"],
        "polygons": contract["polygons"],
        "groups": contract["groups"],
        "weights": [
            [(name, rounded(weight, 6)) for name, weight in vertex]
            for vertex in contract["weights"]
        ],
        "uv_layers": {
            name: [(rounded(u, 6), rounded(v, 6)) for u, v in values]
            for name, values in contract["uv_layers"].items()
        },
    }
    contract["sha256"] = bytes_sha256(
        json.dumps(canonical, separators=(",", ":"), sort_keys=True).encode("utf-8")
    )
    return contract


def compare_mesh_contracts(before: dict[str, Any], after: dict[str, Any]) -> dict[str, Any]:
    for key in ("vertices", "edges", "polygons", "groups"):
        if before[key] != after[key]:
            raise RuntimeError(f"mesh contract changed: {key}")
    if set(before["uv_layers"]) != set(after["uv_layers"]):
        raise RuntimeError("UV layer names changed")
    max_uv_delta = 0.0
    for name, original in before["uv_layers"].items():
        current = after["uv_layers"][name]
        if len(original) != len(current):
            raise RuntimeError(f"UV loop count changed in {name}")
        max_uv_delta = max(
            max_uv_delta,
            max(
                (max(abs(a - b), abs(c - d)) for (a, c), (b, d) in zip(original, current)),
                default=0.0,
            ),
        )
    if len(before["weights"]) != len(after["weights"]):
        raise RuntimeError("weight vertex count changed")
    max_weight_delta = 0.0
    for original, current in zip(before["weights"], after["weights"]):
        if tuple(name for name, _ in original) != tuple(name for name, _ in current):
            raise RuntimeError("joint membership changed on a vertex")
        max_weight_delta = max(
            max_weight_delta,
            max((abs(a - b) for (_, a), (_, b) in zip(original, current)), default=0.0),
        )
    if max_uv_delta > 2e-6:
        raise RuntimeError(f"UV values drifted by {max_uv_delta}")
    if max_weight_delta > 2e-6:
        raise RuntimeError(f"skin weights drifted by {max_weight_delta}")
    return {
        "topology_equal": True,
        "group_membership_equal": True,
        "max_uv_delta": max_uv_delta,
        "max_weight_delta": max_weight_delta,
        "before_sha256": before["sha256"],
        "after_sha256": after["sha256"],
    }


def bone_quaternion(bone: Any) -> tuple[float, float, float, float]:
    quaternion = bone.matrix_local.to_quaternion().normalized()
    values = (quaternion.x, quaternion.y, quaternion.z, quaternion.w)
    return canonical_quaternion(values)


def rig_contract(rig: Any) -> dict[str, Any]:
    contract = {
        bone.name: {
            "parent": bone.parent.name if bone.parent else None,
            "head": tuple(float(value) for value in bone.head_local),
            "rotation": bone_quaternion(bone),
            "use_connect": bool(bone.use_connect),
            "use_deform": bool(bone.use_deform),
        }
        for bone in rig.data.bones
    }
    for name, record in contract.items():
        finite_values(record["head"], f"{rig.name}/{name} rest head")
        finite_values(record["rotation"], f"{rig.name}/{name} rest rotation")
    return contract


def quaternion_angle(left: Iterable[float], right: Iterable[float]) -> float:
    left_values = tuple(float(value) for value in left)
    right_values = tuple(float(value) for value in right)
    left_norm = math.sqrt(sum(value * value for value in left_values))
    right_norm = math.sqrt(sum(value * value for value in right_values))
    if left_norm <= 1e-12 or right_norm <= 1e-12:
        raise RuntimeError("invalid zero-length rest quaternion")
    dot = abs(
        sum(a * b for a, b in zip(left_values, right_values))
        / (left_norm * right_norm)
    )
    return 2.0 * math.acos(max(-1.0, min(1.0, dot)))


def compare_rig_contracts(
    expected: dict[str, Any],
    actual: dict[str, Any],
    head_tolerance: float = 2e-5,
    rotation_tolerance: float = 2e-6,
) -> dict[str, Any]:
    if set(expected) != set(actual):
        raise RuntimeError("bone names changed")
    max_head_delta = 0.0
    max_rotation_delta = 0.0
    for name in expected:
        left, right = expected[name], actual[name]
        for key in ("parent", "use_connect", "use_deform"):
            if left[key] != right[key]:
                raise RuntimeError(f"{name}: rig field changed: {key}")
        max_head_delta = max(
            max_head_delta,
            (Vector(left["head"]) - Vector(right["head"])).length,
        )
        max_rotation_delta = max(
            max_rotation_delta,
            quaternion_angle(left["rotation"], right["rotation"]),
        )
    if max_head_delta > head_tolerance:
        raise RuntimeError(f"bone heads drifted by {max_head_delta}")
    if max_rotation_delta > rotation_tolerance:
        raise RuntimeError(f"bone rest rotations drifted by {max_rotation_delta} rad")
    return {
        "bone_names_hierarchy_flags_equal": True,
        "max_head_delta_armature_units": max_head_delta,
        "max_rotation_delta_radians": max_rotation_delta,
    }


def chain_metrics(rig: Any, mesh: Any | None = None) -> dict[str, Any]:
    result: dict[str, Any] = {}
    height = None
    if mesh is not None:
        corners = [mesh.matrix_world @ Vector(corner) for corner in mesh.bound_box]
        height = max(point.z for point in corners) - min(point.z for point in corners)
    for side, (arm_name, fore_name, hand_name) in ARM_CHAINS.items():
        arm = rig.data.bones[arm_name]
        fore = rig.data.bones[fore_name]
        hand = rig.data.bones[hand_name]
        shoulder = rig.matrix_world @ arm.head_local
        elbow = rig.matrix_world @ fore.head_local
        wrist = rig.matrix_world @ hand.head_local
        upper = (shoulder - elbow).length
        lower = (elbow - wrist).length
        chain = upper + lower
        result[side] = {
            "shoulder": vector_values(shoulder),
            "elbow": vector_values(elbow),
            "wrist": vector_values(wrist),
            "upper_arm_m": upper,
            "forearm_m": lower,
            "chain_m": chain,
            "chain_over_height": chain / height if height else None,
        }
    result["mean_chain_m"] = sum(result[side]["chain_m"] for side in ARM_CHAINS) / 2.0
    result["height_m"] = height
    result["mean_chain_over_height"] = result["mean_chain_m"] / height if height else None
    finite_values(
        (
            result[side][key]
            for side in ARM_CHAINS
            for key in ("upper_arm_m", "forearm_m", "chain_m")
        ),
        f"{rig.name} arm metrics",
    )
    return result


def apply_arm_proportion(
    rig: Any, mesh: Any, factor: float
) -> tuple[dict[str, Any], dict[str, Any], dict[str, Any]]:
    before_rig = rig_contract(rig)
    before_metrics = chain_metrics(rig, mesh)
    chain_data: dict[str, dict[str, Any]] = {}
    for side, (arm_name, fore_name, hand_name) in ARM_CHAINS.items():
        arm = rig.data.bones[arm_name]
        fore = rig.data.bones[fore_name]
        hand = rig.data.bones[hand_name]
        if fore.parent != arm or hand.parent != fore:
            raise RuntimeError(f"{side}: expected Arm -> ForeArm -> Hand hierarchy")
        if arm.use_connect or fore.use_connect or hand.use_connect:
            raise RuntimeError(f"{side}: expected unconnected Meshy arm chain")
        if hand.children:
            raise RuntimeError(f"{side}: Hand unexpectedly has child bones")
        shoulder = arm.head_local.copy()
        elbow = fore.head_local.copy()
        wrist = hand.head_local.copy()
        upper_axis = (elbow - shoulder).normalized()
        fore_axis = (wrist - elbow).normalized()
        new_elbow = shoulder + factor * (elbow - shoulder)
        new_wrist = new_elbow + factor * (wrist - elbow)
        chain_data[side] = {
            "names": (arm_name, fore_name, hand_name),
            "shoulder": shoulder,
            "elbow": elbow,
            "wrist": wrist,
            "new_elbow": new_elbow,
            "new_wrist": new_wrist,
            "upper_axis": upper_axis,
            "fore_axis": fore_axis,
        }

    arm_from_mesh = rig.matrix_world.inverted() @ mesh.matrix_world
    mesh_from_arm = arm_from_mesh.inverted()
    group_names = {group.index: group.name for group in mesh.vertex_groups}
    max_displacement = 0.0
    moved_vertices = 0
    for vertex in mesh.data.vertices:
        weights = {
            group_names[item.group]: float(item.weight)
            for item in vertex.groups
            if item.weight > 1e-8
        }
        finite_values(weights.values(), f"{mesh.name} vertex {vertex.index} weights")
        original = arm_from_mesh @ vertex.co
        delta = Vector((0.0, 0.0, 0.0))
        for data in chain_data.values():
            arm_name, fore_name, hand_name = data["names"]
            arm_weight = weights.get(arm_name, 0.0)
            fore_weight = weights.get(fore_name, 0.0)
            hand_weight = weights.get(hand_name, 0.0)
            if arm_weight:
                longitudinal = data["upper_axis"] * (
                    (original - data["shoulder"]).dot(data["upper_axis"])
                )
                delta += arm_weight * (factor - 1.0) * longitudinal
            if fore_weight:
                longitudinal = data["fore_axis"] * (
                    (original - data["elbow"]).dot(data["fore_axis"])
                )
                fore_delta = (
                    data["new_elbow"]
                    - data["elbow"]
                    + (factor - 1.0) * longitudinal
                )
                delta += fore_weight * fore_delta
            if hand_weight:
                delta += hand_weight * (data["new_wrist"] - data["wrist"])
        if delta.length > 1e-12:
            finite_values(delta, f"{mesh.name} vertex {vertex.index} warp")
            moved_vertices += 1
            max_displacement = max(max_displacement, (rig.matrix_world.to_3x3() @ delta).length)
            vertex.co = mesh_from_arm @ (original + delta)
    mesh.data.update()

    select_only([rig])
    bpy.ops.object.mode_set(mode="EDIT")
    try:
        edit_bones = rig.data.edit_bones
        for data in chain_data.values():
            _, fore_name, hand_name = data["names"]
            fore_delta = data["new_elbow"] - data["elbow"]
            hand_delta = data["new_wrist"] - data["wrist"]
            edit_bones[fore_name].head += fore_delta
            edit_bones[fore_name].tail += fore_delta
            edit_bones[hand_name].head += hand_delta
            edit_bones[hand_name].tail += hand_delta
    finally:
        bpy.ops.object.mode_set(mode="OBJECT")
    bpy.context.view_layer.update()

    expected_rig = {name: dict(record) for name, record in before_rig.items()}
    for data in chain_data.values():
        _, fore_name, hand_name = data["names"]
        expected_rig[fore_name]["head"] = tuple(data["new_elbow"])
        expected_rig[hand_name]["head"] = tuple(data["new_wrist"])

    after_rig = rig_contract(rig)
    compare_rig_contracts(expected_rig, after_rig)
    after_metrics = chain_metrics(rig, mesh)
    for side in ARM_CHAINS:
        upper_ratio = after_metrics[side]["upper_arm_m"] / before_metrics[side]["upper_arm_m"]
        fore_ratio = after_metrics[side]["forearm_m"] / before_metrics[side]["forearm_m"]
        if abs(upper_ratio - factor) > 2e-6 or abs(fore_ratio - factor) > 2e-6:
            raise RuntimeError(
                f"{side}: requested {factor}, got upper={upper_ratio}, fore={fore_ratio}"
            )
    record = {
        "factor": factor,
        "moved_vertices": moved_vertices,
        "max_vertex_displacement_m": max_displacement,
        "before": before_metrics,
        "after": after_metrics,
    }
    return record, before_rig, expected_rig


def validate_input(path: Path, expected: dict[str, Any]) -> dict[str, Any]:
    if not path.is_file():
        raise FileNotFoundError(path)
    size = path.stat().st_size
    digest = sha256(path)
    if size != expected["bytes"] or digest != expected["sha256"]:
        raise RuntimeError(
            f"{path.name}: input fingerprint mismatch; got {size} bytes {digest}"
        )
    return {"path": str(path), "bytes": size, "sha256": digest}


def build_body(
    character_id: str,
    spec: dict[str, Any],
    source: Path,
    destination: Path,
    source_blend: Path,
) -> tuple[dict[str, Any], dict[str, Any]]:
    source_document, source_binary = read_glb(source)
    source_raw_mesh_contract = raw_mesh_contract(source_document, source_binary)
    reset_scene()
    import_glb(source)
    rigs = armatures()
    skinned = [obj for obj in meshes() if is_skinned(obj)]
    helpers = [obj for obj in meshes() if obj not in skinned]
    if len(rigs) != 1 or len(rigs[0].data.bones) != 24 or len(skinned) != 1:
        raise RuntimeError(f"{character_id}: source is not one mesh plus one 24-bone rig")
    removed_helpers = [obj.name for obj in helpers]
    for helper in helpers:
        remove_object(helper)
    if not any(name.lower().startswith("icosphere") for name in removed_helpers):
        raise RuntimeError(f"{character_id}: source helper Icosphere was not found")

    rig, mesh = rigs[0], skinned[0]
    source_position_import = compare_imported_source_positions(mesh, source_raw_mesh_contract)
    original_mesh_contract = mesh_contract(mesh)
    skin = mesh_skin_stats(mesh)
    if skin["triangles"] != spec["triangles"]:
        raise RuntimeError(f"{character_id}: source triangle count mismatch")
    if skin["unweighted_vertices"] or skin["vertices_over_4_influences"]:
        raise RuntimeError(f"{character_id}: unsafe source weights")
    images = used_images([mesh])
    if len(images) != 1 or list(images[0].size) != [2048, 2048]:
        raise RuntimeError(f"{character_id}: expected one used 2048x2048 image")
    for image in images:
        image.pack()
    clear_actions()

    proportion, v1_rig, expected_v2_rig = apply_arm_proportion(rig, mesh, spec["factor"])
    expected_v2_positions = blender_mesh_positions_for_gltf(mesh)
    unchanged_contract = compare_mesh_contracts(original_mesh_contract, mesh_contract(mesh))
    material_record = sanitize_blender_materials([mesh])

    source_blend.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.file.pack_all()
    bpy.ops.wm.save_as_mainfile(filepath=str(source_blend), check_existing=False)

    select_only([rig, mesh])
    destination.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=str(destination),
        export_format="GLB",
        use_selection=True,
        export_animations=False,
        export_skins=True,
        export_def_bones=False,
        export_rest_position_armature=True,
        export_materials="EXPORT",
        export_image_format="AUTO",
        export_unused_images=False,
        export_cameras=False,
        export_lights=False,
        export_yup=True,
        export_apply=False,
    )
    raw_sanitize = sanitize_raw_materials(destination)
    build_record = {
        "source": validate_input(source, spec["body"]),
        "removed_helpers": removed_helpers,
        "source_skin": skin,
        "source_mesh_contract_sha256": original_mesh_contract["sha256"],
        "source_position_import": source_position_import,
        "in_memory_contract_after_position_warp": unchanged_contract,
        "proportion": proportion,
        "materials": material_record,
        "raw_material_sanitize": raw_sanitize,
        "editable_source": {
            "path": str(source_blend),
            "bytes": source_blend.stat().st_size,
            "sha256": sha256(source_blend),
            "packed_images": sum(bool(image.packed_file) for image in bpy.data.images),
        },
        "output": str(destination),
    }
    state = {
        "mesh_contract": original_mesh_contract,
        "raw_mesh_contract": source_raw_mesh_contract,
        "v1_rig_contract": v1_rig,
        "v2_rig_contract": expected_v2_rig,
        "proportion": proportion,
        "expected_v2_positions": expected_v2_positions,
    }
    return build_record, state


def action_neutrality(rig: Any, action: Any) -> dict[str, Any]:
    assign_action(rig, action)
    start, end = action.frame_range
    frames = finite_frame_range(start, end, action.name)
    max_location = 0.0
    max_scale_delta = 0.0
    for frame in frames:
        bpy.context.scene.frame_set(frame)
        bpy.context.view_layer.update()
        for name in ARM_BONES:
            bone = rig.pose.bones[name]
            finite_values(bone.location, f"{action.name}/{frame}/{name} location")
            finite_values(bone.scale, f"{action.name}/{frame}/{name} scale")
            max_location = max(max_location, max(abs(value) for value in bone.location))
            max_scale_delta = max(
                max_scale_delta, max(abs(float(value) - 1.0) for value in bone.scale)
            )
    if max_location > 1e-3 or max_scale_delta > 1e-4:
        raise RuntimeError(
            f"{action.name}: arm action contains non-neutral translation/scale "
            f"({max_location}, {max_scale_delta}); simple rest retarget is unsafe"
        )
    return {
        "frame_range": [float(start), float(end)],
        "sampled_integer_frames": len(frames),
        "max_arm_location_armature_units": max_location,
        "max_arm_scale_delta": max_scale_delta,
    }


def build_pack(
    character_id: str,
    spec: dict[str, Any],
    derivatives: Path,
    rig_source_path: Path,
    destination: Path,
    v1_rig_contract: dict[str, Any],
) -> tuple[dict[str, Any], dict[str, dict[str, Any]]]:
    if not rig_source_path.is_file():
        raise FileNotFoundError(rig_source_path)
    bpy.ops.wm.open_mainfile(filepath=str(rig_source_path))
    bpy.context.scene.render.fps = PIPELINE_FPS
    bpy.context.scene.render.fps_base = 1.0
    clear_actions()
    base_rigs = armatures()
    if len(base_rigs) != 1 or len(base_rigs[0].data.bones) != 24:
        raise RuntimeError(f"{character_id}: v2 source does not contain one 24-bone rig")
    base_rig = base_rigs[0]
    selected_actions = []
    source_records = []
    source_animation_contracts: dict[str, dict[str, Any]] = {}
    prefix = f"{character_id}-{spec['slug']}"
    for action_name in ACTION_NAMES:
        clip_spec = spec["clips"][action_name]
        source = derivatives / clip_spec["file"]
        input_record = validate_input(source, clip_spec)
        source_document, source_binary = read_glb(source)
        source_animations = source_document.get("animations", [])
        if len(source_animations) != 1:
            raise RuntimeError(f"{character_id}/{action_name}: expected one source animation")
        source_skin = raw_skin_contract(source_document, source_binary)
        source_animation_contracts[action_name] = raw_animation_contract(
            source_document,
            source_binary,
            source_animations[0],
            source_skin["joint_names"],
        )
        previous_rigs = set(armatures())
        previous_actions = set(bpy.data.actions)
        import_glb(source)
        added_rigs = [rig for rig in armatures() if rig not in previous_rigs]
        added_actions = [action for action in bpy.data.actions if action not in previous_actions]
        if len(added_rigs) != 1 or not added_actions:
            raise RuntimeError(f"{character_id}/{action_name}: could not isolate source rig/action")
        source_rig = added_rigs[0]
        compare_rig_contracts(v1_rig_contract, rig_contract(source_rig), head_tolerance=3e-5)
        action = exact_action(source_rig)
        if action not in added_actions:
            raise RuntimeError(f"{character_id}/{action_name}: linked action was not newly imported")
        neutrality = action_neutrality(source_rig, action)
        action.name = action_name
        action.use_fake_user = True
        assign_action(base_rig, action)
        bpy.context.scene.frame_set(round(sum(action.frame_range) * 0.5))
        bpy.context.view_layer.update()
        selected_actions.append(action)
        source_records.append(
            {
                "action": action_name,
                "source": input_record,
                "retarget_safety": neutrality,
                "source_animation_contract": {
                    "channels": source_animation_contracts[action_name]["channel_count"],
                    "normalized_frame_range_seconds": vector_values(
                        source_animation_contracts[action_name]["normalized_frame_range_seconds"], 6
                    ),
                    "expected_frames_at_30fps": source_animation_contracts[action_name]["expected_frames_at_30fps"],
                    "canonical_sha256_5dp": source_animation_contracts[action_name]["canonical_sha256_5dp"],
                },
            }
        )

    for action in list(bpy.data.actions):
        if action not in selected_actions:
            bpy.data.actions.remove(action)
    if sorted(action.name for action in bpy.data.actions) != sorted(ACTION_NAMES):
        raise RuntimeError(f"{character_id}: unexpected action set before pack export")

    for obj in list(bpy.context.scene.objects):
        if obj != base_rig:
            remove_object(obj)
    for datablocks in (bpy.data.materials, bpy.data.images, bpy.data.meshes):
        for block in list(datablocks):
            datablocks.remove(block)

    assign_action(base_rig, selected_actions[-1])
    select_only([base_rig])
    destination.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=str(destination),
        export_format="GLB",
        use_selection=True,
        export_animations=True,
        export_animation_mode="ACTIONS",
        export_frame_range=False,
        export_force_sampling=False,
        export_optimize_animation_size=False,
        export_skins=True,
        export_def_bones=False,
        export_rest_position_armature=True,
        export_materials="NONE",
        export_unused_images=False,
        export_cameras=False,
        export_lights=False,
        export_yup=True,
        export_apply=False,
    )
    return {"sources": source_records, "output": str(destination)}, source_animation_contracts


def validate_body(
    character_id: str,
    spec: dict[str, Any],
    path: Path,
    expected_mesh_contract: dict[str, Any],
    expected_raw_mesh_contract: dict[str, Any],
    expected_rig_contract: dict[str, Any],
    expected_positions: tuple[tuple[float, float, float], ...],
) -> tuple[dict[str, Any], dict[str, Any]]:
    raw, binary = read_glb(path)
    if len(raw.get("meshes", [])) != 1 or raw.get("animations"):
        raise RuntimeError(f"{character_id}: body must contain one mesh and no animation")
    if any("icosphere" in node.get("name", "").lower() for node in raw.get("nodes", [])):
        raise RuntimeError(f"{character_id}: body still contains the source Icosphere")
    material = validate_raw_materials(raw)
    raw_skin = raw_skin_contract(raw, binary)
    output_raw_mesh = raw_mesh_contract(raw, binary)
    raw_mesh_check, output_to_source = compare_raw_mesh_contracts(
        expected_raw_mesh_contract, output_raw_mesh, expected_positions
    )

    reset_scene()
    import_glb(path)
    rigs = armatures()
    imported_asset_meshes = asset_meshes()
    skinned = [obj for obj in imported_asset_meshes if is_skinned(obj)]
    if len(rigs) != 1 or len(rigs[0].data.bones) != 24:
        raise RuntimeError(f"{character_id}: body reimport skeleton mismatch")
    if len(imported_asset_meshes) != 1 or len(skinned) != 1:
        raise RuntimeError(f"{character_id}: body reimport render payload mismatch")
    mesh = skinned[0]
    skin = mesh_skin_stats(mesh)
    if skin["triangles"] != spec["triangles"]:
        raise RuntimeError(f"{character_id}: triangle count changed")
    if skin["unweighted_vertices"] or skin["vertices_over_4_influences"]:
        raise RuntimeError(f"{character_id}: invalid reimported skin weights")
    reimported_contract = mesh_contract(mesh)
    reimported_position_check = compare_reimported_positions(
        mesh, output_raw_mesh, expected_positions, output_to_source
    )
    # A GLB round trip quantizes bone translations to float32.  The armature is
    # scaled to centimeters, so 2e-3 armature units is a 20-micrometer bound.
    rig_check = compare_rig_contracts(
        expected_rig_contract,
        rig_contract(rigs[0]),
        head_tolerance=2e-3,
        rotation_tolerance=1e-5,
    )
    images = [image for image in bpy.data.images if image.size[0] and image.size[1]]
    if len(images) != 1 or list(images[0].size) != [2048, 2048]:
        raise RuntimeError(f"{character_id}: 2K texture was not retained")
    if bpy.data.actions:
        raise RuntimeError(f"{character_id}: body reimport created actions")
    metrics = chain_metrics(rigs[0], mesh)
    return (
        {
            "result": "PASS",
            "path": str(path),
            "bytes": path.stat().st_size,
            "sha256": sha256(path),
            "raw": {
                "meshes": len(raw.get("meshes", [])),
                "skins": len(raw.get("skins", [])),
                "animations": len(raw.get("animations", [])),
                "materials": len(raw.get("materials", [])),
                "images": len(raw.get("images", [])),
            },
            "material": material,
            "skin": skin,
            "mesh_contract": {
                **raw_mesh_check,
                "reimported_positions": reimported_position_check,
                "in_memory_source_contract_sha256": expected_mesh_contract["sha256"],
                "reimported_contract_sha256": reimported_contract["sha256"],
            },
            "rig_contract": rig_check,
            "rest_signature_sha256": raw_skin["rest_signature_sha256"],
            "texture": {"count": 1, "size": [2048, 2048]},
            "arm_metrics": metrics,
        },
        raw_skin,
    )


def animation_arm_channel_stats(
    document: dict[str, Any], binary: bytes
) -> dict[str, dict[str, float]]:
    nodes = document.get("nodes", [])
    result: dict[str, dict[str, float]] = {}
    for animation in document.get("animations", []):
        max_translation = 0.0
        max_scale = 0.0
        for channel in animation.get("channels", []):
            target = channel.get("target", {})
            node_index = target.get("node")
            if node_index is None or nodes[node_index].get("name") not in ARM_BONES:
                continue
            path = target.get("path")
            sampler = animation["samplers"][channel["sampler"]]
            values = accessor_values(document, binary, sampler["output"])
            if path == "translation":
                base = nodes[node_index].get("translation", [0.0, 0.0, 0.0])
                for value in values:
                    max_translation = max(
                        max_translation,
                        math.sqrt(sum((float(a) - float(b)) ** 2 for a, b in zip(value, base))),
                    )
            elif path == "scale":
                base = nodes[node_index].get("scale", [1.0, 1.0, 1.0])
                for value in values:
                    max_scale = max(
                        max_scale,
                        max(abs(float(a) - float(b)) for a, b in zip(value, base)),
                    )
        # Source arm pose locations are below 4.3e-5 armature units.  Sampling
        # through glTF float32 rest transforms raises the measured delta to at
        # most ~7e-5, still below one micrometer at this rig's object scale.
        if max_translation > 1e-4 or max_scale > 2e-5:
            raise RuntimeError(
                f"{animation.get('name')}: v2 arm translation/scale channels are not rest-neutral"
            )
        result[animation.get("name", "")] = {
            "max_translation_delta": max_translation,
            "max_scale_delta": max_scale,
        }
    return result


def evaluated_vertices_and_areas(obj: Any) -> tuple[list[Vector], list[float]]:
    depsgraph = bpy.context.evaluated_depsgraph_get()
    evaluated = obj.evaluated_get(depsgraph)
    mesh = evaluated.to_mesh(preserve_all_data_layers=False, depsgraph=depsgraph)
    try:
        mesh.calc_loop_triangles()
        vertices = [evaluated.matrix_world @ vertex.co for vertex in mesh.vertices]
        # Ratios compare the same object's rest/pose geometry, so the constant
        # object-space area scale cancels. Blender computes these areas in C;
        # avoiding a Python cross-product loop keeps the required all-frame
        # validation practical without weakening it.
        areas = [float(triangle.area) for triangle in mesh.loop_triangles]
        return vertices, areas
    finally:
        evaluated.to_mesh_clear()


def posed_chain_lengths(rig: Any) -> dict[str, float]:
    result = {}
    for side, (arm_name, fore_name, hand_name) in ARM_CHAINS.items():
        arm = rig.pose.bones[arm_name]
        fore = rig.pose.bones[fore_name]
        hand = rig.pose.bones[hand_name]
        shoulder = rig.matrix_world @ arm.head
        elbow = rig.matrix_world @ fore.head
        wrist = rig.matrix_world @ hand.head
        result[f"{side}_upper"] = (shoulder - elbow).length
        result[f"{side}_fore"] = (elbow - wrist).length
    return result


def validate_pack_on_body(
    character_id: str,
    body_path: Path,
    pack_path: Path,
    rest_metrics: dict[str, Any],
) -> dict[str, Any]:
    reset_scene()
    import_glb(body_path)
    body_rig = armatures()[0]
    body_mesh = [obj for obj in asset_meshes() if is_skinned(obj)][0]
    import_glb(pack_path)
    actions = {action.name: action for action in bpy.data.actions}
    if set(actions) != set(ACTION_NAMES):
        raise RuntimeError(f"{character_id}: playback action names mismatch")
    body_rig.data.pose_position = "REST"
    bpy.context.scene.frame_set(0)
    bpy.context.view_layer.update()
    rest_vertices, rest_areas = evaluated_vertices_and_areas(body_mesh)
    if any(not math.isfinite(value) for vertex in rest_vertices for value in vertex):
        raise RuntimeError(f"{character_id}: non-finite rest vertex")
    if any(not math.isfinite(area) or area < 0.0 for area in rest_areas):
        raise RuntimeError(f"{character_id}: non-finite rest face area")
    valid_rest_faces = sum(area > 1e-12 for area in rest_areas)
    if valid_rest_faces < len(rest_areas) * 0.999:
        raise RuntimeError(
            f"{character_id}: too many degenerate rest faces "
            f"({len(rest_areas) - valid_rest_faces}/{len(rest_areas)})"
        )
    rest_max_abs_coordinate = max(
        (max(abs(value) for value in vertex) for vertex in rest_vertices), default=0.0
    )
    rest_min = Vector(tuple(min(vertex[axis] for vertex in rest_vertices) for axis in range(3)))
    rest_max = Vector(tuple(max(vertex[axis] for vertex in rest_vertices) for axis in range(3)))
    rest_span = (rest_max - rest_min).length
    body_rig.data.pose_position = "POSE"
    bpy.context.view_layer.update()
    results = {}
    expected_lengths = {
        f"{side}_upper": rest_metrics[side]["upper_arm_m"]
        for side in ARM_CHAINS
    }
    expected_lengths.update(
        {
            f"{side}_fore": rest_metrics[side]["forearm_m"]
            for side in ARM_CHAINS
        }
    )
    for action_name in ACTION_NAMES:
        action = actions[action_name]
        assign_action(body_rig, action)
        start, end = action.frame_range
        frames = finite_frame_range(start, end, f"{character_id}/{action_name}")
        review_frames = {
            frames[0],
            frames[round((len(frames) - 1) * 0.25)],
            frames[round((len(frames) - 1) * 0.50)],
            frames[round((len(frames) - 1) * 0.75)],
            frames[-1],
        }
        first_vertices: list[Vector] | None = None
        last_vertices: list[Vector] | None = None
        max_joint_error = 0.0
        max_abs_coordinate = 0.0
        max_basis_rotation = 0.0
        max_moderate_face_outliers = 0
        max_extreme_face_outliers = 0
        minimum_area_ratio = math.inf
        maximum_area_ratio = 0.0
        max_animated_span = 0.0
        deformation_samples = []
        for frame in frames:
            bpy.context.scene.frame_set(frame)
            bpy.context.view_layer.update()
            vertices, areas = evaluated_vertices_and_areas(body_mesh)
            if any(not math.isfinite(value) for vertex in vertices for value in vertex):
                raise RuntimeError(f"{character_id}/{action_name}/{frame}: non-finite vertex")
            max_abs_coordinate = max(
                max_abs_coordinate,
                max((max(abs(value) for value in vertex) for vertex in vertices), default=0.0),
            )
            if len(areas) != len(rest_areas) or any(
                not math.isfinite(area) or area < 0.0 for area in areas
            ):
                raise RuntimeError(f"{character_id}/{action_name}/{frame}: invalid face areas")
            frame_min = Vector(
                tuple(min(vertex[axis] for vertex in vertices) for axis in range(3))
            )
            frame_max = Vector(
                tuple(max(vertex[axis] for vertex in vertices) for axis in range(3))
            )
            max_animated_span = max(max_animated_span, (frame_max - frame_min).length)
            ratios = [
                area / reference
                for area, reference in zip(areas, rest_areas)
                if reference > 1e-12
            ]
            moderate = sum(ratio < 0.10 or ratio > 10.0 for ratio in ratios)
            extreme = sum(ratio < 0.01 or ratio > 30.0 for ratio in ratios)
            max_moderate_face_outliers = max(max_moderate_face_outliers, moderate)
            max_extreme_face_outliers = max(max_extreme_face_outliers, extreme)
            minimum_area_ratio = min(minimum_area_ratio, min(ratios, default=math.inf))
            maximum_area_ratio = max(maximum_area_ratio, max(ratios, default=0.0))
            if moderate > 12 or extreme > 3:
                raise RuntimeError(
                    f"{character_id}/{action_name}/{frame}: deformation exceeds rest-area "
                    f"bounds (moderate={moderate}, extreme={extreme})"
                )
            if frame == frames[0]:
                first_vertices = [vertex.copy() for vertex in vertices]
            if frame == frames[-1]:
                last_vertices = [vertex.copy() for vertex in vertices]
            lengths = posed_chain_lengths(body_rig)
            max_joint_error = max(
                max_joint_error,
                max(abs(lengths[name] - expected) for name, expected in expected_lengths.items()),
            )
            max_basis_rotation = max(
                max_basis_rotation,
                max((bone.matrix_basis.to_quaternion().angle for bone in body_rig.pose.bones), default=0.0),
            )
            if frame in review_frames:
                deformation_samples.append(
                    {
                        "frame": frame,
                        "faces_below_0_1x_or_above_10x": moderate,
                        "faces_below_0_01x_or_above_30x": extreme,
                        "min_area_ratio": min(ratios, default=None),
                        "max_area_ratio": max(ratios, default=None),
                    }
                )
        tolerance = max(expected_lengths.values()) * 1e-3
        if max_joint_error > tolerance:
            raise RuntimeError(
                f"{character_id}/{action_name}: posed arm length drift {max_joint_error} > {tolerance}"
            )
        if max_basis_rotation < 0.05:
            raise RuntimeError(f"{character_id}/{action_name}: action appears motionless")
        assert first_vertices is not None and last_vertices is not None
        seam_distances = [(a - b).length for a, b in zip(first_vertices, last_vertices)]
        seam_max = max(seam_distances, default=0.0)
        seam_rms = math.sqrt(
            sum(value * value for value in seam_distances) / max(1, len(seam_distances))
        )
        height = float(rest_metrics["height_m"])
        if not math.isfinite(height) or height <= 0.0:
            raise RuntimeError(f"{character_id}: invalid rest height")
        if max_abs_coordinate > rest_max_abs_coordinate + height * 0.35:
            raise RuntimeError(
                f"{character_id}/{action_name}: world extent {max_abs_coordinate} exceeds bound"
            )
        if max_animated_span > rest_span + height * 0.35:
            raise RuntimeError(
                f"{character_id}/{action_name}: animated span {max_animated_span} exceeds bound"
            )
        if seam_max > height * 0.05 or seam_rms > height * 0.025:
            raise RuntimeError(
                f"{character_id}/{action_name}: loop seam exceeds bound "
                f"(max={seam_max}, rms={seam_rms})"
            )
        results[action_name] = {
            "frame_range": [float(start), float(end)],
            "frames_checked": len(frames),
            "all_vertices_finite": True,
            "max_abs_world_coordinate": max_abs_coordinate,
            "max_arm_segment_error_m": max_joint_error,
            "max_pose_basis_rotation_radians": max_basis_rotation,
            "world_extent_limit_m": rest_max_abs_coordinate + height * 0.35,
            "animated_span_limit_m": rest_span + height * 0.35,
            "loop_seam_max_vertex_delta_m": seam_max,
            "loop_seam_max_limit_m": height * 0.05,
            "loop_seam_rms_vertex_delta_m": seam_rms,
            "loop_seam_rms_limit_m": height * 0.025,
            "rest_face_reference_used_on_every_frame": True,
            "max_faces_below_0_1x_or_above_10x": max_moderate_face_outliers,
            "moderate_face_outlier_limit": 12,
            "max_faces_below_0_01x_or_above_30x": max_extreme_face_outliers,
            "extreme_face_outlier_limit": 3,
            "min_rest_area_ratio_all_frames": minimum_area_ratio,
            "max_rest_area_ratio_all_frames": maximum_area_ratio,
            "deformation_samples": deformation_samples,
        }
    return {
        "result": "PASS",
        "rest_geometry": {
            "vertices": len(rest_vertices),
            "faces": len(rest_areas),
            "valid_reference_faces": valid_rest_faces,
            "max_abs_world_coordinate": rest_max_abs_coordinate,
            "bounds_min": vector_values(rest_min),
            "bounds_max": vector_values(rest_max),
        },
        "actions": results,
    }


def validate_pack(
    character_id: str,
    body_path: Path,
    pack_path: Path,
    body_skin: dict[str, Any],
    rest_metrics: dict[str, Any],
    expected_animation_contracts: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    document, binary = read_glb(pack_path)
    animation_names = [animation.get("name") for animation in document.get("animations", [])]
    if sorted(animation_names) != sorted(ACTION_NAMES) or len(animation_names) != 2:
        raise RuntimeError(f"{character_id}: clip action set is {animation_names}")
    for key in ("meshes", "materials", "images", "textures"):
        if document.get(key):
            raise RuntimeError(f"{character_id}: clip pack contains {key}")
    channels = {
        animation["name"]: len(animation.get("channels", []))
        for animation in document["animations"]
    }
    if any(count != 72 for count in channels.values()):
        raise RuntimeError(f"{character_id}: clip channel counts changed: {channels}")
    pack_skin = raw_skin_contract(document, binary)
    compatibility = compare_raw_skins(body_skin, pack_skin)
    channel_stats = animation_arm_channel_stats(document, binary)
    output_animations = {animation["name"]: animation for animation in document["animations"]}
    animation_contracts = {}
    for action_name in ACTION_NAMES:
        output_contract = raw_animation_contract(
            document,
            binary,
            output_animations[action_name],
            pack_skin["joint_names"],
        )
        animation_contracts[action_name] = compare_animation_contracts(
            expected_animation_contracts[action_name],
            output_contract,
            f"{character_id}/{action_name}",
        )

    reset_scene()
    import_glb(pack_path)
    imported_asset_meshes = asset_meshes()
    imported_actions = {action.name: action for action in bpy.data.actions}
    imported_rigs = armatures()
    if imported_asset_meshes or bpy.data.images or bpy.data.materials:
        raise RuntimeError(f"{character_id}: pack reimport created render data")
    if len(imported_rigs) != 1 or len(imported_rigs[0].data.bones) != 24:
        raise RuntimeError(f"{character_id}: pack reimport skeleton mismatch")
    if set(imported_actions) != set(ACTION_NAMES):
        raise RuntimeError(f"{character_id}: pack reimport action mismatch")
    playback = validate_pack_on_body(character_id, body_path, pack_path, rest_metrics)
    return {
        "result": "PASS",
        "path": str(pack_path),
        "bytes": pack_path.stat().st_size,
        "sha256": sha256(pack_path),
        "raw": {
            "animations": animation_names,
            "animation_channels": channels,
            "meshes": len(document.get("meshes", [])),
            "materials": len(document.get("materials", [])),
            "images": len(document.get("images", [])),
            "textures": len(document.get("textures", [])),
            "joints": len(pack_skin["joint_names"]),
        },
        "compatibility": compatibility,
        "arm_animation_channels": channel_stats,
        "source_output_animation_contracts": animation_contracts,
        "playback": playback,
    }


def geometry_bounds(mesh_objects: list[Any]) -> tuple[Vector, Vector]:
    points = []
    depsgraph = bpy.context.evaluated_depsgraph_get()
    for obj in mesh_objects:
        evaluated = obj.evaluated_get(depsgraph)
        mesh = evaluated.to_mesh(preserve_all_data_layers=False, depsgraph=depsgraph)
        try:
            points.extend(evaluated.matrix_world @ vertex.co for vertex in mesh.vertices)
        finally:
            evaluated.to_mesh_clear()
    if not points:
        raise RuntimeError("cannot frame a render without geometry")
    return (
        Vector(tuple(min(point[index] for point in points) for index in range(3))),
        Vector(tuple(max(point[index] for point in points) for index in range(3))),
    )


def configure_render(mesh_objects: list[Any], output: Path) -> None:
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 540
    scene.render.resolution_y = 720
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.film_transparent = False
    try:
        scene.view_settings.look = "AgX - Medium High Contrast"
    except TypeError:
        pass
    minimum, maximum = geometry_bounds(mesh_objects)
    center = (minimum + maximum) * 0.5
    dimensions = maximum - minimum
    span = max(dimensions)

    world = bpy.data.worlds.new("PilotV2QAWorld") if scene.world is None else scene.world
    scene.world = world
    world.use_nodes = True
    background = world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = (0.025, 0.035, 0.055, 1.0)
    background.inputs["Strength"].default_value = 0.45
    for name, offset, energy, size in (
        ("QAKey", (-1.8, -2.6, 2.7), 1050.0, 3.2),
        ("QAFill", (2.0, -1.0, 1.8), 550.0, 3.0),
        ("QARim", (0.3, 2.2, 2.5), 800.0, 2.4),
    ):
        data = bpy.data.lights.new(name, "AREA")
        data.energy = energy * max(0.5, span / 1.9)
        data.shape = "DISK"
        data.size = size * max(0.5, span / 1.9)
        light = bpy.data.objects.new(name, data)
        scene.collection.objects.link(light)
        light.location = center + Vector(offset) * max(0.5, span / 1.9)
        light.rotation_euler = (center - light.location).to_track_quat("-Z", "Y").to_euler()

    camera_data = bpy.data.cameras.new("PilotV2QACamera")
    camera_data.type = "ORTHO"
    camera = bpy.data.objects.new("PilotV2QACamera", camera_data)
    scene.collection.objects.link(camera)
    scene.camera = camera
    direction = Vector((-0.58, -1.0, 0.06)).normalized()
    camera.location = center + direction * max(4.0, span * 3.0)
    camera.rotation_euler = (center - camera.location).to_track_quat("-Z", "Y").to_euler()
    horizontal = math.sqrt(dimensions.x * dimensions.x + dimensions.y * dimensions.y)
    aspect = scene.render.resolution_x / scene.render.resolution_y
    camera.data.ortho_scale = max(dimensions.z * 1.14, horizontal * 1.14 / aspect, 0.25)
    scene.render.filepath = str(output)


def render_candidate(
    character_id: str,
    body_path: Path,
    pack_path: Path,
    output: Path,
    action_name: str | None,
) -> dict[str, Any]:
    reset_scene()
    import_glb(body_path)
    body_rig = armatures()[0]
    body_meshes = [obj for obj in asset_meshes() if is_skinned(obj)]
    frame = 0
    if action_name is not None:
        import_glb(pack_path)
        actions = {action.name: action for action in bpy.data.actions}
        action = actions[action_name]
        assign_action(body_rig, action)
        frame = round(sum(action.frame_range) * 0.5)
        bpy.context.scene.frame_set(frame)
        bpy.context.view_layer.update()
    for obj in meshes():
        if obj not in body_meshes:
            obj.hide_render = True
    output.parent.mkdir(parents=True, exist_ok=True)
    configure_render(body_meshes, output)
    bpy.ops.render.render(write_still=True)
    return {
        "character_id": character_id,
        "action": action_name or "neutral-rest",
        "frame": frame,
        "path": str(output),
        "bytes": output.stat().st_size,
        "sha256": sha256(output),
    }


def artifact_record(path: Path, root: Path, role: str, character_id: str | None) -> dict[str, Any]:
    return {
        "relative_path": path.relative_to(root).as_posix(),
        "role": role,
        "character_id": character_id,
        "bytes": path.stat().st_size,
        "sha256": sha256(path),
    }


def main() -> None:
    pilot_root, output_root = script_args()
    if bpy.app.version[:2] != (5, 2):
        raise RuntimeError(f"requires Blender 5.2.x, got {bpy.app.version_string}")
    if not bpy.app.background:
        raise RuntimeError("requires Blender background mode before any scene/file mutation")
    bpy.context.preferences.filepaths.file_preview_type = "NONE"
    derivatives = pilot_root / "derivatives"
    if not derivatives.is_dir():
        raise FileNotFoundError(f"missing derivatives directory: {derivatives}")
    if not output_root.parent.is_dir():
        raise FileNotFoundError(f"output parent must already exist: {output_root.parent}")

    # Fingerprint every private input before creating output files.
    input_inventory = {}
    for character_id, spec in PILOTS.items():
        input_inventory[character_id] = {
            "body": validate_input(derivatives / spec["body"]["file"], spec["body"]),
            "clips": {
                name: validate_input(derivatives / clip["file"], clip)
                for name, clip in spec["clips"].items()
            },
        }

    # mkdir without exist_ok is the atomic fresh-output reservation.  A racing
    # process can win it, but this process can never reuse or mix that output.
    output_root.mkdir()
    (output_root / "clips").mkdir()
    (output_root / "sources").mkdir()
    (output_root / "qa" / "renders").mkdir(parents=True)
    report: dict[str, Any] = {
        "schema_version": 2,
        "created_at_utc": utc_now(),
        "blender_version": bpy.app.version_string,
        "background": bpy.app.background,
        "offline_pipeline": True,
        "network_operations": [],
        "input_root": str(pilot_root),
        "output_root": str(output_root),
        "arm_factors": {key: spec["factor"] for key, spec in PILOTS.items()},
        "input_inventory": input_inventory,
        "build": {},
        "validation": {},
        "renders": [],
        "result": "RUNNING",
    }
    report_path = output_root / "qa" / "fighter-pilot-v2-validation.private.json"

    try:
        paths: dict[str, dict[str, Path]] = {}
        states: dict[str, dict[str, Any]] = {}
        for character_id, spec in PILOTS.items():
            prefix = f"{character_id}-{spec['slug']}"
            lower = prefix.lower()
            body_path = output_root / f"{lower}-v02.glb"
            pack_path = output_root / "clips" / f"{lower}-clips-v02.glb"
            blend_path = output_root / "sources" / f"{prefix}-rig-v2-source.blend"
            body_build, state = build_body(
                character_id,
                spec,
                derivatives / spec["body"]["file"],
                body_path,
                blend_path,
            )
            pack_build, source_animation_contracts = build_pack(
                character_id,
                spec,
                derivatives,
                blend_path,
                pack_path,
                state["v1_rig_contract"],
            )
            report["build"][character_id] = {"body": body_build, "clip_pack": pack_build}
            paths[character_id] = {"body": body_path, "pack": pack_path, "blend": blend_path}
            states[character_id] = state
            states[character_id]["source_animation_contracts"] = source_animation_contracts

        for character_id, spec in PILOTS.items():
            body_validation, body_skin = validate_body(
                character_id,
                spec,
                paths[character_id]["body"],
                states[character_id]["mesh_contract"],
                states[character_id]["raw_mesh_contract"],
                states[character_id]["v2_rig_contract"],
                states[character_id]["expected_v2_positions"],
            )
            pack_validation = validate_pack(
                character_id,
                paths[character_id]["body"],
                paths[character_id]["pack"],
                body_skin,
                body_validation["arm_metrics"],
                states[character_id]["source_animation_contracts"],
            )
            report["validation"][character_id] = {
                "body": body_validation,
                "clip_pack": pack_validation,
            }
            render_root = output_root / "qa" / "renders"
            report["renders"].append(
                render_candidate(
                    character_id,
                    paths[character_id]["body"],
                    paths[character_id]["pack"],
                    render_root / f"{character_id}-body-neutral.png",
                    None,
                )
            )
            for action_name in ACTION_NAMES:
                report["renders"].append(
                    render_candidate(
                        character_id,
                        paths[character_id]["body"],
                        paths[character_id]["pack"],
                        render_root / f"{character_id}-{action_name}.png",
                        action_name,
                    )
                )

        artifacts = []
        for character_id in PILOTS:
            artifacts.extend(
                (
                    artifact_record(paths[character_id]["body"], output_root, "body-v02", character_id),
                    artifact_record(paths[character_id]["pack"], output_root, "clip-pack-v02", character_id),
                    artifact_record(paths[character_id]["blend"], output_root, "editable-rig-v2-source", character_id),
                )
            )
        for render in report["renders"]:
            artifacts.append(
                artifact_record(Path(render["path"]), output_root, "qa-render", render["character_id"])
            )
        report["artifacts"] = artifacts
        report["result"] = "PASS"
        report_path.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        manifest = {
            "schema_version": 2,
            "created_at_utc": report["created_at_utc"],
            "purpose": "private F01/F02 rig-v2 candidates; not production-approved",
            "source_rig_version": "v1",
            "output_rig_version": "v2",
            "arm_factors": report["arm_factors"],
            "artifacts": artifacts,
        }
        manifest_path = output_root / "fighter-pilot-v2-manifest.private.json"
        manifest_path.write_text(
            json.dumps(manifest, indent=2, sort_keys=True) + "\n", encoding="utf-8"
        )
        print(
            json.dumps(
                {
                    "result": "PASS",
                    "output_root": str(output_root),
                    "validation_report": str(report_path),
                    "manifest": str(manifest_path),
                    "artifacts": artifacts,
                },
                indent=2,
            )
        )
    except Exception as error:
        report["result"] = "FAIL"
        report["failure"] = {
            "type": type(error).__name__,
            "message": str(error),
            "traceback": traceback.format_exc(),
        }
        report_path.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        raise


if __name__ == "__main__":
    try:
        main()
    except Exception:
        traceback.print_exc()
        # Blender otherwise reports Python script exceptions while returning
        # process exit code 0, which would turn every validation gate into a
        # false pass in automation.
        raise SystemExit(1)
