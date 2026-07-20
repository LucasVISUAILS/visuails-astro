@echo off
cd /d "%~dp0"
echo ===================================
echo  VISUAILS Astro - push naar GitHub
echo ===================================
echo.

git remote get-url origin >nul 2>&1
if errorlevel 1 (
    echo Nog geen GitHub-remote ingesteld. Koppel aan:
    echo   https://github.com/LucasVISUAILS/visuails-astro.git
    echo.
    git remote add origin "https://github.com/LucasVISUAILS/visuails-astro.git"
    git branch -M main
    echo.
    echo Eerste keer pushen...
    git push -u origin main
    echo.
    echo ===================================
    echo  Klaar. Controleer hierboven op foutmeldingen.
    echo ===================================
    pause
    exit /b
)

echo Wijzigingen toevoegen...
git add -A
echo.
echo Committen...
git commit -m "Update %date% %time%"
echo.
echo Pushen naar GitHub (Cloudflare Pages bouwt automatisch opnieuw)...
git push
echo.
echo ===================================
echo  Klaar. Controleer hierboven op foutmeldingen.
echo ===================================
pause
