@echo off
REM Automated script to build a Next.js PWA and prepare an Android APK project using Capacitor
REM Run from the 'frontend' directory

SET APP_NAME=NotifyMe
SET APP_ID=com.notifyme.pwa
SET WEB_DIR=out

REM 1. Build and export Next.js app
call npm install
call npm run build
call npm run export

REM 2. Install Capacitor dependencies if not present
IF NOT EXIST node_modules\@capacitor\core (
  call npm install @capacitor/core @capacitor/cli @capacitor/android
)

REM 3. Initialize Capacitor if not already done
IF NOT EXIST capacitor.config.json (
  call npx cap init "%APP_NAME%" "%APP_ID%" --web-dir=%WEB_DIR% --npm-client=npm
)

REM 4. Add Android platform if not already added
IF NOT EXIST android (
  call npx cap add android
)

REM 5. Copy the web build to the Android project
call npx cap copy android

REM 6. Open Android Studio for APK build (requires Android Studio installed)
echo Opening Android Studio. Build the APK via Build > Build APK(s) in Android Studio.
call npx cap open android 