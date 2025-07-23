#!/bin/bash
# Automated script to build a Next.js PWA and prepare an Android APK project using Capacitor
# Run from the 'frontend' directory
set -e

APP_NAME="NotifyMe"
APP_ID="com.notifyme.pwa"
WEB_DIR="out"

# 1. Build and export Next.js app
npm install
npm run build
npm run export

# 2. Install Capacitor dependencies if not present
if ! npm list @capacitor/core >/dev/null 2>&1; then
  npm install @capacitor/core @capacitor/cli @capacitor/android
fi

# 3. Initialize Capacitor if not already done
if [ ! -f capacitor.config.json ]; then
  npx cap init "$APP_NAME" "$APP_ID" --web-dir=$WEB_DIR --npm-client=npm
fi

# 4. Add Android platform if not already added
if [ ! -d android ]; then
  npx cap add android
fi

# 5. Copy the web build to the Android project
npx cap copy android

# 6. Open Android Studio for APK build (requires Android Studio installed)
echo "Opening Android Studio. Build the APK via Build > Build APK(s) in Android Studio."
npx cap open android 