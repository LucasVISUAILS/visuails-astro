@echo off
setlocal
cd /d "%~dp0"
REM ============================================================================
REM  VISUAILS - PNG en WebP leveren (12 oktober 2026, k-lever)
REM
REM  Wanneer: een klant vroeg in Studio "Ook als PNG" of "Ook als WebP"; het
REM  staat in /admin/formaten.
REM
REM  Wat jij doet:
REM    1  Download in Magnific de PNG-originelen van die bestelling en zet ze
REM       in een map. Geef ze dezelfde naam als de jpg die je in /admin
REM       leverde (zo komen ze uit Magnific), of zet ze in de werkmap van de
REM       bestelling (p1 - .../1 voorkant/).
REM    2  Dubbelklik dit bestand. Typ het bestelnummer (VIS-...) en sleep de
REM       map in dit venster.
REM    3  Kijk naar de tabel: welke PNG bij welk beeld hoort. Klopt het, typ J.
REM
REM  Wat het script doet: van elke PNG een WebP maken (kwaliteit 90, altijd
REM  uit de PNG en nooit uit de jpg), de herkomsttag in beide, ze uploaden,
REM  en ze zo bij de beelden zetten dat de zip van de klant per product een
REM  map JPG, PNG en WEBP heeft. Heeft elk beeld ze, dan zet het script het
REM  verzoek in /admin/formaten op Klaar; anders zegt het wat er nog mist.
REM  Er gaat geen mail uit. Je map met PNG's blijft zoals hij was.
REM
REM  De logica staat in scripts\formaten.mjs. Geen paden binnen haakjes: de
REM  projectmap heeft spaties en haakjes in zijn naam.
REM ============================================================================
echo =====================================================
echo  VISUAILS - PNG en WebP leveren
echo =====================================================
echo.
if not exist "astro.config.mjs" goto nietindemap
node scripts\formaten.mjs --vraag
if errorlevel 2 goto gestopt
if errorlevel 1 goto mislukt
echo.
echo  KLAAR.
pause
exit /b 0

:gestopt
echo.
echo  Gestopt: er is niets veranderd.
pause
exit /b 0

:mislukt
echo.
echo  GESTOPT - er ging iets mis. Zie de melding hierboven.
echo.
pause
exit /b 1

:nietindemap
echo FOUT: dit bestand staat niet in de projectmap. Gestopt.
pause
exit /b 1
