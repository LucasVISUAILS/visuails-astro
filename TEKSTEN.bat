@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
title VISUAILS - teksten
REM ============================================================================
REM  VISUAILS - de tekstronde: alle zinnen van de site in een tabel
REM  (levering 71, 5 november 2026)
REM
REM  Wanneer: je wilt de teksten van de site nalezen of aanpassen, NL en EN.
REM
REM  Wat jij doet:
REM    1  Dubbelklik dit bestand. Het bouwt de site, haalt er elke zin uit
REM       die een klant leest (ook VISUAILS Studio, de e-mails en WhatsApp) en
REM       zet ze in een tabel in de map tekstronde. Die gaat vanzelf open.
REM    2  Lees het tabblad "Lees mij". Typ je nieuwe zin in de kolom
REM       "Engels nieuw" of "Nederlands nieuw"; leeg betekent ongewijzigd.
REM    3  Sla op (als .xlsx) en dubbelklik TEKSTEN-TOEPASSEN.bat.
REM
REM  Elke keer een nieuwe tabel met de datum in de naam: een tabel die je al
REM  aan het invullen bent, wordt nooit overschreven.
REM
REM  De logica staat in scripts\tekstblad.mjs en scripts\tekstblad-xlsx.mjs.
REM  Alleen Node, geen Python. Geen paden binnen haakjes: de projectmap heeft
REM  spaties en haakjes in zijn naam.
REM ============================================================================
echo =====================================================
echo  VISUAILS - de tekstronde maken
echo =====================================================
if not exist "astro.config.mjs" goto nietindemap
if not exist "tekstronde" mkdir "tekstronde"
echo.
echo  Stap 1 van 2: de site bouwen. Dat duurt een paar minuten.
call npm run build > "tekstronde\build.log" 2>&1
if errorlevel 1 goto bouwmis
echo  Stap 2 van 2: de zinnen uit de site halen.
node scripts\tekstblad.mjs > "tekstronde\tekstblad.log" 2>&1
if errorlevel 1 goto mislukt
node scripts\tekstblad-xlsx.mjs
if errorlevel 1 goto mislukt
set /p TABEL=<"tekstronde\LAATSTE-TABEL.txt"
start "" "tekstronde\%TABEL%"
echo.
echo  KLAAR. De tabel staat open: tekstronde\%TABEL%
echo  Ingevuld en opgeslagen? Dubbelklik dan TEKSTEN-TOEPASSEN.bat.
pause
exit /b 0

:bouwmis
echo.
echo  ROOD - de site liet zich niet bouwen. Wat er misging staat in
echo  tekstronde\build.log. Stuur dat bestand naar Claude.
echo.
pause
exit /b 1

:mislukt
echo.
echo  ROOD - de tabel is niet gemaakt. Zie de melding hierboven, of
echo  tekstronde\tekstblad.log. Stuur die naar Claude.
echo.
pause
exit /b 1

:nietindemap
echo FOUT: dit bestand staat niet in de projectmap. Gestopt.
pause
exit /b 1
