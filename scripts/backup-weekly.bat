@echo off
REM ============================================================================
REM  VISUAILS - de wekelijkse back-up, voor de Windows Taakplanner
REM ============================================================================
REM
REM  Wat dit doet:  npm run backup -- --keep 8
REM                 (database + R2-inventaris; acht sets bewaren, oudere weg)
REM
REM  Waarom een .bat en niet de Taakplanner die npm direct aanroept:
REM
REM   1  DE WERKMAP. `npm run backup` moet in de repository staan. De Taakplanner
REM      start standaard in C:\Windows\system32, en daar staat geen package.json.
REM      Dit bestand springt naar zijn eigen map en dan een niveau omhoog, dus het
REM      werkt ook als je de map ooit verplaatst.
REM
REM   2  HET LOGBOEK. Een taak die om drie uur 's nachts draait, heeft geen venster
REM      om iets in te zeggen. Alles gaat naar backups\_log\<datum>.txt, en de
REM      laatste ronde staat altijd ook in backups\_log\laatste.txt.
REM
REM   3  DE AFLOOPCODE. De Taakplanner zet "Laatste resultaat van uitvoering" op
REM      wat dit bestand teruggeeft. Bij 0 ging het goed; bij 1 niet. Zonder deze
REM      regel meldt de Taakplanner altijd 0, ook als de back-up mislukte.
REM
REM  EN HET BELANGRIJKSTE STUK ZIT NIET IN DIT BESTAND. Een taak die stilvalt,
REM  meldt zichzelf niet: een uitgezette laptop, een verlopen wrangler-login of een
REM  volle schijf leveren geen mail op. Daarom schrijft scripts\backup.mjs bij elke
REM  geslaagde ronde een datum in app_settings, en kijkt cron\index.js daar elke
REM  nacht naar. Is die datum ouder dan tien dagen, dan krijg je een mail - vanuit
REM  de cloud, want een PC die het probleem is kan het probleem niet melden.
REM
REM  EENMALIG INSTELLEN: zie DEPLOY.md, onder "De wekelijkse back-up".
REM ============================================================================

setlocal
pushd "%~dp0.." || exit /b 1

where npm >nul 2>&1
if errorlevel 1 (
  echo npm staat niet in het PATH van dit account.
  echo De taak moet lopen onder een account dat Node.js kan vinden - zie DEPLOY.md.
  popd
  exit /b 1
)

for /f %%s in ('powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd-HHmm"') do set "STAMP=%%s"
if not exist "backups\_log" mkdir "backups\_log"
set "LOG=backups\_log\%STAMP%.txt"

echo VISUAILS back-up - gestart %DATE% %TIME%> "%LOG%"
echo map: %CD%>> "%LOG%"
echo.>> "%LOG%"

call npm run backup -- --keep 8 >> "%LOG%" 2>&1
if errorlevel 1 goto mislukt

echo.>> "%LOG%"
echo KLAAR - gelukt, %DATE% %TIME%>> "%LOG%"
copy /y "%LOG%" "backups\_log\laatste.txt" >nul
REM Logboeken ouder dan 120 dagen opruimen. De back-ups zelf worden door
REM --keep 8 beheerd; dit gaat alleen over de tekstbestanden ernaast.
forfiles /p "backups\_log" /m *.txt /d -120 /c "cmd /c del @path" >nul 2>&1

REM ============================================================================
REM  EN NU IETS OP HET SCHERM. Alles hierboven gaat naar het logbestand, en dat is
REM  goed voor een taak die om één uur 's middags in de achtergrond loopt - maar
REM  bij een handmatige run zag je NIETS. Op 12 augustus 2026 draaide Lucas dit
REM  bestand met de hand, kreeg een lege prompt terug, en had geen enkele manier om
REM  een geslaagde back-up van een vastloper te onderscheiden.
REM
REM  Dus: de drie regels uit het log die het antwoord geven. `findstr` en niet het
REM  hele bestand, want de rest is npm-ruis; wie meer wil weten krijgt het pad naar
REM  het volledige verslag eronder.
REM ============================================================================
echo.
findstr /c:"database exporteren" /c:"tabellen, waaronder" /c:"datum weggeschreven" /c:"inventaris van de bestanden" "%LOG%"
echo.
echo   KLAAR - gelukt. Volledig verslag: backups\_log\laatste.txt
echo.
popd
exit /b 0

:mislukt
echo.>> "%LOG%"
echo KLAAR - MISLUKT, %DATE% %TIME%>> "%LOG%"
echo Wat je nu wil weten staat hierboven in dit bestand.>> "%LOG%"
echo Meestal is het de wrangler-login: `npx wrangler whoami` in deze map.>> "%LOG%"
copy /y "%LOG%" "backups\_log\laatste.txt" >nul

REM Bij een mislukking WEL het staartje van het log op het scherm, want dan is de
REM vraag "waarom" en niet "is het gelukt". Tien regels: genoeg voor de foutmelding
REM van wrangler, niet zoveel dat het venster volloopt.
echo.
echo   KLAAR - MISLUKT. De laatste regels van het verslag:
echo.
powershell -NoProfile -Command "Get-Content -LiteralPath '%LOG%' -Tail 10"
echo.
echo   Volledig verslag: backups\_log\laatste.txt
echo   Meestal is het de wrangler-login: npx wrangler whoami
echo.
popd
exit /b 1
