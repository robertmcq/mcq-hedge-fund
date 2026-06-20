#!/usr/bin/env bash
# Polls /api/health every 30s and logs status.
# Usage: bash scripts/healthcheck.sh [host] [port]
# Designed for 24-hour unattended monitoring.

HOST=${1:-localhost}
PORT=${2:-3000}
URL="http://${HOST}:${PORT}/api/health"
INTERVAL=30
FAIL_COUNT=0
MAX_FAILS=5

echo "[healthcheck] Starting — polling ${URL} every ${INTERVAL}s"
echo "[healthcheck] Max consecutive failures before alert: ${MAX_FAILS}"

while true; do
  RESPONSE=$(curl -sf --max-time 8 "${URL}" 2>&1)
  STATUS=$?

  if [ $STATUS -eq 0 ]; then
    UPTIME=$(echo "$RESPONSE" | grep -o '"uptime_s":[0-9.]*' | cut -d: -f2)
    echo "[$(date -u +%FT%TZ)] OK  uptime=${UPTIME}s"
    FAIL_COUNT=0
  else
    FAIL_COUNT=$((FAIL_COUNT + 1))
    echo "[$(date -u +%FT%TZ)] FAIL  consecutive=${FAIL_COUNT}  response=${RESPONSE}"
    if [ $FAIL_COUNT -ge $MAX_FAILS ]; then
      echo "[$(date -u +%FT%TZ)] ALERT: ${MAX_FAILS} consecutive failures — investigate immediately"
      # Hook: add PagerDuty / Slack webhook call here
      FAIL_COUNT=0
    fi
  fi

  sleep $INTERVAL
done
