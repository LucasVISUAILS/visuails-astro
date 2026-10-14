@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
title VISUAILS - uitrollen
echo =====================================================
echo  VISUAILS - uitrollen
echo =====================================================
echo.
echo  Dit doet in een keer: opruimen nakijken, geheimen
echo  nakijken, alle tests, laten zien wat er meegaat en
echo  dan pas na jouw J: committen, pushen, nieuwe migraties,
echo  site live, nachtwerk live en zes adressen nakijken.
echo  Bij een fout stopt het en zegt het bij welke stap.
echo.
if not exist "astro.config.mjs" goto geenmap
where node >nul 2>&1
if errorlevel 1 goto geennode
node scripts\uitrol.mjs
echo.
pause
exit /b 0

:geenmap
echo FOUT: dit script staat niet in de projectmap van VISUAILS. Gestopt.
pause
exit /b 1

:geennode
echo FOUT: Node.js is niet gevonden op deze pc. Gestopt, er is niets gedaan.
pause
exit /b 1
