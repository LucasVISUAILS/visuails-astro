@echo off
setlocal
cd /d "%~dp0"
REM ============================================================================
REM  VISUAILS - de back-up (8 oktober 2026, punt 9.04)
REM
REM  Dubbelklikken. Drie keuzes:
REM    1  instellen: de map in Google Drive kiezen, de wekelijkse taak in de
REM       Taakplanner zetten, en meteen de eerste back-up maken
REM    2  nu een back-up maken (hetzelfde als de wekelijkse taak)
REM    3  proef: de nieuwste back-up terugzetten in een lege database op deze
REM       pc en controleren - er verandert NIETS live
REM
REM  De logica staat in scripts\backup-instellen.mjs, scripts\backup.mjs en
REM  scripts\terugzetten.mjs; dit bestand kiest alleen. Geen paden binnen
REM  haakjes: de projectmap heeft spaties en haakjes in zijn naam.
REM ============================================================================
echo =====================================================
echo  VISUAILS - de back-up
echo =====================================================
echo.
if not exist "astro.config.mjs" goto nietindemap
echo  1 = instellen: Google Drive-map kiezen, wekelijkse taak zetten, eerste back-up
echo  2 = nu een back-up maken
echo  3 = proef: de nieuwste back-up terugzetten (verandert niets live)
echo  4 = stoppen
echo.
choice /c 1234 /n /m "Kies 1, 2, 3 of 4: "
if errorlevel 4 goto einde
if errorlevel 3 goto proef
if errorlevel 2 goto nu
if errorlevel 1 goto instellen
goto einde

:instellen
echo.
node scripts\backup-instellen.mjs
if errorlevel 1 goto mislukt
echo.
echo  De wekelijkse taak in de Taakplanner zetten...
powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\install-backup-task.ps1"
if errorlevel 1 goto mislukt
echo.
echo  En nu meteen de eerste back-up...
call "scripts\backup-weekly.bat"
if errorlevel 1 goto mislukt
goto klaar

:nu
echo.
call "scripts\backup-weekly.bat"
if errorlevel 1 goto mislukt
goto klaar

:proef
echo.
node scripts\terugzetten.mjs
if errorlevel 1 goto mislukt
goto klaar

:mislukt
echo.
echo  GESTOPT - er ging iets mis. Zie de melding hierboven,
echo  of het verslag in backups\_log\laatste.txt.
echo.
pause
exit /b 1

:nietindemap
echo FOUT: dit bestand staat niet in de projectmap. Gestopt.
pause
exit /b 1

:klaar
echo.
echo  KLAAR.
pause
exit /b 0

:einde
exit /b 0
