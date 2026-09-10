@echo off
cd /d "%~dp0"
echo ============================================
echo  VISUAILS - naar GitHub EN naar de Worker
echo ============================================
echo.
echo  LET OP: sinds 10 september 2026 draait visuails.com
echo  op de Worker "visuails-site" en NIET meer op het
echo  Pages-project. Een push naar GitHub bouwt alleen nog
echo  het vangnet; wat de bezoeker ziet komt van de Worker,
echo  en die wordt hieronder apart gedeployed.
echo.
echo  Dit script draait GEEN npm test. Doe dat eerst,
echo  of weet wat je deployt.
echo.
pause

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

echo.
echo [1/4] Wijzigingen toevoegen en committen...
git add -A
git commit -m "Update %date% %time%"
echo.

echo [2/4] Pushen naar GitHub (bewaart je werk; bouwt het Pages-vangnet)...
git push -u origin main
if errorlevel 1 (
    echo.
    echo  !! De push is mislukt. De deploy hieronder is overgeslagen,
    echo     want je wilt niet live zetten wat nergens bewaard is.
    pause
    exit /b 1
)
echo.

echo [3/4] Bouwen...
call npx astro build
if errorlevel 1 (
    echo.
    echo  !! De build is mislukt. Er is NIETS gedeployed - de Worker
    echo     draait nog gewoon de vorige versie.
    pause
    exit /b 1
)
echo.

echo [4/4] De Worker deployen - dit is wat de bezoeker gaat zien...
call npx wrangler deploy
if errorlevel 1 (
    echo.
    echo  !! De deploy is mislukt. De Worker draait nog de vorige
    echo     versie; je code staat wel op GitHub.
    pause
    exit /b 1
)

echo.
echo ============================================
echo  Klaar. Controleer hierboven op foutmeldingen.
echo.
echo  Even nakijken op visuails.com:
echo    /            de voorpagina
echo    /account/    VISUAILS Studio
echo    /admin       het adminportaal
echo ============================================
pause
