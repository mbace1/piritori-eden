# -*- coding: utf-8 -*-
"""Which registered art does nothing actually ask for?

CLAUDE.md rule 11: export_filter="all_resources" packs everything under res://,
referenced or not. A 5.9MB orphaned Meshy texture shipped in every build that
way once already.

The first version of this reported 34 orphans including the crew torsos, which
are obviously in use. That is rule 11's OTHER trap: an asset carries EITHER a
`file`, OR `members[]`, OR `frames[]`, and code refers to the MEMBER ids
(torso-runner-v03), never the group id (crew-torsos-era1-v03). An asset counts
as referenced if its own id, any member or frame id, or any of its file paths
turns up anywhere.
"""
import io
import json
import os

ROOT = ".."
MANIFEST = os.path.join(ROOT, "art", "v3", "manifest.json")

haystack = []
for base, _dirs, files in os.walk(ROOT):
    if any(p in base for p in (".git", "data", ".godot", "art-library", "art-src", "build")):
        continue
    for fn in files:
        if fn == "manifest.json":
            continue
        if fn.endswith((".json", ".gd", ".mjs", ".cjs", ".tscn", ".cfg")):
            try:
                haystack.append(io.open(os.path.join(base, fn), encoding="utf-8",
                                        errors="ignore").read())
            except OSError:
                pass
blob = "\n".join(haystack)

m = json.load(io.open(MANIFEST, encoding="utf-8"))


def walk(node, out):
    if isinstance(node, dict):
        if "id" in node and ("file" in node or "members" in node or "frames" in node):
            out.append(node)
        for v in node.values():
            walk(v, out)
    elif isinstance(node, list):
        for v in node:
            walk(v, out)


assets = []
walk(m, assets)


def parts(a):
    """Every name this asset could plausibly be called by, and its files."""
    names = [str(a["id"])]
    files = []
    if "file" in a:
        files.append(a["file"])
    for group in ("members", "frames"):
        for x in a.get(group, []):
            if isinstance(x, dict):
                if "id" in x:
                    names.append(str(x["id"]))
                if "file" in x:
                    files.append(x["file"])
    return names, files


orphans = []
for a in assets:
    names, files = parts(a)
    # A bare filename counts too: some art is loaded by path, not by id.
    if any(n in blob for n in names):
        continue
    if any(os.path.basename(f) in blob for f in files):
        continue
    size = 0
    for f in files:
        p = os.path.join(ROOT, "art", "v3", f)
        if os.path.exists(p):
            size += os.path.getsize(p)
    orphans.append((size, str(a["id"]), len(files)))

orphans.sort(reverse=True)
total = sum(s for s, _, _ in orphans)
print("%d of %d registered assets are referenced by nothing" % (len(orphans), len(assets)))
print("%.2f MB on disk" % (total / 1048576.0))
for size, aid, nfiles in orphans:
    print("  %7.2f MB  %-36s (%d file%s)" % (size / 1048576.0, aid, nfiles,
                                             "" if nfiles == 1 else "s"))
