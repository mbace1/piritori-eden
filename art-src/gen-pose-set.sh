#!/usr/bin/env bash
# gen-pose-set.sh — generate one role's whole-figure pose set.
#
# Follows piritori/art-src/NANO_BANANA.md: the magenta rule (§2) and block C
# (§3), the approved runner poses as the style anchor, and the role's approved
# modular torso/legs as the clothing reference. Output is keyed and trimmed with
# kindling/tools/cut.mjs, exactly as §5.2 and §8 describe.
#
# Deliberately NOT following §6.6's cyan joint dots: the model draws them as
# glowing orbs rather than flat dots, cut.mjs then erases only their cores, and
# widening the key eats teal clothing. Whole-figure 2D sprites need no joints.
#
#   ./gen-pose-set.sh muscle
#   ./gen-pose-set.sh muscle guard strike      # just these poses
#
# Writes work/poses/<role>-<pose>-raw.png and approved/poses/<role>-<pose>.png
set -uo pipefail

ROLE="${1:?usage: gen-pose-set.sh <role> [pose...]}"
shift || true

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$HERE/../.." && pwd)"
NB="$HOME/.nano-banana/nb.sh"
CUT="$REPO/kindling/tools/cut.mjs"
ART="$REPO/piritori/godot/data/art"
export NODE_PATH="$(npm root -g)"

mkdir -p "$HERE/work/poses" "$HERE/approved/poses"

# ── who each role is, taken from the APPROVED modular torso and legs art ──
case "$ROLE" in
  muscle)  WHO="a heavy-set man with a blunt face and short fair hair, in a cream-beige padded work jacket with an orange patch on each shoulder, dark teal cargo trousers and tan work boots" ;;
  watcher) WHO="a slim young person with short bleached-blond hair, in a long charcoal-black coat over a magenta polo-neck with a magenta scarf, black trousers and dark boots" ;;
  fixer)   WHO="a stocky man with short dark hair, in a brown leather bomber jacket with a mustard-yellow collar, blue jeans and brown shoes" ;;
  driver)  WHO="a broad man with cropped fair hair, in a dark green work jacket with a grey reflective stripe across the chest, matching green work trousers with a reflective stripe and black shoes" ;;
  local)   WHO="an older woman with short curly grey hair, in a black quilted gilet over plum-magenta sleeves, plum tracksuit trousers and white trainers" ;;
  runner)  WHO="a young person in a teal knitted beanie with dirty-blonde hair falling from under it, a navy blue hooded jacket, a black crossbody satchel bag on a strap, grey cargo trousers with round pocket detail and chunky trainers" ;;
  *) echo "unknown role: $ROLE" >&2; exit 1 ;;
esac

# ── the nine states the fight model can actually be in ──
pose_desc() {
  case "$1" in
    idle-smile)   echo "STANDING AT EASE: weight settled on the back foot, shoulders level, both arms hanging loose at the sides, head up, calm and waiting" ;;
    talk)         echo "TALKING: turned slightly out toward the viewer, one arm raised with the hand open in a small explaining gesture, the other loose, mouth open mid-sentence" ;;
    guard)        echo "ON GUARD: knees bent and weight low, shoulders hunched forward, both fists raised in front of the chest with the elbows tucked in, chin down" ;;
    strike)       echo "MID-STRIKE: weight fully forward over the front foot, back leg trailing straight, torso rotated into the blow, the leading arm extended out past the body at shoulder height, the other fist held back at the ribs" ;;
    hit-light)    echo "TAKING A HIT: recoiling backward, head snapped back and to one side, one arm flung up across the face, still on both feet but off balance" ;;
    downed)       echo "DOWNED: lying collapsed on the ground on one side, one arm folded underneath the body, legs bent, head down, not moving. The whole figure is low and horizontal" ;;
    shaken)       echo "SHAKEN: unsteady and hunched, one hand pressed to the head, the other arm hanging, weight sagging onto one leg, head bowed, badly rattled but upright" ;;
    walk-contact) echo "WALKING, CONTACT FRAME: mid-stride with the leading heel just planted, back leg extended behind, arms swinging in opposition" ;;
    walk-pass)    echo "WALKING, PASSING FRAME: mid-stride with the back leg passing directly under the body, the other foot flat, arms near the sides" ;;
    *) echo "" ;;
  esac
}

POSES=("$@")
if [ ${#POSES[@]} -eq 0 ]; then
  POSES=(idle-smile talk guard strike hit-light downed shaken walk-contact walk-pass)
fi

STYLE_REFS=("$ART/animation/runner/guard-frame00.webp" "$ART/animation/runner/idle-smile-frame00.webp")
CLOTH_REFS=()
[ -f "$ART/characters/torsos/torso-$ROLE-v03.webp" ] && CLOTH_REFS+=("$ART/characters/torsos/torso-$ROLE-v03.webp")
[ -f "$ART/characters/legs/legs-$ROLE-v03.webp" ] && CLOTH_REFS+=("$ART/characters/legs/legs-$ROLE-v03.webp")

ok=0; fail=0
for POSE in "${POSES[@]}"; do
  DESC="$(pose_desc "$POSE")"
  if [ -z "$DESC" ]; then echo "unknown pose: $POSE" >&2; fail=$((fail+1)); continue; fi
  RAW="$HERE/work/poses/$ROLE-$POSE-raw.png"
  OUT="$HERE/approved/poses/$ROLE-$POSE.png"

  printf '  %-14s ' "$POSE"
  "$NB" --images "${STYLE_REFS[@]}" ${CLOTH_REFS[@]+"${CLOTH_REFS[@]}"} --prompt \
"One single figure, full body, three-quarter view facing slightly left, drawn in EXACTLY the art style of the first two reference images.

CHARACTER: $WHO. The remaining reference images show this character's jacket and trousers — copy their colours and cut faithfully. Same body proportions and scale as the figure in the first two references.

STYLE, matching the first two references precisely: hand-inked illustration on cut cardstock, broad flat muted fills carrying visible paper grain and speckle, a hard but hand-drawn black outline that wobbles and varies in pressure, sparse marker detail, softly painterly edges rather than clean vector, and a thin magenta rim-light along the outer contour. Muted practical Finnish street palette. No gradients, no glow, no gloss, no photographic rendering, no cel-shaded highlights.

POSE — $DESC.

Both hands are drawn and visible, simple and blocky. Any weapon is composited in afterwards and must NOT be drawn — the hands hold nothing.

Nothing is added to the figure: no dots, no markers, no registration points, no circles, no spots, no glowing highlights anywhere on the body or clothing.

The background is a completely flat, solid, uniform magenta (#FF00FF) with nothing on it — no gradient, no vignette, no shadow, no texture, no border and no frame. The subject does not touch the edges of the image.

No text, no letters, no numbers, no labels, no captions, no watermark, no logo, no UI chrome, no panel, no card, no drop shadow. Do not present this as a sheet, a poster, a turnaround or a reference board. Just the subject." \
    --aspect-ratio 2:3 --output "$RAW" >/dev/null 2>&1

  if [ ! -f "$RAW" ]; then echo "GENERATE FAILED"; fail=$((fail+1)); continue; fi
  node "$CUT" key "$RAW" "$HERE/work/poses/$ROLE-$POSE-keyed.png" >/dev/null 2>&1 \
    && node "$CUT" trim "$HERE/work/poses/$ROLE-$POSE-keyed.png" "$OUT" --pad 4 >/dev/null 2>&1
  if [ -f "$OUT" ]; then echo "ok"; ok=$((ok+1)); else echo "CUT FAILED"; fail=$((fail+1)); fi
done

echo "  -> $ROLE: $ok ok, $fail failed"
