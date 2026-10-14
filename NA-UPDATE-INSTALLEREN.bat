@echo off
setlocal
cd /d "%~dp0"
echo =====================================================
echo  VISUAILS - na een update: een keer installeren
echo =====================================================
echo.
echo Dit zet node_modules opnieuw neer, precies zoals
echo package-lock.json zegt, en bouwt de site een keer als
echo controle. Er wordt niets gepusht of live gezet.
echo.
echo Sluit eerst elk ander venster waarin npm run dev of
echo wrangler draait.
echo.
if not exist "astro.config.mjs" (
    echo FOUT: dit script staat niet in de projectmap. Gestopt.
    pause
    exit /b 1
)
node scripts\na-update-installeren.mjs
echo.
pause
