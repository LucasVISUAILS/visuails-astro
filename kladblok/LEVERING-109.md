# Levering 109 · Licht onder het doek, en de draad in de kaart

**16 november 2026. Staat alleen in je map; je rolt zelf uit met `UITROLLEN.bat`.**

In lijst 116 vond je richting D het mooist. In lijst 117 koos je a: het net is licht, geen kabel. In lijst 118 zette je alles op Goed, koos je bij Q1 a (licht op elke pagina met kaarten) en bij de levering a.

Wat je vroeg (00:00):

> *"Ik wil dat de kabels niet in de buurt komen van teksten en knoppen ook wil ik dat ze donkerder door de kaart heen gaan alsof ze erin zitten. Ook mis ik de film grain op de kaart en mag de kaart zelf ook nog wel wat meer variatie hebben van elkaar zoals in de animatie qua achtergrond maar dan wel verschillend van elkaar. Ook mag de glow naast de kabel wat aflopen qua helderheid hoe verder hij van de kabel is. Ook de kabels allemaal iets subtieler maken omdat het niet af moet leiden van wat belangrijk is."*

## De kaarten (`src/scripts/kaartveld.js`)

- **Weg van tekst en knoppen.**
  - Per kaart kiest de site zelf waar de lijn ligt. Hij heeft acht liggingen: de vorm van de look en zijn spiegelingen.
  - Hij neemt de ligging die het verst van tekst, knoppen en beelden in de kaart blijft.
  - Komt de lijn toch binnen 64 px van tekst, dan zakt hij weg.
- **Donker door de kaart.**
  - In de kaart ligt de draad in het vlak: diep groen, met een zwakke glans.
  - Alleen de stroom licht hem even op.
  - De laatste 40 px voor de rand komt hij naar boven en wordt hij chroom.
- **Filmkorrel.**
  - De korrel is terug, fijn en zacht zoals in de logo-animatie.
  - Hij verspringt 8 keer per seconde.
  - Bij minder beweging staat hij stil.
- **Meer verschil.**
  - Over elke kaart loopt een brede, zachte vouw van licht. Per kaart verschillen de hoek, de plek, de breedte en de buiging.
  - Onder tekst blijft het donker.
- **De gloed loopt af.** Hij heeft een smalle kern en een lange, zwakke staart, en is de helft zo sterk als in 108.
- **Subtieler.**
  - De draad is 3 px in plaats van 3,8 px.
  - De glans gaat tot mint 300, niet meer tot bijna wit.
- **Verborgen kaarten** (bijvoorbeeld een tab die dicht is) krijgen geen lijn naar buiten.

## Licht onder het doek (`src/scripts/lichtnet.js`, nieuw)

- **Het beeld.** De pagina is het doek van een softbox. Daaronder lopen banen van wit licht met een zweem mint.
- **Waar de banen lopen.**
  - Ze beginnen waar de lijn van een kaart naar buiten komt en lopen naar de volgende kaart.
  - Een paar lopen van rand tot rand.
  - Ze zoeken een route om tekst en knoppen heen (A* op een raster van 24 px) en worden daarna glad gemaakt.
  - Dicht bij tekst vervagen ze.
- **De stroom.** Een zachte golf licht trekt door de baan, elke 560 px één, 70 px per seconde. Bij minder beweging staat alles stil.
- **Waar het licht komt.**
  - Op elke pagina met kaarten (Q1 a).
  - Pagina's zonder kaart krijgen niets.
  - Op de telefoon zijn er minder banen.
- **Wat het kost.**
  - Het stille licht wordt één keer getekend, in tegels van 1024 px.
  - Alleen de stroom beweegt, op hoogstens 24 beelden per seconde.
  - Het net start pas als de pagina klaar is (na het laden, 1,5 s en een rustig moment) of bij de eerste keer scrollen.
- **Hoe het in de pagina zit.**
  - Het doek is een vaste laag (`z-index: -1`) onder de inhoud.
  - Zolang het aan staat, ligt de witte grond `#FCFCFC` op `html` en is `body` doorzichtig (klasse `ln-aan`).

## Studio

De vijf stilstaande kaarten zijn opnieuw gemaakt, met de korrel, de vouw en de donkere draad. Ze hebben `?v=109`.

Bij het nalopen vond ik een fout: `studio-1.webp` was steeds het effen verloop, omdat het beeld werd vastgelegd voordat het veld getekend was. Nu is het een echt stuk van het veld.

## Bestanden

| bestand | wat |
|---|---|
| `src/scripts/kaartveld.js` | de ligging per kaart, de donkere draad, de korrel, de vouw, de gloed |
| `src/scripts/lichtnet.js` | **nieuw**: licht onder het doek |
| `src/layouts/Layout.astro` | laadt `lichtnet.js` |
| `src/styles/studio-kaart-105.css` | de beelden met `?v=109` |
| `public/img/kaart/studio-1, 2, 4, 5, 6.webp` | opnieuw gemaakt |
| `docs/KLEURENSCHEMA.md`, `docs/DESIGN.md` | bijgewerkt |
| `tests/kaartveld-100-browser.test.mjs` | meet ook de korrel, de ligging, de draad, de vouw en het lichtnet |
| `tests/grond-79.test.mjs` | leest de grond van `html` als het lichtnet aan staat |
| `tests/console-schoon.test.mjs` | negeert alleen de prestatiemelding van de softwaredriver (zie hieronder) |

## Toetsen

- **De hele reeks is gedraaid:** 274 snelle toetsen en 80 browsertoetsen, allemaal groen.
  - Een paar browsertoetsen vielen om toen ze met drie tegelijk liepen (onder andere bedankpagina, formuliera2, kaartveld-browser, posterkleur89, klantstand).
  - Los gedraaid zijn ze alle groen. Het lag aan de last op de testmachine, niet aan de site.
- **Contrast.** Wit op de kaarten haalt op het slechtste punt onder de tekst 7,15 : 1, op 1440 en op 390.
- **`console-schoon`.**
  - De browser van de toetsen tekent WebGL in software (SwiftShader). Als het kaartveld zijn beeld naar de kaarten kopieert, meldt die driver "GPU stall due to ReadPixels".
  - Levering 108 zonder lichtnet geeft die melding al. Het is dus geen nieuwe fout; met een echte GPU gebeurt de kopie op de GPU.
  - De toets laat alleen die ene driverregel weg; elke andere waarschuwing telt nog.
