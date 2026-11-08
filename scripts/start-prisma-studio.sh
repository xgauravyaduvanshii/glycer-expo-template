#!/bin/bash
# Prisma Studio starter script with auto-restart
# Logs are saved to /vibe0/prisma_logs.txt
# Runs Prisma Studio on port 5555

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$PROJECT_DIR/prisma_logs.txt"

cd "$PROJECT_DIR"

echo "=========================================="
echo "Starting Prisma Studio on port 5555"
echo "Logs saved to: $LOG_FILE"
echo "=========================================="

# Check if schema exists
if [ ! -f "$PROJECT_DIR/backend/prisma/schema.prisma" ]; then
  echo "ERROR: backend/prisma/schema.prisma not found" | tee "$LOG_FILE"
  echo "Please create the Prisma schema first" | tee -a "$LOG_FILE"
  exit 1
fi

# Initialize log file with timestamp
echo "=== Prisma Studio Started: $(date -Iseconds) ===" > "$LOG_FILE"
echo "" >> "$LOG_FILE"

# Check if database exists
if [ ! -f "$PROJECT_DIR/backend/prisma/dev.db" ]; then
  echo "[$(date -Iseconds)] Database not found. Running db:push to create it..." | tee -a "$LOG_FILE"
  bun run db:push 2>&1 | tee -a "$LOG_FILE"
fi

# Start Prisma Studio with auto-restart
while true; do
  echo "[$(date -Iseconds)] Starting Prisma Studio..." | tee -a "$LOG_FILE"
  bun run db:studio 2>&1 | tee -a "$LOG_FILE" || true
  echo "[$(date -Iseconds)] Prisma Studio stopped. Restarting in 3 seconds..." | tee -a "$LOG_FILE"
  sleep 3
done
