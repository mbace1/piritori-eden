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

echo "== offline worker =="
# Its OWN worker, scoped to this folder. The arcade's sw.js deliberately does
# not touch a game's directory — "a narrower scope wins the page, so those keep
# controlling themselves" — and putting 33MB of wasm into the hub's shell
# precache would make the front door pay for a game nobody opened.
#
# Cache-first, like gameoflife's: none of these files change between deploys,
# and the VERSION below is derived from the build itself, so a new build is a
# new cache and the old one is simply dropped.
VERSION="$(cd "$OUT" && cat index.wasm index.pck 2>/dev/null | sha1sum | cut -c1-12)"
cat > "$OUT/sw.js" <<SWEOF
// Piritori -> Eden (Godot port), offline.
//
// Cache-first. Every file here is immutable for a given build, and VERSION is a
// hash OF that build — so a new deploy is a new cache name and there is nothing
// to go stale. The engine is ~38MB of wasm; fetching it twice would be rude.
//
// Registered from index.html on https only (or ?sw=1), so local dev and any
// smoke gate are never handed a stale shell — the same rule gameoflife follows.

const VERSION = '${VERSION}';
const CACHE = \`piritori-godot-\${VERSION}\`;

const SHELL = [
  './',
  './index.html',
  './index.js',
  './index.wasm',
  './index.pck',
  './index.audio.worklet.js',
  './index.audio.position.worklet.js',
  './index.icon.png',
  './index.apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key !== CACHE && key.startsWith('piritori-godot-')) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;
  event.respondWith(
    caches.match(event.request).then((hit) => hit || fetch(event.request))
  );
});
SWEOF
echo "  wrote sw.js (build $VERSION)"

# Godot writes index.html itself, so the registration is injected rather than
# living in the preset — head_include would need the whole script escaped into
# a cfg string.
if ! grep -q "serviceWorker" "$OUT/index.html"; then
  python - "$OUT/index.html" <<'PYEOF2'
import io, sys
p = sys.argv[1]
s = io.open(p, encoding='utf-8').read()
reg = """<script>
// https only (or ?sw=1) so local dev and the gates are never served a stale
// shell — the rule every worker in this repo follows.
if ('serviceWorker' in navigator
    && (location.protocol === 'https:' || location.search.includes('sw=1'))) {
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
</script>
</body>"""
s = s.replace('</body>', reg, 1)
io.open(p, 'w', encoding='utf-8', newline='').write(s)
print("  registered sw.js from index.html")
PYEOF2
fi

if [ "${1:-}" = "--serve" ]; then
  echo "== serving http://127.0.0.1:8765 =="
  cd "$OUT" && python -m http.server 8765 --bind 127.0.0.1
fi
