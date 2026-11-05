@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
title VISUAILS - teksten toepassen
REM ============================================================================
REM  VISUAILS - je ingevulde tekstronde terug in de site zetten
REM  (levering 71, 5 november 2026)
REM
REM  Wanneer: je hebt de tabel van TEKSTEN.bat ingevuld en opgeslagen.
REM
REM  Wat jij doet:
REM    1  Dubbelklik dit bestand en sleep je ingevulde tabel in dit venster.
REM       Druk op Enter.
REM    2  Lees wat er verandert: per zin wat er nu staat en wat het wordt.
REM       Klopt het, typ J. Anders N: dan verandert er niets.
REM    3  Daarna draaien alle toetsen, met een nieuwe build: een paar minuten.
REM       GROEN: rol uit met UITROLLEN.bat. ROOD: het script vraagt of je je
REM       teksten terug wilt zetten zoals ze waren; stuur de melding naar Claude.
REM
REM  Wat het script doet: het zoekt elke oude zin letterlijk op in de bron en
REM  zet je nieuwe zin ervoor in de plaats, op elke plek waar hij staat. Een
REM  rechte apostrof tussen twee letters wordt de krulle van de site. Een zin
REM  die het niet vindt, of twee verschillende antwoorden op dezelfde zin,
REM  meldt het en laat het staan. Van elk bestand dat verandert gaat eerst een
REM  kopie naar tekstronde\terug. Er gaat niets online: dat doet pas
REM  UITROLLEN.bat.
REM
REM  De logica staat in scripts\tekst-toepassen.mjs. Geen paden binnen
REM  haakjes: de projectmap heeft spaties en haakjes in zijn naam.
REM ============================================================================
echo =====================================================
echo  VISUAILS - teksten toepassen
echo =====================================================
if not exist "astro.config.mjs" goto nietindemap
node scripts\tekst-toepassen.mjs --vraag
if errorlevel 3 goto niets
if errorlevel 2 goto gestopt
if errorlevel 1 goto mislukt
echo.
echo  Je teksten staan erin. Nu de toetsen, met een nieuwe build.
echo  Dat duurt een paar minuten; je hoeft niets te doen.
echo.
node scripts\testreeks.mjs --nog-eens
if errorlevel 1 goto rood
echo.
echo  GROEN: je teksten staan erin en alle toetsen zijn groen.
echo  Rol uit met UITROLLEN.bat.
pause
exit /b 0

:rood
echo.
echo  ROOD - een of meer toetsen zijn rood, zie hierboven welke. Vaak wacht
echo  een toets nog op de oude zin; dan moet Claude de toets bijwerken.
echo  Rol zo niet uit: UITROLLEN.bat stopt dan ook.
node scripts\tekst-toepassen.mjs --terug --vraag
pause
exit /b 1

:niets
echo.
echo  Er is niets veranderd.
pause
exit /b 0

:gestopt
echo.
echo  Gestopt: er is niets veranderd.
pause
exit /b 0

:mislukt
echo.
echo  ROOD - er ging iets mis, zie de melding hierboven. Er is niets veranderd.
echo.
pause
exit /b 1

:nietindemap
echo FOUT: dit bestand staat niet in de projectmap. Gestopt.
pause
exit /b 1
