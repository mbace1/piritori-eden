#!/usr/bin/env bash
# install-poses.sh — stage approved/poses/ where the Godot port can load them.
#
# PRE-APPROVAL STAGING. The proper home for these is art/v3/manifest.json as an
# animation-set per role, after which tools/sync-data.mjs copies them like every
# other registered asset. Registration is the owner's approval step.
#
# They stage to data/art/CAST/, never to data/art/animation/. Writing them over
# the registered runner art made the synced copy differ from art/v3 and
# sync-data.mjs --check reported drift — correctly. Canon stays byte-identical
# to its source; the candidate sits beside it and PoseArt prefers it.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEST="$HERE/../godot/data/art/cast"
n=0
for f in "$HERE"/approved/cast/*.webp; do
  base="$(basename "$f" .webp)"
  role="${base%%-*}"
  pose="${base#*-}"
  mkdir -p "$DEST/$role"
  cp "$f" "$DEST/$role/$pose-frame00.webp"
  n=$((n+1))
done
echo "staged $n poses into data/art/cast/"
