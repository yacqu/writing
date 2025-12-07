#!/bin/bash

# Script to start the writing server in a tmux session
# Handles server status, tmux session management, and browser opening

set -e

SCRIPT_DIR="/Users/yacqubabdirahman/Repos/Tools/writing/scripts"
PROJECT_DIR="/Users/yacqubabdirahman/Repos/Tools/writing"
SESSION_NAME="writing-server"
PORT=3031
HOST="localhost"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "Starting writing server..."

# Check if server is already responding
if curl --silent --max-time 2 "http://${HOST}:${PORT}" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Server is already running on http://${HOST}:${PORT}"
else
    echo "Server not responding, starting it now..."
    
    # Check if tmux session exists
    if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
        echo -e "${YELLOW}!${NC} Tmux session '$SESSION_NAME' exists but server is not responding"
        echo "  Killing existing session and restarting..."
        tmux kill-session -t "$SESSION_NAME"
    fi
    
    # Start server in new tmux session
    tmux new-session -d -s "$SESSION_NAME" -c "$PROJECT_DIR" "npm run start"
    
    # Wait for server to start (max 5 seconds)
    echo -n "Waiting for server to start"
    for i in {1..10}; do
        sleep 0.5
        echo -n "."
        if curl --silent --max-time 1 "http://${HOST}:${PORT}" > /dev/null 2>&1; then
            echo ""
            echo -e "${GREEN}✓${NC} Server started successfully on http://${HOST}:${PORT}"
            break
        fi
        
        if [ $i -eq 10 ]; then
            echo ""
            echo -e "${RED}✗${NC} Server failed to start within 5 seconds"
            echo "  Check logs with: tmux attach -t $SESSION_NAME"
            exit 1
        fi
    done
fi

# Open browser using AppleScript
if [ -f "$SCRIPT_DIR/open-chrome.applescript" ]; then
    echo "Opening browser..."
    osascript "$SCRIPT_DIR/open-chrome.applescript" "http://${HOST}:${PORT}" "${HOST}:${PORT}"
else
    echo -e "${YELLOW}!${NC} Browser script not found at $SCRIPT_DIR/open-chrome.applescript"
fi

echo -e "${GREEN}✓${NC} Done!"
echo ""
echo "Useful commands:"
echo "  - View server logs: tmux attach -t $SESSION_NAME"
echo "  - Stop server: tmux kill-session -t $SESSION_NAME"
echo "  - Detach from tmux: Press Ctrl+B, then D"