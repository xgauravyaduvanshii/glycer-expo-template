#!/bin/bash
# Start dev server with env vars from .env.local exported to shell
# This ensures EXPO_PUBLIC_* vars are baked into the bundle

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Source .env.local and export all EXPO_PUBLIC_* vars
if [ -f "$PROJECT_DIR/.env.local" ]; then
  echo "Loading environment from .env.local..."
  set -a  # Auto-export all variables
  source "$PROJECT_DIR/.env.local"
  set +a
  echo "EXPO_PUBLIC_PROJECT_ID=$EXPO_PUBLIC_PROJECT_ID"
  echo "EXPO_PUBLIC_SESSION_TOKEN=${EXPO_PUBLIC_SESSION_TOKEN:0:10}..."
fi

# Start the dev server
cd "$PROJECT_DIR"
PORT="${PORT:-3000}"
export PORT
exec node scripts/start-tunnel.mjs "$@"
