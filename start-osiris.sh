#!/usr/bin/env bash
set -e

OSIRIS_DIR="$(cd "$(dirname "$0")" && pwd)"
PID_FILE="$OSIRIS_DIR/.server.pid"
LOG_FILE="$OSIRIS_DIR/.server.log"
DAEMON=false
[[ "$1" == "--daemon" ]] && DAEMON=true

cleanup() {
  echo "[OSIRIS] Arresto del server in corso..."
  if [ -f "$PID_FILE" ]; then
    kill "$(cat "$PID_FILE")" 2>/dev/null || true
    rm -f "$PID_FILE"
  fi
  lsof -ti:3000 2>/dev/null | xargs kill 2>/dev/null || true
  echo "[OSIRIS] Server arrestato."
  exit 0
}

trap cleanup SIGINT SIGTERM SIGHUP

lsof -ti:3000 2>/dev/null | xargs kill 2>/dev/null || true
rm -f "$PID_FILE"

cd "$OSIRIS_DIR"
npx next dev -p 3000 -H 127.0.0.1 > "$LOG_FILE" 2>&1 &
SERVER_PID=$!
echo $SERVER_PID > "$PID_FILE"

for i in $(seq 1 30); do
  if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "[OSIRIS] Server pronto su http://localhost:3000"
    break
  fi
  if ! kill -0 $SERVER_PID 2>/dev/null; then
    echo "[OSIRIS] ERRORE: Il server non si è avviato. Log:"
    cat "$LOG_FILE"
    cleanup
    exit 1
  fi
  sleep 1
done

if $DAEMON; then
  # Modalità daemon: non apre browser, non aspetta input
  echo "[OSIRIS] In esecuzione in background (PID $SERVER_PID)"
else
  xdg-open http://localhost:3000 2>/dev/null || true
  echo "[OSIRIS] Premi Ctrl+C per arrestare il server e chiudere."
  wait $SERVER_PID 2>/dev/null || true
  cleanup
fi
