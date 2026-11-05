@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
title VISUAILS - beelden en iconen
REM ============================================================================
REM  VISUAILS - zelf beelden en iconen vervangen (levering 71, 5 november 2026)
REM
REM  Wanneer: je wilt een plaatshouder, een oude foto of een icoon op de site
REM  vervangen door je eigen beeld.
REM
REM  Wat jij doet:
REM    1  Open eigen-beelden\BEELDVAKKEN.html. Daar staat elk vak met zijn naam,
REM       de pagina, de verhouding en hoe breed het beeld minstens moet zijn. Is
REM       hij er nog niet, dubbelklik dit bestand dan een keer: hij maakt hem.
REM    2  Zet je beeld (png, jpg of webp) in de map eigen-beelden met precies de
REM       naam van het vak, bv. lifestyle-august-02.png. Een icoon: een svg met
REM       de naam van het icoon, bv. vink.svg (raster 24, gevuld, geen lijn).
REM    3  Dubbelklik dit bestand. GROEN: het contactblad gaat open, met het oude
REM       en het nieuwe beeld naast elkaar. Klopt het, rol dan uit met
REM       UITROLLEN.bat. ROOD: er staat per bestand wat er mis is en wat je doet.
REM
REM  Wat het script doet: het keurt de verhouding (hoogstens 2 procent ernaast)
REM  en de maat, maakt het beeld op de maat van het vak, alle kleinere maten,
REM  de telefoonversie en de AVIF, neemt de herkomst (C2PA) mee als het bestand
REM  die heeft, zet het oude beeld in eigen-beelden\_vorige en wat je erin zette
REM  in eigen-beelden\_verwerkt. Een icoon wordt tegen de regels van het kit
REM  gelegd en dan in src\data\iconen.js gezet. Er gaat niets online: dat doet
REM  pas UITROLLEN.bat.
REM
REM  De logica staat in scripts\beelden.mjs. Geen paden binnen haakjes: de
REM  projectmap heeft spaties en haakjes in zijn naam.
REM ============================================================================
echo =====================================================
echo  VISUAILS - beelden en iconen vervangen
echo =====================================================
if not exist "astro.config.mjs" goto nietindemap
node scripts\beelden.mjs
if errorlevel 3 goto leeg
if errorlevel 1 goto mislukt
start "" "eigen-beelden\CONTACTBLAD.html"
echo.
echo  KLAAR. Het contactblad staat open in je browser.
pause
exit /b 0

:leeg
start "" "eigen-beelden\BEELDVAKKEN.html"
echo.
echo  De lijst van vakken staat open in je browser.
pause
exit /b 0

:mislukt
echo.
echo  ROOD - zie de melding hierboven. Er is niets online gezet.
echo.
pause
exit /b 1

:nietindemap
echo FOUT: dit bestand staat niet in de projectmap. Gestopt.
pause
exit /b 1
