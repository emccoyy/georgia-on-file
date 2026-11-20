#!/bin/bash
# Builds "AI Hub.app" so you can open the hub from Launchpad, Spotlight or the Dock.
#
#   bash ~/Desktop/ai-hub/mac/make-app.sh
#
# The app carries its own copy of the hub, so you can delete the ai-hub folder
# afterwards. Your chats and settings live in ~/Library/Application Support/AI Hub.
# Run this again after downloading a newer version of the hub to update the app.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
HUB="$(dirname "$HERE")"
APP_NAME="AI Hub"
SUPPORT="$HOME/Library/Application Support/AI Hub"

DEST_DIR="${AI_HUB_APP_DIR:-/Applications}"
if [ ! -w "$DEST_DIR" ]; then DEST_DIR="$HOME/Applications"; fi
mkdir -p "$DEST_DIR"
APP="$DEST_DIR/$APP_NAME.app"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js isn't installed. Get it from https://nodejs.org, then run this again."
  exit 1
fi

echo "Building $APP ..."
rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources/hub"
cp -R "$HUB/server.mjs" "$HUB/package.json" "$HUB/lib" "$HUB/public" "$APP/Contents/Resources/hub/"

# Keep anything you already set up in the ai-hub folder.
mkdir -p "$SUPPORT"
if [ -f "$HUB/hub.config.json" ] && [ ! -f "$SUPPORT/hub.config.json" ]; then
  cp "$HUB/hub.config.json" "$SUPPORT/hub.config.json"
fi
if [ -d "$HUB/data/conversations" ] && [ ! -d "$SUPPORT/data/conversations" ]; then
  mkdir -p "$SUPPORT/data"
  cp -R "$HUB/data/conversations" "$SUPPORT/data/"
fi

cat > "$APP/Contents/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key><string>AI Hub</string>
  <key>CFBundleDisplayName</key><string>AI Hub</string>
  <key>CFBundleIdentifier</key><string>local.ai-hub</string>
  <key>CFBundleVersion</key><string>1.0</string>
  <key>CFBundleShortVersionString</key><string>1.0</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleExecutable</key><string>AI Hub</string>
  <key>CFBundleIconFile</key><string>AppIcon</string>
  <key>LSMinimumSystemVersion</key><string>11.0</string>
</dict>
</plist>
PLIST

cat > "$APP/Contents/MacOS/$APP_NAME" <<'LAUNCHER'
#!/bin/zsh
# Starts the AI Hub server in the background (unless it's already running) and
# opens it in its own window. The server quits by itself about 10 minutes after
# the last AI Hub window closes.

HUB="${0:A:h:h}/Resources/hub"
SUPPORT="$HOME/Library/Application Support/AI Hub"
LOG="$HOME/Library/Logs/AI Hub.log"
PORT=4317
URL="http://localhost:$PORT"

# Apps opened from Finder don't get Terminal's PATH, which is where node, claude,
# codex and agy are found. Borrow it from your shell, plus the usual places.
shell_path="$(/bin/zsh -ilc 'printf "__PATH__%s\n" "$PATH"' </dev/null 2>/dev/null | sed -n 's/^.*__PATH__//p' | tail -n 1)"
export PATH="$shell_path:$HOME/.local/bin:$HOME/.antigravity/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"

alert() { osascript -e "display alert \"$1\" message \"$2\"" >/dev/null 2>&1; }
alive() { curl -fs -o /dev/null --max-time 1 "$URL/api/ping"; }

if ! alive; then
  if ! command -v node >/dev/null 2>&1; then
    alert "AI Hub needs Node.js" "Install it from nodejs.org, then open AI Hub again."
    open "https://nodejs.org"
    exit 1
  fi
  mkdir -p "$SUPPORT" "${LOG:h}"
  echo "--- $(date) starting AI Hub" >> "$LOG"
  AI_HUB_DATA="$SUPPORT/data" \
  AI_HUB_WORKSPACE="$SUPPORT/workspace" \
  AI_HUB_CONFIG="$SUPPORT/hub.config.json" \
  AI_HUB_IDLE_EXIT_MIN=10 \
  PORT=$PORT \
    nohup node "$HUB/server.mjs" >> "$LOG" 2>&1 &
  for i in {1..50}; do alive && break; sleep 0.2; done
  if ! alive; then
    alert "AI Hub couldn't start" "Details are in Library/Logs/AI Hub.log in your home folder."
    exit 1
  fi
fi

# A Chrome-family browser can show the hub in its own app window, with no tabs
# or address bar. Otherwise use your default browser.
for browser in "Google Chrome" "Brave Browser" "Microsoft Edge"; do
  if open -Ra "$browser" >/dev/null 2>&1; then
    open -na "$browser" --args --app="$URL"
    exit 0
  fi
done
open "$URL"
LAUNCHER
chmod +x "$APP/Contents/MacOS/$APP_NAME"

# App icon (uses tools built into macOS; skipped quietly if they're missing).
if command -v sips >/dev/null 2>&1 && command -v iconutil >/dev/null 2>&1; then
  TMP="$(mktemp -d)"
  SET="$TMP/AppIcon.iconset"
  mkdir -p "$SET"
  for s in 16 32 128 256 512; do
    sips -z "$s" "$s" "$HERE/icon.png" --out "$SET/icon_${s}x${s}.png" >/dev/null
    sips -z "$((s * 2))" "$((s * 2))" "$HERE/icon.png" --out "$SET/icon_${s}x${s}@2x.png" >/dev/null
  done
  iconutil -c icns "$SET" -o "$APP/Contents/Resources/AppIcon.icns" || true
  rm -rf "$TMP"
  touch "$APP" # make Finder pick up the new icon
fi

echo
echo "Done! \"$APP_NAME\" is in $DEST_DIR."
echo "Open it from Launchpad or Spotlight (Command + Space, type AI Hub)."
echo "To keep it in your Dock: open your Applications folder and drag AI Hub onto the Dock."
