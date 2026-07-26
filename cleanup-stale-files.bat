@echo off
setlocal
cd /d "%~dp0"

echo =====================================================
echo  VISUAILS - stale bestanden opruimen
echo =====================================================
echo.
echo Deze map bevat 45 bestanden die niet meer bij het
echo project horen. push-to-github.bat doet "git add -A",
echo dus die gaan nu MEE naar GitHub en Cloudflare bouwt ze.
echo.
echo GROEP 1 - nooit meegekomen (33 bestanden):
echo.
echo   src\pages\de\           (27 bestanden - Duitse site,
echo                            prijzen van juli 2025)
echo   src\data\*.de.js        (3 bestanden - Duitse teksten)
echo   src\pages\models.astro
echo   src\pages\nl\models.astro
echo   src\components\ThreeWay.astro
echo.
echo GROEP 2 - de oude bestelpagina's (12 bestanden):
echo.
echo   src\pages\order-catalog.astro     en de \nl\ variant
echo   src\pages\order-lifestyle.astro   en de \nl\ variant
echo   src\pages\order-video.astro       en de \nl\ variant
echo   src\pages\order-custom.astro      en de \nl\ variant
echo   src\pages\order-status.astro      en de \nl\ variant
echo   src\pages\order\index.astro       en de \nl\ variant
echo.
echo Die twaalf zijn vervangen door een pagina: /start.
echo Alle oude adressen sturen nu met een 301 door naar
echo /start of /o, zie public\_redirects.
echo.
echo Blijven ze hier staan, dan bouwt Cloudflare ze gewoon
echo opnieuw en staat de oude bestelmolen weer online naast
echo de nieuwe. Ze zijn in het project zelf al verwijderd;
echo alleen deze map loopt achter.
echo.

REM  Eerst kijken of dit wel de projectmap is, en pas daarna of er iets
REM  op te ruimen valt. Andersom zou een script dat per ongeluk in een
REM  lege map staat "niets te doen" melden - wat waar is, en precies het
REM  verkeerde antwoord op de vraag die je stelde.
if not exist "astro.config.mjs" (
    echo FOUT: astro.config.mjs niet gevonden.
    echo Dit script staat blijkbaar niet in de projectmap. Gestopt.
    echo.
    pause
    exit /b 1
)

set STALE1=0
set STALE2=0
if exist "src\pages\de\" set STALE1=1
if exist "src\components\ThreeWay.astro" set STALE1=1
if exist "src\pages\order-catalog.astro" set STALE2=1
if exist "src\pages\nl\order-catalog.astro" set STALE2=1
if exist "src\pages\order\" set STALE2=1
if exist "src\pages\nl\order\" set STALE2=1

if "%STALE1%%STALE2%"=="00" (
    echo Niets te doen - alles is al opgeruimd.
    echo.
    pause
    exit /b 0
)

REM  Weigeren als /start er nog niet is. Dit script verwijdert de enige
REM  bestelpagina's die deze map heeft; staat de vervanger er nog niet in,
REM  dan houdt de map daarna helemaal geen manier over om te bestellen.
REM  Dat is precies de situatie waarin je dit script niet wilt draaien.
if "%STALE2%"=="1" (
    if not exist "src\components\StartPage.astro" (
        echo FOUT: src\components\StartPage.astro ontbreekt.
        echo.
        echo De oude bestelpagina's mogen pas weg als de nieuwe
        echo /start-pagina hier staat. Synchroniseer eerst de
        echo nieuwe bestanden en draai dit daarna opnieuw.
        echo.
        pause
        exit /b 1
    )
)

set /p OK="Verwijderen? Typ J en druk op Enter: "
if /i not "%OK%"=="J" (
    echo.
    echo Afgebroken. Er is niets verwijderd.
    echo.
    pause
    exit /b 0
)

echo.

REM  VOLGORDE IS BELANGRIJK.
REM  src\pages\de\pricing.astro importeert ThreeWay.astro. Verwijder je
REM  ThreeWay.astro wel en de de-map niet, dan is die import kapot en
REM  FAALT de Cloudflare-build - dan gaat er niets meer live. Daarom
REM  eerst de de-map, daarna pas de rest.

if exist "src\pages\de\" (
    echo Verwijderen: src\pages\de\
    rmdir /s /q "src\pages\de"
)

for %%F in (
    "src\data\catalogStyles.de.js"
    "src\data\styles.de.js"
    "src\data\videoStyles.de.js"
    "src\pages\models.astro"
    "src\pages\nl\models.astro"
    "src\components\ThreeWay.astro"
) do (
    if exist %%F (
        echo Verwijderen: %%~F
        del /q %%F
    )
)

REM  De oude bestelpagina's. Deze importeren niets van elkaar, dus de
REM  volgorde maakt hier niet uit. De twee order-mappen gaan als map weg,
REM  want daar staat alleen index.astro in.

for %%F in (
    "src\pages\order-catalog.astro"
    "src\pages\order-lifestyle.astro"
    "src\pages\order-video.astro"
    "src\pages\order-custom.astro"
    "src\pages\order-status.astro"
    "src\pages\nl\order-catalog.astro"
    "src\pages\nl\order-lifestyle.astro"
    "src\pages\nl\order-video.astro"
    "src\pages\nl\order-custom.astro"
    "src\pages\nl\order-status.astro"
) do (
    if exist %%F (
        echo Verwijderen: %%~F
        del /q %%F
    )
)

if exist "src\pages\order\" (
    echo Verwijderen: src\pages\order\
    rmdir /s /q "src\pages\order"
)

if exist "src\pages\nl\order\" (
    echo Verwijderen: src\pages\nl\order\
    rmdir /s /q "src\pages\nl\order"
)

echo.
echo =====================================================
echo  Klaar.
echo.
echo  Draai hierna push-to-github.bat. Die registreert de
echo  verwijderingen vanzelf ^(git add -A^) en Cloudflare
echo  bouwt daarna zonder de Duitse pagina's en zonder de
echo  oude bestelpagina's.
echo =====================================================
echo.
pause
