#!/bin/bash
# Start backend server with auto-restart on crash
# Logs are saved to /glycer/backend_logs.txt

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$PROJECT_DIR/backend_logs.txt"

cd "$PROJECT_DIR"

# Check if backend exists
if [ ! -f "$PROJECT_DIR/backend/hono.ts" ]; then
  echo "ERROR: backend/hono.ts not found"
  echo "Create the backend files first using the setup guide"
  exit 1
fi

# Initialize log file with timestamp
echo "=== Backend Server Started: $(date -Iseconds) ===" > "$LOG_FILE"
echo "" >> "$LOG_FILE"

echo "Starting backend server on port 5000 with auto-restart..."
echo "Logs saved to: $LOG_FILE"

while true; do
  echo "[$(date -Iseconds)] Starting backend server..." | tee -a "$LOG_FILE"

  # Run backend and capture output to both console and log file
  bun run backend 2>&1 | tee -a "$LOG_FILE" || true

  echo "[$(date -Iseconds)] Backend server stopped. Restarting in 3 seconds..." | tee -a "$LOG_FILE"
  sleep 3
done
