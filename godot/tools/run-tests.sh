#!/usr/bin/env bash
# Runs every headless gate under a timeout, so a scene that never loads (a
# parse error, a bad preload) times out with a NAMED failure instead of
# hanging silently until something external kills it.
#
# QUEUE.md: "A test scene with a parse error HANGS, it does not fail" —
# test_shell.gd once called a missing eq() helper, which is a parse error,
# and every scene here only quits from inside its own script. A scene that
# never starts never reaches its own quit(), so the run sat for 6m40s before
# being killed with no useful message. A shell-level timeout is the fix
# that actually applies: the parse error is IN the script that would have to
# run a watchdog, so nothing inside that file can rescue the run.
#
# Also forces an import pass before running anything. `.translation` files
# (locale/*.translation) are gitignored, editor-generated artifacts — Godot
# only rebuilds them from locale/ui.csv when the EDITOR opens the project.
# A checkout that pulled a `ui.csv` content change without ever opening the
# editor keeps the OLD compiled translations, and `--headless` silently uses
# them: found 2026-08-28 when test_locale/test_shell failed on two keys
# (cmd.city, cmd.messages) that `tools/check-locale.mjs` — which reads the
# CSV directly, not the compiled resource — already confirmed were fine.
# Every one of those failures vanished after one `--editor --quit-after`
# pass. Skip with PIRITORI_TEST_NO_IMPORT=1 if you already know it's fresh
# and want the couple of seconds back.
#
# CAVEAT, found running this against a Godot binary older than the README's
# declared 4.7.2: a full import pass can rewrite TRACKED `.import` files too
# (not just the gitignored `.translation` ones), and a different engine
# version writes different default params into them — two font `.import`
# files and `ui.csv.import` each lost two lines that are Godot-version
# defaults, not real changes. `git status` after running this; if anything
# under `.import` shows a diff and you are not ON 4.7.2, discard it
# (`git checkout -- <file>`) rather than committing engine-version drift.
#
# Usage:
#   godot/tools/run-tests.sh                 # all gates, default godot binary
#   GODOT=/path/to/godot godot/tools/run-tests.sh
#   godot/tools/run-tests.sh test_battle test_shell   # a subset, by name

set -u
cd "$(dirname "$0")/.."

GODOT="${GODOT:-godot}"
TIMEOUT_S="${PIRITORI_TEST_TIMEOUT:-90}"
IMPORT_TIMEOUT_S="${PIRITORI_IMPORT_TIMEOUT:-60}"

if [ "${PIRITORI_TEST_NO_IMPORT:-0}" != "1" ]; then
	echo "=== import pass (regenerating gitignored .translation/.import artifacts) ==="
	if ! timeout "${IMPORT_TIMEOUT_S}" "$GODOT" --headless --path . --editor --quit-after 2; then
		echo "WARNING: import pass failed or timed out — gates below may fail on stale artifacts, not real regressions."
	fi
	echo
fi

ALL_TESTS=(test_spine test_shell test_locale test_battle test_battle_ui test_playthrough)
TESTS=("$@")
if [ ${#TESTS[@]} -eq 0 ]; then
	TESTS=("${ALL_TESTS[@]}")
fi

fail=0
for t in "${TESTS[@]}"; do
	echo "=== $t ==="
	if timeout "${TIMEOUT_S}" "$GODOT" --headless --path . "res://tests/${t}.tscn"; then
		:
	else
		code=$?
		if [ "$code" -eq 124 ]; then
			echo "TIMEOUT: $t did not quit within ${TIMEOUT_S}s — likely a parse error or a hang, not a slow pass. Run it alone without --headless to see why."
		else
			echo "FAIL: $t exited $code"
		fi
		fail=1
	fi
	echo
done

if [ "$fail" -ne 0 ]; then
	echo "run-tests: at least one gate failed or timed out."
	exit 1
fi
echo "run-tests: all gates passed."
