#!/bin/bash
# HomeMatch iOS Simulator Launch Script
# Handles code signing + Metro startup for the simulator

set -e

SIMULATOR_UUID="29C619C3-365D-4094-BA6B-9D0BC3B65D30"
BUNDLE_ID="com.homematch.app"
MOBILE_DIR="$(cd "$(dirname "$0")/mobile" && pwd)"

echo "🏠 HomeMatch iOS Simulator Launcher"
echo "=================================="

# Find the installed app
APP_PATH=$(find ~/Library/Developer/CoreSimulator/Devices/$SIMULATOR_UUID/data/Containers/Bundle/Application -name "HomeMatch.app" -maxdepth 2 2>/dev/null | head -1)

if [ -z "$APP_PATH" ]; then
  echo "❌ HomeMatch not installed on simulator. Run 'expo run:ios' first."
  exit 1
fi
echo "📦 App: $APP_PATH"

# Generate EXConstants if needed
CONSTANTS_PKG="$MOBILE_DIR/node_modules/expo-constants"
if [ ! -f "$APP_PATH/EXConstants.bundle/app.config" ]; then
  echo "⚙️  Generating EXConstants..."
  mkdir -p "$APP_PATH/EXConstants.bundle"
  NODE_ENV=development node "$CONSTANTS_PKG/scripts/getAppConfig.js" "$MOBILE_DIR" "$APP_PATH/EXConstants.bundle" 2>/dev/null || true
fi

# Sign all dylibs and frameworks
echo "🔐 Signing app bundle..."
find "$APP_PATH" \( -name "*.dylib" -o -name "*.framework" \) | while read f; do
  codesign --force --sign - "$f" 2>/dev/null || true
done
codesign --force --sign - "$APP_PATH/HomeMatch" 2>/dev/null || true
codesign --force --sign - "$APP_PATH" 2>/dev/null || true

# Boot simulator
echo "📱 Booting simulator..."
xcrun simctl boot $SIMULATOR_UUID 2>/dev/null || true
open -a Simulator 2>/dev/null || true
sleep 2

# Start Metro
echo "🚀 Starting Metro bundler on port 8081..."
lsof -ti tcp:8081 | xargs kill -9 2>/dev/null || true
sleep 1
cd "$MOBILE_DIR"
EXPO_NO_TELEMETRY=1 node node_modules/.bin/expo start --port 8081 > /tmp/metro.log 2>&1 &
METRO_PID=$!
echo "Metro PID: $METRO_PID"
sleep 5

# Launch app
echo "▶️  Launching HomeMatch..."
xcrun simctl launch $SIMULATOR_UUID $BUNDLE_ID

echo "✅ HomeMatch launched! Check the simulator."
echo "   Metro log: tail -f /tmp/metro.log"
