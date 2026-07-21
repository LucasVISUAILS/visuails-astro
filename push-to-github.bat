@echo off
cd /d "%~dp0"
echo ===================================
echo  VISUAILS Astro - push naar GitHub
echo ===================================
echo.

if not exist ".git" (
    echo Nog geen git-repo in deze map - initialiseren...
    git init
    git branch -M main
    echo.
)

git remote get-url origin >nul 2>&1
if errorlevel 1 (
    echo Remote koppelen aan:
    echo   https://github.com/LucasVISUAILS/visuails-astro.git
    git remote add origin "https://github.com/LucasVISUAILS/visuails-astro.git"
    echo.
)

echo Wijzigingen toevoegen...
git add -A
echo.
echo Committen...
git commit -m "Update %date% %time%"
echo.
echo Pushen naar GitHub (Cloudflare Pages bouwt automatisch opnieuw)...
git push -u origin main
echo.
echo ===================================
echo  Klaar. Controleer hierboven op foutmeldingen.
echo ===================================
pause
