@echo off
setlocal
cd /d "%~dp0.."
REM VISUAILS - nepbeelden voor de drukteproef (8 oktober 2026, punt 9.05).
REM Maakt 60 telefoonfoto's en 60 beelden in 4K in kladblok\drukteproef\.
REM De uitleg staat bovenaan kladblok\drukteproef-beelden.mjs.
if not exist "astro.config.mjs" goto nietindemap
node kladblok\drukteproef-beelden.mjs
echo.
pause
exit /b 0

:nietindemap
echo FOUT: dit bestand staat niet in de map kladblok van het project. Gestopt.
pause
exit /b 1
