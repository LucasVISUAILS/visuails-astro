@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
title VISUAILS - terugdraaien
echo =====================================================
echo  VISUAILS - de site terugzetten naar de vorige versie
echo =====================================================
echo.
if not exist "astro.config.mjs" goto geenmap
where node >nul 2>&1
if errorlevel 1 goto geennode
node scripts\uitrol.mjs terugdraaien
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
