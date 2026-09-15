@echo off
echo ==============================================
echo Pushing Updates to GitHub (Notify_Me)
echo ==============================================

:: Ensure we are in the right directory
cd /d "%~dp0"

echo [1/3] Adding all changes...
git add .

echo [2/3] Committing changes...
git commit -m "Update: Removed hardcoded candidate profiles, enforced registration/login, and added dynamic personalization"

echo [3/3] Pushing to GitHub (origin main)...
:: Use 'main' or 'master' depending on the default branch. We will try main first, then master.
git push origin main || git push origin master

echo.
echo ==============================================
echo Push complete!
echo ==============================================
pause
