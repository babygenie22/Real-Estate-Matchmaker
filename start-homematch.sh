#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
#  HomeMatch iOS Simulator Launcher
#  Uses port 8050 to avoid conflicts with other Expo apps
# ─────────────────────────────────────────────────────────────

set -e

PORT=8050
SIM_UUID="29C619C3-365D-4094-BA6B-9D0BC3B65D30"
APP_BUNDLE="com.homematch.app"
MOBILE_DIR="$(cd "$(dirname "$0")/mobile" && pwd)"

echo "🏠 HomeMatch Dev Launcher"
echo "─────────────────────────────────────"

# ── 1. Check / clear port 8050 ──────────────────────────────
PIDS_ON_PORT=$(lsof -ti ":$PORT" 2>/dev/null || true)
if [ -n "$PIDS_ON_PORT" ]; then
  echo "⚠️  Port $PORT is in use by PID(s): $PIDS_ON_PORT — killing them..."
  echo "$PIDS_ON_PORT" | xargs kill -9 2>/dev/null || true
  sleep 1
  echo "   ✓ Port $PORT is now free"
else
  echo "✓ Port $PORT is free"
fi

# ── 2. Check / clear port 8081 (rabbithole & other Expo apps) ─
OTHER_PIDS=$(lsof -ti ":8081" 2>/dev/null || true)
if [ -n "$OTHER_PIDS" ]; then
  echo "⚠️  Found process on port 8081 (another Metro?) — killing PID(s): $OTHER_PIDS"
  echo "$OTHER_PIDS" | xargs kill -9 2>/dev/null || true
  sleep 1
  echo "   ✓ Port 8081 cleared"
fi

# ── 3. Clear Metro cache ─────────────────────────────────────
echo "🧹 Clearing Metro cache..."
rm -rf /var/folders/wp/*/T/metro-cache 2>/dev/null || true

# ── 4. Boot simulator if needed ─────────────────────────────
SIM_STATE=$(xcrun simctl list devices | grep "$SIM_UUID" | grep -o "(.*)" | tr -d '()')
if [ "$SIM_STATE" = "Shutdown" ]; then
  echo "📱 Booting iPhone 15 Pro simulator..."
  xcrun simctl boot "$SIM_UUID"
  sleep 4
  open -a Simulator
  sleep 3
else
  echo "✓ Simulator already running ($SIM_STATE)"
  open -a Simulator 2>/dev/null || true
fi

# ── 5. Point app to port 8050 ────────────────────────────────
echo "🔌 Setting Metro port to $PORT for $APP_BUNDLE..."
xcrun simctl spawn "$SIM_UUID" defaults write "$APP_BUNDLE" RCT_jsLocation "localhost:$PORT" 2>/dev/null || true

# ── 6. Start Metro on port 8050 ─────────────────────────────
echo ""
echo "🚀 Starting HomeMatch Metro on port $PORT..."
echo "   (Ctrl+C to stop)"
echo "─────────────────────────────────────"
cd "$MOBILE_DIR"
npx expo start --reset-cache --port "$PORT"
