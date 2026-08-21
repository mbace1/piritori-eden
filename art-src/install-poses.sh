#!/usr/bin/env bash
# install-poses.sh — stage approved/poses/ where the Godot port can load them.
#
# PRE-APPROVAL STAGING. The proper home for these is art/v3/manifest.json as an
# animation-set per role, after which tools/sync-data.mjs copies them like every
# other registered asset. Registration is the owner's approval step, so until
# then this puts them in data/art/ directly — which is git-ignored and derived,
# exactly like the rest of data/.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEST="$HERE/../godot/data/art/animation"
n=0
for f in "$HERE"/approved/cast/*.webp; do
  base="$(basename "$f" .webp)"
  role="${base%%-*}"
  pose="${base#*-}"
  mkdir -p "$DEST/$role"
  cp "$f" "$DEST/$role/$pose-frame00.webp"
  n=$((n+1))
done
echo "staged $n poses into data/art/animation/"
