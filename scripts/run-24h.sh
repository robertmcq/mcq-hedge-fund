#!/usr/bin/env bash
# 24-hour unattended run script.
# Starts the full Docker stack, tails logs, and runs the healthcheck monitor.
# Usage: bash scripts/run-24h.sh

set -euo pipefail

LOG_DIR="./logs"
mkdir -p "$LOG_DIR"

START_TIME=$(date -u +%FT%TZ)
echo "[run-24h] Starting at ${START_TIME}"

# 1. Pull latest image (if available) and start stack
echo "[run-24h] Bringing up Docker stack..."
docker compose up -d --build 2>&1 | tee "${LOG_DIR}/compose-startup.log"

# 2. Wait for API health
echo "[run-24h] Waiting for API to become healthy..."
for i in $(seq 1 30); do
  STATUS=$(curl -sf --max-time 5 http://localhost:3000/api/health 2>/dev/null | grep -c '"ok":true' || true)
  if [ "$STATUS" -ge 1 ]; then
    echo "[run-24h] API healthy after ${i} attempts"
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "[run-24h] API failed to start. Check logs:"
    docker compose logs api | tail -50
    exit 1
  fi
  sleep 5
done

# 3. Seed the portfolio store
echo "[run-24h] Seeding portfolio..."
docker compose exec api node dist/scripts/seed-portfolio.js 2>&1 | tee "${LOG_DIR}/seed.log" || true

# 4. Start healthcheck monitor in background
echo "[run-24h] Starting 24h healthcheck monitor..."
bash scripts/healthcheck.sh localhost 3000 >> "${LOG_DIR}/healthcheck.log" 2>&1 &
HC_PID=$!
echo "[run-24h] Healthcheck PID=${HC_PID}"

# 5. Tail container logs
echo "[run-24h] Tailing logs (Ctrl+C to detach, stack stays running)..."
docker compose logs -f api 2>&1 | tee "${LOG_DIR}/api-$(date +%Y%m%d-%H%M%S).log"

echo "[run-24h] Log tail ended. Stack is still running."
echo "[run-24h] To stop: docker compose down"
echo "[run-24h] To check health: bash scripts/healthcheck.sh"
