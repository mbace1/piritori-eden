#!/usr/bin/env bash
# export-web.sh — build the browser version of the Godot port.
#
#   ./tools/export-web.sh                 build into ../../piritori-godot/
#   ./tools/export-web.sh --serve         build, then serve it on :8765
#
# Requires the Godot WEB export templates for the matching version. They are not
# in the repo (1.2GB for all platforms; only ~40MB of it is web):
#
#   curl -sSL -o t.tpz https://github.com/godotengine/godot/releases/download/4.7.2-stable/Godot_v4.7.2-stable_export_templates.tpz
#   unzip -q t.tpz && cp templates/web_*.zip templates/version.txt \
#     "$HOME/AppData/Roaming/Godot/export_templates/4.7.2.stable/"
#
# THREADS ARE OFF, and that is not a preference. Godot's web export wants
# SharedArrayBuffer for threads, which requires the COOP and COEP response
# headers. GitHub Pages serves static files and cannot set headers, so a
# threaded build loads to a black screen there with nothing but a console error.
# export_presets.cfg sets variant/thread_support=false; verify_single_threaded()
# below checks the built wasm rather than trusting the setting.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT="$(cd "$HERE/.." && pwd)"
OUT="$(cd "$PROJECT/../.." && pwd)/piritori-godot"

GODOT="${GODOT:-godot}"
command -v "$GODOT" >/dev/null 2>&1 || {
  echo "export-web: '$GODOT' not on PATH. Set GODOT=/path/to/godot" >&2
  exit 1
}

echo "== canon seams =="
( cd "$PROJECT" && node tools/sync-data.mjs && node tools/build-map-geometry.mjs )

echo "== export =="
mkdir -p "$OUT"
( cd "$PROJECT" && "$GODOT" --headless --path . --export-release "Web" "$OUT/index.html" )

echo "== verify =="
# A threaded build carries pthread and atomics; a single-threaded one does not.
# The setting can be right and the template still wrong, so check the artefact.
if grep -qa "pthread" "$OUT/index.wasm"; then
  echo "  FAIL: the wasm is THREADED — it will not run on GitHub Pages." >&2
  echo "  Check variant/thread_support in export_presets.cfg." >&2
  exit 1
fi
echo "  single-threaded: ok"

for f in index.html index.js index.wasm index.pck; do
  [ -s "$OUT/$f" ] || { echo "  FAIL: missing $f" >&2; exit 1; }
done
du -sh "$OUT" | sed 's/^/  on disk: /'

if [ "${1:-}" = "--serve" ]; then
  echo "== serving http://127.0.0.1:8765 =="
  cd "$OUT" && python -m http.server 8765 --bind 127.0.0.1
fi
