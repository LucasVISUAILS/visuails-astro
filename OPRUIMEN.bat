@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
title VISUAILS - opruimen en sorteren
echo =====================================================
echo  VISUAILS - opruimen en sorteren
echo =====================================================
echo.
echo Dit doet twee dingen, en verwijdert niets:
echo   1. wat in _opruimen\VERPLAATS.txt staat, komt op zijn
echo      nieuwe plek in de projectmap;
echo   2. wat in _opruimen\LIJST.txt staat, gaat naar de map
echo      _opruimen\ met de datum van vandaag. Jij kijkt daar
echo      en gooit zelf weg wat weg mag.
echo.
if not exist "astro.config.mjs" goto geenmap
node scripts\opruimen.mjs
echo.
pause
exit /b 0

:geenmap
echo FOUT: dit script staat niet in de projectmap. Gestopt.
pause
exit /b 1
