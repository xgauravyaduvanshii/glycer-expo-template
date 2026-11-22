#!/bin/bash
# Start dev server with env vars from .env.local exported to shell
# This ensures EXPO_PUBLIC_* vars are baked into the bundle

# Trusted helpers are immutable; application state is always in the workspace.
SCRIPT_DIR="/opt/glycer-runtime/scripts"
PROJECT_DIR="/glycer"
cd "$PROJECT_DIR" || exit 1

# Source .env.local and export all EXPO_PUBLIC_* vars
if [ -f "$PROJECT_DIR/.env.local" ]; then
  echo "Loading environment from .env.local..."
  set -a  # Auto-export all variables
  source "$PROJECT_DIR/.env.local"
  set +a
fi

# Start the dev server
cd "$PROJECT_DIR"
PORT="${PORT:-3000}"
export PORT

# The sandbox image boots a dev server already (startup.sh keeps one running with an
# auto-restart loop). A second instance loses the port race and buries the real error, so
# hand the request back to the instance that is already serving.
if node -e "
const net = require('net');
const socket = net.connect(process.env.PORT, '127.0.0.1');
socket.on('connect', () => { socket.end(); process.exit(0); });
socket.on('error', () => process.exit(1));
socket.setTimeout(1500, () => { socket.destroy(); process.exit(1); });
"; then
  echo "Dev server is already listening on port ${PORT} - reusing it."
  exit 0
fi

exec node "$SCRIPT_DIR/start-tunnel.mjs" "$@"
