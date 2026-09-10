#!/bin/bash
# Runs the Discover Weekly playlist refresh (about.html) via a headless,
# non-interactive Claude Code invocation with real internet access - unlike
# the cloud routine equivalent, which is sandboxed and can't reach Spotify
# or YouTube. Invoked weekly by launchd (see com.malgriot.discoverweekly.plist)
# and, as a catch-up, by the SessionStart hook if a scheduled run was missed
# (e.g. the machine was asleep) - see discover-weekly-catchup.sh.
set -uo pipefail

REPO_DIR="/Users/malcolm/Documents/CLAUDE-CODE/MAL GRIOT TRIFOLD WEBSITE"
CLAUDE_BIN="/Users/malcolm/.local/bin/claude"
STATE_DIR="$HOME/.griot-discover-weekly"
LOCK_DIR="$STATE_DIR/run.lock.d"
LAST_RUN_FILE="$STATE_DIR/last-run"
LOG_FILE="$STATE_DIR/run.log"
PROMPT_FILE="$REPO_DIR/scripts/discover-weekly-prompt.txt"

mkdir -p "$STATE_DIR"

# Avoid overlapping runs (e.g. launchd fires while a catch-up run from
# SessionStart is still going). mkdir is atomic, so this is a portable lock
# with no dependency on flock (not on macOS by default).
if ! mkdir "$LOCK_DIR" 2>/dev/null; then
  echo "$(date -u +%FT%TZ) skipped: another run already in progress" >> "$LOG_FILE"
  exit 0
fi
trap 'rmdir "$LOCK_DIR" 2>/dev/null' EXIT

echo "$(date -u +%FT%TZ) starting Discover Weekly refresh" >> "$LOG_FILE"

cd "$REPO_DIR" || exit 1

"$CLAUDE_BIN" -p "$(cat "$PROMPT_FILE")" \
  --permission-mode bypassPermissions \
  --allowedTools "Bash Read Write Edit Glob Grep" \
  >> "$LOG_FILE" 2>&1

status=$?
echo "$(date -u +%FT%TZ) finished with exit code $status" >> "$LOG_FILE"

if [ $status -eq 0 ]; then
  date -u +%s > "$LAST_RUN_FILE"
fi

exit $status
