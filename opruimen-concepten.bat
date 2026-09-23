@echo off
setlocal
cd /d "%~dp0"

echo =====================================================
echo  VISUAILS - de conceptpagina's opruimen (23 sep 2026)
echo =====================================================
echo.
echo Dit verwijdert:
echo.
echo   src\pages\concept\              (20 pagina's + index)
echo   src\layouts\ConceptLayout.astro
echo   src\data\conceptInhoud.js
echo.
echo De beelden in public\img\concept\ blijven staan: de
echo voorpagina gebruikt er drie van.
echo.
echo Git bewaart alles: terughalen kan altijd met
echo   git checkout HEAD~1 -- src/pages/concept
echo (zolang je de verwijdering nog niet gepusht hebt: HEAD).
echo.

if not exist "astro.config.mjs" (
    echo FOUT: astro.config.mjs niet gevonden.
    echo Dit script staat niet in de projectmap. Gestopt.
    echo.
    pause
    exit /b 1
)

set TEDOEN=0
if exist "src\pages\concept\" set TEDOEN=1
if exist "src\layouts\ConceptLayout.astro" set TEDOEN=1
if exist "src\data\conceptInhoud.js" set TEDOEN=1

if "%TEDOEN%"=="0" (
    echo Niets te doen - alles is al opgeruimd.
    echo.
    pause
    exit /b 0
)

set /p OK="Verwijderen? Typ J en druk op Enter: "
if /i not "%OK%"=="J" (
    echo.
    echo Afgebroken. Er is niets verwijderd.
    echo.
    pause
    exit /b 0
)

echo.
REM  Eerst de pagina's, dan pas de layout en de inhoud: de pagina's
REM  importeren die twee. Andersom staat er even een kapotte import.
if exist "src\pages\concept\" (
    echo Verwijderen: src\pages\concept\
    rmdir /s /q "src\pages\concept"
)
for %%F in (
    "src\layouts\ConceptLayout.astro"
    "src\data\conceptInhoud.js"
) do (
    if exist %%F (
        echo Verwijderen: %%~F
        del /q %%F
    )
)

echo.
echo Klaar. Draai nu: npm run build
echo.
pause
