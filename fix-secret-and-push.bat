@echo off
cd /d "%~dp0"
echo ===================================
echo  VISUAILS - secret uit git-historie halen
echo ===================================
echo.
echo Dit haalt je lokale commits terug tot het punt dat GitHub kent (de
echo geblokkeerde push is dus nooit aangekomen), en zet daarna alles opnieuw
echo klaar als EEN schone commit - zonder de Stripe-sleutel die in
echo stripe-local-test.js stond. Al je bestanden blijven gewoon staan zoals ze
echo nu zijn, er gaat niks verloren.
echo.
pause

echo.
echo Ophalen wat GitHub al heeft...
git fetch origin

echo.
echo Lokale main terugzetten naar wat GitHub kent (bestanden blijven staan)...
git reset --soft origin/main

echo.
echo Wijzigingen opnieuw klaarzetten...
git add -A

echo.
echo Committen...
git commit -m "Update %date% %time%"

echo.
echo Pushen naar GitHub...
git push -u origin main

echo.
echo ===================================
echo  Klaar. Controleer hierboven op foutmeldingen.
echo  Als dit lukt: gebruik voortaan gewoon weer push-to-github.bat.
echo ===================================
pause
