# Levering 122 · Het aantal-veld in de nieuwe letter

**19 november 2026. Staat alleen in je map; je rolt zelf uit met `UITROLLEN.bat`.**

Je zei "ga door" op de drie vragen uit levering 121. Ik volgde daarbij mijn advies:

1. **Het grote cijfer in het aantal-veld** van het bestelformulier staat nu in VISUAILS Display 2 Medium, net als de koppen; daarvoor stond het in de oude Bold. Maat en plek zijn gelijk gebleven. De Bold wordt daardoor nergens op de site meer vooraf geladen; het bestelformulier laadt ongeveer 30 KB minder.
2. **Studio:** de kleine koppen blijven in DM Sans. Studio is een werkplek, en daar leest een gewone letter rustiger.
3. **De fotogids en de handleiding** blijven nog in de oude Bold. Ze gaan mee zodra je die documenten toch bijwerkt. Het lettertypebestand blijft daarom staan.

## Bestanden

- `src/styles/werkplaats.css`: het aantal-veld staat in Display 2, gewicht 500.
- `src/layouts/Layout.astro`: de Bold wordt niet meer vooraf geladen.
- `public/fonts/visuails-display/LEES-MIJ.txt`: bijgewerkt.
- `tests/levering-121-koppen.test.mjs`: controleert nu dat het aantal-veld in Medium staat en dat de Bold nergens meer vooraf geladen wordt.

## Toetsen

De hele reeks is gedraaid na een nieuwe build: 402 toetsen, waarvan 401 meteen goed. `beweging-83` meet een schuifbeweging tot op de milliseconde en was onder volle belasting net te traag; los gedraaid slaagt hij.
