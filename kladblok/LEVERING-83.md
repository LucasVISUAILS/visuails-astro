# Levering 83 · De schakelaars glijden; het vinkje, de pauzeknop, grijs naar inkt en lichter scrollen

**2 november 2026 (lijst 68 ingevuld om 04:12). Staat alleen in je map; je rolt zelf uit met `UITROLLEN.bat`.**
Bouwt voort op levering 82. De maten staan in `docs/RUST-80.md` §11. De filmpjes en je oordeel: lijst 69.

---

## 1 · Wat je vroeg

- **1 november**, in de opdracht: *"soms smooth human dopamine animations/sections/switches"*, en dat alles soepel
  loopt en nooit hapert.
- **Lijst 68** (04:12): schakel = **a** (het inktblok glijdt, 240 ms op de kleine golf), klein = **ja** (het vinkje
  in twee stappen, de pauzeknop wordt een driehoek), grijs = **a** (per woord, alleen op "Jij stuurt. Wij maken. Jij
  keurt goed."), soepel = **goed** (en ik zou de logoposter lichter maken).

## 2 · Wat er staat

### De schakelaars
- **Waar**: de tabs van de FAQ, de pillen en Leveringen | Alle beelden op /gallery, en de formaten (Hoe het werkt
  op /voorbeeld/uitleg). Het blok glijdt in 240 ms naar je keuze: snel weg, zacht aankomen, geen stuiter.
- **De vorm**: de pillen en de formaten houden hun snede (onderweg loopt de kier van 53° door het blok); de FAQ en
  de wissel houden hun ronde hoek, en het blok blijft één blok.
- Schermlezer, tab-toets en muis zien alleen de echte knoppen. Minder beweging: het blok springt. Zonder script:
  zoals het was.
- **Studio** blijft zonder: daar wil je geen animatie bij het wisselen van tab (15 oktober).

### De kleine dingen
- **De pauzeknop** (de opening, de laptop, Over, Hoe het werkt): de twee balken worden de twee helften van de
  driehoek en terug, 240 ms. In Safari wisselen de twee iconen zoals nu.
- **Het vinkje**, op elk vakje (de cookiekeuze, het bestelformulier) en op het eigen vakje van de fotogids: het vakje
  is meteen inkt, het korte been staat er meteen, het lange 110 ms later. Uitvinken is meteen weg.

### Grijs naar inkt
- Alleen "Jij stuurt. Wij maken. Jij keurt goed." op de voorpagina. Elk woord springt in twee tellen naar inkt als
  de zin het onderste deel van het scherm voorbij is, van links naar rechts; terugscrollen maakt hem weer grijs.
  Het grijs haalt 5,4 : 1, dus de zin is ook grijs goed te lezen. Minder beweging: meteen inkt.

### Lichter scrollen
- De lichtvlek op de glazen balk rekende bij elk beeld de hele balk opnieuw uit; nu niet meer (hetzelfde beeld).
- De galerij en de logoposter zetten alleen nog iets als het echt verandert; de logoposter tekent niet opnieuw als
  er niets veranderde. De WhatsApp-knop raakt zijn klassen niet meer aan als er niets verandert.

## 3 · Wat ik bij het kijken zag en heb rechtgezet

- **Het blok van de FAQ brak onderweg in tweeën** waar het over de ruimte tussen twee tabs gleed. Nu heeft de kopie
  de inkt als grond en een venster met de ronde hoek van de tab: één blok.
- **Het korte been van het vinkje was niet te zien**: het vakje vervaagde in 120 ms van wit naar inkt, dus het witte
  been stond eerst op bijna wit. Nu is het vakje bij aanvinken meteen inkt.
- **De fotogids heeft een eigen vakje** (met het vinkje uit het kit; het echte vakje ligt er onzichtbaar over), dus
  daar deed het vinkje in twee stappen niets. Nu tekent ook dat vinkje zich in twee stappen, en is het vakje meteen
  inkt (het vinkje vervaagde in 200 ms).

## 4 · De meting

Dezelfde meting als in lijst 68, op levering 82 en op 83, elk twee keer (gemiddeld; `kladblok/levering-83/soepel.json`). Werk per beeld op de
hoofddraad van de browser, in ms; tussen haakjes het deel voor de opmaak (stijl en plaats opnieuw uitrekenen). Op
een proefcomputer zonder grafische kaart: tel het verschil, niet de getallen.

| Beweging | 82 | 83 |
|---|---|---|
| De opening: scroll 1, de laptop glijdt in beeld | 12,5 (4,5) | **8,3 (1,4)** |
| De opening: scroll 2, de video | 84,3 (5,8) | 93,1 (5,0): ruis, de losse metingen liepen van 81 tot 105 |
| De galerij: rustig scrollen | 23,7 (6,8) | **19,9 (3,1)** |
| De galerij: hard scrollen | 23,3 (7,3) | 25,0 (6,8): ruis, 21 tot 27 |
| De galerij: uitlopen | 10,1 (3,4) | **7,8 (1,9)** |
| De logoposter | 26,1 (10,3) | 26,1 (**7,9**): de rest is het tekenen, dat op jouw scherm de grafische kaart doet |

## 5 · Wat je kunt weggooien

Niets nieuws. Staan deze zeven uit levering 80 en 81 nog in je map, gooi ze dan weg vóór `UITROLLEN.bat`:
`src\components\HalLaptopBreed.astro`, `src\styles\laptop-breed.css`, `src\components\HalTablet.astro`,
`src\styles\tablet.css`, `tests\opening-74.test.mjs`, `tests\voorpagina-78.test.mjs`,
`public\img\ui\keuzepijl-0b0f17.svg`.

## 6 · Nagekeken

- `npx astro build`: klaar, zonder fouten. De hele testreeks: **274 van de 274 stappen goed**.
- **Nieuwe toets** `tests/beweging-83.test.mjs` (npm run test:beweging83, in de keten na werkplaats82): de bronnen
  (de vier schakelaars, de paden van de pauzeknop met de hoekpunten van het kit, het vinkje in twee lagen); de FAQ
  op 1440 en 390 (één kopie zonder haakjes, het venster glijdt en staat er na 240 ms precies op, halverwege is het
  inkt boven de ruimte tussen twee tabs); minder beweging springt; de pillen met de snede en de wissel met de
  rondjes; de pauzeknop op /catalog; het vinkje (de cookiekeuze en de fotogids); grijs naar inkt, ook bij minder beweging; de logoposter zet zijn
  stijl niet opnieuw als er niets verandert.
- Bijgewerkt: `tests/grond-79.test.mjs` (de balk is de grond op 72 %, nu met de lichtvlek als laag erop).
- **Op het oog**: elke beweging beeld voor beeld opgenomen op de echte site (lijst 69).

## 7 · Uitrollen

Rol uit met `UITROLLEN.bat` vanuit je map. Het commitbericht staat in `kladblok/COMMIT-BERICHT.txt`.
