#!/usr/bin/env bash
# Stop hook: once per session, before Claude finishes, make it check
# mistakes.md for anything worth recording so it doesn't get repeated.
#
# Fires on every Stop event (including /clear, /resume, compaction), but a
# per-session sentinel file means it only actually blocks the FIRST time —
# after that it exits silently so normal turns are not slowed down.
set -euo pipefail

INPUT="$(cat)"
SESSION_ID="$(printf '%s' "$INPUT" | jq -r '.session_id // "unknown"')"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SENTINEL_DIR="/tmp/claude-mistakes-check/$(basename "$REPO_ROOT")"
mkdir -p "$SENTINEL_DIR"
SENTINEL="$SENTINEL_DIR/$SESSION_ID"

if [ -e "$SENTINEL" ]; then
  exit 0
fi
touch "$SENTINEL"

jq -n --arg path "$REPO_ROOT/mistakes.md" '
{
  decision: "block",
  reason: (
    "Before finishing this session: open " + $path + ". If this session " +
    "found or caused a mistake worth remembering — a wrong assumption, a " +
    "bug shipped and caught, a process slip, something that cost real " +
    "time — and it is not already listed, append ONE entry: what went " +
    "wrong, how it was caught, and the fix or rule that prevents it next " +
    "time. If nothing new happened this session, or it is already " +
    "covered, say so in one line and then finish normally. This check " +
    "runs once per session only — it will not block again after this."
  )
}'
