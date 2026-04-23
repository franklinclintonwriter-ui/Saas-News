#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${PROD_APP_DIR:-/home/apiphulpur/app}"
APP_USER="${PROD_APP_USER:-apiphulpur}"
API_SERVICE="${PROD_API_SERVICE:-phulpur-api.service}"

echo "[deploy] APP_DIR=$APP_DIR"
echo "[deploy] APP_USER=$APP_USER"
echo "[deploy] API_SERVICE=$API_SERVICE"

if [[ ! -d "$APP_DIR" ]]; then
  echo "App directory not found: $APP_DIR" >&2
  exit 1
fi

run_as_app_user() {
  local cmd="$1"
  if [[ "$(id -un)" == "$APP_USER" ]]; then
    bash -lc "$cmd"
    return
  fi
  if id "$APP_USER" >/dev/null 2>&1; then
    su -s /bin/bash "$APP_USER" -c "$cmd"
  else
    bash -lc "$cmd"
  fi
}

if id "$APP_USER" >/dev/null 2>&1; then
  chown -R "$APP_USER:$APP_USER" "$APP_DIR"
fi

# Keep full dependencies because prisma CLI is required by prisma:generate.
run_as_app_user "cd '$APP_DIR' && npm ci"
run_as_app_user "cd '$APP_DIR' && npm run prisma:generate"
run_as_app_user "cd '$APP_DIR' && npm run prisma:push"

wait_for_api_recovery() {
  local attempts=15
  local sleep_seconds=2
  for i in $(seq 1 "$attempts"); do
    if command -v systemctl >/dev/null 2>&1; then
      if systemctl is-active "$API_SERVICE" >/dev/null 2>&1; then
        return 0
      fi
    fi
    if pgrep -f "api/src/server.ts|npm run api:start" >/dev/null 2>&1; then
      return 0
    fi
    sleep "$sleep_seconds"
  done
  return 1
}

if command -v sudo >/dev/null 2>&1; then
  if sudo -n systemctl restart "$API_SERVICE" >/dev/null 2>&1; then
    sudo -n systemctl is-active "$API_SERVICE"
    sudo -n systemctl status "$API_SERVICE" --no-pager -n 25
  else
    # Fallback for password-protected sudo: restart by terminating the app process.
    # phulpur-api.service has Restart=always and runs as APP_USER, so it auto-recovers.
    pkill -f "api/src/server.ts|npm run api:start" || true
    if ! wait_for_api_recovery; then
      echo "API process did not recover after fallback restart." >&2
      exit 1
    fi
  fi
else
  pkill -f "api/src/server.ts|npm run api:start" || true
  if ! wait_for_api_recovery; then
    echo "API process did not recover after non-sudo restart fallback." >&2
    exit 1
  fi
fi
