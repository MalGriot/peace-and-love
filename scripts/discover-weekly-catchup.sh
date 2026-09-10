#!/bin/bash
# Catch-up check for the Discover Weekly refresh, meant to be called from a
# Claude Code SessionStart hook. The weekly launchd job (see
# com.malgriot.discoverweekly.plist) only fires if the Mac is awake at
# Tuesday 9am local time; if it was asleep/off, the scheduled fire is just
# skipped (launchd doesn't queue missed StartCalendarInterval runs). This
# script covers that gap: on every Claude Code launch, if more than ~8 days
# have passed since the last successful refresh, kick one off in the
# background so it can't be missed indefinitely, without ever blocking or
# slowing down Claude's own startup.
STATE_DIR="$HOME/.griot-discover-weekly"
LAST_RUN_FILE="$STATE_DIR/last-run"
REFRESH_SCRIPT="/Users/malcolm/Documents/CLAUDE-CODE/MAL GRIOT TRIFOLD WEBSITE/scripts/run-discover-weekly-refresh.sh"
MAX_AGE_SECONDS=$((8 * 24 * 60 * 60))

mkdir -p "$STATE_DIR"

now=$(date -u +%s)
last_run=0
if [ -f "$LAST_RUN_FILE" ]; then
  last_run=$(cat "$LAST_RUN_FILE" 2>/dev/null || echo 0)
fi

age=$((now - last_run))
if [ "$age" -ge "$MAX_AGE_SECONDS" ]; then
  nohup /bin/bash "$REFRESH_SCRIPT" >/dev/null 2>&1 &
fi

exit 0
