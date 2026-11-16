# Levering 101 · 15 november 2026

Ronde prijzen (lijst 111), de prijzen op maat met de schatting (lijst 109 en 110), de videopagina met alleen Motion en video op maat (lijst 109), en een naslagbestand voor het hele systeem. Gebouwd op levering 100 (stap 1 en 2), plus de basis van de intake op maat uit lijst 107 die nog niet in je map stond.

## Wat er verandert op de site

| Wat | Was | Wordt |
|---|---|---|
| Catalog per set van 4 (1–4 / 5–9 / 10–19 / 20+) | €89 / 65 / 51 / 39 | €90 / 65 / 50 / 40 |
| Lifestyle per carrousel | €109 / 82 / 64 / 49 | €110 / 80 / 65 / 50 |
| Extra foto | €39 / 34 / 29 / 19 | €40 / 35 / 30 / 20 |
| Hook, extra variant | €119, €49 | €120, €50 |
| Motion-clip | €69, 5 credits | €100, 8 credits |
| Lifestyleclip (intern) | €149 | €150; niet meer op de videopagina |
| 4K per product | €9 | €10 |
| Voorrang, minimaal en maximaal | €49 en €249 | €50 en €250 |
| Editions | €149 per maand + €295 | €150 + €300 |
| Bijkopen (Starter / Studio / Brand, 10 · 25 · 50 credits) | 87·206·390 / 66·157·297 / 59·139·263 | 90·210·390 / 70·160·300 / 60·140·265 (naar boven op €5) |
| Vooruitbetalen op de prijsplaat | €325 / €658 / €1.408 per maand | €325 / €660 / €1.410 "per maand, gemiddeld", met het exacte totaal eronder |
| Besparing plan tegenover los | 30% / 32% / 40% | 29% / 34% / 41% (schuift mee met de staffel) |

- **Ongewijzigd:** de abonnementen (€390, €790, €1.690), het merkmodel (€450), de complete look (€50) en de proef (€1).
- **Een maand op maat in credits blijft in hele euro's.** Op €5 afgerond wordt een credit bij één credit meer soms duurder per credit, en de bouwcontrole in pricing.js houdt dat tegen. Voorbeeld: 30 credits wordt €270, 31 credits €280.
- **Videopagina:** alleen Motion en video op maat (lijst 109). `/video/lifestyle` en `/video/campaign` (en de NL-versies) sturen met een 301 naar `/video/custom`. De soorten blijven in `videoStyles.js` staan voor lopende bestellingen en /admin.

## Op maat

- **`src/data/opMaatPrijs.js`:** al jouw bedragen uit lijst 109 en 110. `schatting(dienst, inhoud)` geeft per keuze een regel, het totaal en de aanbetaling (de helft).
- **`src/data/opMaat.js` en `src/lib/opMaat.js`:** de intake volgt lijst 110.
  - Hooks en video: eerst het idee (van de klant of van ons), met de vragen bij ons idee (doel, doelgroep, wat de kijker doet, gevoel, boodschap, aanleiding, concurrent, wat niet mag).
  - Hooks: geen storyboard en geen geluid meer.
  - Video: seconden (minimaal 8), shots met een camerabeweging in drie groepen, de omgeving en hoogstens twee personen.
  - Catalog en lifestyle: de velden die de schatting leest (licht, camera, grading, vaste maten, extra foto's, merkmodel, bijzonder licht).
  - Alleen aanvinken zegt niets (lijst 112): bij elke gekozen edit schrijft de klant in een paar woorden wat hij bedoelt (`toelichting`), anders kan hij niet versturen. Het formaat hoort niet meer bij de stijl; dat kiest hij per bestelling.
- **De intake-API** loopt via de vangroute van /account (`accountGet` en `accountPost`), niet meer via een eigen routebestand. Dat verbiedt `tests/admin-diagnose-route.test.mjs`, met reden: een los endpoint krijgt de centrale controles niet. De code staat nu in `src/lib/opMaatApi.js`.
- **AVG-register, sectie 3.10:** de vier nieuwe tabellen (merkprofiel, aanvragen, referenties, besluiten).
- **Database:** `migrations/0071-op-maat.sql` maakt die tabellen. `UITROLLEN.bat` draait nieuwe migraties zelf, na jouw J.

## Naslag

- **`docs/HOE-VISUAILS-WERKT.md`:** per dienst wat het is, wat het kost, wat erbij hoort en wat niet kan, met het hele traject op maat (gratis voorbeeld in neutrale kleuren, twee gratis rondes, offerte, de helft vooraf). `tests/op-maat-prijs.test.mjs` controleert dat elk bedrag erin gelijk is aan de code.
- **`kladblok/VISUAILS-OVERZICHT-24-OKT.md` §22:** de nieuwe bedragen, met een verwijzing naar het naslagbestand.

## Tests

- **Nieuw:** `tests/op-maat-prijs.test.mjs` (`npm run test:opmaatprijs`).
- **Bijgewerkt naar de nieuwe bedragen:** bedragen, bijkopen, hoeken, budget, creditherinnering en order-api.
- **Bijgewerkt voor de videopagina:** video-examples, opruimlijst, start-looks, huid, hal-voorbeeld en minder-sjabloon.
- **Bijgewerkt voor op maat:** op-maat.

## Stand

- Alle 349 toetsen groen: 272 zonder browser en 77 met browser (plus de bouw).
- Vier browsertoetsen faalden in de parallelle ronde op tijd (opening90, beweging83, proefbrowser, klantstand); los opnieuw gedraaid waren ze alle vier groen. Twee faalden op de oude pagina's of bedragen (halvoorbeeld, telefoon58) en zijn bijgewerkt.
- Het schermwerk voor de intake in Studio (lijst 112) zit hier nog niet in; dat wordt levering 102.
- Uitrollen doe je zelf met `UITROLLEN.bat`, met de tekst uit `kladblok/COMMIT-BERICHT.txt`.
