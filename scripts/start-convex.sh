#!/bin/bash
# Start Convex in agent mode with dashboard and API proxy
# Logs are saved to /glycer/convex_logs.txt

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$PROJECT_DIR/convex_logs.txt"

cd "$PROJECT_DIR"

# Read project ID from .env.local
PROJECT_ID=$(grep EXPO_PUBLIC_PROJECT_ID .env.local | cut -d'=' -f2)

if [ -z "$PROJECT_ID" ]; then
  echo "ERROR: EXPO_PUBLIC_PROJECT_ID not found in .env.local" | tee "$LOG_FILE"
  exit 1
fi

echo "=========================================="  | tee "$LOG_FILE"
echo "Starting Convex in agent mode"           | tee -a "$LOG_FILE"
echo "Project ID: $PROJECT_ID"                 | tee -a "$LOG_FILE"
echo "=========================================="  | tee -a "$LOG_FILE"

# Patch dashboard if not already patched
if [ -d ~/.cache/convex/dashboard/out ]; then
  if grep -q "127.0.0.1:6791" ~/.cache/convex/dashboard/out/index.html 2>/dev/null; then
    echo "Patching Convex dashboard for remote access..." | tee -a "$LOG_FILE"
    cd ~/.cache/convex/dashboard/out
    find . -name "*.js" -o -name "*.html" | xargs sed -i "s|http://127.0.0.1:6791|https://6792-${PROJECT_ID}.e2b.app|g"
    cd "$PROJECT_DIR"
    echo "Dashboard patched" | tee -a "$LOG_FILE"
  fi
fi

# Start Convex dev server
echo "[$(date -Iseconds)] Starting Convex dev server..." | tee -a "$LOG_FILE"
CONVEX_AGENT_MODE=anonymous npx convex dev 2>&1 | tee -a "$LOG_FILE" &
CONVEX_PID=$!

# Wait for Convex to start
echo "Waiting for Convex to start..." | tee -a "$LOG_FILE"
sleep 10

# Start API proxy
echo "[$(date -Iseconds)] Starting Convex API proxy on port 6792..." | tee -a "$LOG_FILE"
node scripts/convex-api-proxy.js 2>&1 | tee -a "$LOG_FILE" &
PROXY_PID=$!

echo "" | tee -a "$LOG_FILE"
echo "=========================================="  | tee -a "$LOG_FILE"
echo "Convex is running!"                       | tee -a "$LOG_FILE"
echo "Dashboard:    https://6790-${PROJECT_ID}.e2b.app" | tee -a "$LOG_FILE"
echo "Backend API:  https://3210-${PROJECT_ID}.e2b.app" | tee -a "$LOG_FILE"
echo "HTTP Actions: https://3211-${PROJECT_ID}.e2b.app" | tee -a "$LOG_FILE"
echo "API Proxy:    https://6792-${PROJECT_ID}.e2b.app" | tee -a "$LOG_FILE"
echo "Logs:         /glycer/convex_logs.txt"             | tee -a "$LOG_FILE"
echo "=========================================="  | tee -a "$LOG_FILE"

# Wait for processes
wait $CONVEX_PID $PROXY_PID
